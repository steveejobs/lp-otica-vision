# Assets Map V2

O inventario integral, dimensoes, qualidade e reservas esta em `docs/assets-manifest.md`.

## Origem E Deploy

- Originais imutaveis: `galeria/`.
- Copias publicas da V2: `public/media/`.
- Posters derivados: `public/media/posters/`.
- Fonte tipada de uso: `lib/assets.ts`.

## Reservas

- Hero: `1 (3).jpg`.
- Home videos: `video (2).mp4`, `video (3).mp4`, `video (4).mp4`.
- Galeria: nove imagens listadas no manifesto, sem repeticao.
- LAB: `8 (1).jpg`.
- `/instagram`: tres videos e oito imagens distintas.
- Noticias: imagens remotas das materias; fallback vazio.

## Regra

Nenhum arquivo aparece duas vezes na mesma rota. Nao mover, renomear ou apagar os originais de `galeria/`.
