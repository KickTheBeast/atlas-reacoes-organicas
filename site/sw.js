// Service worker do Atlas. Mesma ideia do PILATESRUN MOVE:
//
// 1. A navegação (index.html) vai sempre à rede primeiro: é isso que faz abrir
//    o app trazer a versão publicada. Sem rede, cai no cache e o atlas continua
//    funcionando offline (instalado na tela inicial, não precisa do site).
// 2. Arquivos com `?v=<build>` no nome nunca mudam: ficam em cache e saem de lá.
// 3. `versao.json` nunca é guardado: é por ele que o app descobre que saiu
//    versão nova e mostra o botão Atualizar.
//
// `50476d4030` vira a marca do build em tools/build.mjs, então este arquivo muda
// a cada publicação, o navegador instala o worker novo e o `activate` apaga o
// cache do anterior. O worker novo assume sem esperar; quem recarrega a tela é o
// botão Atualizar, nunca o worker.
const BUILD = '50476d4030';
const CACHE = 'atlas-' + BUILD;
const V = '?v=' + BUILD;
const PRE = ['./', 'app.js' + V, 'style.css' + V, 'dados.json' + V, 'svgs.json' + V,
  'manifest.webmanifest', 'icone.svg', 'icone-192.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(
    PRE.map((u) => fetch(new Request(u, { cache: 'reload' })).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => {})),
  )));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/versao.json')) return; // sempre da rede

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put('./', copia)).catch(() => {});
        return r;
      }).catch(() => caches.match('./').then((r) => r || Response.error())),
    );
    return;
  }

  if (url.search.startsWith('?v=')) {
    e.respondWith(caches.match(req).then((c) => c || fetch(req).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((x) => x.put(req, copia)).catch(() => {}); }
      return r;
    })));
    return;
  }

  e.respondWith(
    fetch(req).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((x) => x.put(req, copia)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(req).then((r) => r || Response.error())),
  );
});
