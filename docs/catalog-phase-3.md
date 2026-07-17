# Catálogo público — Fase 3

## Escopo

A Fase 3 cria uma vitrine comercial administrável em `/catalogo` e páginas de produto em `/catalogo/[slug]`. Não existe carrinho, checkout, pagamento, frete, reserva automática, cadastro público, estoque quantitativo ou promessa de disponibilidade.

Somente produtos publicados, não arquivados, com capa completa e taxonomias vinculadas ativas entram no catálogo, sitemap, metadata, JSON-LD, links internos e preview da home. Fixtures são temporárias e precisam estar ausentes no preview final.

## Arquitetura de leitura

- Server Components fazem a leitura pública com um cliente Supabase anônimo sem cookies.
- `search_catalog_products` aplica busca, filtros e paginação no PostgreSQL, com limite de 24 produtos por página.
- A busca normaliza maiúsculas e acentos e cobre nome, SKU, modelo, cor e marca.
- `catalog_filter_options` retorna somente marcas, categorias, coleções e estados com ao menos um produto publicado.
- A URL é a fonte de verdade dos filtros (`marca`, `categoria`, `disponibilidade`, `colecao`, `busca` e `pagina`), preservando recarregar, compartilhar e voltar/avançar.
- Na opção “Todas”, os resultados são organizados em capítulos por marca. Com uma marca selecionada, o grid vira uma composição contínua.

## Home e motion

A home consulta no máximo seis produtos `featured = true`, publicados e com capa válida. Quando não há produto elegível, a seção não é renderizada e o restante da landing permanece intacto.

O rail editorial usa duas sequências iguais para loop contínuo. A cópia semântica é a primeira; clones têm `aria-hidden` e links fora da ordem de tabulação. O autoplay pausa durante interação, fora da viewport e com a aba oculta, retoma suavemente e é desativado por `prefers-reduced-motion`. Drag, swipe, teclado e um controle explícito de pausa continuam disponíveis conforme o contexto.

## Página de produto e WhatsApp

A página mostra apenas campos cadastrados: imagens ordenadas, marca, nome, modelo, cor, descrição curta, SKU, disponibilidade qualitativa e preço conforme `price_visibility`. A galeria usa scroll snap nativo, swipe e teclado, reserva proporção e carrega a imagem seguinte sem baixar agressivamente toda a sequência.

O WhatsApp contextual inclui nome, SKU, marca/modelo/cor quando existentes e URL canônica. O texto pede confirmação de disponibilidade e nunca afirma estoque ou reserva. O evento `product_whatsapp_click` é enviado antes da navegação externa, sem telefone ou conteúdo pessoal.

## Imagens privadas

`/api/catalogo/imagem/[id]` é o único caminho público para imagens de produto. O endpoint recebe um UUID de registro, consulta sua relação com um produto publicável, valida caminho, MIME e assinatura binária e só então lê o bucket privado no servidor. O visitante não consegue fornecer um `storage_path` arbitrário.

A query `v`, derivada de `product_images.updated_at`, versiona a URL. Arquivos válidos recebem `Cache-Control: public, max-age=31536000, immutable`, `ETag` e `nosniff`. Falha transitória do Storage recebe fallback não branco; rascunho, imagem sem relação válida ou UUID arbitrário recebe 404. Nenhuma chave secreta ou URL assinada curta é exposta ao cliente.

## Cache e revalidação

Consultas editoriais usam a tag `catalog-public-v1` com revalidação de cinco minutos. Server Actions autorizadas de produtos, imagens, disponibilidade, marcas, categorias e coleções chamam `revalidatePublicCatalog`, que invalida a tag e as rotas `/`, `/catalogo`, `/catalogo/[slug]` e `/sitemap.xml`.

## SEO

- metadata própria e canonical em `/catalogo`;
- title, description, canonical, Open Graph e Twitter dinâmicos por produto;
- JSON-LD `Product` somente com campos reais;
- `Offer` somente quando o preço está visível e cadastrado, sem disponibilidade inventada;
- nenhum review, rating ou dado comercial ausente;
- sitemap obtido por RPC que retorna exclusivamente produtos publicáveis.

## Analytics e abuso

Eventos relevantes: `product_view`, `product_whatsapp_click`, `catalog_search`, `catalog_filter` e `collection_view`. O endpoint valida origem, tamanho, tipo e metadata permitida. Não armazena IP em claro, e-mail, telefone, mensagem ou conteúdo pessoal.

O rate limit é distribuído no PostgreSQL. Uma impressão HMAC efêmera combina sinais técnicos da requisição, uma janela curta e um segredo server-only; a tabela de contadores fica no schema `private`. O limite aceita tráfego normal e agrega abuso entre instâncias, sem depender de serviço pago.

O ADM expõe para admin uma visão simples por 7, 30 ou 90 dias: produtos mais vistos, cliques no WhatsApp, taxa aproximada, marcas, buscas e filtros. Editor e atendente não acessam a tela nem a RPC.

## Limitações assumidas

- não há página dedicada de coleção ou marca; os parâmetros compartilháveis evitam duplicar a lógica;
- o proxy entrega o original responsivo; transformação derivada no servidor fica para uma próxima fase;
- analytics é operacional e aproximado, sem atribuição de campanha;
- sem produtos reais publicados, o catálogo permanece em estado vazio e o preview da home é omitido;
- o preview criado nesta fase não é promoção para produção.
