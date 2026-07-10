# Assets Manifest

Inventario concluido em 2026-07-10 antes da remocao do codigo legado.

## Regras De Preservacao

- Originais preservados sem renomear em `galeria/`.
- A V2 usa copias de deploy em `public/media/`; `galeria/` nao e fonte de pagina ou deploy.
- As 38 copias em `dist/galeria/` foram comparadas por SHA-256 e sao identicas aos 38 originais. Essas copias podem ser descartadas junto com `dist/`.
- Nenhum asset original esta marcado para exclusao fisica.
- `.env.local` nao existe neste worktree.
- Nao existem arquivos `.woff`, `.woff2`, `.ttf` ou `.otf` no projeto.

## Fotos Editoriais

| Arquivo | Tipo | Dimensoes | Proporcao | Grupo | Uso sugerido | Qualidade | Protagonista | Descartar | Reserva V2 |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| `galeria/1 (1).jpg` | JPEG | 1358x1810 | 3:4 | 1 | Close com reflexo; ritmo editorial | Alta | Sim | Nao | `editorialGalleryImages[8]` |
| `galeria/1 (2).jpg` | JPEG | 1440x1919 | 3:4 | 1 | Close lateral; faixa de imagens | Alta | Sim | Nao | `instagramImages[0]` |
| `galeria/1 (3).jpg` | JPEG | 1440x1920 | 3:4 | 1 | Imagem principal da marca | Alta | Sim | Nao | `heroMedia` |
| `galeria/2 (1).jpg` | JPEG | 1440x1919 | 3:4 | 2 | Retrato vermelho de alto contraste | Alta | Sim | Nao | `editorialGalleryImages[0]` |
| `galeria/2 (2).jpg` | JPEG | 1440x1919 | 3:4 | 2 | Variacao vermelha | Alta | Sim | Nao | `instagramImages[1]` |
| `galeria/3 (1).jpg` | JPEG | 1440x1919 | 3:4 | 3 | Retrato neutro em look bege | Alta | Sim | Nao | `editorialGalleryImages[2]` |
| `galeria/3 (2).jpg` | JPEG | 1440x1919 | 3:4 | 3 | Variacao neutra | Alta | Sim | Nao | `instagramImages[2]` |
| `galeria/4 (1).jpg` | JPEG | 1440x1919 | 3:4 | 4 | Oculos de lente ampla em fundo escuro | Alta | Sim | Nao | `instagramImages[3]` |
| `galeria/4 (2).jpg` | JPEG | 1440x1911 | 3:4 aprox. | 4 | Acabamento espelhado | Alta | Sim | Nao | `editorialGalleryImages[4]` |
| `galeria/5 (1).jpg` | JPEG | 1440x1919 | 3:4 | 5 | Armacao de grau em uso real | Media | Nao | Nao | `instagramImages[4]` |
| `galeria/5 (2).jpg` | JPEG | 1440x1919 | 3:4 | 5 | Perfil com armacao de grau | Media/alta | Nao | Nao | `editorialGalleryImages[3]` |
| `galeria/6 (1).jpg` | JPEG | 1440x1919 | 3:4 | 6 | Retrato quente com armacao marrom | Alta | Sim | Nao | `editorialGalleryImages[6]` |
| `galeria/6 (2).jpg` | JPEG | 1440x1919 | 3:4 | 6 | Retrato frontal em fundo neutro | Alta | Sim | Nao | `instagramImages[5]` |
| `galeria/6 (3).jpg` | JPEG | 1440x1919 | 3:4 | 6 | Close frontal semelhante ao grupo | Alta | Sim | Nao | Reserva; nao usar nesta V2 inicial |
| `galeria/7 (1).jpg` | JPEG | 1440x1919 | 3:4 | 7 | Perfil neutro em fundo escuro | Alta | Sim | Nao | Reserva; nao usar nesta V2 inicial |
| `galeria/7 (2).jpg` | JPEG | 1440x1919 | 3:4 | 7 | Retrato frontal em fundo escuro | Alta | Sim | Nao | `instagramImages[6]` |
| `galeria/7 (3).jpg` | JPEG | 1440x1919 | 3:4 | 7 | Perfil com armacao escura | Alta | Sim | Nao | `editorialGalleryImages[7]` |
| `galeria/8 (1).jpg` | JPEG | 1440x1762 | 120:147 | 8 | Macro de haste e acabamento | Media; compressao alta | Nao | Nao | `labMedia` |
| `galeria/8 (2).jpg` | JPEG | 1440x1762 | 120:147 | 8 | Uso real no ambiente da loja | Media | Nao | Nao | `editorialGalleryImages[1]` |
| `galeria/8 (3).jpg` | JPEG | 1320x1615 | 264:323 | 8 | Bandeja de armacoes; pausa de produto | Alta | Sim | Nao | `editorialGalleryImages[5]` |
| `galeria/8 (4).jpg` | JPEG | 1440x1762 | 120:147 | 8 | Uso real diante do espelho | Media | Nao | Nao | `instagramImages[7]` |

## Videos

Todos os videos sao verticais, 720x1280 (9:16), sem necessidade de audio na interface.

| Arquivo | Tipo | Duracao | Tamanho | Grupo | Uso sugerido | Qualidade | Protagonista | Descartar | Reserva V2 |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| `galeria/video.mp4` | MP4 | 00:14 | 2.16 MB | Video 1 | Apoio compacto; quadro mais escuro | Media | Nao | Nao | `instagramVideos[1]` |
| `galeria/video (2).mp4` | MP4 | 00:31 | 8.45 MB | Video 2 | Pessoa e oculos em loja, luz clara | Alta | Sim | Nao | `homeVideos[0]` e `instagramVideos[2]` |
| `galeria/video (3).mp4` | MP4 | 00:25 | 5.92 MB | Video 3 | Armacao vinho em loja | Alta | Sim | Nao | `homeVideos[1]` |
| `galeria/video (4).mp4` | MP4 | 00:28 | 9.37 MB | Video 4 | Uso externo diante da loja | Alta | Sim | Nao | `homeVideos[2]` e `instagramVideos[0]` |

Repeticao entre arrays de video ocorre apenas entre rotas diferentes. Dentro de cada rota, cada MP4 aparece uma vez. O hero usa imagem, portanto nenhum video se repete entre hero e secao de videos da home.

## Identidade

| Arquivo | Tipo | Dimensoes | Proporcao | Grupo | Uso sugerido | Qualidade | Protagonista | Descartar | Reserva V2 |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| `galeria/logo sem fundo.png` | PNG transparente | 1448x1086 | 4:3 | Identidade | Header, hero, `/instagram`, footer | Alta | Sim | Nao | Logo principal |
| `galeria/logo com fundo.png` | PNG | 1254x1254 | 1:1 | Identidade | Reserva institucional | Alta | Sim | Nao | Reserva |
| `galeria/favicon.png` | PNG | 1254x1254 | 1:1 | Identidade | Favicon e metadata | Alta | Nao | Nao | Favicon |

## Logos De Marcas

| Arquivo | Marca | Tipo | Dimensoes | Proporcao | Grupo | Uso sugerido | Qualidade | Protagonista | Descartar | Reserva V2 |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| `galeria/marcas/logo-rayban.png` | Ray-Ban | PNG | 1280x1280 | 1:1 | Marcas | Slot normalizado | Alta | Nao | Nao | `brandLogos` |
| `galeria/marcas/carrera (1).png` | Carrera | PNG | 800x157 | 5.10:1 | Marcas | Slot normalizado | Alta | Nao | Nao | `brandLogos` |
| `galeria/marcas/persol-logo-png-transparent.png` | Persol | PNG | 2400x2400 | 1:1 | Marcas | Slot normalizado | Alta | Nao | Nao | `brandLogos` |
| `galeria/marcas/Tom-Ford-logo.png` | Tom Ford | PNG | 3840x2160 | 16:9 | Marcas | Slot normalizado | Alta | Nao | Nao | `brandLogos` |
| `galeria/marcas/Swarovski-Logo-2016.png` | Swarovski | PNG | 3840x2160 | 16:9 | Marcas | Slot normalizado | Alta | Nao | Nao | `brandLogos` |
| `galeria/marcas/images__2_-removebg-preview.png` | Dolce & Gabbana | PNG | 447x447 | 1:1 | Marcas | Slot normalizado; escala conservadora | Media | Nao | Nao | `brandLogos` |
| `galeria/marcas/Jimmy_Choo_Ltd-Logo.wine.png` | Jimmy Choo | PNG | 3000x2000 | 3:2 | Marcas | Slot normalizado | Alta | Nao | Nao | `brandLogos` |
| `galeria/marcas/Max-Mara-logo.png` | Max Mara | PNG | 1280x720 | 16:9 | Marcas | Slot normalizado | Alta | Nao | Nao | `brandLogos` |
| `galeria/marcas/versace-logo.png` | Versace | PNG | 1280x659 | 1.94:1 | Marcas | Slot normalizado | Alta | Nao | Nao | `brandLogos` |
| `galeria/marcas/Emilio-Pucci-Logo.png` | Emilio Pucci | PNG | 1280x720 | 16:9 | Marcas | Slot normalizado | Alta | Nao | Nao | `brandLogos` |

## Arrays Planejados

Ordem documentada antes da implementacao de `lib/assets.ts`:

```text
heroMedia
  1 (3).jpg

homeVideos
  video (2).mp4
  video (3).mp4
  video (4).mp4

editorialGalleryImages
  2 (1).jpg
  8 (2).jpg
  3 (1).jpg
  5 (2).jpg
  4 (2).jpg
  8 (3).jpg
  6 (1).jpg
  7 (3).jpg
  1 (1).jpg

labMedia
  8 (1).jpg

instagramVideos
  video (4).mp4
  video.mp4
  video (2).mp4

instagramImages
  1 (2).jpg
  2 (2).jpg
  3 (2).jpg
  4 (1).jpg
  5 (1).jpg
  6 (2).jpg
  7 (2).jpg
  8 (4).jpg

newsFallback
  vazio: falha da fonte nao gera noticia falsa
```

## Verificacao De Repeticao

- Home: nenhuma foto aparece em mais de uma secao.
- Home: nenhum MP4 do hero se repete na secao de videos, pois o hero e estatico.
- Home: posters derivados dos videos nao entram na galeria.
- `/instagram`: tres videos distintos e oito imagens distintas.
- Imagens podem aparecer em rotas diferentes apenas quando documentado; a selecao inicial evita isso por completo.
