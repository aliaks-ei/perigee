"""Bounded 2K/4K/8K/16K review pyramid: composite color + native Viking detail.
Run prepare-mars-map.py first. The high-frequency contribution comes from the
original 23,040-pixel-wide observational mosaic, without an unsharp mask.
"""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageFilter
root=Path(__file__).resolve().parents[2]
source=root/'tmp/hybrid-h4-mars/viking'
out=root/'public/assets/objects/planets/mars-observational-v3/mars'
out.mkdir(parents=True,exist_ok=True)
def linear(im):
 a=np.asarray(im,dtype=np.float32)/255
 return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
def encoded(a):
 a=np.clip(a,0,1)
 return Image.fromarray(np.uint8(np.where(a<=.0031308,a*12.92,1.055*a**(1/2.4)-.055)*255+.5))
def region(im,left,top,side=528):
 tile=im.crop((left,top,left+side,top+side))
 if left<0: tile.paste(im.crop((im.width+left,top,im.width,top+side)),(0,0))
 if left+side>im.width: tile.paste(im.crop((0,top,left+side-im.width,top+side)),(im.width-left,0))
 if top<0: tile.paste(tile.crop((0,-top,side,-top+1)).resize((side,-top)),(0,0))
 if top+side>im.height:
  row=im.height-top-1;tile.paste(tile.crop((0,row,side,row+1)).resize((side,side-row-1)),(0,row+1))
 return tile
manifest=json.loads((root/'src/perigee/planet/planet-manifest.json').read_text())
base=Image.open(root/'public'/manifest['baseUrl'].lstrip('/')/'mars/base.webp').convert('RGB')
composite=Image.open(root/'public/assets/objects/mars-hrsc-color-v1.webp').convert('RGB')
a=linear(composite)
b=linear(base.resize(composite.size,Image.Resampling.BILINEAR))
# MDIM high-pass luminance made terrain edges chalky after display calibration.
# Use its observational color only at the caps; retain native Viking terrain.
latitude=np.abs((np.arange(2048)+.5)/2048-.5)*180
polar=np.clip((latitude-68)/10,0,1);polar=polar*polar*(3-2*polar)
a=a*(1-polar[:,None,None])+b*np.array([1.12,1.02,.85],dtype=np.float32)*polar[:,None,None]
# Endpoint rows are one color each, preventing longitudinal pinching at poles.
a[0]=a[0].mean(axis=0);a[-1]=a[-1].mean(axis=0)
composite=encoded(a)
composite.save(root/'tmp/hybrid-h4-mars/hrsc/composite-polar-4k.png')
composite.resize((2048,1024),Image.Resampling.LANCZOS).save(out/'base.webp',quality=95)
files=[]
# Source tiles centered on 225,315,045,135 E map west to east in -180..180 E.
# Process one quadrant at a time; peak working storage is bounded.
for iy,hemi in enumerate(['n','s']):
 for ix,longitude in enumerate(['225','315','045','135']):
  native=Image.open(source/f'mars45{hemi}{longitude}.png').convert('RGB')
  for width in [4096,8192,16384]:
   size=width//4
   quadrant=native.resize((size,size),Image.Resampling.LANCZOS)
   originalLow=native.resize((1024,1024),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.55)).resize((size,size),Image.Resampling.BILINEAR)
   broad=composite.resize((width,width//2),Image.Resampling.BILINEAR)
   # Periodic padded global maps provide identical shared longitude borders.
   for ty in range(size//512):
    for tx in range(size//512):
     gx=ix*(size//512)+tx; gy=iy*(size//512)+ty
     left=gx*512-8;top=gy*512-8
     xs=np.arange(left,left+528)%width;ys=np.clip(np.arange(top,top+528),0,width//2-1)
     # Detail near quadrant boundaries fades over eight pixels. This avoids
     # introducing a discontinuity from separately filtered source quadrants.
     localx=np.clip(xs-ix*size,0,size-1);localy=np.clip(ys-iy*size,0,size-1)
     color=linear(region(broad,left,top))
     if width>4096:
      rgb=linear(region(quadrant,tx*512-8,ty*512-8))
      smooth=linear(region(originalLow,tx*512-8,ty*512-8))
      coeff=np.array([.2126,.7152,.0722],dtype=np.float32)
      ratio=np.clip((rgb@coeff)/np.maximum(smooth@coeff,.005),.55,1.65)
      lat=np.abs((ys+.5)/(width//2)-.5)*180
      weight=np.clip((68-lat)/8,0,1)[:,None]
      edge=np.minimum(np.minimum(localx,size-1-localx)[None,:],np.minimum(localy,size-1-localy)[:,None])
      weight=weight*np.clip(edge/8,0,1)
      color*=np.power(ratio,.45*weight)[:,:,None]
     p=out/str(width)/f'{gx}-{gy}.webp';p.parent.mkdir(exist_ok=True)
     encoded(color).save(p,quality=95)
     files.append({'file':str(p.relative_to(out)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
   print(hemi,longitude,width,flush=True)
(out/'provenance.json').write_text(json.dumps({'version':'mars-observational-v3','processing':'HRSC/TES/Viking luminance composite, MDIM polar color only at 68..78 degrees; native Viking detail ratio bounded .55..1.65 with exponent .45; no added MDIM high-pass contribution','sourceWidth':23040,'baseWidth':2048,'levels':[4096,8192,16384],'border':8,'base':{'file':'base.webp','sha256':hashlib.sha256((out/'base.webp').read_bytes()).hexdigest(),'bytes':(out/'base.webp').stat().st_size},'sourceRecord':'../../../mars-hrsc-color-v1.json','files':files},indent=2)+'\n')
