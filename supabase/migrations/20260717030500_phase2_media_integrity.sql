begin;

create unique index products_sku_case_insensitive_idx
  on public.products (lower(btrim(sku)));

alter table public.products
  add constraint products_sku_length check (char_length(btrim(sku)) between 1 and 80),
  add constraint products_name_length check (char_length(btrim(name)) between 1 and 160),
  add constraint products_model_length check (model is null or char_length(model) <= 120),
  add constraint products_color_length check (color is null or char_length(color) <= 120),
  add constraint products_description_length check (
    short_description is null or char_length(short_description) <= 600
  );

create or replace function private.enforce_product_cover_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_product_id uuid;
begin
  if tg_op = 'DELETE' then
    target_product_id := old.product_id;
  else
    target_product_id := new.product_id;
  end if;
  if exists (
    select 1
    from public.products
    where id = target_product_id
      and published = true
      and archived_at is null
  ) and not exists (
    select 1
    from public.product_images
    where product_id = target_product_id
      and is_cover = true
      and btrim(alt_text) <> ''
      and width is not null
      and height is not null
  ) then
    raise exception 'Published products require a complete cover image' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger product_images_preserve_published_cover
after insert or update or delete on public.product_images
deferrable initially deferred
for each row execute function private.enforce_product_cover_integrity();

create or replace function private.enforce_gallery_image_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_gallery_id uuid;
begin
  if tg_op = 'DELETE' then
    target_gallery_id := old.gallery_id;
  else
    target_gallery_id := new.gallery_id;
  end if;
  if exists (
    select 1
    from public.galleries
    where id = target_gallery_id and published = true
  ) and not exists (
    select 1
    from public.gallery_items
    where gallery_id = target_gallery_id
      and published = true
      and btrim(alt_text) <> ''
      and width is not null
      and height is not null
  ) then
    raise exception 'Published galleries require a published image' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger gallery_items_preserve_published_image
after insert or update or delete on public.gallery_items
deferrable initially deferred
for each row execute function private.enforce_gallery_image_integrity();

revoke all on function private.enforce_product_cover_integrity() from public, anon, authenticated;
revoke all on function private.enforce_gallery_image_integrity() from public, anon, authenticated;

commit;
