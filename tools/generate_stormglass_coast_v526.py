#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, math, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'games/the-legend-of-more-bounce'
OUT=GAME/'assets/snes-v526'; AUDIO=GAME/'assets/audio-v526'; ADV=GAME/'adventure'; RUNTIME=GAME/'runtime'
for p in (OUT,AUDIO,ADV,RUNTIME): p.mkdir(parents=True, exist_ok=True)
P={
 't':(0,0,0,0),'ink':(8,13,24,255),'night':(15,27,48,255),'deepblue':(24,53,79,255),'sea':(42,112,146,255),
 'cyan':(83,211,224,255),'foam':(201,244,235,255),'sky':(105,181,208,255),'glass':(128,229,211,255),
 'sand':(221,193,129,255),'gold':(245,202,82,255),'coral':(218,111,97,255),'plum':(88,54,104,255),
 'purple':(135,82,158,255),'brown':(92,67,53,255),'wood':(151,106,69,255),'stone':(94,107,119,255),
 'lightstone':(151,167,171,255),'green':(67,131,92,255),'mint':(133,220,169,255),'white':(244,246,232,255),
 'red':(190,67,77,255),'black':(6,8,14,255)
}
def px(d,x,y,w,h,c): d.rectangle((x,y,x+w-1,y+h-1),fill=P[c])
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

# Sable Current — Tidekeeper, 4x24x32
fw,fh=24,32
sheet=Image.new('RGBA',(fw*4,fh),P['t'])
for i in range(4):
    im=Image.new('RGBA',(fw,fh),P['t']); d=ImageDraw.Draw(im); bob=[0,-1,0,1][i]
    # sea-dark hair and shell clasp
    px(d,5,5+bob,14,8,'deepblue'); px(d,7,3+bob,10,4,'sea'); px(d,8,9+bob,8,7,'sand')
    px(d,9,11+bob,2,2,'ink'); px(d,14,11+bob,2,2,'ink'); px(d,10,15+bob,5,2,'coral')
    px(d,6,16+bob,12,9,'cyan'); px(d,4,18+bob,4,7,'glass'); px(d,16,18+bob,4,7,'glass')
    px(d,8,25+bob,4,6,'brown'); px(d,13,25+bob,4,6,'brown')
    px(d,17,5+bob,4,4,'gold'); px(d,18,6+bob,2,2,'foam')
    sheet.alpha_composite(im,(i*fw,0))
sheet.save(OUT/'sable-current-npc.v0.1.png'); sheet.resize((sheet.width*4,sheet.height*4),Image.Resampling.NEAREST).save(OUT/'sable-current-npc.preview.png')

# Stormglass items: Tideglass Shell, Gale Mantle, Pressure Prism, Stormglass Compass, Lighthouse Star
items=Image.new('RGBA',(80,16),P['t']); d=ImageDraw.Draw(items)
# shell
for r,c in [(6,'glass'),(4,'cyan'),(2,'white')]: d.arc((2+6-r,8-r,2+6+r,8+r),200,520,fill=P[c],width=1)
px(d,6,8,5,5,'sea')
# mantle
px(d,18,3,10,11,'purple'); px(d,20,5,6,7,'glass'); px(d,17,4,2,8,'gold'); px(d,28,4,2,8,'gold')
# pressure prism
px(d,36,2,8,12,'cyan'); px(d,38,4,4,8,'foam'); px(d,34,7,12,2,'gold')
# compass
px(d,50,2,12,12,'gold'); px(d,52,4,8,8,'deepblue'); d.line((56,5,58,10),fill=P['foam'],width=1); d.line((56,5,54,9),fill=P['coral'],width=1)
# lighthouse star
px(d,68,6,12,3,'gold'); px(d,72,1,3,13,'gold'); px(d,70,4,7,7,'foam'); px(d,72,6,3,3,'white')
items.save(OUT/'stormglass-items.v0.1.png'); items.resize((items.width*5,items.height*5),Image.Resampling.NEAREST).save(OUT/'stormglass-items.preview.png')

# Stormglass Coast overworld map 320x180 -> 640x360
im=Image.new('RGBA',(320,180),P['sky']); d=ImageDraw.Draw(im)
# ocean south/east with wave bands
px(d,0,108,320,72,'sea')
for y in (114,126,139,154,169):
    for x in range((y*3)%18,320,24): d.arc((x,y,x+18,y+7),180,350,fill=P['foam'],width=1)
# cliffs / land mass
land=[(0,0),(320,0),(320,81),(292,84),(274,95),(247,89),(226,101),(201,96),(180,108),(155,100),(132,111),(108,101),(87,113),(62,103),(39,112),(0,104)]
d.polygon(land,fill=P['green'])
# cliff edge
for x,y in [(0,104),(39,112),(62,103),(87,113),(108,101),(132,111),(155,100),(180,108),(201,96),(226,101),(247,89),(274,95),(292,84),(320,81)]:
    d.ellipse((x-4,y-3,x+5,y+4),fill=P['stone']); d.point((x,y-2),fill=P['lightstone'])
# coast grass/glass flora texture
rng=np.random.default_rng(260526)
for _ in range(420):
    x=int(rng.integers(4,316)); y=int(rng.integers(10,104))
    if im.getpixel((x,y))[:3] == P['green'][:3]:
        c=['mint','deepblue','gold','glass'][int(rng.integers(0,4))]; d.point((x,y),fill=P[c])
# winding shell road
road=[(18,78),(52,72),(82,82),(110,69),(141,73),(172,55),(205,62),(237,47),(270,55),(302,39)]
d.line(road,fill=P['brown'],width=13); d.line(road,fill=P['sand'],width=9); d.line(road,fill=P['gold'],width=3)
# pier
d.rectangle((26,91,64,98),fill=P['wood'])
for x in range(29,64,7): d.line((x,98,x,111),fill=P['brown'],width=2)
# tidekeeper hut
px(d,45,54,26,18,'wood'); d.polygon([(42,55),(58,43),(74,55)],fill=P['deepblue']); px(d,53,61,7,11,'brown'); px(d,64,58,5,5,'cyan')
# shell grotto / tide cave
px(d,122,73,22,17,'stone'); d.ellipse((127,76,140,90),fill=P['night']); px(d,128,78,11,3,'cyan')
# lighthouse
px(d,270,20,18,47,'white'); px(d,274,12,10,12,'gold'); px(d,268,17,22,7,'deepblue'); px(d,273,39,12,7,'sky'); px(d,274,55,10,12,'brown')
# wind turbines / tide vanes
for x,y in [(178,41),(224,33)]:
    px(d,x,y,4,30,'lightstone'); px(d,x-2,y-3,8,6,'gold')
    for dx,dy in [(-12,-10),(12,-10),(-12,10),(12,10)]: d.line((x+2,y,x+2+dx,y+dy),fill=P['foam'],width=1)
# shell nodes
for x,y in [(92,45),(158,87),(238,73)]:
    d.ellipse((x-3,y-2,x+4,y+3),outline=P['glass'],fill=P['cyan']); d.point((x+1,y),fill=P['white'])
# glassgrass clusters
for x,y in [(104,57),(190,77),(251,42),(75,92)]:
    for q in range(6): d.line((x+q*2,y+4,x+q*2+1,y-(q%3)*2),fill=P['glass'],width=1)
im2=im.resize((640,360),Image.Resampling.NEAREST); im2.save(OUT/'stormglass-coast.map.v0.1.png'); im2.resize((1280,720),Image.Resampling.NEAREST).save(OUT/'stormglass-coast.map-preview-2x.png')

# Stormglass Cliffs side-view 672x180
st=Image.new('RGBA',(336,90),P['sky']); d=ImageDraw.Draw(st)
# sea horizon
px(d,0,50,336,40,'sea')
for y in (53,60,68,78):
    for x in range((y*5)%22,336,30): d.arc((x,y,x+20,y+6),180,350,fill=P['foam'],width=1)
# far islands/cliffs
for x,h in [(0,22),(45,12),(92,18),(144,14),(210,20),(278,16)]: d.polygon([(x,52),(x+24,52-h),(x+48,52)],fill=P['deepblue'])
# stormglass cliff platforms; gaps intentionally exceed ordinary run step
for x,w,y in [(10,43,59),(76,36,47),(139,39,36),(207,37,47),(272,50,34)]:
    d.rectangle((x,y,x+w,y+4),fill=P['glass']); d.rectangle((x+2,y+5,x+w-2,y+12),fill=P['stone']);
    for xx in range(x+5,x+w-2,7): d.line((xx,y+10,xx+2,y+16),fill=P['deepblue'])
# wind ribbons = dash cues
for x,y in [(59,41),(119,32),(183,40),(251,29)]:
    d.arc((x,y,x+19,y+7),180,350,fill=P['foam'],width=2); d.arc((x+4,y+5,x+25,y+12),180,350,fill=P['cyan'],width=1)
# pressure prisms on route
for x,y in [(100,40),(224,40),(302,27)]: px(d,x,y,5,10,'cyan'); px(d,x+1,y+2,3,6,'foam'); px(d,x-2,y+4,9,2,'gold')
# lighthouse target
px(d,312,10,12,32,'white'); px(d,310,7,16,6,'deepblue'); px(d,315,4,6,5,'gold')
st2=st.resize((672,180),Image.Resampling.NEAREST); st2.save(OUT/'stormglass-cliffs.stage.v0.1.png'); st2.resize((1344,360),Image.Resampling.NEAREST).save(OUT/'stormglass-cliffs.stage-preview-2x.png')

# Tide Engine first-person room
room=Image.new('RGBA',(320,180),P['night']); d=ImageDraw.Draw(room)
for y in range(0,124,12): d.rectangle((0,y,319,y+11),fill=P['deepblue'] if (y//12)%2 else P['night'])
d.polygon([(0,126),(320,126),(278,180),(42,180)],fill=P['stone'])
# panoramic sea window
px(d,28,20,96,54,'brown'); px(d,34,26,84,42,'sea')
for y in (36,48,59):
    for x in range(38,114,22): d.arc((x,y,x+16,y+5),180,350,fill=P['foam'],width=1)
# central pressure machine
for r,c in [(48,'stone'),(40,'lightstone'),(31,'deepblue'),(23,'cyan'),(13,'night')]: d.ellipse((160-r,74-r,160+r,74+r),outline=P[c],width=3)
# four dials
for i,(x,labelc) in enumerate([(116,'gold'),(145,'cyan'),(174,'glass'),(203,'coral')]):
    d.ellipse((x-8,118,x+8,134),fill=P['black'],outline=P[labelc],width=2); d.line((x,126,x+(i-1)*4,119),fill=P['white'],width=1)
# pipes / gauges
for x in (238,258,278):
    px(d,x,50,12,43,'stone'); d.ellipse((x,43,x+11,55),outline=P['gold'],width=2); px(d,x+4,92,4,28,'wood')
# brass console
px(d,92,145,136,22,'wood'); px(d,100,150,120,11,'gold')
room.save(OUT/'tide-engine-room.v0.1.png'); room.resize((640,360),Image.Resampling.NEAREST).save(OUT/'tide-engine-room.preview-2x.png')

# Undertow Bell boss sheet 8x64x64
boss=Image.new('RGBA',(64*8,64),P['t'])
for i in range(8):
    b=Image.new('RGBA',(64,64),P['t']); d=ImageDraw.Draw(b); bob=[0,-1,-2,-1,0,1,2,1][i]
    # bell body
    d.polygon([(19,18+bob),(45,18+bob),(51,46+bob),(13,46+bob)],fill=P['deepblue'])
    d.polygon([(22,21+bob),(42,21+bob),(46,42+bob),(18,42+bob)],fill=P['sea'])
    px(d,11,45+bob,42,6,'gold'); px(d,27,49+bob,10,8,'brown'); px(d,29,55+bob,6,4,'gold')
    # eye/core
    d.ellipse((24,27+bob,40,39+bob),fill=P['night'],outline=P['glass'],width=2); px(d,30,31+bob,4,4,'foam')
    # wave tendrils
    for dx,phase in [(-8,0),(8,2)]:
        pts=[]
        for yy in range(10,48,6): pts.append((32+dx+int(math.sin((yy+i*3+phase)/5)*5),yy+bob))
        d.line(pts,fill=P['cyan'],width=2)
    if i in (1,2,5,6):
        d.arc((4,11,60,58),190,350,fill=P['foam'],width=2)
    boss.alpha_composite(b,(i*64,0))
boss.save(OUT/'undertow-bell.v0.1.png'); boss.resize((boss.width*2,boss.height*2),Image.Resampling.NEAREST).save(OUT/'undertow-bell.preview.png')

# boss arena
ar=Image.new('RGBA',(336,90),P['night']); d=ImageDraw.Draw(ar)
px(d,0,45,336,45,'sea')
for y in (50,60,72,83):
    for x in range((y*2)%20,336,26): d.arc((x,y,x+18,y+5),180,350,fill=P['cyan'],width=1)
# ruined lighthouse chamber / platforms
for x,w,y in [(11,52,60),(95,46,48),(187,50,56),(277,46,43)]:
    d.rectangle((x,y,x+w,y+4),fill=P['lightstone']); d.rectangle((x+2,y+5,x+w-2,y+11),fill=P['stone'])
# pulse rings
for r,c in [(25,'deepblue'),(18,'sea'),(11,'cyan')]: d.ellipse((168-r,37-r,168+r,37+r),outline=P[c],width=2)
# lighthouse columns
for x in (28,306): px(d,x,12,8,48,'white'); px(d,x-3,7,14,7,'gold')
ar2=ar.resize((672,180),Image.Resampling.NEAREST); ar2.save(OUT/'undertow-bell-arena.v0.1.png'); ar2.resize((1344,360),Image.Resampling.NEAREST).save(OUT/'undertow-bell-arena.preview-2x.png')

# world map v5.26: copy and extend v5.25 with stormglass coast landmark and surf region
old=GAME/'assets/snes-v525/legend-world-map.v0.1.png'
wm=Image.open(old).convert('RGBA') if old.exists() else Image.new('RGBA',(320,180),P['night'])
d=ImageDraw.Draw(wm)
# draw southeast/south coastal inset
coast=[(205,124),(237,118),(263,128),(293,117),(319,125),(319,179),(200,179)]
d.polygon(coast,fill=P['sea'])
for y in (139,151,164,176):
    for x in range(205+(y%9),320,22): d.arc((x,y,x+15,y+4),180,350,fill=P['foam'],width=1)
d.line([(205,124),(237,118),(263,128),(293,117),(319,125)],fill=P['sand'],width=5)
# lighthouse star node
px(d,280,130,5,15,'white'); px(d,277,127,11,5,'gold'); px(d,282,122,2,7,'foam')
wm.save(OUT/'legend-world-map.v0.2.png'); wm.resize((640,360),Image.Resampling.NEAREST).save(OUT/'legend-world-map.v0.2.preview.png')

# receipts
art_files=['sable-current-npc.v0.1.png','stormglass-items.v0.1.png','stormglass-coast.map.v0.1.png','stormglass-cliffs.stage.v0.1.png','tide-engine-room.v0.1.png','undertow-bell.v0.1.png','undertow-bell-arena.v0.1.png','legend-world-map.v0.2.png']
receipt={'schema':'pixelforge.art-receipt.v5.26','rightsStatus':'original','sourceNote':'Original PixelForge Chapter Four Stormglass Coast assets generated locally from project-authored pixel primitives; no external art assets.','assets':[{'file':f,'sha256':sha(OUT/f)} for f in art_files]}
(OUT/'stormglass-coast.art-receipt.v0.1.json').write_text(json.dumps(receipt,indent=2))

# deterministic audio
SR=22050
def tone(freq,dur,vol=.22,kind='triangle'):
    t=np.arange(int(SR*dur))/SR
    if kind=='square': y=np.sign(np.sin(2*np.pi*freq*t))
    elif kind=='sine': y=np.sin(2*np.pi*freq*t)
    else: y=(2/np.pi)*np.arcsin(np.sin(2*np.pi*freq*t))
    return y*vol
def writewav(path,notes,beat=.16):
    chunks=[]
    for n in notes:
        if n==0: a=np.zeros(int(SR*beat))
        else:
            a=tone(n,beat*.90,.14,'triangle')+tone(n*2,beat*.90,.04,'square')
            a=np.concatenate([a,np.zeros(max(0,int(SR*beat)-len(a)))])
        chunks.append(a)
    data=np.clip(np.concatenate(chunks),-.95,.95); pcm=(data*32767).astype('<i2')
    with wave.open(str(path),'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
audio_defs={
 'stormglass-coast-theme.v0.1.wav':([220,294,349,440,392,349,294,262,220,294,370,494,440,392,330,294]*4,.18,'stormglass-coast'),
 'stormglass-cliffs-theme.v0.1.wav':([196,294,392,0,330,440,523,0,220,330,440,0,392,494,587,0]*4,.16,'stormglass-cliffs'),
 'tide-engine-theme.v0.1.wav':([110,165,220,277,220,165,139,185,123,185,247,330,247,185,147,196]*4,.19,'tide-engine'),
 'undertow-bell-theme.v0.1.wav':([98,0,147,196,98,0,165,220,110,0,165,247,123,0,185,262]*5,.17,'undertow-bell'),
 'gale-mantle-upgrade.v0.1.wav':([262,392,523,659,784,1047],.10,'gale-mantle'),
 'stormglass-compass-victory.v0.1.wav':([294,370,440,587,740,880,1175],.12,'stormglass-compass')
}
for fn,(notes,beat,_) in audio_defs.items(): writewav(AUDIO/fn,notes,beat)
manifest={'schema':'pixelforge.chapter-four-audio.v5.26','rightsStatus':'original','noExternalSamples':True,'cues':[]}
for fn,(_,_,cid) in audio_defs.items(): manifest['cues'].append({'id':cid,'file':fn,'sha256':sha(AUDIO/fn)})
(AUDIO/'stormglass-coast-audio.v0.1.json').write_text(json.dumps(manifest,indent=2))
(AUDIO/'stormglass-coast-audio.rights-receipt.v0.1.json').write_text(json.dumps({'schema':'pixelforge.audio-rights-receipt.v5.26','rightsStatus':'original','noExternalSamples':True,'generator':'tools/generate_stormglass_coast_v526.py'},indent=2))

chapter={'schema':'pixelforge.adventure.chapter.v5.26','id':'stormglass-coast','chapter':4,'title':'Stormglass Coast','entryRequires':['ironBlossom'],'hub':{'id':'stormglass-coast','nodes':['tidewatch-pier','sable-current','shell-cove','stormglass-cliffs','lighthouse'],'npc':'sable-current'},'collectible':{'id':'tideglass-shell','required':3},'upgrade':{'id':'galeMantle','source':'sable-current','cost':'tideglass-shells:3','effect':'midair-dash','requiredFor':'stormglass-cliffs-gaps'},'sideView':{'id':'stormglass-cliffs','requiredAbility':'galeMantle','dashGaps':3,'reward':'pressurePrism'},'firstPersonPuzzle':{'id':'tide-engine','sequence':['tide','wind','light','bell'],'steps':4,'reward':'tideEngineSolved'},'boss':{'id':'undertow-bell','health':5,'mechanic':'air-dash-through-surge-then-bounce-strike','requiredAbility':'galeMantle','reward':'stormglassCompass'},'travelLandmark':'stormglass-lighthouse','humanBoundaries':['air-dash-feel','cliff-readability','puzzle-clarity','boss-fairness','chapter-pacing','commercial-content-depth','price-worthiness']}
(ADV/'chapter-four-stormglass-coast.v5.26.json').write_text(json.dumps(chapter,indent=2))
contracts={
 'stormglass-coast.runtime-scene.v5.26.json':{'schema':'pixelforge.runtime-scene.v5.26','id':'stormglass-coast','mode':'overworld-hub','environment':'assets/snes-v526/stormglass-coast.map.v0.1.png','musicCue':'stormglass-coast','progression':{'requires':['ironBlossom'],'awards':['sableMet','tideglassShells:3','galeMantle']}},
 'stormglass-cliffs.runtime-scene.v5.26.json':{'schema':'pixelforge.runtime-scene.v5.26','id':'stormglass-cliffs','mode':'side-view','environment':'assets/snes-v526/stormglass-cliffs.stage.v0.1.png','musicCue':'stormglass-cliffs','movement':{'requires':'galeMantle','ability':'midair-dash','dashGaps':3},'progression':{'requires':['galeMantle'],'awards':['pressurePrism']}},
 'tide-engine.runtime-scene.v5.26.json':{'schema':'pixelforge.runtime-scene.v5.26','id':'tide-engine','mode':'first-person','environment':'assets/snes-v526/tide-engine-room.v0.1.png','musicCue':'tide-engine','puzzle':{'sequence':['tide','wind','light','bell'],'steps':4},'progression':{'requires':['pressurePrism'],'awards':['tideEngineSolved']}},
 'undertow-bell.runtime-scene.v5.26.json':{'schema':'pixelforge.runtime-scene.v5.26','id':'undertow-bell','mode':'boss','environment':'assets/snes-v526/undertow-bell-arena.v0.1.png','musicCue':'undertow-bell','boss':{'id':'undertow-bell','health':5,'requiredAbility':'galeMantle','mechanic':'dash-through-surge-then-bounce-strike'},'progression':{'requires':['galeMantle','tideEngineSolved'],'awards':['stormglassCompass','chapterFourComplete']}}
}
for fn,data in contracts.items(): (RUNTIME/fn).write_text(json.dumps(data,indent=2))
print('Generated PixelForge v5.26 Stormglass Coast art/audio/runtime assets.')
