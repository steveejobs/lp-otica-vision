begin;

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
    -- Stored generated columns are recomputed by PostgreSQL after BEFORE triggers.
    -- Ignore the derived search document while comparing user-controlled fields.
    if (to_jsonb(new) - array['availability_status', 'updated_by', 'updated_at', 'search_document'])
      is distinct from
      (to_jsonb(old) - array['availability_status', 'updated_by', 'updated_at', 'search_document']) then
      raise exception 'Attendants may only change product availability' using errcode = '42501';
    end if;
    new.updated_by := actor;
    return new;
  end if;

  raise exception 'Inactive or unauthorized user' using errcode = '42501';
end;
$$;

revoke all on function private.authorize_and_stamp_product() from public, anon, authenticated;

commit;
