# Implementation Plan V2

## Fase A

1. Status e branch.
2. Inventario e manifesto antes da exclusao.
3. Limpeza do legado.
4. Next.js App Router, TypeScript, ESLint, tokens, assets e documentos.
5. Lint, typecheck e build.

## Fase B

Rodadas sequenciais: header/hero, VisionButton, videos e Lens Focus Gallery. Validar cada secao em 390x844 e executar os tres checks ao final da fase.

## Fase C

Rodadas sequenciais: marcas, LAB, localizacao/footer e `/instagram`. Validar mobile e executar os tres checks ao final da fase.

## Fase D

Rodadas sequenciais: extrator de noticias, route handler, layout das noticias, performance, acessibilidade e QA. Executar auditoria completa e os tres checks finais.

## Definicao De Pronto

- Fonte unica em `app/`, `components/`, `styles/`, `lib/` e `public/`.
- Dados oficiais apenas.
- Zero repeticao na home.
- Sem overflow, 404, erro de console, midia 0x0 ou espaco branco de transicao.
- Lint, typecheck e build aprovados.
