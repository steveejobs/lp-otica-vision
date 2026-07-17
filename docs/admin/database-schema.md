# Schema do banco — Fase 1

As migrations SQL em `supabase/migrations` são a fonte da verdade. O schema remoto não deve ser alterado manualmente sem que a mudança equivalente seja versionada.

## Migrations

1. `20260717005857_phase1_core_schema.sql`: tipos, tabelas, FKs, constraints, índices e triggers de `updated_at`/perfil.
2. `20260717005902_phase1_security_rls_audit.sql`: funções de papel, grants, RLS, escopo do atendente e auditoria.
3. `20260717005905_phase1_storage.sql`: buckets privados e políticas de objetos.

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
- preço: `visible`, `consult`, `hidden`;
- disponibilidade: `available`, `last_unit`, `consultation`, `unavailable`;
- destaque: `promotion`, `highlight`, `launch`, `collection`;
- analytics: `page_view`, `product_view`, `product_whatsapp_click`, `collection_view`, `promotion_view`, `promotion_click`, `gallery_interaction`.

`products.availability_status` começa em `consultation`. Não existe quantidade de estoque.

## Integridade

- `slug` e `sku` são únicos;
- `galleries.route_key` é único;
- uma constraint parcial permite somente uma imagem com `is_cover = true` por produto;
- janelas de publicação não aceitam fim anterior ao início;
- preços, dimensões e ordens não aceitam valores negativos;
- metadados de analytics precisam ser objeto JSON e ter no máximo 4 KiB;
- FKs impedem órfãos e usam `restrict`, `cascade` ou `set null` conforme a relação.

## Índices

Além dos índices de PK/unique, existem índices para publicação, destaque, marca, categoria, disponibilidade, relações de imagem, série visual, datas de destaque, eventos e auditoria. A migration mantém os nomes explícitos para revisão e diagnóstico.

## Datas e autoria

Uma função reutilizável atualiza `updated_at`. Produtos recebem `created_by` e `updated_by` do usuário autenticado; atendentes não podem falsificar autoria. Configurações recebem `updated_by` automaticamente.

## Tipos TypeScript

`types/supabase.ts` é gerado da base vinculada com:

```bash
npx supabase gen types --linked --schema public --lang typescript
```

Não duplicar manualmente os tipos de linhas e enums derivados do schema.
