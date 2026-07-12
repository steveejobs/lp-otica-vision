# Direção Visual V3

## Conceito

**Editorial quente com precisão metálica.**

A V3 deve parecer uma peça editorial feita para a Ótica Vision: humana no uso das fotos, precisa nos detalhes e comercial nos caminhos de contato. O efeito premium vem da curadoria, da escala controlada e do contraste entre papel quente e metal frio, não de excesso de efeitos.

## Princípios

1. **A pessoa vem antes da interface.** Rosto, olhos e armação permanecem legíveis; controles nunca cobrem o produto.
2. **Uma mídia forte por capítulo.** O hero tem uma foto, a seção de vídeos tem um principal, a galeria tem uma imagem ativa e o LAB tem um detalhe compacto.
3. **Calor na base, precisão no acabamento.** Off-white e champagne formam o ambiente; aço e grafite definem bordas, foco e hierarquia.
4. **Ritmo curto.** Cada seção tem uma função comercial e termina antes de se tornar cenário vazio.
5. **Conversão sem ruído.** WhatsApp, Instagram e rota aparecem onde ajudam a decisão, sem chips, barras de prova ou CTAs repetidos em todo bloco.

## Personalidade visual

- Elegante, humana e direta.
- Editorial sem parecer revista inacessível.
- Comercial sem parecer catálogo.
- Precisa sem parecer clínica.
- Visual sem depender de efeitos frágeis.
- Local sem inventar endereço, horário ou prova social.

## Paleta e função

| Papel | Cor | Uso |
|---|---|---|
| Papel principal | `#fbf8f3` | Fundo dominante, leitura e continuidade |
| Fundo quente | `#f4eee6` | Alternância discreta entre seções |
| Bege Vision | `#b19475` | Área curta, detalhe ou apoio; nunca em toda a página |
| Champagne | `#c7ad8e` | Botões, linhas internas e pequenos brilhos |
| Aço claro | `#d9dde1` | Bordas, controles e acabamento metálico |
| Aço escuro | `#8f969d` | Ícones, estados e contraste secundário |
| Grafite | `#191614` | Títulos e texto principal |
| Texto secundário | `#74675d` | Apoio com contraste verificado |
| Bronze | `#7a6049` | Detalhe pontual e estado ativo |

O vermelho da foto do hero é um acento editorial da mídia, não uma nova cor de interface. A UI ao redor deve permanecer contida para não competir com ele.

## Tipografia

- Títulos: serif editorial de contraste moderado, peso 500 a 600.
- Corpo e controles: sans humanista, peso 400 a 600.
- H1 com largura controlada e quebra deliberada; sem peso 800/900.
- Nenhum título deve depender de tamanho extremo para ter presença.
- Letter spacing neutro.
- Em 360 px, o H1 deve ocupar no máximo quatro linhas e nenhum botão pode quebrar o rótulo.
- Não há fonte licenciada no repositório. A implementação deve começar com uma pilha de sistema ou aguardar aprovação explícita de fonte; nenhuma fonte remota é presumida nesta etapa.

## Composição

- Container desktop: até 1320 px, ocupando aproximadamente 88% da viewport.
- Container mobile: aproximadamente 92% da viewport.
- Grid desktop assimétrico, com copy menor que a mídia no hero e no LAB.
- Alinhamentos alternam de forma deliberada, mas títulos mantêm uma linha vertical reconhecível.
- Seções não recebem moldura de card; apenas mídias, notícias e controles têm contorno próprio.
- Raios discretos, de 6 a 8 px, usados somente onde há uma superfície real.
- Espaço vertical moderado: 72–112 px no desktop e 56–80 px no mobile, conforme densidade.

## Mídia

- Hero: `2 (1).jpg`, em painel vertical, sem slideshow.
- Vídeos: proporção nativa 9:16; nenhum vídeo encaixado em palco horizontal.
- Galeria: todas as imagens permanecem montadas durante a transição; a ativa ganha opacidade e escala, as laterais permanecem parcialmente visíveis.
- LAB: `5 (1).jpg` em escala compacta. A imagem acompanha o tema de lentes, mas não representa o processo de fabricação.
- Imagens abaixo da dobra usam carregamento tardio; dimensões ou `aspect-ratio` reservam espaço antes do carregamento.
- Posters são obrigatórios nos vídeos.

## Logo

- Usar a versão transparente.
- O halo fica atrás e ligeiramente abaixo do metal, com borda totalmente dissolvida.
- O halo serve apenas para separar a logo do fundo; não vira mancha nem círculo visível.
- O wrapper precisa permitir overflow do halo e manter isolamento de camada.
- A logo não disputa escala com o H1 nem se repete em excesso na mesma viewport.

## Botões e controles

- Um único sistema de botão para toda a V3.
- Superfície champagne translúcida, borda de aço e brilho interno discreto.
- Ícone à esquerda quando houver ícone reconhecível.
- Altura mínima de 44 px no mobile.
- Foco visível, contraste suficiente e estado hover sem alterar dimensões.
- Sem botão preto sólido, seta decorativa ou emoji.
- Controles da galeria, quando visíveis no desktop, ficam fora da imagem e não cobrem rostos.

## Motion

A V3 terá somente dois sistemas:

1. Entrada suave de seção, com opacidade e pequeno deslocamento vertical. O conteúdo começa visível e a animação é aprimoramento progressivo.
2. Movimento de mídia: transição da galeria e reprodução observada dos vídeos.

Regras:

- Duração entre 500 e 800 ms para entrada editorial.
- Easing suave, com desaceleração na entrada.
- Sem scroll-jacking, parallax, indicador de progresso ou animação contínua decorativa.
- `prefers-reduced-motion` desativa deslocamentos e autoplay.
- A galeria nunca remove a imagem anterior antes de a próxima estar pronta.
- Nenhuma seção depende de JavaScript para ficar visível.

## Direção por seção

| Seção | Direção de arte |
|---|---|
| Header | Linha leve, logo pequena e dois caminhos reais; sem navegação institucional inventada |
| Hero | Copy à esquerda e foto vermelha à direita no desktop; fluxo vertical no mobile; logo integrada sem virar segundo título |
| Vídeos | Conjunto centralizado e compacto; principal acima, dois apoios abaixo; fundo neutro sem palco gigante |
| Galeria | Foco central, laterais parciais, profundidade sutil; sem legenda em cada foto |
| Marcas | Grid de slots iguais, logos com escala óptica individual; nenhuma afirmação de estoque |
| LAB | Faixa curta com copy e detalhe de lente; precisão no alinhamento, não em selos técnicos |
| Notícias | Copy curta e três matérias reais; falha da fonte reduz a seção à copy e ao link da Exame |
| Localização | Encerramento claro, dois CTAs e nenhum mapa pesado |
| Footer | Logo ou nome, Instagram e direitos essenciais; sem sitemap fictício |
| `/instagram` | Página concentrada, centrada no conteúdo e nos quatro links oficiais |

## Anti-template

- Sem hero genérico com selo, chip ou estatística.
- Sem card branco para cada frase.
- Sem faixa de benefícios.
- Sem gradiente artificial de fundo.
- Sem alternância mecânica de blocos idênticos.
- Sem múltiplos carrosséis.
- Sem texto técnico sobre fabricação que os dados não sustentem.
- Sem tipografia enorme usada para compensar falta de conteúdo.

## Decisões vindas das referências de UX

A referência complementar de UX reforçou mobile-first, contraste, foco visível, limite de um ou dois movimentos relevantes, respeito a `prefers-reduced-motion` e prevenção de overflow horizontal. Recomendações genéricas de azul/laranja, tipografia 900, whitespace massivo e narrativa com indicador de progresso foram rejeitadas por conflitarem com a marca e com o briefing local.
