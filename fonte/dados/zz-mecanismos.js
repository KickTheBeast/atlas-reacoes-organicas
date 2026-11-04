// Mecanismos em etapas para reações das aulas 11–23 (aplicados por trecho do nome da reação).
(() => {
  const M = [
    ['Benzeno + cloreto de n-propila, AlCl₃', [
      ['Carbocátion primário e rearranjo', 'O AlCl₃ remove Cl⁻; o cátion primário migra um hidreto e vira secundário (mais estável).', 'CCCCl', 'C[CH+]C'],
      ['Ataque do anel', 'O benzeno ataca o carbocátion secundário (complexo σ).', 'c1ccccc1', 'CC(C)C1C=CC=C[CH+]1'],
      ['Perda de H⁺', 'Rearomatização dá o isopropilbenzeno, não o propilbenzeno.', 'CC(C)C1C=CC=C[CH+]1', 'CC(C)c1ccccc1'],
    ]],
    ['Tolueno + NBS, calor → brometo de benzila', [
      ['Abstração do H benzílico', 'O radical Br• retira o H do carbono benzílico: radical benzílico, estabilizado por ressonância com o anel.', 'Cc1ccccc1', '[CH2]c1ccccc1'],
      ['Captura de Br', 'O radical benzílico reage com Br₂ (formado a partir do NBS) e regenera Br•.', '[CH2]c1ccccc1', 'BrCc1ccccc1'],
    ]],
    ['2 Benzaldeído + NaOH (conc.)', [
      ['Adição de HO⁻', 'O hidróxido ataca o C=O; forma-se o alcóxido-hidrato.', 'O=Cc1ccccc1', '[O-]C(O)c1ccccc1'],
      ['Transferência de hidreto', 'O alcóxido empurra um hidreto (H⁻) para o C=O de outra molécula de aldeído: uma é oxidada a ácido.', '[O-]C(O)c1ccccc1', 'O=C(O)c1ccccc1'],
      ['Redução da 2ª molécula', 'O aldeído que recebeu o H⁻ vira alcóxido e é protonado a álcool benzílico.', 'O=Cc1ccccc1', 'OCc1ccccc1'],
    ]],
    ['2-Bromociclo-hexanona + HO⁻, H₂O', [
      ['Enolato do outro lado do C=O', 'O HO⁻ remove o H α do carbono sem Br (C6) e forma o enolato.', 'O=C1CCCCC1Br', '[O-]C1=CCCCC1Br'],
      ['Ciclopropanona', 'O enolato desloca o Br⁻ (SN2 interna) e fecha um anel de 3 membros.', '[O-]C1=CCCCC1Br', 'O=C1C2CCCC12'],
      ['Abertura do anel', 'O HO⁻ ataca o C=O e o anel tensionado abre, dando o ácido de anel menor (contração).', 'O=C1C2CCCC12', 'OC(=O)C1CCCC1'],
    ]],
    ['Fenóxido de sódio + CO₂ (125 °C, 100 atm)', [
      ['Ataque do anel ao CO₂', 'O fenóxido (muito ativado) ataca o CO₂ no carbono orto: forma-se uma ciclo-hexadienona.', '[O-]c1ccccc1', '[O-]C(=O)C1C=CC=CC1=O'],
      ['Tautomerização', 'A perda do H do carbono sp³ rearomatiza e dá o salicilato (ligação de H intramolecular).', '[O-]C(=O)C1C=CC=CC1=O', '[O-]C(=O)c1ccccc1O'],
    ]],
    ['Fenol + CHCl₃, NaOH aq. → salicilaldeído', [
      ['Diclorocarbeno', 'O HO⁻ remove o H do CHCl₃ e o CCl₃⁻ perde Cl⁻ (α-eliminação).', 'ClC(Cl)Cl', 'Cl[C]Cl'],
      ['Ataque do fenolato', 'O fenolato ataca o carbeno em orto.', 'Oc1ccccc1', 'O=C1C=CC=CC1C(Cl)Cl'],
      ['Hidrólise', 'A hidrólise dos dois Cl dá o aldeído e o anel aromatiza.', 'O=C1C=CC=CC1C(Cl)Cl', 'O=Cc1ccccc1O'],
    ]],
    ['Ácido malônico, 150 °C', [
      ['Estado de transição cíclico', 'O H do ácido vai ao C=O do outro grupo enquanto o CO₂ sai: forma-se o enol do ácido acético.', 'OC(=O)CC(=O)O', 'OC(O)=C.O=C=O'],
      ['Tautomerização', 'O enol vira ácido acético.', 'OC(O)=C', 'CC(=O)O'],
    ]],
    ['Acetoacetato de etila + 1) NaOEt 2) R–Br', [
      ['Enolato', 'O etóxido remove o H entre as duas carbonilas (pKa ≈ 11).', 'CC(=O)CC(=O)OCC', 'CC(=O)[CH-]C(=O)OCC'],
      ['Alquilação SN2', 'O enolato ataca o haleto de alquila.', 'CC(=O)[CH-]C(=O)OCC', 'CCC(C(C)=O)C(=O)OCC'],
      ['Hidrólise e descarboxilação', 'O β-cetoácido formado perde CO₂ por estado de transição cíclico e dá a metilcetona.', 'CCC(C(C)=O)C(=O)OCC', 'CCCC(C)=O'],
    ]],
    ['3-Hidroxibutanal + NaOH, calor', [
      ['Enolato', 'O HO⁻ remove o H α (mais ácido, ao lado do C=O).', 'CC(O)CC=O', 'CC(O)C=C[O-]'],
      ['Saída de HO⁻ (E1cB)', 'O par do enolato volta para formar C=C e expulsa HO⁻ do carbono β.', 'CC(O)C=C[O-]', 'CC=CC=O'],
    ]],
    ['Ciclo-hexanona + 1) pirrolidina', [
      ['Enamina', 'A amina secundária forma a enamina (nucleófilo no carbono β).', 'O=C1CCCCC1', 'C1CCN(C1)C1=CCCCC1'],
      ['Ataque à enona (Michael)', 'A enamina ataca o carbono β da but-3-en-2-ona: forma-se íon iminio/enolato.', 'C1CCN(C1)C1=CCCCC1', 'CC(=O)CCC1CCCCC1=[N+]1CCCC1'],
      ['Hidrólise', 'H₃O⁺ hidrolisa o iminio e libera a cetona.', 'CC(=O)CCC1CCCCC1=[N+]1CCCC1', 'CC(=O)CCC1CCCCC1=O'],
    ]],
    ['Acetona + 3 Br₂, HO⁻', [
      ['Enolato e bromação (3×)', 'Cada Br torna o H restante mais ácido, então as 3 posições do CH₃ são bromadas.', 'CC(C)=O', 'CC(=O)C(Br)(Br)Br'],
      ['Ataque de HO⁻ ao C=O', 'O hidróxido ataca o C=O da tribromoacetona.', 'CC(=O)C(Br)(Br)Br', 'CC([O-])(O)C(Br)(Br)Br'],
      ['Saída de CBr₃⁻', 'O C=O volta e expulsa CBr₃⁻ (bom grupo abandonador): sai bromofórmio e forma-se o carboxilato.', 'CC([O-])(O)C(Br)(Br)Br', 'CC(=O)O.BrC(Br)Br'],
    ]],
    ['Adipato de dietila + NaOEt', [
      ['Enolato', 'O etóxido remove o H α de um dos ésteres.', 'CCOC(=O)CCCCC(=O)OCC', 'CCOC(=O)[CH-]CCCC(=O)OCC'],
      ['Ataque intramolecular', 'O enolato ataca o outro éster e fecha o anel de 5 membros.', 'CCOC(=O)[CH-]CCCC(=O)OCC', 'CCOC(=O)C1CCCC1([O-])OCC'],
      ['Saída de EtO⁻', 'O C=O se reforma e sai etóxido: β-cetoéster cíclico.', 'CCOC(=O)C1CCCC1([O-])OCC', 'CCOC(=O)C1CCCC1=O'],
    ]],
    ['Benzaldeído + acetona, NaOH', [
      ['Enolato da acetona', 'O benzaldeído não tem H α: só a acetona forma enolato.', 'CC(C)=O', 'C=C(C)[O-]'],
      ['Adição ao benzaldeído', 'O enolato ataca o C=O do benzaldeído (aldol cruzado).', 'O=Cc1ccccc1', 'CC(=O)CC(O)c1ccccc1'],
      ['Desidratação E1cB', 'Enolato e saída de HO⁻: a C=C fica conjugada com o anel e o C=O.', 'CC(=O)CC(O)c1ccccc1', 'CC(=O)C=Cc1ccccc1'],
    ]],
    ['Acrilonitrila + Et₂NH', [
      ['Adição conjugada', 'A amina ataca o carbono β; a carga fica deslocalizada no nitrilo (ânion de cetenimina).', 'C=CC#N', 'CC[NH+](CC)CC=C=[N-]'],
      ['Transferência de próton', 'O próton do N passa para o carbono α e dá a aminonitrila.', 'CC[NH+](CC)CC=C=[N-]', 'CCN(CC)CCC#N'],
    ]],
    ['Ácido benzoico + SOCl₂', [
      ['Ataque ao S', 'O OH do ácido ataca o SOCl₂ e perde Cl⁻: forma-se o clorossulfito de acila.', 'OC(=O)c1ccccc1', 'O=C(OS(=O)Cl)c1ccccc1'],
      ['Ataque do Cl⁻ e saída do SO₂', 'O Cl⁻ ataca o C=O; o grupo sai como SO₂ + Cl⁻.', 'O=C(OS(=O)Cl)c1ccccc1', 'ClC(=O)c1ccccc1'],
    ]],
    ['Ácido butanoico + Br₂, P', [
      ['Brometo de acila', 'PBr₃ troca o OH por Br.', 'CCCC(=O)O', 'CCCC(=O)Br'],
      ['Enol e bromação', 'O brometo de acila enoliza e o enol ataca o Br₂.', 'CCCC(=O)Br', 'CCC(Br)C(=O)Br'],
      ['Hidrólise', 'H₂O devolve o ácido.', 'CCC(Br)C(=O)Br', 'CCC(Br)C(=O)O'],
    ]],
    ['m-Bromotolueno', []],
    ['Isobutiraldeído + pirrolidina', [
      ['Adição à C=O', 'A amina ataca o aldeído e forma o carbinolamina.', 'CC(C)C=O', 'CC(C)C([O-])[NH+]1CCCC1'],
      ['Íon iminio', 'A perda de água (catálise ácida) dá o íon iminio.', 'CC(C)C([O-])[NH+]1CCCC1', 'CC(C)C=[N+]1CCCC1'],
      ['Enamina', 'Perda de H⁺ do carbono α dá a enamina.', 'CC(C)C=[N+]1CCCC1', 'CC(C)=CN1CCCC1'],
    ]],
    ['Anilina + NaNO₂, 2 HCl', [
      ['Cátion nitrosônio', 'HNO₂ protonado perde H₂O e gera NO⁺.', 'ON=O', '[N+]#[O+]'],
      ['N-Nitrosação', 'O N da anilina ataca NO⁺ e forma a N-nitrosoamina.', 'Nc1ccccc1', 'O=NNc1ccccc1'],
      ['Diazônio', 'Tautomerização e perda de água em meio ácido.', 'O=NNc1ccccc1', 'c1ccccc1[N+]#N'],
    ]],
  ];
  const R = window.REACTIONS;
  for (const [chave, passos] of M) {
    if (!passos.length) continue;
    const r = R.find((x) => x.nome.startsWith(chave) || x.nome.includes(chave));
    if (!r) { console.warn('mecanismo sem reação:', chave); continue; }
    if (r.mecanismo && r.mecanismo.length) continue;
    r.mecanismo = passos.map(([titulo, texto, a, b]) => ({ titulo, texto, smiles: [a, b] }));
  }
})();
