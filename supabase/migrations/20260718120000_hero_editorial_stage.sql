begin;

alter table public.galleries drop constraint if exists galleries_route_key_key;
alter table public.galleries add column placement_key text;
update public.galleries
set placement_key = split_part(route_key, '.', 2),
    route_key = split_part(route_key, '.', 1)
where placement_key is null and position('.' in route_key) > 0;
update public.galleries set placement_key = 'gallery' where placement_key is null;
alter table public.galleries alter column placement_key set not null;
alter table public.galleries
  add constraint galleries_placement_key_format check (placement_key ~ '^[a-z0-9]+(?:[_-][a-z0-9]+)*$'),
  add constraint galleries_route_placement_unique unique (route_key, placement_key);

alter table public.gallery_items
  add column mobile_scale numeric(4,2) not null default 1,
  add column desktop_scale numeric(4,2) not null default 1,
  add column editorial_role text not null default 'secondary',
  add column background_color text,
  add column blur_data_url text,
  add column asset_version uuid,
  add column media_manifest jsonb;

alter table public.gallery_items
  add constraint gallery_items_mobile_scale_range check (mobile_scale between 0.80 and 1.40),
  add constraint gallery_items_desktop_scale_range check (desktop_scale between 0.80 and 1.40),
  add constraint gallery_items_editorial_role_allowed check (editorial_role in ('primary', 'secondary', 'detail')),
  add constraint gallery_items_background_color_format check (background_color is null or background_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint gallery_items_blur_data_url_safe check (blur_data_url is null or (length(blur_data_url) <= 4096 and blur_data_url like 'data:image/webp;base64,%'));

create table public.gallery_publications (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete restrict,
  revision integer not null,
  active boolean not null default true,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (gallery_id, revision)
);

create unique index gallery_publications_one_active_idx
on public.gallery_publications (gallery_id) where active = true;

create table public.gallery_publication_items (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.gallery_publications(id) on delete cascade,
  source_item_id uuid,
  storage_path text not null,
  alt_text text not null,
  mobile_object_position text not null,
  desktop_object_position text not null,
  mobile_scale numeric(4,2) not null,
  desktop_scale numeric(4,2) not null,
  editorial_role text not null,
  background_color text,
  blur_data_url text,
  asset_version uuid not null,
  media_manifest jsonb not null,
  width integer not null,
  height integer not null,
  display_order integer not null,
  published_at timestamptz not null default now(),
  constraint gallery_publication_items_alt_text_not_blank check (btrim(alt_text) <> ''),
  constraint gallery_publication_items_position_format check (
    mobile_object_position ~ '^(?:[0-9]{1,3}%|left|center|right) (?:[0-9]{1,3}%|top|center|bottom)$'
    and desktop_object_position ~ '^(?:[0-9]{1,3}%|left|center|right) (?:[0-9]{1,3}%|top|center|bottom)$'
  ),
  constraint gallery_publication_items_scale_range check (mobile_scale between 0.80 and 1.40 and desktop_scale between 0.80 and 1.40),
  constraint gallery_publication_items_role_allowed check (editorial_role in ('primary', 'secondary', 'detail')),
  constraint gallery_publication_items_dimensions_positive check (width > 0 and height > 0),
  unique (publication_id, display_order)
);

create index gallery_publication_items_publication_idx on public.gallery_publication_items (publication_id, display_order);

alter table public.gallery_publications enable row level security;
alter table public.gallery_publication_items enable row level security;
revoke all on public.gallery_publications, public.gallery_publication_items from anon, authenticated;
grant select on public.gallery_publications, public.gallery_publication_items to anon, authenticated;
grant insert, update, delete on public.gallery_publications, public.gallery_publication_items to authenticated;

create policy "public reads active gallery publications"
on public.gallery_publications for select to anon
using (active = true and exists (
  select 1 from public.galleries g where g.id = gallery_id and g.published = true
));
create policy "staff reads all gallery publications"
on public.gallery_publications for select to authenticated using (private.is_active_staff());
create policy "editors manage gallery publications"
on public.gallery_publications for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "public reads active gallery publication items"
on public.gallery_publication_items for select to anon
using (exists (
  select 1 from public.gallery_publications p
  join public.galleries g on g.id = p.gallery_id
  where p.id = publication_id and p.active = true and g.published = true
));
create policy "staff reads all gallery publication items"
on public.gallery_publication_items for select to authenticated using (private.is_active_staff());
create policy "editors manage gallery publication items"
on public.gallery_publication_items for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

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
    if active_count < 1 or active_count > 3 then
      raise exception 'Home hero requires one to three active images' using errcode = '23514';
    end if;
    if primary_count <> 1 then
      raise exception 'Home hero requires exactly one primary image' using errcode = '23514';
    end if;
  elsif active_count < 1 then
    raise exception 'Gallery requires an active image' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.gallery_items i
    where i.gallery_id = target_gallery_id and i.published = true and (
      btrim(i.alt_text) = '' or i.width is null or i.height is null or
      i.width < 720 or i.height < 720 or i.asset_version is null or
      i.media_manifest is null or
      not (i.media_manifest ?& array['master','mobile','desktop','thumbnail']) or
      i.mobile_object_position !~ '^(?:[0-9]{1,3}%|left|center|right) (?:[0-9]{1,3}%|top|center|bottom)$' or
      i.desktop_object_position !~ '^(?:[0-9]{1,3}%|left|center|right) (?:[0-9]{1,3}%|top|center|bottom)$'
    )
  ) then
    raise exception 'Gallery contains incomplete or incompatible media' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.gallery_items i
    cross join lateral jsonb_array_elements(jsonb_build_array(
      i.media_manifest->'master', i.media_manifest->'mobile',
      i.media_manifest->'desktop', i.media_manifest->'thumbnail'
    )) file
    where i.gallery_id = target_gallery_id and i.published = true
      and not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'site-galleries' and o.name = file->>'path'
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
    width, height, display_order
  )
  select new_publication_id, i.id, i.storage_path, i.alt_text,
    i.mobile_object_position, i.desktop_object_position, i.mobile_scale, i.desktop_scale,
    i.editorial_role, i.background_color, i.blur_data_url, i.asset_version, i.media_manifest,
    i.width, i.height, row_number() over(order by i.display_order, i.created_at)::integer - 1
  from public.gallery_items i
  where i.gallery_id = target_gallery_id and i.published = true
  order by i.display_order, i.created_at;

  update public.galleries set published = true where id = target_gallery_id;
  return new_publication_id;
end;
$$;

revoke all on function public.publish_gallery_revision(uuid) from public, anon;
grant execute on function public.publish_gallery_revision(uuid) to authenticated;

create trigger gallery_publications_audit after insert or update or delete on public.gallery_publications
for each row execute function private.write_audit_log();
create trigger gallery_publication_items_audit after insert or update or delete on public.gallery_publication_items
for each row execute function private.write_audit_log();

commit;
