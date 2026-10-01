"""Audit existing immutable lunar derivatives; no source pixels are modified."""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
base=ROOT/'public/assets/objects/planets/1b448275b234'
out=ROOT/'tmp/hybrid-h4-moon/asset-audit';out.mkdir(parents=True,exist_ok=True)
p=json.loads((base/'provenance.json').read_text())
files={k:v for k,v in p['outputs'].items() if k.startswith('moon/')}
for name,info in files.items():
 b=(base/name).read_bytes()
 assert hashlib.sha256(b).hexdigest()==info['sha256'],name
 assert len(b)==info['bytes'],name
height=np.asarray(Image.open(base/'moon/terrain-height.png'),dtype=float)
h=(height[:,:,0]*256+height[:,:,1])/65535*24000-12000
normal=np.asarray(Image.open(base/'moon/terrain-normal.webp'),dtype=float)/255*2-1
lat=(.5-(np.arange(2048)+.5)/2048)*np.pi
step=1737400*np.maximum(np.cos(lat),np.sin(np.pi/2048))*2*np.pi/4096
east=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))/(2*step[:,None])
pad=np.pad(h,((1,1),(0,0)),mode='edge');north=(pad[:-2]-pad[2:])/(2*1737400*np.pi/2048)
expected=np.stack([-east,-north,np.ones_like(h)],axis=2);expected/=np.linalg.norm(expected,axis=2,keepdims=True)
expected[[0,-1],:]=[0,0,1]
delta=np.abs(normal[20:-20]-expected[20:-20])
# Byte quantization + sub-metre quantization of the height field.
assert np.quantile(delta,.999)<.006
atlas=Image.new('RGB',(4096,2048))
for y in range(4):
 for x in range(8):atlas.paste(Image.open(base/f'moon/4096/{x}-{y}.webp').crop((8,8,520,520)),(x*512,y*512))
a=np.asarray(atlas,dtype=int)
# Named control points establish map orientation visually, not subpixel geodesy.
landmarks={'Tycho':(-11.36,-43.31),'Copernicus':(-20.08,9.62),'Plato':(-9.3,51.62),'Tsiolkovskiy':(128.97,-20.38)}
contact=Image.new('RGB',(768,384),'#111820');draw=ImageDraw.Draw(contact)
for i,(name,(lon,latitude)) in enumerate(landmarks.items()):
 x=round((lon+180)/360*4096);y=round((90-latitude)/180*2048)
 rect=(x-90,y-80,x+90,y+80)
 color=atlas.crop(rect).resize((192,170))
 terrain=Image.fromarray(np.uint8(np.clip((h-h.min())/(h.max()-h.min())*255,0,255))).crop(rect).resize((192,170))
 contact.paste(color,(i*192,22));contact.paste(terrain,(i*192,214))
 draw.text((i*192+5,5),name,fill='white');draw.text((i*192+5,196),'LOLA same coordinate',fill='white')
contact.save(out/'registration.png')
report={'version':'1b448275b234','count':len(files),'bytes':sum(v['bytes'] for v in files.values()),'originalSources':{k:v for k,v in p['sources'].items() if k.startswith('moon')},'originalMastersLocallyPresent':False,'heightRangeMetres':[float(h.min()),float(h.max())],'normalComponentErrorP999':float(np.quantile(delta,.999)),'heightPoleRange':[float(np.ptp(h[0])),float(np.ptp(h[-1]))],'colorWrapMeanAbsolute':float(abs(a[:,0]-a[:,-1]).mean()),'colorWrapMaximum':int(abs(a[:,0]-a[:,-1]).max()),'landmarkControls':landmarks,'notes':'Original source hashes are recorded provenance, not newly verified masters. Control points and derivatives verify orientation and relative registration, not subpixel absolute geodesy.'}
(out/'audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
