begin;

create table public.product_image_uploads (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '2 hours 10 minutes'),
  created_at timestamptz not null default now(),
  constraint product_image_uploads_storage_path_format check (
    storage_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|webp|avif)$'
  ),
  constraint product_image_uploads_mime_type_allowed check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  ),
  constraint product_image_uploads_size_bytes_range check (
    size_bytes > 0 and size_bytes <= 8388608
  ),
  constraint product_image_uploads_expiry_after_creation check (
    expires_at > created_at
  )
);

create index product_image_uploads_expiry_idx
  on public.product_image_uploads (expires_at);

create index product_image_uploads_owner_product_idx
  on public.product_image_uploads (created_by, product_id);

alter table public.product_image_uploads enable row level security;

revoke all on public.product_image_uploads from anon, authenticated;
grant select, insert, delete on public.product_image_uploads to authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

create policy "editors read own staged product uploads"
on public.product_image_uploads for select to authenticated
using (
  created_by = auth.uid()
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
);

create policy "editors create own staged product uploads"
on public.product_image_uploads for insert to authenticated
with check (
  created_by = auth.uid()
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
);

create policy "editors remove own staged product uploads"
on public.product_image_uploads for delete to authenticated
using (
  created_by = auth.uid()
  and private.has_any_role(array['admin', 'editor']::public.admin_role[])
);

comment on table public.product_image_uploads is
  'Registro temporario de originais enviados diretamente ao Storage privado. Expira depois da URL assinada e permite limpeza segura de orfaos.';
comment on column public.product_image_uploads.storage_path is
  'Caminho temporario privado. Nunca deve ser usado pelo catalogo publico.';

commit;
