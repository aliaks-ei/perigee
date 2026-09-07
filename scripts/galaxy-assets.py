#!/usr/bin/env python3
"""Reproject observational M31 images and prepare bounded runtime tiles.

python -m venv /tmp/perigee-galaxy-venv
/tmp/perigee-galaxy-venv/bin/pip install pillow==12.3.0 numpy==2.5.3 scipy==1.18.1
/tmp/perigee-galaxy-venv/bin/python scripts/galaxy-assets.py /tmp/perigee-galaxy-sources

Masters stay outside the repository. See docs/andromeda-assets.md for acquisition,
colour/foreground limitations and the published astrometric metadata.
"""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, gaussian_filter, map_coordinates

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[1]
CENTRE = (10.6847083, 41.26875)
PA = math.radians(37.7)
# 138,000 ly optical diameter at 2.5 Mly, with 25% margins for outskirts.
FOV = math.degrees(2 * math.atan(138000 / 5000000)) * 60 * 1.25
WIDTH = 16384
HEIGHT = WIDTH // 2
TILE = 512
BORDER = 8
SOURCES = [
    dict(id='heic1502b', centre=[10.75225, 41.2608694], fov=[362, 234.12], north=-1.9,
         credit='NASA, ESA, Digitized Sky Survey 2 (Acknowledgement: Davide De Martin)',
         filters='DSS2 photographic colour composite; non-photometric outreach stretch'),
    dict(id='heic2501a', centre=[10.9324167, 41.3858111], fov=[140.60, 32.88], north=125,
         credit='NASA, ESA, B. Williams (University of Washington)',
         filters='Hubble PHAT/PHAST, 475 nm and 817 nm; two-filter display colour'),
]


def tangent(ra, dec, centre=CENTRE):
    """ICRS -> gnomonic east/north, radians. Supports arrays."""
    ra, dec = np.radians(ra), np.radians(dec)
    r0, d0 = np.radians(centre)
    den = np.sin(d0)*np.sin(dec) + np.cos(d0)*np.cos(dec)*np.cos(ra-r0)
    return (np.cos(dec)*np.sin(ra-r0)/den,
            (np.cos(d0)*np.sin(dec)-np.sin(d0)*np.cos(dec)*np.cos(ra-r0))/den)


def sky(x, y):
    """Major-axis-aligned tangent plane -> ICRS, radians."""
    e, n = x*np.sin(PA)+y*np.cos(PA), x*np.cos(PA)-y*np.sin(PA)
    r0, d0 = np.radians(CENTRE)
    ra = r0 + np.arctan2(e, np.cos(d0)-n*np.sin(d0))
    dec = np.arctan2(np.sin(d0)+n*np.cos(d0), np.hypot(np.cos(d0)-n*np.sin(d0), e))
    return np.degrees(ra), np.degrees(dec)


def source_pixels(ra, dec, meta, shape):
    e, n = tangent(ra, dec, meta['centre'])
    a = math.radians(meta['north'])
    x, y = -e*np.cos(a)+n*np.sin(a), e*np.sin(a)+n*np.cos(a)
    h, w = shape[:2]
    return ((x/(2*np.tan(np.radians(meta['fov'][0]/60)/2))+.5)*w-.5,
            (.5-y/(2*np.tan(np.radians(meta['fov'][1]/60)/2)))*h-.5)


def sample(data, px, py):
    return np.stack([map_coordinates(data[:, :, c], [py, px], order=1, mode='constant', cval=0)
                     for c in range(data.shape[2])], axis=-1)


def checksum(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def linear(rgb):
    return np.where(rgb <= .04045, rgb/12.92, ((rgb+.055)/1.055)**2.4)


def encode(rgb):
    return np.where(rgb <= .0031308, rgb*12.92, 1.055*np.maximum(rgb, 0)**(1/2.4)-.055)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('cache', type=Path)
    parser.add_argument('--reuse-registered', action='store_true', help='Reuse this run’s masked linear cache when only encoding changes')
    args = parser.parse_args()
    records = []
    arrays = []
    for meta in SOURCES:
        path = args.cache / (meta['id']+'.jpg')
        image = Image.open(path).convert('RGB')
        dimensions = list(image.size)
        # Still oversamples the final target's footprint; never enlarge source data.
        image.thumbnail((20000, 13000), Image.Resampling.LANCZOS)
        arrays.append(np.asarray(image, dtype=np.float32)/255)
        records.append(dict(**meta, url=f'https://cdn.esahubble.org/archives/images/large/{path.name}',
                            page=f'https://esahubble.org/images/{meta["id"]}/',
                            nativeDimensions=dimensions, processingDimensions=list(image.size),
                            sha256=checksum(path), license='CC-BY-4.0'))
        print('Loaded', meta['id'], image.size, flush=True)

    # Coverage is computed from the black survey padding, then eroded/feathered
    # well inside the footprint. Low-resolution coverage is sufficient and bounded.
    coverage = np.max(arrays[1][::8, ::8], axis=2) > .035
    coverage = np.clip((distance_transform_edt(coverage)-5)/45, 0, 1).astype(np.float32)
    output = np.memmap(args.cache/'m31-linear.bin', dtype='float32', mode='r+' if args.reuse_registered else 'w+', shape=(HEIGHT, WIDTH, 3))
    extent = math.tan(math.radians(FOV/60)/2)
    for start in ([] if args.reuse_registered else range(0, HEIGHT, 256)):
        low, high = max(0, start-128), min(HEIGHT, start+384)
        yy, xx = np.mgrid[low:high, :WIDTH]
        x, y = ((xx+.5)/WIDTH*2-1)*extent, (.5-(yy+.5)/HEIGHT)*extent
        ra, dec = sky(x, y)
        dpx, dpy = source_pixels(ra, dec, SOURCES[0], arrays[0].shape)
        hpx, hpy = source_pixels(ra, dec, SOURCES[1], arrays[1].shape)
        base = linear(sample(arrays[0], dpx, dpy))
        detail = linear(sample(arrays[1], hpx, hpy))
        # Remove the photographic sky pedestal and moderate the DSS blue cast.
        base = np.maximum(base - .0007, 0) * np.array([1.08, 1, .82], dtype=np.float32)
        weight = map_coordinates(coverage, [hpy/8, hpx/8], order=1, mode='constant', cval=0)
        # Match low spatial frequencies in linear light; import observed fine
        # structure instead of the unrelated two-filter Hubble exposure/colour.
        b_low = gaussian_filter(base, (24, 24, 0))
        h_low = gaussian_filter(detail, (24, 24, 0))
        matched = detail * np.clip(b_low / np.maximum(h_low, .0001), .08, 12)
        combined = base*(1-weight[:, :, None]) + matched*weight[:, :, None]
        output[start:min(HEIGHT, start+256)] = combined[start-low:min(high, start+256)-low]
        print('Reprojected', start, '/', HEIGHT, flush=True)
    del arrays

    # Only astrometrically selected Galactic objects are removed. No generic
    # star detector is applied to M31, preserving its clusters/resolved stars.
    catalogue = args.cache/'foreground.csv'
    with catalogue.open() as stream:
        stars = list(csv.DictReader(stream))
    if len(stars) >= 100000:
        raise ValueError('Foreground query hit its row limit; obtain the complete catalogue before shipping')
    removed = 0
    for star in stars:
        e, n = tangent(float(star['ra']), float(star['dec']))
        x, y = e*np.sin(PA)+n*np.cos(PA), e*np.cos(PA)-n*np.sin(PA)
        cx, cy = (x/extent/2+.5)*WIDTH, (.5-y/extent)*HEIGHT
        mag = float(star['phot_g_mean_mag'])
        # A conservative magnitude-dependent halo radius, in final pixels.
        radius = max(3, min(180, 6*10**((15-mag)*.16)))
        if not (radius < cx < WIDTH-radius and radius < cy < HEIGHT-radius):
            continue
        if args.reuse_registered:
            removed += 1
            continue
        pad = int(radius*1.65)+2
        x0, x1 = max(0, int(cx)-pad), min(WIDTH, int(cx)+pad+1)
        y0, y1 = max(0, int(cy)-pad), min(HEIGHT, int(cy)+pad+1)
        yy, xx = np.mgrid[y0:y1, x0:x1]
        r = np.hypot(xx-cx, yy-cy)
        patch = output[y0:y1, x0:x1]
        annulus = patch[(r > radius*1.2) & (r < radius*1.6)]
        if not len(annulus):
            continue
        fill = np.median(annulus, axis=0)
        mask = np.clip((radius-r)/(radius*.25), 0, 1)[:, :, None]
        patch[:] = patch*(1-mask)+fill*mask
        removed += 1
    output.flush()

    # A faint outer taper, not an opaque image rectangle. Companions have their
    # own envelopes; none is painted procedurally into the emission image.
    rgba = np.memmap(args.cache/'m31-rgba.bin', dtype='uint8', mode='w+', shape=(HEIGHT, WIDTH, 4))
    for start in range(0, HEIGHT, 256):
        end = min(HEIGHT, start+256)
        yy, xx = np.mgrid[start:end, :WIDTH]
        x, y = ((xx+.5)/WIDTH-.5)*2.5, (.5-(yy+.5)/HEIGHT)*1.25
        r = np.hypot(x, y/.36)
        envelope = np.clip((1.24-r)/.22, 0, 1)
        for cx, cy, rx, ry in [(-.204, .153, .12, .12), (.036, -.384, .20, .18)]:
            envelope = np.maximum(envelope, np.clip((1.4-np.hypot((x-cx)/rx, (y-cy)/ry))/.5, 0, 1))
        edge = np.minimum(np.clip((1.25-np.abs(x))/.04, 0, 1), np.clip((.625-np.abs(y))/.04, 0, 1))
        light = np.asarray(output[start:end]) * (envelope*edge)[:, :, None]
        # Dust is a local extinction proxy, not a measured optical-depth survey.
        lo, hi = max(0, start-48), min(HEIGHT, end+48)
        smooth = gaussian_filter(np.asarray(output[lo:hi]), (12, 12, 0))[start-lo:end-lo]
        smooth *= (envelope*edge)[:, :, None]
        lum = light @ np.array([.2126, .7152, .0722], dtype=np.float32)
        low = smooth @ np.array([.2126, .7152, .0722], dtype=np.float32)
        absorption = np.clip(1-lum/np.maximum(low, .0005), 0, .75)
        rgba[start:end, :, :3] = np.uint8(np.clip(encode(light), 0, 1)*255+.5)
        # Store transmission (>= .25), avoiding zero-alpha RGB loss in browser
        # image decoders. This channel is data, never compositing transparency.
        rgba[start:end, :, 3] = np.uint8((1-absorption)*255+.5)
    rgba.flush()
    recipe = checksum(Path(__file__))
    version = hashlib.sha256((''.join(r['sha256'] for r in records)+checksum(catalogue)+recipe).encode()).hexdigest()[:12]
    destination = ROOT/'public/assets/objects/andromeda'/version
    destination.mkdir(parents=True, exist_ok=True)
    full = Image.fromarray(rgba, 'RGBA')
    def resize_data(image, size):
        # Alpha stores extinction, not coverage. Pillow's RGBA resize otherwise
        # premultiplies RGB by dust and destroys emission wherever dust is zero.
        channels = list(channel.resize(size, Image.Resampling.LANCZOS) for channel in image.split())
        # Lanczos ringing must not push a data channel outside its physical range.
        channels[3] = Image.fromarray(np.clip(np.asarray(channels[3]), 64, 255).astype('uint8'))
        return Image.merge('RGBA', tuple(channels))
    base = resize_data(full, (1024, 512))
    base.save(destination/'base.webp', lossless=True, exact=True)
    levels = []
    derivatives = []
    for width in [2048, 4096, 8192, 16384]:
        level = full if width == WIDTH else resize_data(full, (width, width//2))
        directory = destination/str(width)
        directory.mkdir(exist_ok=True)
        for y in range(width//2//TILE):
            for x in range(width//TILE):
                # Pad by clamping outside the image, never transparent crop padding.
                px = np.clip(np.arange(x*TILE-BORDER, (x+1)*TILE+BORDER), 0, width-1)
                py = np.clip(np.arange(y*TILE-BORDER, (y+1)*TILE+BORDER), 0, width//2-1)
                region = np.asarray(level.crop((max(0, x*TILE-BORDER), max(0, y*TILE-BORDER),
                                               min(width, (x+1)*TILE+BORDER), min(width//2, (y+1)*TILE+BORDER))))
                region = region[(py-py.min())[:, None], (px-px.min())[None, :]]
                path = directory/f'{x}-{y}.webp'
                Image.fromarray(region).save(path, quality=94, method=4, exact=True)
                derivatives.append(dict(path=str(path.relative_to(destination)), bytes=path.stat().st_size, sha256=checksum(path)))
        levels.append(dict(width=width, columns=width//TILE, rows=width//2//TILE))
        print('Wrote level', width, flush=True)
    manifest = dict(version=version, baseUrl=f'/assets/objects/andromeda/{version}',
                    width=WIDTH, height=HEIGHT, tileSize=TILE, border=BORDER, levels=levels)
    (ROOT/'src/perigee/galaxy/andromeda-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    evidence = dict(**manifest, recipeSha256=recipe, sources=records,
                    foreground=dict(sha256=checksum(catalogue), selected=len(stars), masked=removed,
                                    query='Gaia DR3 TOP 100000 ORDER BY source_id; RA 7.6..13.8 Dec 39..43.5; G<17; parallax_over_error>5 OR total proper motion>5 mas/yr'),
                    fieldArcminutes=[FOV, FOV/2], centre=CENTRE, positionAngle=37.7,
                    colourSpace='sRGB RGB; linear transmission proxy in alpha; not photometric',
                    derivatives=[dict(path='base.webp', bytes=(destination/'base.webp').stat().st_size,
                                      sha256=checksum(destination/'base.webp'))]+derivatives)
    (destination/'provenance.json').write_text(json.dumps(evidence, indent=2)+'\n')
    preview = full.convert('RGB')
    preview.thumbnail((1400, 700))
    preview.save(args.cache/'registered-preview.png')
    print('Manifest:', version, 'foreground masks:', removed, flush=True)


if __name__ == '__main__':
    main()
