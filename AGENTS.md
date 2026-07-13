# Guia Local Para Agentes

Este projeto e para a landing page da Otica Vision, em Araguaina - TO. Antes de qualquer alteracao visual, textual ou tecnica, leia estes documentos locais:

1. `docs/brand.md`
2. `docs/copy-bank.md`
3. `docs/design-system.md`
4. `docs/v3-design-direction.md`
5. `docs/v3-architecture.md`
6. `docs/assets-map.md`
7. `docs/v3-assets-manifest.md`
8. `docs/anti-erros.md`
9. `.agents/skills/premium-lp-vision/SKILL.md`

## Regra Principal

O Codex nao deve decidir sozinho o que e "premium". O criterio de premium deste projeto e o conjunto de regras documentadas localmente: marca, copy permitida, design system, selecao de assets, anti-erros e plano de implementacao.

## Escopo Atual

- Nao implementar a landing sem pedido explicito.
- Nao rodar redesign por iniciativa propria.
- Nao alterar `package.json` sem pedido explicito.
- Nao apagar, mover ou renomear assets.
- Nao inventar dados ausentes.

## Dados Reais Permitidos

- Marca: Otica Vision.
- Local: Araguaina - TO.
- Oferta: armacoes nacionais e importadas.
- Diferencial: LAB. DIGITAL para confeccao propria de lentes.
- Atendimento em Araguaina - TO.
- WhatsApp: `https://api.whatsapp.com/send/?phone=5563992231522&text&type=phone_number&app_absent=0&utm_source=ig`
- Instagram: `https://www.instagram.com/oticavisionaraguaina/`
- Google Maps: `https://maps.app.goo.gl/4WeumQSuU4hg6yuv6`

## Dados Ausentes

Nao usar como afirmacao, promessa, microcopy, metadata, schema ou FAQ:

- Endereco completo.
- Horario.
- Avaliacoes reais.
- Depoimentos reais.
- Marcas vendidas.
- Prazo real de entrega.
- Garantia.
- Servicos como exame, ajuste, manutencao ou parcelamento.

## Processo Obrigatorio

- Trabalhar uma secao por rodada.
- Antes de editar uma secao, conferir os documentos locais.
- Preservar uma estetica elegante, editorial, chamativa e limpa.
- Usar fotos reais quando houver asset adequado.
- Evitar visual SaaS generico.
- Evitar gradiente artificial.
- Verificar mobile antes de encerrar qualquer rodada de implementacao.
- Rodar build/lint quando o projeto passar a ter stack configurada.
