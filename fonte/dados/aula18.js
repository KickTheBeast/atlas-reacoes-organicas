// Aula 18 – Orbitais moleculares (alila, butadieno, acroleína) e introdução à adição conjugada. Slides lidos: 33–47.
((R) => {
  const A = 'Aula 18', C = ['adicao-conjugada'];
  R.push(
  { aula: A, slides: '34–38', nome: 'Propenal (acroleína) + CH₃O⁻ (CH₃OH) → 3-metoxipropanal (adição conjugada)',
    categories: C, reactants: ['C=CC=O', 'C[O-]'], reagents: 'CH₃O⁻, CH₃OH', conditions: '',
    products: ['COCCC=O'],
    notas: 'A conjugação com C=O torna o alceno <b>eletrofílico</b>: o nucleófilo ataca o carbono β (maior coeficiente do LUMO) e a carga negativa fica no oxigênio (enolato). A protonação do enolato dá o produto saturado. Para comparar: butadieno e acroleína têm OMs parecidos, mas o O distorce o LUMO: o maior coeficiente fica no C β.',
    mecanismo: [
      { titulo: 'Ataque do nucleófilo ao carbono β', texto: 'O HOMO do CH₃O⁻ doa para o LUMO do C=C–C=O; forma-se o enolato.', smiles: ['C=CC=O', 'COCC=C[O-]'] },
      { titulo: 'Protonação do enolato', texto: 'O CH₃OH protona o carbono α (tautomerização) e regenera o alcóxido.', smiles: ['COCC=C[O-]', 'COCCC=O'] },
    ] },
  { aula: A, slides: '45', nome: 'But-3-en-2-ona (metil vinil cetona) + HCl → 4-clorobutan-2-ona (meio ácido)',
    categories: C, reactants: ['C=CC(C)=O', 'Cl'], reagents: 'HCl', conditions: '',
    products: ['CC(=O)CCCl'],
    notas: 'Em meio ácido o C=O é protonado (a enona fica <b>mais eletrofílica</b>); o Cl⁻ ataca o carbono β e forma um enol, que tautomeriza para a cetona.', mecanismo: [] },
  { aula: A, slides: '46', nome: '(E)-Pent-2-enal + álcool alílico, NaOH, H₂O, −5 °C → 3-(aliloxi)pentanal (60%)',
    categories: C, reactants: ['CCC=CC=O', 'C=CCO'], reagents: 'NaOH', conditions: 'H₂O, −5 °C',
    products: ['CCC(OCC=C)CC=O'],
    notas: 'Uma pequena quantidade de alcóxido (formada pela base) faz a adição conjugada; o enolato é protonado e regenera a base (catálise).', mecanismo: [] },
  { aula: A, slides: '47', nome: '4-Metilpent-3-en-2-ona + Me₂NH, 50 °C → 4-(dimetilamino)-4-metilpentan-2-ona (50%)',
    categories: C, reactants: ['CC(C)=CC(C)=O', 'CNC'], reagents: 'Me₂NH', conditions: '50 °C, 1 h (sistema selado)',
    products: ['CC(=O)CC(C)(C)N(C)C'],
    notas: 'Aminas são bons nucleófilos para adição conjugada (adição aza-Michael). A dimetilamina é gás à temperatura ambiente, por isso usa-se sistema fechado.', mecanismo: [] }
  );
})(window.REACTIONS);
