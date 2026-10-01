"""Inspect real saved exports; contact sheets preserve matched scale and crop."""
from pathlib import Path
import json, hashlib, os
import numpy as np
from PIL import Image,ImageDraw
out=Path('tmp/hybrid-h6-sun')/os.environ.get('PERIGEE_REVIEW_PASS','selected')
records=json.loads((out/'results.json').read_text())['records']
positions={r['name']:r['position'] for r in records if 'position' in r}
metrics=[]
for layout in ['desktop','mobile']:
    w,h=(1440,900) if layout=='desktop' else (390,844)
    p=positions[f'{layout}-portrait-0']
    for k in ['4k','8k']:
        for renderer in ['portrait','globe']:
            im=Image.open(out/f'{layout}-{renderer}-{k}.png').convert('RGB')
            scale=im.height/h
            cx,cy=p['x']*im.width,p['y']*im.height
            diam=p['diameterPixels']*scale
            for detail,dx,dy in [('native',0,0),('spot',-.28,.02),('limb',.48,0)]:
                side=640; x=round(cx+diam*dx-side/2); y=round(cy+diam*dy-side/2)
                im.crop((x,y,x+side,y+side)).save(out/f'{layout}-{renderer}-{k}-{detail}.png')
            im.thumbnail((1440,900)); im.save(out/f'{layout}-{renderer}-{k}-full.jpg',quality=94)
    for kind in ['0','4k-native','8k-native','8k-spot','8k-limb']:
        ims=[Image.open(out/f'{layout}-{r}-{kind}.png').convert('RGB') for r in ['portrait','globe']]
        pair=Image.new('RGB',(ims[0].width*2,ims[0].height+34),(7,10,17))
        d=ImageDraw.Draw(pair)
        for i,im in enumerate(ims):
            pair.paste(im,(i*im.width,34));d.text((i*im.width+12,10),['Fixed portrait','Sun H6 review globe'][i],fill='white')
        pair.save(out/f'{layout}-{kind}-side-by-side.png')
    # Same-scale globe pose crops; all acceptance full frames remain beside them.
    poses=['0','longitude-90','longitude-180','longitude-270','pole-north','pole-south','longitude-180-pole-north','balanced','safe','solarDays-2','solarDays-8','solarDays-4-solarEvolutionDays-4']
    sheet=Image.new('RGB',(4*330,3*365),(7,10,17));draw=ImageDraw.Draw(sheet)
    for i,pose in enumerate(poses):
        im=Image.open(out/f'{layout}-globe-{pose}.png')
        cx,cy=p['x']*w,p['y']*h;side=p['diameterPixels']*1.25
        im=im.crop((round(cx-side/2),round(cy-side/2),round(cx+side/2),round(cy+side/2)))
        im.thumbnail((330,330));x,y=(i%4)*330,(i//4)*365
        sheet.paste(im,(x,y+30));draw.text((x+8,y+8),pose,fill='white')
    sheet.save(out/f'{layout}-matrix.png')
    poles=[Image.open(out/f'{layout}-exact-pole-{pole}.png').convert('RGB') for pole in ['north','south']]
    sheet=Image.new('RGB',(w*2,h+34),(7,10,17));draw=ImageDraw.Draw(sheet)
    for i,im in enumerate(poles):
        sheet.paste(im,(i*w,34));draw.text((i*w+12,10),['Exact north pole','Exact south pole'][i],fill='white')
    sheet.save(out/f'{layout}-exact-poles.png')
    distances=['impossible','near-10-million','near-25-million','mercury','real']
    sheet=Image.new('RGB',(5*360,2*250),(7,10,17));draw=ImageDraw.Draw(sheet)
    for row,rend in enumerate(['portrait','globe']):
      for i,preset in enumerate(distances):
        name='0' if preset=='impossible' else preset
        im=Image.open(out/f'{layout}-{rend}-{name}.png');im.thumbnail((360,220))
        sheet.paste(im,(i*360,row*250+30));draw.text((i*360+8,row*250+8),f'{rend} / {preset}',fill='white')
    sheet.save(out/f'{layout}-distances.png')
    for obj in ['sun','moon','mars','jupiter','saturn','neptune','betelgeuse','sirius']:
        before=np.asarray(Image.open(Path('tmp/hybrid-h6-sun/baseline')/f'{layout}-{obj}.png')).astype(np.int16)
        after=np.asarray(Image.open(out/f'{layout}-preserved-{obj}.png')).astype(np.int16)
        metrics.append({'layout':layout,'object':obj,'maxChannelDifference':int(np.abs(before-after).max()),'changedChannels':int(np.count_nonzero(before-after))})
assert all(m['maxChannelDifference']==0 for m in metrics),metrics
# Verify original tree changes are limited to the review adapters and status doc.
hashes=json.loads(Path('tmp/hybrid-h6-sun/baseline/hashes.json').read_text())
changed=[p for p,sha in hashes.items() if not Path(p).is_file() or hashlib.sha256(Path(p).read_bytes()).hexdigest()!=sha]
assert set(changed)=={'src/perigee/objects/renderingPolicy.ts','src/perigee/objects/createCelestialObject.ts','scripts/hybrid-review/main.ts','docs/hybrid-rendering.md'},changed
(out/'preservation.json').write_text(json.dumps({'images':metrics,'changedStartingFiles':changed},indent=2)+'\n')
print('16 baseline frames pixel-identical; starting file changes limited to three Sun review adapters and the review-status document')
