# Storage de imagens — Fases 1 a 3

## Buckets

| Bucket | Caminho | Uso |
| --- | --- | --- |
| `brand-logos` | `{brand_id}/{uuid}.{ext}` | logos de marca |
| `catalog-products` | `{product_id}/{uuid}.{ext}` | imagens de produto |
| `site-galleries` | `{entity_id}/{uuid}.{ext}` | capas de coleção e galerias editoriais |
| `promotions` | `{promotion_id}/{uuid}.{ext}` | destaques e promoções |

Os quatro buckets são privados, têm limite de 8 MiB e aceitam somente `image/jpeg`, `image/png`, `image/webp` e `image/avif`.

## Permissões

- admin/editor ativo: leitura, upload, atualização e exclusão;
- atendente ativo: somente leitura administrativa;
- anônimo: sem acesso direto ao objeto.

O catálogo público não acessa o Storage diretamente e não recebe URL assinada curta no HTML. Imagens de produto são servidas por `/api/catalogo/imagem/[id]`, onde `id` é o UUID do registro de `product_images`, nunca um caminho escolhido pelo visitante.

## Validação server-side

`uploadManagedImage` exige papel admin/editor e valida:

- UUID do registro pai;
- tamanho máximo de 8 MiB;
- MIME permitido;
- assinatura binária compatível com JPEG, PNG, WebP ou AVIF;
- nome novo gerado por `crypto.randomUUID()`;
- caminho compatível com a política SQL.

SVG, HTML, scripts, executáveis, MIME divergente e nomes fornecidos diretamente pelo usuário são rejeitados.

## Exclusão e substituição

Objetos são removidos pela API de Storage, e não por `delete` direto em `storage.objects`. As Server Actions coordenam banco e arquivo com compensação: restauram o registro se a remoção falhar, apagam o novo objeto se a gravação do banco falhar e revertem a substituição se o objeto antigo não puder ser removido.

## Publicação

O campo `storage_path` é a referência persistida. URLs públicas permanentes não são armazenadas. Essa decisão evita que um registro despublicado continue acessível por um endereço público conhecido.

O Route Handler público repete as seguintes verificações antes de baixar o objeto com credencial server-only:

1. o identificador recebido é um UUID válido;
2. o registro de imagem existe e pertence ao produto consultado;
3. o produto está publicado, não está arquivado e possui marca/categoria ativas quando vinculadas;
4. o caminho persistido começa exatamente pelo UUID do produto e possui extensão permitida;
5. o MIME do download e a assinatura binária são compatíveis com JPEG, PNG, WebP ou AVIF.

Uma versão derivada de `updated_at` compõe a URL usada pelo Next Image. Respostas válidas recebem cache público imutável e `ETag`; o identificador continua sendo revalidado no primeiro acesso de cada versão. Falha transitória do Storage retorna uma imagem PNG bege controlada, nunca uma área branca. Registro ausente, rascunho ou UUID arbitrário recebe 404.

O ADM continua usando URLs assinadas curtas exclusivamente em páginas administrativas protegidas. A chave secreta fica em módulos `server-only` e não é enviada ao navegador.
