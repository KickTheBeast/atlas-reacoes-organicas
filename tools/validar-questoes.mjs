// Valida as questões ("Qual é o produto?") do app: todo carbono do produto precisa vir do substrato
// ou de um reagente identificado no enunciado. Reagentes genéricos (R', R–X, Nu⁻…) são sinalizados.
//
//   cd tools && npm run validate-questions        (sai com código 1 se houver problema novo)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import initRDKit from '@rdkit/rdkit';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: { REACTIONS: [], CATEGORIES: [] } };
vm.createContext(ctx);
const arquivos = fs.readdirSync(path.join(raiz, 'fonte/dados')).filter((f) => f.endsWith('.js'));
arquivos.sort((a, b) => (a === 'reactions.js' ? -1 : b === 'reactions.js' ? 1 : a.localeCompare(b)));
for (const f of arquivos) vm.runInContext(fs.readFileSync(path.join(raiz, 'fonte/dados', f), 'utf8'), ctx, { filename: f });
const { REACTIONS } = ctx.window;
// exceções já revisadas à mão: nome da reação -> motivo (aceitas sem erro)
const OK = JSON.parse(fs.readFileSync(path.join(raiz, 'tools/questoes-revisadas.json'), 'utf8'));

const RDKit = await initRDKit();
const contaC = (smi) => { const m = RDKit.get_mol(smi); if (!m || !m.is_valid()) { m?.delete(); return null; } const j = JSON.parse(m.get_json()).molecules[0]; m.delete(); return j.atoms.filter((a) => (a.z ?? 6) === 6).length; };
const soma = (lista) => lista.reduce((s, x) => s + (contaC(x) ?? 0), 0);

// reagente genérico: letra R/Ar/Nu/X/E sem definição, fora de parênteses (o que vem entre parênteses é só esclarecimento)
const GENERICO = /(?:^|[^A-Za-zÀ-ú₀-₉])(R[′″'’¹²³]?(?:MgX|MgBr|Li|₂CuLi|₃SiCl|–?X|-X|OH|O⁻|S⁻|NH₂|CO₃H|CO₂H|COCl|C≡C|OOR)?|R–|Ar(?:MgX|Li|X|H)?|Nu[⁻:]?|X₂|HX|X⁻|E⁺|[A-Z]–X)(?![a-zA-Zç])/;
// carbono explícito num reagente: CH₃, Et, Me, Ph, CN, CO₂, acetil...
const TEM_C = /C(?![laurdsemfo])|Me|Et|Ms|Ts|Tf|Ph|Bu|Pr|[Aa]cet|CN|Ac/;
// iniciadores/catalisadores que não entram no produto (ROOR, R₄N⁺) não contam como reagente genérico
const semParenteses = (t) => t.replace(/\([^)]*\)/g, ' ').replace(/ROOR|R₄N⁺/g, ' ');
const problemas = [];
REACTIONS.forEach((r, k) => {
  const txt = r.reagents || '';
  const cR = soma(r.reactants || []), cP = Math.max(0, ...(r.products || []).map(contaC).map((x) => x ?? 0));
  const gen = GENERICO.test(semParenteses(txt));
  const excede = cP > cR;
  if (!(gen || excede || /polimeriza/i.test(r.nome))) return;
  // carbonos a mais: explicados se há mais de uma estrutura reagente (ex.: diácido + EtOH em excesso),
  // se o produto é múltiplo inteiro do substrato (equivalentes) ou se o reagente/condição tem carbono explícito
  const explicado = (r.reactants || []).length > 1 || (cR > 0 && cP % cR === 0) || TEM_C.test(semParenteses(`${txt} ${r.conditions || ''}`).replace(/Cl|Cu|Cr|Ca|Co|Cs|Cd/g, ''));
  if (/polimeriza/i.test(r.nome)) problemas.push({ nome: r.nome, aula: r.aula, tipo: 'polímero: o produto mostra n unidades do monômero', cR, cP, reagents: r.reagents });
  if (gen) problemas.push({ nome: r.nome, aula: r.aula, tipo: excede ? 'reagente genérico e produto com mais carbonos' : 'reagente genérico', cR, cP, reagents: r.reagents });
  else if (excede && !explicado) problemas.push({ nome: r.nome, aula: r.aula, tipo: 'carbonos do produto não vêm de nada mostrado', cR, cP, reagents: r.reagents });
});
const novos = problemas.filter((p) => !OK[p.nome]);
if (process.argv.includes('--tudo')) console.log(JSON.stringify(problemas, null, 1));
console.log(`${REACTIONS.length} reações · ${problemas.length} sinalizadas · ${problemas.length - novos.length} já revisadas · ${novos.length} pendentes`);
for (const p of novos) console.log(`- [${p.aula}] ${p.nome}\n    reagente: ${p.reagents}  (C substrato ${p.cR} → produto ${p.cP})  ${p.tipo}`);

// distratores: a alternativa errada deve vir de reação da mesma categoria (mesmo critério do simulado em estudo.js)
if (process.argv.includes('--distratores')) {
  const fracos = [];
  for (const r of REACTIONS) {
    if (!(r.products || []).length || !(r.reactants || []).length) continue;
    const chave = r.products.join('|');
    const dist = REACTIONS.filter((x) => x !== r && x.products?.length === r.products.length && x.products.join('|') !== chave);
    const mesma = dist.filter((x) => (x.categories || []).some((c) => (r.categories || []).includes(c)));
    const unicas = new Set(mesma.map((x) => x.products.join('|')));
    if (unicas.size < 3) fracos.push(`[${r.aula}] ${r.nome}  (${unicas.size} da mesma categoria)`);
  }
  console.log(`\nDistratores: ${fracos.length} reações têm menos de 3 alternativas erradas da mesma categoria (completam com outras reações de mesmo nº de produtos):`);
  fracos.forEach((f) => console.log('  - ' + f));
}
process.exit(novos.length ? 1 : 0);
