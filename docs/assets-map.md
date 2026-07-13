# Assets Map Final

O inventário mestre, as dimensões e a curadoria estão em `docs/v3-assets-manifest.md`.

## Origem e deploy

- Originais imutáveis: `galeria/`, preservados no Git e ignorados pela Vercel.
- Assets de runtime: somente `public/media/`.
- Posters derivados usados: `video-2.jpg`, `video-3.jpg` e `video-4.jpg`.
- Fonte tipada de uso: `lib/assets.ts`.
- Notícias: imagens remotas das matérias da Exame, com fallback textual.

## Curadoria em produção

- Hero: `2 (1).jpg`.
- Home: séries 1, 3 e 4; três vídeos; dez logos de marcas.
- LAB: série 5 completa, `5 (1).jpg` e `5 (2).jpg`, em um mini-capítulo visual.
- `/instagram`: séries 6 e 7; três vídeos em duas composições; dez logos de marcas.
- Identidade: logo transparente e favicon.

## Regra

Nenhum arquivo público pode permanecer sem referência em `lib/assets.ts`. Os originais de `galeria/` não são enviados no deployment e não devem ser apagados, movidos ou renomeados.
