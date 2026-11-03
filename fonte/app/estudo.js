  // ---------- ESTUDO: dominada, anotações, revisão espaçada, cartões e simulado ----------
  // (este arquivo é encaixado dentro do app.js pelo build: usa as mesmas funções e variáveis)
  const EST_KEY = 'atlas.estudo', HIST_KEY = 'atlas.historico', DIA = 864e5;
  let estudo = guarda.ler(EST_KEY, {});      // { [idReação]: { d, n, ef, iv, due, rp, lp, ult } }
  let historico = guarda.ler(HIST_KEY, {});  // { 'AAAA-MM-DD': revisões no dia }
  const gravaEstudo = () => guarda.gravar(EST_KEY, estudo);
  const regEstudo = (id) => estudo[id] || (estudo[id] = { ef: 2.5, iv: 0, due: 0, rp: 0, lp: 0 });
  const dominada = (id) => { const e = estudo[id]; return !!e && (e.d === true || (e.rp >= 3 && e.iv >= 14)); };
  const dataChave = (t = Date.now()) => new Date(t).toLocaleDateString('sv');
  const comNota = (id) => !!(estudo[id] && estudo[id].n && estudo[id].n.trim());

  // Revisão espaçada (variação simples do SM-2): 0 errei · 1 difícil · 2 bom · 3 fácil
  function proximo(e0, nota) {
    const e = { ef: 2.5, iv: 0, rp: 0, lp: 0, ...(e0 || {}) };
    if (nota === 0) return { ...e, lp: e.lp + 1, rp: 0, iv: 0, ef: Math.max(1.3, e.ef - 0.2), min: 10 };
    const rp = e.rp + 1;
    let iv;
    if (rp === 1) iv = nota === 3 ? 4 : 1;
    else if (rp === 2) iv = nota === 1 ? 2 : nota === 2 ? 4 : 7;
    else iv = Math.max(1, Math.round(e.iv * e.ef * (nota === 1 ? 0.8 : nota === 3 ? 1.35 : 1)));
    return { ...e, rp, iv, ef: Math.max(1.3, e.ef + (nota === 3 ? 0.12 : nota === 1 ? -0.12 : 0)), min: 0 };
  }
  const rotuloIntervalo = (p) => (p.min ? '10 min' : p.iv < 30 ? `${p.iv} d` : `${Math.round(p.iv / 30)} m`);
  function agenda(id, nota) {
    const p = proximo(estudo[id], nota), e = regEstudo(id), agora = Date.now();
    Object.assign(e, { ef: p.ef, iv: p.iv, rp: p.rp, lp: p.lp, ult: agora, due: agora + (p.min ? p.min * 60e3 : p.iv * DIA) });
    historico[dataChave()] = (historico[dataChave()] || 0) + 1;
    gravaEstudo(); guarda.gravar(HIST_KEY, historico);
  }
  const vencida = (id) => { const e = estudo[id]; return !!e && e.rp + e.lp > 0 && e.due <= Date.now(); };
  const nova = (id) => !estudo[id] || (estudo[id].rp === 0 && estudo[id].lp === 0 && !estudo[id].ult);
  function sequencia() {
    let n = 0, t = Date.now();
    if (!historico[dataChave(t)]) t -= DIA;
    while (historico[dataChave(t)]) { n++; t -= DIA; }
    return n;
  }
  const embaralha = (v) => { const a = [...v]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const nomeCat = (id) => nomes.mec[id] || id;

  // ---- escopo do estudo (tudo / aula / mecanismo / salvos / erradas) ----
  let escopo = guarda.ler('atlas.escopo', { tipo: 'tudo', id: '' });
  let qtd = guarda.ler('atlas.qtd', 10);
  function pool(esc) {
    let l = D.reacoes;
    if (esc.tipo === 'aula') l = l.filter((r) => r.a === esc.id);
    else if (esc.tipo === 'mec') l = l.filter((r) => r.c.includes(esc.id));
    else if (esc.tipo === 'salvos') l = l.filter((r) => salvos.has(r.i));
    else if (esc.tipo === 'erradas') l = l.filter((r) => estudo[r.i] && estudo[r.i].lp > 0 && !dominada(r.i));
    return l.filter((r) => r.a !== '00' || esc.tipo === 'salvos');
  }
  const descreveEscopo = (e) => ({ tudo: 'Todas as reações', aula: 'Aula ' + rotuloAula(e.id), mec: nomeCat(e.id), salvos: 'Salvos', erradas: 'Que eu errei' }[e.tipo]);
  function montaBaralho(esc, max, soVencidas) {
    const base = pool(esc);
    const venc = base.filter((r) => vencida(r.i)).sort((a, b) => estudo[a.i].due - estudo[b.i].due);
    const novas = base.filter((r) => nova(r.i));
    let lista = [...venc];
    if (!soVencidas) lista.push(...(esc.tipo === 'tudo' ? embaralha(novas).slice(0, Math.max(0, max - venc.length)) : embaralha(novas)));
    if (!soVencidas && lista.length < max) lista.push(...embaralha(base.filter((r) => !venc.includes(r) && !novas.includes(r))));
    return lista.slice(0, max === Infinity ? lista.length : max);
  }

  // ---------- animação auxiliar ----------
  const mo = (el, kf, op) => (usaMotion && el ? M.animate(el, kf, op) : { then: (f) => { f && f(); return Promise.resolve(); }, finished: Promise.resolve() });
  const entraLista = (sel, atraso = 0.05) => usaMotion && M.animate(sel, { opacity: [0, 1], y: [18, 0] }, { type: 'spring', stiffness: 300, damping: 26, delay: M.stagger(atraso) });
  function anel(el, pct, cor) {
    const r = 44, c = 2 * Math.PI * r;
    el.innerHTML = `<svg viewBox="0 0 100 100" class="anel"><circle cx="50" cy="50" r="${r}" class="anel-fundo"/><circle cx="50" cy="50" r="${r}" class="anel-valor" style="stroke:${cor || 'var(--ac)'}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}"/><text x="50" y="57" text-anchor="middle" class="anel-num">0%</text></svg>`;
    const v = el.querySelector('.anel-valor'), tx = el.querySelector('.anel-num');
    const alvo = c * (1 - pct / 100);
    if (!usaMotion) { v.setAttribute('stroke-dashoffset', alvo); tx.textContent = Math.round(pct) + '%'; return; }
    M.animate(v, { strokeDashoffset: [c, alvo] }, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    M.animate(0, pct, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: (n) => { tx.textContent = Math.round(n) + '%'; } });
  }

  // ---------- progresso por aula ----------
  function progressoAula(id) {
    const l = D.reacoes.filter((r) => r.a === id), dom = l.filter((r) => dominada(r.i)).length;
    return { total: l.length, dom, pct: l.length ? (100 * dom) / l.length : 0 };
  }
  const progressoGeral = () => { const l = D.reacoes.filter((r) => r.a !== '00'), d = l.filter((r) => dominada(r.i)).length; return { total: l.length, dom: d, pct: l.length ? (100 * d) / l.length : 0 }; };

  // ---------- extras na página da reação: dominada, revisão e anotações ----------
  function estudoDetalheHtml(r) {
    const e = estudo[r.i], dom = dominada(r.i);
    let status = 'Ainda não revisada';
    if (e && (e.rp + e.lp > 0)) status = e.due <= Date.now() ? 'Revisão pendente' : `Próxima revisão em ${Math.max(1, Math.round((e.due - Date.now()) / DIA))} d`;
    return `<div class="cartao dominio sobe" style="--i:3">
      <div class="dom-linha"><button class="btn dom-btn${dom ? ' on' : ''}" data-dominada="${r.i}" aria-pressed="${dom}"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>${dom ? 'Dominada' : 'Marcar como dominada'}</span></button><span class="dom-status">${esc(status)}</span></div>
      <label class="nota-rot" for="nota-${r.i}">Minhas anotações</label>
      <textarea id="nota-${r.i}" class="nota-campo" rows="2" placeholder="Um macete, a pegadinha da prova, o exemplo do professor…" data-nota="${r.i}">${esc((e && e.n) || '')}</textarea></div>`;
  }
  function estudoDetalheDepois() {
    const ta = document.querySelector('.nota-campo');
    if (!ta) return;
    const cresce = () => { ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight + 2) + 'px'; };
    cresce();
    let t;
    ta.addEventListener('input', () => { cresce(); clearTimeout(t); t = setTimeout(() => { const e = regEstudo(+ta.dataset.nota); e.n = ta.value; if (!ta.value.trim() && !e.rp && !e.lp && !e.d) delete estudo[+ta.dataset.nota]; gravaEstudo(); }, 350); });
  }
  function alternaDominada(id, btn) {
    const e = regEstudo(id);
    e.d = !dominada(id) ? true : false;
    if (!e.d && e.rp >= 3 && e.iv >= 14) { e.rp = 2; e.iv = 7; } // desfaz o "dominada automático"
    if (!e.d && !e.rp && !e.lp && !e.n) delete estudo[id];
    gravaEstudo();
    const on = dominada(id);
    btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on);
    btn.querySelector('span').textContent = on ? 'Dominada' : 'Marcar como dominada';
    mo(btn.querySelector('svg'), { scale: [0.4, 1], rotate: [-30, 0] }, { duration: 0.55, ease: [0.3, 1.7, 0.5, 1] });
  }

  // ---------- tela Estudar (hub) ----------
  function telaEstudar() {
    const g = progressoGeral();
    const base = pool(escopo), venc = base.filter((r) => vencida(r.i)).length, novas = base.filter((r) => nova(r.i)).length;
    const seq = sequencia(), feitasHoje = historico[dataChave()] || 0;
    const aulasOpt = D.aulas.filter((a) => a.id !== '00').map((a) => `<option value="${a.id}"${escopo.tipo === 'aula' && escopo.id === a.id ? ' selected' : ''}>Aula ${rotuloAula(a.id)} · ${esc(a.nome)}</option>`).join('');
    const mecOpt = D.categorias.map((c) => `<option value="${c.id}"${escopo.tipo === 'mec' && escopo.id === c.id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('');
    const chip = (t, rot) => `<button class="chip${escopo.tipo === t ? ' on' : ''}" data-escopo="${t}">${rot}</button>`;
    const barras = D.aulas.filter((a) => a.id !== '00').map((a, i) => { const p = progressoAula(a.id); return `<a class="prog-linha sobe" style="--i:${i + 8}" href="#/aula/${a.id}"><span class="prog-rot">Aula ${rotuloAula(a.id)}</span><span class="prog-barra"><i data-pct="${p.pct.toFixed(1)}"></i></span><span class="prog-num">${p.dom}/${p.total}</span></a>`; }).join('');
    return {
      titulo: 'Estudar', aba: 'estudar', prof: 0,
      html: `<h2 class="titulo-lista sobe">Estudar</h2>
        <div class="cartao hoje sobe" style="--i:1">
          <div class="hoje-anel" id="anel-geral"></div>
          <div class="hoje-tx"><b>${g.dom} de ${g.total}</b> dominadas<small>${seq ? `🔥 ${seq} ${seq === 1 ? 'dia' : 'dias'} seguidos` : 'Comece hoje a sua sequência'} · ${feitasHoje} ${feitasHoje === 1 ? 'revisão' : 'revisões'} hoje</small></div>
        </div>
        <div class="sec"><h3>O que estudar</h3><span>${descreveEscopo(escopo)}</span></div>
        <div class="filtros sobe" style="--i:2">${chip('tudo', 'Tudo')}${chip('aula', 'Por aula')}${chip('mec', 'Por mecanismo')}${chip('salvos', `Salvos (${salvos.size})`)}${chip('erradas', 'Que errei')}</div>
        ${escopo.tipo === 'aula' ? `<select class="sel-estudo" data-escopo-id="aula">${aulasOpt}</select>` : ''}
        ${escopo.tipo === 'mec' ? `<select class="sel-estudo" data-escopo-id="mec">${mecOpt}</select>` : ''}
        <div class="qtd sobe" style="--i:3"><span>Quantidade</span>${[10, 20, 50].map((n) => `<button class="chip${qtd === n ? ' on' : ''}" data-qtd="${n}">${n}</button>`).join('')}<button class="chip${qtd === 0 ? ' on' : ''}" data-qtd="0">Todas</button></div>
        <div class="grande-grade">
          <button class="btn-grande cartoes sobe" style="--i:4" data-iniciar="cartoes"><span class="bg-ic">⟳</span><span class="bg-tx"><b>Testar-me</b><small>${venc ? `${venc} para revisar` : 'cartões de revisão'}${novas ? ` · ${novas} novas` : ''}</small></span></button>
          <button class="btn-grande simulado sobe" style="--i:5" data-iniciar="simulado"><span class="bg-ic">✎</span><span class="bg-tx"><b>Simulado</b><small>questões de múltipla escolha</small></span></button>
        </div>
        <div class="sec"><h3>Atalhos</h3></div>
        <a class="aula sobe" style="--i:6" href="#/salvos"><div class="num">★</div><div class="tx"><b>Salvos</b><small>${plural(salvos.size, 'reação', 'reações')}</small></div>${SETA_IR}</a>
        <a class="aula sobe" style="--i:7" href="#/notas"><div class="num">✎</div><div class="tx"><b>Minhas anotações</b><small>${plural(D.reacoes.filter((r) => comNota(r.i)).length, 'anotação', 'anotações')}</small></div>${SETA_IR}</a>
        <div class="sec"><h3>Progresso por aula</h3><span>dominadas</span></div><div class="prog">${barras}</div>`,
      depois: () => {
        anel($('#anel-geral'), g.pct);
        document.querySelectorAll('.prog-barra i').forEach((b, i) => { const p = +b.dataset.pct; if (usaMotion) M.animate(b, { width: ['0%', p + '%'] }, { duration: 0.9, delay: 0.3 + i * 0.05, ease: [0.16, 1, 0.3, 1] }); else b.style.width = p + '%'; });
      },
    };
  }

  // ---------- Testar-me: cartões de revisão ----------
  let sessaoC = null;
  function iniciaCartoes(lista) {
    if (!lista.length) { mostraAviso('Nada para estudar nesse conjunto', false); return; }
    sessaoC = { fila: lista.map((r) => r.i), ini: Date.now(), resp: [], total: lista.length, refeitos: {} };
    location.hash = '#/cartoes';
  }
  const verso = (r) => `<div class="face verso"><p class="pergunta">Resposta</p><div class="esquema rev">${lado(r.p, 0)}</div>
      <h3 class="rev-nome">${esc(r.n)}</h3><div class="etqs">${r.c.slice(0, 3).map((c) => etq('mec', c)).join('')}</div>
      ${r.nt ? `<p class="rev-nota">${r.nt.replace(/<[^>]+>/g, ' ').slice(0, 230)}${r.nt.length > 230 ? '…' : ''}</p>` : ''}<a class="rev-ver" href="#/r/${r.i}">Ver reação completa →</a></div>`;
  const frente = (r) => `<div class="face frente"><div class="rev-topo"><span class="chip-aula">Aula ${rotuloAula(r.a)}${r.s ? ' · slides ' + esc(r.s) : ''}</span></div><p class="pergunta">Qual é o produto?</p>
      <div class="esquema rev">${lado(r.r, 0)}${seta(r.rg, r.cd)}<div class="interroga">?</div></div><span class="dica">toque para virar</span></div>`;

  function telaCartoes() {
    if (!sessaoC) return telaEstudar();
    return {
      titulo: 'Testar-me', aba: 'estudar', prof: 1,
      html: `<div class="sessao"><div class="sess-topo"><div class="sess-barra"><i id="sess-prog"></i></div><span id="sess-cont"></span></div>
        <div class="sess-palco" id="palco"></div><div class="notas-grade" id="notas-grade"></div></div>`,
      depois: () => cartaoSeguinte(true),
    };
  }
  function atualizaProgresso() {
    // a contagem é só de cartões: quantos já passaram por você (errar também avança; o cartão refeito não conta de novo)
    const vistos = new Set(sessaoC.resp.map((x) => x.id)), atual = sessaoC.fila[0];
    const pct = Math.min(100, (100 * vistos.size) / sessaoC.total);
    mo($('#sess-prog'), { width: pct + '%' }, { type: 'spring', stiffness: 140, damping: 20 });
    if (!usaMotion) $('#sess-prog').style.width = pct + '%';
    $('#sess-cont').textContent = vistos.has(atual) ? `${vistos.size}/${sessaoC.total} · de novo` : `${Math.min(sessaoC.total, vistos.size + 1)}/${sessaoC.total}`;
  }
  let virado = false, cartaoAtual = null;
  function cartaoSeguinte(primeiro) {
    const palco = $('#palco'); if (!palco) return;
    $('#notas-grade').innerHTML = '';
    if (!sessaoC.fila.length) return fimCartoes();
    const id = sessaoC.fila[0], r = porId.get(id);
    atualizaProgresso();
    virado = false;
    palco.innerHTML = `<div class="rev-cartao" id="rev-cartao" role="button" tabindex="0" aria-label="Virar o cartão"><div class="rev-interno">${frente(r)}${verso(r)}</div></div>`;
    cartaoAtual = $('#rev-cartao');
    hidrata(palco);
    mo(cartaoAtual, { opacity: [0, 1], x: [primeiro ? 0 : 90, 0], y: [primeiro ? 36 : 0, 0], scale: [0.94, 1], rotate: [primeiro ? 0 : 4, 0] }, { type: 'spring', stiffness: 260, damping: 24 });
    mo(cartaoAtual.querySelectorAll('.tile'), { opacity: [0, 1], scale: [0.7, 1] }, { type: 'spring', stiffness: 380, damping: 20, delay: M && M.stagger ? M.stagger(0.07, { startDelay: 0.15 }) : 0 });
    cartaoAtual.addEventListener('click', (e) => { if (!e.target.closest('a')) viraCartao(r); });
    cartaoAtual.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); viraCartao(r); } });
  }
  function viraCartao(r) {
    if (virado) return;
    virado = true;
    const c = cartaoAtual;
    c.classList.add('virado');
    mo(c.querySelector('.rev-interno'), { rotateY: [0, 180] }, { type: 'spring', stiffness: 170, damping: 19 });
    if (!usaMotion) c.querySelector('.rev-interno').style.transform = 'rotateY(180deg)';
    const ps = [0, 1, 2, 3].map((n) => rotuloIntervalo(proximo(estudo[r.i], n)));
    const nomesN = ['Errei', 'Difícil', 'Bom', 'Fácil'], cls = ['n-errei', 'n-dificil', 'n-bom', 'n-facil'];
    const g = $('#notas-grade');
    g.innerHTML = nomesN.map((nm, n) => `<button class="nota-btn ${cls[n]}" data-nota-rev="${n}"><b>${nm}</b><small>${ps[n]}</small></button>`).join('');
    mo(g.children, { opacity: [0, 1], y: [22, 0], scale: [0.9, 1] }, { type: 'spring', stiffness: 340, damping: 22, delay: M && M.stagger ? M.stagger(0.05, { startDelay: 0.2 }) : 0 });
    hidrata(c);
  }
  function avaliaCartao(n) {
    if (!virado || !sessaoC) return;
    virado = false;
    const id = sessaoC.fila.shift();
    agenda(id, n);
    sessaoC.resp.push({ id, nota: n });
    if (n === 0) { // volta para o fim da fila (no máximo 2 vezes)
      sessaoC.refeitos[id] = (sessaoC.refeitos[id] || 0) + 1;
      if (sessaoC.refeitos[id] <= 2) sessaoC.fila.splice(Math.min(sessaoC.fila.length, 3), 0, id);
    }
    navigator.vibrate && navigator.vibrate(n === 0 ? [14, 30, 14] : 8);
    const dir = n === 0 ? -1 : 1;
    mo($('#notas-grade').children, { opacity: [1, 0], y: [0, 12] }, { duration: 0.15 });
    mo(cartaoAtual, { x: [0, dir * innerWidth * 0.9], rotate: [0, dir * 14], opacity: [1, 0] }, { duration: 0.34, ease: [0.5, 0, 0.9, 0.4] }).then(() => cartaoSeguinte(false));
  }
  function fimCartoes() {
    const palco = $('#palco'); $('#notas-grade').innerHTML = '';
    const unicas = new Map(); sessaoC.resp.forEach((x) => unicas.set(x.id, x.nota));
    const certas = [...unicas.values()].filter((n) => n >= 2).length, dificeis = [...unicas.values()].filter((n) => n === 1).length;
    const pct = unicas.size ? (100 * certas) / unicas.size : 0;
    const errouAlguma = [...new Set(sessaoC.resp.filter((x) => x.nota === 0).map((x) => x.id))];
    const min = Math.max(1, Math.round((Date.now() - sessaoC.ini) / 60e3));
    $('#sess-prog').style.width = '100%'; $('#sess-cont').textContent = 'Concluído';
    palco.innerHTML = `<div class="resumo"><div class="resumo-anel" id="anel-fim"></div><h3 class="resumo-t">${pct >= 80 ? 'Mandou bem!' : pct >= 50 ? 'Bom progresso' : 'Vamos reforçar'}</h3>
      <p class="resumo-s">${unicas.size} ${unicas.size === 1 ? 'reação' : 'reações'} em ${min} min</p>
      <div class="resumo-num"><div><b data-n="${certas}">0</b><span>acertos</span></div><div><b data-n="${dificeis}">0</b><span>difíceis</span></div><div><b data-n="${errouAlguma.length}">0</b><span>refeitas</span></div></div>
      <div class="resumo-acoes">${errouAlguma.length ? `<button class="btn-grande pequeno" data-refazer="${errouAlguma.join(',')}"><b>Revisar as ${errouAlguma.length} que errei</b></button>` : ''}<a class="btn" href="#/estudar">Voltar</a></div></div>`;
    anel($('#anel-fim'), pct, pct >= 80 ? '#1e9a52' : pct >= 50 ? '#d49a1a' : '#c4452d');
    contaAte(palco);
    mo(palco.querySelectorAll('.resumo > *:not(.resumo-anel)'), { opacity: [0, 1], y: [16, 0] }, { type: 'spring', stiffness: 280, damping: 24, delay: M && M.stagger ? M.stagger(0.08, { startDelay: 0.3 }) : 0 });
  }

  // ---------- Simulado ----------
  let sessaoS = null;
  const CATS_PRINCIPAIS = ['sn1', 'sn2', 'e1', 'e2', 'adicao-alcenos', 'adicao-eletrofilica', 'rearranjos', 'radicais', 'eliminacao-alfa-carbenos', 'reducao-alcinos'];
  function geraQuestoes(lista, n) {
    const alvo = embaralha(lista.filter((r) => r.p.length && r.r.length)).slice(0, n * 3);
    const qs = [];
    for (const r of alvo) {
      if (qs.length >= n) break;
      const tipo = qs.length % 2 === 0 ? 'produto' : 'mecanismo';
      if (tipo === 'mecanismo') {
        const corretas = r.c.filter((c) => CATS_PRINCIPAIS.includes(c));
        if (!corretas.length) continue;
        const certa = corretas[0];
        const outras = embaralha(CATS_PRINCIPAIS.filter((c) => !r.c.includes(c))).slice(0, 3);
        qs.push({ tipo, id: r.i, certa, opcoes: embaralha([certa, ...outras]) });
      } else {
        const chave = r.p.join('|');
        const dist = embaralha(D.reacoes.filter((x) => x.i !== r.i && x.p.length && x.p.length === r.p.length && x.p.join('|') !== chave)).filter((x, k, a) => a.findIndex((y) => y.p.join('|') === x.p.join('|')) === k);
        const mesma = dist.filter((x) => x.c.some((c) => r.c.includes(c)));
        const escolh = [...mesma.slice(0, 3), ...dist.filter((x) => !mesma.includes(x))].slice(0, 3);
        if (escolh.length < 3) continue;
        const opcoes = embaralha([{ ids: r.p, certa: true }, ...escolh.map((x) => ({ ids: x.p, certa: false }))]);
        qs.push({ tipo, id: r.i, opcoes });
      }
    }
    return qs;
  }
  function iniciaSimulado(lista) {
    const n = qtd === 0 ? 15 : Math.min(qtd, 15);
    const qs = geraQuestoes(lista, n);
    if (qs.length < 3) { mostraAviso('Poucas reações para montar um simulado', false); return; }
    sessaoS = { qs, i: 0, ini: Date.now(), acertos: 0, resp: [] };
    location.hash = '#/simulado';
  }
  function telaSimulado() {
    if (!sessaoS) return telaEstudar();
    return { titulo: 'Simulado', aba: 'estudar', prof: 1,
      html: `<div class="sessao"><div class="sess-topo"><div class="sess-barra"><i id="sess-prog"></i></div><span id="sess-cont"></span></div><div class="sess-palco" id="palco"></div></div>`,
      depois: () => questaoSeguinte(true) };
  }
  function questaoSeguinte(primeiro) {
    const palco = $('#palco'); if (!palco) return;
    if (sessaoS.i >= sessaoS.qs.length) return fimSimulado();
    const q = sessaoS.qs[sessaoS.i], r = porId.get(q.id);
    mo($('#sess-prog'), { width: (100 * sessaoS.i / sessaoS.qs.length) + '%' }, { type: 'spring', stiffness: 140, damping: 20 });
    if (!usaMotion) $('#sess-prog').style.width = (100 * sessaoS.i / sessaoS.qs.length) + '%';
    $('#sess-cont').textContent = `${sessaoS.i + 1}/${sessaoS.qs.length}`;
    const enunciado = `<div class="q-cartao"><div class="rev-topo"><span class="chip-aula">Aula ${rotuloAula(r.a)}</span></div><p class="pergunta">${q.tipo === 'produto' ? 'Qual é o produto desta reação?' : 'Que tipo de mecanismo é este?'}</p><div class="esquema rev">${lado(r.r, 0)}${seta(r.rg, r.cd)}${q.tipo === 'mecanismo' ? lado(r.p, 0) : '<div class="interroga">?</div>'}</div></div>`;
    const opcoes = q.tipo === 'produto'
      ? `<div class="q-opcoes produtos">${q.opcoes.map((o, k) => `<button class="q-op" data-op="${k}"><span class="q-letra">${'ABCD'[k]}</span>${lado(o.ids, 0)}</button>`).join('')}</div>`
      : `<div class="q-opcoes mecs">${q.opcoes.map((c, k) => `<button class="q-op mec c-${c}" data-op="${k}"><span class="q-letra">${'ABCD'[k]}</span><b>${esc(nomeCat(c))}</b></button>`).join('')}</div>`;
    palco.innerHTML = `${enunciado}${opcoes}<div class="q-feedback" id="q-fb"></div>`;
    hidrata(palco);
    mo(palco.querySelector('.q-cartao'), { opacity: [0, 1], x: [primeiro ? 0 : 70, 0], y: [primeiro ? 30 : 0, 0] }, { type: 'spring', stiffness: 260, damping: 24 });
    mo(palco.querySelectorAll('.q-op'), { opacity: [0, 1], y: [22, 0], scale: [0.94, 1] }, { type: 'spring', stiffness: 320, damping: 24, delay: M && M.stagger ? M.stagger(0.07, { startDelay: 0.2 }) : 0 });
  }
  function respondeQuestao(k) {
    const q = sessaoS.qs[sessaoS.i]; if (q.resp != null) return;
    q.resp = k;
    const r = porId.get(q.id);
    const certaIdx = q.tipo === 'produto' ? q.opcoes.findIndex((o) => o.certa) : q.opcoes.indexOf(q.certa);
    const ok = k === certaIdx;
    if (ok) sessaoS.acertos++; else agenda(q.id, 0);
    sessaoS.resp.push({ id: q.id, ok, tipo: q.tipo, cat: q.certa || r.c[0] });
    navigator.vibrate && navigator.vibrate(ok ? 10 : [14, 30, 14]);
    const ops = [...document.querySelectorAll('.q-op')];
    ops.forEach((b, i) => { b.disabled = true; b.classList.toggle('certa', i === certaIdx); b.classList.toggle('errada', i === k && !ok); b.classList.toggle('apagada', i !== certaIdx && i !== k); });
    mo(ops[certaIdx], { scale: [1, 1.04, 1] }, { duration: 0.45, ease: [0.3, 1.6, 0.5, 1] });
    if (!ok) mo(ops[k], { x: [0, -9, 9, -6, 6, 0] }, { duration: 0.45 });
    const fb = $('#q-fb');
    fb.innerHTML = `<div class="q-fb-cartao ${ok ? 'ok' : 'no'}"><b>${ok ? 'Certo!' : 'Não foi dessa vez'}</b><p>${esc(r.n)}</p>${r.nt ? `<small>${r.nt.replace(/<[^>]+>/g, ' ').slice(0, 200)}${r.nt.length > 200 ? '…' : ''}</small>` : ''}</div>
      <div class="q-acoes"><a class="btn" href="#/r/${r.i}">Ver reação</a><button class="btn-grande pequeno" data-proxima="1"><b>${sessaoS.i + 1 >= sessaoS.qs.length ? 'Ver resultado' : 'Próxima'}</b></button></div>`;
    mo(fb.children, { opacity: [0, 1], y: [20, 0] }, { type: 'spring', stiffness: 300, damping: 24, delay: M && M.stagger ? M.stagger(0.08) : 0 });
    setTimeout(() => fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
  }
  function proximaQuestao() {
    const palco = $('#palco');
    sessaoS.i++;
    // sai para a esquerda e a próxima questão entra animando de volta a opacity 1 (a Motion grava o estado final, então não basta limpar o estilo)
    mo(palco, { opacity: [1, 0], x: [0, -60] }, { duration: 0.22 }).then(() => {
      questaoSeguinte(false); window.scrollTo(0, 0);
      mo(palco, { opacity: [0, 1], x: [40, 0] }, { duration: 0.26, ease: [0.2, 0.9, 0.3, 1] }).then(() => { palco.style.opacity = ''; palco.style.transform = ''; });
    });
  }
  function fimSimulado() {
    const palco = $('#palco'), n = sessaoS.qs.length, pct = (100 * sessaoS.acertos) / n;
    const min = Math.max(1, Math.round((Date.now() - sessaoS.ini) / 60e3));
    const porCat = {};
    sessaoS.resp.forEach((x) => { const c = x.cat; porCat[c] = porCat[c] || [0, 0]; porCat[c][1]++; if (x.ok) porCat[c][0]++; });
    const erradas = sessaoS.resp.filter((x) => !x.ok);
    $('#sess-prog').style.width = '100%'; $('#sess-cont').textContent = 'Resultado';
    const nota = (pct / 10).toFixed(1).replace('.', ',');
    const novo = sessaoS.acertos === n ? ganhaAcessorio('oculos') : null; // 100%: ganha um acessório para o Mutaninho
    const premio = novo ? `<div class="premio"><svg viewBox="${novo.vb}" aria-hidden="true">${novo.arte}</svg><div><b>Você ganhou: ${esc(novo.nome)}!</b><small>Está na loja do Mutaninho.</small></div><button class="btn" data-loja-abrir>Ver</button></div>` : '';
    palco.innerHTML = `<div class="resumo"><div class="resumo-anel" id="anel-fim"></div><h3 class="resumo-t">Nota ${nota}</h3>
      <p class="resumo-s">${sessaoS.acertos} de ${n} certas · ${min} min</p>
      <div class="por-cat">${Object.entries(porCat).map(([c, [a, t]]) => `<div class="cat-linha c-${c}"><span class="cat-nome">${esc(nomeCat(c))}</span><span class="cat-barra"><i data-pct="${((100 * a) / t).toFixed(0)}"></i></span><span class="cat-num">${a}/${t}</span></div>`).join('')}</div>
      ${erradas.length ? `<div class="sec"><h3>Para rever</h3><span>${erradas.length}</span></div><div class="erradas">${erradas.map((x, k) => itemHtml(porId.get(x.id), k)).join('')}</div>` : '<p class="resumo-s">Sem erros: perfeito!</p>'}
      ${premio}
      <div class="resumo-acoes"><button class="btn-grande pequeno" data-iniciar="simulado"><b>Novo simulado</b></button><a class="btn" href="#/estudar">Voltar</a></div></div>`;
    anel($('#anel-fim'), pct, pct >= 80 ? '#1e9a52' : pct >= 50 ? '#d49a1a' : '#c4452d');
    mo(palco.querySelectorAll('.resumo > *:not(.resumo-anel), .erradas .item'), { opacity: [0, 1], y: [16, 0] }, { type: 'spring', stiffness: 280, damping: 24, delay: M && M.stagger ? M.stagger(0.06, { startDelay: 0.25 }) : 0 });
    palco.querySelectorAll('.cat-barra i').forEach((b, k) => { const p = +b.dataset.pct; if (usaMotion) M.animate(b, { width: ['0%', p + '%'] }, { duration: 0.8, delay: 0.5 + k * 0.08, ease: [0.16, 1, 0.3, 1] }); else b.style.width = p + '%'; });
  }

  // ---------- anotações ----------
  function telaNotas() {
    const l = D.reacoes.filter((r) => comNota(r.i));
    return { titulo: 'Minhas anotações', aba: 'estudar', prof: 1,
      html: `<h2 class="titulo-lista sobe">Minhas anotações</h2><p class="sub-lista sobe" style="--i:1">${plural(l.length, 'anotação', 'anotações')}</p>
        ${l.length ? l.map((r, i) => `<a class="item sobe" style="--i:${i + 2}" href="#/r/${r.i}"><div class="linha">Aula ${rotuloAula(r.a)}</div><b>${esc(r.n)}</b><p class="nota-previa">${esc(estudo[r.i].n.trim().slice(0, 160))}</p></a>`).join('') : vazio('Escreva anotações dentro de qualquer reação e elas aparecem aqui.')}` };
  }

  // ---------- cliques do estudo ----------
  document.addEventListener('click', (e) => {
    const t = e.target;
    const dm = t.closest('[data-dominada]'); if (dm) { alternaDominada(+dm.dataset.dominada, dm); return; }
    const es = t.closest('[data-escopo]');
    if (es) { escopo = { tipo: es.dataset.escopo, id: es.dataset.escopo === 'aula' ? (escopo.tipo === 'aula' ? escopo.id : D.aulas.find((a) => a.id !== '00').id) : es.dataset.escopo === 'mec' ? (escopo.tipo === 'mec' ? escopo.id : D.categorias[0].id) : '' }; guarda.gravar('atlas.escopo', escopo); mostra(); return; }
    const qn = t.closest('[data-qtd]'); if (qn) { qtd = +qn.dataset.qtd; guarda.gravar('atlas.qtd', qtd); mostra(); return; }
    if (t.closest('[data-loja-abrir]')) { abreCreditos(null, true); return; }
    const ini = t.closest('[data-iniciar]');
    if (ini) {
      if (ini.dataset.iniciar === 'cartoes') iniciaCartoes(montaBaralho(escopo, qtd === 0 ? Infinity : qtd, false));
      else iniciaSimulado(pool(escopo));
      return;
    }
    const nr = t.closest('[data-nota-rev]'); if (nr) { avaliaCartao(+nr.dataset.notaRev); return; }
    const rf = t.closest('[data-refazer]'); if (rf) { iniciaCartoes(rf.dataset.refazer.split(',').map((x) => porId.get(+x))); return; }
    const op = t.closest('.q-op[data-op]'); if (op && sessaoS) { respondeQuestao(+op.dataset.op); return; }
    if (t.closest('[data-proxima]')) { proximaQuestao(); return; }
  });
  document.addEventListener('change', (e) => {
    const s = e.target.closest('[data-escopo-id]');
    if (s) { escopo = { tipo: s.dataset.escopoId, id: s.value }; guarda.gravar('atlas.escopo', escopo); mostra(); }
  });
  document.addEventListener('keydown', (e) => {
    if (!document.querySelector('.sessao')) return;
    if (e.key === ' ' && cartaoAtual && !virado && document.querySelector('#rev-cartao')) { e.preventDefault(); const r = porId.get(sessaoC.fila[0]); r && viraCartao(r); }
    else if (['1', '2', '3', '4'].includes(e.key) && virado) avaliaCartao(+e.key - 1);
  });
