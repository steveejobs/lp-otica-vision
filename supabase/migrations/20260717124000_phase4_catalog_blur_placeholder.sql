begin;

drop function public.search_catalog_products(
  text,
  text,
  text,
  public.availability_status,
  text,
  integer,
  integer
);

create function public.search_catalog_products(
  p_search_term text default null,
  p_brand_slug text default null,
  p_category_slug text default null,
  p_availability public.availability_status default null,
  p_collection_slug text default null,
  p_page_size integer default 24,
  p_page_offset integer default 0
)
returns table (
  product_id uuid,
  sku text,
  slug text,
  product_name text,
  brand_id uuid,
  brand_name text,
  brand_slug text,
  category_id uuid,
  category_name text,
  category_slug text,
  model text,
  color text,
  short_description text,
  price numeric,
  price_visibility public.price_visibility,
  availability_status public.availability_status,
  featured boolean,
  display_order integer,
  updated_at timestamptz,
  cover_image_id uuid,
  cover_alt_text text,
  cover_blur_data_url text,
  cover_object_position text,
  cover_width integer,
  cover_height integer,
  cover_updated_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible as (
    select
      product.id as product_id,
      product.sku,
      product.slug,
      product.name as product_name,
      brand.id as brand_id,
      brand.name as brand_name,
      brand.slug as brand_slug,
      category.id as category_id,
      category.name as category_name,
      category.slug as category_slug,
      product.model,
      product.color,
      product.short_description,
      product.price,
      product.price_visibility,
      product.availability_status,
      product.featured,
      product.display_order,
      product.updated_at,
      cover.id as cover_image_id,
      cover.alt_text as cover_alt_text,
      cover.blur_data_url as cover_blur_data_url,
      cover.object_position as cover_object_position,
      cover.width as cover_width,
      cover.height as cover_height,
      cover.updated_at as cover_updated_at,
      coalesce(brand.display_order, 2147483647) as brand_order
    from public.products as product
    left join public.brands as brand
      on brand.id = product.brand_id and brand.active = true
    left join public.categories as category
      on category.id = product.category_id and category.active = true
    inner join public.product_images as cover
      on cover.product_id = product.id and cover.is_cover = true
    where product.published = true
      and product.archived_at is null
      and btrim(cover.alt_text) <> ''
      and cover.width is not null
      and cover.height is not null
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
          select 1
          from public.collection_products as relation
          inner join public.collections as collection
            on collection.id = relation.collection_id
          where relation.product_id = product.id
            and collection.slug = p_collection_slug
            and collection.published = true
            and (collection.starts_at is null or collection.starts_at <= now())
            and (collection.ends_at is null or collection.ends_at >= now())
        )
      )
  )
  select
    eligible.product_id,
    eligible.sku,
    eligible.slug,
    eligible.product_name,
    eligible.brand_id,
    eligible.brand_name,
    eligible.brand_slug,
    eligible.category_id,
    eligible.category_name,
    eligible.category_slug,
    eligible.model,
    eligible.color,
    eligible.short_description,
    eligible.price,
    eligible.price_visibility,
    eligible.availability_status,
    eligible.featured,
    eligible.display_order,
    eligible.updated_at,
    eligible.cover_image_id,
    eligible.cover_alt_text,
    eligible.cover_blur_data_url,
    eligible.cover_object_position,
    eligible.cover_width,
    eligible.cover_height,
    eligible.cover_updated_at,
    count(*) over () as total_count
  from eligible
  order by eligible.brand_order, eligible.brand_name nulls last, eligible.display_order, eligible.product_name, eligible.product_id
  limit least(greatest(coalesce(p_page_size, 24), 1), 48)
  offset least(greatest(coalesce(p_page_offset, 0), 0), 100000);
$$;

revoke all on function public.search_catalog_products(
  text,
  text,
  text,
  public.availability_status,
  text,
  integer,
  integer
) from public;
grant execute on function public.search_catalog_products(
  text,
  text,
  text,
  public.availability_status,
  text,
  integer,
  integer
) to anon, authenticated;

comment on function public.search_catalog_products(
  text,
  text,
  text,
  public.availability_status,
  text,
  integer,
  integer
) is 'Catalog search with persisted cover dimensions and inline blur placeholder.';

commit;
