"""Social card derived from the exact accepted Sun export, no new surface art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
source=Image.open('tmp/hybrid-h6-sun/selected/desktop-globe-8k.png').convert('RGB')
height=round(source.width*630/1200)
top=(source.height-height)//2
card=source.crop((0,top,source.width,top+height)).resize((1200,630),Image.Resampling.LANCZOS)
draw=ImageDraw.Draw(card)
font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',11)
draw.text((22,584),'SUN · IMPOSSIBLE CLOSE PASS',font=font,fill=(214,225,239))
draw.text((22,601),'ROOFTOP · ARTISTIC RECONSTRUCTION',font=font,fill=(143,165,190))
draw.text((1125,601),'PERIGEE',font=font,fill=(170,191,212))
out=Path('public/assets/objects/social/sun.jpg')
card.save(out,quality=94,subsampling=0)
print(out,card.size)
