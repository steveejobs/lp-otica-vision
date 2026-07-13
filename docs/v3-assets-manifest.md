# Manifesto Final de Assets

Inventário consolidado em 13 de julho de 2026, depois da aprovação visual e da limpeza do runtime.

## Fontes

- `galeria/`: arquivo mestre imutável, com 38 originais.
- `public/media/`: única fonte publicada, com 33 arquivos usados pelo runtime.
- `lib/assets.ts`: referência tipada de toda mídia local entregue ao site.
- `.vercelignore`: exclui `galeria/` do contexto de deploy.

As cópias necessárias em `public/media/` são idênticas aos mestres por SHA-256. Essa duplicidade existe apenas no Git: os originais não são enviados à Vercel.

## Runtime final

### Identidade

- `public/media/identity/logo sem fundo.png`: header e `/instagram`.
- `public/media/identity/favicon.png`: favicon, Open Graph e metadata.

### Home

- Hero: `2 (1).jpg`.
- Galeria: `1 (1).jpg`, `1 (2).jpg`, `1 (3).jpg`, `3 (1).jpg`, `3 (2).jpg`, `4 (1).jpg`, `4 (2).jpg`.
- LAB. DIGITAL: `5 (1).jpg`.
- Vídeos: `video (4).mp4`, `video (2).mp4`, `video (3).mp4`.
- Posters: `video-4.jpg`, `video-2.jpg`, `video-3.jpg`.
- Marcas: os dez arquivos de `public/media/brands/`.

### `/instagram`

- Imagens: `6 (1).jpg`, `6 (2).jpg`, `6 (3).jpg`, `7 (1).jpg`, `7 (2).jpg`, `7 (3).jpg`.
- Vídeos: `video (2).mp4`, `video (3).mp4`, `video (4).mp4`.
- Posters: `video-2.jpg`, `video-3.jpg`, `video-4.jpg`.
- Marcas: os mesmos dez arquivos públicos, sem cópia física adicional.

### Notícias

- Imagens remotas vêm exclusivamente das matérias da Exame.
- Falha de mídia usa o card textual; não existe imagem local fictícia de fallback.

## Originais preservados fora do runtime

Permanecem apenas em `galeria/`, como acervo mestre:

- `2 (2).jpg`;
- `5 (2).jpg`;
- `8 (1).jpg`, `8 (2).jpg`, `8 (3).jpg`, `8 (4).jpg`;
- `video.mp4`;
- `logo com fundo.png`.

Esses arquivos não entram no deployment e não devem ser apagados, movidos ou renomeados.

## Cópias públicas removidas

- Seis fotos fora da curadoria final: `2 (2)`, `5 (2)` e série 8.
- Vídeo reserva `video.mp4` e seu poster `video-1.jpg`.
- Logo institucional com fundo, sem referência de runtime.

## Garantias

- Nenhum arquivo em `public/` fica sem referência em `lib/assets.ts`.
- Nenhuma mídia pública possui hash duplicado dentro de `public/`.
- As três composições de vídeo preservam `muted`, `loop`, `playsInline`, poster e observação de viewport.
- As duas rotas preservam a curadoria visual aprovada.
