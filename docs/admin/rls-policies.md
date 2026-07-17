# Políticas RLS — Fase 1

RLS está explicitamente ativo nas 14 tabelas do schema público. Papéis são consultados em `profiles` por funções `security definer` no schema `private`; a verificação sempre exige `active = true`.

## Matriz de acesso

| Recurso | Anônimo | Atendente | Editor | Admin |
| --- | --- | --- | --- | --- |
| marcas/categorias | lê ativas | lê tudo | CRUD | CRUD |
| produtos | lê publicados | lê tudo; altera apenas disponibilidade | CRUD | CRUD |
| imagens de produto | lê metadados de produto publicado | lê tudo | CRUD | CRUD |
| coleções/relações | lê publicadas e dentro da janela | lê tudo | CRUD | CRUD |
| galerias/itens | lê publicados | lê tudo | CRUD | CRUD |
| destaques/relações | lê ativos e dentro da janela | lê tudo | CRUD | CRUD |
| perfis | nenhum | lê o próprio | lê o próprio | gerencia perfis |
| configurações | nenhum | leitura | leitura | CRUD |
| analytics | nenhum | nenhum | nenhum | leitura |
| auditoria | nenhum | nenhum | nenhum | leitura |

Não há políticas públicas de inserção, atualização ou exclusão.

## Escopo do atendente

A política permite `UPDATE` de produto para o atendente ativo, mas um trigger `before update` compara o registro antigo com o novo. Qualquer mudança fora de `availability_status` é recusada no banco. `updated_by` e `updated_at` continuam controlados pelo servidor/banco.

Essa proteção não depende de botões ou formulários.

## Conteúdo público

- produtos: `published = true`;
- marcas/categorias: `active = true`;
- coleções: publicadas e com início/fim válidos no instante da leitura;
- galeria e item: ambos publicados;
- destaque: ativo e dentro da janela;
- relações editoriais: o contêiner e o produto relacionado precisam estar públicos.

## Perfis inativos

Um usuário autenticado pode ler apenas o próprio perfil para receber uma resposta de acesso pendente. Ele não passa nas políticas de conteúdo administrativo e é redirecionado pelo proxy/layout.

## Auditoria

Triggers registram `insert`, `update` e `delete` em perfis, conteúdo, relações e configurações. Editores não recebem grant de escrita em `audit_logs`; o teste automatizado confirma que uma tentativa de exclusão não remove o registro.

O cliente administrativo pode acessar o banco sem RLS e, por isso, só pode existir em módulos `server-only`. Mutações editoriais normais devem usar o cliente SSR para preservar identidade e políticas.

## Teste reproduzível

```bash
npm run qa:supabase
```

O script cria usuários e conteúdo temporários, executa a matriz e remove usuários, objetos, dados e logs de QA ao final.
