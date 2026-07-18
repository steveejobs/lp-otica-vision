# Câmara de Foco · Storyboard da prova

## Tese

`O foco ganha matéria.` A abertura não apresenta uma fotografia pronta: ela desmonta o retrato em planos ópticos e faz a própria mídia se reorganizar como trilho de seleção.

## Fases

1. **Expectativa**: retrato principal dividido em três lâminas com focos diferentes, tipografia atravessando frente e fundo, marca e ações sempre visíveis.
2. **Revelação**: uma faixa horizontal nítida encontra olhos e armação. O vídeo é carregado tardiamente e ocupa somente esse plano óptico.
3. **Profundidade**: retrato, vídeo, vidro, aço e tipografia alteram recorte, escala e perspectiva em ritmos independentes.
4. **Transformação**: as lâminas passam a exibir três mídias reais e se assentam em um trilho contínuo de seleção. Como não existem produtos publicados no ambiente durante a auditoria, os itens são rotulados como experimentais e não recebem marca, preço ou disponibilidade fictícios.

## Isolamento

- rota fora do menu e do sitemap;
- metadata `noindex`, `nofollow`, `noarchive` e `noimageindex`;
- `robots.txt` bloqueia `/experiments/`;
- `VERCEL_ENV=production` responde com `notFound()`;
- nenhum componente da home é alterado.

## Implementação

- Next.js e React existentes;
- CSS 3D, máscaras, `clip-path`, filtros e composição de camadas;
- controlador de scroll via um único `requestAnimationFrame`;
- vídeo sem `src` inicial, carregado somente durante a revelação;
- fallback estático completo para JavaScript ausente e `prefers-reduced-motion`.

## QA final

- viewports validados: `360×800`, `375×812`, `390×844`, `412×915`, `430×932`, `1366×768` e `1440×900`;
- CLS acumulado igual a `0` durante a sequência completa em todos os viewports;
- nenhum overflow horizontal, erro de console, request falho ou mídia `0×0`;
- CTAs com 48 px de altura no mobile e disponíveis desde o primeiro frame;
- fallback sem JavaScript mantém frase, CTAs e seleção;
- reduced motion mantém a composição estática, não adiciona `src` ao vídeo e exibe a seleção;
- `/experiments/` bloqueado no `robots.txt`, ausente do sitemap e com metadata `noindex`;
- execução com `VERCEL_ENV=production` responde `404`;
- gravação mobile: `390×844`, 9,52 s;
- gravação desktop: `1440×900`, 13,92 s.

## Limitação conhecida

Não havia produto publicado com capa na consulta pública durante a auditoria. A transformação usa três mídias locais reais, rotuladas como planos experimentais, sem inventar produto, marca, preço ou disponibilidade. Se produtos publicados forem adicionados, a rota já prioriza até três itens reais retornados pelo contrato existente do catálogo.
