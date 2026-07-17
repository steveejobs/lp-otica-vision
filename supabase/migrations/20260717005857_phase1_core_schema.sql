begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create type public.admin_role as enum ('admin', 'editor', 'attendant');
create type public.price_visibility as enum ('visible', 'consult', 'hidden');
create type public.availability_status as enum (
  'available',
  'last_unit',
  'consultation',
  'unavailable'
);
create type public.promotion_type as enum (
  'promotion',
  'highlight',
  'launch',
  'collection'
);
create type public.analytics_event_name as enum (
  'page_view',
  'product_view',
  'product_whatsapp_click',
  'collection_view',
  'promotion_view',
  'promotion_click',
  'gallery_interaction'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  role public.admin_role not null default 'attendant',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_length check (name is null or char_length(name) between 1 and 120)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_name_not_blank check (btrim(name) <> ''),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint brands_display_order_nonnegative check (display_order >= 0)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (btrim(name) <> ''),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_display_order_nonnegative check (display_order >= 0)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  slug text not null unique,
  name text not null,
  brand_id uuid references public.brands (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  model text,
  color text,
  short_description text,
  price numeric(12, 2),
  price_visibility public.price_visibility not null default 'consult',
  availability_status public.availability_status not null default 'consultation',
  published boolean not null default false,
  featured boolean not null default false,
  display_order integer not null default 0,
  whatsapp_message_override text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sku_not_blank check (btrim(sku) <> ''),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_price_nonnegative check (price is null or price >= 0),
  constraint products_display_order_nonnegative check (display_order >= 0),
  constraint products_whatsapp_override_length check (
    whatsapp_message_override is null or char_length(whatsapp_message_override) <= 1200
  )
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null,
  display_order integer not null default 0,
  is_cover boolean not null default false,
  object_position text not null default '50% 50%',
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint product_images_storage_path_not_blank check (btrim(storage_path) <> ''),
  constraint product_images_alt_text_not_blank check (btrim(alt_text) <> ''),
  constraint product_images_display_order_nonnegative check (display_order >= 0),
  constraint product_images_dimensions_positive check (
    (width is null or width > 0) and (height is null or height > 0)
  )
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  cover_path text,
  published boolean not null default false,
  featured boolean not null default false,
  display_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_name_not_blank check (btrim(name) <> ''),
  constraint collections_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint collections_display_order_nonnegative check (display_order >= 0),
  constraint collections_publication_window check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  )
);

create table public.collection_products (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  display_order integer not null default 0,
  primary key (collection_id, product_id),
  constraint collection_products_display_order_nonnegative check (display_order >= 0)
);

create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  route_key text not null unique,
  published boolean not null default false,
  autoplay boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint galleries_name_not_blank check (btrim(name) <> ''),
  constraint galleries_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint galleries_route_key_format check (route_key ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'),
  constraint galleries_display_order_nonnegative check (display_order >= 0)
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null,
  visual_series text,
  series_order integer,
  display_order integer not null default 0,
  mobile_object_position text not null default '50% 50%',
  desktop_object_position text not null default '50% 50%',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_items_storage_path_not_blank check (btrim(storage_path) <> ''),
  constraint gallery_items_alt_text_not_blank check (btrim(alt_text) <> ''),
  constraint gallery_items_series_order_nonnegative check (series_order is null or series_order >= 0),
  constraint gallery_items_series_consistency check (series_order is null or visual_series is not null),
  constraint gallery_items_display_order_nonnegative check (display_order >= 0)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  type public.promotion_type not null,
  title text not null,
  slug text not null unique,
  short_description text,
  image_path text not null,
  cta_label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default false,
  featured boolean not null default false,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_title_not_blank check (btrim(title) <> ''),
  constraint promotions_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint promotions_image_path_not_blank check (btrim(image_path) <> ''),
  constraint promotions_cta_label_not_blank check (btrim(cta_label) <> ''),
  constraint promotions_publication_window check (ends_at >= starts_at),
  constraint promotions_priority_nonnegative check (priority >= 0)
);

create table public.promotion_products (
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  display_order integer not null default 0,
  primary key (promotion_id, product_id),
  constraint promotion_products_display_order_nonnegative check (display_order >= 0)
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name public.analytics_event_name not null,
  product_id uuid references public.products (id) on delete set null,
  collection_id uuid references public.collections (id) on delete set null,
  promotion_id uuid references public.promotions (id) on delete set null,
  route text not null,
  referrer_domain text,
  anonymous_session_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_route_length check (char_length(route) between 1 and 500),
  constraint analytics_events_referrer_domain_length check (
    referrer_domain is null or char_length(referrer_domain) <= 255
  ),
  constraint analytics_events_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint analytics_events_metadata_size check (pg_column_size(metadata) <= 4096)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_blank check (btrim(action) <> ''),
  constraint audit_logs_entity_type_not_blank check (btrim(entity_type) <> '')
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint site_settings_key_format check (key ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'),
  constraint site_settings_value_size check (pg_column_size(value) <= 16384)
);

create unique index product_images_one_cover_per_product_idx
  on public.product_images (product_id)
  where is_cover;

create index products_published_idx on public.products (published);
create index products_featured_idx on public.products (featured);
create index products_brand_id_idx on public.products (brand_id);
create index products_category_id_idx on public.products (category_id);
create index products_availability_status_idx on public.products (availability_status);
create index product_images_product_id_idx on public.product_images (product_id);
create index collection_products_product_id_idx on public.collection_products (product_id);
create index gallery_items_gallery_id_idx on public.gallery_items (gallery_id);
create index gallery_items_visual_series_idx on public.gallery_items (gallery_id, visual_series, series_order);
create index promotions_active_idx on public.promotions (active);
create index promotions_starts_at_idx on public.promotions (starts_at);
create index promotions_ends_at_idx on public.promotions (ends_at);
create index promotion_products_product_id_idx on public.promotion_products (product_id);
create index analytics_events_event_name_idx on public.analytics_events (event_name);
create index analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger brands_set_updated_at
before update on public.brands
for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger collections_set_updated_at
before update on public.collections
for each row execute function private.set_updated_at();

create trigger galleries_set_updated_at
before update on public.galleries
for each row execute function private.set_updated_at();

create trigger gallery_items_set_updated_at
before update on public.gallery_items
for each row execute function private.set_updated_at();

create trigger promotions_set_updated_at
before update on public.promotions
for each row execute function private.set_updated_at();

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '')
  );

  insert into public.profiles (id, name, role, active)
  values (new.id, profile_name, 'attendant', false)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

comment on table public.analytics_events is
  'Eventos anonimos sem PII; insercao apenas por infraestrutura server-side validada.';
comment on table public.audit_logs is
  'Trilha imutavel gerada por triggers para mutacoes administrativas.';
comment on column public.gallery_items.visual_series is
  'Identifica itens do mesmo ensaio para preservar coerencia editorial.';

commit;
