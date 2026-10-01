"""Original synthetic photosphere, NOT observation. No portrait/source image pixels.
Periodic 3D cellular field sampled on a sphere: no baked limb, light, spots or sky.
Uses bundled numpy/Pillow; see docs/sun-hybrid-review.md for scientific limits.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageFilter

W, H = 4096, 2048
out = Path('public/assets/objects/sun-granulation-review-v1.webp')
rgb = np.empty((H, W, 3), dtype=np.uint8)

def fract(a): return a - np.floor(a)
def hash3(x,y,z,seed):
    return fract(np.sin(x*127.1+y*311.7+z*74.7+seed)*43758.5453)

def noise3(x,y,z,seed):
    ix,iy,iz=np.floor(x),np.floor(y),np.floor(z)
    fx,fy,fz=fract(x),fract(y),fract(z)
    fx,fy,fz=fx*fx*(3-2*fx),fy*fy*(3-2*fy),fz*fz*(3-2*fz)
    value=np.zeros(x.shape,dtype=np.float32)
    for dx in [0,1]:
      for dy in [0,1]:
       for dz in [0,1]:
        weight=(fx if dx else 1-fx)*(fy if dy else 1-fy)*(fz if dz else 1-fz)
        value+=weight*hash3(ix+dx,iy+dy,iz+dz,seed)
    return value

# Enlarged illustrative cells: visual scale chosen for the approved portrait.
# It does NOT assert 30km observational resolution or true granule-size fidelity.
scale = 64.
lon = np.arange(W, dtype=np.float32)[None,:] * (2*np.pi/W)
def render_field(px,py,pz):
    # Continuous domain warp breaks straight tessellation lanes. All terms
    # depend only on 3D body coordinates, so longitude and poles remain closed.
    wx=.22*np.sin(py*2.7+np.sin(pz*1.9))+.08*np.sin(pz*5.3+px)
    wy=.22*np.sin(pz*2.3+np.sin(px*2.1))+.08*np.sin(px*4.7+py)
    wz=.22*np.sin(px*2.9+np.sin(py*1.7))+.08*np.sin(py*5.1+pz)
    px,py,pz=px+wx,py+wy,pz+wz
    ix,iy,iz = np.floor(px),np.floor(py),np.floor(pz)
    d1 = np.full(px.shape,1e6,dtype=np.float32)
    d2 = d1.copy(); feature = d1.copy()
    for dx in [-1,0,1]:
      for dy in [-1,0,1]:
       for dz in [-1,0,1]:
        x,y,z=ix+dx,iy+dy,iz+dz
        sx=x+hash3(x,y,z,1); sy=y+hash3(x,y,z,7); sz=z+hash3(x,y,z,19)
        d=(sx-px)**2+(sy-py)**2+(sz-pz)**2
        closer=d<d1
        d2=np.where(closer,d1,np.minimum(d2,d))
        feature=np.where(closer,hash3(x,y,z,37),feature)
        d1=np.minimum(d1,d)
    # Band-limited body-space mottling disrupts smooth uniform cell interiors
    # and varies lane widths without adding seams or independent screen grain.
    mottling=noise3(px*3.2,py*3.2,pz*3.2,53)
    fine=noise3(px*7.1,py*7.1,pz*7.1,71)
    micro=noise3(px*13.7,py*13.7,pz*13.7,89)
    lanes = np.exp(-((np.sqrt(d2)-np.sqrt(d1))/(.13+.12*mottling))**2)
    t = np.clip(.80 - .25*lanes + .11*(feature-.5)
                + .18*np.exp(-d1*3) + .24*(mottling-.5)
                + .13*(fine-.5) + .07*(micro-.5),0,1)
    # Warm ivory; center/limb exposure belongs to shader, never map.
    return np.stack([np.rint(205+50*t),np.rint(119+132*t),np.rint(12+203*t)],axis=-1).astype(np.uint8)

for row in range(0,H,32):
    lat = (np.arange(row,min(row+32,H),dtype=np.float32)[:,None]/(H-1)-.5)*np.pi
    # Matches Three SphereGeometry's UV convention. flipY=false at runtime.
    px = -np.cos(lat)*np.cos(lon)*scale
    py = np.broadcast_to(np.sin(lat)*scale,px.shape)
    pz = np.cos(lat)*np.sin(lon)*scale
    rgb[row:row+len(lat)]=render_field(px,py,pz)
# Pad longitude periodically before mild photographic smoothing. No edge clamp
# creates a UV seam, and polar rows remain independent of longitude.
pad=4
image=Image.fromarray(np.concatenate([rgb[:,-pad:],rgb,rgb[:,:pad]],axis=1))
image=image.filter(ImageFilter.GaussianBlur(.4)).crop((pad,0,W+pad,H))
image.save(out,lossless=True,quality=100,method=6)
# Orthographic north/south patches sample the identical 3D field. They avoid
# the longitude singularity and finite anisotropic filtering at exact poles.
# Both cover x,z in [-.6,.6]; north is left, south right, row 0 has z=-.6.
cap_size=1024
caps=np.empty((cap_size,cap_size*2,3),dtype=np.uint8)
cap_x=np.linspace(-.6,.6,cap_size,dtype=np.float32)[None,:]
for row in range(0,cap_size,32):
    cap_z=np.linspace(-.6,.6,cap_size,dtype=np.float32)[row:row+32,None]
    x,z=np.broadcast_arrays(cap_x,cap_z)
    y=np.sqrt(np.maximum(0,1-x*x-z*z))
    for side,sign in enumerate([1,-1]):
        caps[row:row+len(cap_z),side*cap_size:(side+1)*cap_size]=render_field(x*scale,y*scale*sign,z*scale)
cap_out=out.with_name('sun-poles-review-v1.webp')
Image.fromarray(caps).filter(ImageFilter.GaussianBlur(.4)).save(cap_out,lossless=True,quality=100,method=6)
metadata={'kind':'original synthetic review-only art','width':W,'height':H,
 'projection':'equirectangular; row 0 south, row H-1 north; Three SphereGeometry UV; no ephemeris',
 'created':'2026-10-01','rights':'Project-authored MIT; no third-party pixels',
 'processing':'3D domain-warped jittered cells with multiscale body-space mottling, variable lanes, periodic 0.4px smoothing, bounded RGB grade, lossless WebP',
 'limits':'Artistic granule scale/contrast; not calibrated photometry, observed global map, or current activity',
 'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
 'polarAtlas':{'file':cap_out.name,'width':cap_size*2,'height':cap_size,
   'projection':'orthographic x/z [-0.6,0.6]; left north, right south; row 0 z=-0.6; same original 3D field',
   'sha256':hashlib.sha256(cap_out.read_bytes()).hexdigest()}}
out.with_suffix('.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(metadata)
