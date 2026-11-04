# Remover o tema "Vidro" (opcional)

O tema Vidro está isolado e escondido (na tela inicial, toque 5 vezes em "Versão …"). Para tirá-lo do app:

1. **Mais rápido (reversível):** em `fonte/recursos.json` troque `"vidro": true` por `"vidro": false` e rode `cd tools && npm run build`.
   O build deixa de incluir o CSS do tema, o seletor, a luz/gota ao toque, a troca de tela com desfoque e o script que lembra a escolha.
2. **Apagar de vez:** depois do passo 1, apague `fonte/app/tema.css`, `fonte/app/tema-escuro.css`, `fonte/app/visuais.css`, `tools/escopo-vidro.mjs`
   e os trechos entre `/*@@vidro-ini*/` e `/*@@vidro-fim*/` em `fonte/app/app.js` (e `<!--@@vidro-ini-->` no `index.template.html`).
   Pode também remover a dependência `postcss` de `tools/package.json`.
3. Publique como de costume. Quem tinha o Vidro escolhido volta ao visual Original.

## Tema "Artigo" (papel)
Também fica em `fonte/recursos.json` (`"papel": true`). Arquivos: `fonte/app/tema-papel.css` e `fonte/app/tema-papel-escuro.css`.
Com `"vidro": false` e `"papel": false` juntos, toda a parte de escolha de aparência sai do app.
