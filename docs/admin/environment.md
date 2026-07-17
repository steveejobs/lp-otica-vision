# Ambiente e credenciais — Fase 1

## Variáveis da aplicação

| Nome | Browser | Servidor | Uso |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim | sim | cliente público e SSR; aceita chave `sb_publishable_` ou anon pública legada |
| `SUPABASE_SECRET_KEY` | nunca | sim | tarefas server-only controladas |
| `SUPABASE_PROJECT_REF` | não é necessário no bundle | CLI/automação | vínculo do projeto |
| `BOOTSTRAP_ADMIN_EMAIL` | nunca | script local | escolha explícita do primeiro admin |

`.env.example` contém apenas os nomes e nunca valores reais.

## Variáveis exclusivas da CLI local

`SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` podem ser usados para link, migrations e geração de tipos. Elas não pertencem ao bundle, ao `.env.example` da aplicação nem à Vercel.

## Regras

- `.env.local` permanece ignorado pelo Git;
- não usar fallback com valor real;
- não imprimir, registrar ou capturar credenciais em screenshots;
- somente a chave pública do Supabase recebe prefixo `NEXT_PUBLIC_`; ela pode ser `sb_publishable_` ou anon pública legada;
- `SUPABASE_SECRET_KEY` é validada e importada somente por `server-only`;
- tokens da CLI devem ser rotacionados se aparecerem em Git, log ou screenshot.

## Vercel

Nesta fase, configure apenas o ambiente `Preview` com as variáveis da aplicação. Não envie `SUPABASE_ACCESS_TOKEN` ou `SUPABASE_DB_PASSWORD`.

Production deve usar uma configuração separada e só será criada quando houver autorização de promoção. Não executar `vercel --prod`, `vercel promote`, alias para domínio principal ou reutilização automática de credenciais sem revisão.

Depois de gerar o preview, inclua a URL autorizada nas configurações de redirect do Supabase somente se o fluxo de convite ou callback precisar dela.

## Validação sem revelar valores

Verificar somente presença, prefixo esperado e escopo. Relatórios devem mostrar nomes e resultado booleano, nunca o conteúdo da variável.
