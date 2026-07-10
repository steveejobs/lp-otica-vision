# Design Direction

## Direcao Escolhida

Editorial quente com precisao metalica: fundos off-white e champagne, texto grafite, logo prata com halo discreto, fotografia vertical real e composicoes assimetricas sem excesso de molduras.

## Hierarquia

- Marca, oferta e local aparecem no primeiro viewport.
- H1 elegante, controlado e legivel a 360px.
- Titulos de secao curtos; apoio com largura de leitura limitada.
- CTAs de vidro/champagne com borda de aco e icone funcional.

## Midia

- Hero estatico para estabilidade e LCP previsivel.
- Video principal vertical e dois apoios compactos.
- Uma unica galeria, com tres planos visiveis e transicao por opacity/transform.
- Logos em grid estatico, normalizados por escala optica.

## Decisoes Do UI Skill

A busca local sugeriu hierarquia editorial e minimalismo, pontos incorporados. Foram rejeitados azul/laranja, peso 900, letter spacing negativo, tipografia exagerada e espacos gigantes porque conflitam com `docs/brand.md`, `docs/design-system.md` e o briefing V2.

## Responsividade

Base de projeto: 390x844. O hero deixa a proxima secao perceptivel, controles nao cobrem rostos, rails nao usam translate negativo e elementos fixos reservam dimensoes para evitar layout shift.
