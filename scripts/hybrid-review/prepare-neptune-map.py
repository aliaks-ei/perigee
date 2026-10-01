"""Reproject dated Voyager display structure; reconstruct missing regions explicitly.

Usage: bundled python prepare-neptune-map.py [source cache]
Needs numpy and Pillow. Missing fine structure is explicitly modelled, never
labelled as observation. No portrait pixels or invented discrete storms.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT/'tmp/hybrid-h4-neptune/sources'
OUT = ROOT/'public/assets/objects'
WIDTH, HEIGHT = 2048, 1024

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def smooth(a, b, x):
    t = np.clip((x-a)/(b-a), 0, 1)
    return t*t*(3-2*t)

def sample(image, x, y):
    h,w = image.shape[:2]
    x=np.clip(x,0,w-1.001); y=np.clip(y,0,h-1.001)
    ix=x.astype(int); iy=y.astype(int); fx=x-ix; fy=y-iy
    return ((image[iy,ix]*(1-fx)+image[iy,ix+1]*fx)*(1-fy)
            +(image[iy+1,ix]*(1-fx)+image[iy+1,ix+1]*fx)*fy)

source=CACHE/'voyager-pia01492.jpg'
original=Image.open(source).convert('RGB')
# The 2188-pixel public JPEG is an enlargement of 800-line Voyager detector data.
# Bound the working image; a 2K mapped grid does not create new source resolution.
im=original.resize((1094,1093),Image.Resampling.LANCZOS)
a=np.asarray(im,dtype=float)/255
h,w=a.shape[:2]
y,x=np.mgrid[:h,:w]
cx,cy,rx,ry=548.,558.,481.,481.
nx=(x-cx)/rx; ny=(cy-y)/ry
# Use green-channel structure only: published two-filter blue is not natural RGB.
g=np.asarray(im.getchannel('G').filter(ImageFilter.GaussianBlur(.65)),dtype=float)/255
basis=np.stack([np.ones_like(nx),nx,ny,nx*nx,ny*ny,nx*ny],axis=-1)
valid=(nx*nx+ny*ny<.78**2)&(g>.08)
coeff=np.linalg.lstsq(basis[valid],np.log(g[valid]),rcond=None)[0]
for _ in range(3):
    residual=np.log(np.maximum(g,.001))-basis@coeff
    fit=valid&(residual>-.14)&(residual<.12)
    coeff=np.linalg.lstsq(basis[fit],np.log(g[fit]),rcond=None)[0]
structure=np.clip(g/np.exp(basis@coeff),.75,1.35)
# Suppress camera/JPEG grain without smearing the measured bright wisps. The
# filter compares neighbouring intensities; it synthesizes no spatial detail.
total=np.zeros_like(structure); normalizer=np.zeros_like(structure)
for dy in range(-2,3):
    for dx in range(-2,3):
        neighbour=np.roll(structure,(dy,dx),(0,1))
        similarity=np.exp(-((neighbour-structure)/.035)**2-(dx*dx+dy*dy)/3.)
        total+=neighbour*similarity; normalizer+=similarity
structure=total/normalizer
# Soft-threshold the finest residuals: source grain is not atmospheric detail.
soft=np.asarray(Image.fromarray(np.uint8(np.clip(structure/1.5,0,1)*255)).filter(ImageFilter.GaussianBlur(2.0)),dtype=float)/255*1.5
residual=structure-soft
structure=soft+np.sign(residual)*np.maximum(np.abs(residual)-.03,0)
# Planetocentric output, north first, eastern longitude increasing to the right.
lat=(.5-(np.arange(HEIGHT)+.5)/HEIGHT)*np.pi
lon=((np.arange(WIDTH)+.5)/WIDTH-.5)*2*np.pi
lat,lon=np.meshgrid(lat,lon,indexing='ij')
# Approximate registration of the public composite, not reconstructed SPICE geometry.
b=np.deg2rad(-28); roll=-.20
X=np.cos(lat)*np.sin(lon)
Y=np.sin(lat)*np.cos(b)-np.cos(lat)*np.cos(lon)*np.sin(b)
Z=np.sin(lat)*np.sin(b)+np.cos(lat)*np.cos(lon)*np.cos(b)
sx=X*np.cos(roll)-Y*np.sin(roll)
sy=X*np.sin(roll)+Y*np.cos(roll)
observed=sample(structure,cx+rx*sx,cy-ry*sy)
weight=smooth(.5,.75,Z)*(1-smooth(.62,.85,sx))
# Uniform polar convergence; no radial stretching of the observed edge.
weight*=1-smooth(np.deg2rad(68),np.deg2rad(80),np.abs(lat))
# Existing OPAL reconstruction provides only broad zonal brightness, no 2025 spots.
manifest=json.loads((ROOT/'src/perigee/planet/planet-manifest.json').read_text())
opal=ROOT/'public'/manifest['baseUrl'].lstrip('/')/'neptune/base.webp'
opal_array=np.asarray(Image.open(opal).convert('RGB'),dtype=float)/255
profile=opal_array.mean(axis=(1,2))
profile=profile/np.median(profile)
zonal=np.interp(np.arange(HEIGHT),np.linspace(0,HEIGHT-1,len(profile)),profile)
zonal=1+(zonal-1)*.5
# Continue only the observed zonal average around the globe. This is a marked
# reconstruction, not observations at those longitudes. Exclude bright/dark
# outliers so the Great Dark Spot and companion clouds are not repeated.
valid_profile=(weight>.8)&(observed>.94)&(observed<1.07)
count=valid_profile.sum(axis=1)
latitude_mean=(observed*valid_profile).sum(axis=1)/np.maximum(count,1)
supported=count>60
profile=np.interp(np.arange(HEIGHT),np.where(supported)[0],latitude_mean[supported])
# Explicit one-dimensional low-pass: no non-zonal procedural weather.
kernel=np.exp(-np.arange(-12,13)**2/32);kernel/=kernel.sum()
profile=np.convolve(np.pad(profile,12,mode='edge'),kernel,mode='valid')
zonal=(zonal*.35+(1+(profile-1)*1.3)*.65)
zonal=1+(zonal-1)*(1-smooth(np.deg2rad(65),np.deg2rad(83),np.abs(lat[:,0])))
ratio=zonal[:,None]*(1+(observed/profile[:,None]-1)*weight*.92)
# A source-constrained zonal texture closes the otherwise featureless unobserved
# hemisphere. It is an authored stationary reconstruction, NOT measured clouds.
# Seeded Fourier modes are periodic in longitude. Longitudinal coherence is much
# greater than meridional coherence, following the zonal cloud morphology in
# Voyager images. There are no generated discrete spots, vortices or new storms.
rng=np.random.default_rng(19890825)
latitude=lat[:,0]
longitude=lon[0]
field=np.zeros((HEIGHT,WIDTH))
warp=np.sin(longitude*2+.7)*.016+np.sin(longitude*5-1.2)*.006
for frequency in range(48,321,4):
    phase=rng.uniform(0,2*np.pi)
    wave=rng.integers(1,7)
    modulation=.5+.5*np.sin(longitude[None,:]*wave+latitude[:,None]*4+phase*.7)
    field+=modulation*np.sin((latitude[:,None]+warp[None,:])*frequency+phase
                  +1.8*np.sin(longitude[None,:]*wave+latitude[:,None]*9+phase*.7))/frequency**.4
field/=np.std(field)
polar_taper=1-smooth(np.deg2rad(55),np.deg2rad(82),np.abs(lat))
reconstruction=(.008*field+.01*np.maximum(field-.5,0)**2)*polar_taper
# Preserve observations in the supported region; this term acts predominantly
# outside coverage, without copying observed features to different longitudes.
ratio*=1+reconstruction*(1-weight*.6)
# Pale blue/cyan display palette, informed by Irwin 2024, NOT a spectral calibration.
palette=np.array([.50,.69,.81])
color=palette[None,None,:]*ratio[:,:,None]
# Observed bright cloud excess tends toward neutral; position stays source-derived.
cloud=np.clip((observed-1.10)*weight*.6,0,.15)
color=color*(1-cloud[:,:,None])+np.ones(3)*cloud[:,:,None]
# Bright modelled condensate filaments are less chromatic than the deeper deck.
# This remains reconstruction, weighted away from the measured Voyager patch.
model_cloud=np.clip(np.maximum(field-.8,0)**2*.017,0,.12)*polar_taper*(1-weight*.6)
color=color*(1-model_cloud[:,:,None])+np.ones(3)*model_cloud[:,:,None]
# A separate close-up contributes real fine cloud morphology at the latitude in
# NASA's caption (29 N). Only a bounded patch is used. Relative longitude and
# affine foreshortening are authored, not a SPICE registration or global mosaic.
# Bright residuals are isolated; photographed directional shadows are excluded.
close_source=CACHE/'voyager-pia00058.jpg'
close_image=Image.open(close_source).convert('RGB')
close_green=close_image.getchannel('G')
close_base=np.asarray(close_green.filter(ImageFilter.GaussianBlur(35)),dtype=float)+1
close_detail=(np.asarray(close_green.filter(ImageFilter.GaussianBlur(.8)),dtype=float)+1)/close_base
u=(lon-np.deg2rad(-20))/np.deg2rad(17)
v=(lat-np.deg2rad(29))/np.deg2rad(8)
close_x=315+u*240*.22-v*125*.976
close_y=295+u*240*.976+v*125*.22
close_mask=(1-smooth(.65,1,np.abs(u)))*(1-smooth(.55,1,np.abs(v)))
close_cloud=np.clip((sample(close_detail,close_x,close_y)-1.015)*.55,0,.2)*close_mask
color=color*(1-close_cloud[:,:,None])+np.ones(3)*close_cloud[:,:,None]
result=Image.fromarray(np.uint8(np.clip(color,0,1)*255+.5))
path=OUT/'neptune-voyager-reconstruction-v4.webp'
result.save(path,lossless=True,method=6)
mask=OUT/'neptune-voyager-coverage-v4.png'
Image.fromarray(np.uint8(weight*255+.5)).save(mask)
close_mask_path=OUT/'neptune-voyager-closeup-coverage-v4.png'
Image.fromarray(np.uint8(close_mask*255+.5)).save(close_mask_path)
solid=np.cos(lat)
metadata={
 'status':'review-only', 'source':{'url':'https://www.jpl.nasa.gov/images/pia01492-neptune-full-disk-view/',
 'download':'https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA01492.jpg',
 'sha256':sha(source),'dimensions':original.size,'epoch':'August 1989; about 4 days 20 hours before closest approach',
 'credit':'NASA/JPL','filters':'green and orange; enhanced display composite, not calibrated RGB albedo',
 'nativeDetector':'800 x 800; published enlargement is not native resolution'},
 'closeup':{'url':'https://science.nasa.gov/resource/neptune-clouds-showing-vertical-relief/',
 'download':'https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA00058.jpg',
 'sha256':sha(close_source),'dimensions':close_image.size,'credit':'NASA/JPL',
 'epoch':'August 1989; two hours before closest approach',
 'captionLatitudeDegrees':29,'captionResolutionKmPerPixel':11,
 'registration':'illustrative affine placement at caption latitude; authored relative longitude -20 degrees, half-width 17 degrees and half-height 8 degrees; not SPICE geometry',
 'coverageMask':close_mask_path.name,'maskSha256':sha(close_mask_path),
 'processing':'positive green-channel residual after 35-pixel broad-light removal; excludes baked directional shadows; opacity capped at 0.2'},
 'output':{'file':path.name,'sha256':sha(path),'dimensions':[WIDTH,HEIGHT],'bytes':path.stat().st_size},
 'projection':{'layout':'north-first, planetocentric, east-positive, -180 to 180 pixel-centred',
 'sourceDisc':[cx,cy,rx,ry],'workingImage':im.size,'approximateSubObserverLatitudeDegrees':-28,'approximatePoleRollRadians':roll,
 'longitude':'relative to the source-facing hemisphere; not IAU absolute longitude'},
 'reconstruction':{'coverageMask':mask.name,'maskSha256':sha(mask),
 'sourceSupportedAreaFraction':float((solid*(weight>0)).sum()/solid.sum()),
 'fullyWeightedAreaFraction':float((solid*(weight>.999)).sum()/solid.sum()),
 'coverageMeaning':'geometric source support after conservative taper, not measured weather accuracy',
 'elsewhere':'Voyager/OPAL zonal average plus explicitly modelled fine bands, smoothly convergent poles; no generated discrete storms',
 'modelledFineStructure':{'seed':19890825,'type':'periodic anisotropic zonal Fourier field',
 'meaning':'authored atmospheric reconstruction, NOT observed weather; not extra source resolution',
 'amplitude':'0.008 RMS base plus positive filament response and neutral condensate mix capped at 0.12, tapered to zero at poles',
 'mask':'brightness and neutral condensate models at 1 - 0.6 * Voyager weight; no generated discrete storms'},
 'opalBase':str(opal.relative_to(ROOT)),'opalSha256':sha(opal),
 'delighting':'robust quadratic fit to log green channel inside 0.78 disc radius; residual source shading remains',
 'paletteSrgb':palette.tolist(),'calibration':'authored natural-colour-informed display balance, not calibrated colour',
 'fineDetail':'bilaterally denoised and soft-thresholded finite Voyager observations plus separately identified modelled zonal texture; no upscaling claim or portrait pixels'},
 'recipeSha256':sha(Path(__file__))}
(OUT/'neptune-voyager-reconstruction-v4.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))
