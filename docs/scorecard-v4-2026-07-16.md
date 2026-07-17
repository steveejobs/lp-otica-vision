# Scorecard objetivo V4 — 16/07/2026

## Resultado

| Área | Pontuação com evidência atual | Nota calculada | Homologação |
| --- | ---: | ---: | --- |
| Marketing e conversão | 54/100 | 5,4 | Provisória; 40 pontos dependem de teste humano |
| UI/UX | 89/100 | 8,9 | Sem arredondamento; faltam tarefa humana e preview anônimo |
| Desenvolvimento | 94/100 | 9,4 técnica | Nota homologável limitada a 8,9: Lighthouse Performance 81, abaixo de 90 |
| Consumidora | — | — | Nota de consumidora ainda não validada. |

Marketing foi adaptado para uma apresentação institucional. Carrinho, checkout, preço, kits e diferenciação de meses não são aplicáveis e não foram tratados como ausências. A conversão avaliada é contato por WhatsApp/Instagram e rota.

## 1. Marketing e conversão

| Critério | Peso | Pontos obtidos | Evidência | Problema | Correção |
| --- | ---: | ---: | --- | --- | --- |
| Proposta entendida em até 5 segundos | 15 | 0 | Teste humano não realizado | Evidência obrigatória ausente | Aplicar Parte 1 de `marketing-consumer-test-v4.md` |
| Identificação emocional específica | 10 | 10 | Copy e screenshots V4 publicadas | Falta confirmação humana | Validar identificação nas cinco sessões |
| Produto compreendido | 10 | 0 | Teste humano não realizado | Evidência obrigatória ausente | Medir menções a armações, óculos ou lentes |
| Benefício e posicionamento sem claims indevidos | 10 | 10 | Auditoria contra copy-bank, brand e anti-erros | Nenhum claim proibido encontrado | Manter copy centralizada |
| Resultados/provas reais visíveis e confiáveis | 15 | 10 | Vídeos, coleção e assets reais documentados | Não há autorização/depoimentos anexados como prova social | Documentar autorização antes de ampliar a alegação |
| Oferta institucional compreensível | 15 | 0 | Teste de tarefa não realizado | Evidência obrigatória ausente | Medir entendimento de armações, lentes, LAB e atendimento local |
| CTA principal evidente | 10 | 10 | WhatsApp visível na primeira dobra em cinco viewports | Nenhum problema local | Confirmar com tarefa humana |
| Redução de risco e objeções | 5 | 4 | Local real, canais oficiais, mídia real e LAB. DIGITAL | Dados comerciais ausentes não podem ser inventados | Adicionar somente prova autorizada |
| Continuidade narrativa até o contato | 5 | 5 | Home completa: hero → mídia → coleção → marcas → LAB → contato | Falta gravação humana da jornada | Gravar as cinco sessões |
| Links externos e UTMs | 5 | 5 | QA local e preview autenticado; WhatsApp mantém `utm_source=ig` | Nenhum checkout por definição de escopo | Manter links centralizados |

**Total atual: 54/100 — nota 5,4.**

Os três critérios humanos hoje zerados somam 40 pontos. Se pelo menos 4 de 5 participantes os validarem integralmente, o mesmo site alcança potencial documentado de **94/100**, sem alterar ou inventar conteúdo. Esse potencial não é nota oficial antes do teste.

Falhas eliminatórias de Marketing aplicáveis encontradas: nenhuma. Não foram encontrados claim falso, preço inventado, texto interno ou CTA quebrado.

## 2. UI/UX

| Critério | Peso | Pontos obtidos | Evidência | Problema | Correção |
| --- | ---: | ---: | --- | --- | --- |
| Hierarquia da primeira dobra | 15 | 15 | Hero V4 em 360, 390, 430 e 1440 px | Nenhum problema local | Confirmar teste de cinco segundos |
| Produto como protagonista | 10 | 10 | Foto real única e vídeos em uso | Nenhum corte relevante | Manter o asset principal |
| Identidade visual própria | 10 | 10 | Direção bege, aço e editorial; comparação com referência | Nenhum desvio relevante | Preservar V4 local |
| Mobile-first real | 15 | 9 | Cinco viewports locais, CTA na dobra e overflow 0 | Preview anônimo mostra login da Vercel | Liberar proteção ou fornecer bypass de QA |
| Galerias fáceis de observar | 15 | 10 | Automação avançou coleção 0→1; alvos ≥44 px | Falta teste humano sem instrução | Aplicar Parte 2 do protocolo |
| Imagens sem cortes inadequados | 10 | 10 | Screenshots completas mobile/desktop | Nenhum corte relevante encontrado | Revalidar quando o conteúdo mudar |
| Navegação e CTAs claros | 10 | 10 | WhatsApp na dobra; coleção, marcas e rota com ações reais | Falta confirmação humana | Incluir nas tarefas |
| Motion com função | 5 | 5 | Foco por interação, coleção e troca manual de marca | Nenhum motion contínuo novo | Manter reduced motion |
| Densidade e ritmo | 5 | 5 | Home completa sem seção vazia ou gigante | Nenhum problema local | Preservar nove capítulos |
| Acessibilidade e ergonomia | 5 | 5 | Lighthouse 100; touch, teclado e foco visível | Nenhum bloqueio técnico | Revalidar na ADM futura |

**Total: 89/100 — nota 8,9.** Não arredondada.

Falhas eliminatórias de UI/UX locais: nenhuma. O limite atual é de evidência publicada/humana, não uma quebra observada no layout.

## 3. Desenvolvimento e performance

| Critério | Peso | Pontos obtidos | Evidência | Problema | Correção |
| --- | ---: | ---: | --- | --- | --- |
| Build, lint e typecheck | 10 | 10 | Três comandos concluídos; build local e Vercel aprovados | Nenhum erro | Manter no CI |
| Console e network limpos | 10 | 10 | 10 combinações com 0 erros e 0 requests falhos | Preview anônimo protegido | Repetir em produção após promoção |
| Assets sem 404 | 10 | 10 | 0 assets 404; favicon e duas rotas respondem 200 no preview autenticado | Nenhum problema | Manter QA automatizado |
| Links e redirects corretos | 15 | 15 | Links oficiais centralizados; UTMs preservadas | Nenhum checkout por escopo | Auditar após futura ADM |
| Performance mobile | 15 | 9 | Lighthouse Performance 81 | Abaixo dos 90 exigidos para nota 9 homologada | Reduzir hidratação e TBT em rodada arquitetural |
| CLS e estabilidade visual | 10 | 10 | CLS 0 | Nenhum problema | Preservar dimensões e aspect-ratio |
| Imagens responsivas e lazy loading | 10 | 10 | Next Image, lazy abaixo da dobra e slots dimensionados | Nenhum bloqueio observado | ADM deve gerar variantes responsivas |
| Acessibilidade técnica | 10 | 10 | Lighthouse Accessibility 100; foco e teclado | Nenhum problema | Manter no CI |
| SEO, canonical e metadata | 5 | 5 | SEO 100; canonical para domínio real | Nenhum domínio fictício | Atualizar somente com domínio oficial |
| Código sustentável e dados centralizados | 5 | 5 | `lib/showcase-content.ts` e contrato CMS-ready | ADM ainda não implementada | Escolher auth/storage/CMS antes de `/admin` |

**Total técnico: 94/100 — nota calculada 9,4.** A nota não pode ser homologada como 9 porque Performance precisa ser no mínimo 90 e está em 81. Nota homologável atual: **8,9**.

O favicon passou de 1.254×1.254 px e 312.652 bytes para 192×192 px e 8.342 bytes, redução de 97%. Lighthouse observado antes/depois da otimização: Performance 69→81, TBT 1.123→454 ms, transferência 892 KiB→594 KiB; Accessibility, Best Practices e SEO permaneceram em 100 e CLS em 0.

## 4. Consumidora

**Nota de consumidora ainda não validada.**

Usar `docs/marketing-consumer-test-v4.md`. Nenhuma simulação de IA foi convertida em nota.

## Preview e evidências

- Preview V4: `https://lp-otica-vision-jzukuskdd-bandeirargabriel-6963s-projects.vercel.app`.
- Build remoto: aprovado, 0 vulnerabilidades no `npm ci`.
- Acesso autenticado: `/`, `/instagram` e `/media/identity/favicon.png` retornam 200.
- Acesso anônimo: retorna tela de login da Vercel; a página real não pôde ser testada anonimamente.
- QA global: `.tmp/header-audit/final-qa.json`.
- Lighthouse otimizado: `.tmp/refinement-audit/lighthouse-home-mobile-optimized.json`.
- Hero: `.tmp/refinement-audit/hero-final.json` e screenshots correspondentes.
- Coleção: `.tmp/refinement-audit/colecao-em-destaque.json` e screenshots correspondentes.
- Marcas: `.tmp/refinement-audit/marcas-em-destaque.json` e screenshots correspondentes.
- Motion e reduced motion: `.tmp/refinement-audit/motion-qa.json`.
- Referência auditada: `.tmp/reference-audit/reference-report.json` e screenshots correspondentes.

## Maiores perdas restantes

1. teste humano de cinco segundos e de tarefa para Marketing;
2. cinco consumidoras reais para a nota de Consumidora;
3. Performance Lighthouse 90, com foco em hidratação e TBT;
4. preview anônimo liberado para homologação pública.
