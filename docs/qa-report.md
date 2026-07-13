# Relatório Final de QA e Limpeza — Ótica Vision

Validação concluída em 2026-07-13 sobre o build de produção local do checkpoint visual aprovado `189142b`. Nenhuma alteração de design, copy, motion, comportamento, rota, curadoria ou integração com a Exame foi realizada.

## Escopo validado

Rotas:

- `/`;
- `/instagram`.

Viewports:

- `360×800`;
- `375×812`;
- `390×844`;
- `430×932`;
- `1366×768`;
- `1440×900`.

Resultado comum às 12 combinações de rota e viewport:

- zero overflow horizontal;
- zero imagem ou vídeo com dimensões inválidas;
- zero link vazio;
- zero resposta 404;
- zero erro de console, página ou hidratação;
- notícias da Exame renderizadas na home;
- galerias, marcas e posters carregados sem mídia quebrada.

Os abortos de requests de vídeo observados ao encerrar cada contexto do Chromium são cancelamentos esperados de range requests; os mesmos três vídeos atingiram `readyState 4` e tocaram normalmente na prova de movimento.

## Movimento e comportamento

- Os três vídeos de cada composição tocaram simultaneamente quando visíveis, com avanço de tempo confirmado, e pausaram fora da viewport na home.
- Na rota `/instagram`, a composição permanece parcialmente visível no topo após o retorno e, por isso, continua tocando conforme o comportamento aprovado.
- Galeria da home avançou de `0` para `1` em autoplay.
- Galeria do `/instagram` avançou de `1` para `2` em autoplay.
- Rails de marcas entraram em estado `running` quando visíveis.
- Em reduced motion, galerias e rails permaneceram estáticos e os vídeos ficaram pausados.

## Comparação visual

- `/instagram` em `390×844` e `1440×900`: comparação pixel a pixel idêntica ao checkpoint.
- Home em `1440×900`: diferença de apenas `0,0136%` dos canais, restrita à renderização dinâmica das notícias.
- Home em `390×844`: composição e estilos idênticos; a altura total variou 17 px porque a metadata temporal da Exame mudou entre os builds.
- Os screenshots usados nessa comparação foram temporários e não permanecem versionados nem no contexto de deploy.

## Redução

| Medida | Antes | Depois | Redução |
| --- | ---: | ---: | ---: |
| Arquivos versionados | 244 | 140 | 104 |
| Tamanho versionado | 122.334.234 B | 76.019.130 B | 46.315.104 B |
| Contexto Vercel estimado | 41.140.204 B | 35.575.499 B | 5.564.705 B |
| `public/` | 40.750.733 B | 35.192.038 B | 5.558.695 B |
| Vídeos em `public/` | 4 / 27.149.581 B | 3 / 24.888.983 B | 1 / 2.260.598 B |
| Imagens em `public/` | 38 / 13.601.152 B | 30 / 10.303.055 B | 8 / 3.298.097 B |

O contexto Vercel final contém 88 arquivos. Documentação, originais em `galeria/`, QA local, caches, testes e artefatos de build permanecem fora do upload por `.vercelignore`.

## Integridade de assets e segurança

- Os 33 assets restantes em `public/` têm referência de runtime.
- Não há hashes duplicados dentro de `public/`.
- Os 38 originais de `galeria/` foram preservados como arquivo mestre e não são enviados à Vercel.
- Não há `.env`, token, cookie, credencial Vercel, perfil de navegador, bypass ou log no conteúdo versionado final.
- `.vercel/`, `.next/`, `node_modules/`, `.tmp/`, relatórios, screenshots e caches são ignorados.

## Validação técnica

- `npm ci`: 378 pacotes instalados; 0 vulnerabilidades.
- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou com `/`, `/_not-found` e `/instagram` prerenderizadas.
- `git diff --check`: passou.

O preview final é gerado somente depois do commit de limpeza, a partir de uma working tree limpa. A URL é informada na entrega, sem promoção para produção.
