begin;

alter type public.analytics_event_name add value if not exists 'style_selected';
alter type public.analytics_event_name add value if not exists 'category_selected';
alter type public.analytics_event_name add value if not exists 'curation_product_opened';
alter type public.analytics_event_name add value if not exists 'curation_view_more';
alter type public.analytics_event_name add value if not exists 'catalog_filter_changed';
alter type public.analytics_event_name add value if not exists 'catalog_product_opened';
alter type public.analytics_event_name add value if not exists 'curation_whatsapp_clicked';

create table public.styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint styles_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint styles_label_not_blank check (btrim(label) <> '' and char_length(label) <= 80),
  constraint styles_description_not_blank check (btrim(description) <> '' and char_length(description) <= 240),
  constraint styles_display_order_nonnegative check (display_order >= 0)
);

create table public.product_styles (
  product_id uuid not null references public.products(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete restrict,
  is_primary boolean not null default false,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, style_id),
  constraint product_styles_display_order_nonnegative check (display_order >= 0)
);

create unique index product_styles_one_primary_per_product_idx
  on public.product_styles(product_id) where is_primary = true;
create index styles_public_order_idx on public.styles(active, display_order, label);
create index product_styles_style_order_idx
  on public.product_styles(style_id, is_featured desc, display_order, product_id);
create index product_styles_product_idx on public.product_styles(product_id);

create trigger styles_set_updated_at before update on public.styles
for each row execute function private.set_updated_at();
create trigger product_styles_set_updated_at before update on public.product_styles
for each row execute function private.set_updated_at();
create trigger styles_audit after insert or update or delete on public.styles
for each row execute function private.write_audit_log();
create trigger product_styles_audit after insert or update or delete on public.product_styles
for each row execute function private.write_audit_log();

alter table public.styles enable row level security;
alter table public.product_styles enable row level security;
revoke all on public.styles, public.product_styles from anon, authenticated;
grant select on public.styles, public.product_styles to anon, authenticated;
grant insert, update on public.styles to authenticated;
grant insert, update, delete on public.product_styles to authenticated;

create policy "public reads active styles"
on public.styles for select to anon using (active = true);
create policy "staff reads all styles"
on public.styles for select to authenticated using (private.is_active_staff());
create policy "admins manage styles"
on public.styles for all to authenticated
using (private.has_any_role(array['admin']::public.admin_role[]))
with check (private.has_any_role(array['admin']::public.admin_role[]));

create policy "public reads eligible product styles"
on public.product_styles for select to anon using (
  exists (select 1 from public.styles where styles.id = style_id and styles.active = true)
  and exists (
    select 1 from public.products
    where products.id = product_id and products.published = true and products.archived_at is null
  )
);
create policy "staff reads all product styles"
on public.product_styles for select to authenticated using (private.is_active_staff());
create policy "editors manage product styles"
on public.product_styles for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

insert into public.styles(slug, label, description, active, display_order)
values
  ('classica', 'Clássica', 'Linhas equilibradas e presença discreta.', true, 0),
  ('marcante', 'Marcante', 'Volumes e proporções de maior impacto visual.', true, 1),
  ('contemporanea', 'Contemporânea', 'Forma atual com acabamento preciso.', true, 2),
  ('esportiva', 'Esportiva', 'Desenho funcional e presença dinâmica.', true, 3)
on conflict (slug) do nothing;

insert into public.site_settings(key, value)
values (
  'home.style_curator',
  '{"enabled":true,"published":true,"revision":1,"initialStyle":"classica","categorySlug":null,"displayOrder":5}'::jsonb
)
on conflict (key) do nothing;

create or replace function public.sync_product_styles(
  target_product_id uuid,
  assignments jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_count integer;
  primary_count integer;
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission to classify products' using errcode = '42501';
  end if;
  if not exists (select 1 from public.products where id = target_product_id) then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(coalesce(assignments, '[]'::jsonb)) <> 'array' then
    raise exception 'Style assignments must be an array' using errcode = '22023';
  end if;

  select count(*), count(*) filter (where coalesce(item.is_primary, false))
  into assignment_count, primary_count
  from jsonb_to_recordset(coalesce(assignments, '[]'::jsonb))
    as item(style_id uuid, is_primary boolean, is_featured boolean, display_order integer);

  if assignment_count > 3 then
    raise exception 'A product can have at most three styles' using errcode = '23514';
  end if;
  if assignment_count > 0 and primary_count <> 1 then
    raise exception 'Classified products require exactly one primary style' using errcode = '23514';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(assignments, '[]'::jsonb))
      as item(style_id uuid, is_primary boolean, is_featured boolean, display_order integer)
    group by item.style_id having count(*) > 1
  ) then
    raise exception 'Duplicate styles are not allowed' using errcode = '23505';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(assignments, '[]'::jsonb))
      as item(style_id uuid, is_primary boolean, is_featured boolean, display_order integer)
    left join public.styles on styles.id = item.style_id
    where styles.id is null or styles.active = false or coalesce(item.display_order, 0) < 0
  ) then
    raise exception 'Style assignments must reference active styles' using errcode = '23514';
  end if;

  delete from public.product_styles where product_id = target_product_id;
  insert into public.product_styles(product_id, style_id, is_primary, is_featured, display_order)
  select
    target_product_id,
    item.style_id,
    coalesce(item.is_primary, false),
    coalesce(item.is_featured, false),
    coalesce(item.display_order, 0)
  from jsonb_to_recordset(coalesce(assignments, '[]'::jsonb))
    as item(style_id uuid, is_primary boolean, is_featured boolean, display_order integer);
end;
$$;

create or replace function public.reorder_style_products(
  target_style_id uuid,
  ordered_product_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission to order style products' using errcode = '42501';
  end if;
  if coalesce(array_length(ordered_product_ids, 1), 0) <> (
    select count(distinct value) from unnest(coalesce(ordered_product_ids, array[]::uuid[])) as value
  ) then
    raise exception 'Duplicate products are not allowed' using errcode = '23505';
  end if;
  if exists (
    select 1 from unnest(coalesce(ordered_product_ids, array[]::uuid[])) as value
    where not exists (
      select 1 from public.product_styles
      where product_styles.style_id = target_style_id and product_styles.product_id = value
    )
  ) then
    raise exception 'Product is not associated with this style' using errcode = '23514';
  end if;
  update public.product_styles relation
  set display_order = ordered.ordinality - 1
  from unnest(coalesce(ordered_product_ids, array[]::uuid[])) with ordinality as ordered(product_id, ordinality)
  where relation.style_id = target_style_id and relation.product_id = ordered.product_id;
end;
$$;

create or replace function public.curation_style_options(p_category_slug text default null)
returns table (
  id uuid,
  slug text,
  label text,
  description text,
  display_order integer,
  product_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    style.id,
    style.slug,
    style.label,
    style.description,
    style.display_order,
    count(distinct product.id) filter (where cover.id is not null)::bigint as product_count
  from public.styles style
  left join public.product_styles relation on relation.style_id = style.id
  left join public.products product
    on product.id = relation.product_id and product.published = true and product.archived_at is null
  left join public.categories category
    on category.id = product.category_id and category.active = true
  left join public.product_images cover
    on cover.product_id = product.id and cover.is_cover = true
    and btrim(cover.alt_text) <> '' and cover.width is not null and cover.height is not null
    and cover.blur_data_url is not null
  where style.active = true
    and (nullif(btrim(coalesce(p_category_slug, '')), '') is null or category.slug = p_category_slug)
  group by style.id, style.slug, style.label, style.description, style.display_order
  order by style.display_order, style.label, style.id;
$$;

create or replace function public.curation_category_options(p_style_slug text)
returns table (id uuid, slug text, name text, display_order integer, product_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select category.id, category.slug, category.name, category.display_order, count(distinct product.id)::bigint
  from public.categories category
  join public.products product on product.category_id = category.id
  join public.product_styles relation on relation.product_id = product.id
  join public.styles style on style.id = relation.style_id
  join public.product_images cover on cover.product_id = product.id and cover.is_cover = true
  where category.active = true and style.active = true and style.slug = p_style_slug
    and product.published = true and product.archived_at is null
    and btrim(cover.alt_text) <> '' and cover.width is not null and cover.height is not null
    and cover.blur_data_url is not null
  group by category.id, category.slug, category.name, category.display_order
  order by category.display_order, category.name, category.id;
$$;

create or replace function public.search_curated_catalog_products(
  p_style_slug text,
  p_search_term text default null,
  p_brand_slug text default null,
  p_category_slug text default null,
  p_availability public.availability_status default null,
  p_collection_slug text default null,
  p_page_size integer default 24,
  p_page_offset integer default 0
)
returns table (
  product_id uuid, sku text, slug text, product_name text,
  brand_id uuid, brand_name text, brand_slug text,
  category_id uuid, category_name text, category_slug text,
  model text, color text, short_description text, price numeric,
  price_visibility public.price_visibility,
  availability_status public.availability_status,
  featured boolean, display_order integer, updated_at timestamptz,
  cover_image_id uuid, cover_alt_text text, cover_blur_data_url text,
  cover_object_position text, cover_width integer, cover_height integer,
  cover_updated_at timestamptz,
  style_id uuid, style_slug text, style_label text,
  style_featured boolean, style_display_order integer,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible as (
    select
      product.id as product_id, product.sku, product.slug, product.name as product_name,
      brand.id as brand_id, brand.name as brand_name, brand.slug as brand_slug,
      category.id as category_id, category.name as category_name, category.slug as category_slug,
      product.model, product.color, product.short_description, product.price,
      product.price_visibility, product.availability_status, product.featured,
      product.display_order, product.updated_at,
      cover.id as cover_image_id, cover.alt_text as cover_alt_text,
      cover.blur_data_url as cover_blur_data_url,
      cover.object_position as cover_object_position,
      cover.width as cover_width, cover.height as cover_height, cover.updated_at as cover_updated_at,
      style.id as style_id, style.slug as style_slug, style.label as style_label,
      relation.is_featured as style_featured, relation.display_order as style_display_order
    from public.products product
    join public.product_styles relation on relation.product_id = product.id
    join public.styles style on style.id = relation.style_id and style.active = true
    left join public.brands brand on brand.id = product.brand_id and brand.active = true
    left join public.categories category on category.id = product.category_id and category.active = true
    join public.product_images cover on cover.product_id = product.id and cover.is_cover = true
    where style.slug = p_style_slug
      and product.published = true and product.archived_at is null
      and btrim(cover.alt_text) <> '' and cover.width is not null and cover.height is not null
      and cover.blur_data_url is not null
      and (product.brand_id is null or brand.id is not null)
      and (product.category_id is null or category.id is not null)
      and (
        nullif(btrim(coalesce(p_search_term, '')), '') is null
        or product.search_document like '%' || public.normalize_catalog_search(btrim(p_search_term)) || '%'
        or public.normalize_catalog_search(brand.name) like '%' || public.normalize_catalog_search(btrim(p_search_term)) || '%'
      )
      and (nullif(btrim(coalesce(p_brand_slug, '')), '') is null or brand.slug = p_brand_slug)
      and (nullif(btrim(coalesce(p_category_slug, '')), '') is null or category.slug = p_category_slug)
      and (p_availability is null or product.availability_status = p_availability)
      and (
        nullif(btrim(coalesce(p_collection_slug, '')), '') is null
        or exists (
          select 1 from public.collection_products collection_relation
          join public.collections collection on collection.id = collection_relation.collection_id
          where collection_relation.product_id = product.id and collection.slug = p_collection_slug
            and collection.published = true
            and (collection.starts_at is null or collection.starts_at <= now())
            and (collection.ends_at is null or collection.ends_at >= now())
        )
      )
  )
  select eligible.*, count(*) over () as total_count
  from eligible
  order by
    eligible.style_featured desc,
    eligible.style_display_order,
    eligible.featured desc,
    eligible.display_order,
    eligible.updated_at desc,
    eligible.product_id
  limit least(greatest(coalesce(p_page_size, 24), 1), 48)
  offset least(greatest(coalesce(p_page_offset, 0), 0), 100000);
$$;

revoke all on function public.sync_product_styles(uuid, jsonb) from public, anon;
revoke all on function public.reorder_style_products(uuid, uuid[]) from public, anon;
grant execute on function public.sync_product_styles(uuid, jsonb) to authenticated;
grant execute on function public.reorder_style_products(uuid, uuid[]) to authenticated;
revoke all on function public.curation_style_options(text) from public;
revoke all on function public.curation_category_options(text) from public;
revoke all on function public.search_curated_catalog_products(text, text, text, text, public.availability_status, text, integer, integer) from public;
grant execute on function public.curation_style_options(text) to anon, authenticated;
grant execute on function public.curation_category_options(text) to anon, authenticated;
grant execute on function public.search_curated_catalog_products(text, text, text, text, public.availability_status, text, integer, integer) to anon, authenticated;

comment on table public.styles is 'Taxonomia editorial controlada para a curadoria de estilo.';
comment on table public.product_styles is 'Classificação editorial explícita dos produtos, sem inferência automática.';

commit;
