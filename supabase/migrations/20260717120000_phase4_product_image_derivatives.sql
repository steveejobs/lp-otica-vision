begin;

create type public.product_image_variant_kind as enum (
  'admin_thumbnail',
  'catalog_card',
  'home_preview',
  'product_detail',
  'open_graph'
);

alter table public.product_images
  add column asset_version uuid not null default gen_random_uuid(),
  add column mime_type text,
  add column size_bytes bigint,
  add column blur_data_url text,
  add constraint product_images_mime_type_allowed check (
    mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  ),
  add constraint product_images_size_bytes_positive check (
    size_bytes is null or size_bytes > 0
  ),
  add constraint product_images_blur_data_url_length check (
    blur_data_url is null or char_length(blur_data_url) <= 4096
  );

create table public.product_image_variants (
  id uuid primary key default gen_random_uuid(),
  product_image_id uuid not null references public.product_images (id) on delete cascade,
  asset_version uuid not null,
  kind public.product_image_variant_kind not null,
  storage_path text not null unique,
  width integer not null,
  height integer not null,
  mime_type text not null,
  size_bytes bigint not null,
  etag text not null,
  created_at timestamptz not null default now(),
  constraint product_image_variants_one_kind_per_asset unique (
    product_image_id,
    asset_version,
    kind
  ),
  constraint product_image_variants_storage_path_not_blank check (btrim(storage_path) <> ''),
  constraint product_image_variants_dimensions_positive check (width > 0 and height > 0),
  constraint product_image_variants_mime_type_allowed check (
    mime_type in ('image/jpeg', 'image/webp')
  ),
  constraint product_image_variants_size_bytes_positive check (size_bytes > 0),
  constraint product_image_variants_etag_format check (etag ~ '^"[A-Za-z0-9_-]{43}"$')
);

create index product_image_variants_image_asset_idx
  on public.product_image_variants (product_image_id, asset_version);

alter table public.product_image_variants enable row level security;

revoke all on public.product_image_variants from anon, authenticated;
grant select, insert, update, delete on public.product_image_variants to authenticated;
grant usage on type public.product_image_variant_kind to authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

create policy "staff reads product image variants"
on public.product_image_variants for select to authenticated
using (private.is_active_staff());

create policy "editors manage product image variants"
on public.product_image_variants for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create trigger product_image_variants_audit
after insert or update or delete on public.product_image_variants
for each row execute function private.write_audit_log();

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

    if new.featured and not new.published then
      raise exception 'Featured products must be published' using errcode = '23514';
    end if;

    if new.published and new.brand_id is not null and not exists (
      select 1 from public.brands where id = new.brand_id and active = true
    ) then
      raise exception 'Published products require an active linked brand' using errcode = '23514';
    end if;

    if new.published and new.category_id is not null and not exists (
      select 1 from public.categories where id = new.category_id and active = true
    ) then
      raise exception 'Published products require an active linked category' using errcode = '23514';
    end if;

    if new.published and not exists (
      select 1
      from public.product_images as image
      where image.product_id = new.id
        and image.is_cover = true
        and btrim(image.alt_text) <> ''
        and image.width is not null
        and image.height is not null
        and image.mime_type is not null
        and image.size_bytes is not null
        and image.blur_data_url is not null
        and (
          select count(distinct variant.kind)
          from public.product_image_variants as variant
          where variant.product_image_id = image.id
            and variant.asset_version = image.asset_version
        ) = 5
    ) then
      raise exception 'Published products require a complete derived cover image' using errcode = '23514';
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

create or replace function private.enforce_product_cover_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_product_id uuid;
  target_image_id uuid;
begin
  if tg_table_name = 'product_image_variants' then
    target_image_id := case when tg_op = 'DELETE' then old.product_image_id else new.product_image_id end;
    select product_id into target_product_id
    from public.product_images
    where id = target_image_id;
  else
    target_product_id := case when tg_op = 'DELETE' then old.product_id else new.product_id end;
  end if;

  if target_product_id is not null and exists (
    select 1
    from public.products
    where id = target_product_id
      and published = true
      and archived_at is null
  ) and not exists (
    select 1
    from public.product_images as image
    where image.product_id = target_product_id
      and image.is_cover = true
      and btrim(image.alt_text) <> ''
      and image.width is not null
      and image.height is not null
      and image.mime_type is not null
      and image.size_bytes is not null
      and image.blur_data_url is not null
      and (
        select count(distinct variant.kind)
        from public.product_image_variants as variant
        where variant.product_image_id = image.id
          and variant.asset_version = image.asset_version
      ) = 5
  ) then
    raise exception 'Published products require a complete derived cover image' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger product_image_variants_preserve_published_cover
after insert or update or delete on public.product_image_variants
deferrable initially deferred
for each row execute function private.enforce_product_cover_integrity();

comment on table public.product_image_variants is
  'Derivados persistidos de imagens de produto. O navegador publico recebe apenas estes arquivos.';
comment on column public.product_images.storage_path is
  'Master privado normalizado, limitado e sem metadata desnecessaria; nao deve ser servido em cards.';
comment on column public.product_images.blur_data_url is
  'Placeholder WebP pequeno, embutido para evitar request adicional durante o carregamento.';
comment on column public.product_image_variants.etag is
  'SHA-256 base64url entre aspas, calculado no upload e reutilizado pelo proxy.';

commit;
