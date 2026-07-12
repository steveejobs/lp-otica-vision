# Manifesto de Assets V3

Inventário concluído em 11 de julho de 2026, na branch `vision-v3-art-directed`, antes de qualquer implementação da V3.

## Escopo e preservação

- Originais imutáveis: `galeria/`, com 38 arquivos.
- Cópias públicas atuais: `public/media/`, com 42 arquivos.
- Das 42 cópias públicas, 38 são idênticas aos originais por SHA-256 e 4 são posters derivados dos vídeos.
- Nenhum asset foi apagado, movido, renomeado ou recomprimido nesta etapa.
- `.git/` e todo o histórico foram preservados.
- `.env.local` não existe neste worktree; nenhum conteúdo de ambiente foi exibido.
- Não existem arquivos de fonte `.woff`, `.woff2`, `.ttf` ou `.otf` fora de dependências.
- Os links oficiais permanecem em `lib/links.ts`; o código atual não foi alterado.

`Descartar` nas tabelas significa excluir da curadoria inicial da V3, nunca apagar o arquivo do repositório.

## Método de diagnóstico

- Dimensões de imagens lidas diretamente dos arquivos.
- Duração e resolução dos vídeos lidas dos metadados do Windows.
- Cada vídeo foi avaliado no poster e em três quadros distribuídos ao longo da duração.
- Qualidade considera resolução, nitidez, compressão, exposição, enquadramento e utilidade editorial.
- Os grupos numéricos preservam sua ordem original. Quando duas imagens do mesmo grupo entram numa rota, a menor numeração aparece primeiro.

## Imagens editoriais

| Arquivo | Dimensões e proporção | Grupo | Qualidade | Rosto / óculos | Uso sugerido | Risco de corte | Protagonista | Descartar da V3 inicial |
|---|---|---:|---|---|---|---|---|---|
| `galeria/1 (1).jpg` | 1358×1810, 3:4, retrato | 1 | Alta; reflexos e textura nítidos | Sim / sim | Abertura da galeria; close editorial | Médio em formato horizontal; preservar testa, armação e mãos | Sim | Não |
| `galeria/1 (2).jpg` | 1440×1919, 3:4, retrato | 1 | Alta; close lateral limpo | Sim / sim | Faixa de imagens do `/instagram` | Médio; não cortar haste nem mãos | Sim | Não |
| `galeria/1 (3).jpg` | 1440×1920, 3:4, retrato | 1 | Alta; retrato frontal forte | Sim / sim | Reserva de campanha | Médio; mãos e armação ocupam as bordas | Sim | Sim; redundante com `1 (1)` e `1 (2)` na curadoria V3 |
| `galeria/2 (1).jpg` | 1440×1919, 3:4, retrato | 2 | Alta; contraste vermelho/preto forte | Sim / sim | Hero da home | Baixo em 4:5; médio no desktop, preservando mão e topo da cabeça | Sim | Não |
| `galeria/2 (2).jpg` | 1440×1919, 3:4, retrato | 2 | Alta; variação lateral dinâmica | Sim / sim | Faixa de imagens do `/instagram` | Médio; bolsa, braço e armação criam pontos nas bordas | Sim | Não |
| `galeria/3 (1).jpg` | 1440×1919, 3:4, retrato | 3 | Alta; paleta neutra e acabamento editorial | Sim / sim | Galeria principal | Médio; braço elevado deve permanecer legível | Sim | Não |
| `galeria/3 (2).jpg` | 1440×1919, 3:4, retrato | 3 | Alta; pose frontal estável | Sim / sim | Faixa de imagens do `/instagram` | Médio; preservar mão, armação e gola | Sim | Não |
| `galeria/4 (1).jpg` | 1440×1919, 3:4, retrato | 4 | Alta; fundo escuro e lente ampla | Sim / sim | Faixa de imagens do `/instagram` | Médio; evitar corte na mão e no cabelo | Sim | Não |
| `galeria/4 (2).jpg` | 1440×1911, 3:4 aprox., retrato | 4 | Alta; lente espelhada com leitura imediata | Sim / sim | Galeria principal; ponto de cor e acabamento | Médio; manter testa, lente e mão superior | Sim | Não |
| `galeria/5 (1).jpg` | 1440×1919, 3:4, retrato | 5 | Média; reflexo forte e leve suavidade | Sim / sim | Mídia compacta do LAB, como detalhe de lente em uso | Baixo em close 4:5; reflexos não devem encobrir a armação | Não | Não |
| `galeria/5 (2).jpg` | 1440×1919, 3:4, retrato | 5 | Média/alta; perfil e armação de grau claros | Sim / sim | Galeria principal; alternância para lente clara | Baixo; preservar armação inteira e linha do queixo | Não | Não |
| `galeria/6 (1).jpg` | 1440×1919, 3:4, retrato | 6 | Alta; luz neutra e armação quente | Sim / sim | Galeria principal | Baixo em 4:5; médio em corte muito fechado | Sim | Não |
| `galeria/6 (2).jpg` | 1440×1919, 3:4, retrato | 6 | Alta; enquadramento frontal limpo | Sim / sim | Faixa de imagens do `/instagram` | Médio; duas mãos cercam a armação | Sim | Não |
| `galeria/6 (3).jpg` | 1440×1919, 3:4, retrato | 6 | Alta; close intenso | Sim / sim | Reserva de campanha | Alto; rosto e mãos já estão próximos das bordas | Sim | Sim; muito semelhante a `6 (1)` e `6 (2)` |
| `galeria/7 (1).jpg` | 1440×1919, 3:4, retrato | 7 | Alta; perfil sobre fundo escuro | Sim / sim | Reserva editorial | Médio; preservar braço, haste e contorno do rosto | Sim | Sim; o grupo tem opções mais claras e versáteis |
| `galeria/7 (2).jpg` | 1440×1919, 3:4, retrato | 7 | Alta; frontal e equilibrada | Sim / sim | Reserva editorial | Médio; mãos e armação próximas das laterais | Sim | Sim; redundante dentro do grupo 7 |
| `galeria/7 (3).jpg` | 1440×1919, 3:4, retrato | 7 | Alta; perfil curto com lente legível | Sim / sim | Fechamento da galeria principal | Médio; manter armação, mão superior e queixo | Sim | Não |
| `galeria/8 (1).jpg` | 1440×1762, 720:881, retrato | 8 | Média/baixa; compressão visível | Não / sim | Reserva de detalhe de produto | Alto; macro já fechado e logotipo ocupa a haste | Não | Sim; baixa qualidade para destaque e marca Prada não confirmada |
| `galeria/8 (2).jpg` | 1440×1762, 720:881, retrato | 8 | Média; captura real na loja | Sim / sim | Galeria principal; uso real | Médio; evitar cortar testa e mão lateral | Não | Não |
| `galeria/8 (3).jpg` | 1320×1615, 264:323, retrato | 8 | Alta; produto nítido e composição superior | Não / sim | Galeria principal; pausa de produto | Baixo; manter bandeja e mão como contexto | Sim, como apoio | Não |
| `galeria/8 (4).jpg` | 1440×1762, 720:881, retrato | 8 | Média; cena real diante do espelho | Sim / sim | Faixa de imagens do `/instagram` | Médio; espelho e braço delimitam o corte | Não | Não |

## Vídeos

Todos os vídeos são MP4, verticais 9:16, 720×1280, 30 fps e adequados para reprodução sem áudio.

| Arquivo | Duração | Qualidade | Pessoa/rosto | Óculos | Melhor enquadramento | Uso sugerido | Protagonista | Descartar da V3 inicial |
|---|---:|---|---|---|---|---|---|---|
| `galeria/video.mp4` | 14,558 s | Média/baixa; exposição escura e abertura laranja | Sim / sim | Sim | 9:16 integral; rosto no terço superior e mesa visível | Reserva, somente se faltar mídia | Não | Sim; perde leitura ao lado dos outros três vídeos |
| `galeria/video (2).mp4` | 31,044 s | Alta; luz clara, vários modelos e fundo de loja | Sim / sim | Sim em toda a sequência | 9:16; `object-position` próximo de 50% 26%, sem cortar testa | Apoio da home e vídeo principal do `/instagram` | Sim | Não |
| `galeria/video (3).mp4` | 25,053 s | Alta; boa luz e variação entre lentes claras e escuras | Sim / sim | Sim em toda a sequência | 9:16; rosto entre 24% e 34% da altura | Apoio da home e do `/instagram` | Sim | Não |
| `galeria/video (4).mp4` | 28,071 s | Alta; exterior, interior e plano de corpo inteiro | Sim / sim | Sim em toda a sequência | 9:16 integral; preservar rosto no alto e corte inferior para o plano aberto | Vídeo principal da home e apoio do `/instagram` | Sim | Não |

## Identidade

| Arquivo | Dimensões e proporção | Tipo | Qualidade | Uso V3 | Descartar |
|---|---|---|---|---|---|
| `galeria/logo sem fundo.png` | 1448×1086, 4:3 aprox. | PNG transparente | Alta | Logo principal; header, hero, `/instagram` e footer | Não |
| `galeria/logo com fundo.png` | 1254×1254, 1:1 | PNG | Alta | Reserva institucional; não competir com a mídia do hero | Não |
| `galeria/favicon.png` | 1254×1254, 1:1 | PNG | Alta | Favicon e metadata | Não |

## Logos de marcas

A presença do arquivo confirma apenas o asset disponível. Ela não deve ser convertida em afirmação de estoque, revenda autorizada ou disponibilidade permanente.

| Arquivo | Identificação do asset | Dimensões | Proporção | Qualidade | Normalização sugerida |
|---|---|---:|---:|---|---|
| `galeria/marcas/logo-rayban.png` | Ray-Ban | 1280×1280 | 1:1 | Alta | Reduzir a caixa transparente e usar escala visual maior |
| `galeria/marcas/carrera (1).png` | Carrera | 800×157 | 5,10:1 | Alta | Escala horizontal conservadora |
| `galeria/marcas/persol-logo-png-transparent.png` | Persol | 2400×2400 | 1:1 | Alta | Compensar grande área transparente |
| `galeria/marcas/Tom-Ford-logo.png` | Tom Ford | 3840×2160 | 16:9 | Alta | Escala média, preservando respiro lateral |
| `galeria/marcas/Swarovski-Logo-2016.png` | Swarovski | 3840×2160 | 16:9 | Alta | Escala média e alinhamento óptico pelo lettering |
| `galeria/marcas/images__2_-removebg-preview.png` | Dolce & Gabbana | 447×447 | 1:1 | Média | Não ampliar além do necessário; revisar serrilhado em 1440 px |
| `galeria/marcas/Jimmy_Choo_Ltd-Logo.wine.png` | Jimmy Choo | 3000×2000 | 3:2 | Alta | Centralizar pelo lettering, não pelo canvas |
| `galeria/marcas/Max-Mara-logo.png` | Max Mara | 1280×720 | 16:9 | Alta | Escala média e altura óptica equivalente |
| `galeria/marcas/versace-logo.png` | Versace | 1280×659 | 1,94:1 | Alta | Reduzir levemente para equilibrar o símbolo |
| `galeria/marcas/Emilio-Pucci-Logo.png` | Emilio Pucci | 1280×720 | 16:9 | Alta | Escala média e centralização vertical |

## Cópias públicas e posters

- `public/media/photos/`: 21 cópias, com os mesmos nomes, dimensões e hashes das fotos em `galeria/`.
- `public/media/videos/`: 4 cópias, com os mesmos nomes, metadados e hashes dos vídeos em `galeria/`.
- `public/media/identity/`: 3 cópias, com os mesmos nomes, dimensões e hashes dos arquivos de identidade.
- `public/media/brands/`: 10 cópias, com os mesmos nomes, dimensões e hashes dos logos de marcas.
- `public/media/posters/video-1.jpg`: 720×1280, poster derivado de `video.mp4`.
- `public/media/posters/video-2.jpg`: 720×1280, poster derivado de `video (2).mp4`.
- `public/media/posters/video-3.jpg`: 720×1280, poster derivado de `video (3).mp4`.
- `public/media/posters/video-4.jpg`: 720×1280, poster derivado de `video (4).mp4`.

Os posters são suporte técnico dos vídeos e não entram como imagens editoriais independentes.

## Curadoria V3 por área

| Área | Arquivo | Motivo | Risco | Enquadramento |
|---|---|---|---|---|
| Hero | `2 (1).jpg` | Contraste forte, rosto e armação legíveis, presença comercial imediata | Vermelho pode dominar se a UI competir com a foto | Retrato 4:5 no mobile; painel vertical de 4:5 a 3:4 no desktop |
| Home, vídeo principal | `video (4).mp4` | Combina close, uso real, exterior e plano mais aberto | Mudança de escala ao longo do vídeo | Card 9:16 integral; crop apenas embaixo quando necessário |
| Home, apoio 1 | `video (2).mp4` | Luz clara e troca visível de modelos | Duração de 31 s e fundo com informação | Card 9:16, rosto no terço superior |
| Home, apoio 2 | `video (3).mp4` | Alterna lente clara e escura com boa leitura | Camiseta verde adiciona cor forte | Card 9:16, sem corte de testa ou armação |
| Galeria 1 | `1 (1).jpg` | Abertura gráfica forte e reflexo nas lentes | Textura de pele ocupa muito quadro | Centro em 3:4; preservar mãos |
| Galeria 2 | `8 (2).jpg` | Introduz ambiente real e rompe a sequência de estúdio | Qualidade média | 4:5 com testa, óculos e ombros |
| Galeria 3 | `6 (1).jpg` | Retoma retrato quente com armação marrom | Similaridade de modelo com outros grupos | 3:4 central, mãos como moldura |
| Galeria 4 | `5 (2).jpg` | Traz armação de grau e lente clara | Reflexo de janela | 4:5, perfil e armação completos |
| Galeria 5 | `4 (2).jpg` | Ponto de contraste com lente espelhada | Mão superior perto da borda | 3:4 com crop inferior, nunca sobre os olhos |
| Galeria 6 | `8 (3).jpg` | Pausa de produto sem rosto | Composição de loja menos editorial | 4:5, bandeja inteira e mão parcial |
| Galeria 7 | `3 (1).jpg` | Neutraliza a sequência com bege e madeira | Braço elevado limita o crop | 3:4, mantendo ombro e braço |
| Galeria 8 | `7 (3).jpg` | Fechamento sereno e perfil claro | Fundo escuro pode pesar | 3:4, com respiro na direção do olhar |
| LAB | `5 (1).jpg` | Lente clara, reflexo e armação em detalhe; melhor aproximação disponível | Não mostra o processo de fabricação | Mídia compacta 4:5; usar como atmosfera, não como prova técnica |
| `/instagram`, vídeo principal | `video (2).mp4` | Luz consistente, rosto e armações sempre visíveis | Fundo de loja movimentado | 9:16, largura máxima controlada |
| `/instagram`, vídeo menor 1 | `video (3).mp4` | Variedade de lentes e movimento facial | Cor forte da roupa | 9:16 integral |
| `/instagram`, vídeo menor 2 | `video (4).mp4` | Contexto externo e plano de corpo inteiro | Precisa preservar o topo nos closes | 9:16 integral |
| `/instagram`, imagem 1 | `1 (2).jpg` | Close lateral e acabamento da haste | Mãos nas laterais | 3:4 |
| `/instagram`, imagem 2 | `2 (2).jpg` | Cor e pose dinâmica | Muitos elementos vermelhos | 3:4 |
| `/instagram`, imagem 3 | `3 (2).jpg` | Neutro editorial | Braço elevado | 3:4 |
| `/instagram`, imagem 4 | `4 (1).jpg` | Lente ampla e fundo escuro | Mão junto ao rosto | 3:4 |
| `/instagram`, imagem 5 | `6 (2).jpg` | Retrato quente frontal | Mãos delimitam o crop | 3:4 |
| `/instagram`, imagem 6 | `8 (4).jpg` | Cena real diante do espelho | Compressão e fundo de loja | 4:5 aprox. |

## Ordem final por rota

### Home

1. Hero: `2 (1).jpg`.
2. Vídeos: `video (4).mp4`, `video (2).mp4`, `video (3).mp4`.
3. Galeria: `1 (1).jpg`, `8 (2).jpg`, `6 (1).jpg`, `5 (2).jpg`, `4 (2).jpg`, `8 (3).jpg`, `3 (1).jpg`, `7 (3).jpg`.
4. LAB: `5 (1).jpg`.

Não há arquivo repetido na home. A ordem relativa de `8 (2)` e `8 (3)` foi preservada.

### `/instagram`

1. Vídeos: `video (2).mp4`, `video (3).mp4`, `video (4).mp4`.
2. Imagens: `1 (2).jpg`, `2 (2).jpg`, `3 (2).jpg`, `4 (1).jpg`, `6 (2).jpg`, `8 (4).jpg`.

Não há arquivo repetido no `/instagram`. As seis imagens também não se repetem na home; os vídeos podem reaparecer entre rotas, mas apenas uma vez em cada rota.

## Assets fora da curadoria inicial

| Arquivo | Motivo |
|---|---|
| `1 (3).jpg` | Forte, mas redundante com os outros dois retratos do grupo 1 |
| `6 (3).jpg` | Close apertado e muito semelhante às seleções do grupo 6 |
| `7 (1).jpg` | Fundo pesado e redundância com `7 (3).jpg` |
| `7 (2).jpg` | Boa reserva, mas não acrescenta variedade suficiente à sequência inicial |
| `8 (1).jpg` | Compressão alta e marca Prada visível sem confirmação comercial |
| `video.mp4` | Exposição mais escura, sobreposição de cor e menor clareza que os demais vídeos |

Nenhum desses arquivos deve ser excluído fisicamente.
