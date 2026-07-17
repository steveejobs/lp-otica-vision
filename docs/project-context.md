# Contexto do Projeto Otica Vision

Ultima atualizacao: 2026-07-17.

Este arquivo existe para orientar futuros contextos do Codex e deve ser atualizado durante rodadas relevantes de implementacao.

## Leitura obrigatoria

Antes de alterar visual, texto, arquitetura ou tecnica, leia:

- `AGENTS.md`
- `.agents/skills/premium-lp-vision/SKILL.md`
- `docs/brand.md`
- `docs/copy-bank.md`
- `docs/design-system.md`
- `docs/v3-design-direction.md`
- `docs/v3-architecture.md`
- `docs/assets-map.md`
- `docs/v3-assets-manifest.md`
- `docs/anti-erros.md`
- `docs/v4-refinement-and-admin.md`

## Dados permitidos

- Marca: Otica Vision.
- Local: Araguaina - TO.
- Oferta: armacoes nacionais e importadas.
- Diferencial: LAB. DIGITAL para confeccao propria de lentes.
- Canais oficiais: WhatsApp, Instagram e Google Maps documentados em `AGENTS.md`.

Nao afirmar endereco completo, horario, avaliacoes, depoimentos, marcas sem inventario, prazo, garantia, exames, ajustes, manutencao, parcelamento, estoque ou autorizacao de revenda.

## Arquitetura atual

- Home: `app/page.tsx`.
- Catalogo: `app/catalogo/page.tsx` e `app/catalogo/[slug]/page.tsx`.
- Admin: `app/admin/**`, com Supabase e validacoes proprias.
- Assets publicados: `public/media/**`, referenciados por `lib/assets.ts` quando forem assets institucionais.
- Conteudo de vitrine da home: `lib/showcase-content.ts`.
- Tema central: `theme/vision-theme.css` e `theme/vision-motion.css`.
- Motion client-side: `components/motion/vision-motion.tsx`.
- Ferramentas locais: `tools/`.

## Contrato de tema

Novos componentes devem usar tokens do tema em vez de valores soltos quando houver token aplicavel:

- cores `--vision-*`;
- tipografia `--font-display` e `--font-body`;
- motion `--duration-*` e `--ease-*`;
- raio `--radius-sm` e `--radius-md`;
- containers `--container-mobile` e `--container-desktop`.

## Contrato de motion

- Entrada editorial: marque blocos com `data-motion-reveal`.
- Variantes aceitas: `hero`, `section`, `media`, `catalog-card`.
- Sequencia escalonada: use `data-motion-stagger` no wrapper.
- Saida de pagina: navegacoes internas passam pelo controlador em `components/motion/vision-motion.tsx`.
- Home hero: `FocusPortrait` usa lente, pan e tilt com mouse/toque pressionado.
- Reduced motion deve remover deslocamentos, autoplay decorativo e transicoes nao essenciais.
- Nao usar scroll-jacking, parallax continuo, progresso de scroll ou movimento decorativo permanente.

## UI/UX

- A experiencia deve ser editorial, quente, limpa e precisa.
- Priorizar fotos reais e preservar leitura de rosto, olhos, oculos e logo.
- Controles devem ter foco visivel e altura minima adequada no mobile.
- Home e catalogo sao paginas distintas; transicoes devem reforcar continuidade sem esconder conteudo.
- Evitar visual SaaS generico, cards em excesso, gradientes artificiais e copy nao comprovada.

## Tools

`tools/optimize-images.py` cria copias otimizadas de imagens sem alterar originais. A saida padrao e `.tmp/optimized-media`.

Exemplo:

```powershell
python tools/optimize-images.py public/media/photos --out .tmp/optimized-media --quality 82 --max-width 1800
```

## Registro da rodada 2026-07-17

- Criada pasta `theme/` para tema unificado.
- Tokens e motion base movidos para arquivos dedicados.
- Criado modulo `components/motion/` com reveal observado, stagger e transicao interna de pagina.
- Hero da home recebeu entrada escalonada e interacao de foto com lente, pan e tilt.
- Catalogo recebeu reveal em hero, filtros, resultados, capitulos e cards.
- Cards do catalogo ganharam hover com elevacao e brilho contido.
- Criada pasta `tools/` com script inicial de otimizacao de imagens.
- Dados ausentes continuaram fora da copy e dos metadados.
- `npm run lint` passou.
- `npm run build` passou.
- Auditoria mobile temporaria em `.tmp/mobile-motion-check.mjs` passou para home em 390 x 844: sem overflow, sem controles menores que 44 px e sem alvo de motion visivel preso oculto.
- A rota `/catalogo` tambem respondeu 200 na auditoria mobile e passou nas mesmas metricas estruturais, mas exibiu o estado de erro da vitrine porque a camada publica de dados do catalogo falhou no ambiente local. Nao tratar isso como regressao de CSS/motion sem antes auditar Supabase/dados.
- A checagem sintatica do Python nao rodou porque `python.exe` e `py.exe` falharam no ambiente com erro de sessao de logon antes de executar o script.
