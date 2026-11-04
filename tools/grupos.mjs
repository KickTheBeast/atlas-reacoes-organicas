// Grupos funcionais reconhecidos (SMARTS) para a "busca por transformação": de grupo A → grupo B.
export const GRUPOS = [
  { id: 'alcano', nome: 'Alcano / cicloalcano', smarts: ['[CX4;!$(C[!#6;!#1])]'], so: true },
  { id: 'alceno', nome: 'Alceno', smarts: ['[CX3;!$(C=O);!a]=[CX3;!a]'] },
  { id: 'alcino', nome: 'Alcino', smarts: ['[CX2]#[CX2]'] },
  { id: 'aromatico', nome: 'Aromático (benzeno)', smarts: ['c1ccccc1'] },
  { id: 'haleto', nome: 'Haleto de alquila', smarts: ['[CX4][F,Cl,Br,I]'] },
  { id: 'haleto-sp2', nome: 'Haleto vinílico / arílico', smarts: ['[c,$([CX3]=[CX3])][F,Cl,Br,I]'] },
  { id: 'alcool', nome: 'Álcool', smarts: ['[CX4][OX2H]'] },
  { id: 'fenol', nome: 'Fenol', smarts: ['c[OX2H]'] },
  { id: 'diol', nome: 'Diol vicinal', smarts: ['[OX2H][CX4][CX4][OX2H]'] },
  { id: 'eter', nome: 'Éter', smarts: ['[OX2;!R;!$(O[CX3]=O)]([CX4,c])[CX4,c]'] },
  { id: 'epoxido', nome: 'Epóxido', smarts: ['[C;r3]1[O;r3][C;r3]1'] },
  { id: 'aldeido', nome: 'Aldeído', smarts: ['[CX3H1](=O)[#6]'] },
  { id: 'cetona', nome: 'Cetona', smarts: ['[#6][CX3](=O)[#6]'] },
  { id: 'acido', nome: 'Ácido carboxílico', smarts: ['[CX3](=O)[OX2H1]'] },
  { id: 'ester', nome: 'Éster', smarts: ['[CX3](=O)[OX2][#6]'] },
  { id: 'cloreto-acila', nome: 'Haleto de acila', smarts: ['[CX3](=O)[Cl,Br]'] },
  { id: 'amida', nome: 'Amida', smarts: ['[CX3](=O)[NX3]'] },
  { id: 'nitrila', nome: 'Nitrila', smarts: ['[CX2]#[NX1]'] },
  { id: 'amina', nome: 'Amina', smarts: ['[NX3;!$(N=*);!$(N[CX3]=O);!$([N+]);!$(N-[N,O,S])]'] },
  { id: 'amonio', nome: 'Sal de amônio quaternário', smarts: ['[NX4+]([#6])([#6])([#6])[#6]'] },
  { id: 'nitro', nome: 'Nitro', smarts: ['[N+](=O)[O-]'] },
  { id: 'diazonio', nome: 'Sal de diazônio', smarts: ['[#6][N+]#N'] },
  { id: 'tiol', nome: 'Tiol / tioéter', smarts: ['[SX2][#6,#1]', '[SX2H]'] },
  { id: 'sulfonico', nome: 'Ácido sulfônico', smarts: ['[#6]S(=O)(=O)[OX2H]'] },
  { id: 'sulfonato', nome: 'Sulfonato (tosilato, mesilato)', smarts: ['[#6]S(=O)(=O)O[#6]'] },
  { id: 'organometalico', nome: 'Organometálico (Grignard, RLi)', smarts: ['[#6][Mg,Li,Cu,Zn]'] },
  { id: 'carbocation', nome: 'Carbocátion', smarts: ['[#6+;!$([#6]~[#7,#8,#16])]'] },
  { id: 'enolato', nome: 'Enolato / carbânion', smarts: ['[#6-]', '[O-][CX3]=[CX3]'] },
  { id: 'alcoxido', nome: 'Alcóxido', smarts: ['[CX4][OX1-]'] },
];

/** Grupos presentes numa molécula (conjunto de ids). `tem` testa um SMARTS. */
export function gruposDe(mol, tem) {
  const ids = new Set();
  for (const g of GRUPOS) if (!g.so && g.smarts.some((s) => tem(mol, s))) ids.add(g.id);
  // alcano: só carbono/hidrogênio saturado, sem nenhum outro grupo
  if (!ids.size && tem(mol, '[CX4]') ) ids.add('alcano');
  return ids;
}
