// Estereoquímica desenhada (cunhas e tracejados) para reações em que ela é o ponto central.
//
// O desenho de cada estrutura é VALIDADO no build: o RDKit calcula R/S (cip) ou E/Z (ez) a partir do SMILES e o
// build escolhe a orientação dos símbolos @ ou / que bate com o que está escrito aqui. Se nenhuma bater, o build
// avisa e a reação continua com o desenho sem estereoquímica (nunca publica um desenho errado).
//   { s: 'SMILES', cip: ['R', 'S'] }   centros quirais (em qualquer ordem)
//   { s: 'SMILES', ez: 'E' }           ligação dupla
// n: início do nome da reação; a: id da aula.
window.ESTEREO = [
  // ---- SN2: inversão ----
  { a: '03', n: '(R)-2-Bromo-octano + HO', r: [{ s: 'CCCCCC[C@H](C)Br', cip: ['R'] }], p: [{ s: 'CCCCCC[C@H](C)O', cip: ['S'] }] },
  { a: '05a', n: 'Ácido (R)-2-bromopropanoico + NaOH', r: [{ s: 'C[C@H](Br)C(=O)O', cip: ['R'] }], p: [{ s: 'C[C@H](O)C(=O)O', cip: ['S'] }] },
  { a: '06', n: '(R)-Octan-2-ol + PBr₃', r: [{ s: 'CCCCCC[C@H](C)O', cip: ['R'] }], p: [{ s: 'CCCCCC[C@H](C)Br', cip: ['S'] }] },
  { a: '06', n: '(S)-2-Bromo-octano + EtO', r: [{ s: 'CCCCCC[C@H](C)Br', cip: ['S'] }], p: [{ s: 'CCCCCC[C@H](C)OCC', cip: ['R'] }] },
  { a: '07', n: '(S)-2-Bromobutano + HS', r: [{ s: 'CC[C@H](C)Br', cip: ['S'] }], p: [{ s: 'CC[C@H](C)S', cip: ['R'] }] },
  { a: '06', n: '(R)-Tosilato + EtO', r: [{ s: 'CCCCCC[C@H](C)OS(=O)(=O)c1ccc(C)cc1', cip: ['R'] }], p: [{ s: 'CCCCCC[C@H](C)OCC', cip: ['S'] }] },
  { a: '06', n: '(R)-Octan-2-ol + TsCl', r: [{ s: 'CCCCCC[C@H](C)O', cip: ['R'] }, 'Cc1ccc(cc1)S(=O)(=O)Cl'], p: [{ s: 'CCCCCC[C@H](C)OS(=O)(=O)c1ccc(C)cc1', cip: ['R'] }] },
  // ---- SN1: racemização (parcial) ----
  { a: '05a', n: '(S)-3-Bromo-3-metil-hexano + H₂O', r: [{ s: 'CCC[C@](C)(Br)CC', cip: ['S'] }, 'O'], p: [{ s: 'CCC[C@](C)(O)CC', cip: ['R'] }, { s: 'CCC[C@](C)(O)CC', cip: ['S'] }] },
  { a: '05a', n: '(R)-2-Bromo-octano + H₂O', r: [{ s: 'CCCCCC[C@H](C)Br', cip: ['R'] }, 'O'], p: [{ s: 'CCCCCC[C@H](C)O', cip: ['S'] }, { s: 'CCCCCC[C@H](C)O', cip: ['R'] }] },
  // ---- adição de halogênio (anti) ----
  { a: '09', n: '(E)-But-2-eno + Br₂', r: [{ s: 'C/C=C/C', ez: 'E' }, 'BrBr'], p: [{ s: 'C[C@H](Br)[C@@H](C)Br', cip: ['R', 'S'] }] },
  { a: '09', n: '(Z)-But-2-eno + Br₂', r: [{ s: 'C/C=C\\C', ez: 'Z' }, 'BrBr'], p: [{ s: 'C[C@H](Br)[C@H](C)Br', cip: ['R', 'R'] }, { s: 'C[C@H](Br)[C@H](C)Br', cip: ['S', 'S'] }] },
  { a: '09', n: 'Ciclopenteno + Br₂ → trans-1,2-dibromociclopentano', r: ['C1=CCCC1', 'BrBr'], p: [{ s: 'Br[C@H]1CCC[C@@H]1Br', cip: ['R', 'R'] }, { s: 'Br[C@H]1CCC[C@@H]1Br', cip: ['S', 'S'] }] },
  // ---- di-hidroxilação syn (OsO₄, KMnO₄ frio) ----
  { a: '10', n: 'Ciclo-hexeno + OsO₄, depois NaHSO₃', r: ['C1=CCCCC1'], p: [{ s: 'O[C@H]1CCCC[C@@H]1O', cip: ['R', 'S'] }] },
  { a: '10', n: 'Ciclo-hexeno + KMnO₄ (HO⁻, 5 °C)', r: ['C1=CCCCC1'], p: [{ s: 'O[C@H]1CCCC[C@@H]1O', cip: ['R', 'S'] }] },
  { a: '10', n: 'trans-But-2-eno + OsO₄ (cat.)', r: [{ s: 'C/C=C/C', ez: 'E' }], p: [{ s: 'C[C@H](O)[C@H](C)O', cip: ['R', 'R'] }, { s: 'C[C@H](O)[C@H](C)O', cip: ['S', 'S'] }] },
  // ---- epóxido + H₃O⁺ (anti) ----
  { a: '10', n: 'trans-But-2-eno + MCPBA, depois H₃O⁺', r: [{ s: 'C/C=C/C', ez: 'E' }], p: [{ s: 'C[C@H](O)[C@@H](C)O', cip: ['R', 'S'] }] },
  { a: '10', n: 'cis-But-2-eno + MCPBA, depois H₃O⁺', r: [{ s: 'C/C=C\\C', ez: 'Z' }], p: [{ s: 'C[C@H](O)[C@H](C)O', cip: ['R', 'R'] }, { s: 'C[C@H](O)[C@H](C)O', cip: ['S', 'S'] }] },
  // ---- carbenos (adição syn: a geometria se conserva) ----
  { a: '08', n: 'cis-But-2-eno + :CH₂', r: [{ s: 'C/C=C\\C', ez: 'Z' }, '[CH2]'], p: [{ s: 'C[C@H]1C[C@@H]1C', cip: ['R', 'S'] }] },
  { a: '08', n: '(Z)-But-2-eno + CHBr₃/t-BuOK', r: [{ s: 'C/C=C\\C', ez: 'Z' }], p: [{ s: 'C[C@H]1[C@@H](C)C1(Br)Br', cip: ['R', 'S'] }] },
  // ---- redução de alcinos ----
  { a: '08', n: 'Hex-3-ino + H₂/Lindlar', r: ['CCC#CCC'], p: [{ s: 'CC/C=C\\CC', ez: 'Z' }] },
  { a: '08', n: 'Hex-3-ino + Na/NH₃', r: ['CCC#CCC'], p: [{ s: 'CC/C=C/CC', ez: 'E' }] },
  { a: '08', n: 'Oct-4-ino + Li', r: ['CCCC#CCCC'], p: [{ s: 'CCC/C=C/CCC', ez: 'E' }] },
  // ---- eliminação ----
  { a: '06', n: '1-Fenilpropan-1-ol + H⁺', r: ['CCC(O)c1ccccc1'], p: [{ s: 'C/C=C/c1ccccc1', ez: 'E' }, { s: 'C/C=C\\c1ccccc1', ez: 'Z' }] },
  { a: '06', n: 'meso-1,2-Dibromo-1,2-difeniletano', r: [{ s: 'Br[C@H](c1ccccc1)[C@@H](Br)c1ccccc1', cip: ['R', 'S'] }], p: [{ s: 'Br/C(c1ccccc1)=C/c1ccccc1', ez: 'E' }] },
];
