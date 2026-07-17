# Refinamento V4 e direção para futura ADM

## Objetivo

A V4 refina a home existente sem descaracterizar a Ótica Vision. A página continua sendo institucional e editorial, não e-commerce. O foco é acelerar a compreensão da proposta, transformar a curadoria visual em conteúdo configurável e preparar uma fronteira segura para uma futura administração.

## Leitura da referência

Referência auditada: `https://lp-otica-moderna.vercel.app/`.

### Princípios aproveitados

- capítulos visuais com funções distintas;
- proposta e CTAs compreensíveis na primeira dobra;
- alternância entre copy curta e composições de mídia;
- coleções e marcas tratadas como momentos editoriais próprios;
- motion ligado à observação ou à escolha do conteúdo.

### Elementos rejeitados para a Vision

- gradiente amarelo artificial e paleta azul;
- título sans muito pesado;
- excesso de cards e faixas de benefícios;
- endereço, parcelamento, consultoria, depoimentos e avaliações sem dados equivalentes confirmados para a Vision;
- associação de uma fotografia genérica a uma marca específica;
- animação decorativa contínua e excesso de capítulos longos.

## Arquitetura publicada na V4

A home continua enxuta. Dois blocos existentes ganharam função editorial e contrato de conteúdo mais claros:

1. a antiga galeria editorial passa a ser **Coleção em destaque**;
2. o antigo rail de logos passa a ser **Marcas em destaque**.

Isso evita criar galerias concorrentes ou repetir imagens na mesma rota. A ordem comercial permanece:

1. Header;
2. Hero;
3. Vídeos em uso;
4. Coleção em destaque;
5. Marcas em destaque;
6. LAB. DIGITAL;
7. Notícias;
8. Localização e CTA;
9. Footer.

## Contrato de conteúdo atual

`lib/showcase-content.ts` é a fonte central das duas vitrines. Os componentes recebem dados prontos e não conhecem o futuro provedor de administração.

### Coleção em destaque

- `sectionId`;
- `eyebrow`;
- `title`;
- `description`;
- `galleryLabel`;
- `action` oficial;
- lista ordenada de imagens reais.

### Marcas em destaque

- `sectionId`;
- `eyebrow`;
- `title`;
- `description`;
- `action` oficial;
- `initialBrandName`;
- lista ordenada de logos confirmados.

Esse contrato é o ponto de migração para CMS ou banco de dados. Enquanto a ADM não existe, os dados continuam tipados, versionados e revisáveis no Git.

## Escopo seguro da futura ADM

A ADM deve controlar:

### Galerias genéricas

- nome interno e título publicado;
- texto de apoio;
- imagens e ordem;
- alt text obrigatório;
- crop focal por imagem;
- CTA escolhido apenas entre destinos oficiais;
- estado `rascunho` ou `publicado`.

### Coleção em destaque

- ativação da coleção;
- capa e imagens secundárias;
- ordem das imagens;
- texto editorial sem claim comercial não comprovado;
- data de início e fim opcional, sem criar urgência pública automática.

### Marca em destaque

- seleção somente entre marcas cadastradas e confirmadas;
- logo oficial;
- ordem no seletor;
- imagens específicas apenas quando sua relação com a marca estiver documentada;
- nenhum campo que publique automaticamente “revendedor autorizado”, estoque ou disponibilidade.

## Requisitos antes de implementar `/admin`

Uma rota administrativa não deve ser criada como formulário público ou com senha fixa no código. Antes da implementação, precisam ser definidos:

1. provedor de autenticação e contas autorizadas;
2. armazenamento de imagens e política de remoção;
3. CMS ou banco de dados;
4. papéis de editor e publicador;
5. fluxo de rascunho, preview e publicação;
6. histórico de alterações e recuperação;
7. domínio de produção e política de proteção do preview.

## Validações obrigatórias da ADM

- bloquear publicação sem alt text;
- exigir dimensões e proporção conhecidas;
- gerar variantes responsivas e placeholder;
- validar formato, tamanho e tipo real do arquivo;
- impedir URL comercial fora da lista oficial;
- impedir marca sem logo confirmado;
- impedir imagem de marca sem vínculo documentado;
- preservar conteúdo publicado quando o CMS estiver indisponível;
- registrar quem publicou e quando;
- nunca expor segredo, token ou credencial ao navegador.

## Motion V4

O motion permanece limitado a três manifestações do mesmo sistema:

- entrada editorial observada;
- transição da coleção;
- troca manual da marca em foco.

Não há scroll-jacking, parallax, autoplay de logos ou movimento decorativo contínuo. `prefers-reduced-motion` remove deslocamentos e animações sem remover conteúdo ou controles.

## Marketing e evidência

O hero agora entrega proposta, produto, local e CTAs antes da mídia no mobile. Vídeos e coleção aparecem antes do bloco de marcas, oferecendo prova visual antes do CTA comercial intermediário. A nota oficial de Marketing ainda depende dos testes humanos definidos no scorecard; inspeção da IA não substitui compreensão em cinco segundos nem teste de tarefa.

## Dados deliberadamente não usados

- endereço completo;
- horário;
- avaliações e depoimentos;
- prazo, garantia e parcelamento;
- exames, ajustes ou manutenção;
- alegação de estoque ou revenda autorizada;
- fotografia atribuída a marca sem evidência.
