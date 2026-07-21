begin;

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
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_bucket timestamptz := date_trunc('minute', now());
  accepted_count integer;
  clean_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_event_name::text not in (
    'page_view','hero_interaction','curation_viewed','style_selected','category_selected','brand_selected',
    'collection_opened','catalog_opened','catalog_view_more','catalog_filter_changed','search_performed',
    'search_zero_results','product_focused','product_opened','product_whatsapp_clicked',
    'general_whatsapp_clicked','map_clicked','instagram_clicked','bio_link_clicked','lab_cta_clicked',
    'external_link_clicked','scroll_depth','product_view','product_whatsapp_click','collection_view',
    'promotion_view','promotion_click','gallery_interaction','catalog_search','catalog_filter',
    'curation_product_opened','curation_view_more','catalog_product_opened','curation_whatsapp_clicked'
  ) then return false; end if;

  if p_route is null or p_route !~ '^/[^/].*|^/$' or char_length(p_route) > 500
    or (p_referrer_domain is not null and char_length(p_referrer_domain) > 255)
    or p_fingerprint_hash !~ '^[a-f0-9]{64}$' or jsonb_typeof(clean_metadata) <> 'object'
    or pg_column_size(clean_metadata) > 2048 then return false; end if;

  if p_event_name::text = 'scroll_depth' and (
    jsonb_typeof(clean_metadata -> 'scroll_percent') is distinct from 'number'
    or clean_metadata ->> 'scroll_percent' not in ('25','50','75','100')
  ) then return false; end if;

  if p_event_name::text in (
    'product_view','product_whatsapp_click','product_focused','product_opened',
    'product_whatsapp_clicked','curation_product_opened','catalog_product_opened',
    'curation_whatsapp_clicked'
  ) and (
    p_product_id is null or not exists(
      select 1 from public.products p
      where p.id = p_product_id and p.published = true and p.archived_at is null
    )
  ) then return false; end if;

  if p_event_name::text in ('collection_view','collection_opened') and (
    p_collection_id is null or not exists(
      select 1 from public.collections c where c.id = p_collection_id and c.published = true
    )
  ) then return false; end if;

  insert into private.public_event_rate_limits(
    fingerprint_hash,
    bucket_start,
    request_count,
    updated_at
  ) values(
    p_fingerprint_hash,
    current_bucket,
    1,
    now()
  )
  on conflict(fingerprint_hash,bucket_start) do update
    set request_count = private.public_event_rate_limits.request_count + 1,
        updated_at = now()
    where private.public_event_rate_limits.request_count < 45
  returning request_count into accepted_count;

  if accepted_count is null then return false; end if;

  if p_anonymous_session_id is not null and exists(
    select 1
    from public.analytics_events e
    where e.event_name = p_event_name
      and e.anonymous_session_id = p_anonymous_session_id
      and e.product_id is not distinct from p_product_id
      and e.collection_id is not distinct from p_collection_id
      and e.route = p_route
      and e.metadata = clean_metadata
      and e.created_at >= now() - interval '2 seconds'
  ) then return true; end if;

  insert into public.analytics_events(
    event_name,
    product_id,
    collection_id,
    promotion_id,
    route,
    referrer_domain,
    anonymous_session_id,
    metadata
  ) values(
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
exception when others then return false;
end;
$$;

revoke all on function public.record_public_analytics_event(
  public.analytics_event_name,
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb,
  text
) from public;
grant execute on function public.record_public_analytics_event(
  public.analytics_event_name,
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb,
  text
) to service_role;

create or replace function public.admin_analytics_scroll_depth_report(
  p_days integer default 30
)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
  safe_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if not private.has_any_role(array['admin']::public.admin_role[]) then
    raise exception 'Administrative analytics access required' using errcode = '42501';
  end if;

  with milestones(percent) as (
    values (25), (50), (75), (100)
  ), scoped as (
    select
      id,
      anonymous_session_id,
      case
        when metadata ->> 'scroll_percent' in ('25','50','75','100')
          then (metadata ->> 'scroll_percent')::integer
        else null
      end as percent
    from public.analytics_events
    where event_name::text = 'scroll_depth'
      and created_at >= now() - make_interval(days => safe_days)
  ), summarized as (
    select
      milestones.percent,
      count(scoped.id)::integer as events,
      count(distinct scoped.anonymous_session_id)::integer as sessions
    from milestones
    left join scoped on scoped.percent = milestones.percent
    group by milestones.percent
  )
  select jsonb_agg(
    jsonb_build_object(
      'percent', percent,
      'events', events,
      'sessions', sessions
    ) order by percent
  ) into result
  from summarized;

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.admin_analytics_scroll_depth_report(integer) from public;
grant execute on function public.admin_analytics_scroll_depth_report(integer) to authenticated;

commit;
