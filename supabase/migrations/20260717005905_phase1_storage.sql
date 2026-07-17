begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'catalog-products',
    'catalog-products',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
  ),
  (
    'site-galleries',
    'site-galleries',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
  ),
  (
    'promotions',
    'promotions',
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

create policy "active staff reads managed images"
on storage.objects for select to authenticated
using (
  bucket_id in ('catalog-products', 'site-galleries', 'promotions')
  and private.is_active_staff()
);

create policy "editors upload managed images"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('catalog-products', 'site-galleries', 'promotions')
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|webp|avif)$'
);

create policy "editors update managed images"
on storage.objects for update to authenticated
using (
  bucket_id in ('catalog-products', 'site-galleries', 'promotions')
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
)
with check (
  bucket_id in ('catalog-products', 'site-galleries', 'promotions')
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|webp|avif)$'
);

create policy "editors delete managed images"
on storage.objects for delete to authenticated
using (
  bucket_id in ('catalog-products', 'site-galleries', 'promotions')
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
);

commit;
