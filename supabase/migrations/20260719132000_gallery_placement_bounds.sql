begin;

/* Mirrors the limits declared in lib/content-placements.ts. This trigger also
 * protects publications created outside the current ADM UI. */
create or replace function private.enforce_gallery_publication_bounds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_route text;
  target_placement text;
  active_count integer;
begin
  select route_key, placement_key into target_route, target_placement
  from public.galleries where id = new.gallery_id;
  if target_route is null then
    raise exception 'Gallery not found' using errcode = '23514';
  end if;

  select count(*) into active_count
  from public.gallery_items
  where gallery_id = new.gallery_id and published = true;

  if target_route = 'home' and target_placement = 'hero' and active_count not between 1 and 3 then
    raise exception 'Home hero requires between one and three active images' using errcode = '23514';
  elsif target_route = 'home' and target_placement = 'featured_collection' and active_count not between 1 and 8 then
    raise exception 'Featured collection requires between one and eight active images' using errcode = '23514';
  elsif target_route = 'home' and target_placement = 'lab_digital' and active_count <> 2 then
    raise exception 'LAB. DIGITAL requires exactly two active images' using errcode = '23514';
  elsif target_route = 'instagram' and target_placement = 'editorial_selection' and active_count not between 1 and 6 then
    raise exception 'Instagram editorial selection requires between one and six active images' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists gallery_publication_validate_bounds on public.gallery_publications;
create trigger gallery_publication_validate_bounds
before insert on public.gallery_publications
for each row execute function private.enforce_gallery_publication_bounds();

revoke all on function private.enforce_gallery_publication_bounds() from public, anon, authenticated;

commit;
