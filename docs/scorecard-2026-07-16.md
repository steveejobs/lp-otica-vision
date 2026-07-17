# Scorecard objetivo — 16/07/2026

## Escopo e regra de leitura

Esta avaliação trata a página como uma apresentação institucional da Ótica Vision, não como e-commerce. Portanto:

- “produto” significa armações nacionais e importadas, lentes e o diferencial LAB. DIGITAL;
- “oferta” significa a proposta de atendimento e o caminho de contato;
- “compra/checkout/kits” não são requisitos aplicáveis enquanto a página não vender diretamente;
- os caminhos de conversão avaliados são WhatsApp, Instagram e rota;
- preço, prazo, garantia, parcelamento, avaliações, depoimentos e marcas não foram inventados.

Não há arredondamento. Pontos que exigem teste humano não foram concedidos sem esse teste. A nota de Consumidora não foi atribuída.

## Resultado da rodada

| Área | Pontos | Nota | Situação |
| --- | ---: | ---: | --- |
| Marketing e conversão | 50/100 | 5,0 | Provisória; faltam testes humanos de compreensão e tarefa |
| UI/UX | 89/100 | 8,9 | Sem arredondamento; preview anônimo ainda não homologado |
| Desenvolvimento | 86/100 | 8,6 | Performance mobile abaixo do mínimo global |
| Consumidora | — | — | Nota de consumidora ainda não validada. |

## 1. Marketing e conversão

Adaptação institucional: CTA de compra e checkout foram substituídos por CTA de contato e integridade dos links externos. A inexistência de carrinho, preço ou kits não foi considerada falha.

| Critério | Peso | Pontos obtidos | Evidência | Problema | Correção |
| --- | ---: | ---: | --- | --- | --- |
| Proposta entendida em até 5 segundos | 15 | 0 | Teste humano não realizado | Não há evidência humana exigida pela matriz | Aplicar teste sem explicar a página antes |
| Identificação emocional específica | 10 | 9 | Copy publicada e `final-home-390x844.png` | Falta confirmação humana | Validar identificação com público real |
| Produto compreendido | 10 | 0 | Teste humano não realizado | Não há evidência humana exigida | Perguntar “o que está sendo apresentado?” após 5 segundos |
| Benefício e posicionamento sem claims indevidos | 10 | 10 | Auditoria de copy; `docs/copy-bank.md` e `docs/anti-erros.md` | Nenhum claim proibido encontrado | Manter banco de copy como fonte |
| Resultados/provas reais visíveis e confiáveis | 15 | 8 | Assets reais mapeados em `docs/assets-map.md`; screenshots completas | Não há autorização/depoimentos documentados; nenhum resultado foi inventado | Documentar autorização dos assets se houver uso como prova |
| Oferta institucional compreensível | 15 | 0 | Teste de tarefa não realizado | Não há evidência humana | Testar se a pessoa identifica atendimento, produtos e LAB. DIGITAL |
| CTA principal evidente | 10 | 10 | CTA na primeira dobra em 10 combinações de rota/viewport; `final-qa.json` | Nenhum problema local encontrado | Revalidar em preview público |
| Redução de risco e objeções | 5 | 3 | Localização, canais reais e LAB. DIGITAL publicados | Dados ausentes impedem ampliar prova sem inventar | Adicionar somente evidência comercial autorizada e real |
| Continuidade narrativa até o contato | 5 | 5 | Screenshots completas home mobile/desktop | Falta gravação humana da jornada | Gravar tarefa no preview público |
| Links externos e UTMs preservadas | 5 | 5 | Auditoria de href; URL oficial do WhatsApp mantém `utm_source=ig` | Não há checkout por definição de escopo | Manter URLs centralizadas e testar periodicamente |

**Total: 50/100 — nota 5,0.** A perda principal é de evidência, não a ausência de e-commerce.

Falhas eliminatórias de Marketing encontradas: nenhuma das aplicáveis ao site institucional. Não foram encontrados claim falso, preço inventado, texto interno ou CTA quebrado.

## 2. UI/UX

| Critério | Peso | Pontos obtidos | Evidência | Problema | Correção |
| --- | ---: | ---: | --- | --- | --- |
| Hierarquia da primeira dobra | 15 | 15 | Antes/depois em 390×844 e 1440×900 | Nenhum problema local encontrado | Manter logo, proposta e CTA na mesma leitura |
| Produto como protagonista | 10 | 10 | `final-home-390x844.png` e `final-home-1440x900.png` | Nenhum problema local encontrado | Preservar fotografia real |
| Identidade visual própria | 10 | 10 | Comparação crítica com direção em `docs/v3-design-direction.md` | Nenhum desvio relevante encontrado | Preservar direção bege, aço e editorial |
| Mobile-first real | 15 | 9 | QA local em 360, 390 e 430 px; overflow 0 | Preview anônimo protegido não pôde ser testado | Liberar preview ou fornecer bypass de QA |
| Galerias fáceis de observar | 15 | 10 | Interação local avançou índice 0→1 em home e Instagram | Falta teste de tarefa humano/publicado | Gravar cinco tarefas no preview público |
| Imagens sem cortes inadequados | 10 | 10 | Auditoria visual das quatro screenshots finais | Nenhum corte relevante encontrado | Revalidar a cada troca de asset |
| Navegação e CTAs claros | 10 | 10 | Alvos principais ≥44×44 px; CTA visível na dobra | Falta confirmação humana | Incluir na rodada de teste com consumidoras |
| Motion com função | 5 | 5 | Vídeos avançam normalmente; rails ficam estáticos em reduced motion | Nenhum problema local encontrado | Manter reduced motion nos testes de regressão |
| Densidade e ritmo | 5 | 5 | Screenshots completas mobile/desktop | Nenhuma seção quebrada ou vazia | Preservar ritmo editorial |
| Acessibilidade e ergonomia | 5 | 5 | Lighthouse Accessibility 100; teclado e touch no QA | Nenhum bloqueio técnico encontrado | Revalidar no preview público |

**Total: 89/100 — nota 8,9.** Não arredondada para 9. O preview autenticado responde corretamente, mas a experiência publicada anônima ainda mostra login da Vercel.

Falhas eliminatórias de UI/UX encontradas: nenhuma no ambiente local. Não houve overflow, texto sobreposto, controle abaixo de 44 px ou motion ativo em reduced motion.

## 3. Desenvolvimento e performance

| Critério | Peso | Pontos obtidos | Evidência | Problema | Correção |
| --- | ---: | ---: | --- | --- | --- |
| Build, lint e typecheck | 10 | 10 | `npm run lint`, `npm run typecheck` e `npm run build` concluídos | Nenhum erro | Manter no CI |
| Console e network limpos | 10 | 10 | `final-qa.json`: 0 erros e 0 requests falhos | Evidência local | Repetir em navegador anônimo após liberar preview |
| Assets sem 404 | 10 | 10 | 10 combinações sem 404; poster final respondeu 200 no preview | Nenhum erro encontrado | Manter auditoria automatizada |
| Links e redirects corretos | 15 | 13 | WhatsApp/Instagram/Maps auditados; rotas do preview retornam 200 | Navegação anônima do preview bloqueada antes do site | Liberar deployment protection para QA |
| Performance mobile | 15 | 5 | Lighthouse mobile final limpo: Performance 50; variação observada 50–66 | Abaixo dos mínimos 80 global e 90 para nota 9 | Reduzir hidratação/JS e custo da composição do hero |
| CLS e estabilidade visual | 10 | 10 | Lighthouse CLS 0 | Nenhum problema encontrado | Preservar dimensões explícitas de mídia |
| Imagens responsivas e lazy loading | 10 | 8 | Next Image, lazy abaixo da dobra; posters reduziram 308 KB→101 KB | Há espaço para reduzir transferência e variantes | Gerar tamanhos ainda mais específicos quando necessário |
| Acessibilidade técnica | 10 | 10 | Lighthouse Accessibility 100; labels/contraste corrigidos | Nenhum problema encontrado | Manter axe/Lighthouse no CI |
| SEO, canonical e metadata | 5 | 5 | Lighthouse SEO 100; canonical e `og:url` em `https://lp-otica-vision.vercel.app` | Nenhum domínio fictício | Atualizar apenas quando houver domínio oficial diferente |
| Código sustentável e dados centralizados | 5 | 5 | Revisão do diff; links comerciais permanecem centralizados | Nenhuma inconsistência encontrada | Manter arquitetura documentada |

**Total: 86/100 — nota 8,6.** Falha global presente: Performance mobile abaixo de 80. Lighthouse final: Accessibility 100, Best Practices 100, SEO 100, CLS 0.

## 4. Consumidora

**Nota de consumidora ainda não validada.**

A IA não atribuiu nota e não usou simulação como substituta. É obrigatório testar com pelo menos cinco mulheres próximas do público real, sem apresentar o site antes. O teste precisa registrar respostas, conclusão das tarefas, confiança e avaliação visual. A nota só pode ser calculada depois que essas evidências forem salvas.

## Comparação antes/depois do cabeçalho

| Viewport | Logo antes | Logo depois | Variação | Halo antes | Halo depois |
| --- | ---: | ---: | ---: | ---: | ---: |
| 390×844 | 96 px | 114 px | +18,8% | 99,8×11 px | 127,7×17,9 px |
| 1440×900 | 96 px | 132 px | +37,5% | 99,8×13,3 px | 147,8×20,5 px |

O halo ganhou área e menor opacidade por pixel, mantendo bordas dissolvidas. A logo passou a ser identificada mais rapidamente sem transformar o fundo em uma tarja preta.

## Três maiores perdas corrigidas nesta rodada

1. **Reconhecimento da marca:** logo ampliada e halo preto mais amplo, ainda discreto.
2. **Acessibilidade:** nomes acessíveis alinhados ao texto visível, contraste corrigido e Lighthouse Accessibility elevado de 96 para 100.
3. **Custo visual e de mídia:** animação contínua por `requestAnimationFrame` removida, `will-change` limitado ao estado necessário, prioridade do LCP declarada e posters reduzidos em 67%.

A tentativa de usar `content-visibility` foi rejeitada porque produziu áreas em branco nas screenshots completas. A regra não permaneceu no código final.

## Evidências salvas

- Antes: `.tmp/header-audit/before-header-390x844.png`, `.tmp/header-audit/before-fold-390x844.png`, `.tmp/header-audit/before-header-1440x900.png`, `.tmp/header-audit/before-fold-1440x900.png`.
- Depois: `.tmp/header-audit/after-header-390x844.png`, `.tmp/header-audit/after-fold-390x844.png`, `.tmp/header-audit/after-header-1440x900.png`, `.tmp/header-audit/after-fold-1440x900.png`.
- Página completa final: `.tmp/header-audit/final-home-390x844.png`, `.tmp/header-audit/final-home-1440x900.png`, `.tmp/header-audit/final-instagram-390x844.png`, `.tmp/header-audit/final-instagram-1440x900.png`.
- Métricas antes: `.tmp/header-audit/before-metrics.json`.
- QA final: `.tmp/header-audit/final-qa.json`.
- Lighthouse final: `.tmp/header-audit/lighthouse-home-mobile-final-clean.json`.
- Preview final: `https://lp-otica-vision-cuciy0ie2-bandeirargabriel-6963s-projects.vercel.app`.

## Bloqueios para nota 9

1. Marketing depende de teste humano de cinco segundos e de tarefa; não é correto conceder esses pontos por inspeção da IA.
2. O preview está publicado e responde 200 via acesso autenticado, mas a Vercel Deployment Protection impede o teste anônimo da página real.
3. Performance mobile está abaixo de 80 e exige uma rodada arquitetural adicional, maior que o ajuste isolado de cabeçalho.
4. Consumidora exige cinco participantes humanas; até lá não existe nota final dessa área.

