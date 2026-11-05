"""Recorta o avião da ilustração de referência (tools/ref/aviao-referencia.png) e grava fonte/app/aviao.png com fundo transparente.
Uso: python3 -I tools/aviao-png.py
"""
import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

RAIZ = Path(__file__).resolve().parent.parent
im = Image.open(RAIZ / 'tools/ref/aviao-referencia.png').convert('RGB')
a = np.asarray(im).astype(int)
H, W, _ = a.shape
r, g, b = a[..., 0], a[..., 1], a[..., 2]
# papel: bege claro e pouco saturado
sat = a.max(2) - a.min(2)
papel = (r > 170) & (g > 160) & (b > 140) & (sat < 48) & (r >= b)
# fundo = papel ligado à borda
rot, n = ndi.label(papel)
borda = set(np.unique(np.concatenate([rot[0], rot[-1], rot[:, 0], rot[:, -1]]))) - {0}
fundo = np.isin(rot, list(borda))
obj = ~fundo
# botões da captura de tela ("Editar" e compartilhar), que não fazem parte da ilustração
obj[490:, :150] = False
obj[490:, 770:] = False
# buracos cercados: o creme do motor e da estrela fica (cor mais amarelada); o papel visto entre as hastes e sob a asa (cinza-claro, b alto) vira transparente
for k in range(1, n + 1):
    if k in borda:
        continue
    m = rot == k
    if m.sum() >= 80 and a[m][:, 2].mean() >= 205:
        obj[m] = False
# maior componente (o avião), com uma dilatação curta para unir traços finos
dil = ndi.binary_dilation(obj, iterations=2)
rot2, n2 = ndi.label(dil)
tam = ndi.sum(dil, rot2, range(1, n2 + 1))
obj = obj & (rot2 == (1 + int(np.argmax(tam))))
alpha = (obj * 255).astype(np.uint8)
alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8)))
out = np.dstack([a.astype(np.uint8), alpha])
ys, xs = np.nonzero(alpha > 20)
y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
print('caixa', x0, y0, x1, y1)
img = Image.fromarray(out, 'RGBA').crop((x0, y0, x1 + 1, y1 + 1))
img.save(RAIZ / 'tools/ref/aviao-recorte.png')
print(img.size)

# a hélice sai da imagem (vai ser desenhada em movimento no jogo): apaga as pás à direita do cone do motor
im2 = np.asarray(img).copy()
HUB = (790, 252)  # centro do cone, em pixels do recorte
im2[100:420, 777:, 3] = 0
final = Image.fromarray(im2, 'RGBA')
LARG = 560
fator = LARG / final.width
final = final.resize((LARG, round(final.height * fator)), Image.LANCZOS)
final.save(RAIZ / 'fonte/app/aviao.png', optimize=True)
print('final', final.size, 'hub', (round(HUB[0] * fator), round(HUB[1] * fator)))

# variante com a cabine vazia (para a cena em que o Mutaninho pula para dentro): apaga o piloto e escurece o buraco da cabine
base = np.asarray(img).copy()
R, G, B, A = [base[..., i].astype(int) for i in range(4)]
verm = (R > 150) & (G < 90) & (B < 90) & (A > 200)
vazio = base.copy()
for x in range(308, 512):
    col = np.nonzero(verm[140:, x])[0]
    if not len(col):
        continue
    top = 140 + int(col.min())
    vazio[:max(0, top - 5), x, 3] = 0
    if 332 <= x <= 505:
        y0 = max(0, top - 24)
        vazio[y0:top - 5, x, :] = (42, 31, 28, 255)
v = np.asarray(Image.fromarray(vazio, 'RGBA'))
v = v.copy(); v[100:420, 777:, 3] = 0
vf = Image.fromarray(v, 'RGBA').resize((LARG, round(final.height)), Image.LANCZOS)
vf.save(RAIZ / 'fonte/app/aviao-vazio.png', optimize=True)
