// Aula 03 – Orbitais de fronteira e SN2 (p1). Slides lidos: 40–59.
window.REACTIONS.push(
  {
    aula: 'Aula 03', slides: '41–42',
    nome: 'HO⁻ + CH₃Cl (SN2 modelo)',
    categories: ['sn2'],
    reactants: ['CCl'], reagents: 'HO⁻', conditions: '60 °C',
    products: ['CO'],
    notas: 'Processo de <b>uma única etapa</b>, sem intermediário: a ligação Nu–C se forma ao mesmo tempo em que C–LG se rompe. Termodinâmica: ΔG° = −100 kJ/mol, ΔG‡ = 103 kJ/mol, ΔH° = −75 kJ/mol, K = 5×10¹⁵. O ataque pela frente (front-side) é impossível: o orbital do Nu interage com σ* de forma antiligante em um lado e ligante no outro.',
    mecanismo: [
      { titulo: 'Ataque pela retaguarda (estado de transição ‡)', texto: 'HO⁻ ataca o carbono a 180° do Cl. No estado de transição o carbono é pentacoordenado, com δ⁻ no HO e no Cl; depois sai Cl⁻.', smiles: ['CCl', 'CO'] },
    ],
  },
  {
    aula: 'Aula 03', slides: '47',
    nome: '(R)-2-Bromo-octano + HO⁻ → (S)-octan-2-ol',
    categories: ['sn2'],
    reactants: ['CCCCCCC(C)Br'], reagents: 'HO⁻', conditions: 'SN2',
    products: ['CCCCCCC(C)O'],
    notas: '<b>Inversão completa de configuração</b> no carbono quiral. (R)-(–)-2-bromo-octano, [α]²⁵_D = –34,25°, pureza óptica 100% → (S)-(+)-octan-2-ol, [α]²⁵_D = +9,90°, pureza óptica 100%. A estereoquímica dos desenhos foi omitida; a configuração está indicada no nome.',
    mecanismo: [],
  },
  {
    aula: 'Aula 03', slides: '48–49',
    nome: 'cis-1-Cloro-3-metilciclopentano + HO⁻ → trans-3-metilciclopentanol',
    categories: ['sn2'],
    reactants: ['CC1CCC(Cl)C1'], reagents: 'HO⁻', conditions: 'SN2',
    products: ['CC1CCC(O)C1'],
    notas: 'O grupo abandonador sai por cima e o nucleófilo ataca por baixo: o produto é <b>trans</b>. A SN2 é <b>estereoespecífica</b>: a estereoquímica do material de partida determina a do produto. A relação cis/trans está no nome; os desenhos não mostram a estereoquímica.',
    mecanismo: [],
  },
  {
    aula: 'Aula 03', slides: '50–51',
    nome: 'Álcool → tosilato (TsCl, piridina)',
    categories: ['sn2'],
    reactants: ['CCC(C)O', 'Cc1ccc(cc1)S(=O)(=O)Cl'], reagents: 'piridina', conditions: '– piridina·HCl',
    products: ['CCC(C)OS(=O)(=O)c1ccc(C)cc1'],
    notas: 'Transforma o OH (mau grupo abandonador) em <b>OTs</b> (bom grupo abandonador). O ataque ocorre no enxofre, então <b>não há alteração no carbono quiral: retenção de configuração</b>. A ligação S–Cl (277 kJ/mol) é mais fraca que S–O (521,8 kJ/mol), o que favorece a reação. Usei butan-2-ol como exemplo; a aula usa R e R′ genéricos.',
    mecanismo: [
      { titulo: 'Ataque do álcool ao enxofre', texto: 'O oxigênio ataca o S e o Cl⁻ sai, formando o oxônio O⁺–Ts.', smiles: ['CCC(C)O', 'CCC(C)[OH+]S(=O)(=O)c1ccc(C)cc1'] },
      { titulo: 'Desprotonação pela piridina', texto: 'A piridina remove o H⁺ e fornece o tosilato.', smiles: ['CCC(C)[OH+]S(=O)(=O)c1ccc(C)cc1', 'CCC(C)OS(=O)(=O)c1ccc(C)cc1'] },
    ],
  },
  {
    aula: 'Aula 03', slides: '51–52',
    nome: 'Tosilato + Nu⁻ (SN2 com inversão)',
    categories: ['sn2'],
    reactants: ['CCC(C)OS(=O)(=O)c1ccc(C)cc1'], reagents: 'CH₃CO₂⁻', conditions: 'SN2',
    products: ['CCC(C)OC(C)=O'],
    notas: 'Etapa 2 do ciclo de Walden: o Nu⁻ desloca o TsO⁻ pela retaguarda, com <b>inversão de configuração</b>. Combinando as duas etapas (tosilação com retenção + SN2 com inversão), o resultado líquido é a inversão do álcool de partida. Na aula: (+)-1-fenil-propan-2-ol (R) → tosilato (R) → acetato (S) → hidrólise → (–)-1-fenil-propan-2-ol (S). Butan-2-ol é um exemplo meu.',
    mecanismo: [],
  }
);
