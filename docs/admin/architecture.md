# Arquitetura da plataforma — Fases 1 a 3

## Escopo

As Fases 1 e 2 entregam a fundação e o painel administrativo. A Fase 3 acrescenta o catálogo público administrável, sem estoque quantitativo, PDV, fiscal, carrinho, checkout ou cadastro público de clientes.

## Camadas

```text
Browser
  └─ chave publicável + cookies SSR
       ├─ /admin/login
       ├─ /admin/* protegido pelo proxy e pelo layout server-side
       ├─ /catalogo e /catalogo/[slug] com dados públicos via Server Components
       ├─ /api/catalogo/imagem/[id] como proxy de mídia publicada
       └─ /api/analytics com payload validado

Next.js server-only
  ├─ cliente SSR por requisição (RLS + identidade do usuário)
  ├─ cliente público anônimo sem cookies administrativos
  ├─ cliente administrativo sem sessão para operações privilegiadas restritas
  ├─ validação de upload, MIME, tamanho e caminho
  └─ cache com tag e revalidação disparada por Server Actions autorizadas

Supabase
  ├─ Auth: convite explícito, sem cadastro público
  ├─ PostgreSQL: schema versionado e RLS
  ├─ Storage: buckets privados e políticas por papel
  └─ Audit logs: triggers centrais e registros imutáveis para editor
```

## Clientes Supabase

- `lib/supabase/client.ts`: Client Components, somente URL e chave publicável.
- `lib/supabase/server.ts`: Server Components e Server Actions, sessão SSR em cookies.
- `lib/supabase/admin.ts`: importa `server-only`, usa `SUPABASE_SECRET_KEY` e não persiste sessão.
- `lib/supabase/proxy.ts`: atualiza cookies, valida claims e nega `/admin` a perfil ausente ou inativo.
- `lib/supabase/public.ts`: consultas públicas anônimas sem cookies, impedindo que uma sessão administrativa faça o catálogo enxergar rascunhos.

Todos os clientes são criados por chamada. Não existe cliente autenticado compartilhado em escopo de módulo no servidor.

## Autorização

O navegador não é a fonte de autorização. A defesa ocorre em três níveis:

1. o proxy exige uma sessão válida para a rota administrativa;
2. o layout server-side confirma um perfil ativo;
3. PostgreSQL e Storage aplicam RLS com o papel real salvo em `profiles`.

Ocultar links no menu é apenas ergonomia. As permissões continuam válidas mesmo em acesso direto por URL ou API.

## Estado do ADM

O painel possui CRUDs funcionais de marcas, categorias, produtos/imagens, coleções, galerias e destaques, além de disponibilidade rápida, usuários, auditoria e analytics agregado do catálogo. A relação completa de rotas e decisões operacionais está em `docs/admin/phase-2.md`; a integração pública está em `docs/catalog-phase-3.md`.

Admin e editor acessam conteúdo editorial. Atendente acessa somente visão geral e disponibilidade rápida. Usuários, auditoria e configurações exigem admin. Cada página e cada Server Action repete a checagem de papel; RLS e triggers permanecem como última camada.

## Decisões de segurança

- cadastro público desativado no projeto remoto e no `supabase/config.toml`;
- chave secreta restrita a módulos `server-only`;
- páginas administrativas dinâmicas e respostas com `Cache-Control: private, no-store`;
- buckets privados; imagens públicas servidas somente pelo proxy server-side a partir do UUID do registro validado;
- auditoria central por trigger, com remoção recursiva de campos que pareçam senha, segredo, token, chave, autorização ou cookie;
- analytics anônimo somente por endpoint server-side e sem telefone, nome, e-mail, mensagem ou IP em texto;
- rate limit distribuído no PostgreSQL por impressão HMAC efêmera e janela de tempo, sem persistir IP em claro;
- cache público invalidado no servidor após alterações autorizadas de produto, imagem, marca, categoria, coleção ou disponibilidade.

## Limites atuais

- existe um administrador real autorizado e validado; nenhum dado de identidade é versionado;
- o analytics é uma visão operacional agregada, não uma plataforma de atribuição ou BI;
- o proxy atual preserva o arquivo original; transformações derivadas podem ser acrescentadas no servidor em uma fase futura;
- não há estoque quantitativo, PDV, carrinho, pagamento ou fiscal.
