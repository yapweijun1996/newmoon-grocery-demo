"""Raster masters for the fictitious packs. Run with Python 3 + Pillow."""
import json, math, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
CATALOG = json.loads((ROOT/'catalog.json').read_text())
PAPER = ['#6e2538','#efc9b4','#eadbb6','#254e48','#933e30','#163f3c']
INK = ['#ffedc9','#42252a','#3b3b31','#ffeacc','#ffe4b9','#fff1cd']
FOIL = ['#d69a63','#a5664a','#a48049','#a9bf91','#e9a965','#d6ab65']
TITLES = ['Abalone','Beauty Essence',"Bird’s Nest",'Health Tonic','Festive Hamper','Gift Collection']
SUB = ['TWIN TIN SELECTION','COLLAGEN COLLECTION','PRESERVE COLLECTION','BOTANICAL COLLECTION','LUNAR NEW YEAR','PANTRY & PROVISIONS']

def font(size, serif=False):
    paths = [os.getenv('SERIF_FONT' if serif else 'SANS_FONT',''), '/System/Library/Fonts/Supplemental/'+('Baskerville.ttc' if serif else 'Arial.ttf'), '/usr/share/fonts/truetype/dejavu/'+('DejaVuSerif.ttf' if serif else 'DejaVuSans.ttf')]
    return ImageFont.truetype(next(p for p in paths if p and Path(p).exists()),size)

def make(i, product):
    w,h=800,600
    im=Image.new('RGB',(w,h),PAPER[i]); d=ImageDraw.Draw(im); ink=INK[i]; foil=FOIL[i]
    def text(y,s,size,serif=False): d.text((400,y),s,font=font(size,serif),fill=ink,anchor='mm')
    # An engraved rising sun and an imaginary archipelago; the line weights survive mipmapping.
    d.ellipse((378,414,422,458),outline=foil,width=3)
    for k in range(15):
        vals=[]
        for x in range(30,772,4):
            X=x/800; y=max(420,494-50*math.sin(1.6*math.pi*X+1.1)-24*math.cos(X*math.pi*6)) + k*5
            vals.append((x,min(566,y)))
        d.line(vals,fill=foil,width=2)
    for a in [15,27]: d.rectangle((a,a,w-a-1,h-a-1),outline=foil,width=3 if a==15 else 1)
    for x in [38,762]:
        for y in [38,562]: d.polygon([(x,y-5),(x+5,y),(x,y+5),(x-5,y)],fill=foil)
    text(77,'N E W   M O O N',34,True); text(119,'NEW MOON (placeholder pack art)',24)
    d.line((277,157,523,157),fill=foil,width=2); text(223,TITLES[i],85,True); text(300,'  '.join(SUB[i].split(' ')),23)
    text(373,'S I N G A P O R E    /    N °  0'+str(i+1),19)
    path=ROOT/product['slug']; path.mkdir(exist_ok=True); im.save(path/'label.png',optimize=True)

if __name__=='__main__':
    for i,p in enumerate(CATALOG): make(i,p)
