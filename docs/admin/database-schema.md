# Schema do banco — Fases 1 a 3

As migrations SQL em `supabase/migrations` são a fonte da verdade. O schema remoto não deve ser alterado manualmente sem que a mudança equivalente seja versionada.

## Migrations

1. `20260717005857_phase1_core_schema.sql`: tipos, tabelas, FKs, constraints, índices e triggers de `updated_at`/perfil.
2. `20260717005902_phase1_security_rls_audit.sql`: funções de papel, grants, RLS, escopo do atendente e auditoria.
3. `20260717005905_phase1_storage.sql`: buckets privados e políticas de objetos.
4. `20260717030000_phase2_admin_operations.sql`: arquivamento, metadados completos de mídia, proteção do último admin, validação de publicação, RPCs atômicas de ordem e bucket de logos.
5. `20260717030500_phase2_media_integrity.sql`: SKU sem diferenciar caixa, limites de campos e triggers diferidos que preservam mídia mínima de conteúdo publicado.
6. `20260717060000_phase3_analytics_event_types.sql`: eventos `catalog_search` e `catalog_filter`.
7. `20260717060500_phase3_public_catalog.sql`: busca pública, opções de filtro, sitemap, índices de catálogo, validação editorial, analytics agregado e rate limit distribuído.
8. `20260717061000_phase3_product_price_integrity.sql`: preço obrigatório quando a visibilidade é `visible`.
9. `20260717061500_phase3_attendant_search_document.sql`: mantém a alteração rápida do atendente compatível com a coluna de busca gerada, sem ampliar os campos editáveis.
10. `20260717062000_phase3_audit_function_volatility.sql`: declara corretamente como `stable` a rotina recursiva de mascaramento apontada pelo lint do banco.

## Tabelas

| Tabela | Função | Exclusão relacionada |
| --- | --- | --- |
| `profiles` | perfil, papel e ativação de usuários do Auth | cascata ao excluir `auth.users` |
| `brands` | marcas validadas | produto impede exclusão da marca em uso |
| `categories` | taxonomia do catálogo | produto impede exclusão da categoria em uso |
| `products` | dados centrais do produto | imagens e relações editoriais em cascata |
| `product_images` | imagens, capa, ordem e posição | cascata com produto |
| `collections` | coleções editoriais e janela de publicação | relações em cascata |
| `collection_products` | produtos e ordem dentro da coleção | cascata dos dois lados |
| `galleries` | galerias genéricas por `route_key` | itens em cascata |
| `gallery_items` | imagens, série visual, ordem e posições mobile/desktop | cascata com galeria |
| `promotions` | promoção, destaque, lançamento ou coleção | relações em cascata |
| `promotion_products` | produtos relacionados ao destaque | cascata dos dois lados |
| `analytics_events` | eventos anônimos limitados | referências de conteúdo viram `null` |
| `audit_logs` | antes/depois de mutações administrativas | ator pode virar `null` |
| `site_settings` | configurações JSON centralizadas | autor pode virar `null` |

## Tipos controlados

- papel: `admin`, `editor`, `attendant`;
- preço no cadastro comum: `visible` ou `consult`; `hidden` permanece apenas como valor legado do enum e não pode ser persistido em produto;
- disponibilidade no cadastro comum: `available`, `last_unit`, `unavailable`; `consultation` permanece apenas como valor legado do enum e não pode ser persistido em produto;
- destaque: `promotion`, `highlight`, `launch`, `collection`;
- analytics: `page_view`, `product_view`, `product_whatsapp_click`, `collection_view`, `promotion_view`, `promotion_click`, `gallery_interaction`, `catalog_search`, `catalog_filter`.

`products.availability_status` começa em `available`. Não existe quantidade de estoque. Registros legados em `consultation` são normalizados para `available` pela migration de simplificação da vitrine.

## Integridade

- `slug` é único e SKU é único sem diferenciar maiúsculas/minúsculas;
- `galleries.route_key` é único;
- uma constraint parcial permite somente uma imagem com `is_cover = true` por produto;
- janelas de publicação não aceitam fim anterior ao início;
- preço definido exige valor positivo; “Sob consulta” limpa o preço; dimensões e ordens não aceitam valores negativos;
- metadados de analytics precisam ser objeto JSON e ter no máximo 4 KiB;
- FKs impedem órfãos e usam `restrict`, `cascade` ou `set null` conforme a relação.
- produto arquivado é despublicado e não pode aparecer para anônimo;
- produto publicado exige capa completa, e galeria publicada exige ao menos um item publicado completo;
- produto em destaque exige publicação, e preço visível exige valor cadastrado;
- marca ou categoria vinculada a produto publicado não pode ser desativada silenciosamente;
- o último administrador ativo não pode ser removido ou desativado no banco;
- RPCs de ordem validam a sequência inteira e impedem a quebra silenciosa de séries visuais.

## Índices

Além dos índices de PK/unique, existem índices para publicação, destaque, marca, categoria, disponibilidade, relações de imagem, série visual, datas de destaque, eventos e auditoria. A Fase 3 adiciona documento de busca normalizado sem acentos, GIN trigram e índices parciais para a vitrine publicada. A migration mantém os nomes explícitos para revisão e diagnóstico.

## Datas e autoria

Uma função reutilizável atualiza `updated_at`. Produtos recebem `created_by` e `updated_by` do usuário autenticado; atendentes não podem falsificar autoria. Configurações recebem `updated_by` automaticamente.

## Tipos TypeScript

`types/supabase.ts` é gerado da base vinculada com:

```bash
npx supabase gen types --linked --schema public --lang typescript
```

Não duplicar manualmente os tipos de linhas e enums derivados do schema.
