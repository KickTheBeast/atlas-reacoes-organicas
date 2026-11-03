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

  // ---------- armazenamento (nunca quebra se o navegador bloquear) ----------
  const guarda = {
    ler(k, pad) { try { const v = localStorage.getItem(k); return v == null ? pad : JSON.parse(v); } catch { return pad; } },
    gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  };
  let salvos = new Set(guarda.ler('atlas.salvos', []));
  const alternarSalvo = (id) => {
    salvos.has(id) ? salvos.delete(id) : salvos.add(id);
    guarda.gravar('atlas.salvos', [...salvos]);
    return salvos.has(id);
  };

  // ---------- dados ----------
  let D = null, S = null, guiaPorId = new Map(), porId = new Map(), nomes = { aula: {}, mec: {}, nu: {}, el: {} }, texto = new Map();
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });

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
  }

  // ---------- estruturas ----------
  function hidrata(raiz) {
    raiz.querySelectorAll('.tile[data-m]').forEach((el) => {
      if (!S) return;
      const svg = S[el.dataset.m];
      el.removeAttribute('data-m');
      if (!svg) { el.classList.replace('carrega', 'erro'); el.textContent = 'estrutura indisponível'; return; }
      el.classList.remove('carrega');
      el.innerHTML = svg;
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
    return link ? `<a class="etq ${tipo}" href="#/${tipo}/${id}">${esc(nome)}</a>` : `<span class="etq ${tipo}">${esc(nome)}</span>`;
  };
  function itemHtml(r, i) {
    const on = salvos.has(r.i);
    return `<div class="item sobe" style="--i:${i}"><a href="#/r/${r.i}">
      <div class="linha">Aula ${rotuloAula(r.a)}${r.s ? `<em>slides ${esc(r.s)}</em>` : ''}</div>
      <b>${esc(r.n)}</b><div class="etqs">${r.c.slice(0, 3).map((c) => etq('mec', c)).join('')}</div></a>
      <button class="estrela${on ? ' on' : ''}" data-salvar="${r.i}" aria-label="${on ? 'Remover dos salvos' : 'Salvar'}" aria-pressed="${on}">${STAR}</button></div>`;
  }
  const vazio = (msg) => `<div class="vazio"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>${msg}</div>`;

  // ---------- telas ----------
  function telaAulas() {
    const stats = `<div class="stats"><div><b data-n="${D.reacoes.length}">${D.reacoes.length}</b><span>reações</span></div><div><b data-n="${D.aulas.filter((a) => a.id !== '00').length}">${D.aulas.filter((a) => a.id !== '00').length}</b><span>aulas</span></div><div><b data-n="${D.categorias.length}">${D.categorias.length}</b><span>mecanismos</span></div></div>`;
    const hex = '<svg class="hex" viewBox="0 0 100 100"><path d="M50 8 L86 29 L86 71 L50 92 L14 71 L14 29 Z"/></svg><svg class="hex" viewBox="0 0 100 100"><path d="M50 8 L86 29 L86 71 L50 92 L14 71 L14 29 Z"/></svg>';
    const itens = D.aulas.map((a, i) => `<a class="aula sobe" style="--i:${i + 2}" href="#/aula/${a.id}"><div class="num">${a.id === '00' ? 'Ex.' : rotuloAula(a.id)}</div><div class="tx"><b>${esc(a.nome)}</b><small>${plural(a.n, 'reação', 'reações')}</small></div>${SETA_IR}</a>`).join('');
    return {
      titulo: 'Atlas Orgânico', aba: 'aulas', prof: 0,
      html: `<section class="hero sobe">${hex}<h2>Reações de Química Orgânica II</h2><p>Toda a matéria, organizada para estudar.</p>${stats}</section>
        <div id="instalar"></div>
        <button class="busca-falsa sobe" style="--i:1" data-ir="#/busca"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>Buscar reação ou reagente…</button>
        <a class="guia-link sobe" style="--i:2" href="#/mec"><span class="gl-ic">vs</span><span class="gl-tx"><b>Guias rápidos de mecanismos</b><small>SN1, SN2, E1, E2, alcenos e mais</small></span>${SETA_IR}</a>
        <div class="sec"><h3>Por aula</h3><span>${D.aulas.length} aulas</span></div>${itens}
        <a class="aula sobe" style="--i:${D.aulas.length + 3}" href="#/todas"><div class="num">∑</div><div class="tx"><b>Todas as reações</b><small>${plural(D.reacoes.length, 'reação', 'reações')}</small></div>${SETA_IR}</a>
        <div class="rodape"><button class="avatar" data-creditos aria-label="Créditos">${DINO_AVATAR}</button><br>Versão ${BUILD}<br><button data-verificar>Verificar atualização</button></div>`,
      depois: () => { montaInstalar(); contaAte(tela); },
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
    const guias = tipo === 'mec' ? `<div class="sec"><h3>Guias rápidos</h3><span>tabelas e esquemas</span></div>${D.guias.map((g, i) => `<a class="aula sobe" style="--i:${i + 2}" href="#/guia/${g.id}"><div class="num guia-num">${esc(g.curto)}</div><div class="tx"><b>${esc(g.t)}</b><small>${esc(g.sub)}</small></div>${SETA_IR}</a>`).join('')}<div class="sec"><h3>Reações por mecanismo</h3><span>${D.categorias.length} tipos</span></div>` : '';
    return {
      titulo: info[0], aba: tipo, prof: 0,
      html: `<h2 class="titulo-lista sobe">${info[0]}</h2><p class="sub-lista sobe" style="--i:1">${info[1]}</p>${nota}${guias}
        <div class="grade">${lista.map((x, i) => `<a class="ficha k-${tipo} sobe" style="--i:${i + 2}" href="#/${tipo}/${x.id}"><b>${esc(x.nome)}</b><small>${x.n}</small></a>`).join('')}</div>`,
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

  const tabelaHtml = (b) => (b.cols.length === 3 && b.cols[0] === 'Fator' ? fatoresHtml(b) : b.cols.length === 2 && b.cols[0] === 'Propriedade' ? kvHtml(b) : tabelaPadrao(b));

  function telaGuia(id) {
    const g = guiaPorId.get(id);
    if (!g) return null;
    const e = g.esq;
    const primeira = g.id === 'decisao' ? g.bl.find((b) => b.k === 't') : null;
    const blocos = g.bl.map((b) => b.k === 'l'
      ? `<div class="cartao dicas sobe"><h3 class="tb-titulo">${esc(b.t)}</h3><ul>${b.itens.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`
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
    else if (tipo === 'salvos') { base = D.reacoes.filter((r) => salvos.has(r.i)); nome = 'Salvos'; aba = 'salvos'; prof = 0; sub = 'Suas reações favoritas, mesmo offline.'; }
    else { base = D.reacoes.filter((r) => r[{ mec: 'c', nu: 'nu', el: 'el' }[tipo]].includes(id)); nome = nomes[tipo][id] || 'Reações'; aba = tipo; }
    if (!nome) return null;
    // filtros: por mecanismo dentro de uma aula; por aula nos demais
    const porAula = tipo !== 'aula';
    const cont = new Map();
    base.forEach((r) => (porAula ? [r.a] : r.c).forEach((k) => cont.set(k, (cont.get(k) || 0) + 1)));
    const chaveFiltro = tipo + ':' + id;
    if (!filtroAtual || filtroAtual.chave !== chaveFiltro) filtroAtual = { chave: chaveFiltro, v: null };
    const chips = [...cont].sort((a, b) => (porAula ? a[0].localeCompare(b[0]) : b[1] - a[1]));
    return {
      titulo: nome, aba, prof,
      html: `<h2 class="titulo-lista sobe">${esc(nome)}</h2>
        <p class="sub-lista sobe" style="--i:1">${sub ? esc(sub) + ' · ' : ''}<span id="contagem"></span></p>
        ${tipo === 'mec' ? guiaLink(id) : ''}
        ${chips.length > 1 ? `<div class="filtros sobe" style="--i:2" id="filtros"><button class="chip on" data-f="">Todas</button>${chips.map(([k, n]) => `<button class="chip" data-f="${esc(k)}">${esc(porAula ? 'Aula ' + rotuloAula(k) : nomes.mec[k] || k)}<i>${n}</i></button>`).join('')}</div>` : ''}
        <div id="itens"></div>`,
      depois: () => {
        const pinta = () => {
          const f = filtroAtual.v;
          const l = f ? base.filter((r) => (porAula ? r.a === f : r.c.includes(f))) : base;
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
        ${r.nt ? `<div class="cartao sobe" style="--i:5"><p class="notas">${r.nt}</p></div>` : ''}
        ${mec}
        <div class="nav-det">${nav(ant, '<span class="nudge-e">←</span> Anterior')}${nav(prox, 'Próxima <span class="nudge">→</span>')}</div></article>`,
    };
  }

  function telaBusca() {
    return {
      titulo: 'Buscar', aba: undefined, prof: 1,
      html: `<div class="campo"><input id="q" type="search" placeholder="Ex.: SN2, bromônio, Zaitsev, epóxido…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></div><div id="resultados"></div>`,
      depois: () => {
        const q = $('#q'), out = $('#resultados');
        const sugest = ['SN2', 'SN1', 'E2', 'Zaitsev', 'Markovnikov', 'carbeno', 'bromônio', 'epóxido', 'rearranjo', 'Hammond'];
        const vazioInicial = () => { out.innerHTML = `<div class="sec"><h3>Sugestões</h3></div><div class="filtros" style="flex-wrap:wrap;overflow:visible">${sugest.map((s) => `<button class="chip" data-sug="${s}">${s}</button>`).join('')}</div>`; };
        let t;
        const buscar = () => {
          const tok = norm(q.value).split(/\s+/).filter(Boolean);
          if (!tok.length) return vazioInicial();
          const res = D.reacoes.filter((r) => tok.every((k) => texto.get(r.i).includes(k)));
          ultimaLista = res.map((r) => r.i);
          out.innerHTML = `<div class="sec"><h3>Resultados</h3><span>${plural(res.length, 'reação', 'reações')}</span></div>` + (res.length ? res.slice(0, 80).map(itemHtml).join('') + (res.length > 80 ? `<p class="vazio">Mostrando 80 de ${res.length}. Refine a busca.</p>` : '') : vazio('Nada encontrado. Tente outra palavra.'));
        };
        q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 90); });
        out.addEventListener('click', (e) => { const s = e.target.closest('[data-sug]'); if (s) { q.value = s.dataset.sug; buscar(); } });
        vazioInicial();
        q.focus({ preventScroll: true });
      },
    };
  }

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
    if (a === 'aula') return telaLista('aula', b);
    if (a === 'todas') return telaLista('todas');
    if (a === 'salvos') return telaLista('salvos');
    if (a === 'r') return telaDetalhe(b);
    if (a === 'busca') return telaBusca();
    return null;
  }
  const TITULOS = { aulas: 'Aulas', mec: 'Mecanismos', nu: 'Nucleófilos', el: 'Eletrófilos', salvos: 'Salvos' };

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
    tela.innerHTML = `<div class="tela ${usaMotion ? '' : dir}">${t.html}</div>`;
    window.scrollTo(0, 0);
    hidrata(tela);
    t.depois && t.depois();
    marcaAba();
    animaTela(dir);
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
  function animaTela(dir) {
    const el = tela.firstElementChild;
    if (!usaMotion || !el) return;
    const fim = () => { el.style.opacity = ''; el.style.transform = ''; };
    M.animate(el, { opacity: [0, 1], x: [dir === 'frente' ? 40 : dir === 'tras' ? -40 : 0, 0], y: [dir ? 0 : 14, 0] }, { ...MOLA, stiffness: 320, damping: 30 }).then(fim, fim);
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

  // ---------- créditos: o dinossauro (traço cru, tela cheia) ----------
  const COROA = 'M8 56 L12 14 L30 38 L46 6 L62 38 L80 14 L84 56 Z';
  const DINO_AVATAR = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="24" fill="#111"/><path d="M11 33 L13 17 L21 26 L24 13 L27 26 L35 17 L37 33 Z" fill="#f4c20d" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 37h26" stroke="#e63a2e" stroke-width="3" stroke-linecap="round"/></svg>`;
  const BD = `<svg class="bd" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Dinossauro desenhado em traço cru">
    <defs>
      <filter id="rug" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="rug2" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="G" yChannelSelector="R"/></filter>
      <filter id="grao"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.18"/></filter>
    </defs>
    <g class="bd-fundo" filter="url(#rug2)">
      <rect x="-20" y="-20" width="430" height="884" fill="#1a3fa6"/>
      <path d="M-20 560 L140 520 L410 560 L430 880 L-20 880 Z" fill="#e8452c"/>
      <path d="M-20 700 L200 668 L430 720 L430 880 L-20 880 Z" fill="#f4c20d"/>
      <path d="M270 -20 L430 -20 L430 150 L300 120 Z" fill="#f4c20d"/>
      <path d="M-20 -20 L120 -20 L90 70 L-20 40 Z" fill="#e8452c"/>
      <g stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75" fill="none"><path d="M20 590 l30 -10 M30 610 l40 -12 M40 630 l30 -8 M300 600 l34 -8 M310 620 l40 -10 M295 640 l44 -9"/></g>
      <g stroke="#111" stroke-width="3" stroke-linecap="round" opacity=".7" fill="none"><path d="M330 20 l40 14 M336 44 l36 12 M326 70 l44 10 M20 740 l60 -8 M26 760 l66 -10 M300 770 l60 10 M296 790 l66 8"/></g>
    </g>
    <g class="bd-doodles" filter="url(#rug2)" font-family="Impact,'Haettenschweiler','Arial Narrow Bold','Helvetica Neue',Arial,sans-serif" font-weight="900" fill="#fff" stroke="#111" stroke-width="1.2" paint-order="stroke">
      <path d="M52 262 L72 250 L92 262 L92 286 L72 298 L52 286 Z" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M58 270 l26 -10 M58 284 l28 -12" stroke="#fff" stroke-width="2.5" fill="none"/>
      <text x="22" y="330" font-size="26" transform="rotate(-9 22 330)">SN2</text>
      <path d="M20 340 l48 -16 m-10 -4 l12 4 l-6 12" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="300" y="392" font-size="24" transform="rotate(8 300 392)" fill="#f4c20d">C=C</text>
      <text x="318" y="432" font-size="19" transform="rotate(-6 318 432)">E2 ✕</text>
    </g>
    <g class="bd-titulo" filter="url(#rug)" font-family="Impact,'Haettenschweiler','Arial Narrow Bold','Helvetica Neue',Arial,sans-serif" font-weight="900" stroke="#111" paint-order="stroke" stroke-linejoin="round">
      <text x="30" y="92" font-size="24" fill="#fff" stroke-width="5" transform="rotate(-4 30 92)" letter-spacing="3">FEITO POR</text>
      <text x="26" y="150" font-size="56" fill="#fff" stroke-width="6" transform="rotate(-3 26 150)" letter-spacing="1" opacity=".95">MUTANO</text>
      <path d="M18 132 L238 106 M22 112 L232 146 M20 148 L236 120" stroke="#111" stroke-width="7" stroke-linecap="round" fill="none"/>
      <text x="24" y="222" font-size="86" fill="#f4c20d" stroke-width="9" transform="rotate(-3 24 222)" letter-spacing="-1">MUTANO</text>
      <text x="322" y="96" font-size="46" fill="#fff" stroke-width="6" transform="rotate(8 322 96)">©</text>
      
    </g>
    <g transform="translate(-14 8) scale(.955)"><g class="bd-dino" filter="url(#rug)" stroke="#111" stroke-linejoin="round" stroke-linecap="round">
      <g class="d-cauda-corpo">
        <path d="M24 548 C70 536 108 500 138 462 C168 424 206 392 244 354 L258 318 C262 286 286 262 320 262 C352 262 376 280 376 306 L366 322 L330 330 C304 338 292 352 292 376 C292 420 276 462 250 492 C232 514 212 528 192 536 L182 610 L160 668 L92 668 L106 628 L100 580 C78 590 54 580 24 548 Z" fill="#f4c20d" stroke-width="9"/>
        <path d="M196 452 C236 458 266 430 280 392" fill="#e8452c" stroke="none"/>
        <path d="M170 520 C200 540 236 520 262 480 C250 506 226 540 188 548 Z" fill="#e8452c" stroke="none"/>
      </g>
      <g class="d-ossos" fill="none" stroke="#111" stroke-width="5">
        <path d="M150 478 q40 -26 76 -22"/><path d="M168 456 q34 -26 70 -26"/><path d="M188 432 q30 -26 60 -26"/><path d="M206 408 q26 -22 52 -24"/>
        <path d="M120 520 q34 -6 62 -30"/>
      </g>
      <g class="d-espinha" fill="none" stroke="#111" stroke-width="4.5"><path d="M44 536 C90 518 128 484 156 450 C188 410 222 380 250 346"/><path d="M62 528 l-2 -16 M84 518 l-2 -18 M106 504 l-4 -18 M128 486 l-6 -18 M150 462 l-8 -16 M174 436 l-10 -14 M198 412 l-10 -12 M222 388 l-10 -12"/></g>
      <g class="d-perna" fill="none" stroke="#111" stroke-width="6"><path d="M160 668 l-22 14 M130 668 l-16 16 M100 668 l-10 18"/><path d="M146 620 q10 -30 6 -64"/></g>
      <g class="d-braco" transform-origin="262 446"><path d="M252 436 C276 440 298 454 308 476 L296 484 C288 470 270 462 248 458 Z" fill="#f4c20d" stroke-width="7"/><path d="M308 476 l16 8 M304 486 l16 14 M296 490 l8 18" fill="none" stroke-width="5"/></g>
      <g class="d-mandibula" transform-origin="318 330"><path d="M312 336 C336 338 366 346 378 360 L374 384 C346 394 322 388 304 372 Z" fill="#f4c20d" stroke-width="8"/><path d="M322 346 l8 -16 l8 16 M342 352 l8 -16 l8 18 M362 360 l7 -14 l6 18" fill="#fff" stroke-width="3.5"/></g>
      <g class="d-dentes-sup" fill="#fff" stroke-width="3.5"><path d="M326 330 l8 24 l8 -24 M346 328 l8 26 l8 -26 M366 322 l6 20 l6 -22"/></g>
      <g class="d-olho">
        <circle cx="318" cy="288" r="21" fill="#fff" stroke-width="7"/>
        <g class="d-pupila"><path d="M318 288 m0 0 c3 -9 14 -6 12 4 c-2 12 -18 10 -18 -4 c0 -16 24 -14 24 4" fill="none" stroke-width="5"/><circle cx="320" cy="290" r="4" fill="#111" stroke="none"/></g>
        <g class="d-xis" opacity="0"><path d="M304 274 L334 304 M334 274 L304 304" stroke="#e8452c" stroke-width="8" fill="none"/></g>
        <path d="M296 262 q22 -18 46 -4" fill="none" stroke-width="6"/>
      </g>
      <g class="d-coroa"><path d="M276 252 L282 208 L300 232 L318 196 L336 232 L354 208 L360 252 Z" fill="#e8452c" stroke-width="7"/><circle cx="282" cy="204" r="6" fill="#fff" stroke-width="3.5"/><circle cx="318" cy="192" r="7" fill="#fff" stroke-width="3.5"/><circle cx="354" cy="204" r="6" fill="#fff" stroke-width="3.5"/><path d="M280 244 h76" fill="none" stroke="#fff" stroke-width="3"/></g>
    </g></g>
    <g class="bd-marcas" filter="url(#rug2)" font-family="Impact,'Haettenschweiler','Arial Narrow Bold','Helvetica Neue',Arial,sans-serif" font-weight="900">
      <text class="bd-fala" x="20" y="748" font-size="30" fill="#fff" stroke="#111" stroke-width="7" paint-order="stroke" stroke-linejoin="round" transform="rotate(-3 20 748)">FAÇA CARINHO.</text>
      <g class="bd-tally" stroke="#111" stroke-width="5" stroke-linecap="round" fill="none"></g>
      <text class="bd-cont" x="278" y="810" font-size="26" fill="#f4c20d" stroke="#111" stroke-width="6" paint-order="stroke" stroke-linejoin="round" transform="rotate(4 278 810)">×0</text>
    </g>
  </svg>`;
  const FRASES = ['OK.', 'MAIS.', 'NÃO PARE.', 'HA!', 'RRRRR.', 'ISSO.', 'AGORA SIM.'];
  const MARCOS = { 10: '10! AGORA SOMOS AMIGOS.', 25: 'PROVA DE ORGÂNICA II? PODE VIR.', 50: 'MUTANO APROVA.', 100: 'REI DO CARINHO.' };
  let creditosEl = null;

  function abreCreditos() {
    if (creditosEl) return;
    let n = guarda.ler('atlas.carinhos', 0);
    const el = document.createElement('div');
    el.className = 'creditos';
    el.innerHTML = `${BD}<button class="cr-fechar" aria-label="Fechar"><svg viewBox="0 0 40 40"><path d="M7 9 L33 31 M32 7 L9 33" /></svg></button><div class="cr-marcas" aria-hidden="true"></div>`;
    document.body.appendChild(el);
    creditosEl = el;
    document.body.style.overflow = 'hidden';
    const q = (s) => el.querySelector(s);
    const [cabeca, coroa, mand, pupila, xis, braco, corpo, tally, cont, fala, marcas] =
      ['.d-coroa', '.d-coroa', '.d-mandibula', '.d-pupila', '.d-xis', '.d-braco', '.bd-dino', '.bd-tally', '.bd-cont', '.bd-fala', '.cr-marcas'].map(q);
    // Contagem em risquinhos de cinco (como quem conta dias na parede)
    const risca = () => {
      const g = 5, max = 30, v = Math.min(n, max);
      let d = '';
      for (let k = 0; k < v; k++) {
        const grupo = Math.floor(k / g), pos = k % g, x0 = 22 + (grupo % 6) * 34, y0 = 772 + Math.floor(grupo / 6) * 28;
        d += pos < 4 ? `M${x0 + pos * 6} ${y0} l${(k % 3) - 1} 22 ` : `M${x0 - 4} ${y0 + 18} l28 -14 `;
      }
      tally.setAttribute('d', d); tally.innerHTML = `<path d="${d}"/>`;
      cont.textContent = '×' + n;
    };
    risca();
    if (n) fala.textContent = 'DE NOVO?';
    if (usaMotion) {
      M.animate(el, { clipPath: ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'] }, { duration: 0.55, ease: [0.7, 0, 0.2, 1] });
      M.animate('.bd-titulo text', { opacity: [0, 1], x: [-40, 0] }, { delay: M.stagger(0.12, { startDelay: 0.45 }), duration: 0.35 });
      M.animate(corpo, { y: [60, 0], opacity: [0, 1] }, { type: 'spring', stiffness: 160, damping: 16, delay: 0.5 });
      M.animate(coroa, { rotate: [-3, 3] }, { duration: 1.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' });
      M.animate(mand, { rotate: [0, 4] }, { duration: 1.1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' });
    }
    const fecha = () => {
      clearTimeout(volta);
      const sai = () => { el.remove(); creditosEl = null; document.body.style.overflow = ''; };
      if (usaMotion) M.animate(el, { clipPath: ['inset(0% 0 0 0)', 'inset(0 0 100% 0)'] }, { duration: 0.4, ease: [0.7, 0, 0.2, 1] }).then(sai, sai); else sai();
    };
    el.addEventListener('click', (e) => { if (e.target.closest('.cr-fechar')) fecha(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && creditosEl) { fecha(); document.removeEventListener('keydown', esc); } });

    // carinho: o bicho reage com riscos, olho riscado e mandíbula tremendo
    let volta, ultimo = 0, ultimoXY = null;
    const SINAIS = ['©', 'HA!', 'OK', '✕', '♛', '!!', 'SN2', 'MUTANO'];
    const CORES = ['#f4c20d', '#fff', '#e8452c', '#111'];
    const marca = (x, y) => {
      const s = document.createElement('span');
      s.className = 'marca'; s.textContent = SINAIS[(Math.random() * SINAIS.length) | 0];
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.color = CORES[(Math.random() * CORES.length) | 0];
      s.style.fontSize = 22 + Math.random() * 30 + 'px';
      s.style.rotate = (Math.random() - 0.5) * 50 + 'deg';
      marcas.appendChild(s);
      const fim = () => s.remove();
      if (usaMotion) M.animate(s, { y: [0, -90 - Math.random() * 90], x: [0, (Math.random() - 0.5) * 80], opacity: [1, 1, 0], scale: [0.5, 1.15] }, { duration: 1.1, ease: 'easeOut' }).then(fim, fim);
      else setTimeout(fim, 900);
    };
    const carinho = (x, y) => {
      for (let i = 0; i < 2; i++) marca(x + (Math.random() - 0.5) * 30, y);
      n++; guarda.gravar('atlas.carinhos', n); risca();
      fala.textContent = MARCOS[n] || FRASES[(Math.random() * FRASES.length) | 0];
      pupila.style.opacity = 0; xis.style.opacity = 1;
      if (usaMotion) {
        M.animate(mand, { rotate: [0, 9] }, { duration: 0.07, repeat: 7, repeatType: 'reverse' });
        M.animate(coroa, { rotate: [-8, 8], y: [-6, 0] }, { duration: 0.12, repeat: 3, repeatType: 'reverse' });
        M.animate(braco, { rotate: [-18, 12] }, { duration: 0.1, repeat: 5, repeatType: 'reverse' });
        M.animate(corpo, { x: [-5, 5, 0], scale: [1, 1.015, 1] }, { duration: 0.28 });
      }
      clearTimeout(volta);
      volta = setTimeout(() => { pupila.style.opacity = 1; xis.style.opacity = 0; }, 1200);
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.cr-fechar')) return;
      el.setPointerCapture?.(e.pointerId); ultimo = performance.now(); ultimoXY = [e.clientX, e.clientY]; carinho(e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', (e) => {
      const apertado = e.buttons || e.pointerType === 'touch';
      if (!apertado && e.pointerType !== 'mouse') return;
      const agora = performance.now();
      const d = ultimoXY ? Math.hypot(e.clientX - ultimoXY[0], e.clientY - ultimoXY[1]) : 99;
      if (agora - ultimo > 170 && d > 14) { ultimo = agora; ultimoXY = [e.clientX, e.clientY]; carinho(e.clientX, e.clientY); }
    });
  }

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
    if (t.closest('[data-verificar]')) { verifica(true); return; }
    if (t.closest('[data-creditos]')) { abreCreditos(); return; }
    const tl = t.closest('.tile');
    if (tl && tl.querySelector('svg') && !zoom.contains(tl)) abreZoom(tl);
  });
  function abreZoom(tl) { zoomConteudo.innerHTML = tl.innerHTML; zoomConteudo.style.setProperty('--w', tl.style.getPropertyValue('--w') || 200); zoom.hidden = false;
    if (usaMotion) { M.animate(zoom, { opacity: [0, 1] }, { duration: 0.2 }); M.animate(zoomConteudo, { opacity: [0, 1], scale: [0.8, 1] }, { type: 'spring', stiffness: 340, damping: 24 }); } }
  function fechaZoom() { zoom.hidden = true; zoomConteudo.innerHTML = ''; }
  zoom.addEventListener('click', fechaZoom);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechaZoom(); });

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
