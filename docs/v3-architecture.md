# Arquitetura V3

## Home

A home terá exatamente nove blocos. Cada bloco tem uma função distinta e uma única ideia visual dominante.

### 1. Header mínimo

- Conteúdo: logo, link `Instagram` e botão `WhatsApp`.
- Função: reconhecer a marca e disponibilizar contato sem criar navegação falsa.
- Comportamento: fluxo normal; pode permanecer no topo apenas se a implementação não criar peso ou sobreposição.

### 2. Hero

- Linha: `Ótica Vision · Araguaína - TO`.
- H1: `Armações que fazem sentido no rosto — e na rotina.`
- Texto: `Modelos nacionais e importados, com lentes feitas pela Vision em Araguaína.`
- CTAs: `WhatsApp` e `Instagram`.
- Mídia: `2 (1).jpg`.
- Desktop: duas colunas assimétricas, copy à esquerda e painel vertical à direita.
- Mobile: copy primeiro e foto abaixo, com parte da seção de vídeos aparecendo ao fim da primeira viewport.
- Não usar slideshow, vídeo, card, chip ou texto sobre a foto.

### 3. Seção de vídeos

- Título: `No rosto, na luz, no detalhe.`
- Texto: `Veja como as armações se comportam em uso real.`
- Principal: `video (4).mp4`.
- Apoios: `video (2).mp4` e `video (3).mp4`.
- Desktop: principal centralizado, apoios menores abaixo, conjunto entre 720 e 820 px.
- Mobile: principal centralizado e apoios lado a lado; sem vídeo oculto.
- Reprodução: muted, loop, playsInline, poster, preload metadata, autoplay apenas quando visível.

### 4. Galeria editorial

- Título: `Escolhas que mudam o olhar.`
- Texto: `Presença, formato e acabamento em uma seleção real da Vision.`
- Ordem: `1 (1)`, `8 (2)`, `6 (1)`, `5 (2)`, `4 (2)`, `8 (3)`, `3 (1)`, `7 (3)`.
- Desktop: imagem ativa central, anterior e próxima parcialmente visíveis; controles pequenos fora da mídia.
- Mobile: swipe horizontal com laterais visíveis; interação por toque sem botão obrigatório.
- Todas as imagens permanecem no DOM; troca por opacidade e transformação leve.

### 5. Marcas

- Título: `Marcas que passam pela Vision`.
- Texto: `Consulte a disponibilidade dos modelos pelo WhatsApp.`
- Conteúdo: os dez logos inventariados.
- Layout: grid estático, cinco colunas no desktop e duas no mobile.
- Cada slot tem dimensão estável; a escala do logo é ajustada opticamente, sem forçar largura comum.
- Não incluir texto sobre revenda, estoque, autorização ou disponibilidade permanente.

### 6. LAB. DIGITAL

- Selo: `LAB. DIGITAL`.
- Headline: `Lentes feitas pela própria Vision.`
- Texto: `Confecção própria de lentes em Araguaína - TO, com cuidado no acabamento.`
- CTA: `Falar sobre lentes`.
- Mídia: `5 (1).jpg`.
- Desktop: copy e mídia compacta em duas colunas.
- Mobile: copy antes da mídia; CTA permanece junto ao texto.
- A foto é detalhe editorial de lente em uso e não deve ser tratada como registro do processo fabril.

### 7. Notícias

- Selo: `Exame`.
- Título: `Tendências em óculos`.
- Texto: `Matérias sobre moda, consumo e mercado óptico.`
- CTA: `Ver mais na Exame`.
- Desktop: copy com CTA e três cards de matérias reais ao lado ou abaixo, conforme largura útil.
- Mobile: copy e CTA primeiro; cards em rail manual de 260 a 285 px.
- Falha de fonte: manter apenas copy e CTA. Não criar fallback editorial fictício.
- Card sem imagem: versão textual compacta, sem reservar mídia vazia.

### 8. Localização e CTA

- Título: `Escolha seus próximos óculos em Araguaína.`
- Texto: `Fale com a Ótica Vision ou veja a rota até a loja.`
- CTAs: `WhatsApp` e `Ver rota`.
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
3. Vídeo principal `video (2).mp4`.
4. Bio: `Armações nacionais e importadas, LAB. DIGITAL e atendimento em Araguaína - TO.`
5. Botões: `WhatsApp`, `Instagram`, `Rota` e `Site completo`.
6. Vídeos menores: `video (3).mp4` e `video (4).mp4`.
7. Imagens: `1 (2)`, `2 (2)`, `3 (2)`, `4 (1)`, `6 (2)`, `8 (4)`.
8. Localização em Araguaína com link de rota.

### Comportamento

- Mobile: coluna única; principal com largura máxima controlada; vídeos menores lado a lado; imagens em faixa curta com seis itens.
- Desktop: logo e handle centralizados; bloco principal em duas colunas, com vídeo à esquerda e bio, botões e apoios à direita; imagens em faixa curta abaixo.
- Nenhum terceiro vídeo oculto, clone visual carregado ou carrossel infinito.
- Não incluir notícias, seção LAB separada, lista longa ou mais de seis imagens.

## Links oficiais

| Ação | Destino |
|---|---|
| WhatsApp | `https://api.whatsapp.com/send/?phone=5563992231522&text&type=phone_number&app_absent=0&utm_source=ig` |
| Instagram | `https://www.instagram.com/oticavisionaraguaina/` |
| Rota | `https://maps.app.goo.gl/4WeumQSuU4hg6yuv6` |
| Site completo | `/` |

## Dados deliberadamente ausentes

Nenhum bloco poderá introduzir endereço completo, horário, avaliações, depoimentos, promoção, parcelamento, prazo, garantia, exame de vista, certificação, prêmio, disponibilidade permanente ou marca não confirmada.
