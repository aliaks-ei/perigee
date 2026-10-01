"""Verify source boundaries/preservation and assemble native exported comparisons."""
import hashlib
import json
import os
import shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
output=ROOT/'tmp/hybrid-h4-neptune'/os.environ.get('PERIGEE_REVIEW_PASS','review-v9')
assets=ROOT/'public/assets/objects'
metadata=json.loads((assets/'neptune-voyager-reconstruction-v4.json').read_text())
map_path=assets/metadata['output']['file']
assert hashlib.sha256(map_path.read_bytes()).hexdigest()==metadata['output']['sha256']
assert hashlib.sha256(Path(__file__).with_name('prepare-neptune-map.py').read_bytes()).hexdigest()==metadata['recipeSha256']
a=np.asarray(Image.open(map_path),dtype=int)
audit={'dimensions':[a.shape[1],a.shape[0]],'wrapMaximumDifference':int(abs(a[:,0]-a[:,-1]).max()),
       'northRowSpread':int(np.ptp(a[0],axis=0).max()),'southRowSpread':int(np.ptp(a[-1],axis=0).max())}
assert audit['wrapMaximumDifference']<=2 and audit['northRowSpread']==0 and audit['southRowSpread']==0
(output/'source-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
preserved=[]
for layout,rect in [('desktop',(802,264,946,410)),('mobile',(126,196,263,328))]:
    for body in ['jupiter','saturn','mars','neptune']:
        before=ROOT/'tmp/hybrid-h4-neptune/review-v2'/f'{layout}-preserved-{body}.png'
        after=output/f'{layout}-preserved-{body}.png'
        delta=abs(np.asarray(Image.open(before),dtype=int)-np.asarray(Image.open(after),dtype=int))
        preserved.append({'layout':layout,'body':body,'maximumRgbDifference':int(delta.max())})
        assert delta.max()==0
    reference=Image.open(output/f'{layout}-portrait-4k-detail.png')
    globe=Image.open(output/f'{layout}-4k-detail.png')
    pair=Image.new('RGB',(reference.width*2,reference.height))
    pair.paste(reference);pair.paste(globe,(reference.width,0))
    pair.save(output/f'{layout}-approval-comparison.png')
    shots=[]
    for view in ['quarter-90','quarter-180','quarter-270','pole-north','pole-south']:
        image=Image.open(output/f'{layout}-{view}-4k.png')
        scale=image.width/(1440 if layout=='desktop' else 390)
        shots.append((view,image.crop(tuple(round(v*scale) for v in rect))))
    w,h=shots[0][1].size
    contact=Image.new('RGB',(w*3,(h+24)*2),'#0c1118');draw=ImageDraw.Draw(contact)
    for i,(name,image) in enumerate(shots):
        x=i%3*w;y=i//3*(h+24)
        draw.text((x+8,y+6),name,fill='white');contact.paste(image,(x,y+24))
    contact.save(output/f'{layout}-export-inspection.png')
(output/'preservation.json').write_text(json.dumps(preserved,indent=2)+'\n')
files=['src/perigee/materials/NeptuneGlobeMaterial.ts','src/perigee/materials/NeptuneAtmosphereMaterial.ts',
       'src/perigee/objects/renderingPolicy.ts','src/perigee/objects/createCelestialObject.ts',
       'scripts/hybrid-review/prepare-neptune-map.py']
files += [str(p.relative_to(ROOT)) for p in assets.glob('neptune*v4*')]
for filename in files:
    target=output/'implementation'/filename
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(ROOT/filename,target)
print(json.dumps({'source':audit,'preservation':preserved},indent=2))
