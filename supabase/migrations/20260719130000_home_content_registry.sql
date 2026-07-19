begin;

alter table public.collections
  add column home_enabled boolean not null default false,
  add column home_placement_key text,
  add column home_variant text,
  add column home_title text,
  add column home_description text,
  add column home_cta_label text,
  add column home_cta_target text,
  add column home_gallery_id uuid references public.galleries(id) on delete set null,
  add column cover_asset_version uuid,
  add column cover_blur_data_url text,
  add column cover_media_manifest jsonb,
  add column cover_mobile_object_position text not null default '50% 50%',
  add column cover_desktop_object_position text not null default '50% 50%',
  add column cover_mobile_scale numeric(4,2) not null default 1,
  add column cover_desktop_scale numeric(4,2) not null default 1;

alter table public.collections
  add constraint collections_home_placement_key_format check (
    home_placement_key is null or home_placement_key ~ '^[a-z0-9]+(?:[_-][a-z0-9]+)*$'
  ),
  add constraint collections_home_variant_allowed check (
    home_variant is null or home_variant in ('editorial-protagonist', 'split-diptych', 'product-rail', 'cinematic-cover')
  ),
  add constraint collections_home_cta_target_allowed check (
    home_cta_target is null or home_cta_target in ('collection', 'catalog', 'whatsapp')
  ),
  add constraint collections_cover_mobile_position_format check (
    cover_mobile_object_position ~ '^(?:[0-9]{1,3}%|left|center|right) (?:[0-9]{1,3}%|top|center|bottom)$'
  ),
  add constraint collections_cover_desktop_position_format check (
    cover_desktop_object_position ~ '^(?:[0-9]{1,3}%|left|center|right) (?:[0-9]{1,3}%|top|center|bottom)$'
  ),
  add constraint collections_cover_scale_range check (
    cover_mobile_scale between 0.80 and 1.40 and cover_desktop_scale between 0.80 and 1.40
  ),
  add constraint collections_cover_manifest_safe check (
    cover_media_manifest is null or cover_media_manifest ?& array['master', 'mobile', 'desktop', 'thumbnail']
  ),
  add constraint collections_home_fields_together check (
    not home_enabled or (
      home_placement_key is not null and home_variant is not null and
      home_title is not null and btrim(home_title) <> '' and
      home_description is not null and btrim(home_description) <> '' and
      home_cta_label is not null and btrim(home_cta_label) <> '' and
      home_cta_target is not null
    )
  );

create table public.collection_publications (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete restrict,
  revision integer not null,
  active boolean not null default true,
  name text not null,
  slug text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  home_enabled boolean not null,
  home_placement_key text,
  home_variant text,
  home_title text,
  home_description text,
  home_cta_label text,
  home_cta_target text,
  home_gallery_id uuid references public.galleries(id) on delete restrict,
  cover_path text,
  cover_alt_text text,
  cover_width integer,
  cover_height integer,
  cover_asset_version uuid,
  cover_blur_data_url text,
  cover_media_manifest jsonb,
  cover_mobile_object_position text not null default '50% 50%',
  cover_desktop_object_position text not null default '50% 50%',
  cover_mobile_scale numeric(4,2) not null default 1,
  cover_desktop_scale numeric(4,2) not null default 1,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (collection_id, revision),
  constraint collection_publications_variant_allowed check (
    home_variant is null or home_variant in ('editorial-protagonist', 'split-diptych', 'product-rail', 'cinematic-cover')
  ),
  constraint collection_publications_cta_target_allowed check (
    home_cta_target is null or home_cta_target in ('collection', 'catalog', 'whatsapp')
  )
);

create table public.collection_publication_products (
  publication_id uuid not null references public.collection_publications(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  display_order integer not null,
  primary key (publication_id, product_id),
  unique (publication_id, display_order),
  constraint collection_publication_products_display_order_nonnegative check (display_order >= 0)
);

create unique index collection_publications_one_active_idx
  on public.collection_publications (collection_id) where active = true;
create unique index collection_publications_one_active_home_slot_idx
  on public.collection_publications (home_placement_key)
  where active = true and home_enabled = true;
create index collection_publications_home_slot_idx
  on public.collection_publications (home_placement_key, active, published_at desc);
create index collection_publication_products_publication_idx
  on public.collection_publication_products (publication_id, display_order);

alter table public.collection_publications enable row level security;
alter table public.collection_publication_products enable row level security;
revoke all on public.collection_publications, public.collection_publication_products from anon, authenticated;
grant select on public.collection_publications, public.collection_publication_products to anon, authenticated;
grant insert, update, delete on public.collection_publications, public.collection_publication_products to authenticated;

create policy "public reads active collection publications"
on public.collection_publications for select to anon
using (active = true and home_enabled = true);
create policy "staff reads all collection publications"
on public.collection_publications for select to authenticated using (private.is_active_staff());
create policy "editors manage collection publications"
on public.collection_publications for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "public reads active collection publication products"
on public.collection_publication_products for select to anon
using (exists (
  select 1 from public.collection_publications publication
  where publication.id = publication_id and publication.active = true and publication.home_enabled = true
));
create policy "staff reads all collection publication products"
on public.collection_publication_products for select to authenticated using (private.is_active_staff());
create policy "editors manage collection publication products"
on public.collection_publication_products for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create or replace function public.publish_collection_revision(target_collection_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  next_revision integer;
  new_publication_id uuid := gen_random_uuid();
  target public.collections%rowtype;
  active_products integer;
  gallery_publication uuid;
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission to publish collection' using errcode = '42501';
  end if;

  select * into target from public.collections where id = target_collection_id for update;
  if target.id is null then raise exception 'Collection not found' using errcode = 'P0002'; end if;
  if target.published is not true then
    raise exception 'Collection must be published before creating a public revision' using errcode = '23514';
  end if;
  if target.home_enabled is not true then
    raise exception 'Collection is not enabled for home' using errcode = '23514';
  end if;
  if target.home_placement_key <> 'featured_collection' then
    raise exception 'Collection placement is not implemented' using errcode = '23514';
  end if;
  if target.home_variant not in ('editorial-protagonist', 'split-diptych', 'product-rail', 'cinematic-cover') then
    raise exception 'Collection variant is invalid' using errcode = '23514';
  end if;
  if coalesce(btrim(target.home_title), '') = '' or coalesce(btrim(target.home_description), '') = ''
    or coalesce(btrim(target.home_cta_label), '') = '' or target.home_cta_target is null then
    raise exception 'Collection home content is incomplete' using errcode = '23514';
  end if;

  select count(*) into active_products
  from public.collection_products relation
  join public.products product on product.id = relation.product_id
  where relation.collection_id = target_collection_id
    and product.published = true and product.archived_at is null;

  if target.home_variant in ('split-diptych', 'product-rail') and active_products < 1 then
    raise exception 'Collection variant requires at least one published product' using errcode = '23514';
  end if;

  if target.home_variant = 'editorial-protagonist' then
    if target.home_gallery_id is null then
      raise exception 'Editorial collection requires a gallery' using errcode = '23514';
    end if;
    select publication.id into gallery_publication
    from public.galleries gallery
    join public.gallery_publications publication on publication.gallery_id = gallery.id and publication.active = true
    join public.gallery_publication_items item on item.publication_id = publication.id
    where gallery.id = target.home_gallery_id
      and gallery.route_key = 'home' and gallery.placement_key = 'featured_collection'
      and gallery.published = true
    group by publication.id
    having count(item.id) >= 1;
    if gallery_publication is null then
      raise exception 'Editorial gallery has no valid active revision' using errcode = '23514';
    end if;
  end if;

  if target.home_variant in ('split-diptych', 'cinematic-cover') and (
    target.cover_path is null or target.cover_alt_text is null or btrim(target.cover_alt_text) = '' or
    target.cover_width is null or target.cover_height is null or target.cover_asset_version is null or
    target.cover_media_manifest is null or not (target.cover_media_manifest ?& array['master', 'mobile', 'desktop', 'thumbnail'])
  ) then
    raise exception 'Collection variant requires a complete cover' using errcode = '23514';
  end if;

  if target.cover_media_manifest is not null and exists (
    select 1
    from jsonb_array_elements(jsonb_build_array(
      target.cover_media_manifest->'master', target.cover_media_manifest->'mobile',
      target.cover_media_manifest->'desktop', target.cover_media_manifest->'thumbnail'
    )) file
    where not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'site-galleries' and object.name = file->>'path'
    )
  ) then
    raise exception 'Collection cover is missing from Storage' using errcode = '23514';
  end if;

  select coalesce(max(revision), 0) + 1 into next_revision
  from public.collection_publications where collection_id = target_collection_id;

  update public.collection_publications set active = false
  where collection_id = target_collection_id and active = true;
  update public.collection_publications set active = false
  where home_placement_key = target.home_placement_key and home_enabled = true and active = true;

  insert into public.collection_publications(
    id, collection_id, revision, active, name, slug, starts_at, ends_at,
    home_enabled, home_placement_key, home_variant, home_title, home_description,
    home_cta_label, home_cta_target, home_gallery_id,
    cover_path, cover_alt_text, cover_width, cover_height, cover_asset_version,
    cover_blur_data_url, cover_media_manifest, cover_mobile_object_position,
    cover_desktop_object_position, cover_mobile_scale, cover_desktop_scale, published_by
  ) values (
    new_publication_id, target.id, next_revision, true, target.name, target.slug, target.starts_at, target.ends_at,
    target.home_enabled, target.home_placement_key, target.home_variant, target.home_title, target.home_description,
    target.home_cta_label, target.home_cta_target, target.home_gallery_id,
    target.cover_path, target.cover_alt_text, target.cover_width, target.cover_height, target.cover_asset_version,
    target.cover_blur_data_url, target.cover_media_manifest, target.cover_mobile_object_position,
    target.cover_desktop_object_position, target.cover_mobile_scale, target.cover_desktop_scale, actor
  );

  insert into public.collection_publication_products(publication_id, product_id, display_order)
  select new_publication_id, relation.product_id, row_number() over(order by relation.display_order)::integer - 1
  from public.collection_products relation
  join public.products product on product.id = relation.product_id
  where relation.collection_id = target_collection_id and product.published = true and product.archived_at is null
  order by relation.display_order;

  return new_publication_id;
end;
$$;

create or replace function public.rollback_collection_revision(target_collection_id uuid, target_publication_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.collection_publications%rowtype;
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission to rollback collection' using errcode = '42501';
  end if;
  select * into target from public.collection_publications
  where id = target_publication_id and collection_id = target_collection_id for update;
  if target.id is null then raise exception 'Collection publication not found' using errcode = 'P0002'; end if;

  update public.collection_publications set active = false
  where collection_id = target_collection_id and active = true;
  update public.collection_publications set active = false
  where home_placement_key = target.home_placement_key and home_enabled = true and active = true;
  update public.collection_publications set active = true, published_by = actor, published_at = now()
  where id = target_publication_id;
  return target_publication_id;
end;
$$;

revoke all on function public.publish_collection_revision(uuid) from public, anon;
revoke all on function public.rollback_collection_revision(uuid, uuid) from public, anon;
grant execute on function public.publish_collection_revision(uuid) to authenticated;
grant execute on function public.rollback_collection_revision(uuid, uuid) to authenticated;

create trigger collection_publications_audit after insert or update or delete on public.collection_publications
for each row execute function private.write_audit_log();
create trigger collection_publication_products_audit after insert or update or delete on public.collection_publication_products
for each row execute function private.write_audit_log();

commit;
