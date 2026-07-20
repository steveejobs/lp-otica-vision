begin;

update public.products
set price = null,
    price_visibility = 'consult'
where price_visibility <> 'visible'
   or price is null
   or price <= 0;

update public.products
set availability_status = 'available'
where availability_status = 'consultation';

alter table public.products
  alter column availability_status set default 'available',
  drop constraint products_price_nonnegative,
  drop constraint products_visible_price_requires_value,
  add constraint products_showcase_price_consistency check (
    (price_visibility = 'visible' and price is not null and price > 0)
    or (price_visibility = 'consult' and price is null)
  ),
  add constraint products_showcase_availability_only check (
    availability_status in ('available', 'last_unit', 'unavailable')
  );

comment on column public.products.price is
  'Valor monetario exato com duas casas decimais. A interface converte a mascara BRL para centavos antes de persistir.';

comment on column public.products.display_order is
  'Ordem interna automatica. Nao deve ser solicitada no formulario comum de produto.';

comment on column public.products.whatsapp_message_override is
  'Coluna legada preservada. A vitrine gera a mensagem oficial automaticamente e ignora este valor.';

commit;
