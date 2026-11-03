// Gera o site estático em ../site a partir dos dados em ../fonte.
//
//   cd tools && npm run build
//
// - desenha cada SMILES uma única vez com RDKit e grava em svgs.json;
// - classifica nucleófilo / eletrófilo de cada reação (tags automáticas);
// - carimba um build (hash do conteúdo) em index.html, sw.js e versao.json.
//   É esse carimbo que faz o aviso "Saiu uma versão nova" aparecer no celular.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import initRDKit from '@rdkit/rdkit';
import sharp from 'sharp';
import { lerMolblock, posicoesAtomos, marcarSetas } from './setas.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTE = path.join(raiz, 'fonte');
const SITE = path.join(raiz, 'site');

// ---------- dados ----------
const ctx = { window: { REACTIONS: [], CATEGORIES: [] } };
vm.createContext(ctx);
const arquivos = fs.readdirSync(path.join(FONTE, 'dados')).filter((f) => f.endsWith('.js')).sort();
arquivos.sort((a, b) => (a === 'reactions.js' ? -1 : b === 'reactions.js' ? 1 : a.localeCompare(b)));
for (const f of arquivos) vm.runInContext(fs.readFileSync(path.join(FONTE, 'dados', f), 'utf8'), ctx, { filename: f });
const { REACTIONS, CATEGORIES } = ctx.window;
const ctxG = { window: {} };
vm.createContext(ctxG);
vm.runInContext(fs.readFileSync(path.join(FONTE, 'guias/guias.js'), 'utf8'), ctxG, { filename: 'guias.js' });
const GUIAS = ctxG.window.GUIAS;

const AULAS = {
  '00': 'Exemplos básicos (meus)',
  '01b': 'Mecanismos de Reações Orgânicas',
  '02': 'Mecanismos de Reações Orgânicas – parte 2',
  '03': 'Orbitais de Fronteira e SN2 (p1)',
  '04': 'SN2 (p2), SN1 e Carbocátions',
  '05a': 'SN1 (p2), Postulado de Hammond, SN1 vs SN2',
  '05b': 'Aplicação do Postulado de Hammond',
  '06': 'Reações de Eliminação (p1)',
  '07': 'Reações de Eliminação (p2)',
  '08': 'Eliminação α, Carbenos, Radicais e Redução de Alcinos',
  '09': 'Adição Eletrofílica de Alcenos (p1)',
  '10': 'Adição Eletrofílica de Alcenos (p2)',
};
function idAula(txt) {
  const m = /Aula\s+(\d+)([ab]?)/i.exec(txt || '');
  if (!m) return '00';
  return m[1].padStart(2, '0') + m[2].toLowerCase();
}

// ---------- RDKit ----------
const RDKit = await initRDKit();
const qcache = new Map();
function qmol(smarts) {
  if (!qcache.has(smarts)) qcache.set(smarts, RDKit.get_qmol(smarts));
  return qcache.get(smarts);
}
function tem(mol, smarts) {
  const m = JSON.parse(mol.get_substruct_match(qmol(smarts)));
  return Array.isArray(m.atoms) && m.atoms.length > 0;
}

const estilos = new Map(); // style -> classe
function classeDe(style) {
  if (!estilos.has(style)) estilos.set(style, 's' + estilos.size);
  return estilos.get(style);
}
const svgPorSmiles = new Map();
const svgs = {};
const falhas = [];
const OPCOES_SVG = JSON.stringify({
  width: -1, height: -1, fixedBondLength: 26, bondLineWidth: 1.8, padding: 0.06,
  clearBackground: false, baseFontSize: 0.6, additionalAtomLabelPadding: 0.1,
  comicMode: false, addStereoAnnotation: false,
});
function limpaSvg(s) {
  return s
    .replace(/^[\s\S]*?<!-- END OF HEADER -->\s*/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<rect[^>]*\/>\s*/, '')
    .replace(/ class='[^']*'/g, '')
    .replace(/ style='([^']*)'/g, (_, st) => ` class='${classeDe(st)}'`)
    .replace(/\s+/g, ' ');
}
function desenhar(smiles) {
  if (svgPorSmiles.has(smiles)) return svgPorSmiles.get(smiles);
  const id = 'm' + svgPorSmiles.size.toString(36);
  svgPorSmiles.set(smiles, id);
  let mol = null;
  try { mol = RDKit.get_mol(smiles); } catch { mol = null; }
  if (!mol || !mol.is_valid()) { falhas.push(smiles); svgs[id] = null; mol?.delete(); return id; }
  try { mol.normalize_depiction(); } catch { /* segue com as coordenadas padrão */ }
  const s = mol.get_svg_with_highlights(OPCOES_SVG);
  mol.delete();
  const vb = /viewBox='([^']+)'/.exec(s)?.[1] || '0 0 200 150';
  svgs[id] = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}'>${limpaSvg(s)}</svg>`;
  return id;
}

// Estrutura com setas de elétrons (animáveis), posicionadas pelas coordenadas reais dos átomos.
const avisosSetas = [];
function desenharComSetas(smiles, setas, coords) {
  const chave = 'setas|' + smiles + '|' + JSON.stringify(setas) + JSON.stringify(coords || null);
  if (svgPorSmiles.has(chave)) return svgPorSmiles.get(chave);
  const id = 'm' + svgPorSmiles.size.toString(36);
  svgPorSmiles.set(chave, id);
  let mol = RDKit.get_mol(smiles, JSON.stringify({ removeHs: false }));
  if (!mol || !mol.is_valid()) { falhas.push(smiles); svgs[id] = null; mol?.delete(); return id; }
  mol.set_new_coords();
  if (coords) { // disposição escolhida à mão: troca as coordenadas no molblock e recarrega
    const l = mol.get_molblock().split('\n');
    const n = parseInt(l[3].slice(0, 3));
    if (coords.length !== n) avisosSetas.push(`${smiles}: ${coords.length} coordenadas para ${n} átomos`);
    for (let k = 0; k < Math.min(n, coords.length); k++) {
      l[4 + k] = (coords[k][0] * 1.5).toFixed(4).padStart(10) + (coords[k][1] * 1.5).toFixed(4).padStart(10) + '    0.0000' + l[4 + k].slice(30);
    }
    mol.delete();
    mol = RDKit.get_mol(l.join('\n'), JSON.stringify({ removeHs: false }));
  } else mol.normalize_depiction();
  const mb = lerMolblock(mol.get_molblock());
  const s = mol.get_svg_with_highlights(OPCOES_SVG);
  mol.delete();
  const { pos, rotulados } = posicoesAtomos(s, mb);
  const { svg: marcas, ext, avisos } = marcarSetas(pos, rotulados, mb.ligacoes, setas);
  avisos.forEach((a) => avisosSetas.push(`${smiles}: ${a}`));
  const [vx, vy, vw, vh] = (/viewBox='([^']+)'/.exec(s)?.[1] || '0 0 200 150').split(/\s+/).map(Number);
  const x0 = Math.min(vx, ext[0] - 8), y0 = Math.min(vy, ext[1] - 8), x1 = Math.max(vx + vw, ext[2] + 8), y1 = Math.max(vy + vh, ext[3] + 8);
  svgs[id] = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}'>${limpaSvg(s)}${marcas}</svg>`;
  return id;
}

// ---------- classificação nucleófilo / eletrófilo ----------
const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '⁻': '-', '⁺': '+', '–': '-', '−': '-', '•': '' };
const norm = (t) => (t || '').replace(/[₀-₉⁻⁺–−•]/g, (c) => SUB[c] ?? c);

const NU = [
  ['hidroxido', 'Hidróxido (HO⁻)', /(^|[^A-Za-z])(HO-|OH-)|NaOH|KOH|LiOH|Ba\(OH\)2/],
  ['alcoxido', 'Alcóxido (RO⁻)', /(^|[^A-Za-z])(RO-|EtO-|MeO-|CH3O-|CH3CH2O-|PhO-)|(Na|K|Li)O(?!H)[A-Z(]|[A-Za-z0-9)]O(Na|K|Li)(?![a-z])|olato|alc[oó]xido|et[oó]xido|met[oó]xido|fen[oó]xido/i],
  ['agua', 'Água (H₂O)', /(^|[^A-Za-z0-9])H2(¹⁸)?O(?![0-9])/],
  ['alcool', 'Álcool (ROH)', /MeOH|EtOH|CH3OH|CH3CH2OH|(^|[^A-Za-z])ROH|i-PrOH|metanol|etanol|[aá]lcool/i],
  ['haleto', 'Haleto (I⁻, Br⁻, Cl⁻, F⁻)', /(^|[^A-Za-z])(I-|Br-|Cl-|F-)|NaI|NaBr|NaCl|KI|KBr|KF|LiCl|LiBr|LiI|TBAF|Bu4N/],
  ['cianeto', 'Cianeto (CN⁻)', /(^|[^A-Za-z])(CN-|NaCN|KCN)|cianeto/i],
  ['azida', 'Azida (N₃⁻)', /N3-|NaN3|azida/i],
  ['amina', 'Amina / amônia', /NH3|NH2(?![A-Za-z])|Me2NH|Et2NH|Et3N|piperidina|R2NH|RNH2|amina|am[oô]nia/i],
  ['tiolato', 'Tiolato / tiol (RS⁻, HS⁻)', /HS-|RS-|NaSH|NaSR|NaSEt|NaSMe|tiol|SH-/i],
  ['carboxilato', 'Carboxilato (RCO₂⁻)', /(CH3CO2-|CH3COO-|RCO2-|RCOO-|AcO-|NaOAc|KOAc|CH3CO2Na|CH3CO2K|RCO2Na|acetato)(?!.*Hg)/],
  ['fosfina', 'Fosfina (PPh₃)', /PPh3|PR3|fosfina/i],
  ['hidreto', 'Hidreto (H⁻: LiAlH₄, NaBH₄…)', /LiAlH4|LAH|NaBH4|NaBH3CN|DIBAL|LiBH4|hidreto/i],
  ['organometalico', 'Organometálico (RMgX, RLi, R₂CuLi)', /MgBr|MgCl|MgI|MgX|RMgX|Grignard|BuLi|RLi|CH3Li|R2CuLi|cuprato|organomet/i],
  ['alcinideo', 'Acetileto / alcinídeo', /acetileto|alcin[ií]deo|C≡C-|≡C-|NaC≡|RC≡C/i],
  ['enolato', 'Enol / enolato', /enolat|enol(?![a-z])|LDA.*cetona/i],
  ['solvolise', 'Solvente nucleofílico (solvólise: HOAc, HCO₂H)', /solv[oó]lise|HOAc|AcOH|HCO2H|ac[eé]tolise/i],
  ['base', 'Base forte / volumosa (t-BuOK, LDA, DBU)', /t-BuOK|t-BuO-|KOtBu|KOt-Bu|tBuOK|LDA|DBU|DBN|NaNH2|NaH(?![a-z])|KH(?![a-z])|base volumosa|(^|[^A-Za-z])base(?![a-z])/i],
];
const EL_REAG = [
  ['hx', 'H–X (HBr, HCl, HI)', /(^|[^A-Za-z])(HBr|HCl|HI|HX)(?![a-z])/],
  ['halogenio', 'Halogênio (Br₂, Cl₂, I₂)', /(^|[^A-Za-z])(Br2|Cl2|I2)(?![0-9])/],
  ['nbs', 'NBS / NCS (halogênio radicalar)', /NBS|NCS/],
  ['acido', 'Ácido / H⁺ (H₃O⁺, H₂SO₄)', /H3O\+|H2SO4|H3PO4|TsOH|(^|[^A-Za-z])H\+|HA(?![a-z])|[aá]cido|H2SO4/i],
  ['mercurio', 'Mercúrio (Hg(OAc)₂)', /Hg/],
  ['borano', 'Borano (BH₃, 9-BBN)', /BH3|B2H6|9-BBN|BBN/],
  ['peroxiacido', 'Peroxiácido (mCPBA)', /mCPBA|MCPBA|RCO3H|peroxi/i],
  ['oxidante', 'Oxidante (OsO₄, KMnO₄, O₃)', /OsO4|KMnO4|(^|[^A-Za-z])O3(?![0-9])|ozon/i],
  ['carbeno', 'Carbeno / carbenoide', /CHCl3|CH2I2|CHBr3|CH2N2|carbeno|carbenoide|Simmons|:CCl2/i],
  ['sulfonil', 'Cloreto de sulfonila (TsCl, MsCl)', /TsCl|MsCl|TosCl|TfCl|Ts2O|Tf2O/],
  ['haleto-reag', 'Haleto de alquila (como reagente)', /CH3I|CH3Br|MeI|EtBr|EtI|RX|R-X|BnBr|haleto de alquila/],
  ['carbonila-reag', 'Carbonila (como reagente)', /acetona|CH3CHO|HCHO|CO2(?![a-z])|aldeido|cetona/i],
  ['ativador', 'Ativador de álcool (PBr₃, SOCl₂, PCl₅)', /PBr3|PCl3|PCl5|SOCl2|POCl3/],
  ['radical', 'Radical / iniciação (hν, In•, peróxido)', /(^|[^A-Za-z])In(?![a-z])|hν|luz|AIBN|ROOR|per[oó]xido|radical/i],
  ['hidrogenio', 'Hidrogênio (H₂ / catalisador)', /(^|[^A-Za-z])H2(?![0-9O])|Pd\/C|Lindlar|Pt\b|PtO2|Ni Raney/],
  ['sodio-amonia', 'Metal dissolvente (Na/NH₃)', /Na\/NH3|Li\/NH3|Na,\s*NH3/],
];
const EL_REAT = [
  ['haleto-metila', 'Haleto de metila (CH₃–X)', '[CH3][Cl,Br,I]'],
  ['haleto-1', 'Haleto de alquila primário', '[CH2;X4]([#6])[Cl,Br,I]'],
  ['haleto-2', 'Haleto de alquila secundário', '[CH1;X4]([#6])([#6])[Cl,Br,I]'],
  ['haleto-3', 'Haleto de alquila terciário', '[CH0;X4]([#6])([#6])([#6])[Cl,Br,I]'],
  ['haleto-alilico', 'Haleto alílico / benzílico', '[CX4]([Cl,Br,I])[$([CX3]=[CX3]),$(c)]'],
  ['haleto-vinilico', 'Haleto vinílico / arílico', '[$([CX3]=[CX3]),$(c)][Cl,Br,I]'],
  ['sulfonato', 'Sulfonato (OTs, OMs, OTf)', '[CX4]O[SX4](=O)(=O)'],
  ['epoxido', 'Epóxido', '[#6]1[#8][#6]1'],
  ['alcool', 'Álcool (após ativação)', '[CX4][OX2H]'],
  ['eter', 'Éter', '[CX4][OX2][CX4;!R]'],
  ['carbocation', 'Carbocátion', '[#6+]'],
  ['onium', 'Íon onium (oxônio, halônio, mercurínio)', '[O+,S+,Br+,Cl+,I+,Hg+;!$([O+]=*)]'],
  ['aldeido', 'Aldeído', '[CX3H1](=O)[#6,#1]'],
  ['cetona', 'Cetona', '[#6][CX3](=O)[#6]'],
  ['ester', 'Éster', '[#6][CX3](=O)[OX2][#6]'],
  ['acido-carb', 'Ácido carboxílico', '[CX3](=O)[OX2H1]'],
  ['amida', 'Amida', '[CX3](=O)[NX3]'],
  ['haleto-acila', 'Haleto de acila', '[CX3](=O)[Cl,Br]'],
  ['nitrila', 'Nitrila', '[CX2]#N'],
  ['sulfonil', 'Cloreto de sulfonila (TsCl, MsCl)', '[SX4](=O)(=O)[Cl,Br]'],
  ['amonio', 'Sal de amônio quaternário (Hofmann)', '[NX4+]'],
];
const PI = [
  ['alceno', 'Alceno (ligação π)', '[CX3;!$(C=[O,N])]=[CX3;!$(C=[O,N])]'],
  ['alcino', 'Alcino (ligação π)', '[CX2]#[CX2]'],
  ['aromatico', 'Aromático (anel π)', 'c1ccccc1'],
];
const LISTA_NU = new Map(), LISTA_EL = new Map();
for (const [id, nome] of NU) LISTA_NU.set(id, nome);
for (const [id, nome] of PI) LISTA_NU.set(id, nome);
LISTA_NU.set('outros', 'Sem nucleófilo externo (rearranjo, intramolecular, radical)');
for (const [id, nome] of EL_REAT) LISTA_EL.set(id, nome);
for (const [id, nome] of EL_REAG) LISTA_EL.set(id, nome);
LISTA_EL.set('outros', 'Sem eletrófilo externo / outros');

function classificar(r) {
  const reag = norm(`${r.reagents || ''} ${r.conditions || ''}`);
  const nu = new Set(), el = new Set();
  const mols = (r.reactants || []).map((s) => { try { return RDKit.get_mol(s); } catch { return null; } });
  const ok = mols.filter((m) => m && m.is_valid());
  const elReat = new Set();
  for (const m of ok) for (const [id, , sm] of EL_REAT) if (tem(m, sm)) elReat.add(id);
  // haletos: ficam só no grau mais específico
  if (elReat.has('haleto-alilico')) { /* mantém junto do grau */ }
  for (const id of elReat) el.add(id);
  if (elReat.has('haleto-vinilico') && elReat.size > 1) el.delete('haleto-vinilico');
  if (elReat.has('alcool') && elReat.size > 1) el.delete('alcool');
  if (elReat.has('eter') && (elReat.has('epoxido') || elReat.size > 1)) el.delete('eter');
  const temAlvo = [...el].some((x) => !['alcool', 'eter'].includes(x));
  for (const m of ok) for (const [id, , sm] of PI) if (tem(m, sm)) nu.add(id);
  for (const [id, , re] of NU) if (re.test(reag)) nu.add(id);
  for (const [id, , re] of EL_REAG) if (re.test(reag)) el.add(id);
  // reagentes que são nucleófilos de fato nos reagentes: remove "haleto" quando HX é só ácido
  if (el.has('hx') && (el.has('alcool') || el.has('epoxido') || el.has('eter') || el.has('onium'))) nu.add('haleto');
  if (/Hg|OAc/.test(reag) && nu.has('carboxilato')) nu.delete('carboxilato');
  // reagentes como reagente-substrato
  for (const s of r.reactants || []) {
    if (s === 'O') nu.add('agua');
    if (/^[CO]+$/.test(s) && /O$/.test(s) && s.length <= 4 && temAlvo) nu.add('alcool');
  }
  for (const m of ok) {
    if (temAlvo && tem(m, '[NX3;H2,H1,H0;!$(NC=[O,S]);!$(N-[#6]=[#6,#7])]([#6,#1])')) nu.add('amina');
    if (temAlvo && tem(m, '[CX4][OX2H]') && !nu.has('alcool') && ok.length > 1) nu.add('alcool');
  }
  if (el.has('ativador')) nu.add('haleto');
  if ((r.categories || []).some((c) => c === 'e2' || c === 'e1') && (nu.has('hidroxido') || nu.has('alcoxido') || nu.has('amina') || /base/i.test(reag))) nu.add('base');
  const carbonilaReat = ['aldeido', 'cetona', 'ester', 'amida', 'haleto-acila', 'acido-carb'].some((x) => elReat.has(x));
  if (elReat.has('alcool') && (carbonilaReat || el.has('acido'))) nu.add('alcool');
  // alceno com ácido/halogênio etc. => o eletrófilo está no reagente (já capturado)
  mols.forEach((m) => m && m.delete());
  if (!nu.size) nu.add('outros');
  if (!el.size) el.add('outros');
  return { nu: [...nu], el: [...el] };
}

// ---------- monta dados ----------
const slideIni = (s) => parseInt(/\d+/.exec(s || '')?.[0] || '0', 10);
const ordenadas = REACTIONS.map((r, i) => ({ r, i, aula: idAula(r.aula) })).sort((a, b) =>
  a.aula.localeCompare(b.aula) || slideIni(a.r.slides) - slideIni(b.r.slides) || a.i - b.i);

const reacoes = ordenadas.map(({ r, aula }, n) => {
  const { nu, el } = classificar(r);
  const sv = (arr) => (arr || []).map(desenhar);
  const o = {
    i: n + 1, a: aula, s: r.slides || '', n: r.nome, c: r.categories || [], nu, el,
    rg: r.reagents || '', cd: r.conditions || '',
    r: sv(r.reactants), p: sv(r.products), nt: r.notas || '',
    m: (r.mecanismo || []).map((m) => ({ t: m.titulo, x: m.texto, s: sv(m.smiles) })),
  };
  return o;
});

const contar = (campo) => {
  const c = {};
  reacoes.forEach((r) => r[campo].forEach((x) => (c[x] = (c[x] || 0) + 1)));
  return c;
};
const cNu = contar('nu'), cEl = contar('el'), cCat = contar('c'), cAula = {};
reacoes.forEach((r) => (cAula[r.a] = (cAula[r.a] || 0) + 1));
const lista = (mapa, cont) => [...mapa].filter(([id]) => cont[id]).map(([id, nome]) => ({ id, nome, n: cont[id] })).sort((a, b) => (a.id === 'outros') - (b.id === 'outros') || b.n - a.n);

// ---------- guias ----------
const celula = (c) => Array.isArray(c) ? c.map(celula) : (c && typeof c === 'object' && c.s ? { s: desenhar(c.s) } : c);
const guias = GUIAS.map((g) => ({
  id: g.id, curto: g.curto, topo: g.topo || '', t: g.titulo, sub: g.sub, cats: g.cats, intro: g.intro,
  esq: { r: g.esquema.r.map(desenhar), rg: g.esquema.rg, cd: g.esquema.cd, p: g.esquema.p.map(desenhar), leg: g.esquema.leg },
  bl: g.blocos.map((b) => b.k === 'l' ? { k: 'l', t: b.titulo, itens: b.itens } : b.k === 'm' ?
    { k: 'm', t: b.titulo, nota: b.nota || '', passos: b.passos.map((p) => ({ t: p.titulo, x: p.texto, r: desenharComSetas(p.de, p.setas, p.coords), p: desenhar(p.para) })) } :
    { k: 't', t: b.titulo, cols: b.cols, rows: b.rows.map((l) => l.map(celula)), nota: b.nota || '', ord: b.ordens || null }),
}));

// ---------- build ----------
fs.mkdirSync(SITE, { recursive: true });
const dados = {
  aulas: Object.entries(AULAS).sort((a, b) => a[0].localeCompare(b[0])).filter(([id]) => cAula[id]).map(([id, nome]) => ({ id, nome, n: cAula[id] })),
  categorias: CATEGORIES.filter((c) => cCat[c.id]).map((c) => ({ id: c.id, nome: c.nome, n: cCat[c.id] })),
  nucleofilos: lista(LISTA_NU, cNu),
  eletrofilos: lista(LISTA_EL, cEl),
  guias,
  reacoes,
};
const dadosTxt = JSON.stringify(dados);
const svgsTxt = JSON.stringify(svgs);
const css = fs.readFileSync(path.join(FONTE, 'app/style.css'), 'utf8') +
  '\n/* estilos das estruturas (gerado) */\n' + [...estilos].map(([st, c]) => `.${c}{${st}}`).join('') + '\n';
const js = fs.readFileSync(path.join(FONTE, 'app/app.js'), 'utf8');
const motionJs = fs.readFileSync(path.join(raiz, 'tools/node_modules/motion/dist/motion.js'), 'utf8');
const swFonte = fs.readFileSync(path.join(FONTE, 'app/sw.js'), 'utf8');
const htmlFonte = fs.readFileSync(path.join(FONTE, 'app/index.template.html'), 'utf8');

const build = crypto.createHash('sha1').update(dadosTxt).update(svgsTxt).update(css).update(js).update(motionJs).update(fs.readFileSync(path.join(FONTE, 'app/dino.png'))).update(fs.readFileSync(path.join(FONTE, 'app/dino-vetor.json'))).update(fs.readFileSync(path.join(raiz, 'tools/node_modules/gsap/dist/gsap.min.js'))).update(swFonte).update(htmlFonte)
  .digest('hex').slice(0, 10);

const V = `?v=${build}`;
const html = htmlFonte.replaceAll('__BUILD__', build);
const sw = swFonte.replaceAll('__BUILD__', build);
const write = (nome, txt) => fs.writeFileSync(path.join(SITE, nome), txt);
write('index.html', html);
write('app.js', js.replaceAll('__BUILD__', build));
write('style.css', css);
write('motion.js', motionJs);
write('dados.json', dadosTxt);
write('svgs.json', svgsTxt);
write('sw.js', sw);
write('versao.json', JSON.stringify({ build }) + '\n');
fs.copyFileSync(path.join(FONTE, 'app/manifest.webmanifest'), path.join(SITE, 'manifest.webmanifest'));
fs.copyFileSync(path.join(FONTE, 'app/icone.svg'), path.join(SITE, 'icone.svg'));
fs.copyFileSync(path.join(FONTE, 'app/dino.png'), path.join(SITE, 'dino.png'));
fs.copyFileSync(path.join(FONTE, 'app/dino-vetor.json'), path.join(SITE, 'dino-vetor.json'));
for (const f of ['gsap.min.js', 'DrawSVGPlugin.min.js', 'SplitText.min.js']) fs.copyFileSync(path.join(raiz, 'tools/node_modules/gsap/dist', f), path.join(SITE, f));
for (const [nome, t] of [['icone-192.png', 192], ['icone-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(path.join(FONTE, 'app/icone.svg'), { density: 384 }).resize(t, t).png().toFile(path.join(SITE, nome));
}

const kb = (s) => Math.round(Buffer.byteLength(s) / 1024);
console.log(`build ${build}: ${reacoes.length} reações, ${svgPorSmiles.size} estruturas`);
console.log(`dados.json ${kb(dadosTxt)} KB · svgs.json ${kb(svgsTxt)} KB · estilos ${estilos.size}`);
if (avisosSetas.length) console.log('AVISOS DE SETAS:', avisosSetas);
console.log(`SMILES que o RDKit não leu (${falhas.length}):`, falhas.slice(0, 40));
console.log('Nu:', dados.nucleofilos.map((x) => `${x.nome}=${x.n}`).join(' | '));
console.log('El:', dados.eletrofilos.map((x) => `${x.nome}=${x.n}`).join(' | '));
void V;
