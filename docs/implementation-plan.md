# Implementation Plan

Nao implementar a landing ate haver pedido explicito. Quando a implementacao for autorizada, seguir este plano em fases.

## Regra De Rodada

Implementar uma secao por rodada. Cada rodada deve ter:

- Objetivo da secao.
- Copy baseada em `docs/copy-bank.md`.
- Assets escolhidos em `docs/assets-map.md`.
- Checagem contra `docs/anti-erros.md`.
- Teste mobile da secao.
- Build/lint quando existirem.

## Fase 0: Preparacao

- Confirmar stack existente antes de editar.
- Ler todos os documentos locais.
- Confirmar que `package.json` nao sera alterado sem autorizacao.
- Mapear assets realmente usados.
- Definir primeira secao a implementar.

## Fase 1: Base Visual

- Criar tokens de cor, tipografia, espacamento e movimento.
- Configurar estilos globais com fundo bege quente.
- Definir comportamento responsivo base.
- Garantir que logo e links oficiais possam ser usados.

## Fase 2: Header

- Logo visivel e alinhado.
- Links/acoes essenciais: WhatsApp, Instagram, Maps.
- Sem dados ausentes.
- Mobile sem quebra e com area tocavel adequada.

## Fase 3: Hero

- Marca/produto como primeiro sinal visual.
- Usar foto real ou logo real.
- Copy permitida: marca, Araguaina, armacoes nacionais/importadas, LAB. DIGITAL se couber.
- CTA oficial para WhatsApp ou Instagram.
- Evitar gradiente artificial e layout SaaS.

## Fase 4: Oferta

- Apresentar armacoes nacionais e importadas.
- Usar fotos reais da galeria.
- Nao citar marcas nao confirmadas.
- Nao prometer preco, prazo ou variedade numerica.

## Fase 5: LAB. DIGITAL

- Comunicar confeccao propria de lentes.
- Nao prometer prazo.
- Nao transformar em afirmacao tecnica nao fornecida.
- Usar visual de precisao e acabamento.

## Fase 6: Galeria Editorial

- Selecionar fotos com melhor composicao.
- Otimizar carregamento.
- Testar cortes em mobile.
- Evitar repeticao excessiva de poses parecidas.

## Fase 7: Local E Canais

- Informar atendimento em Araguaina - TO.
- Usar Google Maps oficial sem inventar endereco completo.
- Usar WhatsApp e Instagram oficiais.
- Nao inserir horario.

## Fase 8: Footer

- Reforcar marca.
- Links oficiais.
- Dados confirmados.
- Sem FAQ inventado.

## Checklist Mobile Por Rodada

- Testar largura proxima de 360px, 390px e desktop.
- Conferir se textos nao estouram.
- Conferir se CTAs tem pelo menos 44px de area tocavel.
- Conferir se texto nao cobre rosto, produto ou logo.
- Conferir se a secao fica compreensivel sem hover.

## Checklist De Build

Quando houver scripts disponiveis:

- `npm run lint`
- `npm run build`

Se os scripts nao existirem, registrar isso no fechamento da rodada. Nao criar ou alterar `package.json` apenas para satisfazer este checklist.

## Definicao De Pronto

Uma secao esta pronta quando:

- Segue a copy permitida.
- Usa dados confirmados.
- Usa assets reais de modo intencional.
- Funciona em mobile.
- Nao viola anti-erros.
- Foi validada com build/lint quando aplicavel.
