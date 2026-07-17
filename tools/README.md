# Tools

Pasta para ferramentas locais em Python usadas no preparo e auditoria de assets.

Regras:

- Scripts nao devem alterar originais por padrao.
- Saidas temporarias devem ir para `.tmp/` ou para um destino informado explicitamente.
- Scripts que dependem de bibliotecas opcionais devem falhar com mensagem clara, sem alterar `package.json`.
- Assets originais em `galeria/` nao devem ser apagados, movidos ou renomeados.

Exemplo:

```powershell
python tools/optimize-images.py public/media/photos --out .tmp/optimized-media --quality 82 --max-width 1800
```
