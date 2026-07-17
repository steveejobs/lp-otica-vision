# ADM da Ótica Vision — Fase 2

## Escopo entregue

A Fase 2 transforma a fundação da Fase 1 em um painel administrativo funcional. Ela não altera a landing pública, não cria catálogo público e não adiciona estoque quantitativo, PDV, carrinho, pagamento ou fiscal.

As mutações passam por Server Actions, validação de entrada e autorização server-side. A interface oculta ações sem permissão por ergonomia, mas a autorização real continua no servidor e nas políticas RLS/Storage.

## Telas

| Rota | Entrega |
| --- | --- |
| `/admin` | visão geral por papel e acessos rápidos |
| `/admin/marcas` e `/admin/marcas/[id]` | criar, editar, ativar, ordenar e substituir/remover logo |
| `/admin/categorias` e `/admin/categorias/[id]` | criar, editar, ativar, ordenar e exclusão segura |
| `/admin/produtos` | busca, filtros, paginação, duplicação controlada e arquivamento |
| `/admin/produtos/novo` e `/admin/produtos/[id]` | cadastro completo, publicação, destaque e gerenciador de imagens |
| `/admin/disponibilidade` | busca compacta e troca rápida de disponibilidade |
| `/admin/colecoes` e `/admin/colecoes/[id]` | capa, período, publicação, destaque e produtos ordenados |
| `/admin/galerias` e `/admin/galerias/[id]` | itens, séries visuais, enquadramentos, publicação e ordem protegida |
| `/admin/promocoes` e `/admin/promocoes/[id]` | tipos editoriais, período, CTA oficial, prioridade, imagem e produtos |
| `/admin/usuarios` e `/admin/usuarios/[id]` | convite, papel, ativação e proteção de autoedição |
| `/admin/auditoria` | filtros e antes/depois com mascaramento recursivo |

## Papéis

| Capacidade | Admin | Editor | Atendente |
| --- | --- | --- | --- |
| conteúdo editorial e imagens | sim | sim | não |
| disponibilidade rápida | sim | sim | sim |
| usuários e papéis | sim | não | não |
| auditoria e configurações | sim | não | não |

Usuário inativo não passa pelo proxy/layout nem pelas políticas de conteúdo. Usuário anônimo é redirecionado ao login. Acesso direto por URL sem o papel necessário volta para `/admin?status=forbidden`.

O convite usa o fluxo de convite do Supabase Auth e nunca define senha. A aplicação verifica e remove a identidade recém-convidada se o profile não puder ser configurado. O próprio admin não altera seu papel pela interface; desativar o próprio acesso exige a frase explícita e outro admin ativo. Um trigger impede que a base fique sem administrador ativo.

## Produtos e disponibilidade

- SKU é obrigatório e único sem diferenciar maiúsculas de minúsculas.
- Slug é único.
- Criação e duplicação sempre começam como rascunho, sem destaque e com disponibilidade `consultation`.
- A duplicação não copia imagens nem relações.
- Publicar exige uma capa com alt e dimensões válidas.
- Arquivar despublica e remove destaque; o registro e suas relações são preservados.
- Produto arquivado fica somente para leitura até ser restaurado.
- Disponibilidade é qualitativa: `available`, `last_unit`, `consultation` ou `unavailable`. Nenhuma opção afirma quantidade de estoque.
- O trigger de produto permite ao atendente mudar somente `availability_status`, mesmo por chamada direta ao banco.

## Galerias e relações ordenadas

As ordens de imagens, produtos de coleção, itens de galeria e produtos de destaque são aplicadas por funções SQL atômicas. Elas recebem a sequência completa, rejeitam IDs ausentes/repetidos e gravam posições contíguas.

Em galerias, itens da mesma `visual_series` precisam continuar adjacentes e com `series_order` crescente. Uma tentativa de separar ou inverter uma série é recusada; a interface também identifica início, continuação e posição de cada série.

## Upload e compensação

O fluxo de mídia é:

1. validar papel, arquivo, tamanho, MIME, assinatura binária e dimensões no servidor;
2. gerar `{parent_uuid}/{random_uuid}.{ext}` sem usar o nome original;
3. enviar ao bucket privado;
4. gravar caminho e metadados no banco;
5. em falha do banco, remover os objetos enviados e os registros parciais;
6. em substituição, gravar o novo caminho antes de remover o antigo;
7. se a remoção antiga falhar, restaurar o registro anterior e apagar o novo objeto;
8. em exclusão, restaurar o registro se o Storage não puder remover o objeto.

Uploads múltiplos aceitam até dez arquivos por ação. JPEG, PNG, WebP e AVIF são aceitos, cada um com no máximo 8 MiB. A capa é única por índice parcial e por RPC atômica. Triggers diferidos impedem remover a última capa completa de produto publicado ou a última imagem completa de galeria publicada.

## Imagens privadas e uso público futuro

O banco persiste somente o caminho privado. Não existe URL pública permanente.

- No ADM, `createAdminImageUrl(s)` cria URL assinada curta para qualquer membro ativo autorizado a ler o bucket.
- No site público futuro, `createPublishedImageUrl` primeiro consulta o estado público do registro: marca ativa, produto publicado e não arquivado, coleção vigente, item/galeria publicados ou promoção ativa e vigente.
- Somente após essa consulta é criada uma URL assinada entre 60 e 3.600 segundos.
- Transformação de imagem poderá ser acrescentada no ponto de assinatura, sem tornar o bucket público. Se cache central for necessário, a alternativa é um Route Handler proxy que repita a mesma checagem e use cache privado/controlado.

## Auditoria

Triggers registram `insert`, `update` e `delete` em perfis, conteúdo, imagens, relações e configurações. O ator vem da sessão autenticada; produtos também preservam autoria controlada pelo banco.

Campos com nomes associados a senha, segredo, token, autorização, chave de API ou cookie são removidos recursivamente no trigger e novamente mascarados na renderização. Somente admin lê os logs. A tela filtra por usuário, entidade, ação e período e pagina 50 eventos por vez.

## Fixtures

`scripts/fixtures-phase2.mjs` possui `seed`, `status` e `cleanup`. Os registros usam o prefixo `[FIXTURE FASE 2]` e slug `fixture-fase2-*`. A semeadura exige login de um admin real no projeto de desenvolvimento e cria exatamente 2 marcas, 2 categorias, 5 produtos, 12 imagens identificadas, 1 coleção, 1 galeria e 1 promoção.

O estado efêmero fica em `.tmp/admin-qa/phase2-fixtures.json`, ignorado pelo Git. O comando de limpeza apaga relações, registros, objetos e logs correspondentes. Fixtures devem estar com contagem zero antes de preview.

## Fora do escopo

- catálogo e consumo público das imagens;
- estoque quantitativo e movimentações;
- PDV, carrinho, checkout, pagamento e fiscal;
- relatórios de venda;
- promoção para produção ou alteração do alias de produção.
