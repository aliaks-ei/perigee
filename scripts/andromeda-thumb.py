#!/usr/bin/env python3
"""Prepare the observational 160px thumbnail after manual material acceptance.

Uses Pillow; run with the galaxy asset virtual environment. The thumbnail is an
observational derivative, not a claim of a browser-rendered capture.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/'src/perigee/galaxy/andromeda-manifest.json').read_text())
source = ROOT/'public'/manifest['baseUrl'].lstrip('/')/'base.webp'
image = Image.open(source).convert('RGB')
canvas = Image.new('RGB', (1024, 1024))
canvas.paste(image, (0, 256))
canvas = canvas.rotate(37.7, resample=Image.Resampling.BICUBIC)
canvas.resize((160, 160), Image.Resampling.LANCZOS).save(
    ROOT/f"public/assets/objects/thumbs/andromeda-{manifest['version']}.webp", quality=94)
