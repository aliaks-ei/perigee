"""Compare production captures with the accepted H6 candidate and approved globes."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
REVIEW = ROOT / 'tmp/hybrid-h6-betelgeuse/review-v9'
PROMOTED = ROOT / 'tmp/hybrid-h6-betelgeuse/promoted'


def max_channel_difference(first: Path, second: Path) -> int:
    a = np.asarray(Image.open(first), dtype=np.int16)
    b = np.asarray(Image.open(second), dtype=np.int16)
    if a.shape != b.shape:
        raise AssertionError(f'Image dimensions differ: {first}, {second}')
    return int(np.abs(a - b).max())


records = []
for layout in ('desktop', 'mobile'):
    for name, before, after in (
        ('betelgeuse', REVIEW / f'{layout}-globe-0.png', PROMOTED / f'{layout}-production-reference.png'),
        ('portrait-rollback', REVIEW / f'{layout}-portrait-0.png', PROMOTED / f'{layout}-portrait-rollback.png'),
        *((body, REVIEW / 'preservation' / f'{layout}-{body}.png',
           PROMOTED / f'{layout}-preserved-{body}.png')
          for body in ('moon', 'mars', 'jupiter', 'saturn', 'neptune')),
    ):
        difference = max_channel_difference(before, after)
        assert difference == 0, (layout, name, difference)
        records.append({'layout': layout, 'object': name, 'maxChannelDifference': difference})

    product = np.asarray(Image.open(PROMOTED / f'{layout}-product.png').convert('RGB'))
    top = product[:int(product.shape[0] * .58)]
    orange = ((top[:, :, 0] > 175) & (top[:, :, 0] > top[:, :, 1] * 1.35)
              & (top[:, :, 1] > top[:, :, 2] * 1.5))
    assert int(orange.sum()) > 500, f'{layout} production globe is not visible in the screenshot'

asset = ROOT / 'public/assets/objects/betelgeuse-convection-v1.webp'
asset_hash = hashlib.sha256(asset.read_bytes()).hexdigest()
assert asset_hash == '5cd2202bbe79894ffd5d9ba8fcc06cdd16ed3eda45306f9b3e60feb1ff8a33d7'
report = {'images': records, 'approvedAssetSha256': asset_hash}
(PROMOTED / 'preservation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
