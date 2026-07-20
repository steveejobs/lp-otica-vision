begin;

create index if not exists analytics_events_route_created_idx
  on public.analytics_events(route, created_at desc);
create index if not exists analytics_events_session_created_idx
  on public.analytics_events(anonymous_session_id, created_at desc)
  where anonymous_session_id is not null;

create table if not exists public.analytics_daily_summary (
  day date not null,
  event_name public.analytics_event_name not null,
  route text not null,
  event_count bigint not null default 0 check (event_count >= 0),
  primary key(day, event_name, route)
);
create table if not exists public.analytics_product_daily (
  day date not null,
  product_id uuid not null references public.products(id) on delete cascade,
  event_name public.analytics_event_name not null,
  event_count bigint not null default 0 check (event_count >= 0),
  primary key(day, product_id, event_name)
);
create table if not exists public.analytics_style_daily (
  day date not null,
  style_slug text not null check (style_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  event_name public.analytics_event_name not null,
  event_count bigint not null default 0 check (event_count >= 0),
  primary key(day, style_slug, event_name)
);
create table if not exists public.analytics_conversion_daily (
  day date not null,
  event_name public.analytics_event_name not null,
  source_route text not null,
  event_count bigint not null default 0 check (event_count >= 0),
  primary key(day, event_name, source_route)
);

alter table public.analytics_daily_summary enable row level security;
alter table public.analytics_product_daily enable row level security;
alter table public.analytics_style_daily enable row level security;
alter table public.analytics_conversion_daily enable row level security;
revoke all on public.analytics_daily_summary, public.analytics_product_daily, public.analytics_style_daily, public.analytics_conversion_daily from anon, authenticated;
grant select on public.analytics_daily_summary, public.analytics_product_daily, public.analytics_style_daily, public.analytics_conversion_daily to authenticated;

create policy "admins read analytics daily summary" on public.analytics_daily_summary for select to authenticated using (private.has_any_role(array['admin']::public.admin_role[]));
create policy "admins read analytics product daily" on public.analytics_product_daily for select to authenticated using (private.has_any_role(array['admin']::public.admin_role[]));
create policy "admins read analytics style daily" on public.analytics_style_daily for select to authenticated using (private.has_any_role(array['admin']::public.admin_role[]));
create policy "admins read analytics conversion daily" on public.analytics_conversion_daily for select to authenticated using (private.has_any_role(array['admin']::public.admin_role[]));

insert into public.analytics_daily_summary(day, event_name, route, event_count)
select created_at::date, event_name, route, count(*) from public.analytics_events group by 1, 2, 3
on conflict(day, event_name, route) do update set event_count = excluded.event_count;
insert into public.analytics_product_daily(day, product_id, event_name, event_count)
select created_at::date, product_id, event_name, count(*) from public.analytics_events where product_id is not null group by 1, 2, 3
on conflict(day, product_id, event_name) do update set event_count = excluded.event_count;
insert into public.analytics_style_daily(day, style_slug, event_name, event_count)
select created_at::date, metadata ->> 'style_slug', event_name, count(*) from public.analytics_events
where metadata ->> 'style_slug' ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' group by 1, 2, 3
on conflict(day, style_slug, event_name) do update set event_count = excluded.event_count;
insert into public.analytics_conversion_daily(day, event_name, source_route, event_count)
select created_at::date, event_name, coalesce(nullif(metadata ->> 'source_route', ''), route), count(*) from public.analytics_events
where event_name in ('page_view','curation_viewed','style_selected','catalog_opened','product_opened','product_whatsapp_clicked','general_whatsapp_clicked','product_view','product_whatsapp_click') group by 1, 2, 3
on conflict(day, event_name, source_route) do update set event_count = excluded.event_count;

create or replace function private.sync_analytics_daily_summaries()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target public.analytics_events%rowtype;
  delta integer;
  style_value text;
  source_value text;
begin
  target := case when tg_op = 'DELETE' then old else new end;
  delta := case when tg_op = 'DELETE' then -1 else 1 end;
  style_value := target.metadata ->> 'style_slug';
  source_value := coalesce(nullif(target.metadata ->> 'source_route', ''), target.route);

  insert into public.analytics_daily_summary(day,event_name,route,event_count)
  values(target.created_at::date,target.event_name,target.route,greatest(delta,0))
  on conflict(day,event_name,route) do update set event_count = greatest(0,public.analytics_daily_summary.event_count + delta);
  if target.product_id is not null then
    insert into public.analytics_product_daily(day,product_id,event_name,event_count)
    values(target.created_at::date,target.product_id,target.event_name,greatest(delta,0))
    on conflict(day,product_id,event_name) do update set event_count = greatest(0,public.analytics_product_daily.event_count + delta);
  end if;
  if style_value ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    insert into public.analytics_style_daily(day,style_slug,event_name,event_count)
    values(target.created_at::date,style_value,target.event_name,greatest(delta,0))
    on conflict(day,style_slug,event_name) do update set event_count = greatest(0,public.analytics_style_daily.event_count + delta);
  end if;
  if target.event_name in ('page_view','curation_viewed','style_selected','catalog_opened','product_opened','product_whatsapp_clicked','general_whatsapp_clicked','product_view','product_whatsapp_click') then
    insert into public.analytics_conversion_daily(day,event_name,source_route,event_count)
    values(target.created_at::date,target.event_name,source_value,greatest(delta,0))
    on conflict(day,event_name,source_route) do update set event_count = greatest(0,public.analytics_conversion_daily.event_count + delta);
  end if;
  delete from public.analytics_daily_summary where event_count = 0;
  delete from public.analytics_product_daily where event_count = 0;
  delete from public.analytics_style_daily where event_count = 0;
  delete from public.analytics_conversion_daily where event_count = 0;
  return target;
end;
$$;

drop trigger if exists analytics_events_sync_daily on public.analytics_events;
create trigger analytics_events_sync_daily after insert or delete on public.analytics_events
for each row execute function private.sync_analytics_daily_summaries();

insert into public.site_settings(key,value)
values('analytics.retention','{"version":1,"rawDays":90,"aggregateDays":730,"enforcement":"manual_review_required"}'::jsonb)
on conflict(key) do nothing;

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
  if p_event_name not in (
    'page_view','hero_interaction','curation_viewed','style_selected','category_selected','brand_selected',
    'collection_opened','catalog_opened','catalog_view_more','catalog_filter_changed','search_performed',
    'search_zero_results','product_focused','product_opened','product_whatsapp_clicked',
    'general_whatsapp_clicked','map_clicked','instagram_clicked','bio_link_clicked','lab_cta_clicked','external_link_clicked',
    'product_view','product_whatsapp_click','collection_view','promotion_view','promotion_click','gallery_interaction',
    'catalog_search','catalog_filter','curation_product_opened','curation_view_more','catalog_product_opened','curation_whatsapp_clicked'
  ) then return false; end if;
  if p_route is null or p_route !~ '^/[^/].*|^/$' or char_length(p_route) > 500
    or (p_referrer_domain is not null and char_length(p_referrer_domain) > 255)
    or p_fingerprint_hash !~ '^[a-f0-9]{64}$' or jsonb_typeof(clean_metadata) <> 'object'
    or pg_column_size(clean_metadata) > 2048 then return false; end if;
  if p_event_name in ('product_view','product_whatsapp_click','product_focused','product_opened','product_whatsapp_clicked','curation_product_opened','catalog_product_opened','curation_whatsapp_clicked')
    and (p_product_id is null or not exists(select 1 from public.products p where p.id=p_product_id and p.published=true and p.archived_at is null)) then return false; end if;
  if p_event_name in ('collection_view','collection_opened') and (p_collection_id is null or not exists(select 1 from public.collections c where c.id=p_collection_id and c.published=true)) then return false; end if;

  insert into private.public_event_rate_limits(fingerprint_hash,bucket_start,request_count,updated_at)
  values(p_fingerprint_hash,current_bucket,1,now())
  on conflict(fingerprint_hash,bucket_start) do update set request_count=private.public_event_rate_limits.request_count+1,updated_at=now()
  where private.public_event_rate_limits.request_count < 45 returning request_count into accepted_count;
  if accepted_count is null then return false; end if;

  if p_anonymous_session_id is not null and exists(
    select 1 from public.analytics_events e where e.event_name=p_event_name and e.anonymous_session_id=p_anonymous_session_id
      and e.product_id is not distinct from p_product_id and e.collection_id is not distinct from p_collection_id
      and e.route=p_route and e.metadata=clean_metadata and e.created_at >= now()-interval '2 seconds'
  ) then return true; end if;

  insert into public.analytics_events(event_name,product_id,collection_id,promotion_id,route,referrer_domain,anonymous_session_id,metadata)
  values(p_event_name,p_product_id,p_collection_id,p_promotion_id,p_route,p_referrer_domain,p_anonymous_session_id,clean_metadata);
  if random() < 0.01 then delete from private.public_event_rate_limits where bucket_start < now()-interval '2 hours'; end if;
  return true;
exception when others then return false;
end;
$$;

create or replace function public.admin_analytics_report(p_days integer default 30)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; safe_days integer := least(greatest(coalesce(p_days,30),1),365);
begin
  if not private.has_any_role(array['admin']::public.admin_role[]) then raise exception 'Administrative analytics access required' using errcode='42501'; end if;
  with scoped as (select * from public.analytics_events where created_at >= now()-make_interval(days=>safe_days)),
  normalized as (
    select *, case
      when event_name in ('product_view','curation_product_opened','catalog_product_opened') then 'product_opened'
      when event_name in ('product_whatsapp_click','curation_whatsapp_clicked') then 'product_whatsapp_clicked'
      when event_name='collection_view' then 'collection_opened'
      when event_name='catalog_search' then 'search_performed'
      when event_name='catalog_filter' then 'catalog_filter_changed'
      when event_name='curation_view_more' then 'catalog_opened'
      else event_name::text end as normalized_name from scoped
  ), counts as (select normalized_name,count(*)::bigint total,count(distinct anonymous_session_id)::bigint sessions from normalized group by normalized_name)
  select jsonb_build_object(
    'days',safe_days,
    'counts',coalesce((select jsonb_object_agg(normalized_name,jsonb_build_object('events',total,'sessions',sessions)) from counts),'{}'::jsonb),
    'timeline',coalesce((select jsonb_agg(x order by x."day") from (select created_at::date as "day",count(*) filter(where normalized_name='page_view')::int page_views,count(*) filter(where normalized_name in ('product_whatsapp_clicked','general_whatsapp_clicked'))::int whatsapp from normalized group by 1) x),'[]'::jsonb),
    'funnel',coalesce((select jsonb_agg(x order by x.step) from (select step,label,count(distinct n.anonymous_session_id)::int sessions from (values (1,'Home','page_view'),(2,'Curadoria visualizada','curation_viewed'),(3,'Estilo selecionado','style_selected'),(4,'Catálogo aberto','catalog_opened'),(5,'Produto aberto','product_opened'),(6,'WhatsApp clicado','product_whatsapp_clicked')) s(step,label,event) left join normalized n on n.normalized_name=s.event and (s.step<>1 or n.route='/') group by step,label) x),'[]'::jsonb),
    'topProducts',coalesce((select jsonb_agg(x order by x.views desc,x.whatsapp desc,x.name) from (select p.id,p.name,p.slug,count(*) filter(where n.normalized_name='product_opened')::int views,count(*) filter(where n.normalized_name='product_whatsapp_clicked')::int whatsapp from normalized n join public.products p on p.id=n.product_id where n.normalized_name in ('product_opened','product_whatsapp_clicked') group by p.id,p.name,p.slug limit 20) x),'[]'::jsonb),
    'topStyles',coalesce((select jsonb_agg(x order by x.uses desc,x.slug) from (select metadata->>'style_slug' slug,count(*)::int uses from normalized where normalized_name='style_selected' and metadata->>'style_slug' is not null group by 1 limit 15) x),'[]'::jsonb),
    'topCategories',coalesce((select jsonb_agg(x order by x.uses desc,x.slug) from (select metadata->>'category_slug' slug,count(*)::int uses from normalized where normalized_name='category_selected' and metadata->>'category_slug' is not null group by 1 limit 15) x),'[]'::jsonb),
    'topBrands',coalesce((select jsonb_agg(x order by x.uses desc,x.slug) from (select metadata->>'brand_slug' slug,count(*)::int uses from normalized where normalized_name='brand_selected' and metadata->>'brand_slug' is not null group by 1 limit 15) x),'[]'::jsonb),
    'topCollections',coalesce((select jsonb_agg(x order by x.opens desc,x.slug) from (select coalesce(c.slug,n.metadata->>'collection_slug') slug,count(*)::int opens from normalized n left join public.collections c on c.id=n.collection_id where n.normalized_name='collection_opened' group by 1 limit 15) x where x.slug is not null),'[]'::jsonb),
    'filters',coalesce((select jsonb_agg(x order by x.uses desc,x.filter_name,x.filter_value) from (select metadata->>'filter_name' filter_name,metadata->>'filter_value' filter_value,count(*)::int uses from normalized where normalized_name='catalog_filter_changed' group by 1,2 limit 20) x),'[]'::jsonb),
    'routes',coalesce((select jsonb_agg(x order by x.views desc,x.route) from (select route,count(*)::int views from normalized where normalized_name='page_view' group by route limit 20) x),'[]'::jsonb),
    'external',coalesce((select jsonb_agg(x order by x.clicks desc,x.event_name) from (select normalized_name event_name,count(*)::int clicks from normalized where normalized_name in ('general_whatsapp_clicked','map_clicked','instagram_clicked','bio_link_clicked','lab_cta_clicked','external_link_clicked') group by 1) x),'[]'::jsonb),
    'recent',coalesce((select jsonb_agg(x order by x.created_at desc) from (select created_at,normalized_name event_name,route,product_id from normalized order by created_at desc limit 30) x),'[]'::jsonb),
    'retention',(select value from public.site_settings where key='analytics.retention')
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_analytics_report(integer) from public;
grant execute on function public.admin_analytics_report(integer) to authenticated;

commit;
