"""Reproducible multi-epoch Saturn display composite (Cassini and Hubble).
FITS bytes remain in ignored tmp/hybrid-h5/sources. No invented cloud features.
Run with the workspace scientific Python runtime (numpy, Pillow).
"""
from pathlib import Path
import hashlib
import os
import json
import numpy as np
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parents[2]
source = root / ('tmp/hybrid-h5/sources/saturn-cassini-rgb-' + os.environ.get('SATURN_SOURCE', 'original') + '.fits')
a = np.fromfile(source, dtype='>f4', offset=2880, count=3601*1801*3).reshape(3,1801,3601).transpose(1,2,0).copy()
# The FITS LAT_C/display label disagrees with the actual stored rows. Verify
# against paper Fig 7: storm at 20–40 N; broad ring-shadow gap at 5–15 S.
# Stored row 0 is north. The last longitude repeats the first (360/0).
a = a[:, :3600]
enhanced_path = root/'tmp/hybrid-h5/sources/saturn-cassini-rgb-enhanced.fits'
enhanced = np.fromfile(enhanced_path, dtype='>f4', offset=2880, count=3601*1801*3).reshape(3,1801,3601).transpose(1,2,0)[:,:3600]
# Restrained published enhancement retains small clouds without the strong
# red/green display contrast of the archive's fully enhanced composite.
a = (.85*a + .15*enhanced) * .84
valid = (a[:,:,0] > 20) & (a[:,:,1] > 20) & np.isfinite(a).all(axis=2)
# A 0.5 degree safety margin removes mixed pixels at the mapped ring/shadow
# boundaries, which are not atmospheric albedo and must not rotate as clouds.
bad_rows = valid.mean(axis=1) < .9
bad_rows = np.convolve(bad_rows.astype(int), np.ones(11), mode='same') > 0
valid[bad_rows] = False
rows = np.arange(a.shape[0])
# Fill only unobserved pixels by meridional linear interpolation. Polar caps
# tend smoothly to the nearest observed row's longitudinal mean at the pole.
for x in range(a.shape[1]):
    ok = valid[:,x]
    for c in range(3): a[:,x,c] = np.interp(rows, rows[ok], a[ok,x,c])
# Missing interior latitude strips have no measured longitudinal structure.
# Use a smooth zonal mean there, with a 1-degree crossfade at valid boundaries,
# instead of stretching the calibration noise into conspicuous vertical streaks.
interior = bad_rows.copy()
valid_rows = np.where(~bad_rows)[0]
interior[:valid_rows[0]] = False
interior[valid_rows[-1]+1:] = False
for y in np.where(interior)[0]: a[y] = a[y].mean(axis=0)
for y in np.where(~bad_rows)[0]:
    distance = np.min(np.abs(np.where(interior)[0] - y))
    if distance < 10:
        t = distance / 10
        a[y] = a[y]*t + a[y].mean(axis=0)*(1-t)
coverage = valid.mean(axis=1)
north, south = np.where(coverage > .9)[0][[0,-1]]
for y in range(north):
    t = y / max(north, 1)
    a[y] = a[north].mean(axis=0) * (1-t) + a[north] * t
for y in range(south+1,len(a)):
    t = (len(a)-1-y) / max(len(a)-1-south,1)
    a[y] = a[south].mean(axis=0) * (1-t) + a[south] * t
# Reference-matched, explicitly multi-epoch display reconstruction: OPAL 2024
# supplies the quieter broad haze bands, Cassini supplies resolved small clouds.
# This is an observational composite, not the weather of a single date.
manifest = json.loads((root/'src/perigee/planet/planet-manifest.json').read_text())
opal_path = root/'public'/manifest['baseUrl'].lstrip('/')/'saturn/base.webp'
opal = np.asarray(Image.open(opal_path).convert('RGB').resize((3600,1801),Image.Resampling.BICUBIC),dtype=float)
lum = opal @ np.array([.2126,.7152,.0722])
base = ((lum - np.median(lum))*.9 + 181)[:,:,None]*np.array([1.13,1.,.75])
smooth = Image.fromarray(np.uint8(np.clip(a,0,255))).resize((1800,1801),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(6)).resize((3600,1801),Image.Resampling.BICUBIC)
detail = a - np.asarray(smooth,dtype=float)
a = .8*base + .2*np.asarray(smooth,dtype=float) + np.clip(detail,-12,12)*2.0
# Fill the north observational gap from PIA21611 (June 25, 2013), left panel.
# NASA describes a polar stereographic map at nominal 25 km/pixel. This public
# display product lacks a longitude grid: cap longitude registration is authored,
# not a calibrated simultaneous 2011 retrieval. Blend only north of 78.5 N.
polar_path = root/'tmp/hybrid-h5/sources/PIA21611.jpg'
polar = np.asarray(Image.open(polar_path).convert('RGB'), dtype=float)
lat = 90 - rows[:116] * .1
lon = np.arange(3600) * np.pi / 1800
rho = 2 * 60268 * np.tan(np.deg2rad(90-lat)/2) / 25
px = np.clip(512 + rho[:,None] * np.cos(lon),0,1021)
py = np.clip(512 + rho[:,None] * np.sin(lon),0,1022)
x0 = px.astype(int); y0 = py.astype(int)
dx = (px-x0)[:,:,None]; dy = (py-y0)[:,:,None]
cap = (polar[y0,x0]*(1-dx)+polar[y0,x0+1]*dx)*(1-dy) + (polar[y0+1,x0]*(1-dx)+polar[y0+1,x0+1]*dx)*dy
cap *= a[116:126].mean(axis=(0,1)) / cap[100:110].mean(axis=(0,1))
# Neutralize the public composite's green cast into the portrait's blue-grey
# polar palette while retaining the observed vortex/hexagon luminance structure.
# Retain the observed hexagon's chromatic boundary. A luminance-only conversion
# erased it because the blue-green interior and ochre exterior have similar Y.
hexagon = np.clip((cap[:,:,1]-cap[:,:,0]+8)/28,0,1)[:,:,None]
cap_luma = (cap @ np.array([.2126,.7152,.0722]))[:,:,None]
cap = cap_luma * (np.array([1.10,1.,.82])*(1-hexagon) + np.array([.86,.93,1.06])*hexagon)
t = np.clip((lat-78.5)/2.5,0,1)[:,None,None]
t = t*t*(3-2*t)
a[:116] = a[:116]*(1-t) + cap*t
# The archival display FITS has a dark first/last column. Reconstruct a narrow
# 1.6-degree wrap interval between valid neighbouring columns, periodically.
indices = list(range(3592,3600)) + list(range(8))
for i,x in enumerate(indices):
    t = (i+1)/17
    a[:,x] = a[:,3591]*(1-t) + a[:,8]*t
im = Image.fromarray(np.uint8(np.clip(a,0,255))).filter(ImageFilter.GaussianBlur(.55))
output = root / 'public/assets/objects/saturn-observational-composite-v1.webp'
im.save(output, lossless=True, method=6)
Image.fromarray((valid*255).astype('uint8')).save(root/'tmp/hybrid-h5/sources/cassini-coverage.png')
record = {'source': source.name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'output': str(output.relative_to(root)), 'outputSha256': hashlib.sha256(output.read_bytes()).hexdigest(),
          'size': im.size, 'cassiniObservedFractionBeforeFill': float(valid.mean()), 'polarValidRows': [int(north),int(south)],
          'orientation': 'north first, eastward columns (positive-west longitude 360 to 0)',
          'gapPolicy': 'smooth zonal fill at ring-obscured latitudes; polar fallback; 1.6 degree longitude seam blend; not observed detail',
          'northCap': 'PIA21611 left panel 2013-06-25, stereographic 25km/px; authored longitude; blend 78.5-81 N',
          'northCapSha256': hashlib.sha256(polar_path.read_bytes()).hexdigest(),
          'filter': '0.55 native pixel Gaussian; lossless WebP'}
record['displayComposite'] = '85% original + 15% published contrast-enhanced RGB; .84 display gain'
record['enhancedSha256'] = hashlib.sha256(enhanced_path.read_bytes()).hexdigest()
record['broadHaze'] = {'source':str(opal_path.relative_to(root)), 'sha256':hashlib.sha256(opal_path.read_bytes()).hexdigest(),
  'epoch':'Hubble OPAL 2024-08-22', 'method':'80% Hubble broad luminance in authored cream palette / 20% low-pass Cassini; Cassini high-pass sigma approx 6x12px, bounded +/-12, gain 2.0; polar chromatic-boundary-preserving blue-grey balance'}
record['sourceUrl'] = 'https://atmos.nmsu.edu/PDS/data/PDS4/co_iss_global-maps/data_derived/Cassini_ISS_RGB_Saturn_global_color_map_original.fits'
record['enhancedUrl'] = record['sourceUrl'].replace('original.fits','contrast_enhance.fits')
record['polarUrl'] = 'https://www.jpl.nasa.gov/images/pia21611-saturns-hexagon-as-summer-solstice-approaches/'
record['hubbleUrl'] = 'https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-31'
record['credit'] = 'NASA/JPL-Caltech/Space Science Institute/Hampton University; NASA/ESA/STScI; Wang et al. 2025, doi:10.1038/s41597-025-04392-3'
(root/'public/assets/objects/saturn-observational-composite-v1.json').write_text(json.dumps(record,indent=2)+'\n')
(root/'tmp/hybrid-h5/sources/derivative.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
