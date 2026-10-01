"""Original synthetic mottling, not solar granulation or measured Rigel geography.

Continuous warped 3D fields supply both the longitude map and orthographic poles.
No portrait pixels, telescope pixels, spots, cells, limb or optical halo are used.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

W, H = 4096, 2048
out = Path('public/assets/objects/rigel-mottling-review-v1.webp')

def noise(x, y, z):
    ix, iy, iz = np.floor(x), np.floor(y), np.floor(z)
    fx, fy, fz = x-ix, y-iy, z-iz
    fx, fy, fz = [v*v*v*(v*(v*6-15)+10) for v in (fx, fy, fz)]
    def hashed(a, b, c):
        v = np.sin(a*127.1+b*311.7+c*74.7)*43758.5453
        return v-np.floor(v)
    def lerp(a, b, t): return a+(b-a)*t
    return lerp(lerp(lerp(hashed(ix,iy,iz),hashed(ix+1,iy,iz),fx),
                     lerp(hashed(ix,iy+1,iz),hashed(ix+1,iy+1,iz),fx),fy),
                lerp(lerp(hashed(ix,iy,iz+1),hashed(ix+1,iy,iz+1),fx),
                     lerp(hashed(ix,iy+1,iz+1),hashed(ix+1,iy+1,iz+1),fx),fy),fz)

def field(x, y, z):
    # Vector domain warp bends smooth structures without grid-shaped cells.
    px = x+.018*(noise(x*13+4,y*13+7,z*13)-.5)
    py = y+.018*(noise(x*13,y*13+19,z*13+2)-.5)
    pz = z+.018*(noise(x*13+31,y*13,z*13+11)-.5)
    # Different orthonormal bases prevent aligned octave grids.
    a,b,c = .8*px+.6*py, -.6*px+.8*py, pz
    d,e,f = a, .8*b+.6*c, -.6*b+.8*c
    broad = noise(px*26+11,py*26+4,pz*26)-.5
    middle = noise(a*75,b*75+17,c*75+4)-.5
    fine = noise(d*170+7,e*170,f*170+19)-.5
    wisps = noise(px*375+13,py*375+3,pz*375)-.5
    t = np.clip(.57+.73*broad+.66*middle+.45*fine+.26*wisps,0,1)
    # Display sRGB grade only; scale and brightness are artistic choices.
    rgb = np.stack([119+133*t,164+89*t,244+10*t],axis=-1)
    return np.rint(rgb).astype(np.uint8)

pixels = np.empty((H,W,3),dtype=np.uint8)
longitude = np.arange(W,dtype=np.float64)[None,:]*2*np.pi/W
for row in range(0,H,32):
    latitude = (np.arange(row,min(row+32,H),dtype=np.float64)[:,None]/(H-1)-.5)*np.pi
    # Matches atan(z,-x) in the shader and top-down TextureCache decoding.
    x,z = -np.cos(latitude)*np.cos(longitude),np.cos(latitude)*np.sin(longitude)
    y = np.broadcast_to(np.sin(latitude),x.shape)
    pixels[row:row+len(latitude)] = field(x,y,z)
Image.fromarray(pixels).save(out,lossless=True,quality=100,method=6)

size = 1024
caps = np.empty((size,size*2,3),dtype=np.uint8)
cap_x = np.linspace(-.6,.6,size,dtype=np.float64)[None,:]
for row in range(0,size,32):
    cap_z = np.linspace(-.6,.6,size,dtype=np.float64)[row:row+32,None]
    x,z = np.broadcast_arrays(cap_x,cap_z)
    y = np.sqrt(np.maximum(0,1-x*x-z*z))
    for side,sign in enumerate([1,-1]):
        caps[row:row+len(cap_z),side*size:(side+1)*size] = field(x,y*sign,z)
cap_out = out.with_name('rigel-poles-review-v1.webp')
Image.fromarray(caps).save(cap_out,lossless=True,quality=100,method=6)
metadata = {
    'kind':'original synthetic Rigel review reconstruction',
    'created':'2026-10-01','rights':'Project-authored MIT; no third-party pixels',
    'width':W,'height':H,
    'projection':'equirectangular; row 0 south, last row north; atan(z,-x); no ephemeris',
    'processing':'quintic 3D value noise, vector domain warp, four spatial bands, bounded display sRGB grade, lossless WebP',
    'limits':'Invented mottling sizes, positions and contrast; no measured resolution, cell sizes, current pattern, convection model or calibrated photometry',
    'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
    'polarAtlas':{'file':cap_out.name,'width':size*2,'height':size,
        'projection':'same field; x/z [-0.6,0.6]; left north, right south; row 0 z=-0.6',
        'sha256':hashlib.sha256(cap_out.read_bytes()).hexdigest()}}
out.with_suffix('.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))
