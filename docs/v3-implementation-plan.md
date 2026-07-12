# Plano de Implementação V3

Este plano começa somente após aprovação explícita da direção e da curadoria. A versão atual será substituída, não corrigida. Assets, links oficiais e histórico Git permanecem preservados.

## Regras de execução

- Trabalhar uma seção por rodada.
- Antes de cada rodada, reler a documentação V3 relacionada.
- Não reaproveitar layout, componente visual ou CSS da versão rejeitada.
- Não criar `dist`, export estático, `index.html` paralelo ou segunda fonte de deploy.
- Manter Next.js App Router, TypeScript e build padrão da Vercel.
- Não alterar assets originais.
- Não introduzir dado comercial ausente.
- Validar 390×844 durante cada rodada, não apenas no fim da fase.

## Fase 1 — Estrutura, identidade e mídia em movimento

### Rodada 1.1 — Estrutura limpa

- Mapear o que será substituído no código visual atual.
- Manter apenas a estrutura técnica necessária do Next.js, links oficiais e fontes de dados válidas.
- Estabelecer a fonte única em `app/`, `components/`, `styles/`, `lib/` e `public/`.
- Confirmar que não existe configuração paralela de deploy.

### Rodada 1.2 — Design system

- Implementar tokens, tipografia de sistema, containers, foco e regras de redução de movimento.
- Criar somente os estilos globais estruturais necessários.
- Validar contraste e leitura em 360 px e 390 px.

### Rodada 1.3 — VisionButton

- Criar o único componente de botão com variantes primary, secondary e icon.
- Validar ícones, foco, altura mínima e estados sem layout shift.

### Rodada 1.4 — Header

- Implementar logo, Instagram e WhatsApp.
- Confirmar ausência de menu falso, sticky pesado e overflow.

### Rodada 1.5 — Hero

- Implementar copy aprovada e `2 (1).jpg`.
- Ajustar crop em 390×844 e 1440×900, preservando rosto, mão e armação.
- Confirmar que a próxima seção aparece parcialmente na primeira viewport.

### Rodada 1.6 — Seção de vídeos

- Implementar `video (4)`, `video (2)` e `video (3)` na hierarquia definida.
- Usar posters, viewport observer, pausa fora da tela e redução de movimento.
- Auditar quantidade de vídeos, dimensões no DOM e ausência de vídeo oculto.

### Gate da Fase 1

- Screenshot da home em 390×844.
- Screenshot da home em 1440×900.
- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.
- Pausa para aprovação antes da Fase 2.

## Fase 2 — Curadoria estática e conversão final

### Rodada 2.1 — Galeria editorial

- Implementar as oito imagens na ordem aprovada.
- Swipe mobile, controles discretos no desktop e fallback visível sem JavaScript.
- Confirmar que nenhuma troca produz branco e nenhuma seta cobre o rosto.

### Rodada 2.2 — Marcas

- Implementar grid estático com dez slots.
- Ajustar escala óptica individual por logo.
- Validar alinhamento em duas colunas no mobile e cinco no desktop.

### Rodada 2.3 — LAB. DIGITAL

- Implementar a copy aprovada e `5 (1).jpg` em bloco compacto.
- Manter a imagem como acompanhamento editorial, sem sugerir que ela registra o processo de fabricação.

### Rodada 2.4 — Localização e footer

- Implementar WhatsApp e rota oficiais.
- Criar footer mínimo sem endereço, horário ou navegação inventada.

### Gate da Fase 2

- Screenshot da home em 390×844.
- Screenshot da home em 1440×900.
- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.
- Pausa para aprovação antes da Fase 3.

## Fase 3 — Conteúdo remoto, `/instagram` e QA

### Rodada 3.1 — Fonte de notícias

- Auditar o extrator server-side existente apenas como referência técnica, sem reaproveitar código rejeitado sem revisão.
- Implementar extração nova da Exame com revalidate entre 6 e 12 horas.
- Normalizar URL, encoding, categoria, data e imagens remotas.
- Validar falha de fonte sem notícia falsa.

### Rodada 3.2 — Seção de notícias

- Implementar três cards reais no desktop e rail manual no mobile.
- Criar variante textual compacta quando uma matéria não tiver imagem.
- Confirmar que nenhum espaço de mídia vazio é renderizado.

### Rodada 3.3 — `/instagram`

- Implementar a página na ordem aprovada.
- Usar três vídeos e seis imagens, sem repetição dentro da rota.
- Auditar que nenhum vídeo oculto ou mídia 0×0 é carregado.

### Rodada 3.4 — Acessibilidade e performance

- Revisar semântica, alt, aria-label, foco, contraste e teclado.
- Revisar `prefers-reduced-motion`, autoplay observado e lazy loading.
- Revisar dimensões, aspect ratios, layout shift e peso inicial.

### Rodada 3.5 — QA final

- Validar 360×800, 375×812, 390×844, 430×932, 1366×768 e 1440×900.
- Auditar DOM: vídeos 0×0, imagens quebradas, links vazios, alt vazio, mídia invisível, overflow e erros de console.
- Auditar rede: 404, requests desnecessários e falha da fonte de notícias.
- Confirmar fonte única de deploy Next.js e ausência de `dist` manual.

### Gate da Fase 3

- Screenshot da home e do `/instagram` em 390×844.
- Screenshot da home e do `/instagram` em 1440×900.
- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.
- Relatório final e pausa para aprovação de publicação.

## Critérios de pronto

- Zero mídia repetida dentro de cada rota.
- Hero e seção de vídeos usam arquivos diferentes.
- Nenhuma mídia desaparece durante transição.
- Nenhum vídeo invisível, 0×0 ou reproduzindo fora da viewport.
- Nenhum overflow horizontal nos seis breakpoints.
- Nenhum dado inventado.
- Notícias reais ou ausência limpa de cards.
- Logos visualmente normalizados.
- Lint, typecheck e build aprovados.
- Deploy padrão do Next.js, sem saída manual.

## Riscos técnicos

| Risco | Impacto | Tratamento planejado |
|---|---|---|
| Não existe foto real do processo do LAB | A imagem pode parecer genérica ou prometer evidência que não possui | Usar `5 (1).jpg` de forma compacta e editorial; solicitar asset do processo se a seção precisar de maior autoridade visual |
| Três vídeos somam cerca de 24,9 MB na home | Rede móvel e bateria | `preload="metadata"`, poster, observer, pausa fora da viewport e nenhum vídeo duplicado/oculto |
| `video (4)` alterna close e corpo inteiro | Crop pode cortar rosto em algum trecho | Manter 9:16 e priorizar corte inferior; testar quadros extremos |
| Fotos são majoritariamente da mesma modelo | Sequência pode parecer campanha única e repetitiva | Intercalar loja, produto, lente clara e mudanças de cor; limitar a oito fotos na galeria |
| Logos têm canvases e proporções muito diferentes | Grid pode parecer desalinhado | Slots estáveis e escala óptica individual, sem largura forçada |
| Asset Dolce & Gabbana tem resolução menor | Pode serrilhar em tela grande | Limitar escala e validar em 1440 px |
| Scraping da Exame é dependência externa | Mudança de markup ou bloqueio pode remover cards | Extração resiliente, cache, URL normalizada e fallback sem cards falsos |
| Imagens remotas das notícias variam por domínio | Otimização pode falhar se a política for rígida | Configurar somente hosts observados e manter variante textual sem mídia |
| Não há fonte licenciada local | Uma fonte remota pode adicionar latência ou dependência | Começar com pilha de sistema; qualquer nova fonte exige aprovação explícita |
| Código visual V2 ainda está no branch | Risco de patch incremental e resíduos visuais | Na Fase 1, substituir a camada visual por seção, preservando apenas contratos técnicos aprovados |

## Dúvidas bloqueadoras

Nenhuma dúvida impede a conclusão desta etapa de planejamento. Antes de iniciar a Fase 1, a aprovação deve confirmar duas decisões visuais: `2 (1).jpg` como hero e o uso compacto de `5 (1).jpg` no LAB na ausência de uma foto real do processo.
