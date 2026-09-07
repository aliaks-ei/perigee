#!/usr/bin/env python3
"""Offline integrity, data encoding and tile boundary checks; no browser QA."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/'src/perigee/planet/planet-manifest.json').read_text())
folder = ROOT/'public'/manifest['baseUrl'].lstrip('/')
provenance = json.loads((folder/'provenance.json').read_text())
assert hashlib.sha256((ROOT/'scripts/planet-assets.py').read_bytes()).hexdigest() == provenance['recipeSha256']
for name, expected in provenance['outputs'].items():
    data = (folder/name).read_bytes()
    assert len(data) == expected['bytes'], name
    assert hashlib.sha256(data).hexdigest() == expected['sha256'], name
worst, pairs = 0, 0
for body, config in manifest['bodies'].items():
    with Image.open(folder/body/'base.webp') as image:
        assert image.width == config['baseWidth']
        assert image.height * 2 == image.width
    if 'terrain' in config:
        normal = np.asarray(Image.open(folder/body/'terrain-normal.webp'), dtype=float)/255*2-1
        assert np.max(np.abs(np.linalg.norm(normal, axis=2)-1)) < .008
        height = np.asarray(Image.open(folder/body/'terrain-height.png'), dtype=np.uint16)
        assert np.ptp(height[0], axis=0).max() == 0
        assert np.ptp(height[-1], axis=0).max() == 0
        assert np.all(height[:, :, 2] == 0)
        packed = height[:, :, 0]*256+height[:, :, 1]
        assert packed.max() > packed.min()+10000
    for width in config['levels']:
        columns, rows = width//512, width//1024
        for y in range(rows):
            for x in range(columns):
                a = np.asarray(Image.open(folder/body/str(width)/f'{x}-{y}.webp'), dtype=float)
                assert a.shape == (528, 528, 3)
                b = np.asarray(Image.open(folder/body/str(width)/f'{(x+1)%columns}-{y}.webp'), dtype=float)
                worst = max(worst, float(np.abs(a[:, -16:]-b[:, :16]).mean()))
                pairs += 1
                if y+1 < rows:
                    b = np.asarray(Image.open(folder/body/str(width)/f'{x}-{y+1}.webp'), dtype=float)
                    worst = max(worst, float(np.abs(a[-16:]-b[:16]).mean()))
                    pairs += 1
assert worst < 5, worst
ring = np.asarray(Image.open(folder/'saturn/rings-depth.png'), dtype=float)
assert ring.shape == (1, 8192, 3)
tau = (ring[0, :, 0]*256+ring[0, :, 1])/65535*8
assert tau.max() > 2
assert tau.min() == 0
print(json.dumps({'files': len(provenance['outputs']), 'bytes': sum(v['bytes'] for v in provenance['outputs'].values()),
                  'borderPairs': pairs, 'worstMeanBorderError255': worst, 'version': manifest['version']}))
