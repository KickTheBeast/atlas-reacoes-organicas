// Aula 5b – Aplicação do Postulado de Hammond (solvólise do cloreto de terc-butila, SN1). Slides lidos: 1–13.
window.REACTIONS.push(
  {
    aula: 'Aula 5b', slides: '2',
    nome: 'Solvólise do brometo de terc-butila em água',
    categories: ['sn1'],
    reactants: ['CC(C)(C)Br'], reagents: 'H₂O', conditions: 'solvólise (o solvente é o nucleófilo)',
    products: ['CC(C)(C)O'],
    notas: 'Quando o <b>nucleófilo é o solvente</b>, a reação é chamada de <b>solvólise</b>. Como a concentração do solvente praticamente não varia, a velocidade parece depender só do substrato: reação de <b>pseudo-primeira ordem</b>. Subproduto: HBr.',
    mecanismo: [],
  },
  {
    aula: 'Aula 5b', slides: '2',
    nome: 'Solvólise do cloreto de terc-butila em metanol',
    categories: ['sn1'],
    reactants: ['CC(C)(C)Cl'], reagents: 'CH₃OH', conditions: 'solvólise',
    products: ['CC(C)(C)OC'],
    notas: 'Solvólise (metanólise): o metanol é solvente e nucleófilo. Pseudo-primeira ordem, pois [CH₃OH] praticamente não muda. Subproduto: HCl.',
    mecanismo: [],
  },
  {
    aula: 'Aula 5b', slides: '2',
    nome: 'Solvólise do cloreto de terc-butila em ácido fórmico',
    categories: ['sn1'],
    reactants: ['CC(C)(C)Cl'], reagents: 'HCO₂H', conditions: 'solvólise',
    products: ['CC(C)(C)OC=O'],
    notas: 'Solvólise (formólise): o ácido fórmico é solvente e nucleófilo, e o produto é o formiato de terc-butila. Pseudo-primeira ordem. Subproduto: HCl.',
    mecanismo: [],
  },
  {
    aula: 'Aula 5b', slides: '3–6, 10–13',
    nome: 'Solvólise do cloreto de terc-butila em água/acetona (SN1 e Postulado de Hammond)',
    categories: ['sn1'],
    reactants: ['CC(C)(C)Cl'], reagents: 'H₂O', conditions: 'água/acetona (70:30, 60:40 ou 80:20), 25 °C',
    products: ['CC(C)(C)O'],
    notas: 'Mecanismo <b>SN1</b>: velocidade = k[RX], sem água nem acetona na lei de velocidade. A etapa 1 (ionização, lenta) tem o maior ΔG‡. A cinética foi acompanhada por NaOH (10% em mol do RX) com indicador azul de bromofenol (amarelo abaixo de pH 3,0, azul acima de 4,6): mede-se o tempo t para consumir 10% do RX, e <b>k = 0,105/t</b> (ln 0,9 ≈ −0,105). Tempos médios a 25 °C: 60% H₂O = 55 s, 70% = 38 s, 80% = 14 s, ou seja, k aumenta com a proporção de água. <b>Postulado de Hammond:</b> a formação do carbocátion é endotérmica/endergônica, então o estado de transição se parece com o carbocátion e o Cl⁻ (íons). A água solvata bem íons (a acetona não), o que estabiliza o ET, diminui a Ea e acelera a reação. Os dados de polaridade do slide 3 (água 78 D, acetona 21 D) estão assim no slide.',
    mecanismo: [
      { titulo: 'Etapa 1 (lenta): ionização', texto: 'A ligação C–Cl se polariza (δ⁺/δ⁻) e rompe heteroliticamente, dando o carbocátion terc-butila e Cl⁻. É a etapa determinante da velocidade; o ET tem caráter iônico.', smiles: ['CC(C)(C)Cl', 'C[C+](C)C'] },
      { titulo: 'Etapa 2: ataque da água ao carbocátion', texto: 'H₂O (nucleófilo e solvente) ataca o carbono catiônico e forma o oxônio terc-butil-OH₂⁺.', smiles: ['C[C+](C)C', 'CC(C)(C)[OH2+]'] },
      { titulo: 'Etapa 3: desprotonação', texto: 'Outra molécula de H₂O remove H⁺ e fornece terc-butanol e H₃O⁺.', smiles: ['CC(C)(C)[OH2+]', 'CC(C)(C)O'] },
    ],
  }
);
