"""Capture parity diagnostics and matched contact sheets, not visual scores."""
from pathlib import Path
import json
import os
import numpy as np
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[2] / ('tmp/hybrid-h4-neptune/' + os.environ.get('PERIGEE_REVIEW_PASS', 'review-v2'))
metrics = []
for layout, rect in [('desktop', (802, 264, 946, 410)), ('mobile', (126, 196, 263, 328))]:
    live = Image.open(root / f'{layout}-globe-0.png').convert('RGB')
    full = Image.open(root / f'{layout}-globe-4k.png').convert('RGB')
    saved = full.resize(live.size, Image.Resampling.LANCZOS)
    delta = np.asarray(saved.crop(rect), dtype=float) - np.asarray(live.crop(rect), dtype=float)
    metrics.append({'layout': layout, 'exportSize': full.size, 'heroRect': rect,
                    'meanAbsoluteRgb': float(np.abs(delta).mean()), 'meanSignedRgb': delta.mean(axis=(0,1)).tolist()})
    names = ['portrait-0', 'globe-0', 'globe-90', 'globe-180', 'globe-270', 'globe-safe', 'fade', 'returned']
    shots = [(name, Image.open(root / f'{layout}-{name}.png').convert('RGB').crop(rect)) for name in names]
    w, h = shots[0][1].size
    contact = Image.new('RGB', (w*2, (h+28)*4), '#0c1118')
    draw = ImageDraw.Draw(contact)
    for i, (name, shot) in enumerate(shots):
        x=i%2*w; y=i//2*(h+28)
        draw.text((x+8,y+6), f'{layout} {name}', fill='white'); contact.paste(shot,(x,y+28))
    contact.save(root / f'{layout}-inspection.jpg', quality=95)
    reference = Image.open(root / f'{layout}-portrait-0.png').convert('RGB')
    comparison = Image.new('RGB', (live.width*2, live.height+32), '#0c1118')
    draw=ImageDraw.Draw(comparison)
    draw.text((12,10),'APPROVED PORTRAIT',fill='white'); draw.text((live.width+12,10),'REVIEW GLOBE',fill='white')
    comparison.paste(reference,(0,32)); comparison.paste(live,(live.width,32))
    comparison.save(root / f'{layout}-comparison.jpg', quality=96)
    crop=Image.new('RGB', (w*2,h+28), '#0c1118'); draw=ImageDraw.Draw(crop)
    draw.text((8,6),'LIVE',fill='white');draw.text((w+8,6),'4K EXPORT RESAMPLED',fill='white')
    crop.paste(live.crop(rect),(0,28));crop.paste(saved.crop(rect),(w,28));crop.save(root/f'{layout}-capture-parity.jpg',quality=96)
(root / 'capture-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
print(json.dumps(metrics,indent=2))
for item in metrics:
    assert item['meanAbsoluteRgb'] < 3 and max(abs(v) for v in item['meanSignedRgb']) < 1.5, item


for layout,rect in [('desktop',(802,264,946,410)),('mobile',(126,196,263,328))]:
    for size in ['4k','8k']:
        im=Image.open(root/f'{layout}-globe-{size}.png')
        scale=im.width/(1440 if layout=='desktop' else 390)
        im.crop(tuple(round(n*scale) for n in rect)).save(root/f'{layout}-{size}-detail.png')

    im=Image.open(root/f'{layout}-portrait-4k.png')
    scale=im.width/(1440 if layout=='desktop' else 390)
    im.crop(tuple(round(n*scale) for n in rect)).save(root/f'{layout}-portrait-4k-detail.png')
