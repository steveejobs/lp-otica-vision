# QA da Fase 2

## Suítes reproduzíveis

Os scripts são executados diretamente para não alterar o `package.json` da landing:

```bash
node --env-file=.env.local scripts/fixtures-phase2.mjs seed
node --env-file=.env.local scripts/qa-phase2.mjs
node --env-file=.env.local scripts/qa-phase2-ui.mjs
node --env-file=.env.local scripts/fixtures-phase2.mjs cleanup
node --env-file=.env.local scripts/fixtures-phase2.mjs status
```

`QA_ADMIN_EMAIL` e `QA_ADMIN_PASSWORD` são variáveis efêmeras de processo, nunca arquivos ou saída de log. A suíte não altera senha, não cria usuário duplicado e remove identidades aleatórias de QA no `finally`.

## Banco, RLS e Storage

`qa-phase2.mjs` executa 35 verificações reais no projeto remoto de desenvolvimento:

- formato e quantidade das fixtures;
- quatro buckets privados;
- CRUD e ordenação de marcas/categorias;
- slug duplicado e SKU duplicado sem diferenciar caixa;
- exclusão de categoria vinculada;
- criação, publicação, duplicação, arquivamento e restauração de produto;
- upload múltiplo, ordem e capa única;
- MIME proibido, arquivo acima de 8 MiB, falha de Storage e falha de banco com compensação;
- URL assinada curta para leitor autorizado e bloqueio anônimo;
- coleção, capa, relações, ordem e janela de datas;
- galeria, séries contíguas, ordem e integridade de publicação;
- promoção, imagem, tipo, prioridade, relações e janela de datas;
- disponibilidade limitada ao atendente;
- admin, editor, atendente, inativo e anônimo;
- usuários/papéis apenas para admin;
- auditoria do ator e mascaramento sensível;
- sessão expirada e preservação do admin real.

`npm run qa:supabase` mantém os 15 testes da fundação e foi adaptado à regra de capa obrigatória antes de publicar.

## Interface

`qa-phase2-ui.mjs` roda sobre o build otimizado local e valida:

| Viewport | Rotas representativas |
| --- | --- |
| 360 × 800 | dashboard, marcas, usuários e auditoria |
| 390 × 844 | produtos, edição de produto, disponibilidade e categorias |
| 430 × 932 | coleções e galerias, incluindo seus editores |
| 1366 × 768 | destaques, edição de destaque e novo produto |
| 1440 × 900 | dashboard, auditoria e autoedição de usuário |

Em todas as rotas: status 200, nenhum overflow da página, nenhum alvo interativo abaixo de 44 px, foco visível, zero 404, zero erro de console e zero `pageerror`. Tabelas mantêm rolagem dentro do próprio contêiner.

A suíte também confirma:

- navegação e acesso direto de editor e atendente;
- bloqueio de inativo e anônimo;
- papel próprio sem seletor editável;
- sessão expirada;
- logout;
- recuperação sob atraso artificial de rede.

## Evidências locais

`.tmp/admin-qa/phase2-ui-results.json` contém o relatório. As capturas representativas usam nomes `phase2-<tela>-<viewport>.png`, incluindo dashboard mobile, produto mobile, disponibilidade, coleção, galeria, destaque desktop e auditoria desktop.

O diretório `.tmp` é ignorado e não vai para o preview.

## Critério antes do preview

1. fixtures com contagem zero;
2. nenhum usuário temporário restante;
3. migrations local/remoto sincronizadas;
4. buckets privados;
5. `npm run lint`, `npm run typecheck` e `npm run build` aprovados;
6. RLS/Storage aprovados;
7. bundle cliente sem `SUPABASE_SECRET_KEY` nem valores secretos locais;
8. preview sem `--prod`, promoção ou alias de produção.
