begin;

create or replace function public.rollback_gallery_revision(target_gallery_id uuid, target_publication_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.gallery_publications%rowtype;
begin
  if not private.has_any_role(array['admin', 'editor']::public.admin_role[]) then
    raise exception 'Insufficient permission to rollback gallery' using errcode = '42501';
  end if;
  select * into target from public.gallery_publications
  where id = target_publication_id and gallery_id = target_gallery_id for update;
  if target.id is null then raise exception 'Gallery publication not found' using errcode = 'P0002'; end if;
  update public.gallery_publications set active = false where gallery_id = target_gallery_id and active = true;
  update public.gallery_publications set active = true, published_at = now() where id = target_publication_id;
  update public.galleries set published = true where id = target_gallery_id;
  return target_publication_id;
end;
$$;

revoke all on function public.rollback_gallery_revision(uuid, uuid) from public, anon;
grant execute on function public.rollback_gallery_revision(uuid, uuid) to authenticated;

commit;
