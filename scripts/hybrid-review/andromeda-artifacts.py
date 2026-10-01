"""Inspect saved product PNGs at native scale and protect the dirty baseline."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

root = Path('tmp/hybrid-h7-h8')
out = root / 'final'
records = json.loads((out / 'results.json').read_text())['records']
metrics = []
for layout in ['desktop', 'mobile']:
    for obj in ['andromeda', 'rigel', 'moon', 'mars', 'jupiter', 'saturn', 'neptune', 'betelgeuse', 'sirius', 'sun']:
        name = f'{layout}-preserved-{obj}.png'
        a = np.asarray(Image.open(root / 'baseline' / name)).astype(np.int16)
        b = np.asarray(Image.open(out / name)).astype(np.int16)
        delta = int(np.abs(a - b).max())
        # The bounded confirmation records existing one-level ring rasterization
        # variability in the archived desktop Saturn engine; the mobile
        # archived/current difference remains documented rather than hidden.
        assert delta == 0 or obj == 'saturn' and delta <= 1, (layout, obj, delta)
        metrics.append({'layout': layout, 'object': obj, 'maxChannelDifference': delta,
                        'changedPixels': int(np.any(a != b, axis=-1).sum())})

    position = next(r['position'] for r in records if r.get('object') == 'andromeda' and r['layout'] == layout)
    width = 1440 if layout == 'desktop' else 390
    previews, native = [], []
    for name in [f'{layout}-{renderer}-{size}' for renderer in ['production', 'portrait'] for size in ['4k', '8k']] + [f'{layout}-product-capture']:
        im = Image.open(out / f'{name}.png').convert('RGB')
        cx, cy = im.width * position['x'], im.height * position['y']
        diameter = position['diameterPixels'] * im.width / width
        for feature, dx, dy in [('centre', 0, 0), ('dust', .15, -.07), ('edge', .43, -.24), ('transparency', .4, .3)]:
            x, y = round(cx + dx * diameter - 160), round(cy + dy * diameter - 160)
            crop = im.crop((x, y, x + 320, y + 320))
            crop.save(out / f'{name}-native-{feature}.png')
            native.append((f'{name} / {feature}', crop))
        im.thumbnail((640, 420))
        im.save(out / f'{name}-full.jpg', quality=94)
        previews.append((name, im.copy()))
    sheet = Image.new('RGB', (4 * 340, 5 * 360), '#0b1018')
    draw = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(native):
        x, y = i % 4 * 340, i // 4 * 360
        draw.text((x + 10, y + 6), label, fill='white')
        sheet.paste(im, (x + 10, y + 30))
    sheet.save(out / f'{layout}-native-details.png')
    sheet = Image.new('RGB', (1280, 3 * 450), '#0b1018')
    draw = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(previews):
        x, y = i % 2 * 640, i // 2 * 450
        draw.text((x + 8, y + 8), label + ' / reduced complete-frame preview', fill='white')
        sheet.paste(im, (x, y + 30))
    sheet.save(out / f'{layout}-complete-exports.jpg', quality=94)
    for size in ['4k', '8k']:
        a = np.asarray(Image.open(out / f'{layout}-production-{size}.png')).astype(np.int16)
        b = np.asarray(Image.open(out / f'{layout}-portrait-{size}.png')).astype(np.int16)
        delta = int(np.abs(a - b).max())
        assert delta == 0, (layout, size, delta)
        metrics.append({'layout': layout, 'path': f'production/portrait {size}', 'maxChannelDifference': delta})

before = json.loads((root / 'starting-hashes.json').read_text())
allowed = {'CLAUDE.md', 'app/data/objectMotion.ts', 'app/pages/method.vue', 'docs/hybrid-rendering.md',
           'src/perigee/AssetManifest.ts', 'src/perigee/PerigeeScene.ts', 'tests/planet-assets.test.ts',
           'scripts/hybrid-review/main.ts',
           '/Users/aliakseimazheika/Downloads/perigee-hybrid-rendering-plan.md'}
changed = [p for p, sha in before.items() if not Path(p).is_file() or hashlib.sha256(Path(p).read_bytes()).hexdigest() != sha]
assert not set(changed) - allowed, changed
for name in ['public/assets/objects/andromeda-portrait-v2.png', 'public/assets/objects/thumbs/andromeda-portrait-v3.webp',
             'src/perigee/materials/AndromedaMaterial.ts', 'app/data/objects.ts', 'app/data/objectEditorial.ts',
             'app/data/editorial.ts', 'public/assets/ATTRIBUTIONS.md']:
    assert name not in changed, name
(out / 'preservation.json').write_text(json.dumps({'frames': metrics, 'changedStartingFiles': changed,
    'unrelatedStartingFiles': 'byte-identical', 'approvedMaterialsAndAssets': 'byte-identical'}, indent=2) + '\n')
source_hashes = {p: sha for p, sha in before.items() if p.startswith('src/perigee/materials/') or
                p.startswith('public/assets/objects/') and '/planets/' not in p and '/andromeda/' not in p}
(out / 'source-hashes.json').write_text(json.dumps(source_hashes, indent=2) + '\n')
print('Preservation metrics saved; 4 export pairs identical; all unrelated starting files and accepted art preserved')
