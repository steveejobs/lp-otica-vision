# Matriz de impacto — refinamento funcional e de desempenho do ADM

Data: 18 de julho de 2026. Escopo: preview administrativo, sem promoção.

| Área | Componentes/rotas prováveis | Banco/Storage | Público | Risco | Verificação |
| --- | --- | --- | --- | --- | --- |
| Localização de galerias | `/admin/galerias`, editor e ações | `galleries.route_key`; registro permitido na aplicação | IDs estáveis e links com fragmento | Médio: publicação sem destino ou link incorreto | matriz explícita, validação server-side, navegação direta |
| Preview de galeria | `GalleryItemManager` e estilos do ADM | leitura/escrita de posições já existentes; URLs privadas do editor | somente replica proporções já usadas | Médio: crop divergente ou mídia excessiva | mobile/desktop, ordem/série, anterior/próximo |
| Nova marca no produto | `ProductForm`, nova ação inline | `brands`, `brand-logos`, auditoria/RLS | catálogo apenas passa a poder usar marca criada depois | Alto: duplicata, perda do formulário ou permissão indevida | normalização no banco, testes de papéis e preservação do form |
| Navegação do ADM | layout protegido, nav, loading/Suspense e consultas de páginas | Auth + `profiles` e queries de cada módulo | nenhum | Alto: regressão de autorização ou conteúdo incompleto | trace antes/depois, sessão expirada, histórico e nova aba |
| Evidências/preview | scripts QA e `docs/qa/admin-refinement` | usuário temporário de QA removido ao final | URL isolada | Médio: dados temporários ou promoção acidental | cleanup, sem `--prod`, sem alias |

## Dependências e fronteiras

- A fonte da verdade de galerias será um registro explícito; nomes de arquivo não participam do roteamento.
- `mobile_object_position` e `desktop_object_position` já existem em `gallery_items` e serão preservados.
- Uploads continuam usando `lib/storage/images.ts`; nenhuma validação paralela de arquivo será criada.
- Auditoria continua centralizada nos triggers existentes; não foi necessária mudança de schema.
- O shell administrativo fica em `AdminFrame` sob `app/admin/layout.tsx`; a autorização continua no layout protegido e nas ações server-side.
- Nenhum asset será apagado, movido ou renomeado, e `package.json` não será alterado.

## Hipóteses de desempenho a validar no baseline

1. Confirmado: o `adminMain` aplicava uma entrada global de 440 ms em cada remontagem.
2. Confirmado: sessão/perfil eram consultados no proxy, layout e página sem deduplicação por render.
3. Confirmado: prefetch automático da navegação e dos links de linha disparava dezenas de requests RSC; contadores do dashboard bloqueavam a composição inicial.
4. Excluído: não havia `window.location`, `AnimatePresence`, `mode="wait"`, `setTimeout` nem loader com duração mínima.
