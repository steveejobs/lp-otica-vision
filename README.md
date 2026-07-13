# Ótica Vision V3

Landing page da Ótica Vision em Araguaína - TO, construída com Next.js App Router e TypeScript.

## Desenvolvimento

Requisitos:

- Node.js 24.x;
- npm 11.x.

Comandos:

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Publicacao Na Vercel

O projeto usa a integração nativa entre Next.js e Vercel. Não existe `vercel.json`, export estático, output customizado ou `dist` manual.

Ao importar o repositório na Vercel, use:

| Configuracao | Valor |
| --- | --- |
| Production Branch | Definida no painel da Vercel |
| Framework Preset | Next.js, detectado automaticamente |
| Root Directory | Raiz do repositório |
| Install Command | `npm ci`, detectado pelo lockfile |
| Build Command | `npm run build` |
| Output Directory | Padrão do Next.js; não preencher com `dist` |
| Node.js Version | 24.x |
| Environment Variables | Nenhuma obrigatória |

O diretório `public/` é a única fonte de assets publicados. `galeria/` preserva os originais mestres e fica fora do upload por meio de `.vercelignore`. Documentação, QA e ferramentas locais também não entram no contexto do build.

Para criar preview sem promover produção:

```bash
npx vercel --yes
```

Não use `--prod` sem autorização explícita.

## Verificação Depois Do Deploy

Validar:

- `/`;
- `/instagram`;
- imagens, vídeos e posters;
- links de WhatsApp, Instagram, rota e matérias da Exame;
- ausência de erros de console e respostas 404.

O relatório técnico final está em `docs/qa-report.md`.
