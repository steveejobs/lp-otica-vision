begin;

alter table public.gallery_publication_items
  add column visual_series text;

create or replace function public.publish_gallery_revision(target_gallery_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  next_revision integer;
  new_publication_id uuid := gen_random_uuid();
  active_count integer;
  primary_count integer;
  target_route text;
  target_placement text;
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission to publish gallery' using errcode = '42501';
  end if;

  select route_key, placement_key into target_route, target_placement
  from public.galleries where id = target_gallery_id for update;
  if target_route is null then raise exception 'Gallery not found' using errcode = 'P0002'; end if;

  select count(*), count(*) filter (where editorial_role = 'primary')
  into active_count, primary_count
  from public.gallery_items where gallery_id = target_gallery_id and published = true;

  if target_route = 'home' and target_placement = 'hero' then
    if active_count < 1 then
      raise exception 'Home hero requires at least one active image' using errcode = '23514';
    end if;
    if primary_count <> 1 then
      raise exception 'Home hero requires exactly one primary image' using errcode = '23514';
    end if;
  elsif active_count < 1 then
    raise exception 'Gallery requires an active image' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.gallery_items item
    where item.gallery_id = target_gallery_id and item.published = true and (
      btrim(item.alt_text) = '' or item.width is null or item.height is null or
      item.width < 720 or item.height < 720 or item.asset_version is null or
      item.media_manifest is null or
      not (item.media_manifest ?& array['master','mobile','desktop','thumbnail']) or
      item.mobile_object_position !~ '^(?:[0-9]{1,3}%|left|center|right) (?:[0-9]{1,3}%|top|center|bottom)$' or
      item.desktop_object_position !~ '^(?:[0-9]{1,3}%|left|center|right) (?:[0-9]{1,3}%|top|center|bottom)$'
    )
  ) then
    raise exception 'Gallery contains incomplete or incompatible media' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.gallery_items item
    cross join lateral jsonb_array_elements(jsonb_build_array(
      item.media_manifest->'master', item.media_manifest->'mobile',
      item.media_manifest->'desktop', item.media_manifest->'thumbnail'
    )) file
    where item.gallery_id = target_gallery_id and item.published = true
      and not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'site-galleries' and object.name = file->>'path'
      )
  ) then
    raise exception 'Gallery media is missing from Storage' using errcode = '23514';
  end if;

  select coalesce(max(revision), 0) + 1 into next_revision
  from public.gallery_publications where gallery_id = target_gallery_id;
  update public.gallery_publications set active = false
  where gallery_id = target_gallery_id and active = true;
  insert into public.gallery_publications(id, gallery_id, revision, active, published_by)
  values (new_publication_id, target_gallery_id, next_revision, true, actor);

  insert into public.gallery_publication_items(
    publication_id, source_item_id, storage_path, alt_text,
    mobile_object_position, desktop_object_position, mobile_scale, desktop_scale,
    editorial_role, background_color, blur_data_url, asset_version, media_manifest,
    width, height, display_order, visual_series
  )
  select new_publication_id, item.id, item.storage_path, item.alt_text,
    item.mobile_object_position, item.desktop_object_position, item.mobile_scale, item.desktop_scale,
    item.editorial_role, item.background_color, item.blur_data_url, item.asset_version, item.media_manifest,
    item.width, item.height, row_number() over(order by item.display_order, item.created_at)::integer - 1,
    item.visual_series
  from public.gallery_items item
  where item.gallery_id = target_gallery_id and item.published = true
  order by item.display_order, item.created_at;

  update public.galleries set published = true where id = target_gallery_id;
  return new_publication_id;
end;
$$;

revoke all on function public.publish_gallery_revision(uuid) from public, anon;
grant execute on function public.publish_gallery_revision(uuid) to authenticated;

commit;
