"""Vetoriza o dinossauro vermelho (fonte/app/dino.png) para fonte/app/dino-vetor.json.

- A silhueta vermelha vira contornos (um por parte móvel: rabo, cabeça, braço, corpo).
- As linhas pretas viram traços (esqueleto da máscara), agrupados por região, com a espessura medida.

Uso:  python3 -I tools/vetorizar.py
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage import measure, morphology

RAIZ = Path(__file__).resolve().parent.parent
entrada = RAIZ / 'fonte/app/dino.png'
saida = RAIZ / 'fonte/app/dino-vetor.json'

im = np.asarray(Image.open(entrada).convert('RGB')).astype(int)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]

# ---------- máscaras ----------
vermelho = (r > 150) & (g < 125) & (b < 125)
# Tinta preta/cinza sobre branco OU sobre vermelho tem o canal R baixo; o vermelho puro tem R alto.
linhas = r < 165
linhas = morphology.remove_small_objects(linhas, 14)

silhueta = morphology.closing(vermelho, morphology.disk(5))
silhueta = ndi.binary_fill_holes(silhueta)
silhueta = morphology.remove_small_objects(silhueta, 400)
silhueta = morphology.opening(silhueta, morphology.disk(1))
cor = vermelho.nonzero()
rgb = [int(im[..., c][cor].mean()) for c in range(3)]
cor_hex = '#%02x%02x%02x' % tuple(rgb)

# ---------- partes móveis (polígonos em px da imagem) ----------
POLIGONOS = {
    'cauda': [(0, 60), (232, 60), (215, 200), (186, 252), (150, 302), (160, 350), (172, 432), (0, 432)],
    'cabeca': [(395, 55), (600, 55), (600, 162), (472, 164), (440, 150), (395, 120)],
    'braco': [(452, 205), (600, 205), (600, 322), (452, 322)],
}


def poligono(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.asarray(m) > 0


mascaras_poly = {k: poligono(p) for k, p in POLIGONOS.items()}
uniao = np.zeros((H, W), bool)
for m in mascaras_poly.values():
    uniao |= m
SOBREPOSICAO = 7
partes = {}
for k, m in mascaras_poly.items():
    partes[k] = silhueta & morphology.dilation(m, morphology.disk(SOBREPOSICAO))
corpo = silhueta & ~uniao
partes['corpo'] = silhueta & morphology.dilation(corpo, morphology.disk(SOBREPOSICAO))


def suaviza(pts, voltas=1):
    pts = np.asarray(pts, float)
    for _ in range(voltas):
        n = len(pts)
        novo = []
        for i in range(n):
            p, q = pts[i], pts[(i + 1) % n]
            novo.append(0.75 * p + 0.25 * q)
            novo.append(0.25 * p + 0.75 * q)
        pts = np.asarray(novo)
    return pts


def caminho(contorno, tol=0.9):
    c = measure.approximate_polygon(contorno, tol)
    c = suaviza(c[:-1], 1)
    return 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for y, x in c) + 'Z'


vermelhos = {}
for nome, m in partes.items():
    pad = np.pad(m, 2)
    cs = measure.find_contours(pad.astype(float), 0.5)
    cs = [c - 2 for c in cs if len(c) > 30 and measure.approximate_polygon(c, 1).shape[0] > 6]
    cs.sort(key=len, reverse=True)
    vermelhos[nome] = ''.join(caminho(c) for c in cs[:6])

# ---------- traços pretos: esqueleto -> polilinhas ----------
esq = morphology.skeletonize(linhas)
dist = ndi.distance_transform_edt(linhas)
pix = set(zip(*np.nonzero(esq)))


def viz(p):
    return [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (p[0] + dy, p[1] + dx) in pix]


grau = {p: len(viz(p)) for p in pix}
# cruzamentos: agrupa pixels de grau >= 3 vizinhos num único nó
junc = np.zeros((H, W), bool)
for p, d in grau.items():
    if d >= 3:
        junc[p] = True
junc = morphology.dilation(junc, morphology.disk(1)) & esq
rot, nrot = ndi.label(junc, structure=np.ones((3, 3)))
no_de = {}
centros = {}
for k in range(1, nrot + 1):
    ys, xs = np.nonzero(rot == k)
    centros[('j', k)] = (float(ys.mean()), float(xs.mean()))
    for y, x in zip(ys, xs):
        no_de[(y, x)] = ('j', k)
for p, d in grau.items():
    if d <= 1 and p not in no_de:
        no_de[p] = ('e', p)
        centros[('e', p)] = (float(p[0]), float(p[1]))

visitado = set()
tracos = []


def anda(ini, prox):
    cam = [centros[no_de[ini]] if ini in no_de else ini, prox]
    anterior, atual = ini, prox
    while atual not in no_de:
        vs = [v for v in viz(atual) if v != anterior and (atual, v) not in visitado]
        if not vs:
            break
        prox2 = min(vs, key=lambda v: abs((v[0] - atual[0]) - (atual[0] - anterior[0])) + abs((v[1] - atual[1]) - (atual[1] - anterior[1])))
        visitado.add((atual, prox2)); visitado.add((prox2, atual))
        cam.append(prox2)
        anterior, atual = atual, prox2
    if atual in no_de:
        cam[-1] = centros[no_de[atual]]
    return cam, no_de.get(atual)


for p in sorted(no_de):
    for v in viz(p):
        if v in no_de and no_de[v] == no_de[p]:
            continue
        if (p, v) in visitado:
            continue
        visitado.add((p, v)); visitado.add((v, p))
        cam, fim = anda(p, v)
        tracos.append((cam, no_de[p], fim))

# ciclos isolados (sem nós): percorre o que sobrou
sobra = {p for p in pix if not any((p, v) in visitado for v in viz(p)) and p not in no_de}
while sobra:
    p = sobra.pop()
    vs = viz(p)
    if not vs:
        continue
    cam = [p]; ant, atual = p, vs[0]
    while atual != p and atual in sobra:
        cam.append(atual); sobra.discard(atual)
        nx = [v for v in viz(atual) if v != ant]
        if not nx:
            break
        ant, atual = atual, nx[0]
    if len(cam) > 12:
        tracos.append((cam + [p], None, None))

# remove espinhos curtos que terminam em ponta
tracos = [(c, a, b) for c, a, b in tracos if len(c) >= 9 or (a is not None and b is not None and a[0] == 'j' and b[0] == 'j' and len(c) >= 6)]

saida_tracos = []
for cam, _a, _b in tracos:
    pts = np.array(cam, float)
    simp = measure.approximate_polygon(pts, 1.4)
    if len(simp) < 2:
        continue
    larg = float(np.mean([dist[min(H - 1, int(y)), min(W - 1, int(x))] for y, x in cam])) * 2
    cx, cy = pts[:, 1].mean(), pts[:, 0].mean()
    # grupo pela posição
    if cx < 215 and cy < 432:
        grupo = 'cauda'
    elif cx > 395 and cy < 168:
        grupo = 'cabeca'
    elif cx > 452 and 205 < cy < 325:
        grupo = 'braco'
    elif cy < 150 and 255 < cx < 480:
        grupo = 'espinhos'
    elif cy > 490 and cx < 340:
        grupo = 'garrasE'
    elif cx > 480 and cy > 425:
        grupo = 'garrasD'
    elif 250 < cx < 440 and 190 < cy < 290:
        grupo = 'bracoE'
    else:
        grupo = 'corpo'
    d = 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for y, x in simp)
    saida_tracos.append({'g': grupo, 'd': d, 'w': round(max(3.4, min(larg * 1.45, 10)), 1), 'x': round(float(cx), 1)})

saida_tracos.sort(key=lambda t: t['x'])
json.dump({'w': W, 'h': H, 'cor': cor_hex, 'vermelho': vermelhos, 'tracos': saida_tracos}, saida.open('w'), ensure_ascii=False, separators=(',', ':'))
print('cor', cor_hex, '| partes', {k: len(v) for k, v in vermelhos.items()}, '| traços', len(saida_tracos),
      {g: sum(1 for t in saida_tracos if t['g'] == g) for g in sorted({t['g'] for t in saida_tracos})}, '|', round(saida.stat().st_size / 1024, 1), 'KB')
