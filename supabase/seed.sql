-- Dados reais e estritamente necessarios para o ambiente de desenvolvimento.
-- Nao inclui produtos, marcas, promocoes, avaliacoes ou informacoes comerciais ficticias.

insert into public.site_settings (key, value)
values (
  'whatsapp',
  jsonb_build_object('phone', '5563992231522')
)
on conflict (key) do update
set value = excluded.value;
