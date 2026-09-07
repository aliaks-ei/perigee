#!/usr/bin/env python3
"""Prepare scientific map derivatives. Masters stay in the supplied external cache.

Requires numpy, scipy and Pillow. See docs/planet-assets.md for source URLs,
calibration limits, reconstruction and the exact acquisition recipe.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates, gaussian_filter, binary_dilation

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(sys.argv[1])
TILE, BORDER = 512, 8


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


sources = {p.name: {'sha256': sha(p), 'bytes': p.stat().st_size}
           for p in sorted(CACHE.iterdir()) if p.suffix in ('.tif', '.jpg', '.img', '.tab', '.txt')}
version = hashlib.sha256((sha(Path(__file__)) + json.dumps(sources, sort_keys=True)).encode()).hexdigest()[:12]
OUT = ROOT/'public/assets/objects/planets'/version
OUT.mkdir(parents=True, exist_ok=True)
manifest = {'version': version, 'baseUrl': f'/assets/objects/planets/{version}',
            'tileSize': TILE, 'border': BORDER, 'bodies': {}}


def save(image, name, lossless=False):
    path = OUT/name
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix == '.png':
        image.save(path, optimize=True)
    else:
        image.save(path, quality=94, method=4, lossless=lossless)


def pyramid(body, image, maximum):
    base = min(2048, maximum)
    save(image.resize((base, base//2), Image.Resampling.LANCZOS), f'{body}/base.webp')
    levels = [w for w in (4096, 8192, 16384) if w <= maximum]
    for width in levels:
        level = np.asarray(image.resize((width, width//2), Image.Resampling.LANCZOS))
        for y in range(width//2//TILE):
            yy = np.clip(np.arange(y*TILE-BORDER, (y+1)*TILE+BORDER), 0, width//2-1)
            for x in range(width//TILE):
                xx = np.arange(x*TILE-BORDER, (x+1)*TILE+BORDER) % width
                save(Image.fromarray(level[yy[:, None], xx]), f'{body}/{width}/{x}-{y}.webp')
        print(body, width, flush=True)
    manifest['bodies'][body] = {'baseWidth': base, 'maximumWidth': maximum, 'levels': levels}
    image.resize((320, 160), Image.Resampling.LANCZOS).save(CACHE/f'{body}-processed.png')


def opal(body, polar_ratio, target=None):
    image = np.asarray(Image.open(CACHE/f'{body}.tif').convert('RGB'), dtype=np.float32)/255
    # Odd-sized OPAL grids include a duplicated endpoint in both axes.
    if image.shape[1] % 2: image = image[:-1, :-1]
    height, width = image.shape[:2]
    sources[f'{body}.tif']['dimensions'] = [width, height]
    # OPAL is north-up, 0..360 E, planetographic. The engine uses planetocentric
    # latitude and a central prime meridian. Mask black coverage and colour fringes.
    valid = image.min(axis=2) > .035
    invalid = binary_dilation(~valid, iterations=5)
    # Unreliable polar projection is replaced by the nearest complete latitude.
    invalid[:int(height*.045)] = True
    invalid[-int(height*.045):] = True
    if body == 'saturn':
        # Ring occultation + its colour fringes (the measured 2024 equatorial gap).
        invalid[int(height*.49):int(height*.56)] = True
    filled = image.copy()
    yy = np.arange(height)
    for x in range(width):
        good = ~invalid[:, x]
        for c in range(3):
            filled[:, x, c] = np.interp(yy, yy[good], image[good, x, c])
    # Extend only fully covered latitude rows into the missing polar caps.
    # Per-column nearest fills would turn ragged coverage boundaries into stripes.
    reliable_rows = np.flatnonzero((~invalid).mean(axis=1) > .995)
    lo, hi = int(reliable_rows[0])+3, int(reliable_rows[-1])-3
    filled[:lo] = filled[lo].mean(axis=0)
    filled[hi+1:] = filled[hi].mean(axis=0)
    count = max(8, int(height*.025))
    for start, top in ((lo, True), (hi-count+1, False)):
        ids = np.arange(start, start+count)
        amount = np.linspace(1, 0, count) if top else np.linspace(0, 1, count)
        means = filled[ids].mean(axis=1, keepdims=True)
        filled[ids] = filled[ids]*(1-amount[:, None, None]) + means*amount[:, None, None]
    sources[f'{body}.tif']['completeLatitudeRows'] = [lo, hi]
    # Display composites are narrow-band and contrast enhanced, not calibrated
    # RGB albedo. Remove the composite's channel imbalance with a global gain;
    # preserve observed structures. Neptune's target is an approximate reference
    # colour, explicitly not a spectrophotometric calibration.
    if target is None:
        # Bright cloud zones provide a near-neutral white reference. Matching
        # whole-image channel means would turn Jupiter's white zones cyan.
        central = filled[int(height*.15):int(height*.85)]
        bright = central.mean(axis=2) >= np.percentile(central.mean(axis=2), 80)
        reference = central[bright].mean(axis=0)
        target = [.86, .82, .72] if body == 'saturn' else [.88, .87, .83]
        filled *= np.array(target)/reference
    else:
        mean = filled[int(height*.15):int(height*.85)].mean(axis=(0, 1))
        filled *= np.array(target)/mean
        filled = np.array(target) + (filled-np.array(target))*.25
    lat = (.5-(np.arange(height)+.5)/height)*np.pi
    graphic = np.arctan(np.tan(lat)/(polar_ratio**2))
    source_y = (.5-graphic/np.pi)*height-.5
    coords = np.meshgrid(source_y, np.arange(width), indexing='ij')
    corrected = np.stack([map_coordinates(filled[:, :, c], coords, order=1, mode='nearest') for c in range(3)], axis=2)
    corrected = np.roll(corrected, width//2, axis=1)
    sources[f'{body}.tif']['reconstructedFraction'] = float(invalid.mean())
    sources[f'{body}.tif']['displayReferenceTarget'] = target
    return Image.fromarray(np.uint8(np.clip(corrected, 0, 1)*255+.5))


def terrain(body, heights, radius, minimum, maximum):
    # Height data retains 16-bit precision split over R/G. Decoding is linear,
    # including hardware bilinear/mipmap interpolation. No sRGB or lossy codec.
    h = np.asarray(Image.fromarray(heights).resize((4096, 2048), Image.Resampling.BILINEAR))
    # One elevation at a pole; wrap seam comes from the same periodic DEM.
    h = h.copy()
    h[0] = h[0].mean()
    h[-1] = h[-1].mean()
    encoded = np.uint16(np.clip((h-minimum)/(maximum-minimum), 0, 1)*65535+.5)
    rgb = np.stack([encoded >> 8, encoded & 255, np.zeros_like(encoded)], axis=2).astype('uint8')
    save(Image.fromarray(rgb), f'{body}/terrain-height.png')
    latitude = (.5-(np.arange(2048)+.5)/2048)*np.pi
    east_step = radius*np.maximum(np.cos(latitude), np.sin(np.pi/2048))*(2*np.pi/4096)
    east = (np.roll(h, -1, axis=1)-np.roll(h, 1, axis=1))/(2*east_step[:, None])
    padded = np.pad(h, ((1, 1), (0, 0)), mode='edge')
    north = (padded[:-2]-padded[2:])/(2*radius*np.pi/2048)
    # SphereGeometry +u follows increasing source longitude; +v points north.
    # Its shader tangent is north-axis cross normal. Both map conventions
    # and tangent tests are recorded in planet-projection.test.ts.
    normals = np.stack([-east, -north, np.ones_like(h)], axis=2)
    normals /= np.linalg.norm(normals, axis=2, keepdims=True)
    normals[[0, -1], :, :] = [0, 0, 1]
    save(Image.fromarray(np.uint8(np.clip(normals*.5+.5, 0, 1)*255+.5)), f'{body}/terrain-normal.webp', True)
    manifest['bodies'][body]['terrain'] = {'minimumMetres': minimum, 'maximumMetres': maximum,
                                         'radiusMetres': radius, 'width': 4096, 'height': 2048}


moon = Image.open(CACHE/'moon-color.tif').convert('RGB')
sources['moon-color.tif']['dimensions'] = list(moon.size)
pyramid('moon', moon, 16384)
del moon
heights = np.asarray(Image.open(CACHE/'moon-height.tif'), dtype=np.float32)*.5-10000
terrain('moon', heights, 1737400, -12000, 12000)
del heights
mars = Image.open(CACHE/'mars-color.jpg').convert('RGB')
sources['mars-color.jpg']['dimensions'] = list(mars.size)
pyramid('mars', mars, 16384)
del mars
heights = np.fromfile(CACHE/'mars-height.img', dtype='>i2').reshape(2880, 5760).astype(np.float32)
terrain('mars', np.roll(heights, 2880, axis=1), 3396190, -12000, 24000)
del heights
for body, ratio in [('jupiter', 66854/71492), ('saturn', 54364/60268), ('neptune', 24341/24764)]:
    image = opal(body, ratio, [.60, .77, .80] if body == 'neptune' else None)
    # Native OPAL mosaics are intentionally retained; no nominal-resolution upscale.
    save(image, f'{body}/base.webp', True)
    manifest['bodies'][body] = {'baseWidth': image.width, 'maximumWidth': image.width, 'levels': []}
    image.resize((720, 360)).save(CACHE/f'{body}-processed.png')

ring = np.loadtxt(CACHE/'rings.tab', delimiter=',')
valid = (ring[:, 1] != 0) & (ring[:, 2] < 99)
tau = np.clip(ring[:, 3], 0, 8)
radius = (1.24+(np.arange(8192)+.5)/8192*(2.32-1.24))*60268
samples = np.interp(radius, ring[valid, 0], tau[valid], left=0, right=0)
encoded = np.uint16(samples/8*65535+.5)
rgb = np.stack([encoded >> 8, encoded & 255, np.zeros_like(encoded)], axis=1).astype('uint8')[None]
save(Image.fromarray(rgb), 'saturn/rings-depth.png')
manifest['ring'] = {'width': 8192, 'maximumOpticalDepth': 8, 'radiusKm': 60268,
                    'innerRadius': 1.24, 'outerRadius': 2.32}
outputs = {str(p.relative_to(OUT)): {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(OUT.rglob('*')) if p.is_file()}
(OUT/'provenance.json').write_text(json.dumps({'recipeSha256': sha(Path(__file__)), 'sources': sources, 'outputs': outputs}, indent=2)+'\n')
target = ROOT/'src/perigee/planet/planet-manifest.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(manifest, indent=2)+'\n')
print('Version', version, 'files', len(outputs), 'bytes', sum(v['bytes'] for v in outputs.values()), flush=True)
