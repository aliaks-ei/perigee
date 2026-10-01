"""Matched saved-image evidence. All crops use common coordinates; no fidelity score."""
from pathlib import Path
import os,json
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
out=ROOT/'tmp/hybrid-h4-moon'/os.environ.get('PERIGEE_REVIEW_PASS','review-v5')
metrics=[]
for layout,rect in [('desktop',(830,296,918,384)),('mobile',(150,216,240,310))]:
 live=Image.open(out/f'{layout}-globe-0.png').convert('RGB');ref=Image.open(out/f'{layout}-portrait-0.png').convert('RGB')
 full=Image.open(out/f'{layout}-globe-4k.png').convert('RGB')
 saved=full.resize(live.size,Image.Resampling.LANCZOS)
 diff=np.asarray(saved.crop(rect),dtype=float)-np.asarray(live.crop(rect),dtype=float)
 metrics.append({'layout':layout,'rgbMeanAbsolute':float(abs(diff).mean()),'rgbMeanSigned':diff.mean(axis=(0,1)).tolist(),'scope':'live versus saved parity, not visual acceptance'})
 for size in ['4k','8k']:
  for renderer in ['portrait','globe']:
   path=out/f'{layout}-{renderer}-{size}.png'
   if not path.exists():continue
   im=Image.open(path);scale=im.width/live.width
   im.crop(tuple(round(v*scale) for v in rect)).save(out/f'{layout}-{renderer}-{size}-detail.png')
   im.thumbnail((1440,1000));im.save(out/f'{layout}-{renderer}-{size}-full.jpg',quality=95)
 a=Image.open(out/f'{layout}-portrait-4k-detail.png');b=Image.open(out/f'{layout}-globe-4k-detail.png')
 pair=Image.new('RGB',(a.width*2,a.height+28),'#10161f');d=ImageDraw.Draw(pair)
 for i,(name,im) in enumerate([('APPROVED PORTRAIT',a),('REVIEW GLOBE',b)]):
  pair.paste(im,(i*a.width,28));d.text((i*a.width+8,8),name,fill='white')
 pair.save(out/f'{layout}-approval-comparison.png')
 comparison=Image.new('RGB',(live.width*2,live.height+28),'#10161f');comparison.paste(ref,(0,28));comparison.paste(live,(live.width,28));comparison.save(out/f'{layout}-full-comparison.jpg',quality=96)
 names=['globe-0','globe-90','globe-180','globe-270','globe-balanced','globe-safe','fade','returned']
 w,h=rect[2]-rect[0],rect[3]-rect[1]
 sheet=Image.new('RGB',(w*4,(h+24)*2),'#10161f');d=ImageDraw.Draw(sheet)
 for i,name in enumerate(names):
  im=Image.open(out/f'{layout}-{name}.png').crop(rect);x=i%4*w;y=i//4*(h+24)
  sheet.paste(im,(x,y+24));d.text((x+3,y+4),name,fill='white')
 sheet.save(out/f'{layout}-live-inspection.png')
 detail_names=['quarter-90','quarter-180','quarter-270','pole-north','pole-south']
 images=[]
 for name in detail_names:
  path=out/f'{layout}-{name}-4k.png'
  if not path.exists():continue
  im=Image.open(path);scale=im.width/live.width
  crop=im.crop(tuple(round(v*scale) for v in rect));crop.save(out/f'{layout}-{name}-detail.png');images.append((name,crop))
 if images:
  w,h=images[0][1].size;sheet=Image.new('RGB',(w*3,(h+24)*2),'#10161f');d=ImageDraw.Draw(sheet)
  for i,(name,im) in enumerate(images):x=i%3*w;y=i//3*(h+24);sheet.paste(im,(x,y+24));d.text((x+5,y+5),name,fill='white')
  sheet.save(out/f'{layout}-export-inspection.png')
(out/'capture-parity.json').write_text(json.dumps(metrics,indent=2)+'\n')
print(json.dumps(metrics,indent=2))
