# QA Report

Validacao final concluida em 2026-07-10.

| Fase | Lint | Typecheck | Build | Mobile | Desktop | Observacao |
| --- | --- | --- | --- | --- | --- | --- |
| A | Passou | Passou | Passou | N/A | N/A | Next.js 16.2.10; ESLint 9 compativel |
| B | Passou | Passou | Passou | Passou em 390x844 | Passou em 1366x768 | Swipe, autoplay observado e transicao sem branco validados |
| C | Passou | Passou | Passou | Passou em 390x844 | Passou em 1366x768 | 10 logos normalizados; `/instagram` com 3 videos e 8 imagens unicas |
| D | Passou | Passou | Passou | Passou em 4 larguras | Passou em 2 larguras | Noticias reais, fallbacks, acessibilidade, requests e regressao visual validados |

## Matriz Final

Rotas `/` e `/instagram` auditadas em navegador Chromium real:

- 360x800
- 375x812
- 390x844
- 430x932
- 1366x768
- 1440x900

Resultado comum aos 12 cenarios:

- overflow horizontal: 0 px;
- imagens quebradas: 0;
- `alt` vazio em imagem relevante: 0;
- links com `href` vazio: 0;
- controles ou links de comando abaixo de 44 px: 0;
- erros de console e de pagina: 0;
- requests com falha e respostas 404: 0;
- videos 0x0 ou ocultos: 0;
- mojibake: nao detectado.

## Home

- 11 fotos de conteudo locais, todas unicas na rota;
- 3 videos distintos, todos com dimensao natural 720x1280;
- Lens Focus Gallery com 9 slides presentes no DOM;
- troca por clique e swipe validada; autoplay e pausa fora da viewport validados;
- 10 logos em slots de 132x64 no desktop e 112x56 no mobile;
- 3 noticias atuais da Exame, com 3 imagens remotas reais;
- proxima secao visivel no primeiro viewport da home em todas as larguras testadas;
- nenhum conteudo depende de uma animacao de entrada para permanecer visivel.

## Instagram

- 3 videos distintos, sem terceiro video oculto;
- 8 imagens de conteudo distintas;
- estrutura sem noticias e sem secao LAB separada;
- controles, crop e faixa curta de imagens validados em mobile e desktop.

## Noticias E Fallbacks

- endpoint `/api/exame-news`: HTTP 200 e `application/json; charset=utf-8`;
- cache: `s-maxage=28800` e `stale-while-revalidate=3600`;
- parser retorna titulo, URL original, imagem, categoria, data/tempo e fonte;
- falha da fonte retorna lista vazia e mantem apenas copy e CTA;
- falha de imagem remota remove a area de midia, sem card branco vazio;
- nenhuma noticia falsa e usada como fallback.

## Motion E Acessibilidade

- conteudo continua visivel sem JavaScript;
- `prefers-reduced-motion` remove transicoes e impede autoplay;
- videos pausam fora da viewport;
- foco visivel, skip link, HTML semantico e nomes acessiveis verificados;
- galeria mantem as imagens empilhadas no DOM, sem quadro branco durante a troca.

## Evidencias

Screenshots de trabalho estao em `.tmp/`, ignorado pelo Git, incluindo:

- `final-home-first-360x800.png`;
- `final-home-390x844.png`;
- `final-instagram-390x844.png`;
- capturas dedicadas de hero, videos, galeria, marcas, LAB, noticias e localizacao.

## Resultado Dos Comandos

- `npm run lint`: passou;
- `npm run typecheck`: passou;
- `npm run build`: passou;
- `npm audit`: 0 vulnerabilidades;
- `git diff --check`: passou.

## Ressalvas

- A pasta fisica `dist/` esta vazia e ignorada, mas permanece bloqueada por um processo externo do Windows. Nao contem fonte de deploy, arquivos ou alteracoes versionadas.
- A secao de noticias depende da disponibilidade e da estrutura publica da pagina da Exame; em falha, o layout reduz corretamente para copy e CTA.
