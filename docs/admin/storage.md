# Storage de imagens — Fase 1

## Buckets

| Bucket | Caminho | Uso |
| --- | --- | --- |
| `catalog-products` | `{product_id}/{uuid}.{ext}` | imagens de produto |
| `site-galleries` | `{gallery_id}/{uuid}.{ext}` | galerias editoriais |
| `promotions` | `{promotion_id}/{uuid}.{ext}` | destaques e promoções |

Os três buckets são privados, têm limite de 8 MiB e aceitam somente `image/jpeg`, `image/png`, `image/webp` e `image/avif`.

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

## Exclusão

Objetos devem ser removidos pela API de Storage, e não por `delete` direto em `storage.objects`, para que o arquivo físico seja removido. A Fase 2 deverá coordenar a remoção do objeto e do registro de metadados, com tratamento explícito de falha parcial.

## Publicação

O campo `storage_path` é a referência persistida. URLs públicas permanentes não são armazenadas. Essa decisão evita que um registro despublicado continue acessível por um endereço público conhecido.
