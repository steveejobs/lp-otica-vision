# Design System V2

## Conceito

`Editorial quente com precisao metalica.`

## Tokens

```css
:root {
  --vision-bg: #b19475;
  --vision-bg-soft: #f4eee6;
  --vision-paper: #fbf8f3;
  --vision-ink: #191614;
  --vision-muted: #74675d;
  --vision-steel: #d9dde1;
  --vision-steel-dark: #8f969d;
  --vision-champagne: #c7ad8e;
  --vision-bronze: #7a6049;
  --vision-line: rgba(25, 22, 20, 0.12);
}
```

## Tipografia

- Display: serif editorial do sistema, peso 500 a 600.
- Corpo: sans-serif do sistema, peso 400 a 600.
- Letter spacing sempre `0`.
- H1 responsivo com `clamp`, sem peso 800/900.

## Layout

- Desktop: `width: min(88vw, 1320px)`.
- Mobile: `width: min(92vw, 100%)`.
- Secoes sem moldura decorativa; cards apenas para itens repetidos.
- Raios de 6px ou 8px.
- Padding vertical moderado; nenhuma secao deve criar vazio sem funcao.

## Movimento

- Entrada: opacity e translateY leve, 500ms a 800ms.
- Midia: galeria e autoplay observado dos videos.
- Conteudo visivel sem JavaScript.
- `prefers-reduced-motion` obrigatorio.

## Proibido

Secoes pretas, gradiente neon, botao preto solido, bege uniforme, sombras pesadas, cards brancos genericos, tipografia quadrada gigante e animacoes distintas por bloco.
