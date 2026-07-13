# QA Mobile-First — Ótica Vision

Validação concluída em 2026-07-12 no build otimizado do Next.js, sem promoção para produção.

## Escopo E Referências

Rotas revisadas:

- `/`
- `/instagram`

Referências mobile auditadas em Chromium real:

- `https://lp-sos-otica.vercel.app/`
- `https://lp-sos-otica.vercel.app/instagram`
- `https://lp-otica-moderna.vercel.app/`
- `https://lp-otica-moderna.vercel.app/instagram`

As referências influenciaram apenas ritmo, densidade de ação e ocupação da viewport. Layout, copy, identidade e componentes não foram copiados.

## Problemas Encontrados No Baseline

- No `/instagram`, a primeira ação começava entre 849 px e 1026 px; ficava fora da primeira viewport.
- O palco mobile do `/instagram` tinha 560–600 px e o vídeo principal media até 413 px de altura.
- Os quatro links formavam uma grade 2×2 em cruz, com numeração auxiliar competindo com os rótulos.
- A sequência do `/instagram` era uma esteira horizontal convencional e retornava em ordem reversa ao chegar ao fim.
- Galerias abaixo da dobra usavam carregamento eager para mídia que ainda não era necessária.
- Vídeos usavam `preload="metadata"`, inclusive os que não tocavam.
- O swipe da home dependia apenas de distância fixa e podia perder gestos rápidos e curtos.
- A falha de imagem da Exame removia o container e podia recolher o card.
- Controles e headings precisavam de proteção adicional para zoom de texto e min-content.
- Durante a QA, o autoplay do novo deck revelou CLS de 0,145–0,240 por animar `left`; as posições foram migradas para transforms e o CLS final ficou em 0.

## Direção Implementada

### Home

- Header e hero com safe areas, CTA principal dentro da primeira viewport e composição preservada em 360–430 px.
- Lente cinética responde ao toque e continua com movimento ocioso; aparelhos modestos usam cadência reduzida em vez de perder o efeito.
- Trio de vídeos mantido como uma única composição em profundidade, com no máximo um vídeo tocando.
- Vídeos usam poster e `preload="none"`; no carregamento inicial da home, os três permanecem em `readyState 0`.
- Galeria mantém anterior/atual/próxima, autoplay observado, swipe lento/rápido, teclado e botões de 44 px.
- Marcas, LAB, notícias e localização permanecem compactos; o primeiro card da Exame cabe inteiro no eixo horizontal.
- Falha de imagem da Exame preserva a proporção e o fundo do card, sem salto.
- Footer recebeu safe area inferior e reflow estável em zoom de texto.

### `/instagram`

- Experiência refeita como capa editorial mobile, não como lista de links.
- Logo reduzido para 110 px no mobile, com halo mais discreto.
- Palco de vídeo reduzido para 306–326 px; vídeo principal em crop 4:5 com testa, olhos, óculos e rosto visíveis.
- Dois vídeos menores ficam encaixados nas laterais e continuam com dimensões reais.
- Bio e dock horizontal de quatro ações ficam na primeira viewport; a primeira ação termina entre 611 px e 650 px.
- Números auxiliares foram removidos da leitura visual dos links.
- Seis imagens viraram um deck finito sem clones e sem esteira longa; apenas três imagens existem como mídia carregável por vez.
- O deck só inicia autoplay quando ao menos 52% está visível.
- Localização encerra a página com 24 px de respiro final, sem espaço morto.

## Motion E Autoplay

- Autoplay de imagem inicia quando o componente está visível.
- Pausa fora da viewport, durante arraste, em `document.visibilityState === "hidden"` e em reduced motion.
- Retoma após a interação/visibilidade sem somar atrasos duplicados.
- A próxima imagem já precisa estar carregada para a troca acontecer.
- Nenhum frame branco é inserido: a imagem anterior permanece e todos os cards têm placeholder derivado da mídia.
- Swipes lentos usam distância; swipes rápidos também consideram velocidade.
- Transições usam transform/opacity/filter e não geram CLS.
- Vídeos seguem o mesmo observador global, com seleção única por visibilidade.

## Séries Visuais

- Hero: `2 (1)`.
- Home: série 1 completa (`1 (1)` → `1 (3)`), série 3 completa e série 4 completa; 7 imagens.
- LAB: `5 (1)`.
- `/instagram`: série 6 completa, seguida da série 7 completa; 6 imagens.
- Autoplay do `/instagram`: 6(1) → 6(2) → 6(3) → 7(1) → 7(2) → 7(3) → início.
- Nenhuma imagem se repete entre hero, home, LAB e `/instagram`.

## Matriz De Breakpoints

| Viewport | CTA home (bottom) | CTA `/instagram` (bottom) | Overflow | CLS | Max. vídeos tocando |
| --- | ---: | ---: | ---: | ---: | ---: |
| 360×800 | 759 px | 611 px | 0 px | 0 | 1 |
| 375×812 | 784 px | 617 px | 0 px | 0 | 1 |
| 390×844 | 803 px | 633 px | 0 px | 0 | 1 |
| 393×852 | 811 px | 636 px | 0 px | 0 | 1 |
| 412×915 | 874 px | 646 px | 0 px | 0 | 1 |
| 430×932 | 891 px | 650 px | 0 px | 0 | 1 |

Resultado comum às 12 combinações de rota e viewport:

- zero 404, erro de console, erro de página ou hydration;
- zero imagem quebrada, imagem 0×0, vídeo 0×0 ou link vazio;
- todos os alvos de ação com pelo menos 44 px;
- nenhum vídeo oculto por CSS carregando;
- primeiro card de notícia entre 295 px e 305 px, totalmente dentro da viewport;
- rotação portrait → landscape → portrait sem overflow e sem mídia 0×0.

## Estados Especiais

- Reduced motion: autoplay e vídeos ficam parados; botões manuais e swipe permanecem disponíveis.
- JavaScript desabilitado: copy, links, posters, três vídeos dimensionados e uma imagem ativa por galeria continuam visíveis.
- Zoom de texto simulado em 200%: overflow 0 e nenhum heading cortado nas duas rotas.
- Visibilidade da página: vídeo pausou com delta de 0,002 s; galerias mantiveram o contador em hidden e avançaram após visible.
- Scroll com autoplay: um vídeo continuou selecionado, sem concorrência de playback.

## Rede Móvel Lenta

Simulação Chromium `cellular3g`, 400 ms de latência, 60 KiB/s de download e cache desabilitado:

| Rota | DOMContentLoaded | FCP | Container inicial | Imagens carregadas no recorte | Requests de vídeo |
| --- | ---: | ---: | --- | ---: | ---: |
| Home | 1728 ms | 1752 ms | 281×351 px | 3 de 21 elementos | 0 |
| `/instagram` | 1826 ms | 1872 ms | 220×276 px | 1 de 4 elementos | 0 |

Os containers mantiveram proporção desde o primeiro paint. Mídia abaixo da dobra permaneceu lazy, placeholders não ficaram brancos e nenhum vídeo bloqueou o conteúdo inicial.

## Evidências

Screenshots obrigatórios:

- `docs/qa/mobile-home-360x800.png`
- `docs/qa/mobile-home-390x844.png`
- `docs/qa/mobile-home-430x932.png`
- `docs/qa/mobile-instagram-360x800.png`
- `docs/qa/mobile-instagram-390x844.png`
- `docs/qa/mobile-instagram-430x932.png`

Sequências de interação:

- `docs/qa/mobile-proof-home-autoplay-01.png` e `-02.png`
- `docs/qa/mobile-proof-home-swipe-01.png` e `-02.png`
- `docs/qa/mobile-proof-home-lens-01.png` e `-02.png`
- `docs/qa/mobile-proof-instagram-autoplay-01.png` e `-02.png`
- `docs/qa/mobile-proof-instagram-swipe-01.png` e `-02.png`

## Preview

- Home: `https://lp-otica-vision-adxpllmg8-bandeirargabriel-6963s-projects.vercel.app/`
- Instagram: `https://lp-otica-vision-adxpllmg8-bandeirargabriel-6963s-projects.vercel.app/instagram`
- Ambas responderam HTTP 200 com cache HIT.
- Produção não foi promovida.

## Conteúdo E Limitações

- Foram seguidos `docs/brand.md`, `docs/copy-bank.md`, `docs/design-system.md`, `docs/assets-map.md`, `docs/anti-erros.md`, `docs/implementation-plan.md` e o skill `premium-lp-vision`.
- Não foram usados endereço, horário, avaliações, depoimentos, marcas afirmadas como estoque, prazo, garantia, exame, ajuste, manutenção ou parcelamento.
- Chrome automatizado mantém todas as abas como `visible`, inclusive em modo headful; por isso o caminho Page Visibility API foi validado no próprio Chromium com estados hidden/visible emulados e eventos reais `visibilitychange`.
- Safe areas e Safari iOS foram tratados por CSS (`env()`, `svh`), mas não houve aparelho iOS físico nesta rodada.
- O banco automatizado do skill `ui-ux-pro-max` não executou porque os launchers Python locais estavam inválidos; as regras do skill já lidas foram aplicadas manualmente.
- Notícias continuam dependentes da estrutura pública da Exame; em falha, o card preserva o layout sem inventar conteúdo.

## Validação Técnica

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou localmente e no preview Vercel.
- `git diff --check`: passou.
