// Descobre o CID do PubChem de cada molécula com estereoquímica, para ligar a reação ao visualizador 3D do PubChem
// (página do composto > "3D Conformer"). O resultado fica em fonte/dados/cid-cache.json: o build só consulta a
// internet para moléculas novas. Cada CID é CONFERIDO: o SMILES isomérico que o PubChem devolve precisa ser
// idêntico ao nosso (mesma estereoquímica); se não for, o link não é criado.
import fs from 'node:fs';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

export async function resolveCids(RDKit, lista, caminhoCache) {
  const cache = fs.existsSync(caminhoCache) ? JSON.parse(fs.readFileSync(caminhoCache, 'utf8')) : {};
  const canon = (s) => { const m = RDKit.get_mol(s); if (!m || !m.is_valid()) { m?.delete(); return null; } const c = m.get_smiles(); m.delete(); return c; };
  let novos = 0;
  for (const s of lista) {
    const c = canon(s);
    if (!c || cache[c] !== undefined) continue;
    let r = null;
    try {
      const resp = await fetch(`${BASE}/compound/smiles/cids/JSON`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'smiles=' + encodeURIComponent(c) });
      const j = await resp.json();
      const cids = (j.IdentifierList && j.IdentifierList.CID || []).filter((x) => x > 0).slice(0, 8);
      r = { cid: null, motivo: cids.length ? 'estereoquímica diferente' : 'não encontrado' };
      for (const cid of cids) { // escolhe o CID cujo SMILES isomérico é idêntico ao nosso
        await espera(250);
        const p = await (await fetch(`${BASE}/compound/cid/${cid}/property/IsomericSMILES,Title/JSON`)).json();
        const prop = p.PropertyTable.Properties[0];
        if (canon(prop.IsomericSMILES || prop.SMILES || '') === c) { r = { cid, titulo: prop.Title }; break; }
      }
    } catch (e) { r = { cid: null, motivo: 'erro de rede: ' + e.message }; }
    if (r && !String(r.motivo || '').startsWith('erro de rede')) { cache[c] = r; novos++; }
    else cache[c] = cache[c] ?? undefined;
    await espera(250);
  }
  if (novos) fs.writeFileSync(caminhoCache, JSON.stringify(cache, null, 1) + '\n');
  return (s) => { const c = canon(s); const r = c && cache[c]; return r && r.cid ? r : null; };
}
