begin;

create extension if not exists pg_trgm with schema extensions;

alter table public.product_images
  add column updated_at timestamptz not null default now();

create trigger product_images_set_updated_at
before update on public.product_images
for each row execute function private.set_updated_at();

create or replace function public.normalize_catalog_search(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select translate(
    lower(coalesce(value, '')),
    'áàâãäåéèêëíìîïóòôõöúùûüçñ',
    'aaaaaaeeeeiiiiooooouuuucn'
  );
$$;

alter table public.products
  add column search_document text generated always as (
    public.normalize_catalog_search(
      sku || ' ' || name || ' ' || coalesce(model, '') || ' ' || coalesce(color, '')
    )
  ) stored;

create index products_public_catalog_idx
  on public.products (published, archived_at, brand_id, category_id, display_order)
  where published = true and archived_at is null;

create index products_search_document_trgm_idx
  on public.products using gin (search_document extensions.gin_trgm_ops)
  where published = true and archived_at is null;

create index brands_normalized_name_trgm_idx
  on public.brands using gin (public.normalize_catalog_search(name) extensions.gin_trgm_ops)
  where active = true;

create index analytics_events_catalog_product_idx
  on public.analytics_events (event_name, product_id, created_at desc)
  where product_id is not null;

create index analytics_events_catalog_collection_idx
  on public.analytics_events (event_name, collection_id, created_at desc)
  where collection_id is not null;

create table private.public_event_rate_limits (
  fingerprint_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (fingerprint_hash, bucket_start),
  constraint public_event_rate_limits_hash_format check (
    fingerprint_hash ~ '^[a-f0-9]{64}$'
  ),
  constraint public_event_rate_limits_count_positive check (request_count > 0)
);

revoke all on table private.public_event_rate_limits from public, anon, authenticated;

create or replace function public.search_catalog_products(
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

create or replace function public.catalog_filter_options()
returns table (
  option_type text,
  option_key text,
  option_name text,
  product_count bigint,
  display_order integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible as (
    select
      product.id,
      product.brand_id,
      product.category_id,
      product.availability_status
    from public.products as product
    left join public.brands as brand
      on brand.id = product.brand_id and brand.active = true
    left join public.categories as category
      on category.id = product.category_id and category.active = true
    where product.published = true
      and product.archived_at is null
      and (product.brand_id is null or brand.id is not null)
      and (product.category_id is null or category.id is not null)
      and exists (
        select 1
        from public.product_images as cover
        where cover.product_id = product.id
          and cover.is_cover = true
          and btrim(cover.alt_text) <> ''
          and cover.width is not null
          and cover.height is not null
      )
  )
  select 'brand', brand.slug, brand.name, count(*)::bigint, brand.display_order
  from eligible
  inner join public.brands as brand on brand.id = eligible.brand_id and brand.active = true
  group by brand.id, brand.slug, brand.name, brand.display_order

  union all

  select 'category', category.slug, category.name, count(*)::bigint, category.display_order
  from eligible
  inner join public.categories as category on category.id = eligible.category_id and category.active = true
  group by category.id, category.slug, category.name, category.display_order

  union all

  select 'availability', eligible.availability_status::text, eligible.availability_status::text, count(*)::bigint, 0
  from eligible
  group by eligible.availability_status

  union all

  select 'collection', collection.slug, collection.name, count(distinct eligible.id)::bigint, collection.display_order
  from eligible
  inner join public.collection_products as relation on relation.product_id = eligible.id
  inner join public.collections as collection
    on collection.id = relation.collection_id
    and collection.published = true
    and (collection.starts_at is null or collection.starts_at <= now())
    and (collection.ends_at is null or collection.ends_at >= now())
  group by collection.id, collection.slug, collection.name, collection.display_order;
$$;

create or replace function public.catalog_sitemap_products()
returns table (slug text, updated_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select product.slug, product.updated_at
  from public.products as product
  left join public.brands as brand
    on brand.id = product.brand_id and brand.active = true
  left join public.categories as category
    on category.id = product.category_id and category.active = true
  where product.published = true
    and product.archived_at is null
    and (product.brand_id is null or brand.id is not null)
    and (product.category_id is null or category.id is not null)
    and exists (
      select 1
      from public.product_images as cover
      where cover.product_id = product.id
        and cover.is_cover = true
        and btrim(cover.alt_text) <> ''
        and cover.width is not null
        and cover.height is not null
    )
  order by product.updated_at desc, product.slug;
$$;

create or replace function public.record_public_analytics_event(
  p_event_name public.analytics_event_name,
  p_product_id uuid,
  p_collection_id uuid,
  p_promotion_id uuid,
  p_route text,
  p_referrer_domain text,
  p_anonymous_session_id uuid,
  p_metadata jsonb,
  p_fingerprint_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_bucket timestamptz := date_trunc('minute', now());
  accepted_count integer;
  clean_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_event_name not in (
    'page_view',
    'product_view',
    'product_whatsapp_click',
    'collection_view',
    'promotion_view',
    'promotion_click',
    'gallery_interaction',
    'catalog_search',
    'catalog_filter'
  ) then
    return false;
  end if;

  if p_route is null
    or p_route !~ '^/[^/].*|^/$'
    or char_length(p_route) > 500
    or (p_referrer_domain is not null and char_length(p_referrer_domain) > 255)
    or p_fingerprint_hash !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(clean_metadata) <> 'object'
    or pg_column_size(clean_metadata) > 4096
  then
    return false;
  end if;

  if p_event_name in ('product_view', 'product_whatsapp_click') and (
    p_product_id is null
    or not exists (
      select 1
      from public.products as product
      where product.id = p_product_id
        and product.published = true
        and product.archived_at is null
        and (product.brand_id is null or exists (
          select 1 from public.brands as brand where brand.id = product.brand_id and brand.active = true
        ))
        and (product.category_id is null or exists (
          select 1 from public.categories as category where category.id = product.category_id and category.active = true
        ))
        and exists (
          select 1 from public.product_images as cover
          where cover.product_id = product.id and cover.is_cover = true
        )
    )
  ) then
    return false;
  end if;

  if p_event_name = 'collection_view' and (
    p_collection_id is null
    or not exists (
      select 1
      from public.collections as collection
      where collection.id = p_collection_id
        and collection.published = true
        and (collection.starts_at is null or collection.starts_at <= now())
        and (collection.ends_at is null or collection.ends_at >= now())
    )
  ) then
    return false;
  end if;

  insert into private.public_event_rate_limits (
    fingerprint_hash,
    bucket_start,
    request_count,
    updated_at
  ) values (
    p_fingerprint_hash,
    current_bucket,
    1,
    now()
  )
  on conflict (fingerprint_hash, bucket_start) do update
    set request_count = private.public_event_rate_limits.request_count + 1,
        updated_at = now()
    where private.public_event_rate_limits.request_count < 45
  returning request_count into accepted_count;

  if accepted_count is null then
    return false;
  end if;

  if p_anonymous_session_id is not null
    and p_event_name in ('product_view', 'collection_view')
    and exists (
      select 1
      from public.analytics_events as event
      where event.event_name = p_event_name
        and event.anonymous_session_id = p_anonymous_session_id
        and event.product_id is not distinct from p_product_id
        and event.collection_id is not distinct from p_collection_id
        and event.created_at >= now() - interval '30 minutes'
    )
  then
    return true;
  end if;

  insert into public.analytics_events (
    event_name,
    product_id,
    collection_id,
    promotion_id,
    route,
    referrer_domain,
    anonymous_session_id,
    metadata
  ) values (
    p_event_name,
    p_product_id,
    p_collection_id,
    p_promotion_id,
    p_route,
    p_referrer_domain,
    p_anonymous_session_id,
    clean_metadata
  );

  if random() < 0.01 then
    delete from private.public_event_rate_limits
    where bucket_start < now() - interval '2 hours';
  end if;

  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function public.admin_catalog_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  result jsonb;
  safe_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if not private.has_any_role(array['admin']::public.admin_role[]) then
    raise exception 'Administrative analytics access required' using errcode = '42501';
  end if;

  with scoped as (
    select *
    from public.analytics_events
    where created_at >= now() - make_interval(days => safe_days)
  )
  select jsonb_build_object(
    'days', safe_days,
    'topProducts', coalesce((
      select jsonb_agg(to_jsonb(ranked) order by ranked.views desc, ranked.clicks desc, ranked.name)
      from (
        select
          product.id,
          product.name,
          product.slug,
          count(*) filter (where scoped.event_name = 'product_view')::integer as views,
          count(*) filter (where scoped.event_name = 'product_whatsapp_click')::integer as clicks,
          round(
            100.0 * count(*) filter (where scoped.event_name = 'product_whatsapp_click')
            / nullif(count(*) filter (where scoped.event_name = 'product_view'), 0),
            1
          ) as click_rate
        from scoped
        inner join public.products as product on product.id = scoped.product_id
        where scoped.event_name in ('product_view', 'product_whatsapp_click')
        group by product.id, product.name, product.slug
        order by views desc, clicks desc, product.name
        limit 10
      ) as ranked
    ), '[]'::jsonb),
    'topBrands', coalesce((
      select jsonb_agg(to_jsonb(ranked) order by ranked.views desc, ranked.name)
      from (
        select brand.id, brand.name, brand.slug, count(*)::integer as views
        from scoped
        inner join public.products as product on product.id = scoped.product_id
        inner join public.brands as brand on brand.id = product.brand_id
        where scoped.event_name = 'product_view'
        group by brand.id, brand.name, brand.slug
        order by views desc, brand.name
        limit 10
      ) as ranked
    ), '[]'::jsonb),
    'topSearches', coalesce((
      select jsonb_agg(to_jsonb(ranked) order by ranked.uses desc, ranked.query)
      from (
        select metadata ->> 'query' as query, count(*)::integer as uses
        from scoped
        where event_name = 'catalog_search'
          and nullif(btrim(metadata ->> 'query'), '') is not null
        group by metadata ->> 'query'
        order by uses desc, query
        limit 15
      ) as ranked
    ), '[]'::jsonb),
    'topFilters', coalesce((
      select jsonb_agg(to_jsonb(ranked) order by ranked.uses desc, ranked.filter_name, ranked.value)
      from (
        select
          metadata ->> 'filter' as filter_name,
          metadata ->> 'value' as value,
          count(*)::integer as uses
        from scoped
        where event_name = 'catalog_filter'
          and nullif(btrim(metadata ->> 'filter'), '') is not null
          and nullif(btrim(metadata ->> 'value'), '') is not null
        group by metadata ->> 'filter', metadata ->> 'value'
        order by uses desc, filter_name, value
        limit 20
      ) as ranked
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

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

create or replace function private.protect_public_taxonomy_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active = true and new.active = false then
    if tg_table_name = 'brands' and exists (
      select 1 from public.products
      where brand_id = old.id and published = true and archived_at is null
    ) then
      raise exception 'Unpublish linked products before disabling this brand' using errcode = '23514';
    end if;

    if tg_table_name = 'categories' and exists (
      select 1 from public.products
      where category_id = old.id and published = true and archived_at is null
    ) then
      raise exception 'Unpublish linked products before disabling this category' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger brands_protect_public_state
before update of active on public.brands
for each row execute function private.protect_public_taxonomy_state();

create trigger categories_protect_public_state
before update of active on public.categories
for each row execute function private.protect_public_taxonomy_state();

revoke all on function public.normalize_catalog_search(text) from public;
revoke all on function public.search_catalog_products(text, text, text, public.availability_status, text, integer, integer) from public;
revoke all on function public.catalog_filter_options() from public;
revoke all on function public.catalog_sitemap_products() from public;
revoke all on function public.record_public_analytics_event(public.analytics_event_name, uuid, uuid, uuid, text, text, uuid, jsonb, text) from public;
revoke all on function public.admin_catalog_analytics(integer) from public;
revoke all on function private.protect_public_taxonomy_state() from public, anon, authenticated;

grant execute on function public.normalize_catalog_search(text) to anon, authenticated;
grant execute on function public.search_catalog_products(text, text, text, public.availability_status, text, integer, integer) to anon, authenticated;
grant execute on function public.catalog_filter_options() to anon, authenticated;
grant execute on function public.catalog_sitemap_products() to anon, authenticated;
grant execute on function public.record_public_analytics_event(public.analytics_event_name, uuid, uuid, uuid, text, text, uuid, jsonb, text) to service_role;
grant execute on function public.admin_catalog_analytics(integer) to authenticated;

commit;
