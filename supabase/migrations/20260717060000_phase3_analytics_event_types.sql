begin;

alter type public.analytics_event_name add value if not exists 'catalog_search';
alter type public.analytics_event_name add value if not exists 'catalog_filter';

commit;
