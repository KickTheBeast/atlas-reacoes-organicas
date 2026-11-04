// Atlas de Reações Orgânicas — app (sem framework).
// Dados: dados.json (reações + tags) e svgs.json (estruturas desenhadas no build com RDKit).
(() => {
  'use strict';
  const BUILD = '__BUILD__';
  const $ = (s) => document.querySelector(s);
  const tela = $('#tela'), titulo = $('#titulo'), voltar = $('#voltar'), abas = $('#abas'), pilula = $('#pilula');
  const aviso = $('#aviso'), avisoTexto = $('#aviso-texto'), avisoOk = $('#aviso-ok'), avisoX = $('#aviso-x');
  const zoom = $('#zoom'), zoomConteudo = $('#zoom-conteudo'), topo = document.querySelector('.topo');

  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 3.8l2.5 5.3 5.8.8-4.2 4 1 5.8-5.1-2.8-5.1 2.8 1-5.8-4.2-4 5.8-.8z"/></svg>';
  const SETA_IR = '<svg class="seta-ir" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const rotuloAula = (id) => id === '00' ? 'Exemplos' : id.replace(/^0/, '');

  // ---------- tema ----------
  const aplicaTema = (t) => {
    const raiz = document.documentElement;
    if (t === 'claro' || t === 'escuro') raiz.dataset.tema = t; else delete raiz.dataset.tema;
    const escuro = t === 'escuro' || (t !== 'claro' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.removeAttribute('media'); m.setAttribute('content', escuro ? '#090f0d' : '#f4f7f5'); });
  };

  // ---------- armazenamento (nunca quebra se o navegador bloquear) ----------
  const guarda = {
    ler(k, pad) { try { const v = localStorage.getItem(k); return v == null ? pad : JSON.parse(v); } catch { return pad; } },
    gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  };
  let salvos = new Set(guarda.ler('atlas.salvos', []));
  const atualizaBadgeSalvos = () => { const b = document.getElementById('salvos-n'); if (b) { b.textContent = salvos.size || ''; b.hidden = !salvos.size; } };
  const alternarSalvo = (id) => {
    salvos.has(id) ? salvos.delete(id) : salvos.add(id);
    guarda.gravar('atlas.salvos', [...salvos]); atualizaBadgeSalvos();
    return salvos.has(id);
  };

  // ---------- dados ----------
  let D = null, S = null, guiaPorId = new Map(), porId = new Map(), nomes = { aula: {}, mec: {}, nu: {}, el: {} }, texto = new Map();
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });

  // ---------- busca: sinônimos e tolerância a erros de digitação ----------
  const compacto = (t) => norm(t).replace(/[-()'’]/g, '').replace(/\s+/g, ' ').trim();
  const textoC = new Map();
  let vocab = null;
  const SINONIMOS = [
    ['terc-butila', 't-butila', 'tercbutil', 't-bu', 'tbu', 'tert-butil', 'tert-butyl', 'terc-butil', 't-butil'],
    ['brometo', 'bromide'], ['cloreto', 'chloride'], ['iodeto', 'iodide'],
    ['etóxido', 'etoxido', 'etona', 'eto-', 'etoh'], ['metóxido', 'metoxido', 'ome', 'meo-'],
    ['hidróxido', 'hidroxido', 'hidroxila', 'oh-', 'naoh', 'koh'],
    ['álcool', 'alcool', 'alcohol'], ['alceno', 'olefina', 'alkene'], ['alcino', 'alkyne'],
    ['carbocátion', 'carbocation', 'cátion', 'carbocatiao'],
    ['nucleófilo', 'nucleofilo', 'nu-', 'nuc'], ['eletrófilo', 'eletrofilo', 'electrofilo'],
    ['markovnikov', 'markownikoff', 'markovnikoff'], ['zaitsev', 'saytzeff', 'zaitsef', 'saytsev', 'zaitzev'], ['hofmann', 'hoffman'],
    ['sn1', 'snl', 'unimolecular'], ['sn2', 'bimolecular'], ['e1', 'eliminação unimolecular'], ['e2', 'eliminação bimolecular'],
    ['epóxido', 'epoxido', 'oxirano', 'epoxide'], ['halidrina', 'haloidrina', 'halohydrin'],
    ['bromônio', 'bromonio', 'halônio', 'halonio'], ['mcpba', 'peroxiácido', 'peroxiacido', 'perácido', 'peracido'],
    ['ósmio', 'osmio', 'oso4', 'osmium'], ['ozonólise', 'ozonolise', 'o3', 'ozonolysis'],
    ['hidroboração', 'hidroboracao', 'borano', 'bh3', 'hydroboration'], ['oximercuração', 'oximercuracao', 'mercúrio', 'mercurio', 'hg(oac)2'],
    ['hidrogenação', 'hidrogenacao', 'lindlar', 'pd/c'], ['carbeno', 'carbene', 'metileno', 'carbenoide'],
    ['radical', 'radicalar', 'radicais'], ['inversão', 'inversao', 'walden'], ['racemização', 'racemizacao', 'racêmico', 'racemico', 'racêmica'],
    ['grupo abandonador', 'grupo de saída', 'grupo de saida', 'leaving group'], ['solvólise', 'solvolise', 'solvolysis'],
    ['tosilato', 'tosila', 'ots', 'tosylate', 'tscl'], ['rearranjo', 'rearranjos', 'migração', 'migracao', 'hidreto'],
    ['cianeto', 'cn-', 'nacn', 'kcn'], ['dmso', 'dimetilsulfóxido'], ['thf', 'tetraidrofurano', 'tetrahidrofurano'],
    ['desidratação', 'desidratacao', 'dehidratacao'], ['halogenação', 'halogenacao', 'bromação', 'bromacao', 'cloração', 'cloracao'],
    ['estereoquímica', 'estereoquimica', 'estéreo', 'stereo'], ['enantiômero', 'enantiomero', 'enantiomeros'],
  ];
  const sinMap = new Map();
  SINONIMOS.forEach((g) => { const cs = g.map(compacto); cs.forEach((c) => sinMap.set(c, [...new Set([...(sinMap.get(c) || []), ...cs])])); });
  const casa = (id, tok) => {
    if (texto.get(id).includes(tok)) return true;
    const c = compacto(tok), tc = ' ' + textoC.get(id);
    const alt = sinMap.get(c);
    return alt ? alt.some((x) => tc.includes(' ' + x)) : tc.includes(c);
  };
  function distancia(a, b, max) { // Levenshtein com corte
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let menor = i;
      for (let j = 1; j <= b.length; j++) { const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); cur.push(v); menor = Math.min(menor, v); }
      if (menor > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  function corrige(tok) {
    if (tok.length < 4) return tok;
    if (!vocab) { vocab = new Map(); D.reacoes.forEach((r) => (texto.get(r.i).match(/[a-z0-9]{4,}/g) || []).forEach((w) => vocab.set(w, (vocab.get(w) || 0) + 1))); }
    const max = tok.length >= 8 ? 2 : 1;
    let melhor = tok, md = max + 1, mc = 0;
    for (const [w, n] of vocab) { const d = distancia(tok, w, max); if (d < md || (d === md && n > mc)) { melhor = w; md = d; mc = n; } }
    return md <= max ? melhor : tok;
  }

  // ---------- filtros combinados (aula + mecanismo + nucleófilo + eletrófilo) ----------
  let filtrosSel = { a: '', c: '', nu: '', el: '' };
  const passaFiltros = (r) => (!filtrosSel.a || r.a === filtrosSel.a) && (!filtrosSel.c || r.c.includes(filtrosSel.c)) && (!filtrosSel.nu || r.nu.includes(filtrosSel.nu)) && (!filtrosSel.el || r.el.includes(filtrosSel.el));
  const filtrosAtivos = () => Object.values(filtrosSel).some(Boolean);
  const selFiltro = (k, rotulo, lista) => `<label class="fsel"><span>${rotulo}</span><select data-filtro="${k}"><option value="">Todos</option>${lista.map(([v, n]) => `<option value="${esc(v)}"${filtrosSel[k] === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
  const filtrosHtml = () => `<details class="filtros-av"${filtrosAtivos() ? ' open' : ''}><summary>Filtros${filtrosAtivos() ? ' <b>•</b>' : ''}</summary><div class="fgrade">
    ${selFiltro('a', 'Aula', D.aulas.map((x) => [x.id, 'Aula ' + rotuloAula(x.id)]))}${selFiltro('c', 'Mecanismo', D.categorias.map((x) => [x.id, x.nome]))}
    ${selFiltro('nu', 'Nucleófilo', D.nucleofilos.map((x) => [x.id, x.nome]))}${selFiltro('el', 'Eletrófilo', D.eletrofilos.map((x) => [x.id, x.nome]))}
    </div>${filtrosAtivos() ? '<button class="chip limpar" data-limpar-filtros>Limpar filtros</button>' : ''}</details>`;

  function prepara(d) {
    D = d;
    d.reacoes.forEach((r) => porId.set(r.i, r));
    d.aulas.forEach((x) => (nomes.aula[x.id] = x.nome));
    d.categorias.forEach((x) => (nomes.mec[x.id] = x.nome));
    d.nucleofilos.forEach((x) => (nomes.nu[x.id] = x.nome));
    d.eletrofilos.forEach((x) => (nomes.el[x.id] = x.nome));
    d.guias.forEach((g) => guiaPorId.set(g.id, g));
    d.reacoes.forEach((r) => texto.set(r.i, norm([
      r.n, r.rg, r.cd, r.nt.replace(/<[^>]+>/g, ' '), 'aula ' + r.a, nomes.aula[r.a],
      ...r.c.map((x) => nomes.mec[x]), ...r.nu.map((x) => nomes.nu[x]), ...r.el.map((x) => nomes.el[x]),
    ].join(' '))));
    d.reacoes.forEach((r) => textoC.set(r.i, compacto(texto.get(r.i))));
    vocab = null;
  }

  // ---------- estruturas ----------
  // ---------- setas de elétrons animadas (Motion) ----------
  // Cada seta é desenhada em ordem: um cometa de elétrons corre pela curva, o traço o acompanha, a ponta estala
  // e uma onda sai dela. No fim, o produto "se forma" com um brilho. Só roda enquanto está na tela.
  const SETA_AZUL = '#1f63d6', SVGNS = 'http://www.w3.org/2000/svg';
  const ctrlSetas = new WeakMap();
  function paraSetas(tile) {
    const c = ctrlSetas.get(tile);
    if (c) { c.parar(); ctrlSetas.delete(tile); }
  }
  function rodaSetas(tile) {
    if (!usaMotion) return;
    paraSetas(tile);
    const svg = tile.querySelector('svg');
    if (!svg) return;
    const cs = [...svg.querySelectorAll('.seta-c')], hs = [...svg.querySelectorAll('.seta-h')];
    if (!cs.length) return;
    const passo = tile.closest('.passo'), prod = passo ? passo.querySelectorAll('.tile')[1] : null, vai = passo ? passo.querySelector('.vai') : null;
    const ease = [0.65, 0, 0.35, 1];
    let ativo = true;
    const vivos = [], extras = [];
    const reg = (a) => { vivos.push(a); return a; };
    const esperar = (s) => new Promise((ok) => { const t = setTimeout(ok, s * 1000); vivos.push({ stop: () => { clearTimeout(t); ok(); } }); });
    const restaura = () => {
      extras.splice(0).forEach((e) => e.remove());
      cs.forEach((c) => { c.style.strokeDashoffset = ''; c.style.opacity = ''; });
      hs.forEach((h) => { h.style.opacity = ''; h.style.transform = ''; });
      if (prod) { prod.style.transform = ''; prod.style.boxShadow = ''; }
      tile.classList.remove('rodando');
    };
    const novo = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); svg.appendChild(e); extras.push(e); return e; };

    async function desenha(i) {
      const c = cs[i], h = hs[i], len = c.getTotalLength();
      const dur = Math.min(1.15, Math.max(0.62, len / 110));
      // cometa de elétrons: a cabeça brilha e deixa uma cauda que desbota
      const pts = Array.from({ length: 7 }, (_, k) => novo('circle', { class: 'seta-d', r: (3.1 - k * 0.38).toFixed(2), fill: SETA_AZUL, opacity: '0' }));
      const mover = (t) => pts.forEach((p, k) => {
        const tt = t - k * 0.04;
        if (tt <= 0) { p.setAttribute('opacity', 0); return; }
        const q = c.getPointAtLength(len * Math.min(1, tt));
        p.setAttribute('cx', q.x.toFixed(2)); p.setAttribute('cy', q.y.toFixed(2));
        p.setAttribute('opacity', ((0.95 - k * 0.13) * (t > 0.97 ? Math.max(0, (1 - t) / 0.03) : 1)).toFixed(2));
      });
      c.style.strokeDashoffset = 1;
      await Promise.all([reg(M.animate(0, 1, { duration: dur, ease, onUpdate: mover })), reg(M.animate(c, { strokeDashoffset: [1, 0] }, { duration: dur, ease }))]);
      if (!ativo) return;
      pts.forEach((p) => p.remove());
      // ponta que estala + onda no ponto de chegada
      const fim = c.getPointAtLength(len);
      const onda = novo('circle', { class: 'seta-onda', cx: fim.x.toFixed(2), cy: fim.y.toFixed(2), r: 4, fill: 'none', stroke: SETA_AZUL, 'stroke-width': 1.2, opacity: 0 });
      onda.style.transformBox = 'fill-box'; onda.style.transformOrigin = 'center';
      h.style.transformBox = 'fill-box'; h.style.transformOrigin = 'center';
      await Promise.all([
        reg(M.animate(h, { opacity: [0, 1], scale: [0.15, 1.5, 1] }, { duration: 0.5, ease: [0.2, 1.4, 0.4, 1] })),
        reg(M.animate(onda, { opacity: [0.75, 0], scale: [0.4, 3.2] }, { duration: 0.65, ease: 'easeOut' })),
      ]);
      onda.remove();
    }
    async function ciclo() {
      while (ativo) {
        restaura();
        tile.classList.add('rodando');
        cs.forEach((c) => { c.style.strokeDashoffset = 1; });
        hs.forEach((h) => { h.style.opacity = 0; });
        await esperar(0.55);
        for (let i = 0; i < cs.length && ativo; i++) { await desenha(i); await esperar(0.12); }
        if (!ativo) return;
        // o produto se forma: pulso de luz e a seta "→" avança
        if (prod) reg(M.animate(prod, { scale: [1, 1.06, 1], boxShadow: ['0 0 0 0 rgba(30,154,82,0)', '0 0 0 7px rgba(30,154,82,.3)', '0 0 0 0 rgba(30,154,82,0)'] }, { duration: 0.95, ease: 'easeOut' }));
        if (vai) reg(M.animate(vai, { scale: [1, 1.5, 1] }, { duration: 0.6 }));
        await esperar(3.6);
        if (!ativo) return;
        await Promise.all([reg(M.animate([...cs, ...hs], { opacity: [1, 0] }, { duration: 0.5 }))]);
        await esperar(0.5);
      }
    }
    const ctrl = { parar() { ativo = false; vivos.forEach((a) => { try { if (a.stop) a.stop(); else if (a.cancel) a.cancel(); } catch { /* já terminou */ } }); restaura(); } };
    ctrlSetas.set(tile, ctrl);
    ciclo();
  }
  const setaAnim = (el, ligada) => (ligada ? rodaSetas(el) : paraSetas(el));
  const ioSetas = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => setaAnim(e.target, e.isIntersecting)), { threshold: 0.4 }) : null;
  function hidrata(raiz) {
    raiz.querySelectorAll('.tile[data-m]').forEach((el) => {
      if (!S) return;
      const svg = S[el.dataset.m];
      el.removeAttribute('data-m');
      if (!svg) { el.classList.replace('carrega', 'erro'); el.textContent = 'estrutura indisponível'; return; }
      el.classList.remove('carrega');
      el.innerHTML = svg;
      if (svg.includes('seta-c')) { el.classList.add('com-setas'); if (ioSetas) ioSetas.observe(el); }
      const w = parseFloat((/viewBox='[\d.\-]+ [\d.\-]+ ([\d.]+)/.exec(svg) || [])[1]) || 160;
      el.style.setProperty('--w', Math.round(w));
    });
  }
  const tile = (id, i) => `<div class="tile carrega" data-m="${id}" style="--i:${i}" role="button" aria-label="Ampliar estrutura"></div>`;
  const lado = (ids, ini = 0) => `<div class="lado">${ids.map((id, k) => (k ? '<span class="mais">+</span>' : '') + tile(id, ini + k)).join('')}</div>`;
  const SETA_V = '<svg class="ar-v" viewBox="0 0 14 54"><path d="M7 2v48M2 43l5 7 5-7"/><circle class="e" r="2.3" cx="7" cy="2"><animateMotion dur="1.7s" begin="1.1s" repeatCount="indefinite" path="M0 0V42"/></circle></svg>';
  const SETA_H = '<svg class="ar-h" viewBox="0 0 72 14"><path d="M2 7h66M61 2l7 5-7 5"/><circle class="e" r="2.3" cx="2" cy="7"><animateMotion dur="1.7s" begin="1.1s" repeatCount="indefinite" path="M0 0H58"/></circle></svg>';
  const seta = (rg, cd) => `<div class="seta">${SETA_V}${SETA_H}<div class="tx">${rg ? `<span class="rg">${esc(rg)}</span>` : ''}${cd ? `<span class="cd">${esc(cd)}</span>` : ''}</div></div>`;

  // ---------- peças de tela ----------
  const etq = (tipo, id, link) => {
    const nome = nomes[tipo][id]; if (!nome) return '';
    const cor = tipo === 'mec' ? ` c-${id}` : '';
    return link ? `<a class="etq ${tipo}${cor}" href="#/${tipo}/${id}">${esc(nome)}</a>` : `<span class="etq ${tipo}${cor}">${esc(nome)}</span>`;
  };
  function itemHtml(r, i) {
    const on = salvos.has(r.i);
    return `<div class="item sobe c-${r.c[0] || 'mecanismos-gerais'}" data-c="1" style="--i:${i}"><a href="#/r/${r.i}">
      <div class="linha">Aula ${rotuloAula(r.a)}${r.s ? `<em>slides ${esc(r.s)}</em>` : ''}${dominada(r.i) ? '<span class="selo dom" title="Dominada">✓</span>' : ''}${comNota(r.i) ? '<span class="selo nota" title="Tem anotação">✎</span>' : ''}</div>
      <b>${esc(r.n)}</b><div class="etqs">${r.c.slice(0, 3).map((c) => etq('mec', c)).join('')}</div></a>
      <button class="estrela${on ? ' on' : ''}" data-salvar="${r.i}" aria-label="${on ? 'Remover dos salvos' : 'Salvar'}" aria-pressed="${on}">${STAR}</button></div>`;
  }
  const vazio = (msg) => `<div class="vazio"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>${msg}</div>`;

  // ---------- telas ----------
  // ícones (traço) usados na tela inicial e em Estudar
  const IC = {
    mapa: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="4.6" r="1.6"/><circle cx="19.2" cy="15.8" r="1.6"/><circle cx="4.8" cy="15.8" r="1.6"/><path d="M12 6.2v3.2M17.8 15l-3.3-1.8M6.2 15l3.3-1.8"/></svg>',
    transforma: '<svg viewBox="0 0 24 24"><rect x="2.8" y="8" width="6.4" height="8" rx="2"/><rect x="14.8" y="8" width="6.4" height="8" rx="2"/><path d="M10.4 12h3.2M12.2 10.2L14 12l-1.8 1.8"/></svg>',
    jogo: '<svg viewBox="0 0 24 24"><path d="M4 8h12M13 5l3 3-3 3"/><path d="M20 16H8M11 13l-3 3 3 3"/></svg>',
    cartoes: '<svg viewBox="0 0 24 24"><rect x="3.5" y="7.5" width="14" height="12" rx="2.4"/><path d="M7 4.5h11.5A2.5 2.5 0 0121 7v9"/></svg>',
    simulado: '<svg viewBox="0 0 24 24"><rect x="4.5" y="3.8" width="15" height="16.4" rx="2.4"/><path d="M8.6 9.2l1.5 1.5 2.7-3M8.6 15h7"/></svg>',
    salvos: '<svg viewBox="0 0 24 24"><path d="M12 3.8l2.5 5.3 5.8.8-4.2 4 1 5.8-5.1-2.8-5.1 2.8 1-5.8-4.2-4 5.8-.8z"/></svg>',
    notas: '<svg viewBox="0 0 24 24"><path d="M5 19l1-4L16.5 4.5a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L9 18l-4 1z"/><path d="M14.5 6.5l3 3"/></svg>',
    guia: '<svg viewBox="0 0 24 24"><path d="M5 4.5h11a3 3 0 013 3V20H8a3 3 0 01-3-3V4.5z"/><path d="M9 9h6M9 12.5h4"/></svg>',
  };
  /*@@vidro-ini*/
  // Aparência "Vidro": escondida (toque 5 vezes na versão, no fim da tela inicial). Para remover do app, veja tools/REMOVER-VIDRO.md
  const VISUAL_HTML = `<div class="visuais-caixa" id="visuais-caixa" hidden>
        <div class="sec"><h3>Aparência</h3><span>cores e visual</span></div>
        <div class="visuais" role="group" aria-label="Visual"><button class="visual v-original" data-visual="original"><i></i><b>Original</b><small>cartões sólidos</small></button><button class="visual v-vidro" data-visual="vidro"><i></i><b>Vidro</b><small>translúcido, estilo Apple</small></button></div>
      </div>`;
  /*@@vidro-fim*/
  function telaAulas() {
    const g = progressoGeral(), nAulas = D.aulas.filter((a) => a.id !== '00').length;
    const stat = (n, t) => `<div><b data-n="${n}">${n}</b><span>${t}</span></div>`;
    const atalho = (href, ic, t, sub, cor) => `<a class="atalho sobe c-${cor}" style="--i:${cor === 'a' ? 2 : cor === 'b' ? 3 : cor === 'c' ? 4 : 5}" href="${href}"><span class="at-ic">${IC[ic]}</span><b>${t}</b><small>${sub}</small></a>`;
    const itens = D.aulas.map((a, i) => { const pr = progressoAula(a.id); return `<a class="aula-card sobe" style="--i:${i + 6}" href="#/aula/${a.id}"><span class="ac-num">${a.id === '00' ? 'Ex.' : rotuloAula(a.id)}</span><b>${esc(a.nome)}</b><small>${plural(a.n, 'reação', 'reações')}</small><span class="mini-prog"><i style="width:${pr.pct.toFixed(0)}%"></i></span></a>`; }).join('');
    return {
      titulo: 'Atlas Orgânico', aba: 'aulas', prof: 0,
      html: `<section class="capa sobe">
          <svg class="hex" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 L86 29 L86 71 L50 92 L14 71 L14 29 Z"/></svg><svg class="hex" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 L86 29 L86 71 L50 92 L14 71 L14 29 Z"/></svg>
          <span class="capa-tag">Química Orgânica II · USP</span>
          <h2>Atlas de<br>reações</h2>
          <p>Toda a matéria na palma da sua mão.</p>
          <button class="capa-busca" data-ir="#/busca"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>Buscar reação ou reagente…</button>
          <div class="stats">${stat(D.reacoes.length, 'reações')}${stat(nAulas, 'aulas')}${stat(g.dom, 'dominadas')}</div>
        </section>
        <div id="instalar"></div>
        <div class="atalhos">
          ${atalho('#/mec', 'mapa', 'Mecanismos', 'guias e mapas', 'a')}
          ${atalho('#/transforma', 'transforma', 'Transformar', 'de grupo → grupo', 'b')}
          ${atalho('#/estudar', 'cartoes', 'Estudar', 'cartões e jogos', 'c')}
          ${atalho('#/salvos', 'salvos', 'Salvos', plural(salvos.size, 'reação', 'reações'), 'd')}
        </div>
        <div class="sec"><h3>Por aula</h3><span>${D.aulas.length} aulas</span></div>
        <div class="aulas-grade">${itens}</div>
        <a class="aula sobe" style="--i:${D.aulas.length + 6}" href="#/todas"><div class="num">∑</div><div class="tx"><b>Todas as reações</b><small>${plural(D.reacoes.length, 'reação', 'reações')}</small></div>${SETA_IR}</a>
        ${typeof VISUAL_HTML !== 'undefined' ? VISUAL_HTML : ''}
        <div class="tema" role="group" aria-label="Tema"><button data-tema="auto">Auto</button><button data-tema="claro">Claro</button><button data-tema="escuro">Escuro</button></div>
        <div class="rodape"><button class="avatar" data-creditos aria-label="Créditos">${DINO_AVATAR}</button><br><span data-versao>Versão ${BUILD}</span><br><button data-verificar>Verificar atualização</button></div>`,
      depois: () => { montaInstalar(); contaAte(tela); marcaTema(); typeof marcaVisual === 'function' && marcaVisual(); },
    };
  }

  function telaIndice(tipo) {
    const lista = { mec: D.categorias, nu: D.nucleofilos, el: D.eletrofilos }[tipo];
    const info = {
      mec: ['Mecanismos', 'Escolha o tipo de reação.'],
      nu: ['Nucleófilos', 'Escolha o nucleófilo (ou a espécie rica em elétrons) e veja onde ele aparece.'],
      el: ['Eletrófilos', 'Escolha o eletrófilo (substrato ou reagente) e veja as reações.'],
    }[tipo];
    const nota = tipo === 'mec' ? '' : '<p class="sub-lista">Classificação automática a partir dos reagentes e das estruturas: confira no slide em caso de dúvida.</p>';
    const guias = tipo === 'mec' ? `<div class="sec"><h3>Mapas de reações</h3><span>diagramas</span></div>${D.mapas.map((m, i) => `<a class="aula sobe" style="--i:${i + 2}" href="#/mapa/${m.id}"><div class="num guia-num">${esc(m.curto)}</div><div class="tx"><b>${esc(m.t)}</b><small>${esc(m.sub)}</small></div>${SETA_IR}</a>`).join('')}<div class="sec"><h3>Guias rápidos</h3><span>tabelas e esquemas</span></div>${D.guias.map((g, i) => `<a class="aula sobe" style="--i:${i + 2}" href="#/guia/${g.id}"><div class="num guia-num">${esc(g.curto)}</div><div class="tx"><b>${esc(g.t)}</b><small>${esc(g.sub)}</small></div>${SETA_IR}</a>`).join('')}<div class="sec"><h3>Reações por mecanismo</h3><span>${D.categorias.length} tipos</span></div>` : '';
    return {
      titulo: info[0], aba: tipo, prof: 0,
      html: `<h2 class="titulo-lista sobe">${info[0]}</h2><p class="sub-lista sobe" style="--i:1">${info[1]}</p>${nota}${guias}
        <div class="grade">${lista.map((x, i) => `<a class="ficha k-${tipo}${tipo === 'mec' ? ' c-' + x.id : ''} sobe" style="--i:${i + 2}" href="#/${tipo}/${x.id}"><b>${esc(x.nome)}</b><small>${x.n}</small></a>`).join('')}</div>`,
    };
  }

  // ---------- guias rápidos ----------
  const guiaDe = (catId) => guiaPorId.get(catId) || D.guias.find((g) => g.id !== 'decisao' && g.cats.includes(catId));
  const guiaLink = (catId) => {
    const g = guiaDe(catId);
    return g ? `<a class="guia-link sobe" style="--i:2" href="#/guia/${g.id}"><span class="gl-ic">${esc(g.curto)}</span><span class="gl-tx"><b>Guia rápido: ${esc(g.t)}</b><small>Tabelas de fatores, esquema e dicas</small></span>${SETA_IR}</a>` : '';
  };
  const marca = (t) => String(t).replace(/^(✓)/, '<span class="ok">$1</span>').replace(/^(✗)/, '<span class="no">$1</span>');
  const celulaHtml = (c) => Array.isArray(c) ? `<div class="multi">${c.map(celulaHtml).join('')}</div>`
    : c && typeof c === 'object' ? `<div class="tile mini carrega" data-m="${c.s}" role="button" aria-label="Ampliar estrutura"></div>` : marca(c);
  // Tabelas "Fator | Favorece | Desfavorece" viram cartões (sem rolagem lateral); "Propriedade | valor" vira lista.
  const limpa = (t) => String(t || '').replace(/^[✓✗]\s*/, '');
  const ordemHtml = (o) => `<div class="ordem">${o.map(([r, n], i) => (i ? '<span class="gt">›</span>' : '') + `<span class="oc n${n}">${esc(r)}</span>`).join('')}</div>`;
  const fatoresHtml = (b) => `<div class="cartao tabela sobe"><h3 class="tb-titulo">${esc(b.t)}</h3>${b.rows.map((l) => `<div class="fator"><h4>${esc(l[0])}</h4>${b.ord && b.ord[l[0]] ? ordemHtml(b.ord[l[0]]) : ''}${l[1] ? `<div class="fav">${limpa(l[1])}</div>` : ''}${l[2] ? `<div class="des">${limpa(l[2])}</div>` : ''}</div>`).join('')}${b.nota ? `<p class="tb-nota">${esc(b.nota)}</p>` : ''}</div>`;
  const kvHtml = (b) => `<div class="cartao tabela sobe"><h3 class="tb-titulo">${esc(b.t)}</h3><dl class="kv">${b.rows.map((l) => `<div><dt>${esc(l[0])}</dt><dd>${celulaHtml(l[1])}</dd></div>`).join('')}</dl>${b.nota ? `<p class="tb-nota">${esc(b.nota)}</p>` : ''}</div>`;

  // Seletor interativo: escolha o substrato e o reagente e veja o mecanismo
  const MEC_INFO = {
    SN2: 'Uma etapa, ataque pela retaguarda: inversão de configuração.',
    SN1: 'Passa por carbocátion: racemização e possível rearranjo.',
    E2: 'Base forte retira o H anti ao grupo abandonador: Zaitsev (Hofmann se a base é volumosa).',
    E1: 'Passa por carbocátion, favorecida por calor: Zaitsev e possível rearranjo.',
  };
  const rotCol = (c) => c.split(/<br\s*\/?>/i)[0].replace(/<[^>]+>/g, '');
  const subCol = (c) => ((/<small>(.*?)<\/small>/.exec(c) || [])[1] || '');
  function resultadoSel(b, r, c) {
    const cel = String(b.rows[r][c + 1]);
    const txt = cel.replace(/<[^>]+>/g, ' ');
    const mecs = [...new Set(txt.match(/SN1|SN2|E1|E2/g) || [])];
    if (!mecs.length) return `<div class="sel-badges"><span class="badge-m m-sem">Sem reação</span></div><p class="sel-nota">${esc(txt.replace(/[✗×]/g, '').trim())}. Nu e base fracos não atacam substrato primário nem metila nessas condições.</p>`;
    return `<div class="sel-badges">${mecs.map((m) => `<a class="badge-m m-${m}" href="#/guia/${m.toLowerCase()}">${m}</a>`).join('')}</div>
      ${txt.replace(/SN1|SN2|E1|E2|[\/+()]/g, '').trim().length > 2 ? `<p class="sel-nota"><b>${cel}</b></p>` : ''}${mecs.map((m) => `<p class="sel-info"><b>${m}</b>: ${MEC_INFO[m]}</p>`).join('')}`;
  }
  function seletorHtml(b) {
    const r0 = Math.min(2, b.rows.length - 1), c0 = 1;
    return `<div class="cartao seletor sobe" data-r="${r0}" data-c="${c0}"><h3 class="tb-titulo">Qual mecanismo ocorre?</h3>
      <div class="sel-corpo"><div class="sel-grupo"><span>1. Substrato</span><div class="sel-chips">${b.rows.map((l, i) => `<button class="chip${i === r0 ? ' on' : ''}" data-sr="${i}">${String(l[0])}</button>`).join('')}</div></div>
      <div class="sel-grupo"><span>2. Reagente</span><div class="sel-chips">${b.cols.slice(1).map((cl, i) => `<button class="chip${i === c0 ? ' on' : ''}" data-sc="${i}">${esc(rotCol(cl))}</button>`).join('')}</div><small class="sel-sub">${subCol(b.cols[c0 + 1])}</small></div>
      <div class="sel-res" aria-live="polite">${resultadoSel(b, r0, c0)}</div></div></div>`;
  }
  function ligaSeletor(b) {
    const box = document.querySelector('.seletor');
    if (!box) return;
    box.addEventListener('click', (e) => {
      const sr = e.target.closest('[data-sr]'), sc = e.target.closest('[data-sc]');
      if (!sr && !sc) return;
      if (sr) box.dataset.r = sr.dataset.sr;
      if (sc) box.dataset.c = sc.dataset.sc;
      box.querySelectorAll('[data-sr]').forEach((x) => x.classList.toggle('on', x.dataset.sr === box.dataset.r));
      box.querySelectorAll('[data-sc]').forEach((x) => x.classList.toggle('on', x.dataset.sc === box.dataset.c));
      box.querySelector('.sel-sub').innerHTML = subCol(b.cols[+box.dataset.c + 1]);
      const res = box.querySelector('.sel-res');
      res.innerHTML = resultadoSel(b, +box.dataset.r, +box.dataset.c);
      if (usaMotion) M.animate(res.children, { opacity: [0, 1], y: [10, 0] }, { type: 'spring', stiffness: 380, damping: 26, delay: M.stagger(0.05) });
    });
  }

  const tabelaPadrao = (b) => `<div class="cartao tabela sobe"><h3 class="tb-titulo">${esc(b.t)}</h3><div class="tb-wrap"><table class="tb"><thead><tr>${b.cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${b.rows.map((l) => `<tr>${l.map((c, i) => (i === 0 ? '<th scope="row">' : '<td>') + celulaHtml(c) + (i === 0 ? '</th>' : '</td>')).join('')}</tr>`).join('')}</tbody></table></div><div class="tb-dica" hidden>deslize para ver mais <span class="nudge">→</span></div>${b.nota ? `<p class="tb-nota">${esc(b.nota)}</p>` : ''}</div>`;

  const mecHtml = (b) => `<div class="cartao mec sobe"><h3 class="tb-titulo">${esc(b.t)}</h3>${b.nota ? `<p class="mec-nota">${esc(b.nota)}</p>` : ''}
    <div class="mec-passos">${b.passos.map((p, i) => `<div class="passo sobe" style="--i:${i}"><div class="n">${i + 1}</div><h4><span>${esc(p.t.replace(/^\d+\.\s*/, ''))}</span>${p.r ? `<button class="rep-btn" data-repetir aria-label="Repetir a animação"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4.5V9h4.5"/></svg></button>` : ''}</h4><p>${esc(p.x)}</p><div class="lado">${tile(p.r, 0)}<span class="vai">→</span>${tile(p.p, 1)}</div></div>`).join('')}</div></div>`;
  const tabelaHtml = (b) => (b.cols.length === 3 && b.cols[0] === 'Fator' ? fatoresHtml(b) : b.cols.length === 2 && b.cols[0] === 'Propriedade' ? kvHtml(b) : tabelaPadrao(b));

  function telaGuia(id) {
    const g = guiaPorId.get(id);
    if (!g) return null;
    const e = g.esq;
    const primeira = g.id === 'decisao' ? g.bl.find((b) => b.k === 't') : null;
    const blocos = g.bl.map((b) => b.k === 'l'
      ? `<div class="cartao dicas sobe"><h3 class="tb-titulo">${esc(b.t)}</h3><ul>${b.itens.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`
      : b.k === 'm' ? mecHtml(b)
      : (b === primeira ? seletorHtml(b) : '') + tabelaHtml(b)).join('');
    const ver = g.cats.filter((c) => nomes.mec[c]).map((c) => `<a class="btn" href="#/mec/${c}">Ver reações de ${esc(nomes.mec[c])}<span class="n">${D.categorias.find((x) => x.id === c).n}</span></a>`).join('');
    return {
      titulo: g.topo || g.t, aba: 'mec', prof: 1,
      html: `<article class="det guia">
        <h2 class="sobe">${esc(g.t)}</h2><p class="origem sobe" style="--i:1">${esc(g.sub)}</p>
        <p class="intro sobe" style="--i:2">${g.intro}</p>
        <div class="cartao sobe" style="--i:3"><div class="rotulo-c">Esquema</div><div class="esquema">${lado(e.r)}${seta(e.rg, e.cd)}${lado(e.p, e.r.length)}</div>${e.leg ? `<p class="tb-nota">${esc(e.leg)}</p>` : ''}</div>
        ${blocos}
        <div class="rotulo">Exemplos nas aulas</div><div class="acoes colunas">${ver}</div></article>`,
      depois: () => { if (primeira) ligaSeletor(primeira); document.querySelectorAll('.tb-wrap').forEach((w) => { if (w.scrollWidth > w.clientWidth + 4) w.nextElementSibling.hidden = false; w.addEventListener('scroll', () => { w.nextElementSibling.hidden = true; }, { passive: true, once: true }); }); },
    };
  }

  // lista de reações (aula, mecanismo, nu, el, todas, salvos)
  let filtroAtual = null;
  function telaLista(tipo, id) {
    let base, nome, aba, prof = 1, sub = '';
    if (tipo === 'aula') { base = D.reacoes.filter((r) => r.a === id); nome = 'Aula ' + rotuloAula(id); sub = nomes.aula[id] || ''; aba = 'aulas'; }
    else if (tipo === 'todas') { base = D.reacoes; nome = 'Todas as reações'; aba = 'aulas'; }
    else if (tipo === 'salvos') { base = D.reacoes.filter((r) => salvos.has(r.i)); nome = 'Salvos'; aba = 'estudar'; prof = 1; sub = 'Suas reações favoritas, mesmo offline.'; }
    else { base = D.reacoes.filter((r) => r[{ mec: 'c', nu: 'nu', el: 'el' }[tipo]].includes(id)); nome = nomes[tipo][id] || 'Reações'; aba = tipo; }
    if (!nome) return null;
    // filtros: por mecanismo dentro de uma aula; por aula nos demais
    const porAula = tipo !== 'aula';
    const cont = new Map();
    base.forEach((r) => (porAula ? [r.a] : r.c).forEach((k) => cont.set(k, (cont.get(k) || 0) + 1)));
    const chaveFiltro = tipo + ':' + id;
    if (!filtroAtual || filtroAtual.chave !== chaveFiltro) filtroAtual = { chave: chaveFiltro, v: null };
    const chips = tipo === 'todas' ? [] : [...cont].sort((a, b) => (porAula ? a[0].localeCompare(b[0]) : b[1] - a[1]));
    return {
      titulo: nome, aba, prof,
      html: `<h2 class="titulo-lista sobe">${esc(nome)}</h2>
        <p class="sub-lista sobe" style="--i:1">${sub ? esc(sub) + ' · ' : ''}<span id="contagem"></span></p>
        ${tipo === 'mec' ? guiaLink(id) : ''}
        ${tipo === 'todas' ? `<div class="sobe" style="--i:2" id="filtros-av">${filtrosHtml()}</div>` : ''}
        ${chips.length > 1 ? `<div class="filtros sobe" style="--i:2" id="filtros"><button class="chip on" data-f="">Todas</button>${chips.map(([k, n]) => `<button class="chip" data-f="${esc(k)}">${esc(porAula ? 'Aula ' + rotuloAula(k) : nomes.mec[k] || k)}<i>${n}</i></button>`).join('')}</div>` : ''}
        <div id="itens"></div>`,
      depois: () => {
        const pinta = () => {
          const f = filtroAtual.v;
          let l = f ? base.filter((r) => (porAula ? r.a === f : r.c.includes(f))) : base;
          if (tipo === 'todas') l = l.filter(passaFiltros);
          $('#contagem').textContent = plural(l.length, 'reação', 'reações');
          $('#itens').innerHTML = l.length ? l.map(itemHtml).join('') : vazio(tipo === 'salvos' ? 'Toque na estrela de uma reação para guardá-la aqui.' : 'Nada por aqui.');
          ultimaLista = l.map((r) => r.i);
          document.querySelectorAll('#filtros .chip').forEach((c) => c.classList.toggle('on', c.dataset.f === (f || '')));
        };
        const fb = $('#filtros');
        fb?.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (!c) return; filtroAtual.v = c.dataset.f || null; pinta(); });
        pinta();
      },
    };
  }
  let ultimaLista = [];

  function telaDetalhe(id) {
    const r = porId.get(+id);
    if (!r) return null;
    const on = salvos.has(r.i);
    const lista = ultimaLista.includes(r.i) ? ultimaLista : D.reacoes.filter((x) => x.a === r.a).map((x) => x.i);
    const pos = lista.indexOf(r.i);
    const ant = porId.get(lista[pos - 1]), prox = porId.get(lista[pos + 1]);
    const nav = (x, rot, cls) => x ? `<a href="#/r/${x.i}"><small>${rot}</small><span>${esc(x.n)}</span></a>` : `<a aria-disabled="true"><small>${rot}</small><span>—</span></a>`;
    const n0 = r.r.length;
    const mec = r.m.length ? `<div class="rotulo">Mecanismo passo a passo</div>${r.m.map((m, k) => `<div class="passo sobe" style="--i:${k + 3}"><div class="n">${k + 1}</div><h4>${esc(m.t)}</h4><p>${esc(m.x)}</p><div class="lado">${m.s.map((s, j) => (j ? '<span class="vai">→</span>' : '') + tile(s, j)).join('')}</div></div>`).join('')}` : '';
    return {
      titulo: `Aula ${rotuloAula(r.a)}${r.s ? ' · slide ' + r.s : ''}`, aba: null, prof: 2,
      html: `<article class="det">
        <h2 class="sobe">${esc(r.n)}</h2>
        <p class="origem sobe" style="--i:1">${esc(nomes.aula[r.a] || '')}${r.s ? ' · slides ' + esc(r.s) : ''}</p>
        <div class="etqs sobe" style="--i:2">${r.c.map((c) => etq('mec', c, 1)).join('')}${r.nu.map((c) => etq('nu', c, 1)).join('')}${r.el.map((c) => etq('el', c, 1)).join('')}</div>
        <div class="acoes sobe" style="--i:3"><button class="btn${on ? ' on' : ''}" data-salvar-d="${r.i}">${STAR}<span>${on ? 'Salvo' : 'Salvar'}</span></button>
        ${navigator.share ? '<button class="btn" data-compartilhar>Compartilhar</button>' : ''}</div>
        <div class="cartao sobe" style="--i:4"><div class="esquema">${lado(r.r)}${seta(r.rg, r.cd)}${lado(r.p, n0)}</div></div>
        ${r.d3 && r.d3.length ? `<div class="cartao v3d sobe" style="--i:5"><div class="v3d-t"><svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/></svg><b>Ver em 3D</b></div>
          <p class="v3d-s">Abre o PubChem, com o modelo 3D interativo (precisa de internet). Só carrega quando você toca: não pesa no app.</p>
          <div class="v3d-links">${r.d3.map((m) => `<a class="v3d-link" href="https://pubchem.ncbi.nlm.nih.gov/compound/${m.c}#section=3D-Conformer" target="_blank" rel="noopener noreferrer"><span class="v3d-k">${m.k}</span><b>${esc(m.t)}</b><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg></a>`).join('')}</div></div>` : ''}
        ${r.nt ? `<div class="cartao sobe" style="--i:5"><p class="notas">${r.nt}</p></div>` : ''}
        ${estudoDetalheHtml(r)}
        ${mec}
        <div class="nav-det">${nav(ant, '<span class="nudge-e">←</span> Anterior')}${nav(prox, 'Próxima <span class="nudge">→</span>')}</div></article>`,
      depois: estudoDetalheDepois,
    };
  }

  // ---------- busca por transformação: grupo funcional de partida → grupo funcional de chegada ----------
  const modoBusca = (on) => `<div class="modo-busca" role="tablist"><a href="#/busca" class="${on === 'texto' ? 'on' : ''}">Por texto</a><a href="#/transforma" class="${on === 'trans' ? 'on' : ''}">Por transformação</a></div>`;
  const nomeGrupo = (id) => (D.grupos.find((g) => g.id === id) || {}).nome || id;
  // o que "some" é a origem e o que "aparece" é o destino; se nada some (ex.: nitração do benzeno), vale o que já existia/ficou
  const origens = (r) => { const a = r.gs.filter((x) => !r.gp.includes(x)); return a.length ? a : r.gs; };
  const destinos = (r) => { const a = r.gp.filter((x) => !r.gs.includes(x)); return a.length ? a : r.gp; };
  let trans = guarda.ler('atlas.trans', { de: 'haleto', para: 'alceno', rg: '' });
  function telaTransforma() {
    const opcoes = (sel, vazio) => `<option value="">${vazio}</option>` + [...D.grupos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')).map((g) => `<option value="${g.id}"${g.id === sel ? ' selected' : ''}>${esc(g.nome)}</option>`).join('');
    return {
      titulo: 'Buscar', aba: undefined, prof: 1,
      html: `${modoBusca('trans')}
        <p class="sub-lista sobe">Escolha o grupo funcional de partida e o de chegada: o atlas mostra os reagentes que fazem a transformação e as reações da matéria.</p>
        <div class="trans-sel sobe" style="--i:1">
          <label><span>Parto de</span><select id="t-de">${opcoes(trans.de, 'Qualquer grupo')}</select></label>
          <button class="trans-troca" id="t-troca" aria-label="Trocar partida e chegada"><svg viewBox="0 0 24 24"><path d="M7 4v14M3.5 14.5 7 18l3.5-3.5M17 20V6M13.5 9.5 17 6l3.5 3.5"/></svg></button>
          <label><span>Chego em</span><select id="t-para">${opcoes(trans.para, 'Qualquer grupo')}</select></label>
        </div>
        <div id="t-res"></div>`,
      depois: () => {
        const de = $('#t-de'), para = $('#t-para'), out = $('#t-res');
        const filtra = () => D.reacoes.filter((r) => (!trans.de || origens(r).includes(trans.de)) && (!trans.para || destinos(r).includes(trans.para)) && (trans.de || trans.para));
        const desenha = () => {
          guarda.gravar('atlas.trans', trans);
          if (!trans.de && !trans.para) {
            const pares = {};
            D.reacoes.forEach((r) => origens(r).forEach((a) => destinos(r).forEach((b) => { if (a !== b) pares[a + '|' + b] = (pares[a + '|' + b] || 0) + 1; })));
            const top = Object.entries(pares).sort((a, b) => b[1] - a[1]).slice(0, 14);
            out.innerHTML = `<div class="sec"><h3>Transformações comuns</h3></div><div class="filtros" style="flex-wrap:wrap;overflow:visible">${top.map(([k, n]) => { const [a, b] = k.split('|'); return `<button class="chip" data-par="${k}">${esc(nomeGrupo(a))} → ${esc(nomeGrupo(b))} <small>${n}</small></button>`; }).join('')}</div>`;
            return;
          }
          const res = filtra();
          // reagentes que servem para essa transformação (agrupados pelo texto do reagente)
          const porRg = new Map();
          res.forEach((r) => { const k = (r.rg || '').trim(); if (k) porRg.set(k, (porRg.get(k) || 0) + 1); });
          const regs = [...porRg].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'));
          const lista = trans.rg ? res.filter((r) => (r.rg || '').trim() === trans.rg) : res;
          let extra = '';
          if (trans.de && !trans.para || !trans.de && trans.para) { // só um lado: mostra aonde dá para chegar / de onde vem
            const cont = {};
            res.forEach((r) => (trans.de ? destinos(r) : origens(r)).forEach((g) => { if (g !== (trans.de || trans.para)) cont[g] = (cont[g] || 0) + 1; }));
            const alt = Object.entries(cont).sort((a, b) => b[1] - a[1]);
            extra = `<div class="sec"><h3>${trans.de ? 'Dá para chegar em' : 'Vem de'}</h3><span>toque para escolher</span></div><div class="filtros" style="flex-wrap:wrap;overflow:visible">${alt.map(([g, n]) => `<button class="chip" data-alvo="${g}">${esc(nomeGrupo(g))} <small>${n}</small></button>`).join('')}</div>`;
          }
          if (!res.length) { out.innerHTML = vazio('Nenhuma reação do atlas faz essa transformação.<br>Tente outro par de grupos.'); return; }
          ultimaLista = lista.map((r) => r.i);
          out.innerHTML = `${extra}
            <div class="sec"><h3>Reagentes</h3><span>${plural(regs.length, 'opção', 'opções')}</span></div>
            <div class="reag-lista">${regs.map(([k, n]) => `<button class="reag${trans.rg === k ? ' on' : ''}" data-rg="${esc(k)}"><b>${esc(k)}</b><small>${plural(n, 'reação', 'reações')}</small></button>`).join('')}</div>
            <div class="sec"><h3>Reações</h3><span>${plural(lista.length, 'reação', 'reações')}${trans.rg ? ' com este reagente' : ''}</span></div>${lista.slice(0, 80).map(itemHtml).join('')}${lista.length > 80 ? `<p class="vazio">Mostrando 80 de ${lista.length}.</p>` : ''}`;
          hidrata(out);
        };
        de.addEventListener('change', () => { trans = { de: de.value, para: trans.para, rg: '' }; desenha(); });
        para.addEventListener('change', () => { trans = { de: trans.de, para: para.value, rg: '' }; desenha(); });
        $('#t-troca').addEventListener('click', () => { trans = { de: trans.para, para: trans.de, rg: '' }; de.value = trans.de; para.value = trans.para; desenha(); });
        out.addEventListener('click', (e) => {
          const rg = e.target.closest('[data-rg]'); if (rg) { trans.rg = trans.rg === rg.dataset.rg ? '' : rg.dataset.rg; desenha(); return; }
          const al = e.target.closest('[data-alvo]'); if (al) { if (trans.de) trans.para = al.dataset.alvo; else trans.de = al.dataset.alvo; trans.rg = ''; de.value = trans.de; para.value = trans.para; desenha(); return; }
          const pr = e.target.closest('[data-par]'); if (pr) { const [a, b] = pr.dataset.par.split('|'); trans = { de: a, para: b, rg: '' }; de.value = a; para.value = b; desenha(); }
        });
        desenha();
      },
    };
  }

  function telaBusca() {
    return {
      titulo: 'Buscar', aba: undefined, prof: 1,
      html: `${modoBusca('texto')}<div class="campo"><input id="q" type="search" placeholder="Ex.: SN2, t-BuBr, Zaitsev, epóxido…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></div><div id="filtros-av">${filtrosHtml()}</div><div id="resultados"></div>`,
      depois: () => {
        const q = $('#q'), out = $('#resultados');
        const sugest = ['SN2', 'SN1', 'E2', 'Zaitsev', 'Markovnikov', 'carbeno', 'bromônio', 'epóxido', 'rearranjo', 'Hammond'];
        const vazioInicial = () => { out.innerHTML = `<div class="sec"><h3>Sugestões</h3></div><div class="filtros" style="flex-wrap:wrap;overflow:visible">${sugest.map((s) => `<button class="chip" data-sug="${s}">${s}</button>`).join('')}</div>`; };
        let t;
        const filtra = (tok) => D.reacoes.filter((r) => tok.every((k) => casa(r.i, k)) && passaFiltros(r));
        const buscar = () => {
          let tok = norm(q.value).split(/\s+/).filter(Boolean), aviso = '';
          if (!tok.length && !filtrosAtivos()) return vazioInicial();
          let res = filtra(tok);
          if (!res.length && tok.length) { // tolerância a erro de digitação: troca cada palavra pela mais parecida do atlas
            const certo = tok.map((k) => (D.reacoes.some((r) => casa(r.i, k)) ? k : corrige(k)));
            if (certo.join(' ') !== tok.join(' ')) { const r2 = filtra(certo); if (r2.length) { res = r2; aviso = `<p class="didyou">Mostrando resultados para “<b>${esc(certo.join(' '))}</b>”</p>`; } }
          }
          ultimaLista = res.map((r) => r.i);
          out.innerHTML = `<div class="sec"><h3>Resultados</h3><span>${plural(res.length, 'reação', 'reações')}</span></div>${aviso}` + (res.length ? res.slice(0, 80).map(itemHtml).join('') + (res.length > 80 ? `<p class="vazio">Mostrando 80 de ${res.length}. Refine a busca.</p>` : '') : vazio('Nada encontrado. Tente outra palavra.'));
        };
        buscaAtual = buscar;
        q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 90); });
        out.addEventListener('click', (e) => { const s = e.target.closest('[data-sug]'); if (s) { q.value = s.dataset.sug; buscar(); } });
        if (filtrosAtivos()) buscar(); else vazioInicial();
        q.focus({ preventScroll: true });
      },
    };
  }
  let buscaAtual = null;

  // ---------- instalar (atalho na tela inicial) ----------
  let promptInstalar = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; montaInstalar(); });
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function montaInstalar() {
    const el = $('#instalar');
    if (!el || standalone() || guarda.ler('atlas.instalar', false)) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (promptInstalar) el.innerHTML = '<div class="instalar sobe"><p><b>Instale o atlas</b><br>Abre como app e funciona offline.</p><button class="btn" data-instalar>Instalar</button></div>';
    else if (ios) el.innerHTML = '<div class="instalar sobe"><p><b>Adicione à tela inicial</b><br>Toque em Compartilhar e depois em “Adicionar à Tela de Início”. Funciona offline.</p><button class="btn" data-fechar-instalar>Ok</button></div>';
  }

  // ---------- roteador ----------
  let profAnterior = -1, abaAtual = 'aulas', rotaAtual = '';
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resolve(hash) {
    const [, a, b] = hash.split('?')[0].split('/');
    if (!a || a === 'aulas') return telaAulas();
    if (a === 'mec' || a === 'nu' || a === 'el') return b ? telaLista(a, b) : telaIndice(a);
    if (a === 'guia') return telaGuia(b);
    if (a === 'mapa') return telaMapa(b);
    if (a === 'jogo') return b ? telaJogoMapa(b) : telaJogos();
    if (a === 'aula') return telaLista('aula', b);
    if (a === 'todas') return telaLista('todas');
    if (a === 'salvos') return telaLista('salvos');
    if (a === 'estudar') return telaEstudar();
    if (a === 'cartoes') return telaCartoes();
    if (a === 'simulado') return telaSimulado();
    if (a === 'notas') return telaNotas();
    if (a === 'r') return telaDetalhe(b);
    if (a === 'busca') return telaBusca();
    if (a === 'transforma') return telaTransforma();
    return null;
  }
  const TITULOS = { aulas: 'Aulas', mec: 'Mecanismos', nu: 'Nucleófilos', el: 'Eletrófilos', salvos: 'Salvos', estudar: 'Estudar' };

  function mostra() {
    if (!D) return;
    fechaZoom();
    let hash = location.hash || '#/aulas';
    const t = resolve(hash) || (hash = '#/aulas', telaAulas());
    if (t.aba !== undefined && t.aba !== null) abaAtual = t.aba;
    else if (t.aba === null) abaAtual = abaAtual;
    const dir = profAnterior < 0 ? '' : t.prof > profAnterior ? 'frente' : t.prof < profAnterior ? 'tras' : '';
    profAnterior = t.prof;
    rotaAtual = hash;
    titulo.textContent = t.prof === 0 && TITULOS[t.aba] && hash.split('/').length < 3 ? (t.aba === 'aulas' ? 'Atlas Orgânico' : TITULOS[t.aba]) : t.titulo;
    voltar.hidden = t.prof === 0;
    document.title = (t.titulo === 'Atlas Orgânico' ? '' : t.titulo + ' · ') + 'Atlas de Reações Orgânicas';
    const aplica = (vt) => {
      tela.innerHTML = `<div class="tela ${usaMotion ? '' : dir}">${t.html}</div>`;
      window.scrollTo(0, 0);
      hidrata(tela);
      t.depois && t.depois();
      marcaAba();
      animaTela(dir, vt);
    };
    // Navegação com a View Transitions API: a tela antiga e a nova se fundem (e desfocam) em vez de trocar de repente
    if (document.startViewTransition && !reduzido && dir !== '' && !document.hidden && document.documentElement.dataset.visual === 'vidro') {
      document.documentElement.dataset.nav = dir;
      document.startViewTransition(() => aplica(true));
    } else aplica(false);
  }

  function marcaAba() {
    abas.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.aba === abaAtual));
    const on = abas.querySelector('a.on');
    if (!on) { pilula.style.opacity = 0; return; }
    // offsetLeft/offsetWidth não sofrem com a animação de entrada da dock (scale)
    pilula.style.opacity = 1;
    movePilula(on.offsetLeft, on.offsetWidth);
  }
  window.addEventListener('resize', marcaAba);
  window.addEventListener('hashchange', mostra);
  window.addEventListener('scroll', () => topo.classList.toggle('rolou', scrollY > 6), { passive: true });

  voltar.addEventListener('click', () => {
    if (history.length > 1 && profAnterior > 0 && document.referrer !== undefined && window.__navegou) history.back();
    else { const p = rotaAtual.split('/'); location.hash = p.length > 2 && p[1] !== 'r' ? '#/' + (TITULOS[abaAtual] ? abaAtual : 'aulas') : '#/' + abaAtual; }
  });
  window.addEventListener('hashchange', () => { window.__navegou = true; });
  $('#buscar').addEventListener('click', () => { location.hash = '#/busca'; });
  $('#salvosbtn').addEventListener('click', () => { location.hash = '#/salvos'; });
  atualizaBadgeSalvos();

  // ---------- Motion (animações com a biblioteca Motion, a API do Framer) ----------
  // Se a biblioteca não carregar (ou o sistema pedir menos movimento), tudo continua visível e funcional.
  const M = window.Motion;
  const usaMotion = !!(M && M.animate && M.inView) && !reduzido;
  if (usaMotion) document.documentElement.classList.add('mo');
  const MOLA = { type: 'spring', stiffness: 300, damping: 26 };

  // Cada bloco sobe e aparece quando entra na tela (em cascata na primeira dobra)
  let t0Render = performance.now();
  function entrada(el, i) {
    el.dataset.mo = '1';
    el.classList.add('pre');
    const atraso = performance.now() - t0Render > 450 ? 0 : Math.min(i, 14) * 0.045;
    M.inView(el, () => {
      const fim = () => { el.classList.remove('pre'); el.style.opacity = ''; el.style.transform = ''; };
      M.animate(el, { opacity: [0, 1], y: [24, 0], scale: [0.97, 1] }, { ...MOLA, stiffness: 260, delay: atraso }).then(fim, fim);
    }, { margin: '0px 0px -5% 0px' });
  }
  if (usaMotion) {
    new MutationObserver(() => {
      t0Render = performance.now();
      tela.querySelectorAll('.sobe:not([data-mo])').forEach((el, i) => entrada(el, i));
    }).observe(tela, { childList: true, subtree: true });
  }

  // A tela inteira desliza (para a frente ou para trás) com mola
  function animaTela(dir, vt) {
    const el = tela.firstElementChild;
    if (!usaMotion || !el) return;
    const fim = () => { el.style.opacity = ''; el.style.transform = ''; };
    if (!vt) M.animate(el, { opacity: [0, 1], x: [dir === 'frente' ? 40 : dir === 'tras' ? -40 : 0, 0], y: [dir ? 0 : 14, 0] }, { ...MOLA, stiffness: 320, damping: 30 }).then(fim, fim);
    // Estruturas do esquema aparecem uma a uma, com um quique
    const tiles = el.querySelectorAll('.esquema .tile');
    if (tiles.length) M.animate(tiles, { opacity: [0, 1], scale: [0.55, 1] }, { type: 'spring', stiffness: 380, damping: 18, delay: M.stagger(0.09, { startDelay: 0.3 }) });
  }

  // A pílula da dock desliza com mola até a aba escolhida
  function movePilula(x, w) {
    if (usaMotion && pilula.dataset.pos) M.animate(pilula, { x, width: w }, { type: 'spring', stiffness: 420, damping: 30 });
    else { pilula.style.width = `${w}px`; pilula.style.transform = `translateX(${x}px)`; }
    pilula.dataset.pos = '1';
  }

  // Estrela com quique
  function pulaEstrela(svg) {
    if (!usaMotion || !svg) return;
    M.animate(svg, { scale: [0.45, 1], rotate: [-28, 0] }, { duration: 0.55, ease: [0.3, 1.7, 0.5, 1] });
  }

  // Item removido dos Salvos recolhe e desliza para fora
  function saiItem(item) {
    if (!item) return;
    const fim = () => {
      item.remove();
      const n = document.querySelectorAll('#itens .item').length;
      const c = $('#contagem'); if (c) c.textContent = plural(n, 'reação', 'reações');
      if (!n) $('#itens').innerHTML = vazio('Toque na estrela de uma reação para guardá-la aqui.');
    };
    if (!usaMotion) { setTimeout(mostra, 260); return; }
    const h = item.offsetHeight;
    item.style.overflow = 'hidden';
    M.animate(item, { opacity: [1, 0], x: [0, 80], scale: [1, 0.96], height: [`${h}px`, '0px'], marginBottom: ['9px', '0px'] }, { duration: 0.4, ease: [0.4, 0, 0.2, 1] }).then(fim, fim);
  }

  // Números do cartão de topo contando
  function contaAte(raiz) {
    raiz.querySelectorAll('[data-n]').forEach((el) => {
      const n = +el.dataset.n;
      if (!usaMotion) { el.textContent = n; return; }
      el.textContent = 0;
      M.animate(0, n, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { el.textContent = Math.round(v); } });
    });
  }

  // ---------- easter egg: créditos ----------
  // O dinossauro é a imagem original vetorizada (tools/vetorizar.py): silhueta em partes + traços pretos.
  // Animação com GSAP (DrawSVG desenha os traços, SplitText revela as letras), carregado só ao abrir.
  const DINO_AVATAR = `<img src="dino.png?v=${BUILD}" alt="" width="54" height="54">`;
  let creditosEl = null, gsapPronto = null;

  function carregaGsap() {
    if (gsapPronto) return gsapPronto;
    const v = '?v=' + BUILD;
    const script = (src) => new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src + v; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
    gsapPronto = Promise.all([
      script('gsap.min.js').then(() => Promise.all([script('DrawSVGPlugin.min.js'), script('SplitText.min.js')])).then(() => window.gsap.registerPlugin(window.DrawSVGPlugin, window.SplitText)),
      fetch('dino-vetor.json' + v).then((r) => r.json()),
    ]).then(([, vetor]) => vetor).catch((e) => { gsapPronto = null; throw e; });
    return gsapPronto;
  }

  // Acessórios do Mutaninho (desenhados nas coordenadas do dinossauro). Ganham-se acertando 100% num simulado.
  const ACESSORIOS = [{
    id: 'oculos', slot: 'rosto', nome: 'Óculos de sol', como: 'Ganhe em um simulado 100%', vb: '436 76 100 48',
    arte: `<path d="M479 91 L452 86" stroke="#111" stroke-width="4" stroke-linecap="round" fill="none"/>
      <g transform="translate(478 88)"><path d="M0 3 L26 0 Q28 14 20 20 Q10 24 3 18 Q-2 11 0 3 Z" fill="#111" stroke="#111" stroke-width="3" stroke-linejoin="round"/><path d="M5 9 L12 7 M14 12 L17 11" stroke="#f6f3ec" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".92"/></g>
      <g transform="translate(538 88) scale(-1 1)"><path d="M0 3 L26 0 Q28 14 20 20 Q10 24 3 18 Q-2 11 0 3 Z" fill="#111" stroke="#111" stroke-width="3" stroke-linejoin="round"/><path d="M5 9 L12 7 M14 12 L17 11" stroke="#f6f3ec" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".92"/></g>
      <path d="M502 90 Q508 87 514 89" stroke="#111" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <path d="M477 89.5 L539 86.5" stroke="#111" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  }, {
    id: 'gorro', slot: 'cabeca', nome: 'Gorro de Natal', como: 'Ganhe em um simulado 100%', vb: '432 28 100 72',
    arte: `<path d="M486 48 Q462 32 446 50" stroke="#111" stroke-width="15" fill="none" stroke-linecap="round"/>
      <path d="M486 48 Q462 32 446 50" stroke="#d93a2f" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M454 86 Q458 58 484 46 Q502 42 511 54 Q517 66 514 82 Z" fill="#d93a2f" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M449 84 Q482 89 518 79 L520 87 Q484 97 449 92 Z" fill="#f6f3ec" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="444" cy="52" r="8.5" fill="#f6f3ec" stroke="#111" stroke-width="3"/>`,
  }, {
    id: 'bone', slot: 'cabeca', nome: 'Boné', como: 'Ganhe em um simulado 100%', vb: '432 50 120 50',
    arte: `<path d="M456 85 Q456 60 485 59 Q514 60 515 82 Z" fill="#1f63d6" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M485 59 Q480 70 482 84" stroke="#111" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>
      <circle cx="485" cy="58.5" r="3" fill="#111"/>
      <path d="M508 80 Q532 78 545 87 Q526 90 507 88 Z" fill="#111" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M458 83 Q486 90 514 81" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  }, {
    id: 'gravata', slot: 'pescoco', nome: 'Gravata', como: 'Ganhe em um simulado 100%', vb: '430 128 80 76',
    arte: `<g transform="translate(-10 0)"><path d="M458 139 L470 146 L466 152 Z M486 139 L474 146 L478 152 Z" fill="#f6f3ec" stroke="#111" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M472 150 L463 176 L474 196 L486 176 L477 150 Z" fill="#d93a2f" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M465 146 L482 146 L479 154 L468 154 Z" fill="#d93a2f" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M470 166 L479 163 M468 176 L482 172" stroke="#111" stroke-width="2.2" stroke-linecap="round" opacity=".5"/></g>`,
  }, {
    id: 'chifres', slot: 'chifres', secreto: true, nome: 'Chifrinhos', como: '???', vb: '432 28 120 72',
    arte: `<path d="M466 70 Q455 52 466 36 Q476 50 482 66 Z" fill="#7a1010" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M498 66 Q501 48 516 36 Q518 54 511 71 Z" fill="#7a1010" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M467 52 L472 58 M509 53 L505 59" stroke="#d94a4a" stroke-width="2" stroke-linecap="round" opacity=".7"/>`,
  }];
  const lerAcess = () => { const a = guarda.ler('atlas.acessorios', null); return a && Array.isArray(a.tem) ? a : { tem: [], uso: [] }; };
  function ganhaAcessorio(id) {
    const a = lerAcess(); if (a.tem.includes(id)) return null;
    a.tem.push(id);
    const ac = ACESSORIOS.find((x) => x.id === id);
    if (ac && !a.uso.some((u) => ACESSORIOS.find((x) => x.id === u).slot === ac.slot)) a.uso.push(id); // já sai vestido
    guarda.gravar('atlas.acessorios', a);
    return ac;
  }
  // sorteia um acessório que ainda não é seu
  const sorteiaAcessorio = () => { const a = lerAcess(), falta = ACESSORIOS.filter((x) => !x.secreto && !a.tem.includes(x.id)); return falta.length ? ganhaAcessorio(falta[Math.floor(Math.random() * falta.length)].id) : null; };
  const arteAcess = (uso) => uso.map((id) => { const a = ACESSORIOS.find((x) => x.id === id); return a ? `<g class="acc" data-acc="${id}">${a.arte}</g>` : ''; }).join('');

  function dinoSvg(V, op = {}) {
    const tr = (g) => V.tracos.filter((t) => t.g === g).map((t) => `<path class="v-traco" d="${t.d}" stroke-width="${t.w}"/>`).join('');
    const parte = (nome) => `<path class="v-red" d="${V.vermelho[nome]}" fill-rule="evenodd"/>`;
    return `<svg class="dv" viewBox="${op.vb || `0 0 ${V.w} ${V.h}`}" role="img" aria-label="Dinossauro vermelho" fill="none" stroke="#111" stroke-linecap="round" stroke-linejoin="round" style="--vermelho:${(op.diabo ? VERMELHO : V.cor)}">
      <g class="dv-par"><g class="dv-baixa"><g class="dv-raiz">
        ${parte('corpo')}
        <g class="p-cauda">${parte('cauda')}${tr('cauda')}</g>
        <g class="p-braco">${parte('braco')}${tr('braco')}</g>
        <g class="g-corpo">${tr('corpo')}${tr('bracoE')}</g>
        <g class="g-espinhos">${tr('espinhos')}</g>
        <g class="g-garras">${tr('garrasE')}${tr('garrasD')}</g>
        <g class="p-cabeca">${parte('cabeca')}${tr('cabeca')}${arteAcess(op.uso || [])}</g>
      </g></g></g></svg>`;
  }

  // Título em estilo de cartaz: FEITO POR / MUTANO grande com zigue-zague vermelho
  const zigue = (() => { let d = 'M4 17'; for (let k = 0; k < 13; k++) d += ` L${4 + 24 * (k + 1)} ${k % 2 ? 17 : 5}`; return d; })();
  const CABECALHO = `<div class="cr-topo"><p class="cr-peq">Feito por</p><h2 class="cr-mutano">MUTANO</h2><svg class="cr-zz" viewBox="0 0 320 22" preserveAspectRatio="none" aria-hidden="true"><path d="${zigue}"/></svg></div>`;
  const FILTROS = `<svg class="cr-defs" width="0" height="0" aria-hidden="true"><defs>
    <filter id="cr-fio" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="G" yChannelSelector="R"/></filter>
    <filter id="cr-papel" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 -.18"/></filter></defs></svg>
    <svg class="cr-papel" preserveAspectRatio="none" aria-hidden="true"><rect width="100%" height="100%" filter="url(#cr-papel)" opacity=".55"/></svg>`;
  const DIABO = 666, VERMELHO = '#d62828';
  const MARCOS = { 666: '666. MUTANO ENDIABRADO.', 10: '10 CARINHOS. AGORA SOMOS AMIGOS.', 25: 'PROVA DE ORGÂNICA II? PODE VIR.', 50: 'MUTANO APROVA.', 100: 'LENDA DO CARINHO.' };

  function abreCreditos(ev, loja) {
    if (creditosEl) return;
    const alvo = ev && ev.target && ev.target.closest && ev.target.closest('[data-creditos]');
    const r0 = alvo ? alvo.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight, width: 0, height: 0 };
    const origem = [r0.left + r0.width / 2, r0.top + r0.height / 2];
    if (reduzido) { abreCreditosEstatico(); return; }
    creditosEl = document.createElement('div'); // reserva enquanto carrega
    carregaGsap().then((V) => { creditosEl = null; montaCreditos(V, origem, loja); }).catch(() => { creditosEl = null; abreCreditosEstatico(); });
  }

  const BOLSA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>';
  const CADEADO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  function montaCreditos(V, origem, abrirLoja) {
    const gsap = window.gsap, SplitText = window.SplitText;
    let n = guarda.ler('atlas.carinhos', 0);
    if (n >= DIABO) ganhaAcessorio('chifres');
    const el = document.createElement('div');
    el.className = 'creditos';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Créditos');
    el.innerHTML = `${FILTROS}<button class="cr-fechar" aria-label="Fechar"><svg viewBox="0 0 40 40"><path d="M8 9 L32 31 M31 8 L9 33" /></svg></button>
      <div class="cr-conteudo">${CABECALHO}
        <div class="dv-caixa">${dinoSvg(V, { uso: lerAcess().uso, diabo: guarda.ler('atlas.carinhos', 0) >= DIABO })}</div>
        <h2 class="cr-msg">Boa prova de<br>Química Orgânica II</h2>
        <div class="cr-contagem"><svg class="cr-tally" viewBox="0 0 240 60" aria-hidden="true"><g class="tally"></g></svg><span class="cr-n">×${n}</span></div>
        <p class="cr-marco" aria-live="polite"></p>
        <button class="cr-lojabtn" data-loja>${BOLSA}<span>Loja</span></button>
      </div>`;
    document.body.appendChild(el);
    creditosEl = el;
    document.body.style.overflow = 'hidden';
    const q = (s) => el.querySelector(s), qa = (s) => [...el.querySelectorAll(s)];
    const caixa = q('.cr-conteudo'), raiz = q('.dv-raiz'), par = q('.dv-par'), baixa = q('.dv-baixa');
    const vermelhos = qa('.v-red'), tracos = qa('.v-traco');
    const cauda = q('.p-cauda'), cabeca = q('.p-cabeca'), braco = q('.p-braco');
    const PIV = { cauda: '190 340', cabeca: '410 130', braco: '462 230', base: '300 630', centro: '300 420' };
    const raio = Math.hypot(Math.max(origem[0], innerWidth - origem[0]), Math.max(origem[1], innerHeight - origem[1]));
    const splitMsg = SplitText.create(q('.cr-msg'), { type: 'chars', mask: 'chars', aria: 'auto' });
    const splitNome = SplitText.create(q('.cr-mutano'), { type: 'chars', aria: 'auto' });
    const zz = q('.cr-zz path'), peq = q('.cr-peq'), contagem = q('.cr-contagem');

    // Impact não existe em celulares: a fonte substituta é mais larga. Cada linha é encolhida até caber na tela.
    const cabe = (e) => {
      e.style.fontSize = '';
      for (let k = 0; k < 3 && e.scrollWidth > e.clientWidth + 1; k++) e.style.fontSize = (parseFloat(getComputedStyle(e).fontSize) * (e.clientWidth / e.scrollWidth) * 0.97).toFixed(1) + 'px';
    };
    const ajusta = () => { if (!el.isConnected) return removeEventListener('resize', ajusta); qa('.cr-peq,.cr-mutano,.cr-msg,.cr-marco').forEach(cabe); };
    ajusta(); addEventListener('resize', ajusta);

    // ---- contagem em risquinhos de cinco ----
    const tally = q('.tally');
    const MAXR = 40;
    const risco = (k) => {
      const grupo = Math.floor(k / 5), pos = k % 5, x0 = 10 + (grupo % 5) * 46, y0 = 6 + Math.floor(grupo / 5) * 28;
      const d = pos < 4 ? `M${x0 + pos * 8} ${y0 + 2} l${(k % 3) - 1} 21` : `M${x0 - 5} ${y0 + 20} L${x0 + 30} ${y0 + 5}`;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d); p.setAttribute('class', 't-risco');
      tally.appendChild(p);
      return p;
    };
    const iniciais = [];
    for (let k = 0; k < Math.min(n, MAXR); k++) iniciais.push(risco(k));
    const numEl = q('.cr-n'), numEstado = { v: n };
    const mostraNum = () => { numEl.textContent = '×' + Math.round(numEstado.v); };

    // ---- acessórios: ficam presos à cabeça e entram por último, caindo no rosto ----
    const poeAcessorios = (animar) => {
      cabeca.querySelectorAll('.acc').forEach((a) => a.remove());
      cabeca.insertAdjacentHTML('beforeend', arteAcess(lerAcess().uso));
      const novos = [...cabeca.querySelectorAll('.acc')];
      if (animar && novos.length) gsap.fromTo(novos, { y: -46, opacity: 0, rotation: -10, svgOrigin: '490 100' }, { y: 0, opacity: 1, rotation: 0, duration: 0.8, ease: 'bounce.out' });
      return novos;
    };

    // ---- entrada ----
    gsap.set(vermelhos, { opacity: 0, scale: 0.86, svgOrigin: PIV.centro });
    gsap.set(tracos, { drawSVG: '0%' });
    gsap.set(splitNome.chars, { yPercent: 130, rotation: () => gsap.utils.random(-14, 14), opacity: 0 });
    gsap.set(zz, { drawSVG: '0%' });
    gsap.set(peq, { opacity: 0, letterSpacing: '0.7em' });
    gsap.set(splitMsg.chars, { yPercent: 115, opacity: 0 });
    gsap.set([contagem, ...iniciais], { opacity: 0 });
    gsap.set(iniciais, { drawSVG: '0%' });
    const accs = [...cabeca.querySelectorAll('.acc')]; gsap.set(accs, { opacity: 0 });
    const btnLoja = q('.cr-lojabtn'); gsap.set(btnLoja, { autoAlpha: 0, y: 18 });
    const intro = gsap.timeline({ onComplete: () => { idle(); if (abrirLoja) abreLoja(); } });
    intro
      .fromTo(el, { clipPath: `circle(0px at ${origem[0]}px ${origem[1]}px)` }, { clipPath: `circle(${raio + 40}px at ${origem[0]}px ${origem[1]}px)`, duration: 0.85, ease: 'power3.inOut' })
      .to(peq, { opacity: 1, letterSpacing: '0.24em', duration: 0.9, ease: 'power3.out' }, 0.55)
      .to(splitNome.chars, { yPercent: 0, rotation: 0, opacity: 1, duration: 0.85, ease: 'back.out(2.2)', stagger: { each: 0.06, from: 'start' } }, 0.6)
      .to(zz, { drawSVG: '100%', duration: 0.7, ease: 'power2.inOut' }, 1.05)
      .to(vermelhos, { opacity: 1, scale: 1, duration: 0.85, ease: 'back.out(1.5)', stagger: 0.09 }, 0.8)
      .to(tracos, { drawSVG: '100%', duration: () => gsap.utils.random(0.28, 0.6), ease: 'power1.inOut', stagger: { each: 0.03, from: 'start' } }, 1.3)
      .to(splitMsg.chars, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.8)', stagger: { each: 0.022, from: 'start' } }, 1.75)
      .fromTo(accs, { y: -46, rotation: -10, svgOrigin: '490 100' }, { y: 0, opacity: 1, rotation: 0, duration: 0.8, ease: 'bounce.out' }, 2.4)
      .to(contagem, { opacity: 1, duration: 0.3 }, 2.1)
      .to(iniciais, { opacity: 1, drawSVG: '100%', duration: 0.3, stagger: 0.02, ease: 'power2.out' }, 2.15)
      .to(btnLoja, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'back.out(2.2)', clearProps: 'all' }, '>+0.05'); // a loja é a última a aparecer

    // ---- vida: respira, balança o rabo e a cabeça; as linhas "fervem" como em desenho animado ----
    let vivo = false, fervura;
    const idleTL = gsap.timeline({ paused: true });
    function idle() {
      vivo = true;
      idleTL.to(raiz, { scaleY: 1.013, svgOrigin: PIV.base, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true }, 0)
        .to(cauda, { rotation: 3, svgOrigin: PIV.cauda, duration: 2.1, ease: 'sine.inOut', repeat: -1, yoyo: true }, 0)
        .fromTo(cabeca, { rotation: -1.4 }, { rotation: 1.4, svgOrigin: PIV.cabeca, duration: 3, ease: 'sine.inOut', repeat: -1, yoyo: true }, 0)
        .fromTo(braco, { rotation: -3 }, { rotation: 4, svgOrigin: PIV.braco, duration: 1.9, ease: 'sine.inOut', repeat: -1, yoyo: true }, 0)
        .play();
      const ferve = () => { gsap.set(tracos, { x: () => gsap.utils.random(-0.7, 0.7), y: () => gsap.utils.random(-0.7, 0.7) }); fervura = gsap.delayedCall(0.18, ferve); };
      ferve();
    }

    // ---- inclina de leve para o lado do dedo ----
    const px = gsap.quickTo(par, 'x', { duration: 0.9, ease: 'power3' }), py = gsap.quickTo(par, 'y', { duration: 0.9, ease: 'power3' });
    const pr = gsap.quickTo(par, 'rotation', { duration: 1.1, ease: 'power3', svgOrigin: PIV.base });
    el.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / innerWidth - 0.5) * 2, ny = (e.clientY / innerHeight - 0.5) * 2;
      px(nx * 7); py(ny * 4); pr(nx * 1.1);
    });

    // ---- carinho: o dinossauro se abaixa, o rabo abana mais rápido, e volta devagar ----
    let segurando = false, ultimoToque = 0, marcoTimer;
    const abaixa = () => {
      segurando = true;
      gsap.to(baixa, { y: 10, scaleY: 0.95, scaleX: 1.015, svgOrigin: PIV.base, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(cabeca, { y: 12, x: 4, duration: 0.55, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(braco, { y: 3, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(idleTL, { timeScale: 2.6, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
    };
    const levanta = () => {
      if (!segurando) return;
      segurando = false;
      gsap.to(baixa, { y: 0, scaleY: 1, scaleX: 1, duration: 1.2, ease: 'elastic.out(1,0.5)', overwrite: 'auto' });
      gsap.to(cabeca, { y: 0, x: 0, duration: 1.1, ease: 'elastic.out(1,0.45)', overwrite: 'auto' });
      gsap.to(braco, { y: 0, duration: 1, ease: 'elastic.out(1,0.45)', overwrite: 'auto' });
      gsap.to(idleTL, { timeScale: 1, duration: 1.2, ease: 'power2.inOut', overwrite: 'auto' });
    };
    const conta = () => {
      n++; guarda.gravar('atlas.carinhos', n);
      navigator.vibrate && navigator.vibrate(10);
      if (n <= MAXR) { const p = risco(n - 1); gsap.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: 'power2.out' }); }
      gsap.to(numEstado, { v: n, duration: 0.45, ease: 'power2.out', onUpdate: mostraNum });
      gsap.fromTo(numEl, { scale: 1.45, rotation: gsap.utils.random(-6, 6) }, { scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' });
      if (n === DIABO) { // easter egg: fica vermelho e ganha chifrinhos (para sempre)
        navigator.vibrate && navigator.vibrate([60, 40, 60, 40, 160]);
        const svg = q('.dv');
        gsap.to(svg, { '--vermelho': VERMELHO, duration: 1.6, ease: 'power2.inOut' });
        gsap.fromTo(el, { backgroundColor: '#f6f3ec' }, { backgroundColor: '#f3d9d4', duration: 0.5, yoyo: true, repeat: 1 });
        gsap.fromTo(par, { x: -9 }, { x: 0, duration: 1.2, ease: 'elastic.out(1,0.15)' });
        ganhaAcessorio('chifres');
        setTimeout(() => poeAcessorios(true), 500);
      }
      if (MARCOS[n]) {
        const m = q('.cr-marco'); m.textContent = MARCOS[n];
        gsap.fromTo(m, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
        clearTimeout(marcoTimer); marcoTimer = setTimeout(() => gsap.to(m, { opacity: 0, duration: 0.5 }), 2600);
      }
    };
    el.addEventListener('pointerdown', (e) => {
      if (!vivo || e.target.closest('.cr-fechar, .cr-lojabtn, .cr-loja')) return;
      const agora = performance.now();
      abaixa();
      if (agora - ultimoToque > 140) { ultimoToque = agora; conta(); }
      window.addEventListener('pointerup', levanta, { once: true });
      window.addEventListener('pointercancel', levanta, { once: true });
    });

    // ---- loja de acessórios ----
    let loja = null;
    const cartaoLoja = (a) => {
      const u = lerAcess(), tem = u.tem.includes(a.id), usando = u.uso.includes(a.id);
      return `<div class="cl-card${tem ? '' : ' trava'}"><div class="cl-prev">${dinoSvg(V, { vb: a.slot === 'pescoco' ? '420 112 130 96' : '408 34 192 128', uso: [a.id] })}${tem ? '' : `<span class="cl-lock">${CADEADO}</span>`}</div>
        <b>${a.nome}</b><small>${tem ? (usando ? 'Vestido agora' : 'Na sua coleção') : a.como}</small>
        ${tem ? `<button class="cl-btn${usando ? ' on' : ''}" data-vestir="${a.id}">${usando ? 'Tirar' : 'Vestir'}</button>` : ''}</div>`;
    };
    const fechaLoja = () => {
      if (!loja) return; const l = loja; loja = null;
      gsap.to(l, { yPercent: 105, duration: 0.4, ease: 'power3.in', onComplete: () => l.remove() });
    };
    function abreLoja() {
      if (loja) return;
      loja = document.createElement('div'); loja.className = 'cr-loja'; loja.setAttribute('role', 'dialog'); loja.setAttribute('aria-label', 'Loja do Mutaninho');
      loja.innerHTML = `<div class="cl-topo"><h3>Loja</h3><button class="cl-x" aria-label="Fechar a loja"><svg viewBox="0 0 40 40"><path d="M8 9 L32 31 M31 8 L9 33"/></svg></button></div>
        <p class="cl-sub">Acessórios do Mutaninho</p>
        <div class="cl-grade">${ACESSORIOS.filter((a) => !a.secreto || lerAcess().tem.includes(a.id)).map(cartaoLoja).join('')}<div class="cl-card breve"><div class="cl-prev"><span class="cl-int">?</span></div><b>Mais em breve</b><small>Novos acessórios por vir</small></div></div>`;
      el.appendChild(loja);
      gsap.fromTo(loja, { yPercent: 105 }, { yPercent: 0, duration: 0.55, ease: 'power3.out' });
      gsap.from(loja.querySelectorAll('.cl-card'), { y: 30, opacity: 0, rotation: () => gsap.utils.random(-4, 4), duration: 0.5, ease: 'back.out(1.6)', stagger: 0.08, delay: 0.25 });
    }
    el.addEventListener('click', (e) => {
      if (e.target.closest('.cr-lojabtn')) { abreLoja(); return; }
      if (e.target.closest('.cl-x')) { fechaLoja(); return; }
      const v = e.target.closest('[data-vestir]');
      if (v) {
        const id = v.dataset.vestir, a = ACESSORIOS.find((x) => x.id === id), u = lerAcess();
        u.uso = u.uso.filter((x) => x !== id && ACESSORIOS.find((y) => y.id === x).slot !== a.slot);
        if (!v.classList.contains('on')) u.uso.push(id);
        guarda.gravar('atlas.acessorios', u);
        fechaLoja();
        setTimeout(() => poeAcessorios(true), 250);
      }
    });

    // ---- saída: desfaz o desenho e o círculo fecha de volta no ícone ----
    let fechando = false;
    const fecha = () => {
      if (fechando) return; fechando = true;
      vivo = false; fervura && fervura.kill(); idleTL.kill(); gsap.killTweensOf([baixa, cabeca, braco, par]);
      gsap.set(tracos, { x: 0, y: 0 });
      gsap.timeline({ onComplete: () => { splitMsg.revert(); splitNome.revert(); el.remove(); creditosEl = null; document.body.style.overflow = ''; } })
        .to(tracos, { drawSVG: '0%', duration: 0.3, ease: 'power2.in', stagger: { each: 0.011, from: 'end' } }, 0)
        .to([...splitMsg.chars, ...splitNome.chars], { yPercent: -115, opacity: 0, duration: 0.35, ease: 'power2.in', stagger: { each: 0.012, from: 'end' } }, 0)
        .to(zz, { drawSVG: '0%', duration: 0.3, ease: 'power2.in' }, 0)
        .to([...cabeca.querySelectorAll('.acc'), q('.cr-lojabtn'), q('.cr-loja')].filter(Boolean), { opacity: 0, duration: 0.25 }, 0)
        .to([peq, contagem, q('.cr-marco')], { opacity: 0, duration: 0.25 }, 0)
        .to(vermelhos, { scale: 0.88, opacity: 0, duration: 0.35, ease: 'power2.in', stagger: 0.04 }, 0.15)
        .to(el, { clipPath: `circle(0px at ${origem[0]}px ${origem[1]}px)`, duration: 0.6, ease: 'power3.inOut' }, 0.4);
    };
    el.querySelector('.cr-fechar').addEventListener('click', (e) => { e.stopPropagation(); fecha(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && creditosEl === el) { if (loja) { fechaLoja(); return; } fecha(); document.removeEventListener('keydown', esc); } });
  }

  // Sem GSAP (offline sem cache, ou "reduzir movimento"): a imagem original, sem animação.
  function abreCreditosEstatico() {
    if (creditosEl && creditosEl.className === 'creditos') return;
    const el = document.createElement('div');
    el.className = 'creditos';
    el.innerHTML = `${FILTROS}<button class="cr-fechar" aria-label="Fechar"><svg viewBox="0 0 40 40"><path d="M8 9 L32 31 M31 8 L9 33" /></svg></button>
      <div class="cr-conteudo">${CABECALHO}<img class="cr-img" src="dino.png?v=${BUILD}" alt="Dinossauro vermelho"><h2 class="cr-msg">Boa prova de<br>Química Orgânica II</h2></div>`;
    document.body.appendChild(el);
    creditosEl = el;
    document.body.style.overflow = 'hidden';
    const fecha = () => { el.remove(); creditosEl = null; document.body.style.overflow = ''; };
    el.addEventListener('click', fecha);
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && creditosEl === el) { fecha(); document.removeEventListener('keydown', esc); } });
  }

  /*@@vidro-ini*/
  const marcaVisual = () => { const v = guarda.ler('atlas.visual', 'original'); document.querySelectorAll('[data-visual]').forEach((b) => { if (b.classList.contains('visual')) b.classList.toggle('on', b.dataset.visual === v); }); };
  const aplicaVisual = (v) => { if (v === 'vidro') document.documentElement.dataset.visual = 'vidro'; else delete document.documentElement.dataset.visual; };
  /*@@vidro-fim*/
  const marcaTema = () => { const t = guarda.ler('atlas.tema', 'auto'); document.querySelectorAll('.tema [data-tema]').forEach((b) => b.classList.toggle('on', b.dataset.tema === t)); };
  aplicaTema(guarda.ler('atlas.tema', 'auto'));
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => aplicaTema(guarda.ler('atlas.tema', 'auto')));

  document.addEventListener('change', (e) => {
    const s = e.target.closest && e.target.closest('[data-filtro]');
    if (!s) return;
    filtrosSel[s.dataset.filtro] = s.value;
    const h = rotaAtual.split('/')[1];
    if (h === 'busca' && buscaAtual) { $('#filtros-av').innerHTML = filtrosHtml(); buscaAtual(); const d = $('#filtros-av details'); if (d) d.open = true; }
    else if (h === 'todas') { mostra(); }
  });

  /*@@vidro-ini*/
  let toquesVersao = 0, ultimoToqueVersao = 0;
  /*@@vidro-fim*/
  // ---------- cliques ----------
  document.addEventListener('click', (e) => {
    const t = e.target;
    const sv = t.closest('[data-salvar]');
    if (sv) {
      e.preventDefault();
      const on = alternarSalvo(+sv.dataset.salvar);
      sv.classList.toggle('on', on); sv.setAttribute('aria-pressed', on);
      sv.classList.remove('pop'); void sv.offsetWidth; sv.classList.add('pop');
      if (on) pulaEstrela(sv.querySelector('svg'));
      if (rotaAtual === '#/salvos' && !on) saiItem(sv.closest('.item'));
      return;
    }
    const sd = t.closest('[data-salvar-d]');
    if (sd) { const on = alternarSalvo(+sd.dataset.salvarD); sd.classList.toggle('on', on); sd.querySelector('span').textContent = on ? 'Salvo' : 'Salvar'; if (on) pulaEstrela(sd.querySelector('svg')); return; }
    if (t.closest('[data-compartilhar]')) { navigator.share({ title: document.title, url: location.href }).catch(() => {}); return; }
    const ir = t.closest('[data-ir]'); if (ir) { location.hash = ir.dataset.ir; return; }
    if (t.closest('[data-instalar]') && promptInstalar) { promptInstalar.prompt(); promptInstalar.userChoice.finally(() => { promptInstalar = null; $('#instalar').innerHTML = ''; }); return; }
    if (t.closest('[data-fechar-instalar]')) { guarda.gravar('atlas.instalar', true); $('#instalar').innerHTML = ''; return; }
    if (t.closest('[data-limpar-filtros]')) { filtrosSel = { a: '', c: '', nu: '', el: '' }; const h = rotaAtual.split('/')[1]; if (h === 'busca' && buscaAtual) { $('#filtros-av').innerHTML = filtrosHtml(); buscaAtual(); } else mostra(); return; }
    /*@@vidro-ini*/
    const vb = t.closest('.visual[data-visual]');
    if (vb) { guarda.gravar('atlas.visual', vb.dataset.visual); aplicaVisual(vb.dataset.visual); marcaVisual(); return; }
    if (t.closest('[data-versao]')) { // 5 toques seguidos mostram a seção Aparência
      toquesVersao = (performance.now() - ultimoToqueVersao < 1200 ? toquesVersao : 0) + 1; ultimoToqueVersao = performance.now();
      if (toquesVersao >= 5) { const cx = $('#visuais-caixa'); if (cx) { cx.hidden = false; cx.scrollIntoView({ block: 'center', behavior: 'smooth' }); } toquesVersao = 0; }
      return;
    }
    /*@@vidro-fim*/
    const tb = t.closest('.tema [data-tema]');
    if (tb) { guarda.gravar('atlas.tema', tb.dataset.tema); aplicaTema(tb.dataset.tema); marcaTema(); return; }
    const rp = t.closest('[data-repetir]');
    if (rp) { const tl = rp.closest('.passo').querySelector('.tile.com-setas'); if (tl) rodaSetas(tl); return; }
    if (t.closest('[data-verificar]')) { verifica(true); return; }
    if (t.closest('[data-creditos]')) { abreCreditos(e); return; }
    const tl = t.closest('.tile');
    if (tl && tl.querySelector('svg') && !zoom.contains(tl)) abreZoom(tl);
  });
  function abreZoom(tl) { zoomConteudo.innerHTML = tl.innerHTML; zoomConteudo.classList.toggle('com-setas', tl.classList.contains('com-setas')); zoomConteudo.style.setProperty('--w', tl.style.getPropertyValue('--w') || 200); zoom.hidden = false;
    if (usaMotion) { M.animate(zoom, { opacity: [0, 1] }, { duration: 0.2 }); M.animate(zoomConteudo, { opacity: [0, 1], scale: [0.8, 1] }, { type: 'spring', stiffness: 340, damping: 24 }); }
    if (tl.classList.contains('com-setas')) setTimeout(() => rodaSetas(zoomConteudo), 350); }
  function fechaZoom() { paraSetas(zoomConteudo); zoom.hidden = true; zoomConteudo.innerHTML = ''; }
  zoom.addEventListener('click', fechaZoom);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechaZoom(); });

  /*@@vidro-ini*/
  // ---------- vidro: a luz acompanha o dedo e cada toque solta uma "gota" ----------
  (() => {
    const VIDRO = '.abas,.capa,.atalho,.aula-card,.modo,.aula,.item,.cartao,.ficha,.guia-link,.btn-grande,.chip,.busca-falsa,.reag,.cl-card';
    const luz = (e) => {
      if (document.documentElement.dataset.visual !== 'vidro') return;
      const el = e.target.closest && e.target.closest(VIDRO); if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    };
    document.addEventListener('pointermove', luz, { passive: true });
    document.addEventListener('pointerdown', (e) => {
      if (document.documentElement.dataset.visual !== 'vidro') return;
      luz(e);
      const el = e.target.closest && e.target.closest(VIDRO); if (!el || reduzido) return;
      const r = el.getBoundingClientRect();
      const d = document.createElement('span'); d.className = 'gota';
      const t = Math.max(r.width, r.height) * 1.6;
      d.style.cssText = `left:${e.clientX - r.left - t / 2}px;top:${e.clientY - r.top - t / 2}px;width:${t}px;height:${t}px`;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(d);
      const fim = () => d.remove();
      if (usaMotion) M.animate(d, { scale: [0.1, 1], opacity: [0.55, 0] }, { duration: 0.7, ease: [0.16, 1, 0.3, 1] }).then(fim, fim); else setTimeout(fim, 400);
    }, { passive: true });
  })();

  /*@@vidro-fim*/
  // ---------- versão nova ----------
  // Mesmo comportamento do PILATESRUN MOVE: confere versao.json ao abrir, ao voltar
  // para o app e a cada poucos minutos. Nunca recarrega sozinho: só quando toca em Atualizar.
  let dispensado = false, tempoAviso;
  function mostraAviso(txt, botao) {
    clearTimeout(tempoAviso);
    avisoTexto.textContent = txt;
    avisoOk.hidden = !botao; avisoX.hidden = !botao;
    aviso.hidden = false;
    if (usaMotion) M.animate(aviso, { opacity: [0, 1], y: [44, 0], scale: [0.94, 1] }, { type: 'spring', stiffness: 320, damping: 22 });
    aviso.style.animation = 'none'; void aviso.offsetWidth; aviso.style.animation = '';
    if (!botao) tempoAviso = setTimeout(() => (aviso.hidden = true), 2600);
  }
  async function verifica(manual) {
    if (manual) mostraAviso('Verificando…', false);
    try {
      const r = await fetch('versao.json?t=' + Date.now(), { cache: 'no-store' });
      const { build } = await r.json();
      if (build && build !== BUILD) {
        navigator.serviceWorker?.getRegistration().then((g) => g && g.update()).catch(() => {});
        if (!dispensado || manual) { dispensado = false; mostraAviso('Saiu uma versão nova', true); }
      } else if (manual) mostraAviso('Você já está na versão mais recente', false);
    } catch { if (manual) mostraAviso('Sem conexão para verificar', false); }
  }
  avisoOk.addEventListener('click', () => {
    avisoOk.textContent = 'Atualizando…';
    const recarrega = () => location.reload();
    Promise.race([navigator.serviceWorker?.getRegistration().then((g) => g && g.update()), new Promise((r) => setTimeout(r, 1200))]).catch(() => {}).finally(recarrega);
  });
  avisoX.addEventListener('click', () => { dispensado = true; aviso.hidden = true; });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verifica(false); });
  window.addEventListener('online', () => verifica(false));
  setInterval(() => verifica(false), 5 * 60 * 1000);

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  /*@@estudo*/

  // ---------- início ----------
  tela.innerHTML = '<div class="tela"><div class="carregando"><div class="atomo"><i style="--r:0deg"><s></s></i><i style="--r:60deg"><s></s></i><i style="--r:120deg"><s></s></i><b></b></div><p>Carregando…</p></div></div>';
  get('dados.json?v=' + BUILD).then((d) => {
    prepara(d);
    if (!location.hash) history.replaceState(null, '', '#/aulas');
    mostra();
    setTimeout(() => verifica(false), 2500);
    return get('svgs.json?v=' + BUILD);
  }).then((s) => { S = s; hidrata(tela); }).catch(() => {
    if (!D) tela.innerHTML = '<div class="tela"><div class="vazio">Sem conexão e ainda sem dados guardados.<br>Abra uma vez com internet.</div></div>';
  });
})();
