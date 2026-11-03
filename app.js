const R = window.REACTIONS, CATS = window.CATEGORIES;
const state = { cat: 'todas', q: '' };
const drawer = new SmilesDrawer.SvgDrawer({ width: 200, height: 150, padding: 8, compactDrawing: false, terminalCarbons: true });

function structure(smiles) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', 200); svg.setAttribute('height', 150);
  SmilesDrawer.parse(smiles, t => drawer.draw(t, svg, 'light'), () => {
    svg.outerHTML = '<span class="erro">SMILES inválido: ' + smiles + '</span>';
  });
  return svg;
}

function arrow(top, bottom) {
  const a = document.createElement('div'); a.className = 'arrow';
  a.innerHTML = `<span class="top">${top || ''}</span><span class="line">⟶</span><span>${bottom || ''}</span>`;
  return a;
}
function op(t) { const s = document.createElement('span'); s.className = 'op'; s.textContent = t; return s; }

function row(items, join) {
  const d = document.createElement('div'); d.className = 'scheme';
  items.forEach((s, i) => { if (i) d.append(op(join)); d.append(structure(s)); });
  return d;
}

function scheme(r) {
  const d = document.createElement('div'); d.className = 'scheme';
  r.reactants.forEach((s, i) => { if (i) d.append(op('+')); d.append(structure(s)); });
  d.append(arrow(r.reagents, r.conditions));
  r.products.forEach((s, i) => { if (i) d.append(op('+')); d.append(structure(s)); });
  return d;
}

function card(r) {
  const c = document.createElement('article'); c.className = 'card';
  const tags = r.categories.map(id => `<span class="tag">${CATS.find(x => x.id === id).nome}</span>`).join('');
  c.innerHTML = `<h2>${r.nome}</h2>${r.aula ? '<p class="fonte">'+r.aula+' · slides '+r.slides+'</p>' : ''}<div class="tags">${tags}</div>`;
  c.append(scheme(r));
  if (r.notas) { const p = document.createElement('p'); p.className = 'notes'; p.innerHTML = r.notas; c.append(p); }
  if (r.mecanismo && r.mecanismo.length) {
    const det = document.createElement('details');
    det.innerHTML = '<summary>Mecanismo</summary>';
    let drawn = false;
    det.addEventListener('toggle', () => {
      if (!det.open || drawn) return; drawn = true;
      r.mecanismo.forEach((st, i) => {
        const s = document.createElement('div'); s.className = 'step';
        s.innerHTML = `<h4>${i + 1}. ${st.titulo}</h4><p>${st.texto}</p>`;
        s.append(row(st.smiles, '⟶'));
        det.append(s);
      });
    });
    c.append(det);
  }
  return c;
}

function render() {
  const q = state.q.toLowerCase();
  const list = R.filter(r =>
    (state.cat === 'todas' || r.categories.includes(state.cat)) &&
    (!q || JSON.stringify([r.nome, r.reagents, r.notas, r.tags]).toLowerCase().includes(q)));
  const el = document.getElementById('lista'); el.textContent = '';
  list.forEach(r => el.append(card(r)));
  document.getElementById('contador').textContent = list.length + ' reaç' + (list.length === 1 ? 'ão' : 'ões');
}

const nav = document.getElementById('filtros');
[{ id: 'todas', nome: 'Todas' }, ...CATS].forEach(c => {
  const b = document.createElement('button'); b.className = 'chip' + (c.id === 'todas' ? ' on' : '');
  b.textContent = c.nome;
  b.onclick = () => { state.cat = c.id; nav.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); render(); };
  nav.append(b);
});
document.getElementById('busca').oninput = e => { state.q = e.target.value; render(); };
render();
