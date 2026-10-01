"""Protect the selected Sun, portrait rollback and every pre-existing dirty file."""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
root=Path('tmp/hybrid-h6-sun');out=root/'promoted'
metrics=[]
for layout in ['desktop','mobile']:
    for obj in ['sun','moon','mars','jupiter','saturn','neptune','betelgeuse','sirius','portrait-rollback']:
        ref=(root/'selected'/f'{layout}-globe-0.png' if obj=='sun' else
             root/'baseline'/f'{layout}-sun.png' if obj=='portrait-rollback' else root/'baseline'/f'{layout}-{obj}.png')
        before=np.asarray(Image.open(ref)).astype(np.int16)
        after=np.asarray(Image.open(out/f'{layout}-{obj}.png')).astype(np.int16)
        delta=int(np.abs(before-after).max())
        assert delta==0,(layout,obj,delta)
        metrics.append({'layout':layout,'object':obj,'maxChannelDifference':delta})
    im=Image.open(out/f'{layout}-product-capture.png').convert('RGB')
    assert im.size==((7680,4800) if layout=='desktop' else (3549,7680)),im.size
    # Native crops of the saved public download; centre, spot group and limb.
    position=json.loads((out/'production-results.json').read_text())['records'][0 if layout=='desktop' else 1]['production']['position']
    width=1440 if layout=='desktop' else 390
    cx,cy=im.width*position['x'],im.height*position['y']
    diameter=position['diameterPixels']*im.width/width
    for name,dx in [('native',0),('spot',-.28),('limb',.48)]:
        x,y=round(cx+diameter*dx-320),round(cy-320)
        im.crop((x,y,x+640,y+640)).save(out/f'{layout}-product-{name}.png')
    im.thumbnail((1440,900));im.save(out/f'{layout}-product-full.jpg',quality=94)
before=json.loads((out/'before-hashes.json').read_text())
changed=[p for p,sha in before.items() if not Path(p).is_file() or hashlib.sha256(Path(p).read_bytes()).hexdigest()!=sha]
allowed={'src/perigee/objects/renderingPolicy.ts','app/data/objects.ts','app/data/objectEditorial.ts',
 'app/data/editorial.ts','src/perigee/AssetManifest.ts','app/pages/method.vue','public/assets/ATTRIBUTIONS.md',
 'docs/hybrid-rendering.md','docs/sun-hybrid-review.md','tests/sun-hybrid.test.ts','tests/planet-assets.test.ts',
 'tests/celestial-motion.test.ts','tests/sirius-hybrid.test.ts','scripts/hybrid-review/thumbnail.mjs',
 'scripts/hybrid-review/sun.html','assets/css/perigee.css'}
assert not set(changed)-allowed,changed
for p,sha in json.loads((root/'selected/results.json').read_text())['sourceHashes'].items():
    assert hashlib.sha256(Path(p).read_bytes()).hexdigest()==sha,p
(out/'preservation.json').write_text(json.dumps({'frames':metrics,'changedStartingFiles':changed,
 'acceptedMaterialAndTextures':'byte-identical','allOtherStartingFiles':'byte-identical'},indent=2)+'\n')
print('18 frames pixel-identical; selected Sun art/material and all unrelated starting files unchanged')
