// Setas de elétrons (curly arrows) sobre estruturas desenhadas pelo RDKit.
//
// O RDKit não informa onde cada átomo caiu no SVG. Aqui a posição é recuperada assim:
//   - as coordenadas dos átomos vêm do molblock (mesmas usadas no desenho);
//   - a escala do SVG é constante (px por unidade) e a translação é medida nos átomos SEM rótulo
//     (carbonos), cujas ligações terminam exatamente no centro do átomo.
// Cada seta é definida por índices de átomos (ordem do SMILES, com [H] explícitos contando).
const AZUL = '#1f63d6';
const ESCALA_PADRAO = 19.33;

const num = (s) => (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
const unit = (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; };

/** Lê coordenadas (x, y), símbolos e ligações do molblock. */
export function lerMolblock(molblock) {
  const l = molblock.split('\n');
  const na = parseInt(l[3].slice(0, 3)), nb = parseInt(l[3].slice(3, 6));
  const atomos = l.slice(4, 4 + na).map((t) => { const p = t.trim().split(/\s+/); return { x: +p[0], y: +p[1], el: p[3] }; });
  const ligacoes = l.slice(4 + na, 4 + na + nb).map((t) => [parseInt(t.slice(0, 3)) - 1, parseInt(t.slice(3, 6)) - 1]);
  return { atomos, ligacoes };
}

/** Descobre a posição de cada átomo no SVG bruto do RDKit. */
export function posicoesAtomos(svg, { atomos, ligacoes }) {
  const rotulados = new Set();
  const grupos = new Map(); // ligação -> segmentos
  for (const m of svg.matchAll(/<path\b([^>]*)>/g)) {
    const cls = (/class='([^']*)'/.exec(m[1]) || [])[1];
    const d = (/\sd='([^']*)'/.exec(m[1]) || [])[1];
    if (!cls || !d) continue;
    const toks = cls.split(/\s+/);
    if (toks[0].startsWith('bond-')) {
      const n = num(d);
      if (n.length >= 4) {
        const k = toks[0];
        if (!grupos.has(k)) grupos.set(k, { a: +toks[1].slice(5), b: +toks[2].slice(5), segs: [] });
        grupos.get(k).segs.push([n[0], n[1], n[2], n[3]]);
      }
    } else if (/^atom-\d+$/.test(toks[0])) rotulados.add(+toks[0].slice(5));
  }
  // Âncoras exatas: pontas de ligações em átomos sem rótulo
  const ancoras = new Map(); // átomo -> [[x,y]]
  const poe = (i, p) => { if (!ancoras.has(i)) ancoras.set(i, []); ancoras.get(i).push(p); };
  for (const g of grupos.values()) {
    // encadeia segmentos contínuos (ligação bicolor vem em 2 pedaços; dupla vem em 2 linhas)
    const usados = new Set();
    for (let i = 0; i < g.segs.length; i++) {
      if (usados.has(i)) continue;
      usados.add(i);
      let ini = [g.segs[i][0], g.segs[i][1]], fim = [g.segs[i][2], g.segs[i][3]];
      let achou = true;
      while (achou) {
        achou = false;
        for (let j = 0; j < g.segs.length; j++) {
          if (usados.has(j)) continue;
          const s = g.segs[j];
          if (Math.hypot(s[0] - fim[0], s[1] - fim[1]) < 0.4) { fim = [s[2], s[3]]; usados.add(j); achou = true; }
        }
      }
      if (!rotulados.has(g.a)) poe(g.a, ini);
      if (!rotulados.has(g.b)) poe(g.b, fim);
    }
  }
  // escala: ligação entre dois átomos sem rótulo
  let escala = ESCALA_PADRAO;
  for (const [a, b] of ligacoes) {
    if (ancoras.has(a) && ancoras.has(b)) {
      const pa = ancoras.get(a)[0], pb = ancoras.get(b)[0];
      const du = Math.hypot(atomos[a].x - atomos[b].x, atomos[a].y - atomos[b].y);
      const dp = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
      if (du > 0.5 && dp > 5) { escala = dp / du; break; }
    }
  }
  // translação: mediana dos resíduos
  const resX = [], resY = [];
  for (const [i, ps] of ancoras) {
    const mx = ps.reduce((s, p) => s + p[0], 0) / ps.length, my = ps.reduce((s, p) => s + p[1], 0) / ps.length;
    resX.push(mx - escala * atomos[i].x); resY.push(my + escala * atomos[i].y);
  }
  const med = (v) => { const s = [...v].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : null; };
  let tx = med(resX), ty = med(resY);
  if (tx === null) { // sem âncoras: usa o centro dos rótulos
    const bb = new Map();
    for (const m of svg.matchAll(/<path\b([^>]*)>/g)) {
      const cls = (/class='([^']*)'/.exec(m[1]) || [])[1];
      const d = (/\sd='([^']*)'/.exec(m[1]) || [])[1];
      if (!cls || !/^atom-\d+$/.test(cls.split(/\s+/)[0]) || !d) continue;
      const i = +cls.split(/\s+/)[0].slice(5), n = num(d);
      const b = bb.get(i) || [1e9, 1e9, -1e9, -1e9];
      for (let k = 0; k + 1 < n.length; k += 2) { b[0] = Math.min(b[0], n[k]); b[1] = Math.min(b[1], n[k + 1]); b[2] = Math.max(b[2], n[k]); b[3] = Math.max(b[3], n[k + 1]); }
      bb.set(i, b);
    }
    const rx = [], ry = [];
    for (const [i, b] of bb) { rx.push((b[0] + b[2]) / 2 - escala * atomos[i].x); ry.push((b[1] + b[3]) / 2 + escala * atomos[i].y); }
    tx = med(rx) ?? 0; ty = med(ry) ?? 0;
  }
  const pos = atomos.map((a) => [escala * a.x + tx, -escala * a.y + ty]);
  return { pos, rotulados, escala };
}

/** Gera o SVG (curvas + pontas) das setas e os limites que elas ocupam. */
export function marcarSetas(pos, rotulados, ligacoes, setas) {
  const viz = pos.map(() => []);
  for (const [a, b] of ligacoes) { viz[a].push(b); viz[b].push(a); }
  const raio = (i) => (rotulados.has(i) ? 9.5 : 2.5);
  const ext = [1e9, 1e9, -1e9, -1e9];
  const toca = (p) => { ext[0] = Math.min(ext[0], p[0]); ext[1] = Math.min(ext[1], p[1]); ext[2] = Math.max(ext[2], p[0]); ext[3] = Math.max(ext[3], p[1]); };
  let svg = '';
  const avisos = [];
  setas.forEach((s, idx) => {
    const lado = s.lado || 1;
    // alvo (centro aproximado) para orientar a origem
    let alvo;
    if (s.para.atom != null) alvo = pos[s.para.atom];
    else { const [a, b] = s.para.lig; alvo = [(pos[a][0] + pos[b][0]) / 2, (pos[a][1] + pos[b][1]) / 2]; }
    let S;
    if (s.de.par != null) {
      const i = s.de.par, p = pos[i];
      let d;
      if (viz[i].length) {
        let sx = 0, sy = 0;
        for (const n of viz[i]) { const u = unit(pos[n][0] - p[0], pos[n][1] - p[1]); sx += u[0]; sy += u[1]; }
        d = Math.hypot(sx, sy) < 0.3 ? unit(alvo[0] - p[0], alvo[1] - p[1]) : unit(-sx, -sy);
      } else d = unit(alvo[0] - p[0], alvo[1] - p[1]);
      if (s.de.dir) d = unit(...s.de.dir);
      S = [p[0] + d[0] * (raio(i) + 2.5), p[1] + d[1] * (raio(i) + 2.5)];
    } else {
      const [a, b] = s.de.lig;
      const m = [(pos[a][0] + pos[b][0]) / 2, (pos[a][1] + pos[b][1]) / 2];
      const ax = unit(pos[b][0] - pos[a][0], pos[b][1] - pos[a][1]);
      S = [m[0] + -ax[1] * lado * 3, m[1] + ax[0] * lado * 3];
    }
    let E;
    if (s.para.atom != null) {
      const j = s.para.atom, p = pos[j];
      if (s.de.lig && rotulados.has(j)) { // grupo abandonador: chega por cima do rótulo
        const ax = unit(p[0] - S[0], p[1] - S[1]);
        E = [p[0] + -ax[1] * lado * (raio(j) + 1) - ax[0] * 2, p[1] + ax[0] * lado * (raio(j) + 1) - ax[1] * 2];
      } else {
        const d = unit(p[0] - S[0], p[1] - S[1]);
        E = [p[0] - d[0] * (raio(j) + 3.5), p[1] - d[1] * (raio(j) + 3.5)];
      }
    } else {
      E = [alvo[0], alvo[1]];
      const [a, b] = s.para.lig;
      const ax = unit(pos[b][0] - pos[a][0], pos[b][1] - pos[a][1]);
      E = [E[0] + -ax[1] * lado * 1.5, E[1] + ax[0] * lado * 1.5];
    }
    const dx = E[0] - S[0], dy = E[1] - S[1], len = Math.hypot(dx, dy);
    if (len < 8) avisos.push(`seta ${idx}: curta demais (${len.toFixed(1)} px)`);
    const perp = unit(-dy, dx);
    const k = lado * Math.max(8, 0.36 * len) * (s.curva || 1);
    const C = [(S[0] + E[0]) / 2 + perp[0] * k, (S[1] + E[1]) / 2 + perp[1] * k];
    const t = unit(E[0] - C[0], E[1] - C[1]); // tangente no fim
    const nrm = [-t[1], t[0]];
    const B = [E[0] - t[0] * 4.6, E[1] - t[1] * 4.6];            // onde a curva termina (base da ponta)
    const P1 = [E[0] - t[0] * 5.4 + nrm[0] * 2.5, E[1] - t[1] * 5.4 + nrm[1] * 2.5];
    const P2 = [E[0] - t[0] * 5.4 - nrm[0] * 2.5, E[1] - t[1] * 5.4 - nrm[1] * 2.5];
    const N = [E[0] - t[0] * 3.6, E[1] - t[1] * 3.6];            // reentrância na traseira: ponta mais elegante
    const f = (v) => v.map((x) => x.toFixed(1)).join(' ');
    const d = `M${f(S)} Q${f(C)} ${f(B)}`;
    const T = 6.5;                                                // duração do ciclo (igual ao CSS)
    svg += `<path class="seta-c" pathLength="1" style="--i:${idx}" d="${d}" fill="none" stroke="${AZUL}" stroke-width="1.9" stroke-linecap="round"/>` +
           `<path class="seta-h" style="--i:${idx}" d="M${f(E)} L${f(P1)} L${f(N)} L${f(P2)} Z" fill="${AZUL}" stroke="${AZUL}" stroke-width=".5" stroke-linejoin="round"/>` +
           `<circle class="seta-r" style="--i:${idx}" cx="${E[0].toFixed(1)}" cy="${E[1].toFixed(1)}" r="4" fill="none" stroke="${AZUL}" stroke-width="1.1"/>` +
           `<circle class="seta-e" r="2.3" fill="${AZUL}" opacity="0">` +
           `<animateMotion dur="${T}s" begin="${idx}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.02;.17;1" keyPoints="0;0;1;1" keySplines="0 0 1 1;.65 0 .35 1;0 0 1 1" path="${d}"/>` +
           `<animate attributeName="opacity" dur="${T}s" begin="${idx}s" repeatCount="indefinite" values="0;0;.95;.95;0;0" keyTimes="0;.02;.04;.17;.2;1"/></circle>`;
    [S, E, C].forEach(toca);
  });
  return { svg, ext, avisos };
}
