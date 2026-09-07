#!/usr/bin/env python3
"""Offline derivative checks; no browser or GPU is used."""
import json
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/'src/perigee/galaxy/andromeda-manifest.json').read_text())
directory = ROOT/'public'/manifest['baseUrl'].lstrip('/')
provenance = json.loads((directory/'provenance.json').read_text())
assert hashlib.sha256((ROOT/'scripts/galaxy-assets.py').read_bytes()).hexdigest() == provenance['recipeSha256']
assert len(provenance['derivatives']) == 681
for derivative in provenance['derivatives']:
    payload = (directory/derivative['path']).read_bytes()
    assert len(payload) == derivative['bytes']
    assert hashlib.sha256(payload).hexdigest() == derivative['sha256'], derivative['path']
base = np.array(Image.open(directory/'base.webp').convert('RGBA'))
assert base.shape == (512, 1024, 4)
assert base[:, :, 3].min() >= 60, 'Transmission must never become transparent RGB'
assert max(base[0, :, :3].max(), base[-1, :, :3].max(), base[:, 0, :3].max(), base[:, -1, :3].max()) <= 2, 'Carrier has a visible rectangular edge'
errors = []
max_alpha_error = 0
for level in manifest['levels']:
    previous_row = []
    for y in range(level['rows']):
        row = []
        for x in range(level['columns']):
            tile = np.array(Image.open(directory/str(level['width'])/f'{x}-{y}.webp').convert('RGBA')).astype('int16')
            assert tile.shape == (528, 528, 4)
            assert tile[:, :, 3].min() >= 60
            pairs = []
            if x:
                pairs.append((row[-1][:, -16:], tile[:, :16]))
            if y:
                pairs.append((previous_row[x][-16:], tile[:16]))
            for a, b in pairs:
                errors.append(float(np.abs(a[:, :, :3]-b[:, :, :3]).mean()))
                max_alpha_error = max(max_alpha_error, int(np.abs(a[:, :, 3]-b[:, :, 3]).max()))
            row.append(tile)
        previous_row = row
assert max(errors) < 4, f'Excessive compressed border discrepancy: {max(errors)}'
assert max_alpha_error == 0, f'Transmission tile border mismatch: {max_alpha_error}'
print(json.dumps(dict(version=manifest['version'], tiles=680, comparedBorders=len(errors),
                     worstMeanRgbBorderError=max(errors), maximumTransmissionBorderError=max_alpha_error), indent=2))
