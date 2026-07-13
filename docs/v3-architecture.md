# Arquitetura V3

## Home

A home terá exatamente nove blocos. Cada bloco tem uma função distinta e uma única ideia visual dominante.

### 1. Header mínimo

- Conteúdo: logo, link `Instagram` e botão `WhatsApp`.
- Função: reconhecer a marca e disponibilizar contato sem criar navegação falsa.
- Comportamento: fluxo normal; pode permanecer no topo apenas se a implementação não criar peso ou sobreposição.

### 2. Hero

- Linha: `Armações e lentes · Araguaína - TO`.
- H1: `Armações que dão forma à sua presença.`
- Texto: `Armações nacionais e importadas, com lentes confeccionadas pela Vision em Araguaína.`
- CTAs: `Falar no WhatsApp` e `Ver Instagram`.
- Mídia: `2 (1).jpg`.
- Desktop: duas colunas assimétricas, copy à esquerda e painel vertical à direita.
- Mobile: copy primeiro e foto abaixo, com parte da seção de vídeos aparecendo ao fim da primeira viewport.
- Não usar slideshow, vídeo, card, chip ou texto sobre a foto.

### 3. Seção de vídeos

- Título: `A armação entra em cena.`
- Texto: `Forma, proporção e acabamento em movimento.`
- Principal: `video (4).mp4`.
- Apoios: `video (2).mp4` e `video (3).mp4`.
- Desktop: principal centralizado, apoios menores abaixo, conjunto entre 720 e 820 px.
- Mobile: principal centralizado e apoios lado a lado; sem vídeo oculto.
- Reprodução: os três vídeos tocam simultaneamente com muted, loop, playsInline, poster e preload metadata quando a composição está visível; todos pausam fora da viewport, em aba oculta, reduced motion ou economia de dados.

### 4. Galeria editorial

- Título: `A escolha ganha contorno.`
- Texto: `Linhas, proporções e acabamentos reunidos pela Vision.`
- Ordem: `1 (1)`, `1 (2)`, `1 (3)`, `3 (1)`, `3 (2)`, `4 (1)`, `4 (2)`.
- Desktop: imagem ativa central, anterior e próxima parcialmente visíveis; controles pequenos fora da mídia.
- Mobile: swipe horizontal com laterais visíveis; interação por toque sem botão obrigatório.
- Todas as imagens permanecem no DOM; troca por opacidade e transformação leve.
- Autoplay observado a cada 4,8 s, condicionado ao carregamento da próxima imagem; gesto manual pausa por 7,2 s e depois retoma.

### 5. Marcas

- Título: `Marcas premium. Seleção Vision.`
- Texto: `Consulte os modelos pelo WhatsApp.`
- Conteúdo: os dez logos inventariados.
- Layout: rail contínuo da direita para a esquerda, com duas sequências idênticas e deslocamento exato de uma sequência mais a emenda.
- Cada slot tem dimensão estável; a escala do logo é ajustada opticamente, sem forçar largura comum.
- Pausa fora da viewport, em aba oculta e no hover desktop; reduced motion ou economia de dados convertem o rail em lista horizontal manual.
- Não incluir texto sobre revenda, estoque, autorização ou disponibilidade permanente.

### 6. LAB. DIGITAL

- Selo: `LAB. DIGITAL`.
- Headline: `Lentes que nascem na própria Vision.`
- Texto: `Confecção própria em Araguaína - TO, com cuidado no acabamento.`
- CTA: `Falar sobre lentes`.
- Mídia: série 5 completa, `5 (1).jpg` e `5 (2).jpg`, preservando essa ordem.
- Desktop: copy e mídia compacta em duas colunas.
- Mobile: copy antes de um mini-capítulo visual sobreposto; CTA permanece junto ao texto e as duas imagens ficam integralmente encaixadas no container.
- As fotos mostram armações e lentes em uso e não devem ser tratadas como registro do processo fabril.

### 7. Notícias

- Selo: `Exame`.
- Título: `Óculos em pauta.`
- Texto: `Moda, consumo e mercado óptico em matérias da Exame.`
- CTA: `Ler mais na Exame`.
- Conteúdo: até seis matérias reais, únicas e com imagem recuperada pela integração da Exame.
- Desktop: copy com CTA e três cards em cena, com avanço automático lento e navegação manual.
- Mobile: copy e CTA primeiro; um card inteiro com parte do próximo visível.
- Comportamento: sequência cíclica sem clones, swipe e drag; pausa após interação, fora da viewport e em aba oculta; `prefers-reduced-motion` mantém apenas a navegação manual.
- Falha de fonte: manter apenas copy e CTA. Não criar fallback editorial fictício.
- Card sem imagem: versão textual compacta, sem reservar mídia vazia.

### 8. Localização e CTA

- Título: `Vision em Araguaína. Escolha de perto.`
- Texto: `Fale com a Vision pelo WhatsApp ou veja a rota até a loja.`
- CTAs: `Falar no WhatsApp` e `Ver rota`.
- Sem endereço, horário ou mapa incorporado.
- Área de encerramento curta, com hierarquia alta e fundo quente controlado.

### 9. Footer mínimo

- Nome da marca, Instagram e links oficiais necessários.
- Sem menu inventado, newsletter, endereço ou horários.

## `/instagram`

A rota funciona como página de links e mídia, não como segunda landing page.

### Ordem de conteúdo

1. Logo transparente com halo discreto.
2. `@oticavisionaraguaina`.
3. Hero de vídeo com `video (2).mp4` e `video (3).mp4`.
4. Bio: `Armações nacionais e importadas. Lentes feitas pela Vision. Araguaína - TO.`
5. Botões empilhados: `WhatsApp`, `Instagram`, `Rota` e `Site completo`, com WhatsApp em primeiro nível.
6. Vídeo completo `video (4).mp4` em uma composição própria.
7. Imagens: `6 (1)`, `6 (2)`, `6 (3)`, `7 (1)`, `7 (2)`, `7 (3)`.
8. Rail com as dez marcas confirmadas e a mesma linguagem da home.
9. Localização em Araguaína com link de rota.

### Comportamento

- Mobile: coluna única; os dois vídeos da hero compõem a primeira dobra e o terceiro aparece inteiro em um bloco vertical posterior.
- Desktop: logo e handle centralizados; bloco principal em duas colunas, com a hero de vídeos de um lado e bio e botões do outro; o vídeo completo aparece abaixo.
- Nenhum quarto vídeo oculto ou mídia 0×0.
- Cada composição toca todos os seus vídeos simultaneamente apenas enquanto está visível; ambas pausam fora da viewport, em aba oculta e reduced motion.
- A galeria avança a cada 3,9 s, pausa por 6,5 s após gesto e retoma automaticamente.
- O rail de marcas reutiliza a mesma normalização óptica da home em escala menor.
- Não incluir seção LAB separada, lista longa ou mais de seis imagens na galeria de armações.
- Não incluir notícias: após galeria e marcas, a página segue diretamente para localização e encerramento.

## Links oficiais

| Ação | Destino |
|---|---|
| WhatsApp | `https://api.whatsapp.com/send/?phone=5563992231522&text&type=phone_number&app_absent=0&utm_source=ig` |
| Instagram | `https://www.instagram.com/oticavisionaraguaina/` |
| Rota | `https://maps.app.goo.gl/4WeumQSuU4hg6yuv6` |
| Site completo | `/` |

## Dados deliberadamente ausentes

Nenhum bloco poderá introduzir endereço completo, horário, avaliações, depoimentos, promoção, parcelamento, prazo, garantia, exame de vista, certificação, prêmio, disponibilidade permanente ou marca não confirmada.
