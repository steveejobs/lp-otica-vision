# QA da Fase 1

## Comandos obrigatórios

```bash
npm run lint
npm run typecheck
npm run build
npm run qa:supabase
```

As migrations são verificadas primeiro por transação remota com `ROLLBACK`, depois por `supabase db push --dry-run` e somente então aplicadas ao projeto vazio de desenvolvimento.

## Matriz de segurança automatizada

`scripts/qa-phase1.mjs` cobre:

1. editor gerencia marcas e categorias;
2. editor cria produtos;
3. anônimo lê somente produto publicado;
4. anônimo não insere conteúdo;
5. atendente lê conteúdo administrativo;
6. atendente altera disponibilidade;
7. atendente não altera descrição;
8. editor não altera papéis;
9. usuário inativo perde leitura administrativa;
10. editor envia imagem permitida;
11. Storage rejeita MIME proibido;
12. Storage rejeita upload do atendente;
13. bucket privado rejeita leitura anônima;
14. trigger cria auditoria;
15. editor não apaga auditoria.

Todos os usuários, produtos, marcas, categorias, objetos e logs de QA criados pelo script são removidos no bloco `finally`.

## QA HTTP e interface

- acesso anônimo direto a `/admin` deve responder com redirect para `/admin/login`;
- `/admin/login` deve responder sem erro de console e sem oferecer cadastro;
- login inválido deve retornar mensagem genérica;
- perfil inativo deve voltar ao login com estado de acesso pendente;
- logout deve limpar a sessão e impedir retorno direto ao dashboard;
- páginas administrativas devem usar `Cache-Control: private, no-store`;
- viewport mobile não pode ter overflow da página; tabelas podem rolar dentro do próprio contêiner;
- todos os alvos principais devem ter pelo menos 44 × 44 px;
- `prefers-reduced-motion` deve remover animações de entrada.

## Inspeção de segredo

- procurar `SUPABASE_SECRET_KEY`, prefixos de chave secreta e valores locais no bundle cliente;
- confirmar que `.env.local` está ignorado e não rastreado;
- confirmar ausência de `.map` público contendo source ou variáveis;
- confirmar que apenas módulos `server-only` importam o cliente administrativo.

## Evidências

Salvar em `.tmp/admin-qa/`:

- screenshot desktop e mobile do login;
- screenshot do redirect anônimo ou log HTTP;
- screenshot do dashboard somente após bootstrap humano autorizado;
- logs de lint, typecheck, build e testes;
- relatório de busca por segredos no bundle, sem exibir valores.

O diretório `.tmp` é ignorado pelo Git e não deve ser enviado à Vercel.

## Limitações conhecidas

- sem Docker, o stack local completo não roda nesta estação; migrations e políticas são validadas no projeto remoto de desenvolvimento;
- sem usuário convidado, não é possível testar visualmente o dashboard autenticado ou expiração real de sessão;
- rate limit de analytics é por instância e serve como proteção básica da Fase 1;
- CRUD avançado e catálogo público pertencem à Fase 2.
