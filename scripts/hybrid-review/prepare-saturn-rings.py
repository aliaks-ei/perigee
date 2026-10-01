"""Cassini PIA11142 display-color profile; Voyager tau remains independent.
The public mosaic is curved, not a calibrated albedo map. Register the narrow
central scan by visible boundaries (approximate), recording every anchor.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image
root = Path(__file__).resolve().parents[2]
source = root/'tmp/hybrid-h5/sources/PIA11142.jpg'
a = np.asarray(Image.open(source).convert('RGB'), dtype=float)
scan = np.median(a[796:805],axis=0)
# Inner C, inner B, outer B, inner A, Encke, Keeler, outer A, F.
radii = [74500,92000,117580,122200,133590,136530,136780,140220]
pixels = [1161,4160,8103,8570,10576,11022,11060,11634]
r = (1.24+(np.arange(8192)+.5)/8192*1.08)*60268
x = np.interp(r,radii,pixels)
rgb = np.stack([np.interp(x,np.arange(len(scan)),scan[:,c]) for c in range(3)],axis=1)
# Photographed radiance is not neutral albedo. Lift its floor before re-lighting
# to avoid applying the thin-ring darkness twice. The measured tau controls gaps.
rgb = .08*255 + .92*rgb
out = root/'public/assets/objects/saturn-cassini-rings.webp'
Image.fromarray(rgb.astype('uint8')[None].repeat(8,axis=0)).save(out,lossless=True)
record={'source':'PIA11142, Cassini ISS RGB 2008-11-26, NASA/JPL/SSI',
 'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'outputSha256':hashlib.sha256(out.read_bytes()).hexdigest(), 'rows':[796,805],
 'radiusKm':radii,'sourcePixels':pixels,'nativeSize':list(a.shape[:2][::-1]),
 'limits':'Approximate display-mosaic registration and .08 floor; not calibrated ring albedo. Separate Voyager UVS tau.'}
record['sourceUrl'] = 'https://science.nasa.gov/photojournal/a-full-sweep-of-saturns-rings/'
record['assetUrl'] = 'https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA11142.jpg'
(root/'public/assets/objects/saturn-cassini-rings.json').write_text(json.dumps(record,indent=2)+'\n')
(root/'tmp/hybrid-h5/sources/rings-derivative.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
