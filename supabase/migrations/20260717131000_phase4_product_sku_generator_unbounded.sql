begin;

create or replace function public.allocate_product_sku()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  sequence_text text;
begin
  loop
    sequence_text := nextval('public.product_sku_number_seq'::regclass)::text;
    candidate := 'OV-' || case
      when char_length(sequence_text) < 8 then lpad(sequence_text, 8, '0')
      else sequence_text
    end;

    exit when not exists (
      select 1
      from public.products as product
      where lower(btrim(product.sku)) = lower(candidate)
    );
  end loop;

  return candidate;
end;
$$;

revoke all on function public.allocate_product_sku() from public, anon, authenticated;
grant execute on function public.allocate_product_sku() to service_role;

comment on function public.allocate_product_sku() is
  'Aloca um SKU OV unico sem truncar contadores acima de oito digitos. A sequence e NO CYCLE e o indice de products protege a persistencia.';

commit;
