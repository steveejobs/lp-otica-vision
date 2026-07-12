# Wireframes Textuais V3

As alturas são aproximações para orientar ritmo e enquadramento. Elas não são alturas fixas e devem crescer quando o conteúdo ou a acessibilidade exigir.

## Home — 390×844

| Seção | Altura aprox. | Colunas | Copy e mídia | Proporção | Espaçamento e comportamento |
|---|---:|---:|---|---|---|
| Header | 68 px | 3 áreas | Logo à esquerda; Instagram e WhatsApp à direita | Logo aprox. 88×42 | 12 px entre ações; sem sticky pesado |
| Hero | 690–740 px | 1 | Linha, H1, texto e CTAs; foto abaixo e levemente deslocada à direita | Foto 4:5, largura 78–84% do container | 20–28 px entre grupos; termina mostrando o início da próxima seção |
| Vídeos | 880–960 px | 1 + 2 | Título central; principal central; dois apoios abaixo | Principal 9:16 com 286–310 px de largura; apoios 9:16 com 145–158 px | 24 px copy/mídia; 10–12 px entre apoios; nenhum rail se couber em 390 px |
| Galeria | 580–640 px | 1 foco | Copy acima; imagem central e laterais parciais | Ativa 3:4, largura 76–82vw | 28 px até a mídia; swipe; viewport interna corta laterais sem gerar overflow da página |
| Marcas | 430–480 px | 2 | Título e texto acima; grid abaixo | Slots 112×56 | 12 px horizontal e 16 px vertical; cinco linhas estáveis |
| LAB | 560–620 px | 1 | Selo, headline, texto e CTA; imagem abaixo | Imagem 4:5, largura 78–86% | 20 px entre copy e CTA; 28 px antes da mídia |
| Notícias | 560–650 px | 1 + rail | Copy e CTA; cards abaixo | Cards 270×aprox. 360; imagem 16:10 quando existir | Rail manual com gap 14 px e scroll padding; sem translate negativo |
| Localização | 360–420 px | 1 | Título, texto e dois CTAs empilhados ou 2×1 quando couber | Sem mídia | 16 px entre CTAs; padding vertical 64–72 px |
| Footer | 92–116 px | 1 | Nome/logo e Instagram | Sem mídia | Conteúdo em uma ou duas linhas, sem links extras |

### Fluxo mobile da home

```text
[ logo | Instagram | WhatsApp ]

Ótica Vision · Araguaína - TO
Armações que fazem sentido
no rosto — e na rotina.
Texto
[ WhatsApp ] [ Instagram ]
                [ FOTO HERO 4:5 ]

No rosto, na luz, no detalhe.
           [ VÍDEO PRINCIPAL 9:16 ]
       [ APOIO 9:16 ] [ APOIO 9:16 ]

Escolhas que mudam o olhar.
 [ anterior ][ ATIVA 3:4 ][ próxima ]

Marcas que passam pela Vision
[ logo ][ logo ]
[ logo ][ logo ] × 5 linhas

LAB. DIGITAL
Lentes feitas pela própria Vision.
[ Falar sobre lentes ]
             [ FOTO 4:5 ]

Tendências em óculos
[ Ver mais na Exame ]
[ CARD ][ próximo parcial ]

Escolha seus próximos óculos em Araguaína.
[ WhatsApp ]
[ Ver rota ]

[ footer mínimo ]
```

## Home — 1440×900

| Seção | Altura aprox. | Colunas | Copy e mídia | Proporção | Espaçamento e comportamento |
|---|---:|---:|---|---|---|
| Header | 80–88 px | 3 áreas | Logo à esquerda; ações à direita | Logo aprox. 116×54 | Container até 1320 px; ações com 16 px de gap |
| Hero | 620–670 px | 5/7 | Copy na esquerda; foto vertical na direita | Foto entre 420×525 e 450×600 | Gap 64–88 px; base do hero deixa 80–120 px da próxima seção visível na viewport inicial |
| Vídeos | 720–780 px | Conjunto central | Copy acima; principal; dois apoios abaixo | Principal 360–400×640–711; apoios 170–190×302–338 | Conjunto total 720–820 px; 16 px entre apoios |
| Galeria | 650–720 px | 3 planos | Copy acima/à esquerda; ativa central, laterais de apoio | Ativa 360–420×480–560 | Gap visual 20–28 px; controles fora da imagem; sem rotação exagerada |
| Marcas | 320–370 px | 5 | Copy acima; duas linhas de logos | Slots 132×64 | 20–28 px entre slots; alinhamento óptico individual |
| LAB | 500–560 px | 6/5 | Copy na esquerda; imagem compacta na direita | Imagem 360–400×450–500 | Gap 72–96 px; CTA diretamente após o texto |
| Notícias | 500–560 px | 3/9 | Copy e CTA em coluna curta; três cards no restante | Cards flexíveis; imagem 16:10 | Gap 24 px; botão nunca ocupa a coluna dos cards |
| Localização | 340–400 px | 7/5 | Título/texto à esquerda; CTAs à direita ou abaixo | Sem mídia | Alinhamento vertical central; área quente curta |
| Footer | 96–120 px | 2 | Marca à esquerda; Instagram à direita | Sem mídia | Linha superior discreta; sem sitemap |

### Fluxo desktop da home

```text
[ LOGO ]                                      Instagram [ WhatsApp ]

[ linha / H1 / texto / CTAs       ][ FOTO HERO vertical ]

                  [ título + texto ]
                  [ VÍDEO PRINCIPAL ]
                 [ apoio ] [ apoio ]

[ título + texto ]
      [ anterior ][ IMAGEM ATIVA ][ próxima ]

[ título + texto ]
[ logo ][ logo ][ logo ][ logo ][ logo ]
[ logo ][ logo ][ logo ][ logo ][ logo ]

[ LAB copy + CTA                ][ foto de lente ]

[ Exame copy + CTA ][ card ][ card ][ card ]

[ localização copy                         ][ CTAs ]
[ footer ]
```

## `/instagram` — 390×844

| Bloco | Altura aprox. | Colunas | Posição | Proporção | Espaçamento e comportamento |
|---|---:|---:|---|---|---|
| Identidade | 120–145 px | 1 | Logo e handle centralizados | Logo aprox. 126×64 | Halo discreto; 10 px até o handle |
| Vídeo principal | 540–590 px | 1 | Centralizado | 9:16, largura 304–326 px | Sem faixa lateral; rosto no terço superior |
| Bio e botões | 300–360 px | 1 | Bio central; quatro botões em coluna | Sem mídia | 12 px entre botões; largura total do container |
| Vídeos menores | 290–320 px | 2 | Lado a lado | 9:16, 150–160 px cada | Gap 10–12 px; nenhum terceiro vídeo oculto |
| Imagens | 210–250 px | Rail curto | Seis imagens em faixa manual | 3:4, largura 132–146 px | Gap 10 px; sem clone infinito |
| Localização | 190–240 px | 1 | Texto e botão de rota | Sem mídia | Encerramento compacto e centralizado |

### Fluxo mobile do `/instagram`

```text
        [ LOGO ]
@oticavisionaraguaina

 [ VÍDEO PRINCIPAL 9:16 ]

Bio
[ WhatsApp ]
[ Instagram ]
[ Rota ]
[ Site completo ]

[ VÍDEO 9:16 ][ VÍDEO 9:16 ]

[ img ][ img ][ img → ]  seis no total

Araguaína - TO
[ Rota ]
```

## `/instagram` — 1440×900

| Bloco | Altura aprox. | Colunas | Posição | Proporção | Espaçamento e comportamento |
|---|---:|---:|---|---|---|
| Identidade | 140–170 px | 1 | Logo e handle centralizados | Logo aprox. 150×76 | 12 px entre logo e handle |
| Conteúdo principal | 650–700 px | 5/7 | Vídeo principal à esquerda; bio, botões e dois vídeos menores à direita | Principal 360×640; menores 188–205×334–364 | Gap 48–64 px entre colunas; botões em grid 2×2 acima dos apoios |
| Imagens | 260–310 px | 6 | Faixa estática ou rail contido com seis imagens | 3:4, 145–170 px | 14–18 px entre itens; todos os seis visíveis ou acessíveis sem loop |
| Localização | 210–260 px | 2 | Texto à esquerda; rota à direita | Sem mídia | Container máximo de 900–1040 px |

### Fluxo desktop do `/instagram`

```text
                       [ LOGO ]
                @oticavisionaraguaina

          [ VÍDEO       ][ bio                   ]
          [ PRINCIPAL    ][ WhatsApp | Instagram ]
          [ 9:16         ][ Rota | Site completo ]
          [              ][ vídeo | vídeo         ]

          [ img ][ img ][ img ][ img ][ img ][ img ]

          [ Araguaína - TO                 ][ Rota ]
```

## Regras responsivas comuns

- Nenhuma seção pode criar overflow horizontal na página.
- Rails usam overflow apenas no próprio componente e respeitam scroll padding.
- Texto nunca é sobreposto à mídia.
- As dimensões dos cards e slots ficam estáveis durante hover, carregamento e troca de conteúdo.
- Em 360 px, os dois vídeos menores podem reduzir até 144 px; abaixo disso, vira rail curto em vez de esmagar o conteúdo.
- Em 1440 px, o conteúdo não se estende além de 1320 px e a mídia não cresce para preencher espaço sem função.
