#!/usr/bin/env python3
"""CPU menu illustrations of the current stylized photosphere, not browser captures.
Run with Pillow: python scripts/star-thumbs.py. Immutable WebP outputs are printed.
The colour transform mirrors Three.js AgX (MIT); these are original illustrations, not photographic evidence.
"""
import hashlib
import math
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZE = 320
def fract(value):
    return value - math.floor(value)


def hash3(x, y, z):
    px = fract(x * 0.3183099 + 0.1) * 17.0
    py = fract(y * 0.3183099 + 0.2) * 17.0
    pz = fract(z * 0.3183099 + 0.3) * 17.0
    return fract(px * py * pz * (px + py + pz))


def smoothstep(edge0, edge1, x):
    t = min(max((x - edge0) / (edge1 - edge0), 0.0), 1.0)
    return t * t * (3.0 - 2.0 * t)


def mix(a, b, t):
    return a + (b - a) * t


def mix3(a, b, t):
    return tuple(mix(a[i], b[i], t) for i in range(3))


def noise(x, y, z):
    ix, iy, iz = math.floor(x), math.floor(y), math.floor(z)
    fx, fy, fz = x - ix, y - iy, z - iz
    fx = fx * fx * (3.0 - 2.0 * fx)
    fy = fy * fy * (3.0 - 2.0 * fy)
    fz = fz * fz * (3.0 - 2.0 * fz)

    def corner(dx, dy, dz):
        return hash3(ix + dx, iy + dy, iz + dz)

    return mix(
        mix(mix(corner(0, 0, 0), corner(1, 0, 0), fx), mix(corner(0, 1, 0), corner(1, 1, 0), fx), fy),
        mix(mix(corner(0, 0, 1), corner(1, 0, 1), fx), mix(corner(0, 1, 1), corner(1, 1, 1), fx), fy),
        fz,
    )



def matrix(columns, vector):
    return tuple(sum(columns[j][i] * vector[j] for j in range(3)) for i in range(3))


def agx(color):
    color = matrix(((.6274,.0691,.0164),(.3293,.9195,.088),(.0433,.0113,.8956)), color)
    color = matrix(((.856627153315983,.137318972929847,.11189821299995),
                    (.0951212405381588,.761241990602591,.0767994186031903),
                    (.0482516061458583,.101439036467562,.811302368396859)), color)
    x = [min(1, max(0, (math.log2(max(c, 1e-10))+12.47393)/16.499999)) for c in color]
    color = [15.5*c**6-40.14*c**5+31.96*c**4-6.868*c**3+.4298*c*c+.1191*c-.00232 for c in x]
    color = matrix(((1.1271005818144368,-.1413297634984383,-.14132976349843826),
                    (-.11060664309660323,1.157823702216272,-.11060664309660294),
                    (-.016493938717834573,-.016493938717834257,1.2519364065950405)), color)
    color = matrix(((1.6605,-.1246,-.0182),(-.5876,1.1329,-.1006),(-.0728,-.0083,1.1187)),
                   [max(0,c)**2.2 for c in color])
    return [12.92*c if c <= .0031308 else 1.055*c**(1/2.4)-.055 for c in [min(1,max(0,v)) for v in color]]


source = (ROOT/'src/perigee/materials/StellarMaterial.ts').read_text()
for name, raw, limb, contrast, scale in re.findall(
        r"(betelgeuse|sirius|rigel): \{ color: \[(.*?)\], limb: ([\d.]+), contrast: ([\d.]+), scale: ([\d.]+)", source):
    color = [float(v) for v in raw.split(',')]
    luma = sum(a*b for a,b in zip(color, (.2126,.7152,.0722)))
    limb, contrast, scale = float(limb), float(contrast), float(scale)
    palette = re.search(name+r": \{ cool: \[(.*?)\], hot: \[(.*?)\]", source)
    def normalized(raw):
        rgb = [float(v) for v in raw.split(',')]
        luminance = sum(a*b for a,b in zip(rgb, (.2126,.7152,.0722)))
        return [v/luminance for v in rgb]
    cool, hot = normalized(palette[1]), normalized(palette[2])
    image = Image.new('RGB', (SIZE,SIZE))
    for y in range(SIZE):
        for x in range(SIZE):
            p = [(x+.5-SIZE/2)/(SIZE*.34), (SIZE/2-y-.5)/(SIZE*.34)]
            radius = math.hypot(*p)
            rgb = [10,16,23]
            if radius < 1:
                p.append(math.sqrt(1-radius*radius))
                warp = [noise(*(v*1.7 for v in p))-.5,
                        noise(*(v*1.9+7.3 for v in p))-.5,
                        noise(*(v*1.5+13.1 for v in p))-.5]
                q = [v*scale+w*1.15 for v,w in zip(p,warp)]
                structure = (smoothstep(.2,.8,noise(*q))-.5)*2
                fine = (noise(*(v*2.7 for v in q))-.5)*2
                structure = max(-1,min(1,structure*.72+fine*.55))
                surface_color = mix3(cool,hot,smoothstep(-.25,.8,structure))
                radiance = 1.8*(1-limb*(1-p[2]))/(1-limb/3)*(1+contrast*structure)
                rgb = [round(c*255) for c in agx([v*radiance for v in surface_color])]
            image.putpixel((x,y), tuple(rgb))
    image = image.resize((160,160), Image.Resampling.LANCZOS)
    import io
    output = io.BytesIO()
    image.save(output, format='WEBP', quality=94)
    data = output.getvalue()
    path = ROOT/f'public/assets/objects/thumbs/{name}-{hashlib.sha256(data).hexdigest()[:12]}.webp'
    path.write_bytes(data)
    print(path.relative_to(ROOT/'public'))
