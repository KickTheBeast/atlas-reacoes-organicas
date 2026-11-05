// Atlas de Reações Orgânicas — app (sem framework).
// Dados: dados.json (reações + tags) e svgs.json (estruturas desenhadas no build com RDKit).
(() => {
  'use strict';
  const BUILD = '59e1dc2e26';
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
        <div class="visuais" role="group" aria-label="Visual"><button class="visual v-original" data-visual="original"><i></i><b>Original</b><small>cartões sólidos</small></button><button class="visual v-vidro" data-visual="vidro"><i></i><b>Vidro</b><small>translúcido, estilo Apple</small></button><button class="visual v-papel" data-visual="papel"><i></i><b>Artigo</b><small>papel retrô, de periódico</small></button></div>
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
        <div class="rodape"><button class="avatar" data-creditos aria-label="Créditos">${DINO_AVATAR}</button><br><button class="versao-btn" data-versao aria-label="Versão">Versão ${BUILD}</button><br><button data-verificar>Verificar atualização</button></div>`,
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
    id: 'aviador', slot: 'cabeca', secreto: true, nome: 'Chapéu de aviador', como: 'Voe com o Mutaninho', vb: '380 40 170 120',
    arte: `<path d="M447 96 Q438 66 476 54 Q518 47 532 80 L528 94 Q500 86 447 96 Z" fill="#8a5428" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M476 55 Q486 74 484 90 M498 52 Q508 66 510 84" stroke="#4f2c12" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M447 94 Q434 112 445 134 Q460 137 470 120 Q472 104 463 91 Z" fill="#7b4723" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M458 108 L465 128" stroke="#3a1f0c" stroke-width="3" stroke-linecap="round"/>
      <rect x="459" y="126" width="11" height="11" rx="1.5" fill="none" stroke="#d9a83a" stroke-width="3"/>
      <path d="M446 82 Q488 69 530 80" stroke="#111" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      <circle cx="483" cy="72" r="12" fill="#161616" stroke="#cfc6b0" stroke-width="3.4"/><circle cx="511" cy="74" r="11" fill="#161616" stroke="#cfc6b0" stroke-width="3.4"/>
      <path d="M476 66 L482 62 M505 69 L510 65" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`,
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
        <g class="p-cabeca">${parte('cabeca')}${tr('cabeca')}${arteAcess(op.uso || [])}${op.diabo ? CHIFRES : ''}</g>
      </g></g></g></svg>`;
  }

  // Título em estilo de cartaz: FEITO POR / MUTANO grande com zigue-zague vermelho
  const zigue = (() => { let d = 'M4 17'; for (let k = 0; k < 13; k++) d += ` L${4 + 24 * (k + 1)} ${k % 2 ? 17 : 5}`; return d; })();
  const CABECALHO = `<div class="cr-topo"><p class="cr-peq">Feito por</p><h2 class="cr-mutano">MUTANO</h2><svg class="cr-zz" viewBox="0 0 320 22" preserveAspectRatio="none" aria-hidden="true"><path d="${zigue}"/></svg></div>`;
  const FILTROS = `<svg class="cr-defs" width="0" height="0" aria-hidden="true"><defs>
    <filter id="cr-fio" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="G" yChannelSelector="R"/></filter>
    <filter id="cr-papel" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 -.18"/></filter></defs></svg>
    <svg class="cr-papel" preserveAspectRatio="none" aria-hidden="true"><rect width="100%" height="100%" filter="url(#cr-papel)" opacity=".55"/></svg>`;
  // Easter egg: com exatamente 666 carinhos o Mutaninho fica vermelho e ganha chifrinhos; no 667º tudo volta ao normal.
  const VOO = 1000;
  const AVIAO_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15.5v-1.6l-8-5V4.2a1.7 1.7 0 00-3.4 0v4.7l-8 5v1.6l8-2.2v3.8l-2 1.5V20l3.7-1 3.7 1v-1.2l-2-1.5v-3.8z"/></svg>';
  const DIABO = 666, VERMELHO = '#d62828';
  // chifres grossos e nervurados que sobem e se curvam para fora (como a tiara da referência): carvão com nervuras vinho e ponta escura
  const seg = (lista) => lista.map(([d, w]) => `<path d="${d}" fill="none" stroke="#111" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/>`).join('') + lista.map(([d, w, c]) => `<path d="${d}" fill="none" stroke="${c || '#2c2427'}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const CHIFRES = `<g class="chifres">${seg([['M470 84 L452 40', 22], ['M452 40 Q446 20 426 14', 17], ['M426 14 Q410 9 392 20', 9, '#6d1410']])}<path d="M455 74 L474 66 M451 63 L470 55 M447 52 L465 44 M443 41 L459 34 M437 29 L451 25" stroke="#a3221c" stroke-width="3" stroke-linecap="round" fill="none"/>${seg([['M512 82 L530 40', 19], ['M530 40 Q535 22 552 15', 15], ['M552 15 Q566 10 582 20', 8, '#6d1410']])}<path d="M523 72 L509 66 M527 61 L512 55 M531 50 L517 43 M535 39 L521 33" stroke="#a3221c" stroke-width="2.6" stroke-linecap="round" fill="none"/></g>`;
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


  // ---------- avião + Flappy Bird (1000 carinhos) ----------
  // O avião é um SVG só (vermelho, com cabine de vidro). Com `dentro` o Mutaninho aparece na cabine; a mesma peça serve para a cena de entrada e para o jogo.
  const aviaoSvg = (V, op = {}) => {
    const cor = op.diabo ? VERMELHO : V.cor;
    const dino = op.dentro ? dinoSvg(V, { uso: op.uso || [], diabo: op.diabo, vb: '395 40 200 170' }).replace('<svg class="dv"', '<svg x="94" y="20" width="88" height="76"').replace(/ style="--vermelho:[^"]*"/, '') : '';
    const helice = op.helice === false ? '' : '<g class="helice"><rect x="243" y="46" width="8" height="76" rx="4" fill="#3a3733"/><rect x="243" y="46" width="8" height="12" rx="4" fill="#d9a62e"/><rect x="243" y="110" width="8" height="12" rx="4" fill="#d9a62e"/></g><circle cx="247" cy="84" r="4.6" fill="#e9dfc6" stroke="#4a3a2a" stroke-width="1.4"/>';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 14 270 136"><style>.v-red{fill:${cor};stroke:none}.v-traco{fill:none;stroke:#111}@keyframes h{50%{transform:scaleY(.18)}}.helice{transform-box:fill-box;transform-origin:center;animation:h .09s linear infinite}</style>
      <defs>
        <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5423b"/><stop offset=".55" stop-color="#bf2227"/><stop offset="1" stop-color="#8c1a1d"/></linearGradient>
        <linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cf2f2d"/><stop offset="1" stop-color="#7d171a"/></linearGradient>
        <linearGradient id="gC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6eed9"/><stop offset="1" stop-color="#cfc3a4"/></linearGradient>
        <clipPath id="fin"><path d="M14 76 L20 40 Q40 42 56 72 Z"/></clipPath>
      </defs>
      <g stroke="#3b1111" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">
        <path d="M148 104 L160 132 M176 104 L166 132" fill="none" stroke="#6a645a" stroke-width="3"/>
        <path d="M14 76 L20 40 Q40 42 56 72 Z" fill="url(#gC)"/>
        <g clip-path="url(#fin)" stroke="none"><path d="M10 50 L60 50 L60 56 L10 56 Z M10 62 L60 62 L60 68 L10 68 Z" fill="#c0262d"/></g>
        <path d="M10 86 L46 78 L62 87 L26 95 Z" fill="url(#gW)"/>
        <path d="M62 111 Q130 103 214 107 L206 120 Q130 123 52 122 Z" fill="url(#gW)"/>
      </g>${dino}
      <g stroke="#3b1111" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">
        <path d="M36 86 Q40 68 82 63 L170 59 Q198 57 208 72 L210 100 Q192 108 160 108 L70 108 Q42 104 36 86 Z" fill="url(#gR)"/>
        <path d="M60 78 Q96 68 150 66" stroke="#f08a7e" stroke-width="2.4" fill="none" opacity=".6"/>
        <path d="M50 99 Q110 106 190 100" stroke="#5e1012" stroke-width="2" fill="none" opacity=".35"/>
        <path d="M200 62 Q240 60 244 84 Q240 108 200 108 Q214 84 200 62 Z" fill="url(#gC)"/>
        <ellipse cx="236" cy="84" rx="8" ry="18" fill="#3d3b38" stroke="none"/>
        <path d="M236 68 L236 100 M230 74 L242 94 M230 94 L242 74" stroke="#7a756c" stroke-width="1.2" fill="none"/>
        <circle cx="128" cy="86" r="14" fill="url(#gC)"/>
        <path d="M128 76 L131 83 L139 84 L133 89 L135 97 L128 93 L121 97 L123 89 L117 84 L125 83 Z" fill="#2a1a1a" stroke="none"/>
        <path d="M108 63 Q134 54 162 61" fill="none" stroke="#efe6cf" stroke-width="4.5"/>
        <circle cx="163" cy="134" r="11" fill="#2d2b28" stroke="none"/><circle cx="163" cy="134" r="4.4" fill="#e9dfc6" stroke="none"/>
      </g>${helice}
      <rect id="cab" x="94" y="20" width="88" height="76" fill="none"/></svg>`;
  };
  const estadoDino = (V) => ({ uso: lerAcess().uso, diabo: guarda.ler('atlas.carinhos', 0) === DIABO });

  // Cena de entrada: o fundo some, o avião pousa ao lado e o Mutaninho pula para dentro da cabine
  function cenaAviao(V) {
    const gsap = window.gsap, caixa = document.querySelector('.dv-caixa');
    if (!gsap || reduzido || !caixa || fechaVooAtual) { abreVoo(V, true); return; }
    const W = innerWidth, H = innerHeight, r = caixa.getBoundingClientRect();
    const st = document.createElement('div'); st.className = 'voo-cena';
    const pw = Math.min(W * 0.78, 300), ph = pw * (136 / 270);
    st.innerHTML = `<div class="vc-fundo"></div><div class="vc-aviao" style="width:${pw}px;height:${ph}px"><div class="vc-sem">${aviaoSvg(V, { dentro: false })}</div><div class="vc-com" style="opacity:0">${aviaoSvg(V, { dentro: true, ...estadoDino(V) })}</div></div><div class="vc-dino" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px">${dinoSvg(V, estadoDino(V))}</div>`;
    document.body.appendChild(st);
    caixa.style.visibility = 'hidden';
    const fundo = st.querySelector('.vc-fundo'), av = st.querySelector('.vc-aviao'), dn = st.querySelector('.vc-dino'), com = st.querySelector('.vc-com'), sem = st.querySelector('.vc-sem');
    const ay = Math.min(H - ph - 90, r.bottom + 20);
    const ax = (W - pw) / 2;
    gsap.set(av, { x: W + 40, y: ay + 10, rotation: 4 });
    gsap.set(dn, { transformOrigin: '0 0' });
    const fim = () => { caixa.style.visibility = ''; st.remove(); };
    const tl = gsap.timeline({ onComplete: fim });
    tl.fromTo(fundo, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.inOut' })
      .to(av, { x: ax, y: ay, rotation: 0, duration: 0.9, ease: 'power3.out' }, 0.35)
      .to(dn, { scaleY: 0.92, scaleX: 1.04, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.2);
    // pulo: posição final calculada pela cabine do avião
    tl.add(() => {
      const m = av.querySelector('#cab').getBoundingClientRect();
      const upu = m.width / 200, u0 = r.width / 600; // pixels por unidade do desenho: no avião e na imagem original
      const k = upu / u0, tx = m.left - 395 * upu - r.left, ty = m.top - 40 * upu - r.top;
      gsap.to(dn, { x: tx, duration: 0.8, ease: 'power1.inOut' });
      gsap.to(dn, { scale: k, duration: 0.8, ease: 'power2.inOut' });
      gsap.timeline().to(dn, { y: Math.min(0, ty) - 130, duration: 0.4, ease: 'power2.out' }).to(dn, { y: ty, duration: 0.4, ease: 'power2.in' });
    }, 1.55)
    .add(() => { gsap.set(com, { opacity: 1 }); gsap.set(sem, { opacity: 0 }); gsap.set(dn, { opacity: 0 }); navigator.vibrate && navigator.vibrate(18); }, 2.4)
    .to(av, { y: '+=10', scaleY: 0.96, duration: 0.14, yoyo: true, repeat: 1 }, 2.4)
    .to(av, { rotation: -10, y: ay - 40, duration: 0.45, ease: 'power2.out' }, 2.75)
    .add(() => abreVoo(V, true), 3.0)
    .to(av, { x: W + 120, y: ay - 190, rotation: -14, duration: 0.75, ease: 'power2.in' }, 3.1)
    .to(st, { opacity: 0, duration: 0.3 }, 3.6);
  }

  let fechaVooAtual = null;
  function abreVoo(V, intro) {
    if (fechaVooAtual) return;
    const ov = document.createElement('div'); ov.className = 'voo';
    ov.innerHTML = '<canvas></canvas><button class="voo-x" aria-label="Fechar o jogo"><svg viewBox="0 0 40 40"><path d="M8 9 L32 31 M31 8 L9 33"/></svg></button><div class="voo-pt"><b id="voo-pt">0</b><small id="voo-rec"></small></div><div class="voo-msg" id="voo-msg"></div>';
    document.body.appendChild(ov);
    const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d');
    let W = 0, H = 0; const dpr = Math.min(devicePixelRatio || 1, 2);
    const ajusta = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    ajusta(); addEventListener('resize', ajusta);
    // sprite rasterizado uma única vez, já no tamanho final e na densidade da tela: bem mais nítido e leve do que redesenhar o SVG a cada quadro
    const SW = 270, SH = 136, ESC = Math.min(0.62, innerWidth / 560);
    let sprite = null;
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = Math.round(SW * ESC * dpr); c.height = Math.round(SH * ESC * dpr); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); sprite = c; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(aviaoSvg(V, { dentro: true, helice: false, ...estadoDino(V) }));
    const REC = 'atlas.voo';
    let melhor = guarda.ler(REC, 0), estado = intro ? 'intro' : 'espera', ultimo = performance.now(), pontos = 0, tubos = [], dist = 0, tempoIntro = 0, fimT = 0, ang = 0, tremor = 0, flash = 0, deriva = 0, popPt = 0;
    const bird = { x: 0, y: 0, vy: 0 }, fumacas = [];
    const msg = ov.querySelector('#voo-msg'), pt = ov.querySelector('#voo-pt'), rec = ov.querySelector('#voo-rec');
    const mostraRec = () => { rec.textContent = melhor ? 'recorde ' + melhor : ''; };
    // Constantes na escala do clássico (0,45 de gravidade, pulo de −7,5 e queda máxima de 10 a 60 quadros por segundo), passadas para segundos;
    // a inclinação do nariz acompanha a velocidade (−25° subindo, 70° caindo) com interpolação — a mesma ideia de vários clones livres (ex.: Serkanbyx/flappy-bird, MIT)
    const G = 1620, PULO = -440, QUEDA_MAX = 600, TW = 66, ESPACO = 230;
    const GAP = () => Math.max(168, Math.min(206, H * 0.26));
    const VEL = () => 150 + Math.min(70, pontos * 3.5); // acelera de leve com o placar
    const reinicia = () => { bird.x = W * 0.3; bird.y = H * 0.46; bird.vy = 0; ang = 0; tubos = []; dist = ESPACO * 0.45; pontos = 0; pt.textContent = '0'; mostraRec(); tremor = 0; flash = 0; };
    reinicia(); if (!intro) msg.textContent = 'TOQUE PARA VOAR';
    const nuvens = Array.from({ length: 9 }, (_, i) => ({ x: Math.random() * W, y: 30 + Math.random() * H * 0.6, s: 0.5 + Math.random() * 1.0, camada: i % 3 }));
    const colinas = Array.from({ length: 6 }, (_, i) => ({ x: i * 150, h: 60 + (i * 53) % 70 }));
    const pula = () => {
      if (estado === 'intro') return;
      if (estado === 'espera') { estado = 'jogo'; msg.textContent = ''; }
      if (estado === 'jogo') {
        bird.vy = PULO; ang = Math.min(ang, -0.2); navigator.vibrate && navigator.vibrate(5);
        } else if (estado === 'fim' && performance.now() - fimT > 600) { reinicia(); estado = 'espera'; msg.textContent = 'TOQUE PARA VOAR'; }
    };
    const morre = () => {
      estado = 'fim'; fimT = performance.now(); tremor = 1; flash = 1;
      const novo = pontos > melhor; if (novo) { melhor = pontos; guarda.gravar(REC, melhor); }
      mostraRec(); navigator.vibrate && navigator.vibrate([20, 30, 60]);
      msg.innerHTML = `${novo && pontos ? 'NOVO RECORDE!<br>' : ''}FIM DE VOO<small>${pontos} ${pontos === 1 ? 'ponto' : 'pontos'} · toque para tentar de novo</small>`;
    };
    ov.addEventListener('pointerdown', (e) => { if (e.target.closest('.voo-x')) return; e.preventDefault(); pula(); });
    const tecla = (e) => { if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); pula(); } };
    addEventListener('keydown', tecla);
    let raf = 0, vivo = true;
    // colisão: dois círculos (corpo e nariz) contra retângulos dos tubos
    const circRet = (cx, cy, r, x, y, w, h) => Math.hypot(cx - Math.max(x, Math.min(cx, x + w)), cy - Math.max(y, Math.min(cy, y + h))) < r;
    const colide = () => {
      if (bird.y - 18 < 0 || bird.y + 22 > H - 22) return true; // teto e chão
      const pts = [[bird.x - 12, bird.y, 17], [bird.x + 28, bird.y + 3, 11]], g = GAP();
      for (const t of tubos) for (const [cx, cy, rr] of pts) if (circRet(cx, cy, rr, t.x, -20, TW, t.g + 20) || circRet(cx, cy, rr, t.x, t.g + g, TW, H)) return true;
      return false;
    };
    const passo = (dt, agora) => {
      const v = estado === 'jogo' ? VEL() : estado === 'fim' ? 0 : 60;
      deriva += v * dt;
      nuvens.forEach((n) => { n.x -= (6 + n.camada * 7) * dt * (estado === 'jogo' ? 3.2 : 1); if (n.x < -140) { n.x = W + 80; n.y = 30 + Math.random() * H * 0.6; } });
      if (estado === 'intro') { tempoIntro += dt; const u = Math.min(1, tempoIntro / 1.1), e = 1 - Math.pow(1 - u, 3); bird.x = -SW * ESC + (W * 0.3 + SW * ESC) * e; bird.y = H * 0.46 + Math.sin(u * 6) * 8; ang = -0.08 * (1 - u); if (u >= 1) { estado = 'espera'; msg.textContent = 'TOQUE PARA VOAR'; } }
      else if (estado === 'espera') { bird.y = H * 0.46 + Math.sin(agora / 320) * 9; ang += (Math.sin(agora / 320 + 1) * 0.06 - ang) * Math.min(1, dt * 6); }
      else if (estado === 'jogo') {
        bird.vy = Math.min(QUEDA_MAX, bird.vy + G * dt); bird.y += bird.vy * dt;
        // −25° subindo → 70° caindo, interpolado pela velocidade
        const alvo = bird.vy < 0 ? Math.max(-0.436, bird.vy / 900) : Math.min(1.22, 0.1 + bird.vy / 520);
        ang += (alvo - ang) * Math.min(1, dt * (bird.vy < 0 ? 16 : 6));
        dist += VEL() * dt;
        if (dist >= ESPACO) { dist -= ESPACO; const gp = GAP(), min = 90, max = H - gp - 110; tubos.push({ x: W + 24, g: min + Math.random() * Math.max(10, max - min), ok: false }); }
        tubos.forEach((t) => { t.x -= VEL() * dt; if (!t.ok && t.x + TW < bird.x - 20) { t.ok = true; pontos++; pt.textContent = pontos; popPt = 1; navigator.vibrate && navigator.vibrate(4); } });
        tubos = tubos.filter((t) => t.x > -TW - 14);
        if (colide()) morre();
      } else if (estado === 'fim') {
        bird.vy = Math.min(800, bird.vy + G * dt); bird.y = Math.min(H + 140, bird.y + bird.vy * dt); ang += (1.35 - ang) * Math.min(1, dt * 4);
      }
      fumacas.forEach((f) => { f.x += f.vx * dt; f.y += f.vy * dt; f.vida -= dt * 1.7; f.r += dt * 16; });
      while (fumacas.length && fumacas[0].vida <= 0) fumacas.shift();
      tremor = Math.max(0, tremor - dt * 3); flash = Math.max(0, flash - dt * 3.5); popPt = Math.max(0, popPt - dt * 5);
    };
    const desenha = (agora) => {
      const c = ctx; c.save();
      if (tremor) c.translate((Math.random() - 0.5) * 14 * tremor, (Math.random() - 0.5) * 14 * tremor);
      c.clearRect(-20, -20, W + 40, H + 40);
      const ceu = c.createLinearGradient(0, 0, 0, H); ceu.addColorStop(0, '#f6f3ec'); ceu.addColorStop(1, '#e3efe8'); c.fillStyle = ceu; c.fillRect(-20, -20, W + 40, H + 40);
      // colinas ao fundo (parallax lento)
      c.fillStyle = 'rgba(31,158,90,.16)'; c.strokeStyle = 'rgba(17,17,17,.25)'; c.lineWidth = 2;
      const off = (deriva * 0.25) % 900;
      for (let k = -1; k < Math.ceil(W / 900) + 2; k++) { c.beginPath(); c.moveTo(k * 900 - off, H - 22); colinas.forEach((h) => { c.quadraticCurveTo(k * 900 - off + h.x + 75, H - 22 - h.h * 1.7, k * 900 - off + h.x + 150, H - 22); }); c.fill(); c.stroke(); }
      nuvens.forEach((n) => { c.save(); c.globalAlpha = 0.6 + n.camada * 0.2; c.fillStyle = '#fff'; c.strokeStyle = '#111'; c.lineWidth = 2.2; c.translate(n.x, n.y); c.scale(n.s, n.s); c.beginPath(); c.arc(0, 0, 20, 0, 7); c.arc(24, -8, 26, 0, 7); c.arc(52, 2, 20, 0, 7); c.fill(); c.restore(); });
      tubos.forEach((t) => {
        c.fillStyle = '#1f9e5a'; c.lineWidth = 4; c.strokeStyle = '#111';
        const g = GAP(), b = t.g + g;
        c.fillRect(t.x, -6, TW, t.g + 6); c.strokeRect(t.x, -6, TW, t.g + 6);
        c.fillRect(t.x - 6, t.g - 28, TW + 12, 28); c.strokeRect(t.x - 6, t.g - 28, TW + 12, 28);
        c.fillRect(t.x, b, TW, H - b); c.strokeRect(t.x, b, TW, H - b);
        c.fillRect(t.x - 6, b, TW + 12, 28); c.strokeRect(t.x - 6, b, TW + 12, 28);
        c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(t.x + 14, 4); c.lineTo(t.x + 14, t.g - 34); c.moveTo(t.x + 14, b + 34); c.lineTo(t.x + 14, H - 28); c.stroke();
      });
      // chão que corre
      c.fillStyle = '#d9d1bb'; c.fillRect(-20, H - 22, W + 40, 40); c.strokeStyle = '#111'; c.lineWidth = 4; c.beginPath(); c.moveTo(-20, H - 22); c.lineTo(W + 20, H - 22); c.stroke();
      c.lineWidth = 3; c.strokeStyle = 'rgba(17,17,17,.4)'; c.beginPath(); const co = deriva % 26; for (let x = -26 - co; x < W + 26; x += 26) { c.moveTo(x, H - 22); c.lineTo(x - 12, H); } c.stroke();
      if (sprite) {
        const w = SW * ESC, h = SH * ESC;
        c.save(); c.translate(bird.x, bird.y); c.rotate(ang); c.drawImage(sprite, -w * 0.5, -h * 0.52, w, h); c.restore();
        // hélice: disco translúcido + duas pás que giram (a largura de cada pá varia com o ângulo, como em perspectiva)
        c.save(); c.translate(bird.x, bird.y); c.rotate(ang); c.translate(112 * ESC, 0);
        c.fillStyle = 'rgba(70,64,56,.14)'; c.beginPath(); c.ellipse(0, 0, 4.5 * ESC, 38 * ESC, 0, 0, 7); c.fill();
        const th = agora / 55, k = Math.abs(Math.cos(th)); c.fillStyle = '#3a3733';
        for (const sg of [1, -1]) { c.beginPath(); c.ellipse(0, sg * 19 * ESC * k, 2.6 * ESC, 19 * ESC * Math.max(0.12, k), 0, 0, 7); c.fill(); c.fillStyle = '#d9a62e'; c.beginPath(); c.arc(0, sg * 36 * ESC * k, 2.6 * ESC, 0, 7); c.fill(); c.fillStyle = '#3a3733'; }
        c.fillStyle = '#e9dfc6'; c.strokeStyle = '#4a3a2a'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 4 * ESC, 0, 7); c.fill(); c.stroke();
        c.restore();
      }
      c.restore();
      if (flash) { ctx.fillStyle = `rgba(214,40,40,${flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    };
    // passos fixos de 1/120 s: a física fica igual em telas de 60, 90 ou 120 Hz
    let acum = 0;
    const quadro = (agora) => {
      if (!vivo) return;
      acum += Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
      while (acum >= 1 / 120) { passo(1 / 120, agora); acum -= 1 / 120; }
      desenha(agora);
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    const fechar = () => { vivo = false; cancelAnimationFrame(raf); removeEventListener('keydown', tecla); removeEventListener('resize', ajusta); ov.remove(); fechaVooAtual = null; };
    fechaVooAtual = fechar;
    ov.querySelector('.voo-x').addEventListener('click', (e) => { e.stopPropagation(); fechar(); });
    if (window.gsap) window.gsap.fromTo(ov, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  }

  function montaCreditos(V, origem, abrirLoja) {
    const gsap = window.gsap, SplitText = window.SplitText;
    let n = guarda.ler('atlas.carinhos', 0);
    if (n >= VOO) ganhaAcessorio('aviador');
    const el = document.createElement('div');
    el.className = 'creditos';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Créditos');
    el.innerHTML = `${FILTROS}<button class="cr-fechar" aria-label="Fechar"><svg viewBox="0 0 40 40"><path d="M8 9 L32 31 M31 8 L9 33" /></svg></button>
      <div class="cr-conteudo">${CABECALHO}
        <div class="dv-caixa">${dinoSvg(V, { uso: lerAcess().uso, diabo: guarda.ler('atlas.carinhos', 0) === DIABO })}</div>
        <h2 class="cr-msg">Boa prova de<br>Química Orgânica II</h2>
        <div class="cr-contagem"><svg class="cr-tally" viewBox="0 0 240 60" aria-hidden="true"><g class="tally"></g></svg><span class="cr-n">×${n}</span></div>
        <p class="cr-marco" aria-live="polite"></p>
        <div class="cr-botoes"><button class="cr-lojabtn" data-loja>${BOLSA}<span>Loja</span></button><button class="cr-voobtn" data-voo aria-label="Voar de avião" ${n >= VOO ? '' : 'hidden'}>${AVIAO_IC}</button></div>
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
    const btnLoja = q('.cr-botoes'); gsap.set(btnLoja, { autoAlpha: 0, y: 18 });
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
    const diabo = (on) => { // rápido de propósito: quem clica depressa quase nem vê
      gsap.to(q('.dv'), { '--vermelho': on ? VERMELHO : V.cor, duration: 0.14, overwrite: 'auto' });
      const h = cabeca.querySelector('.chifres');
      if (on && !h) {
        cabeca.insertAdjacentHTML('beforeend', CHIFRES);
        gsap.fromTo(cabeca.querySelector('.chifres'), { y: 9, scaleY: 0.2, opacity: 0, svgOrigin: '490 84' }, { y: 0, scaleY: 1, opacity: 1, duration: 0.16, ease: 'back.out(3)' });
        navigator.vibrate && navigator.vibrate([30, 20, 30]);
      } else if (!on && h) gsap.to(h, { opacity: 0, y: 6, duration: 0.1, onComplete: () => h.remove() });
    };
    const conta = () => {
      n++; guarda.gravar('atlas.carinhos', n);
      navigator.vibrate && navigator.vibrate(10);
      if (n <= MAXR) { const p = risco(n - 1); gsap.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: 'power2.out' }); }
      gsap.to(numEstado, { v: n, duration: 0.45, ease: 'power2.out', onUpdate: mostraNum });
      gsap.fromTo(numEl, { scale: 1.45, rotation: gsap.utils.random(-6, 6) }, { scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' });
      if (n === DIABO) diabo(true); else if (n === DIABO + 1) diabo(false);
      if (n === VOO) { // 1000: o Mutaninho sobe num avião e libera o jogo para sempre
        const b = q('.cr-voobtn'); b.hidden = false;
        const m = q('.cr-marco'); m.textContent = '1000! HORA DE DECOLAR.'; gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        ganhaAcessorio('aviador');
        setTimeout(() => cenaAviao(V), 700);
      }
      if (MARCOS[n]) {
        const m = q('.cr-marco'); m.textContent = MARCOS[n];
        gsap.fromTo(m, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
        clearTimeout(marcoTimer); marcoTimer = setTimeout(() => gsap.to(m, { opacity: 0, duration: 0.5 }), 2600);
      }
    };
    el.addEventListener('pointerdown', (e) => {
      if (!vivo || e.target.closest('.cr-fechar, .cr-lojabtn, .cr-voobtn, .cr-loja, .voo')) return;
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
      if (e.target.closest('.cr-voobtn')) { abreVoo(V, false); return; }
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
        .to([...cabeca.querySelectorAll('.acc'), q('.cr-botoes'), q('.cr-loja')].filter(Boolean), { opacity: 0, duration: 0.25 }, 0)
        .to([peq, contagem, q('.cr-marco')], { opacity: 0, duration: 0.25 }, 0)
        .to(vermelhos, { scale: 0.88, opacity: 0, duration: 0.35, ease: 'power2.in', stagger: 0.04 }, 0.15)
        .to(el, { clipPath: `circle(0px at ${origem[0]}px ${origem[1]}px)`, duration: 0.6, ease: 'power3.inOut' }, 0.4);
    };
    el.querySelector('.cr-fechar').addEventListener('click', (e) => { e.stopPropagation(); fecha(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && creditosEl === el) { if (fechaVooAtual) { fechaVooAtual(); return; } if (loja) { fechaLoja(); return; } fecha(); document.removeEventListener('keydown', esc); } });
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
  const aplicaVisual = (v) => { if (v === 'vidro' || v === 'papel') document.documentElement.dataset.visual = v; else delete document.documentElement.dataset.visual; };
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
      toquesVersao = (performance.now() - ultimoToqueVersao < 2500 ? toquesVersao : 0) + 1; ultimoToqueVersao = performance.now(); navigator.vibrate && navigator.vibrate(6);
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
      html: `
        <div class="cartao hoje sobe" style="--i:1">
          <div class="hoje-anel" id="anel-geral"></div>
          <div class="hoje-tx"><b>${g.dom} de ${g.total}</b> dominadas<small>${seq ? `🔥 ${seq} ${seq === 1 ? 'dia' : 'dias'} seguidos` : 'Comece hoje a sua sequência'} · ${feitasHoje} ${feitasHoje === 1 ? 'revisão' : 'revisões'} hoje</small></div>
        </div>
        <div class="sec"><h3>O que estudar</h3><span>${descreveEscopo(escopo)}</span></div>
        <div class="filtros sobe" style="--i:2">${chip('tudo', 'Tudo')}${chip('aula', 'Por aula')}${chip('mec', 'Por mecanismo')}${chip('salvos', `Salvos (${salvos.size})`)}${chip('erradas', 'Que errei')}</div>
        ${escopo.tipo === 'aula' ? `<select class="sel-estudo" data-escopo-id="aula">${aulasOpt}</select>` : ''}
        ${escopo.tipo === 'mec' ? `<select class="sel-estudo" data-escopo-id="mec">${mecOpt}</select>` : ''}
        <div class="qtd sobe" style="--i:3"><span>Quantidade</span>${[10, 20, 50].map((n) => `<button class="chip${qtd === n ? ' on' : ''}" data-qtd="${n}">${n}</button>`).join('')}<button class="chip${qtd === 0 ? ' on' : ''}" data-qtd="0">Todas</button></div>
        <div class="sec"><h3>Modos de estudo</h3></div>
        <div class="modos">
          <button class="modo sobe m-cartoes" style="--i:4" data-iniciar="cartoes"><span class="md-ic">${IC.cartoes}</span><b>Testar-me</b><small>${venc ? `${venc} para revisar` : 'cartões de revisão'}${novas ? ` · ${novas} novas` : ''}</small></button>
          <button class="modo sobe m-simulado" style="--i:5" data-iniciar="simulado"><span class="md-ic">${IC.simulado}</span><b>Simulado</b><small>múltipla escolha</small></button>
          <button class="modo sobe m-jogo" style="--i:6" data-ir="#/jogo"><span class="md-ic">${IC.jogo}</span><b>Reagentes</b><small>preencha as setas</small></button>
          <button class="modo sobe m-mapas" style="--i:7" data-ir="#/mec"><span class="md-ic">${IC.mapa}</span><b>Mapas</b><small>diagramas de reações</small></button>
          <button class="modo sobe m-salvos" style="--i:8" data-ir="#/salvos"><span class="md-ic">${IC.salvos}</span><b>Salvos</b><small>${plural(salvos.size, 'reação', 'reações')}</small></button>
          <button class="modo sobe m-notas" style="--i:9" data-ir="#/notas"><span class="md-ic">${IC.notas}</span><b>Anotações</b><small>${plural(D.reacoes.filter((r) => comNota(r.i)).length, 'anotação', 'anotações')}</small></button>
        </div>
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
    const novo = sessaoS.acertos === n ? sorteiaAcessorio() : null; // 100%: ganha um acessório para o Mutaninho
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

  // ---------- Mapas de reações: diagrama + jogo "preencha os reagentes" ----------
  const mapaPorId = (id) => D.mapas.find((m) => m.id === id);
  const SETA_MP = '<svg class="mp-seta" viewBox="0 0 16 22" aria-hidden="true"><path d="M8 1v17M2.5 13 8 19l5.5-6"/></svg>';
  const melhorMapa = (id) => (guarda.ler('atlas.mapas', {})[id] || {}).melhor;
  // ----- diagrama radial: o composto de partida no centro, os produtos em volta, o reagente em cada seta -----
  function layoutRadial(m) {
    const folhas = (n) => (n.r && n.r.length ? n.r.reduce((t, c) => t + folhas(c), 0) : 1);
    const nR = m.r.length, R1 = nR > 7 ? 250 : Math.max(190, nR * 34), PASSO = 170, EX = 1.3; // elipse: mais larga que alta, porque os rótulos são largos
    const nos = [{ n: m.c.n, s: m.c.s, x: 0, y: 0, d: 0 }], arestas = [];
    const coloca = (pai, filhos, a0, a1, d) => {
      const tot = filhos.reduce((t, c) => t + folhas(c), 0); let a = a0;
      filhos.forEach((c) => {
        const fa = ((a1 - a0) * folhas(c)) / tot, mid = a + fa / 2;
        const r = R1 + (d - 1) * PASSO - (d === 1 && nR > 7 && filhos.indexOf(c) % 2 ? 70 : 0); // com muitos ramos, alterna dois anéis para ficar compacto
        const no = { n: c.n, s: c.s, nt: c.nt, rg: c.rg, d, x: Math.cos(mid) * r * EX, y: Math.sin(mid) * r };
        nos.push(no); arestas.push({ de: pai, para: no, rg: c.rg });
        if (c.r) coloca(no, c.r, a, a + fa, d + 1);
        a += fa;
      });
    };
    // gira o anel para o ramo mais fundo ficar em cima: subir/descer custa menos largura que ir para os lados
    const prof = (n) => 1 + Math.max(0, ...(n.r || []).map(prof));
    const totF = m.r.reduce((t, c) => t + folhas(c), 0);
    let acum = 0, ini = -Math.PI / 2;
    const fundo = m.r.reduce((b, c) => (prof(c) * 100 + folhas(c) > prof(b) * 100 + folhas(b) ? c : b), m.r[0]);
    for (const c of m.r) { const fa = (2 * Math.PI * folhas(c)) / totF; if (c === fundo) { ini = -Math.PI / 2 - (acum + fa / 2); break; } acum += fa; }
    coloca(nos[0], m.r, ini, ini + 2 * Math.PI, 1);
    const LX = 70, LY = 70, PAD = 24;
    const x0 = Math.min(...nos.map((n) => n.x)) - LX - PAD, y0 = Math.min(...nos.map((n) => n.y)) - LY - PAD;
    nos.forEach((n) => { n.x -= x0; n.y -= y0; });
    return { nos, arestas, W: Math.max(...nos.map((n) => n.x)) + LX + PAD, H: Math.max(...nos.map((n) => n.y)) + LY + PAD };
  }
  function zoomRadial(L) {
    const cont = $('#radial'), dim = $('#rad-dim'), tela = $('#rad-tela');
        let z = 1;
        const aplica = (nz, centro) => {
          const cx = (cont.scrollLeft + cont.clientWidth / 2) / z, cy = (cont.scrollTop + cont.clientHeight / 2) / z;
          z = Math.min(1.4, Math.max(0.25, nz));
          dim.style.width = L.W * z + 'px'; dim.style.height = L.H * z + 'px'; tela.style.transform = `scale(${z})`;
          cont.style.height = Math.min(innerHeight * 0.72, Math.max(300, L.H * z + 2)) + 'px'; // sem sobra em branco quando o mapa cabe
          const [px, py] = centro || [cx, cy];
          cont.scrollLeft = px * z - cont.clientWidth / 2; cont.scrollTop = py * z - cont.clientHeight / 2;
        };
        const raiz = L.nos[0];
        const ajusta = () => aplica(Math.min(1, Math.max(0.78, cont.clientWidth / L.W)), [raiz.x, raiz.y]);
        ajusta();
        $('#rad-mais').addEventListener('click', () => aplica(z * 1.2));
        $('#rad-menos').addEventListener('click', () => aplica(z / 1.2));
        $('#rad-fit').addEventListener('click', () => aplica(Math.min(1.4, Math.max(0.25, Math.min(cont.clientWidth / L.W, cont.clientHeight / L.H))), [L.W / 2, L.H / 2]));
  }
  function telaMapa(id) {
    const m = mapaPorId(id); if (!m) return null;
    const L = layoutRadial(m);
    const linhas = L.arestas.map((e) => {
      const dx = e.para.x - e.de.x, dy = e.para.y - e.de.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const ini = [e.de.x + ux * (e.de.d ? 58 : 66), e.de.y + uy * (e.de.d ? 52 : 60)], fim = [e.para.x - ux * 64, e.para.y - uy * 58];
      e.lx = ini[0] + (fim[0] - ini[0]) * 0.52; e.ly = ini[1] + (fim[1] - ini[1]) * 0.52;
      return `<line class="rad-lin" x1="${ini[0].toFixed(1)}" y1="${ini[1].toFixed(1)}" x2="${fim[0].toFixed(1)}" y2="${fim[1].toFixed(1)}" marker-end="url(#rad-ponta)"/>`;
    }).join('');
    const nosHtml = L.nos.map((n) => `<div class="rad-no${n.d ? '' : ' raiz'}" style="left:${n.x.toFixed(1)}px;top:${n.y.toFixed(1)}px"><div class="rad-in">${tile(n.s, 0)}<b>${esc(n.n)}</b></div></div>`).join('');
    const rgs = L.arestas.map((e) => `<div class="rad-rg" style="left:${e.lx.toFixed(1)}px;top:${e.ly.toFixed(1)}px"><span>${esc(e.rg)}</span></div>`).join('');
    const notas = L.nos.filter((n) => n.nt).map((n) => `<div class="rad-nota"><b>${esc(n.n)}</b><span class="rg">${esc(n.rg)}</span><p>${esc(n.nt)}</p></div>`).join('');
    return {
      titulo: 'Mapa', aba: 'mec', prof: 1,
      html: `<h2 class="titulo-lista sobe">${esc(m.t)}</h2><p class="sub-lista sobe" style="--i:1">${esc(m.sub)}. Arraste para ver tudo.</p>${m.lg ? `<p class="sub-lista mapa-lg">${esc(m.lg)}</p>` : ''}
        <div class="rad-wrap sobe" style="--i:2"><div class="radial" id="radial"><div class="rad-dim" id="rad-dim"><div class="rad-tela" id="rad-tela" style="width:${L.W}px;height:${L.H}px">
          <svg class="rad-arestas" width="${L.W}" height="${L.H}" aria-hidden="true"><defs><marker id="rad-ponta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="rad-ponta" d="M1 1 L9 5 L1 9 L3 5 Z"/></marker></defs>${linhas}</svg>
          ${rgs}${nosHtml}</div></div></div>
          <div class="rad-ctl"><button id="rad-mais" aria-label="Aumentar">+</button><button id="rad-menos" aria-label="Diminuir">−</button><button id="rad-fit" aria-label="Ajustar à tela">⤢</button></div></div>
        ${notas ? `<div class="sec"><h3>Para lembrar</h3><span>${plural(L.nos.filter((n) => n.nt).length, 'nota', 'notas')}</span></div>${notas}` : ''}`,
      depois: () => {
        zoomRadial(L);
        mo(document.querySelectorAll('.rad-in'), { opacity: [0, 1], scale: [0.7, 1] }, { type: 'spring', stiffness: 300, damping: 22, delay: M && M.stagger ? M.stagger(0.05, { startDelay: 0.1 }) : 0 });
        mo(document.querySelectorAll('.rad-lin,.rad-rg'), { opacity: [0, 1] }, { duration: 0.4, delay: M && M.stagger ? M.stagger(0.03, { startDelay: 0.3 }) : 0 });
      },
    };
  }

  // ----- jogo dos reagentes (fica em Estudar): preencha as setas de um mapa -----
  function telaJogos() {
    return {
      titulo: 'Jogo dos reagentes', aba: 'estudar', prof: 1,
      html: `<h2 class="titulo-lista sobe">Jogo dos reagentes</h2><p class="sub-lista sobe" style="--i:1">Escolha um mapa e coloque o reagente certo em cada seta.</p>
        ${D.mapas.map((m, i) => `<a class="aula sobe" style="--i:${i + 2}" href="#/jogo/${m.id}"><div class="num jogo-ic">${IC.jogo}</div><div class="tx"><b>${esc(m.t)}</b><small>${esc(m.sub)}${melhorMapa(m.id) != null ? ` · melhor ${melhorMapa(m.id)}%` : ''}</small></div>${SETA_IR}</a>`).join('')}`,
    };
  }
  function telaJogoMapa(id) {
    const m = mapaPorId(id); if (!m) return null;
    const L = layoutRadial(m);
    const arestas = L.arestas.map((e) => e.rg);
    const linhas = L.arestas.map((e) => {
      const dx = e.para.x - e.de.x, dy = e.para.y - e.de.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const ini = [e.de.x + ux * (e.de.d ? 58 : 66), e.de.y + uy * (e.de.d ? 52 : 60)], fim = [e.para.x - ux * 64, e.para.y - uy * 58];
      e.lx = ini[0] + (fim[0] - ini[0]) * 0.52; e.ly = ini[1] + (fim[1] - ini[1]) * 0.52;
      return `<line class="rad-lin" x1="${ini[0].toFixed(1)}" y1="${ini[1].toFixed(1)}" x2="${fim[0].toFixed(1)}" y2="${fim[1].toFixed(1)}" marker-end="url(#rad-ponta)"/>`;
    }).join('');
    const nosHtml = L.nos.map((n) => `<div class="rad-no${n.d ? '' : ' raiz'}" style="left:${n.x.toFixed(1)}px;top:${n.y.toFixed(1)}px"><div class="rad-in">${tile(n.s, 0)}<b>${esc(n.n)}</b></div></div>`).join('');
    const slots = L.arestas.map((e, i) => `<div class="rad-rg jogo" style="left:${e.lx.toFixed(1)}px;top:${e.ly.toFixed(1)}px"><button class="mp-slot" data-slot="${i}"><span>?</span></button></div>`).join('');
    return {
      titulo: 'Jogo', aba: 'estudar', prof: 2,
      html: `<h2 class="titulo-lista sobe">${esc(m.t)}</h2><p class="sub-lista sobe" style="--i:1">Toque num reagente e depois no <b>?</b> da seta certa (ou o contrário). Toque num reagente colocado para tirá-lo.</p>
        <div class="mp-banco" id="mp-banco"></div>
        <div class="rad-wrap sobe" style="--i:2"><div class="radial" id="radial"><div class="rad-dim" id="rad-dim"><div class="rad-tela" id="rad-tela" style="width:${L.W}px;height:${L.H}px">
          <svg class="rad-arestas" width="${L.W}" height="${L.H}" aria-hidden="true"><defs><marker id="rad-ponta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="rad-ponta" d="M1 1 L9 5 L1 9 L3 5 Z"/></marker></defs>${linhas}</svg>
          ${nosHtml}${slots}</div></div></div>
          <div class="rad-ctl"><button id="rad-mais" aria-label="Aumentar">+</button><button id="rad-menos" aria-label="Diminuir">−</button><button id="rad-fit" aria-label="Ajustar à tela">⤢</button></div></div>
        <div class="mp-fim"><div id="mp-res" aria-live="polite"></div><div class="resumo-acoes"><button class="btn-grande pequeno" id="mp-verif"><b>Verificar</b></button><button class="btn" id="mp-reinicia">Recomeçar</button></div></div>`,
      depois: () => { zoomRadial(L); iniciaJogoMapa(m, arestas); },
    };
  }
  function iniciaJogoMapa(m, arestas) {
    const chips = embaralha(arestas.map((t, i) => ({ t, i })));
    const slots = arestas.map(() => null); // slot -> índice em chips
    let selChip = null, selSlot = null, verificado = false;
    const banco = $('#mp-banco'), res = $('#mp-res');
    const colocado = (c) => slots.includes(c);
    const pinta = () => {
      banco.innerHTML = chips.map((c, ci) => (colocado(ci) ? '' : `<button class="mp-chip${selChip === ci ? ' sel' : ''}" data-chip="${ci}">${esc(c.t)}</button>`)).join('') || '<span class="mp-vazio">Todos os reagentes foram colocados.</span>';
      document.querySelectorAll('.mp-slot').forEach((el) => {
        const k = +el.dataset.slot, c = slots[k];
        el.className = 'mp-slot' + (c === null ? '' : ' cheio') + (selSlot === k ? ' sel' : '');
        el.innerHTML = c === null ? '<span>?</span>' : `<span>${esc(chips[c].t)}</span>`;
        if (verificado && c !== null) el.classList.add(chips[c].t === arestas[k] ? 'certo' : 'errado');
      });
    };
    const poe = (ci, k) => { // coloca o reagente ci no espaço k (devolve o que estava lá)
      slots.forEach((v, j) => { if (v === ci) slots[j] = null; });
      slots[k] = ci; selChip = selSlot = null; verificado = false; res.textContent = '';
      pinta();
      const el = document.querySelector(`.mp-slot[data-slot="${k}"]`); if (el) mo(el, { scale: [0.85, 1] }, { type: 'spring', stiffness: 420, damping: 18 });
      navigator.vibrate && navigator.vibrate(6);
    };
    banco.addEventListener('click', (e) => {
      const b = e.target.closest('[data-chip]'); if (!b) return;
      const ci = +b.dataset.chip;
      if (selSlot !== null) poe(ci, selSlot); else { selChip = selChip === ci ? null : ci; pinta(); }
    });
    document.querySelector('#rad-tela').addEventListener('click', (e) => {
      const b = e.target.closest('.mp-slot'); if (!b) return;
      const k = +b.dataset.slot;
      if (selChip !== null) { poe(selChip, k); return; }
      if (slots[k] !== null) { slots[k] = null; verificado = false; res.textContent = ''; pinta(); return; }
      selSlot = selSlot === k ? null : k; pinta();
    });
    $('#mp-verif').addEventListener('click', () => {
      const vazios = slots.filter((c) => c === null).length;
      if (vazios === slots.length) { res.innerHTML = '<p class="mp-msg">Coloque alguns reagentes antes de verificar.</p>'; return; }
      verificado = true; pinta();
      const certos = slots.filter((c, k) => c !== null && chips[c].t === arestas[k]).length, n = arestas.length;
      const pct = Math.round((100 * certos) / n);
      const tudo = certos === n;
      res.innerHTML = `<p class="mp-msg ${tudo ? 'ok' : ''}"><b>${certos} de ${n}</b> certos${vazios ? ` · ${plural(vazios, 'vazio', 'vazios')}` : ''}${tudo ? ' · mapa completo!' : ''}</p>`;
      mo(document.querySelectorAll('.mp-slot.certo'), { scale: [1, 1.1, 1] }, { duration: 0.4, delay: M && M.stagger ? M.stagger(0.04) : 0 });
      mo(document.querySelectorAll('.mp-slot.errado'), { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.4 });
      if (!vazios) { const a = guarda.ler('atlas.mapas', {}); a[m.id] = { melhor: Math.max(pct, (a[m.id] || {}).melhor || 0) }; guarda.gravar('atlas.mapas', a); }
    });
    $('#mp-reinicia').addEventListener('click', () => { mostra(); });
    pinta();
    mo(banco.querySelectorAll('.mp-chip'), { opacity: [0, 1], y: [10, 0], scale: [0.9, 1] }, { type: 'spring', stiffness: 320, damping: 22, delay: M && M.stagger ? M.stagger(0.03) : 0 });
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
