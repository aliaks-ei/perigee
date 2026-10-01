"""HRSC / TES / Viking observational color composite for review rendering.
Requires the three ESA GeoTIFFs and TES array in tmp/hybrid-h4-mars/hrsc,
and eight Viking PNG quadrants in tmp/hybrid-h4-mars/viking.
No synthesized features, unsharp mask, or terrain exaggeration.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageFilter
root=Path(__file__).resolve().parents[2]
source=root/'tmp/hybrid-h4-mars/hrsc'
output=root/'public/assets/objects'
channels=[]
records=[]
for name,band in [('red','01-re'),('green','02-gr'),('blue','03-bl')]:
 p=source/(name+'.tif')
 im=Image.open(p)
 a=np.asarray(im,dtype=np.float32).copy()
 # GeoTIFF's last longitude column has 2045 nodata samples from reprojection.
 # Wrap-interpolate these edge samples; do not mistake them for coverage holes.
 bad=a<0
 assert not bad[:,:-1].any()
 a[bad[:,-1],-1]=(a[bad[:,-1],-2]+a[bad[:,-1],0])*.5
 im=Image.fromarray(a)
 if not np.isfinite(a).all() or (a<0).any(): raise ValueError('Unexpected nodata: do not silently fill')
 records.append({'band':band,'dimensions':list(im.size),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'min':float(a.min()),'max':float(a.max())})
 channels.append(np.asarray(im.resize((4096,2048),Image.Resampling.LANCZOS)))
a=np.stack(channels,axis=-1)
# Input is reflectance-like linear data, not display bytes. Keep band ratios;
# clipping very bright polar values is disclosed (caps use the Viking mosaic).
# TES supplies only regional broadband brightness, never false-color channels.
# The two epochs and passbands differ: this is a display reconstruction, not
# a newly calibrated reflectance retrieval. Suppress orbit-track texture.
tes_path=source/'global_albedo_8ppd.img'
tes=np.fromfile(tes_path,dtype='<f4').reshape(1440,2880)
assert np.isfinite(tes).all() and (tes>0).all()
def smooth_float(array, radius):
 # Float-preserving separable periodic Gaussian, with clamped latitude.
 pad=int(radius*4)
 padded=np.pad(array,((pad,pad),(0,0)),mode='edge')
 fy=np.fft.fftfreq(padded.shape[0])[:,None]
 fx=np.fft.rfftfreq(padded.shape[1])[None,:]
 kernel=np.exp(-2*np.pi**2*radius**2*(fx*fx+fy*fy))
 return np.fft.irfft2(np.fft.rfft2(padded)*kernel,s=padded.shape)[pad:-pad].astype(np.float32)
tes=smooth_float(tes,5)
tes=np.asarray(Image.fromarray(tes).resize((4096,2048),Image.Resampling.BILINEAR))
lum=a @ np.array([.2126,.7152,.0722],dtype=np.float32)
low=smooth_float(lum,10)
ratio=np.clip((tes/.19255)/(low/.19),.35,2.0)
latitude=np.abs((np.arange(2048)+.5)/2048-.5)*180
weight=np.clip((68-latitude)/8,0,1)[:,None]
a*=((1-weight)+weight*ratio)[:,:,None]
records.append({'band':'TES bolometric albedo','sha256':hashlib.sha256(tes_path.read_bytes()).hexdigest(),'dimensions':[2880,1440],'source':'https://tes.mars.asu.edu/products/','projection':'simple cylindrical, east-positive -180..180, planetocentric; PC_REAL little endian float32; 2002-10-25'})
# The older Viking merged-color product retains photographic albedo that the
# newer MDIM 2.1 high-pass derivative suppresses. Reuse luminance, not its
# enhanced purple/orange chroma, and attenuate upstream sharpening.
viking_root=root/'tmp/hybrid-h4-mars/viking'
globe=Image.new('RGB',(4096,2048))
for iy,hemi in enumerate(['n','s']):
 for ix,lon in enumerate(['225','315','045','135']):
  im=Image.open(viking_root/f'mars45{hemi}{lon}.png').convert('RGB')
  globe.paste(im.resize((1024,1024),Image.Resampling.LANCZOS),(ix*1024,iy*1024))
globe.save(viking_root/'global-4k.png')
old=np.asarray(Image.open(viking_root/'global-4k.png').filter(ImageFilter.GaussianBlur(.55)),dtype=np.float32)/255
old=np.where(old<=.04045,old/12.92,((old+.055)/1.055)**2.4)
old_lum=old @ np.array([.2126,.7152,.0722],dtype=np.float32)
old_reference=.19*np.power(np.maximum(old_lum,.003)/.1,.85)
current_lum=a @ np.array([.2126,.7152,.0722],dtype=np.float32)
viking_weight=.8*np.clip((75-latitude)/10,0,1)[:,None]
a*=((1-viking_weight)+viking_weight*old_reference/np.maximum(current_lum,.01))[:,:,None]
for tile in sorted(viking_root.glob('mars*.png')):
 records.append({'band':'Viking merged color / MDIM 1.0 '+tile.name,'sha256':hashlib.sha256(tile.read_bytes()).hexdigest(),'dimensions':[5760,5760],'source':'https://mars.asu.edu/data/mdim_color/large/'+tile.name})
a=np.clip(a,0,1)
srgb=np.where(a<=.0031308,a*12.92,1.055*a**(1/2.4)-.055)
Image.fromarray(np.uint8(srgb*255+.5)).save(output/'mars-hrsc-color-v1.webp',quality=95)
manifest=json.loads((root/'src/perigee/planet/planet-manifest.json').read_text())
p=root/'public'/manifest['baseUrl'].lstrip('/')/'mars/base.webp'
im=Image.open(p).convert('RGB')
# One-degree-scale low-pass; periodic longitude padding avoids a filter seam.
padded=Image.new('RGB',(im.width+64,im.height))
padded.paste(im.crop((im.width-32,0,im.width,im.height)),(0,0)); padded.paste(im,(32,0)); padded.paste(im.crop((0,0,32,im.height)),(im.width+32,0))
padded.filter(ImageFilter.GaussianBlur(5.7)).crop((32,0,im.width+32,im.height)).save(output/'mars-viking-lowpass-v1.webp',lossless=True)
metadata={'source':'ESA/DLR/FU Berlin, Michael et al. (2023), Mars Express HRSC High-Altitude Mosaic V1.0','archive':'https://archives.esac.esa.int/psa/ftp/pub/mirror/Guest-Storage-Facility/Mars_HRSC_High-Altitude-Mosaic_V1.0/extra/','paper':'https://doi.org/10.48550/arXiv.2307.14238','bands':records,'projection':'Equicylindrical, center 0 E, north up, planetocentric; 2000 m pixels; 10669 x 5334','runtime':[4096,2048],'processing':'HRSC reflectance RGB; TES broad brightness reference with 5-source-pixel Gaussian; 80% older Viking merged-color luminance with .55-output-pixel smoothing and .85 exponent, 20% HRSC/TES brightness. HRSC supplies chroma. Source blend fades at 65..75 degrees; final polar correction in prepare-mars-tiles.py. Linear-to-sRGB encoding. Upstream sharpening attenuated. Authored shader contrast/desaturation documented separately.','coverage':'Upstream small gaps are featureless interpolated regions, including north cap; no supplied per-pixel mask. Fraction not established. Polar color supplied by earlier Viking observations, not simultaneous HRSC.','rights':'Public ESA PSA scientific data; product guide requests Michael et al. citation. ESA Open Access explicitly permits PSA data download/use with investigator and PSA acknowledgment: https://open.esa.int/esa-planetary-science-archive/. TES is NASA/ASU public scientific data. Do not conflate with separately CC BY-SA 3.0 IGO licensed ESA press illustration.'}
(output/'mars-hrsc-color-v1.json').write_text(json.dumps(metadata,indent=2)+'\n')
preview=Image.open(output/'mars-hrsc-color-v1.webp'); preview.thumbnail((1600,800)); preview.save(source/'preview.jpg')
print(json.dumps(metadata,indent=2))
