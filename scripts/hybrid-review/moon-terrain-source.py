"""Derive bounded unit normals from the original NASA LOLA DEM, no added relief."""
from pathlib import Path
import sys,hashlib,json
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
root=Path(__file__).resolve().parents[2]
source=Path(sys.argv[1]);digest=hashlib.file_digest(source.open('rb'),'sha256').hexdigest()
assert digest=='0f40bce8b42864deddb6943a38474879e691d5b20647aa5e54c2612b23106499'
out=root/'tmp/hybrid-h4-moon/terrain-source';out.mkdir(exist_ok=True)
im=Image.open(source).convert('F')
# Work on the same global grid conventions. Fine normals retain measured rim
# slopes before final GPU filtering; physical heights and radius are unchanged.
width=8192;size=(width,width//2)
h=np.asarray(im.resize(size,Image.Resampling.BILINEAR),dtype=np.float32)*.5-10000
im.close();h[[0,-1]]=h[[0,-1]].mean(axis=1)[:,None]
lat=(.5-(np.arange(width//2,dtype=np.float32)+.5)/(width//2))*np.pi
step=1737400*np.maximum(np.cos(lat),np.sin(np.pi/(width//2)))*(2*np.pi/width)
east=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))/(2*step[:,None])
pad=np.pad(h,((1,1),(0,0)),mode='edge')
north=(pad[:-2]-pad[2:])/(2*1737400*np.pi/(width//2))
normals=np.stack([-east,-north,np.ones_like(h)],axis=2);normals/=np.linalg.norm(normals,axis=2,keepdims=True)
normals[[0,-1],:]=[0,0,1]
image=Image.fromarray(np.uint8(np.clip(normals*.5+.5,0,1)*255+.5))
files=[]
for w in [8192,4096]:
 p=out/f'lola-{w}-normal.webp';image.resize((w,w//2),Image.Resampling.BILINEAR).save(p,lossless=True,method=4)
 files.append({'path':p.name,'width':w,'height':w//2,'bytes':p.stat().st_size,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest()})
report={'source':'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_64_uint.tif','sha256':digest,'sourceDimensions':[23040,11520],'sourceUnits':'uint16 half metres; DN * .5 - 10000 metres relative to radius 1737400 m','sourceEpoch':'spring 2019','coverage':'global gridded LOLA, includes interpolation; not every cell is a laser measurement','projection':'equirectangular, east-positive, north-first, centered 0 longitude','normalGridWidth':width,'normalStrength':1,'heightGeometry':'unchanged original 4096 terrain-height.png','poles':'endpoint rows averaged; radial normals','processing':'bilinear resample to 8192, physical central-difference slopes with cosine latitude spacing, normalized tangent-space normals; 4096 alternative averages these vectors before GPU normalization','outputs':files}
(out/'provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
