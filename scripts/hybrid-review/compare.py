"""Verify saved review evidence (Pillow/numpy, also used by planet asset scripts).

These thresholds catch compositing regressions; they are NOT visual acceptance.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[2] / 'tmp/hybrid-review'
results = []
for device, rect in [('desktop', (700, 160, 1060, 510)), ('mobile', (27, 98, 365, 441))]:
    live = Image.open(root / f'{device}-globe-0.png').convert('RGB')
    saved = Image.open(root / f'{device}-globe-capture-4k.png').convert('RGB')
    saved = saved.resize(live.size, Image.Resampling.LANCZOS)
    delta = np.asarray(saved.crop(rect), dtype=float) - np.asarray(live.crop(rect), dtype=float)
    result = {'device': device, 'heroRect': rect, 'meanAbsoluteRgb': float(np.abs(delta).mean()),
              'meanSignedRgb': delta.mean(axis=(0, 1)).tolist()}
    results.append(result)
    comparison = Image.new('RGB', ((rect[2] - rect[0]) * 2, rect[3] - rect[1]))
    comparison.paste(live.crop(rect), (0, 0))
    comparison.paste(saved.crop(rect), (rect[2] - rect[0], 0))
    comparison.save(root / f'{device}-live-vs-capture.png')
    assert result['meanAbsoluteRgb'] < 3, result
    assert max(abs(channel) for channel in result['meanSignedRgb']) < 1.5, result
(root / 'capture-metrics.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
