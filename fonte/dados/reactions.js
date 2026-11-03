// Para adicionar uma reação: copie um bloco de REACTIONS e troque os dados.
// Estruturas são escritas em SMILES e desenhadas automaticamente no navegador.
window.CATEGORIES = [
  { id: 'sn2', nome: 'SN2' },
  { id: 'sn1', nome: 'SN1' },
  { id: 'e1', nome: 'E1' },
  { id: 'e2', nome: 'E2' },
  { id: 'adicao-alcenos', nome: 'Adição a alcenos' },
  { id: 'adicao-eletrofilica', nome: 'Adição eletrofílica' },
  { id: 'rearranjos', nome: 'Rearranjos de carbocátion' },
  { id: 'eliminacao-alfa-carbenos', nome: 'α-Eliminação / Carbenos' },
  { id: 'radicais', nome: 'Radicais' },
  { id: 'reducao-alcinos', nome: 'Redução de alcinos' },
  { id: 'mecanismos-gerais', nome: 'Mecanismos gerais' },
];

window.REACTIONS = [
  {
    nome: '1-Bromobutano + cianeto (SN2)',
    categories: ['sn2'],
    reactants: ['CCCCBr'], reagents: 'NaCN', conditions: 'DMSO',
    products: ['CCCCC#N'],
    notas: 'Eletrófilo primário, nucleófilo forte, solvente polar aprótico. Etapa única, cinética de 2ª ordem: v = k[RX][Nu⁻]. Inversão de configuração no carbono atacado.',
    mecanismo: [
      { titulo: 'Ataque pela retaguarda', texto: 'O Nu⁻ ataca o carbono a 180° do grupo abandonador; a ligação C–CN se forma enquanto C–Br se rompe (estado de transição pentacoordenado).', smiles: ['CCCCBr', 'CCCCC#N'] },
    ],
  },
  {
    nome: 'Brometo de terc-butila + água (SN1)',
    categories: ['sn1'],
    reactants: ['CC(C)(C)Br'], reagents: 'H₂O', conditions: 'solvólise',
    products: ['CC(C)(C)O'],
    notas: 'Substrato terciário, nucleófilo fraco, solvente polar prótico. Etapa lenta = formação do carbocátion: v = k[RX]. Produto racêmico se o carbono for estereogênico.',
    mecanismo: [
      { titulo: 'Ionização (lenta)', texto: 'Saída do Br⁻ gera carbocátion terciário.', smiles: ['CC(C)(C)Br', 'C[C+](C)C'] },
      { titulo: 'Ataque do nucleófilo', texto: 'A água ataca o carbocátion planar.', smiles: ['C[C+](C)C', 'CC(C)(C)[OH2+]'] },
      { titulo: 'Desprotonação', texto: 'Perda de H⁺ para o solvente fornece o álcool.', smiles: ['CC(C)(C)[OH2+]', 'CC(C)(C)O'] },
    ],
  },
  {
    nome: 'Brometo de terc-butila, calor (E1)',
    categories: ['e1'],
    reactants: ['CC(C)(C)Br'], reagents: 'EtOH', conditions: 'Δ',
    products: ['C=C(C)C'],
    notas: 'Mesmo carbocátion da SN1; em calor e base fraca a eliminação compete e é favorecida. Regra de Zaitsev: alceno mais substituído.',
    mecanismo: [
      { titulo: 'Ionização (lenta)', texto: 'Formação do carbocátion.', smiles: ['CC(C)(C)Br', 'C[C+](C)C'] },
      { titulo: 'Perda de H⁺ β', texto: 'O solvente remove um H do carbono adjacente ao cátion; forma-se a ligação π.', smiles: ['C[C+](C)C', 'C=C(C)C'] },
    ],
  },
  {
    nome: '2-Bromobutano + etóxido (E2, Zaitsev)',
    categories: ['e2'],
    reactants: ['CCC(C)Br'], reagents: 'EtONa', conditions: 'EtOH, Δ',
    products: ['CC=CC', 'C=CCC'],
    notas: 'Base forte, etapa única, H anti-periplanar ao grupo abandonador. Produto majoritário: but-2-eno (Zaitsev); minoritário: but-1-eno. Base volumosa (t-BuOK) favorece Hofmann.',
    mecanismo: [
      { titulo: 'Concertada', texto: 'A base retira o H β enquanto Br⁻ sai e a ligação π se forma, tudo ao mesmo tempo.', smiles: ['CCC(C)Br', 'CC=CC'] },
    ],
  },
  {
    nome: 'Hidro-halogenação de propeno',
    categories: ['adicao-alcenos', 'adicao-eletrofilica'],
    reactants: ['C=CC'], reagents: 'HBr', conditions: '',
    products: ['CC(C)Br'],
    notas: 'Regra de Markovnikov: H vai para o carbono menos substituído, X para o mais substituído (carbocátion mais estável). Possíveis rearranjos do carbocátion.',
    mecanismo: [
      { titulo: 'Protonação da ligação π', texto: 'A dupla ataca H⁺; forma-se o carbocátion secundário.', smiles: ['C=CC', 'C[CH+]C'] },
      { titulo: 'Captura pelo Br⁻', texto: 'O brometo ataca o carbocátion.', smiles: ['C[CH+]C', 'CC(C)Br'] },
    ],
  },
  {
    nome: 'Halogenação de ciclohexeno',
    categories: ['adicao-alcenos', 'adicao-eletrofilica'],
    reactants: ['C1=CCCCC1'], reagents: 'Br₂', conditions: 'CH₂Cl₂',
    products: ['BrC1CCCCC1Br'],
    notas: 'Via íon bromônio cíclico; ataque do Br⁻ pela face oposta ⇒ adição <b>anti</b> (trans-1,2-dibromociclohexano, racêmico).',
    mecanismo: [
      { titulo: 'Formação do íon bromônio', texto: 'A dupla polariza Br–Br e forma o íon bromônio ligado aos dois carbonos.', smiles: ['C1=CCCCC1', 'C1CCC2C(C1)[Br+]2'] },
      { titulo: 'Abertura anti', texto: 'Br⁻ ataca por trás, abrindo o anel.', smiles: ['C1CCC2C(C1)[Br+]2', 'BrC1CCCCC1Br'] },
    ],
  },
  {
    nome: 'Hidratação ácida de 2-metilpropeno',
    categories: ['adicao-alcenos', 'adicao-eletrofilica'],
    reactants: ['C=C(C)C'], reagents: 'H₂O', conditions: 'H₃O⁺ (cat.)',
    products: ['CC(C)(C)O'],
    notas: 'Markovnikov, via carbocátion (pode rearranjar). Reversível: excesso de água favorece o álcool.',
    mecanismo: [
      { titulo: 'Protonação', texto: 'Forma o carbocátion terciário.', smiles: ['C=C(C)C', 'C[C+](C)C'] },
      { titulo: 'Ataque da água e desprotonação', texto: 'H₂O ataca; perda de H⁺ regenera o catalisador.', smiles: ['C[C+](C)C', 'CC(C)(C)[OH2+]', 'CC(C)(C)O'] },
    ],
  },
  {
    nome: 'Hidroboração–oxidação de propeno',
    categories: ['adicao-alcenos'],
    reactants: ['C=CC'], reagents: '1) BH₃·THF', conditions: '2) H₂O₂, NaOH',
    products: ['CCCO'],
    notas: 'Regioquímica anti-Markovnikov (OH no carbono menos substituído), adição <b>syn</b>, sem rearranjo. Não é eletrofílica via carbocátion: é concertada.',
    mecanismo: [],
  },
];
