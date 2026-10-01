"""Matched complete frames and unscaled details from actual saved PNG exports."""
from pathlib import Path
import hashlib
import json
import os
import numpy as np
from PIL import Image, ImageDraw

out=Path('tmp/hybrid-h6-rigel')/os.environ.get('PERIGEE_REVIEW_PASS','selected')
records=json.loads((out/'results.json').read_text())['records']
positions={r['name']:r['position'] for r in records if 'position' in r}
metrics=[]
for layout in ['desktop','mobile']:
    w,h=(1440,900) if layout=='desktop' else (390,844)
    p=positions[f'{layout}-portrait-0']
    for k in ['4k','8k']:
        for renderer in ['portrait','globe']:
            im=Image.open(out/f'{layout}-{renderer}-{k}.png').convert('RGB')
            cx,cy=p['x']*im.width,p['y']*im.height
            diam=p['diameterPixels']*im.height/h
            for detail,offset,side in [('native',0,640),('surface',0,160),('limb',.50,160),('halo',.58,160)]:
                x,y=round(cx+diam*offset-side/2),round(cy-side/2)
                im.crop((x,y,x+side,y+side)).save(out/f'{layout}-{renderer}-{k}-{detail}.png')
            im.thumbnail((1440,900));im.save(out/f'{layout}-{renderer}-{k}-full.jpg',quality=94)
    for kind in ['0','4k-native','8k-native','8k-surface','8k-limb','8k-halo']:
        ims=[Image.open(out/f'{layout}-{r}-{kind}.png').convert('RGB') for r in ['portrait','globe']]
        pair=Image.new('RGB',(ims[0].width*2,ims[0].height+34),(7,10,17));d=ImageDraw.Draw(pair)
        for i,im in enumerate(ims):
            pair.paste(im,(i*im.width,34));d.text((i*im.width+8,10),['Fixed portrait','Rigel review globe'][i],fill='white')
        pair.save(out/f'{layout}-{kind}-side-by-side.png')
    poses=['0','longitude-90','longitude-180','longitude-270','pole-north','pole-south','longitude-180-pole-north','balanced','safe','exact-north','exact-south']
    sheet=Image.new('RGB',(4*256,3*286),(7,10,17));d=ImageDraw.Draw(sheet)
    for i,pose in enumerate(poses):
        name=f'{layout}-exact-pole-{pose[6:]}' if pose.startswith('exact-') else f'{layout}-globe-{pose}'
        im=Image.open(out/f'{name}.png');cx,cy=p['x']*w,p['y']*h;side=p['diameterPixels']*1.45
        # Enlargement is explicitly a preview, not native-detail evidence.
        im=im.crop((round(cx-side/2),round(cy-side/2),round(cx+side/2),round(cy+side/2))).resize((256,256))
        x,y=(i%4)*256,(i//4)*286;sheet.paste(im,(x,y+30));d.text((x+8,y+8),pose,fill='white')
    sheet.save(out/f'{layout}-matrix.png')
    sheet=Image.new('RGB',(5*360,2*250),(7,10,17));d=ImageDraw.Draw(sheet)
    for row,rend in enumerate(['portrait','globe']):
        for i,preset in enumerate(['impossible','near-25-au','near-100-au','near-1000-au','real']):
            name='0' if preset=='impossible' else preset
            im=Image.open(out/f'{layout}-{rend}-{name}.png');im.thumbnail((360,220))
            sheet.paste(im,(i*360,row*250+30));d.text((i*360+8,row*250+8),f'{rend} / {preset}',fill='white')
    sheet.save(out/f'{layout}-distances.png')
    if out.name!='inspection':
        for obj in ['rigel','moon','mars','jupiter','saturn','neptune','betelgeuse','sirius','sun']:
            before=np.asarray(Image.open(Path('tmp/hybrid-h6-rigel/baseline')/f'{layout}-preserved-{obj}.png')).astype(np.int16)
            after=np.asarray(Image.open(out/f'{layout}-preserved-{obj}.png')).astype(np.int16)
            metrics.append({'layout':layout,'object':obj,'maxChannelDifference':int(np.abs(before-after).max()),'changedChannels':int(np.count_nonzero(before-after))})
if out.name!='inspection':
    assert all(m['maxChannelDifference']==0 for m in metrics),metrics
    hashes=json.loads(Path('tmp/hybrid-h6-rigel/baseline/hashes.json').read_text())
    changed=[p for p,sha in hashes.items() if not Path(p).is_file() or hashlib.sha256(Path(p).read_bytes()).hexdigest()!=sha]
    allowed={'src/perigee/objects/renderingPolicy.ts','src/perigee/objects/createCelestialObject.ts','scripts/hybrid-review/main.ts','docs/hybrid-rendering.md'}
    assert set(changed)<=allowed,changed
    (out/'preservation.json').write_text(json.dumps({'images':metrics,'changedStartingFiles':changed},indent=2)+'\n')
print('Generated complete-frame previews and native surface/limb/halo pairs; preservation records:',len(metrics))
