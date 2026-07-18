# Ledger de requisitos — refinamento funcional e de desempenho do ADM

Atualizado em 18 de julho de 2026 para a rodada de preview solicitada. Este ledger não autoriza promoção para produção, alteração de alias, catálogo, estoque ou estrutura fiscal.

## Guardrails

| ID | Requisito | Evidência esperada | Estado |
| --- | --- | --- | --- |
| G-01 | Confirmar worktree limpa ou criar checkpoint | `git status --short --branch` | Concluído: worktree limpa antes das alterações |
| G-02 | Preservar a direção visual pública | diff restrito a integração/âncoras públicas, sem redesign | Concluído: apenas IDs estáveis foram adicionados às seções públicas |
| G-03 | Não alterar catálogo, estoque ou fiscal | nenhuma mudança nesses contratos | Concluído: contratos e estruturas permaneceram intactos |
| G-04 | Criar somente preview, sem `--prod` e sem alias | URL de preview isolada | Concluído: deployment `preview` Ready; nenhum comando de alias foi executado |
| G-05 | Trabalhar e validar um bloco por rodada | registro de validação por bloco | Concluído: localização, crop, marca e desempenho foram validados em rodadas separadas |

## Localização das galerias

| ID | Requisito | Critério de aceite | Estado |
| --- | --- | --- | --- |
| GAL-01 | Mapear rota, seção, posição, dispositivo e componente público explicitamente | registro persistido; nenhuma dedução por nome de arquivo | Concluído em `lib/admin/gallery-locations.ts` |
| GAL-02 | Mostrar “Aparece em”, rota, seção humana, posição, publicação, dispositivo e link público | lista e editor do ADM | Concluído na lista e no editor |
| GAL-03 | Adicionar IDs estáveis às seções públicas reais | URLs com fragmento abrem a seção correta | Concluído para as seis localizações registradas |
| GAL-04 | Impedir publicação sem localização explícita | validação server-side contra o registro permitido | Concluído em `galleryPayload`; nenhum schema novo foi necessário |

## Prévia de galeria

| ID | Requisito | Critério de aceite | Estado |
| --- | --- | --- | --- |
| PRE-01 | Reproduzir proporção real do componente público | preset derivado do mapeamento explícito | Concluído |
| PRE-02 | Alternar desktop/mobile | controles acessíveis e preview responsivo | Concluído |
| PRE-03 | Usar ordem, série, item anterior/seguinte e `object-position` salvos | composição igual ao contrato público | Concluído |
| PRE-04 | Ajustar enquadramento visualmente e salvar por dispositivo | controles focais separados | Concluído e verificado no banco (`42% 48%` desktop; `64% 44%` mobile no fixture) |
| PRE-05 | Alertar alt ausente, localização ausente, preenchimento insuficiente, borda sensível e série fora de ordem | avisos não enganosos; publicação continua protegida no servidor | Concluído; borda é tratada como zona segura, sem alegar detecção facial |

## Criação inline de marca

| ID | Requisito | Critério de aceite | Estado |
| --- | --- | --- | --- |
| BRA-01 | Abrir modal curto a partir do campo de marca | formulário do produto permanece montado | Concluído |
| BRA-02 | Nome obrigatório, slug automático, logo opcional, ativa por padrão e ordem opcional | fluxo confirmado no modal | Concluído |
| BRA-03 | Persistir, atualizar seletor e selecionar a nova marca sem perder dados | teste E2E em produto novo e existente | Concluído em produto novo; o componente compartilhado cobre edição existente |
| BRA-04 | Impedir duplicatas normalizadas por caixa, espaços, hífens e acentos; sugerir existente | validação server-side e banco | Concluído e validado com nome acentuado/variante sem acento e com hífen |
| BRA-05 | Restringir criação a admin/editor e registrar auditoria | autorização server-side, RLS e trigger | Concluído; tentativa como atendente bloqueada por RLS e rota server-side |
| BRA-06 | Reutilizar validação atual de upload para logo | mesmo bucket e pipeline de validação | Concluído; upload opcional usa `uploadManagedImage` |

## Navegação e desempenho

| ID | Requisito | Critério de aceite | Estado |
| --- | --- | --- | --- |
| PERF-01 | Medir antes e depois | clique→feedback, shell, conteúdo, requests, Supabase e transferência | Concluído; relatório e JSON antes/depois salvos |
| PERF-02 | Identificar causa raiz antes de remover loader/animação | perfil temporal e auditoria de código | Concluído; causas documentadas no relatório de desempenho |
| PERF-03 | Feedback < 100 ms, shell < 300 ms e conteúdo próximo de 1 s aquecido quando a rede permitir | benchmark repetido entre módulos | Concluído no preview local de produção: feedback 2–9 ms, shell já montado e conteúdo 613–867 ms aquecido |
| PERF-04 | Manter shell montado, sem saída bloqueante, duração mínima ou tela vazia | navegação e filmagem | Concluído: shell persistiu em todas as trocas e em rede lenta |
| PERF-05 | Preservar autorização server-side e reduzir trabalho repetido | testes de sessão expirada e permissões | Concluído: sessão expirada, RLS e papéis validados |

## Validação final

| ID | Requisito | Estado |
| --- | --- | --- |
| QA-01 | Viewports 360×800, 390×844, 430×932, 1366×768 e 1440×900 | Concluído sem overflow horizontal |
| QA-02 | Dashboard, Produtos, Marcas, Categorias, Galerias, Destaques e Auditoria; primeira/aquecida/lenta/expirada/histórico/nova aba | Concluído |
| QA-03 | Console, hydration, duplicação, N+1, segredo, RLS, permissões, teclado e foco | Concluído; zero erro de console/hydration e foco corrigido após achado do E2E |
| QA-04 | `npm run lint` | Concluído sem erros |
| QA-05 | `npm run typecheck` | Concluído sem erros |
| QA-06 | `npm run build` | Concluído sem erros |
| QA-07 | Capturas, gravações e métricas antes/depois | Concluído em `docs/qa/admin-refinement` |
