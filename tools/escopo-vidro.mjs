// Prefixa todas as regras do tema.css com :root[data-visual="vidro"], para o tema Vidro só valer quando escolhido.
import postcss from 'postcss';
export function escopaVidro(css) {
  const raiz = postcss.parse(css);
  const P = ':root[data-visual="vidro"]';
  raiz.walkRules((r) => {
    if (r.parent && r.parent.type === 'atrule' && /keyframes$/i.test(r.parent.name)) return;
    r.selectors = r.selectors.map((s) => {
      s = s.trim();
      if (s.startsWith(':root')) return s.replace(':root', P);
      return s.startsWith('::') ? P + s : `${P} ${s}`;
    });
  });
  return raiz.toString();
}
