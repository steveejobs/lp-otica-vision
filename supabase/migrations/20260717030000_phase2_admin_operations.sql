begin;

alter table public.products
  add column archived_at timestamptz;

alter table public.collections
  add column cover_alt_text text,
  add column cover_object_position text not null default '50% 50%',
  add column cover_width integer,
  add column cover_height integer,
  add constraint collections_cover_alt_not_blank check (
    cover_alt_text is null or btrim(cover_alt_text) <> ''
  ),
  add constraint collections_cover_dimensions_positive check (
    (cover_width is null or cover_width > 0)
    and (cover_height is null or cover_height > 0)
  ),
  add constraint collections_published_cover_complete check (
    not published
    or (
      cover_path is not null
      and btrim(coalesce(cover_alt_text, '')) <> ''
      and cover_width is not null
      and cover_height is not null
    )
  );

alter table public.gallery_items
  add column width integer,
  add column height integer,
  add constraint gallery_items_dimensions_positive check (
    (width is null or width > 0) and (height is null or height > 0)
  ),
  add constraint gallery_items_published_dimensions_known check (
    not published or (width is not null and height is not null)
  );

alter table public.promotions
  add column cta_target text not null default 'whatsapp',
  add column image_alt_text text,
  add column image_object_position text not null default '50% 50%',
  add column image_width integer,
  add column image_height integer,
  add constraint promotions_cta_target_allowed check (
    cta_target in ('whatsapp', 'instagram', 'maps')
  ),
  add constraint promotions_image_alt_not_blank check (
    image_alt_text is null or btrim(image_alt_text) <> ''
  ),
  add constraint promotions_image_dimensions_positive check (
    (image_width is null or image_width > 0)
    and (image_height is null or image_height > 0)
  ),
  add constraint promotions_active_image_complete check (
    not active
    or (
      btrim(coalesce(image_alt_text, '')) <> ''
      and image_width is not null
      and image_height is not null
    )
  );

create index products_archived_at_idx on public.products (archived_at);

drop policy "public reads published products" on public.products;
create policy "public reads published products"
on public.products for select to anon
using (published = true and archived_at is null);

drop policy "public reads images of published products" on public.product_images;
create policy "public reads images of published products"
on public.product_images for select to anon
using (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and products.published = true
      and products.archived_at is null
  )
);

drop policy "public reads current collection products" on public.collection_products;
create policy "public reads current collection products"
on public.collection_products for select to anon
using (
  exists (
    select 1 from public.collections
    where collections.id = collection_products.collection_id
      and collections.published = true
      and (collections.starts_at is null or collections.starts_at <= now())
      and (collections.ends_at is null or collections.ends_at >= now())
  )
  and exists (
    select 1 from public.products
    where products.id = collection_products.product_id
      and products.published = true
      and products.archived_at is null
  )
);

drop policy "public reads current promotion products" on public.promotion_products;
create policy "public reads current promotion products"
on public.promotion_products for select to anon
using (
  exists (
    select 1 from public.promotions
    where promotions.id = promotion_products.promotion_id
      and promotions.active = true
      and promotions.starts_at <= now()
      and promotions.ends_at >= now()
  )
  and exists (
    select 1 from public.products
    where products.id = promotion_products.product_id
      and products.published = true
      and products.archived_at is null
  )
);

create or replace function private.protect_last_active_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removes_admin boolean := false;
begin
  if old.role = 'admin' and old.active = true then
    if tg_op = 'DELETE' then
      removes_admin := true;
    else
      removes_admin := new.role <> 'admin' or new.active = false;
    end if;

    if removes_admin then
      if not exists (
        select 1
        from public.profiles
        where id <> old.id
          and role = 'admin'
          and active = true
      ) then
        raise exception 'At least one active administrator is required' using errcode = '23514';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_last_active_admin
before update or delete on public.profiles
for each row execute function private.protect_last_active_admin();

create or replace function private.validate_publishable_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'products' then
    if new.archived_at is not null then
      new.published := false;
      new.featured := false;
    end if;

    if new.published and not exists (
      select 1
      from public.product_images
      where product_id = new.id
        and is_cover = true
        and btrim(alt_text) <> ''
        and width is not null
        and height is not null
    ) then
      raise exception 'Published products require a complete cover image' using errcode = '23514';
    end if;
  elsif tg_table_name = 'galleries' then
    if new.published and not exists (
      select 1
      from public.gallery_items
      where gallery_id = new.id
        and published = true
        and btrim(alt_text) <> ''
        and width is not null
        and height is not null
    ) then
      raise exception 'Published galleries require a published image' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger products_validate_publishable_content
before insert or update on public.products
for each row execute function private.validate_publishable_content();

create trigger galleries_validate_publishable_content
before insert or update on public.galleries
for each row execute function private.validate_publishable_content();

create or replace function public.reorder_product_images(
  target_product_id uuid,
  ordered_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count integer;
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  select count(*) into expected_count
  from public.product_images
  where product_id = target_product_id;

  if coalesce(array_length(ordered_ids, 1), 0) <> expected_count
    or (select count(distinct value) from unnest(ordered_ids) as value) <> expected_count
    or exists (
      select 1 from unnest(ordered_ids) as value
      where not exists (
        select 1 from public.product_images
        where id = value and product_id = target_product_id
      )
    ) then
    raise exception 'Invalid image ordering' using errcode = '22023';
  end if;

  update public.product_images as image
  set display_order = ordered.position - 1
  from unnest(ordered_ids) with ordinality as ordered(id, position)
  where image.id = ordered.id
    and image.product_id = target_product_id;
end;
$$;

create or replace function public.set_product_cover(
  target_product_id uuid,
  target_image_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.product_images
    where id = target_image_id and product_id = target_product_id
  ) then
    raise exception 'Image does not belong to product' using errcode = '22023';
  end if;

  update public.product_images
  set is_cover = false
  where product_id = target_product_id and is_cover = true;

  update public.product_images
  set is_cover = true
  where id = target_image_id and product_id = target_product_id;
end;
$$;

create or replace function public.sync_collection_products(
  target_collection_id uuid,
  ordered_product_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requested_count integer := coalesce(array_length(ordered_product_ids, 1), 0);
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  if (select count(distinct value) from unnest(ordered_product_ids) as value) <> requested_count
    or exists (
      select 1 from unnest(ordered_product_ids) as value
      where not exists (select 1 from public.products where id = value and archived_at is null)
    ) then
    raise exception 'Invalid collection products' using errcode = '22023';
  end if;

  delete from public.collection_products where collection_id = target_collection_id;
  insert into public.collection_products (collection_id, product_id, display_order)
  select target_collection_id, id, position - 1
  from unnest(ordered_product_ids) with ordinality as ordered(id, position);
end;
$$;

create or replace function public.reorder_gallery_items(
  target_gallery_id uuid,
  ordered_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count integer;
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  select count(*) into expected_count
  from public.gallery_items
  where gallery_id = target_gallery_id;

  if coalesce(array_length(ordered_ids, 1), 0) <> expected_count
    or (select count(distinct value) from unnest(ordered_ids) as value) <> expected_count
    or exists (
      select 1 from unnest(ordered_ids) as value
      where not exists (
        select 1 from public.gallery_items
        where id = value and gallery_id = target_gallery_id
      )
    ) then
    raise exception 'Invalid gallery ordering' using errcode = '22023';
  end if;

  if exists (
    with ordered as (
      select item.visual_series, item.series_order, position
      from unnest(ordered_ids) with ordinality as requested(id, position)
      join public.gallery_items as item on item.id = requested.id
      where item.visual_series is not null
    )
    select 1
    from ordered
    group by visual_series
    having max(position) - min(position) + 1 <> count(*)
      or array_agg(series_order order by position) <> array_agg(series_order order by series_order)
  ) then
    raise exception 'Visual series must remain contiguous and ordered' using errcode = '22023';
  end if;

  update public.gallery_items as item
  set display_order = ordered.position - 1
  from unnest(ordered_ids) with ordinality as ordered(id, position)
  where item.id = ordered.id
    and item.gallery_id = target_gallery_id;
end;
$$;

create or replace function public.sync_promotion_products(
  target_promotion_id uuid,
  ordered_product_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requested_count integer := coalesce(array_length(ordered_product_ids, 1), 0);
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  if (select count(distinct value) from unnest(ordered_product_ids) as value) <> requested_count
    or exists (
      select 1 from unnest(ordered_product_ids) as value
      where not exists (select 1 from public.products where id = value and archived_at is null)
    ) then
    raise exception 'Invalid promotion products' using errcode = '22023';
  end if;

  delete from public.promotion_products where promotion_id = target_promotion_id;
  insert into public.promotion_products (promotion_id, product_id, display_order)
  select target_promotion_id, id, position - 1
  from unnest(ordered_product_ids) with ordinality as ordered(id, position);
end;
$$;

revoke all on function private.protect_last_active_admin() from public, anon, authenticated;
revoke all on function private.validate_publishable_content() from public, anon, authenticated;
revoke all on function public.reorder_product_images(uuid, uuid[]) from public, anon;
revoke all on function public.set_product_cover(uuid, uuid) from public, anon;
revoke all on function public.sync_collection_products(uuid, uuid[]) from public, anon;
revoke all on function public.reorder_gallery_items(uuid, uuid[]) from public, anon;
revoke all on function public.sync_promotion_products(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_product_images(uuid, uuid[]) to authenticated;
grant execute on function public.set_product_cover(uuid, uuid) to authenticated;
grant execute on function public.sync_collection_products(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_gallery_items(uuid, uuid[]) to authenticated;
grant execute on function public.sync_promotion_products(uuid, uuid[]) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'brand-logos',
  'brand-logos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy "active staff reads managed images" on storage.objects;
drop policy "editors upload managed images" on storage.objects;
drop policy "editors update managed images" on storage.objects;
drop policy "editors delete managed images" on storage.objects;

create policy "active staff reads managed images"
on storage.objects for select to authenticated
using (
  bucket_id in ('brand-logos', 'catalog-products', 'site-galleries', 'promotions')
  and private.is_active_staff()
);

create policy "editors upload managed images"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('brand-logos', 'catalog-products', 'site-galleries', 'promotions')
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|webp|avif)$'
);

create policy "editors update managed images"
on storage.objects for update to authenticated
using (
  bucket_id in ('brand-logos', 'catalog-products', 'site-galleries', 'promotions')
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
)
with check (
  bucket_id in ('brand-logos', 'catalog-products', 'site-galleries', 'promotions')
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|webp|avif)$'
);

create policy "editors delete managed images"
on storage.objects for delete to authenticated
using (
  bucket_id in ('brand-logos', 'catalog-products', 'site-galleries', 'promotions')
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
);

comment on column public.brands.logo_url is
  'Private Storage path in brand-logos. The legacy column name is retained for compatibility.';
comment on column public.products.archived_at is
  'Soft archive timestamp. Archived products are never publicly readable.';
comment on column public.promotions.cta_target is
  'Controlled destination mapped server-side to an official Vision channel.';

commit;
