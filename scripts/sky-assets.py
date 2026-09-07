#!/usr/bin/env python3
"""Prepare Gaia DR3 point stars and complementary integrated light. See docs/stellar-sky.md.

Usage: /tmp/perigee-galaxy-venv/bin/python scripts/sky-assets.py /tmp
Dependencies: numpy, scipy, astropy, astropy-healpix, Pillow.
Masters remain outside the repository. Outputs are an ODbL derivative database.
"""
import csv
import hashlib
import json
from pathlib import Path
import struct
import sys

import numpy as np
from astropy import units as u
from astropy.io import fits
from astropy.wcs import WCS
from astropy_healpix import HEALPix
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(sys.argv[1])
HP = HEALPix(nside=512, order='nested')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def vectors(ra, dec):
    a, d = np.radians(ra), np.radians(dec)
    return np.column_stack((np.cos(d)*np.cos(a), np.sin(d), np.cos(d)*np.sin(a)))


source = CACHE / 'perigee-gaia-bright.csv'
rows = list(csv.DictReader(source.open()))
assert 100000 < len(rows) < 1000000, 'Missing/truncated Gaia query'
values = np.array([[float(r[k]) if r[k] else np.nan for k in
                    ('ra', 'dec', 'phot_g_mean_mag', 'phot_g_mean_flux', 'bp_rp')] for r in rows])
ra, dec, mag, flux, bp_rp = values.T
assert np.isfinite(values[:, :4]).all() and (mag < 10).all()

# Cross-match Yale to Gaia before drawing: one physical source, one point.
# Yale's epoch/rounding and close multiples make 40 arcsec a conservative match.
bsc_path = CACHE / 'bsc5.bin'
if not bsc_path.exists():
    # Reuse the immutable catalogue already shipped with the active sky.
    active_manifest = json.loads((ROOT / 'src/perigee/scenes/skyManifest.json').read_text())
    bsc_path = ROOT / 'public' / active_manifest['baseUrl'].lstrip('/') / 'bsc5.bin'
bsc_data = bsc_path.read_bytes()
bsc = np.array(list(struct.iter_unpack('<Hhhh', bsc_data[8:]))) / 100
dist, match = cKDTree(vectors(bsc[:, 0], bsc[:, 1])).query(vectors(ra, dec))
matched = dist < 2*np.sin(np.radians(40/3600)/2)
draw = (mag < 8.5) & ~matched
remove = draw | matched
pixels = HP.lonlat_to_healpix(ra*u.deg, dec*u.deg)

# HiPS FITS storage is not a row-major NESTED vector. Use the FITS WCS to
# establish the local permutation, then verify it in every valid face region.
y, x = np.mgrid[:512, :512]
first = fits.open(CACHE / 'perigee-gaia-flux-0.fits')[0]
lon, lat = WCS(first.header).pixel_to_world_values(x, y)
local = HP.lonlat_to_healpix(lon*u.deg, lat*u.deg)
assert np.unique(local).size == 512**2
sky = np.zeros(12*512**2)
sources = [source, bsc_path]
for face in range(12):
    path = CACHE / f'perigee-gaia-flux-{face}.fits'
    sources.append(path)
    tile = fits.open(path)[0]
    lon, lat = WCS(tile.header).pixel_to_world_values(x, y)
    valid = np.isfinite(lon) & np.isfinite(lat)
    # Astropy's HPX WCS rejects half the face crossing 180 deg. The common
    # permutation fills it without interpolation; the remaining WCS validates it.
    expected = local + face*512**2
    assert np.array_equal(HP.lonlat_to_healpix(lon[valid]*u.deg, lat[valid]*u.deg), expected[valid])
    assert np.isfinite(tile.data).all() and (tile.data >= 0).all()
    sky[expected] = tile.data

# These CDS order-0 flux tiles numerically store flux * 3/pi per pixel,
# despite a generic sr^-1 metadata label. Check against isolated bright sources
# rather than silently treating a display JPEG as calibrated radiance.
conversion = 3/np.pi
all_bright = np.bincount(pixels, weights=flux, minlength=sky.size)
calibration = sky[all_bright > 1e8] / all_bright[all_bright > 1e8]
assert abs(np.percentile(calibration, 10) / conversion - 1) < .02
subtraction = np.bincount(pixels[remove], weights=flux[remove]*conversion, minlength=sky.size)
residual = np.maximum(sky-subtraction, 0)
oversubtraction = np.maximum(subtraction-sky, 0).sum()/subtraction.sum()
assert oversubtraction < .01

# Average child HEALPix cells first: equal-area integration preserves flux.
# Runtime samples this nside=64 map through an equirectangular lookup. The
# stored scalar is linear G flux per steradian in units of a G=2 point source.
coarse = residual.reshape(-1, 64).mean(axis=1)
area = 4*np.pi/(12*512**2)
g2_flux = 10**((25.6874-2)/2.5)
density = coarse/(conversion*area*g2_flux)
width, height = 1024, 512
yy, xx = np.mgrid[:height, :width]
hp64 = HEALPix(nside=64, order='nested')
sampled = hp64.interpolate_bilinear_lonlat((xx+.5)/width*360*u.deg,
                                         (90-(yy+.5)/height*180)*u.deg, density)
diffuse_bytes = sampled.astype('<f4').tobytes()

# Gaia BP-RP to a display B-V proxy, not a calibrated spectrum. Missing colour
# uses neutral white. Yale keeps its measured visual magnitudes and B-V.
bv = np.where(np.isfinite(bp_rp), np.clip(bp_rp*.75-.1, -.4, 2), .45)
packed = bytearray(struct.pack('<4sII', b'GDR3', 1, int(draw.sum())))
for a, d, m, c in zip(ra[draw], dec[draw], mag[draw], bv[draw]):
    packed.extend(struct.pack('<ffhh', a, d, round(m*100), round(c*100)))
version = hashlib.sha256(packed+diffuse_bytes).hexdigest()[:12]
out = ROOT / 'public/assets/stars' / version
out.mkdir(parents=True, exist_ok=True)
(out / 'gaia.bin').write_bytes(packed)
(out / 'integrated-light.bin').write_bytes(diffuse_bytes)
# Publish the catalogue with this sky version; no unversioned runtime copy.
(out / 'bsc5.bin').write_bytes(bsc_data)
manifest = {
    'provenance': {'catalogue': {'url': 'https://gea.esac.esa.int/tap-server/tap/async', 'author': 'ESA/Gaia/DPAC', 'query': 'SELECT source_id,ra,dec,phot_g_mean_mag,phot_g_mean_flux,bp_rp FROM gaiadr3.gaia_source WHERE phot_g_mean_mag < 10 ORDER BY source_id', 'band': 'Gaia G 329.402-1030.196 nm; BP-RP display colour proxy', 'credit': 'Gaia Collaboration et al. (2023), A&A 674, A1; doi:10.1051/0004-6361/202243940'}, 'survey': {'url': 'https://alasky.cds.unistra.fr/ancillary/GaiaDR3/G-flux-map', 'author': 'T. Boch (CDS), CNRS/Universite de Strasbourg; ESA/Gaia/DPAC', 'license': 'ODbL-1.0', 'propertiesUrl': 'https://alasky.cds.unistra.fr/ancillary/GaiaDR3/G-flux-map/properties', 'files': 'Norder0/Dir0/Npix{0..11}.fits', 'nativeDimensions': '12 x 512 x 512 order-0 HEALPix NESTED faces', 'coverage': 'full sky, equatorial ICRS', 'release': '2022-06-16T14:31Z'}, 'derivatives': {'license': 'ODbL-1.0 (Gaia derivative database and integrated-light map)', 'projection': '1024x512 equirectangular; first row north, columns increasing RA, pixel centres; no sRGB transform', 'units': 'linear G flux/sr relative to a G=2 source', 'colorTreatment': 'diffuse neutral continuum; catalogue BP-RP to B-V proxy; runtime transmission reddens near horizon', 'processing': 'scripts/sky-assets.py /private/tmp; dependencies numpy scipy astropy astropy-healpix', 'sourceCache': '/private/tmp/perigee-gaia-* (external, ephemeral; reacquire if absent)'}},
    'version': version, 'baseUrl': f'/assets/stars/{version}',
    'width': width, 'height': height, 'epoch': 'ICRS J2016.0 (Gaia); Yale J2000.0',
    'gaiaPointCount': int(draw.sum()), 'yalePointCount': len(bsc),
    'queryCount': len(rows), 'matchedGaiaCount': int(matched.sum()),
    'pointLimitG': 8.5, 'diffuseNativeNside': 64,
    'fluxTileToCatalogueFactor': conversion,
    'brightPixelRatioPercentiles': np.percentile(calibration, [10, 50, 90]).tolist(),
    'oversubtractedFluxFraction': float(oversubtraction),
    'residualFluxFraction': float(residual.sum()/sky.sum()),
    'sources': [{'file': p.name, 'sha256': digest(p), 'bytes': p.stat().st_size} for p in sources],
    'outputs': [{'file': p.name, 'sha256': digest(p), 'bytes': p.stat().st_size} for p in sorted(out.iterdir())],
}
(ROOT / 'src/perigee/scenes/skyManifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps({k:v for k,v in manifest.items() if k not in ('sources','outputs')}, indent=2))
