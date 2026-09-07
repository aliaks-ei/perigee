#!/usr/bin/env python3
"""Source-map menu crops, not browser-rendered captures. Requires Pillow."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/'src/perigee/planet/planet-manifest.json').read_text())
for body in manifest['bodies']:
    image = Image.open(ROOT/'public'/manifest['baseUrl'].lstrip('/')/body/'base.webp').convert('RGB')
    side = image.height
    left = (image.width-side)//2
    image.crop((left, 0, left+side, side)).resize((160, 160), Image.Resampling.LANCZOS).save(
        ROOT/f"public/assets/objects/thumbs/{body}-{manifest['version']}.webp", quality=94)
