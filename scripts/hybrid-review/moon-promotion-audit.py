"""Preserve the accepted candidate and all other starting changes during promotion."""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2];out=root/'tmp/hybrid-h4-moon/promoted';ref=root/'tmp/hybrid-h4-moon/review-v5'
records=[]
for layout in ['desktop','mobile']:
 for body in ['moon','mars','jupiter','saturn','neptune']:
  a=ref/f'{layout}-{("globe-0" if body=="moon" else "preserved-"+body)}.png'
  b=out/f'{layout}-{("production-reference" if body=="moon" else "preserved-"+body)}.png'
  delta=abs(np.asarray(Image.open(a),dtype=int)-np.asarray(Image.open(b),dtype=int))
  assert delta.max()==0,(layout,body,delta.max())
  records.append({'layout':layout,'body':body,'maxRgb':int(delta.max())})
accepted=json.loads((ref/'implementation-hashes.json').read_text())
material='src/perigee/materials/MoonGlobeMaterial.ts'
assert hashlib.sha256((root/material).read_bytes()).hexdigest()==accepted[material]
baseline=json.loads((root/'tmp/hybrid-h4-moon/baseline/hashes.json').read_text())
changed=[p for p,h in baseline.items() if not (root/p).is_file() or hashlib.sha256((root/p).read_bytes()).hexdigest()!=h]
allowed={'src/perigee/objects/renderingPolicy.ts','src/perigee/objects/createCelestialObject.ts','src/perigee/objects/CelestialObject.ts','src/perigee/PerigeeScene.ts','app/data/objectMotion.ts','scripts/hybrid-review/main.ts','docs/hybrid-rendering.md','public/assets/ATTRIBUTIONS.md','app/data/objects.ts','app/data/editorial.ts','app/data/objectEditorial.ts','app/pages/method.vue','src/perigee/AssetManifest.ts','tests/celestial-motion.test.ts','tests/planet-assets.test.ts','tests/scene-transitions.test.ts','scripts/hybrid-review/thumbnail.mjs','assets/css/perigee.css'}
assert set(changed)<=allowed,changed
report={'references':records,'acceptedMaterialUnchanged':True,'changedStartingFiles':changed,'allOtherStartingFilesUnchanged':True}
(out/'preservation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
