# Design System

Este design system define o criterio local de acabamento premium. Nao substituir por gosto pessoal.

## Direcao Visual

- Base: bege quente, aco/prata e contraste editorial.
- Sensacao: optica de alto cuidado, produto real, moda, precisao.
- Layout: limpo, alinhado, com areas de respiro intencionais.
- Referencia de acabamento: Apple/Google em grid, hierarquia, performance e microinteracao.
- Evitar visual SaaS generico, gradiente artificial e decoracao sem relacao com a marca.

## Tokens De Cor

```css
:root {
  --color-warm-beige: #d8c2a6;
  --color-soft-beige: #eadfce;
  --color-porcelain: #f7f2ea;
  --color-ink: #191714;
  --color-charcoal: #2d2a26;
  --color-muted: #746b60;
  --color-silver: #c8c8c4;
  --color-polished-steel: #e6e6e2;
  --color-bronze: #8f6d4f;
  --color-white: #ffffff;
}
```

## Tokens De Tipografia

```css
:root {
  --font-display: "Inter", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Inter", "Helvetica Neue", Arial, sans-serif;
  --text-hero: clamp(3rem, 8vw, 7.5rem);
  --text-title: clamp(2rem, 4vw, 4.5rem);
  --text-section: clamp(1.5rem, 2.5vw, 2.75rem);
  --text-body: clamp(1rem, 1.2vw, 1.125rem);
  --text-small: 0.875rem;
  --leading-tight: 0.95;
  --leading-title: 1.05;
  --leading-body: 1.55;
  --tracking-normal: 0;
}
```

Nao usar letter-spacing negativo. Nao escalar tipografia diretamente com `vw` sem `clamp`.

## Tokens De Espacamento

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;
  --space-32: 8rem;
  --max-page: 1200px;
  --radius-small: 6px;
  --radius-medium: 8px;
  --radius-pill: 999px;
}
```

## Componentes

- Header: leve, transparente ou bege, com logo e acoes essenciais.
- Hero: deve mostrar a marca/produto no primeiro viewport. Usar foto real ou logo real; nao usar ilustracao generica.
- CTA: texto direto, estado hover discreto, area de toque minima de 44px.
- Secoes: full-width ou conteudo sem moldura decorativa. Cards apenas para itens repetidos ou conteudos realmente agrupados.
- Galeria: fotos com crop intencional, sem filtros agressivos.
- Footer: links oficiais e dados confirmados.

## Movimento

- Microinteracoes curtas, entre 150ms e 280ms.
- Usar easing suave: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Nao criar animacoes que atrapalhem leitura, foco ou performance.
- Respeitar `prefers-reduced-motion`.

## Criterios De Imagem

Escolher imagem quando ela:

- Mostra produto, rosto usando armação, logo ou ambiente real.
- Tem nitidez suficiente em mobile e desktop.
- Combina com a paleta bege, prata, preto, marrom, vermelho ou tons neutros.
- Tem area segura para texto, quando usada como fundo.
- Parece editorial e nao banco de imagens generico.

Rejeitar imagem quando:

- O assunto principal fica cortado de forma ruim.
- A foto exige blur escuro para funcionar.
- A imagem compete com a logo.
- O produto nao aparece ou nao agrega.

## Criterios De Video

Usar video apenas se:

- Carrega rapido ou tem poster estatico.
- Nao inicia com quadro visualmente ruim.
- Tem movimento relevante de produto, loja, logo ou atendimento.
- Pode ficar sem audio.
- Nao bloqueia a interacao principal.

Evitar video se:

- Aumenta muito o peso inicial da pagina.
- Precisa de autoplay com som.
- Fica ilegivel no mobile.
- Nao comunica algo melhor que uma foto real.

## Checklist Mobile

- Hero legivel em 360px de largura.
- CTAs com 44px ou mais de area tocavel.
- Nenhum texto sobreposto a rosto, logo ou produto.
- Header sem quebra estranha.
- Fotos com crop testado em 360px, 390px e 430px.
- Secoes com respiro, mas sem vazios longos.
- Nenhuma linha de texto estoura o container.
- Links oficiais acessiveis sem depender de hover.

## Checklist De Build

Quando houver stack configurada:

- Rodar lint, se existir.
- Rodar build, se existir.
- Verificar console sem erros.
- Conferir imagens carregadas.
- Conferir links oficiais.
- Conferir performance basica do primeiro carregamento.
- Registrar qualquer teste nao executado e o motivo.
