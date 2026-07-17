begin;

create or replace function private.current_user_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and active = true
  limit 1;
$$;

create or replace function private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and active = true
  );
$$;

create or replace function private.has_any_role(allowed_roles public.admin_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_user_role() = any (allowed_roles), false);
$$;

revoke all on function private.current_user_role() from public, anon;
revoke all on function private.is_active_staff() from public, anon;
revoke all on function private.has_any_role(public.admin_role[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_active_staff() to authenticated;
grant execute on function private.has_any_role(public.admin_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.collections enable row level security;
alter table public.collection_products enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_items enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.site_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant usage on type public.admin_role to anon, authenticated;
grant usage on type public.price_visibility to anon, authenticated;
grant usage on type public.availability_status to anon, authenticated;
grant usage on type public.promotion_type to anon, authenticated;
grant usage on type public.analytics_event_name to anon, authenticated;

grant select on public.brands to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant select on public.collections to anon, authenticated;
grant select on public.collection_products to anon, authenticated;
grant select on public.galleries to anon, authenticated;
grant select on public.gallery_items to anon, authenticated;
grant select on public.promotions to anon, authenticated;
grant select on public.promotion_products to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant insert, update, delete on public.brands to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.product_images to authenticated;
grant insert, update, delete on public.collections to authenticated;
grant insert, update, delete on public.collection_products to authenticated;
grant insert, update, delete on public.galleries to authenticated;
grant insert, update, delete on public.gallery_items to authenticated;
grant insert, update, delete on public.promotions to authenticated;
grant insert, update, delete on public.promotion_products to authenticated;
grant select on public.analytics_events to authenticated;
grant select on public.audit_logs to authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;

create policy "public reads active brands"
on public.brands for select to anon
using (active = true);

create policy "staff reads all brands"
on public.brands for select to authenticated
using (private.is_active_staff());

create policy "editors manage brands"
on public.brands for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "public reads active categories"
on public.categories for select to anon
using (active = true);

create policy "staff reads all categories"
on public.categories for select to authenticated
using (private.is_active_staff());

create policy "editors manage categories"
on public.categories for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "public reads published products"
on public.products for select to anon
using (published = true);

create policy "staff reads all products"
on public.products for select to authenticated
using (private.is_active_staff());

create policy "editors manage products"
on public.products for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "attendants update product availability"
on public.products for update to authenticated
using (private.has_any_role(array['attendant']::public.admin_role[]))
with check (private.has_any_role(array['attendant']::public.admin_role[]));

create policy "public reads images of published products"
on public.product_images for select to anon
using (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and products.published = true
  )
);

create policy "staff reads all product images"
on public.product_images for select to authenticated
using (private.is_active_staff());

create policy "editors manage product images"
on public.product_images for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "public reads current collections"
on public.collections for select to anon
using (
  published = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

create policy "staff reads all collections"
on public.collections for select to authenticated
using (private.is_active_staff());

create policy "editors manage collections"
on public.collections for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

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
  )
);

create policy "staff reads all collection products"
on public.collection_products for select to authenticated
using (private.is_active_staff());

create policy "editors manage collection products"
on public.collection_products for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "public reads published galleries"
on public.galleries for select to anon
using (published = true);

create policy "staff reads all galleries"
on public.galleries for select to authenticated
using (private.is_active_staff());

create policy "editors manage galleries"
on public.galleries for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "public reads published gallery items"
on public.gallery_items for select to anon
using (
  published = true
  and exists (
    select 1 from public.galleries
    where galleries.id = gallery_items.gallery_id
      and galleries.published = true
  )
);

create policy "staff reads all gallery items"
on public.gallery_items for select to authenticated
using (private.is_active_staff());

create policy "editors manage gallery items"
on public.gallery_items for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "public reads current promotions"
on public.promotions for select to anon
using (
  active = true
  and starts_at <= now()
  and ends_at >= now()
);

create policy "staff reads all promotions"
on public.promotions for select to authenticated
using (private.is_active_staff());

create policy "editors manage promotions"
on public.promotions for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

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
  )
);

create policy "staff reads all promotion products"
on public.promotion_products for select to authenticated
using (private.is_active_staff());

create policy "editors manage promotion products"
on public.promotion_products for all to authenticated
using (private.has_any_role(array['admin', 'editor']::public.admin_role[]))
with check (private.has_any_role(array['admin', 'editor']::public.admin_role[]));

create policy "users read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "admins read all profiles"
on public.profiles for select to authenticated
using (private.has_any_role(array['admin']::public.admin_role[]));

create policy "admins insert profiles"
on public.profiles for insert to authenticated
with check (private.has_any_role(array['admin']::public.admin_role[]));

create policy "admins update profiles"
on public.profiles for update to authenticated
using (private.has_any_role(array['admin']::public.admin_role[]))
with check (private.has_any_role(array['admin']::public.admin_role[]));

create policy "admins delete profiles"
on public.profiles for delete to authenticated
using (private.has_any_role(array['admin']::public.admin_role[]));

create policy "active staff reads settings"
on public.site_settings for select to authenticated
using (private.is_active_staff());

create policy "admins manage settings"
on public.site_settings for all to authenticated
using (private.has_any_role(array['admin']::public.admin_role[]))
with check (private.has_any_role(array['admin']::public.admin_role[]));

create policy "admins read analytics"
on public.analytics_events for select to authenticated
using (private.has_any_role(array['admin']::public.admin_role[]));

create policy "admins read audit logs"
on public.audit_logs for select to authenticated
using (private.has_any_role(array['admin']::public.admin_role[]));

create or replace function private.authorize_and_stamp_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_role public.admin_role;
begin
  if actor is null then
    return new;
  end if;

  actor_role := private.current_user_role();

  if tg_op = 'INSERT' then
    if actor_role is null or actor_role not in ('admin', 'editor') then
      raise exception 'Insufficient permission to create products' using errcode = '42501';
    end if;
    new.created_by := actor;
    new.updated_by := actor;
    return new;
  end if;

  if actor_role in ('admin', 'editor') then
    new.updated_by := actor;
    return new;
  end if;

  if actor_role = 'attendant' then
    if (to_jsonb(new) - array['availability_status', 'updated_by', 'updated_at'])
      is distinct from
      (to_jsonb(old) - array['availability_status', 'updated_by', 'updated_at']) then
      raise exception 'Attendants may only change product availability' using errcode = '42501';
    end if;
    new.updated_by := actor;
    return new;
  end if;

  raise exception 'Inactive or unauthorized user' using errcode = '42501';
end;
$$;

create trigger products_authorize_and_stamp
before insert or update on public.products
for each row execute function private.authorize_and_stamp_product();

create or replace function private.stamp_setting_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger site_settings_stamp_actor
before insert or update on public.site_settings
for each row execute function private.stamp_setting_actor();

create or replace function private.redact_audit_json(payload jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  result jsonb;
  item record;
begin
  if payload is null then
    return null;
  end if;

  if jsonb_typeof(payload) = 'object' then
    result := '{}'::jsonb;
    for item in select key, value from jsonb_each(payload)
    loop
      if item.key !~* '(password|secret|token|authorization|api[_-]?key|cookie)' then
        result := result || jsonb_build_object(item.key, private.redact_audit_json(item.value));
      end if;
    end loop;
    return result;
  end if;

  if jsonb_typeof(payload) = 'array' then
    select coalesce(jsonb_agg(private.redact_audit_json(value)), '[]'::jsonb)
      into result
      from jsonb_array_elements(payload);
    return result;
  end if;

  return payload;
end;
$$;

create or replace function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_payload jsonb;
  new_payload jsonb;
  identifier text;
  actor uuid := auth.uid();
begin
  if tg_op <> 'INSERT' then
    old_payload := to_jsonb(old);
  end if;
  if tg_op <> 'DELETE' then
    new_payload := to_jsonb(new);
  end if;

  if tg_table_name = 'collection_products' then
    identifier := (coalesce(new_payload, old_payload) ->> 'collection_id')
      || ':' || (coalesce(new_payload, old_payload) ->> 'product_id');
  elsif tg_table_name = 'promotion_products' then
    identifier := (coalesce(new_payload, old_payload) ->> 'promotion_id')
      || ':' || (coalesce(new_payload, old_payload) ->> 'product_id');
  elsif tg_table_name = 'site_settings' then
    identifier := coalesce(new_payload, old_payload) ->> 'key';
  else
    identifier := coalesce(new_payload, old_payload) ->> 'id';
  end if;

  if actor is null then
    actor := coalesce(
      nullif(new_payload ->> 'updated_by', '')::uuid,
      nullif(new_payload ->> 'created_by', '')::uuid,
      nullif(old_payload ->> 'updated_by', '')::uuid,
      nullif(old_payload ->> 'created_by', '')::uuid
    );
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  ) values (
    actor,
    lower(tg_op),
    tg_table_name,
    identifier,
    private.redact_audit_json(old_payload),
    private.redact_audit_json(new_payload)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger profiles_audit
after insert or update or delete on public.profiles
for each row execute function private.write_audit_log();
create trigger brands_audit
after insert or update or delete on public.brands
for each row execute function private.write_audit_log();
create trigger categories_audit
after insert or update or delete on public.categories
for each row execute function private.write_audit_log();
create trigger products_audit
after insert or update or delete on public.products
for each row execute function private.write_audit_log();
create trigger product_images_audit
after insert or update or delete on public.product_images
for each row execute function private.write_audit_log();
create trigger collections_audit
after insert or update or delete on public.collections
for each row execute function private.write_audit_log();
create trigger collection_products_audit
after insert or update or delete on public.collection_products
for each row execute function private.write_audit_log();
create trigger galleries_audit
after insert or update or delete on public.galleries
for each row execute function private.write_audit_log();
create trigger gallery_items_audit
after insert or update or delete on public.gallery_items
for each row execute function private.write_audit_log();
create trigger promotions_audit
after insert or update or delete on public.promotions
for each row execute function private.write_audit_log();
create trigger promotion_products_audit
after insert or update or delete on public.promotion_products
for each row execute function private.write_audit_log();
create trigger site_settings_audit
after insert or update or delete on public.site_settings
for each row execute function private.write_audit_log();

revoke all on function private.authorize_and_stamp_product() from public, anon, authenticated;
revoke all on function private.stamp_setting_actor() from public, anon, authenticated;
revoke all on function private.redact_audit_json(jsonb) from public, anon, authenticated;
revoke all on function private.write_audit_log() from public, anon, authenticated;

commit;
