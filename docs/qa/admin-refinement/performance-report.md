# Relatório de desempenho do ADM

Medições em 18 de julho de 2026, com build de produção executado localmente e o mesmo projeto Supabase de preview. Nenhuma métrica foi obtida ocultando conteúdo incompleto: `content_ms` encerra somente quando o `<h1>` da nova tela está visível; `shell_persisted` verifica se o mesmo nó de conteúdo continuou conectado.

## Causa raiz confirmada

- A entrada global de `adminMain` durava 440 ms e era reaplicada quando a árvore administrativa remontava.
- O shell era reconstruído porque a fronteira de layout autenticado variava durante as navegações.
- Auth/perfil eram consultados no proxy, no layout e novamente nas páginas. O perfil agora é validado uma vez por render com cache React; ações e RLS continuam protegendo mutações.
- O prefetch automático dos 12 módulos e dos links de linha gerava 23–25 requests RSC por clique no baseline. O ADM agora faz prefetch somente por intenção explícita de navegação.
- Os seis contadores do dashboard bloqueavam a resposta principal; agora ficam em `Suspense`, em paralelo e fora do caminho do título e dos acessos rápidos.
- Marcas carregava até 200 logos e gerava URLs assinadas para todos. A lista agora pagina 24 registros e assina apenas os logos da página atual.
- Não foram encontrados links internos com `<a>` comum, `window.location`, `AnimatePresence`, `mode="wait"`, espera antes de `router.push`, `setTimeout` de loader ou duração mínima artificial.

## Antes e depois

| Métrica aquecida | Antes | Depois |
| --- | ---: | ---: |
| Feedback visual | 1.434–1.644 ms; não havia estado pendente imediato | 2–9 ms |
| Shell administrativo | remontado; indisponível até a nova rota | permanece conectado desde o clique |
| URL da rota | 1.434–1.644 ms | 231–347 ms |
| Conteúdo principal utilizável | 1.516–1.927 ms | 613–867 ms |
| Requests observados por troca | 36–39 | 1 |
| Requests RSC por troca | 23–25 | 1 |
| Shell persistente | 0/7 rotas | 7/7 rotas, nas duas rodadas |
| JavaScript transferido na rodada aquecida | 0–846 bytes adicionais | 0 bytes adicionais |
| Transferência observada | 11,4–12,2 KB | 2,5–13,2 KB conforme payload da página |

O baseline media o primeiro feedback disponível, que coincidia com a rota pronta. Depois da correção, o novo estado pendente é cronometrado dentro do navegador a partir do evento de clique, eliminando a sobrecarga do driver de automação.

## Chamadas ao Supabase por navegação

Contagem estática do caminho de servidor, sem contar a verificação local/JWKS de claims nem Storage. Todas as consultas independentes indicadas são executadas em paralelo.

| Tela | Antes (perfil + tela) | Depois (perfil + tela) | Observação |
| --- | ---: | ---: | --- |
| Dashboard | 9 | 7 | seis contadores paralelos e em streaming |
| Produtos | 6 | 4 | produto, marcas e categorias em paralelo; tabela paginada em 20 |
| Marcas | 4 | 2 | tabela paginada em 24; uma operação de Storage somente se houver logos na página |
| Categorias | 5 | 3 | categorias e vínculos em paralelo |
| Galerias | 5 | 3 | galerias e contagem de itens em paralelo |
| Destaques | 4 | 2 | uma consulta da tela |
| Auditoria | 5 | 3 | logs paginados e atores em paralelo |

O proxy deixou de repetir a leitura de `profiles`; autorização ativa permanece no layout protegido, em cada página restrita, nas server actions e nas políticas RLS.

## Evidências

- Baseline: `before/navigation-metrics.json` e `before/video/*.webm`.
- Depois: `after/navigation-metrics.json` e `after/video/*.webm`.
- Fluxos funcionais, RLS, sessão, foco e viewports: `after/functional/functional-results.json`.
