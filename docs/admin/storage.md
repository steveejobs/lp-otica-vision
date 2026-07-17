# Storage de imagens — Fases 1 e 2

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

O catálogo público futuro deve chamar `createPublishedImageUrl`. O utilitário confirma no banco que produto, galeria/item ou destaque estão publicados e somente então cria uma URL assinada entre 60 e 3.600 segundos.

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

`createPublishedImageUrl` também cobre logo de marca ativa e capa de coleção vigente. A checagem de publicação ocorre antes da assinatura e a expiração permitida é de 60 a 3.600 segundos.
