# Otica Vision V2

Site oficial da Otica Vision em Araguaina - TO, construido com Next.js App Router e TypeScript.

## Desenvolvimento

Requisitos:

- Node.js 24.x;
- npm 11.x.

Comandos:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Publicacao Na Vercel

O projeto usa a integracao nativa entre Next.js e Vercel. Nao existe `vercel.json`, export estatico, output customizado ou `dist` manual.

Ao importar `steveejobs/lp-otica-vision`, use:

| Configuracao | Valor |
| --- | --- |
| Production Branch | `vision-v2-clean` enquanto `main` nao for atualizada |
| Framework Preset | Next.js, detectado automaticamente |
| Root Directory | raiz do repositorio |
| Install Command | padrao detectado pelo lockfile |
| Build Command | `npm run build`, padrao |
| Output Directory | padrao do Next.js; nao preencher com `dist` |
| Node.js Version | 24.x |
| Environment Variables | nenhuma obrigatoria |

O diretorio `public/` e a unica fonte dos assets publicados. `galeria/` preserva os originais e fica fora do upload feito pela Vercel CLI por meio de `.vercelignore`.

## Verificacao Depois Do Deploy

Validar:

- `/`;
- `/instagram`;
- `/api/exame-news`;
- imagens, videos e posters;
- links de WhatsApp, Instagram, rota e materias da Exame;
- ausencia de erros de console e respostas 404.

O relatorio tecnico completo esta em `docs/qa-report.md`.
