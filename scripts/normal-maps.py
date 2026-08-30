#!/usr/bin/env python3
"""
Builds tangent-space normal maps for the rocky bodies from public-domain
elevation data.

Why: perceived surface detail comes from relief that answers to the sun, not
from more albedo texels. The shader can fake relief from the albedo's own
gradient, but albedo and topography are different things — the lunar maria are
dark and flat, and faking relief from brightness invents craters where there are
none and flattens the ones that exist.

Sources (both public domain, see public/assets/ATTRIBUTIONS.md):
  Moon  LRO LOLA LDEM 16 ppd  ldem_16.img       (LSB int16, 0.5 m/unit)
  Mars  MGS MOLA MEGDR 16 ppd megt90n000eb.img  (MSB int16, 1 m/unit)

Both DEMs run 0 to 360 degrees east, so their left edge is the prime meridian.
The albedo maps they have to line up with are the usual -180 to 180 layout with
the prime meridian in the middle, so the elevation grid is rolled half a turn
before anything else happens. Skipping that puts every crater's lit side 180
degrees out from its albedo.

Usage (numpy and pillow required; a throwaway venv is fine):
  python3 scripts/normal-maps.py <dem.img> moon  public/assets/objects/moon-normal.webp
  python3 scripts/normal-maps.py <dem.img> mars  public/assets/objects/mars-normal.webp

The DEMs are ~32 MB each and are not kept in the repository — only the derived
maps are.
"""

import sys

import numpy as np
from PIL import Image

# name: (dtype, metres per stored unit, body radius in metres)
BODIES = {
    'moon': ('<i2', 0.5, 1_737_400.0),
    'mars': ('>i2', 1.0, 3_396_000.0),
}

SOURCE_WIDTH = 5760
SOURCE_HEIGHT = 2880
OUTPUT_WIDTH = 2048
OUTPUT_HEIGHT = 1024

# Real planetary relief is far too shallow to survive 8-bit encoding: the Moon's
# entire range is 19 km against a 1737 km radius. The gradients are scaled so
# that the steepest ground in the map lands near the edge of the encodable
# range, which keeps every slope correct relative to every other slope on the
# same body while making them visible at all. The factor is reported so it can
# be recorded alongside the asset.
TARGET_PERCENTILE = 99.0
TARGET_SLOPE = 0.55
# Longitude spacing collapses at the poles, so the east/west gradient is
# computed as if no row were nearer the pole than this.
MAX_LATITUDE = np.radians(85.0)


def read_dem(path: str, dtype: str, scale: float) -> np.ndarray:
    raw = np.fromfile(path, dtype=dtype)
    if raw.size != SOURCE_WIDTH * SOURCE_HEIGHT:
        raise SystemExit(f'{path}: expected {SOURCE_WIDTH * SOURCE_HEIGHT} samples, read {raw.size}')
    heights = raw.reshape(SOURCE_HEIGHT, SOURCE_WIDTH).astype(np.float32) * scale
    # 0..360 east into -180..180, to match the albedo maps.
    return np.roll(heights, SOURCE_WIDTH // 2, axis=1)


def resample(heights: np.ndarray) -> np.ndarray:
    """Down to the output grid first, so the gradients match the map's own
    resolution instead of aliasing slopes it cannot represent."""
    image = Image.fromarray(heights, mode='F')
    return np.asarray(image.resize((OUTPUT_WIDTH, OUTPUT_HEIGHT), Image.LANCZOS), dtype=np.float32)


def normal_map(heights: np.ndarray, radius: float) -> tuple[np.ndarray, float]:
    height, width = heights.shape
    latitude = (0.5 - (np.arange(height, dtype=np.float32) + 0.5) / height) * np.pi
    cos_latitude = np.maximum(np.cos(latitude), np.cos(MAX_LATITUDE))

    # Ground distance between neighbouring samples, in metres.
    east_step = radius * cos_latitude * (2.0 * np.pi / width)
    north_step = radius * (np.pi / height)

    # Longitude wraps; latitude is clamped at the poles.
    east = (np.roll(heights, -1, axis=1) - np.roll(heights, 1, axis=1)) / (2.0 * east_step[:, None])
    padded = np.pad(heights, ((1, 1), (0, 0)), mode='edge')
    north = (padded[:-2, :] - padded[2:, :]) / (2.0 * north_step)

    magnitude = np.hypot(east, north)
    reference = float(np.percentile(magnitude, TARGET_PERCENTILE))
    exaggeration = (TARGET_SLOPE / reference) if reference > 0 else 1.0

    vectors = np.stack([-east * exaggeration, -north * exaggeration, np.ones_like(east)], axis=-1)
    vectors /= np.linalg.norm(vectors, axis=-1, keepdims=True)
    return np.clip(np.rint((vectors * 0.5 + 0.5) * 255.0), 0, 255).astype(np.uint8), exaggeration


def main() -> None:
    if len(sys.argv) != 4 or sys.argv[2] not in BODIES:
        raise SystemExit(f'usage: {sys.argv[0]} <dem.img> <{"|".join(BODIES)}> <output.webp>')

    source, body, target = sys.argv[1], sys.argv[2], sys.argv[3]
    dtype, scale, radius = BODIES[body]

    heights = resample(read_dem(source, dtype, scale))
    encoded, exaggeration = normal_map(heights, radius)
    Image.fromarray(encoded, mode='RGB').save(target, quality=95, method=6)

    print(f'{target}: {OUTPUT_WIDTH}x{OUTPUT_HEIGHT}, slopes exaggerated {exaggeration:.1f}x')


if __name__ == '__main__':
    main()
