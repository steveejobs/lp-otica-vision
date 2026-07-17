# Tema Vision

Esta pasta centraliza os contratos visuais reutilizaveis do projeto.

- `vision-theme.css`: tokens de marca, tipografia, duracoes, easings, raios e containers.
- `vision-motion.css`: entrada observada, transicao de rota e regras de reduced motion.

Regras:

- Nao duplicar tokens em CSS modules.
- Usar `var(--container-mobile)` e `var(--container-desktop)` para larguras principais.
- Usar `var(--duration-*)` e `var(--ease-*)` em novas animacoes.
- Manter `prefers-reduced-motion` como requisito obrigatorio.
- Evitar gradientes de fundo artificiais; brilhos localizados em midia ou controles podem existir quando forem sutis e funcionais.
