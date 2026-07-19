begin;

alter table public.collections
  drop constraint collections_home_cta_target_allowed,
  add constraint collections_home_cta_target_allowed check (
    home_cta_target is null or home_cta_target in ('collection', 'catalog', 'instagram', 'whatsapp')
  );

alter table public.collection_publications
  drop constraint collection_publications_cta_target_allowed,
  add constraint collection_publications_cta_target_allowed check (
    home_cta_target is null or home_cta_target in ('collection', 'catalog', 'instagram', 'whatsapp')
  );

commit;
