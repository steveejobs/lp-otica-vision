# Arquitetura do ADM — Fases 1 e 2

## Escopo

As duas fases entregam a fundação e o painel administrativo da Ótica Vision. Elas não publicam o catálogo público, não alteram a landing page atual e não implementam estoque, PDV, fiscal, carrinho ou checkout.

## Camadas

```text
Browser
  └─ chave publicável + cookies SSR
       ├─ /admin/login
       ├─ /admin/* protegido pelo proxy e pelo layout server-side
       └─ /api/analytics com payload validado

Next.js server-only
  ├─ cliente SSR por requisição (RLS + identidade do usuário)
  ├─ cliente administrativo sem sessão (bootstrap, analytics e URL assinada)
  └─ validação de upload, MIME, tamanho e caminho

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

Todos os clientes são criados por chamada. Não existe cliente autenticado compartilhado em escopo de módulo no servidor.

## Autorização

O navegador não é a fonte de autorização. A defesa ocorre em três níveis:

1. o proxy exige uma sessão válida para a rota administrativa;
2. o layout server-side confirma um perfil ativo;
3. PostgreSQL e Storage aplicam RLS com o papel real salvo em `profiles`.

Ocultar links no menu é apenas ergonomia. As permissões continuam válidas mesmo em acesso direto por URL ou API.

## Estado do ADM

O painel possui CRUDs funcionais de marcas, categorias, produtos/imagens, coleções, galerias e destaques, além de disponibilidade rápida, usuários e auditoria. A relação completa de rotas e decisões operacionais está em `docs/admin/phase-2.md`.

Admin e editor acessam conteúdo editorial. Atendente acessa somente visão geral e disponibilidade rápida. Usuários, auditoria e configurações exigem admin. Cada página e cada Server Action repete a checagem de papel; RLS e triggers permanecem como última camada.

## Decisões de segurança

- cadastro público desativado no projeto remoto e no `supabase/config.toml`;
- chave secreta restrita a módulos `server-only`;
- páginas administrativas dinâmicas e respostas com `Cache-Control: private, no-store`;
- buckets privados; publicação futura por URL assinada após consulta ao estado publicado no banco;
- auditoria central por trigger, com remoção recursiva de campos que pareçam senha, segredo, token, chave, autorização ou cookie;
- analytics anônimo somente por endpoint server-side e sem telefone, nome, e-mail, mensagem ou IP em texto.

## Limites atuais

- existe um administrador real autorizado e validado; nenhum dado de identidade é versionado;
- o rate limit de analytics é básico e por instância; uma solução distribuída deve ser adotada antes de tráfego elevado;
- as imagens privadas usam URLs assinadas curtas; a integração com o catálogo público será feita somente na Fase 3;
- não há estoque quantitativo, PDV, carrinho, pagamento ou fiscal.
