"""Verify preserved production references and archive the selected implementation."""
import hashlib,json,shutil
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];out=ROOT/'tmp/hybrid-h4-moon/review-v5'
records=[]
for layout in ['desktop','mobile']:
 for body in ['mars','jupiter','saturn','neptune']:
  old=ROOT/'tmp/hybrid-h4-neptune/promoted'/f'{layout}-{("production-reference" if body=="neptune" else "preserved-"+body)}.png'
  new=out/f'{layout}-preserved-{body}.png'
  delta=abs(np.asarray(Image.open(old),dtype=int)-np.asarray(Image.open(new),dtype=int))
  records.append({'layout':layout,'body':body,'maxRgb':int(delta.max()),'meanRgb':float(delta.mean())})
  assert delta.max()==0,(layout,body,delta.max())
 a=np.asarray(Image.open(ROOT/f'tmp/hybrid-h4-moon/pass1/{layout}-portrait-0.png'),dtype=int)
 b=np.asarray(Image.open(out/f'{layout}-portrait-0.png'),dtype=int)
 assert not np.any(a-b),'Moon portrait changed'
 records.append({'layout':layout,'body':'moon-portrait','maxRgb':int(abs(a-b).max())})
(out/'preservation.json').write_text(json.dumps(records,indent=2)+'\n')
baseline=json.loads((ROOT/'tmp/hybrid-h4-moon/baseline/hashes.json').read_text())
changed=[p for p,h in baseline.items() if not (ROOT/p).is_file() or hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h]
allowed={'src/perigee/objects/renderingPolicy.ts','src/perigee/objects/createCelestialObject.ts','src/perigee/objects/CelestialObject.ts','src/perigee/PerigeeScene.ts','app/data/objectMotion.ts','scripts/hybrid-review/main.ts','docs/hybrid-rendering.md','public/assets/ATTRIBUTIONS.md'}
assert set(changed)<=allowed,changed
(out/'source-preservation.json').write_text(json.dumps({'changedStartingFiles':changed,'allOtherStartingFilesUnchanged':True},indent=2)+'\n')
files=list(allowed)+['src/perigee/materials/MoonGlobeMaterial.ts','docs/moon-hybrid-review.md','tests/moon-hybrid.test.ts']
files+=[str(p.relative_to(ROOT)) for p in (ROOT/'scripts/hybrid-review').glob('moon*')]
hashes={}
for name in files:
 p=ROOT/name;dest=out/'implementation'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest);hashes[name]=hashlib.sha256(p.read_bytes()).hexdigest()
(out/'implementation-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
print(json.dumps(records,indent=2));print('Changed starting files:',changed)
