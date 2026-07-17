# Fase 4 — validação técnica do catálogo

Data: 17 de julho de 2026

Commit-base da Fase 3: `486fc336166ff1164ffb41305c7c4a66576ab710`

## Estado desta rodada

A camada técnica da Fase 4 foi validada contra o build local de produção. Os produtos, marcas e categorias usados nos testes eram fixtures identificadas como QA, criadas com imagens editoriais já existentes no repositório e removidas automaticamente ao final da execução. Eles não representam o catálogo comercial da Ótica Vision.

O banco terminou a rodada com exatamente um administrador ativo, nenhum produto de QA e nenhum upload temporário. Nenhum deploy, alias ou ambiente de produção foi alterado. O preview comercial ainda não foi criado porque não há uma fonte confirmada de inventário real no repositório ou no banco.

## Pipeline de imagens

Cada upload é enviado diretamente para um bucket privado por token assinado e de curta duração. A finalização acontece no servidor uma única vez: valida assinatura e dimensões, corrige orientação, remove metadata, cria o master normalizado e persiste cinco derivados. Nenhuma transformação pesada ocorre no proxy público.

| Uso | Limite | Formato | Qualidade |
| --- | --- | --- | --- |
| Miniatura do ADM | 320 × 400 | WebP | 82 |
| Card do catálogo | 720 × 900 | WebP | 86 |
| Preview da home | 800 × 1000 | WebP | 87 |
| Página de produto | 1200 × 1600 | WebP | 88 |
| Open Graph | 1200 × 1200 | JPEG | 88 |

O master privado é limitado a 2400 × 2400 em WebP com qualidade 92. O banco registra largura, altura, MIME, tamanho, ETag, caminho, versão e placeholder blur. Exclusão e substituição removem master e derivados, com compensação de falhas para evitar órfãos.

### Amostra medida

| Arquivo | Imagem 1 | Imagem 2 |
| --- | ---: | ---: |
| Fonte recebida | parte de 1.259.138 B no total | parte de 1.259.138 B no total |
| Master privado | 515.364 B | 471.396 B |
| Miniatura do ADM | 19.140 B | 14.282 B |
| Card do catálogo | 91.312 B | 62.526 B |
| Preview da home | 112.642 B | 79.726 B |
| Página de produto | 243.348 B | 183.268 B |
| Open Graph | 205.708 B | 174.548 B |

O total armazenado para os dois masters e todos os usos foi 2.449.992 B. O ganho relevante é por entrega: um card recebe 62–91 KB e a página de produto recebe 183–243 KB, não o master nem o original de vários megabytes.

## Cache e segurança de entrega

O proxy aceita apenas IDs e variantes públicas conhecidas, consulta somente produtos publicados com capa válida e valida o caminho privado antes do download. A resposta inclui `Content-Type`, `Content-Length`, `ETag`, `X-Content-Type-Options: nosniff`, CSP de sandbox e política de cache imutável para a versão do asset. `If-None-Match` retorna `304` sem corpo. Falhas controladas usam fallback local; rascunhos, miniaturas administrativas e caminhos arbitrários retornam `404`.

## Resultado automatizado

- Fluxo funcional e responsivo: **59/59** cenários aprovados.
- Papéis, RLS e Storage: **7/7** cenários aprovados.
- Viewports: 360×800, 375×812, 390×844, 412×915, 430×932, 768×1024, 1366×768 e 1440×900.
- Sem overflow de documento, erros de console ou erros de página.
- Lint: aprovado.
- Typecheck: aprovado.
- Build: aprovado.
- Migrations: 13 locais e remotas sincronizadas.
- Bundle cliente: zero ocorrência do segredo, zero ocorrência do nome da chave sensível e zero source map público.

Os relatórios estruturados estão em `phase4-results.json` e `phase4-security-results.json`.

## Desempenho mobile

Medições em 390×844, build de produção local e perfil de rede móvel lenta:

| Página | LCP | CLS | Requests | Transferido | Imagens | JavaScript | Heap JS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Catálogo | 3.944 ms | 0 | 31 | 235.054 B | 0 B | 163.118 B | 6.100.124 B |
| Produto | 3.488 ms | 0 | 24 | 562.281 B | 335.260 B | 172.241 B | 8.376.490 B |

Não houve downloads duplicados. A galeria carrega inicialmente apenas a imagem ativa; imagens adicionais usam o blur persistido até a interação. O preview da home não bloqueia o hero, pausa fora da viewport, respeita `prefers-reduced-motion` e retoma após a interação.

## Evidências

Screenshots:

- `catalog-mobile-390x844.png`
- `catalog-desktop-1440x900.png`
- `catalog-brand-filter-390x844.png`
- `catalog-search-390x844.png`
- `product-mobile-390x844.png`
- `product-desktop-1440x900.png`
- `home-preview-390x844.png`
- `home-preview-1440x900.png`
- `admin-product-390x844.png`
- `admin-images-390x844.png`

Gravação: `phase4-interactions.webm`.

## Pendência para o preview

Ainda são necessários dados comerciais confirmados e suas imagens: 3–5 marcas, categorias, 10–20 produtos, SKU, nomes, campos factuais disponíveis, relação imagem/SKU e indicação dos 5–6 destaques. Campos desconhecidos permanecerão vazios; preço só será cadastrado com autorização e a disponibilidade inicial será `consultation`.
