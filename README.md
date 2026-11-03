# Atlas de Reações Orgânicas

Atlas de reações de Química Orgânica II (USP), por aula, mecanismo, nucleófilo e eletrófilo. Funciona como app no celular (PWA), offline.

- `fonte/dados/` — reações escritas em SMILES (uma por aula)
- `fonte/app/` — interface (HTML, CSS, JS) e service worker
- `tools/build.mjs` — desenha as estruturas com RDKit, classifica nucleófilo/eletrófilo e gera `site/`
- `site/` — o que é publicado (gerado; versionado para a Vercel só servir arquivos)

Depois de editar qualquer coisa em `fonte/`:

```bash
cd tools && npm install && npm run build
```

O build carimba uma nova versão em `site/versao.json`; quem já instalou o atalho no celular vê o botão **Atualizar**.
