begin;

alter table public.products
  add constraint products_visible_price_requires_value check (
    price_visibility <> 'visible' or price is not null
  );

commit;
