#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, math, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'games/the-legend-of-more-bounce'
OUT=GAME/'assets/snes-v523'; AUDIO=GAME/'assets/audio-v523'; ADV=GAME/'adventure'; RUNTIME=GAME/'runtime'
for p in (OUT,AUDIO,ADV,RUNTIME): p.mkdir(parents=True,exist_ok=True)
P={'t':(0,0,0,0),'ink':(12,12,20,255),'night':(29,24,31,255),'iron':(77,77,82,255),'steel':(125,128,130,255),'rust':(166,79,44,255),'rust2':(205,115,58,255),'cream':(241,226,185,255),'gold':(241,192,74,255),'green':(58,105,61,255),'leaf':(89,139,67,255),'lime':(141,173,74,255),'brown':(92,61,42,255),'wood':(144,94,55,255),'red':(179,62,58,255),'purple':(111,61,118,255),'cyan':(77,190,188,255),'sky':(77,112,134,255),'darkgreen':(31,70,45,255),'white':(246,242,221,255)}
def px(d,x,y,w,h,c): d.rectangle((x,y,x+w-1,y+h-1),fill=P[c])
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def sprite_person(filename, coat, accent, hair, role):
    fw,fh,frames=24,32,4; sh=Image.new('RGBA',(fw*frames,fh),P['t'])
    for i in range(frames):
        im=Image.new('RGBA',(fw,fh),P['t']); d=ImageDraw.Draw(im); bob=[0,-1,0,1][i]
        px(d,7,4+bob,10,7,hair); px(d,6,7+bob,12,6,hair); px(d,8,8+bob,8,7,'cream'); px(d,9,10+bob,2,2,'ink'); px(d,14,10+bob,2,2,'ink')
        px(d,6,15+bob,12,10,coat); px(d,4,18+bob,3,7,accent); px(d,17,18+bob,3,7,accent); px(d,8,25+bob,4,5,'brown'); px(d,13,25+bob,4,5,'brown')
        if role=='tessa': px(d,17,14+bob,5,5,'gold'); px(d,18,15+bob,3,3,'iron')
        else: px(d,3,14+bob,5,9,'wood'); px(d,2,13+bob,3,3,'gold')
        sh.alpha_composite(im,(i*fw,0))
    sh.save(OUT/filename); sh.resize((sh.width*3,sh.height*3),Image.Resampling.NEAREST).save(OUT/filename.replace('.v0.1.png','.preview.png'))

sprite_person('tessa-coil-npc.v0.1.png','purple','cyan','rust','tessa')
sprite_person('bram-gearroot-npc.v0.1.png','green','gold','brown','bram')

# Rustling enemy 8 frames, armored orchard gremlin
fw,fh,frames=24,24,8; enemy=Image.new('RGBA',(fw*frames,fh),P['t'])
for i in range(frames):
    im=Image.new('RGBA',(fw,fh),P['t']); d=ImageDraw.Draw(im); bob=[0,-1,-2,-1,0,1,2,1][i]
    px(d,5,7+bob,14,10,'rust'); px(d,7,5+bob,10,4,'iron'); px(d,7,8+bob,10,5,'steel'); px(d,8,9+bob,3,3,'white'); px(d,14,9+bob,3,3,'white'); px(d,9,10+bob,1,2,'ink'); px(d,15,10+bob,1,2,'ink')
    px(d,3,12+bob,4,4,'iron'); px(d,17,12+bob,4,4,'iron'); px(d,7,17+bob,4,5,'brown'); px(d,13,17+bob,4,5,'brown')
    if i in (1,5): px(d,1,4+bob,4,2,'gold'); px(d,19,3+bob,4,2,'gold')
    enemy.alpha_composite(im,(i*fw,0))
enemy.save(OUT/'rustling-enemy.v0.1.png'); enemy.resize((enemy.width*3,enemy.height*3),Image.Resampling.NEAREST).save(OUT/'rustling-enemy.preview.png')

# Item atlas: gear apple, resonance bracer, wrench charm, iron blossom, rivet heart, orchard sigil
items=Image.new('RGBA',(96,16),P['t']); d=ImageDraw.Draw(items)
# gear apple
px(d,3,4,9,9,'rust2'); px(d,6,2,3,3,'green'); px(d,5,6,5,5,'gold'); px(d,7,7,1,1,'ink')
# bracer
px(d,18,4,12,8,'iron'); px(d,20,6,8,4,'cyan'); px(d,23,5,2,6,'gold')
# wrench charm
px(d,36,2,3,11,'steel'); px(d,34,2,7,3,'steel'); px(d,38,11,5,3,'gold')
# iron blossom
for x,y in [(53,3),(58,3),(51,7),(60,7),(55,10)]: px(d,x,y,4,4,'rust2')
px(d,55,6,5,5,'gold'); px(d,56,7,3,3,'white')
# heart rivet
px(d,69,4,4,4,'red'); px(d,74,4,4,4,'red'); px(d,71,7,5,6,'red'); px(d,72,8,2,2,'gold')
# sigil
px(d,84,2,10,12,'iron'); px(d,86,4,6,8,'gold'); px(d,88,5,2,6,'cyan')
items.save(OUT/'iron-orchard-items.v0.1.png'); items.resize((items.width*4,items.height*4),Image.Resampling.NEAREST).save(OUT/'iron-orchard-items.preview.png')

# Iron Orchard / Rivet Row top-down map 320x180 -> 640x360
im=Image.new('RGBA',(320,180),P['green']); d=ImageDraw.Draw(im); rng=np.random.default_rng(523)
for _ in range(420):
    x=int(rng.integers(4,316)); y=int(rng.integers(18,176)); c=['darkgreen','leaf','lime','brown','gold'][int(rng.integers(0,5))]; d.point((x,y),fill=P[c])
# iron fruit trees
def orchard_tree(cx,cy):
    d.rectangle((cx-2,cy,cx+2,cy+10),fill=P['brown']); d.ellipse((cx-10,cy-12,cx+10,cy+7),fill=P['darkgreen']); d.ellipse((cx-7,cy-10,cx+7,cy+5),fill=P['leaf'])
    for dx,dy in [(-5,-5),(3,-7),(0,0),(6,1)]: d.rectangle((cx+dx,cy+dy,cx+dx+2,cy+dy+2),fill=P['rust2']); d.point((cx+dx+1,cy+dy+1),fill=P['gold'])
for x in range(22,303,28):
    orchard_tree(x,32+((x//28)%2)*8); orchard_tree(x,150-((x//28)%3)*5)
# Rivet Row road / plaza
pts=[(8,102),(52,101),(86,88),(123,92),(158,78),(196,83),(233,70),(273,73),(313,62)]
d.line(pts,fill=P['iron'],width=18); d.line(pts,fill=P['cream'],width=12); d.line(pts,fill=P['rust2'],width=4)
# shop forge stall
px(d,70,52,36,24,'wood'); px(d,67,48,42,7,'rust'); px(d,75,58,10,13,'night'); px(d,90,56,11,8,'gold'); px(d,93,59,5,3,'red'); px(d,64,65,48,3,'iron')
# Bram shed
px(d,128,116,31,20,'brown'); px(d,125,111,37,7,'darkgreen'); px(d,138,121,8,15,'cream')
# hidden cave mouth
px(d,210,120,38,24,'iron'); d.ellipse((218,119,240,145),fill=P['night']); px(d,224,122,10,4,'rust')
# Warden gate
px(d,278,31,29,42,'iron'); px(d,283,37,19,32,'night'); px(d,286,40,13,26,'rust'); px(d,290,44,5,18,'gold')
# fountain / hub marker
for r,c in [(13,'iron'),(9,'steel'),(5,'cyan')]: d.ellipse((170-r,111-r,170+r,111+r),outline=P[c],width=2)
# apple grove clusters
for x,y in [(35,74),(43,80),(50,71),(184,44),(197,48),(251,104),(263,111)]: px(d,x,y,3,3,'rust2'); d.point((x+1,y-1),fill=P['green'])
im=im.resize((640,360),Image.Resampling.NEAREST); im.save(OUT/'iron-orchard.map.v0.1.png'); im.resize((1280,720),Image.Resampling.NEAREST).save(OUT/'iron-orchard.map-preview-2x.png')

# Rustroot Cavern side-view
st=Image.new('RGBA',(336,90),P['night']); d=ImageDraw.Draw(st)
for y in range(0,90,8): d.rectangle((0,y,335,y+7),fill=P['night'] if y<55 else P['brown'])
# rock silhouettes and roots
for x in range(-10,340,27):
    h=18+(x*5)%20; d.polygon([(x,63),(x+13,63-h),(x+27,63)],fill=P['iron'])
for x in range(12,330,42):
    d.line((x,0,x+9,42),fill=P['rust'],width=3); d.line((x+7,0,x+17,28),fill=P['brown'],width=2)
# platforms
for x,w,y in [(16,42,61),(82,43,49),(149,47,39),(221,42,51),(282,38,42)]:
    d.rectangle((x,y,x+w,y+4),fill=P['steel']); d.rectangle((x+2,y+5,x+w-2,y+12),fill=P['rust']);
    for xx in range(x+5,x+w,9): d.line((xx,y+11,xx+2,y+15),fill=P['brown'],width=1)
# breakable iron-root gate and charm altar
px(d,116,31,8,34,'iron'); px(d,119,27,3,42,'rust2'); px(d,313,51,12,14,'steel'); px(d,316,47,6,6,'gold')
# forge glow / cave accents
for x,y in [(65,59),(135,47),(205,58),(267,48)]: px(d,x,y,2,2,'cyan'); d.point((x+2,y-1),fill=P['gold'])
st=st.resize((672,180),Image.Resampling.NEAREST); st.save(OUT/'rustroot-cavern.stage.v0.1.png'); st.resize((1344,360),Image.Resampling.NEAREST).save(OUT/'rustroot-cavern.stage-preview-2x.png')

# Rivet Forge first-person room
room=Image.new('RGBA',(320,180),P['night']); d=ImageDraw.Draw(room)
for y in range(0,125,12): d.rectangle((0,y,319,y+11),fill=P['iron'] if (y//12)%2 else P['night'])
d.polygon([(0,126),(320,126),(278,180),(42,180)],fill=P['brown'])
# forge, shelves, anvils, hanging tools
px(d,28,50,76,62,'rust'); px(d,38,62,55,38,'night'); px(d,44,70,43,25,'red'); px(d,52,77,28,15,'gold')
px(d,125,43,64,70,'wood');
for y in (55,76,97): px(d,130,y,54,4,'iron')
for x in (137,151,166): px(d,x,59,5,12,'steel')
# bracer workbench
px(d,214,91,76,18,'wood'); px(d,221,78,60,14,'iron'); px(d,238,81,28,7,'cyan'); px(d,247,82,9,5,'gold')
# Tessa silhouette station
px(d,238,37,32,37,'purple'); px(d,245,29,18,13,'rust'); px(d,247,42,14,12,'cream')
# signs
px(d,116,15,92,18,'brown'); px(d,121,19,82,10,'gold')
room.save(OUT/'rivet-forge-room.v0.1.png'); room.resize((640,360),Image.Resampling.NEAREST).save(OUT/'rivet-forge-room.preview-2x.png')

# Rustbloom Warden boss 8x64x64
fw,fh,frames=64,64,8; boss=Image.new('RGBA',(fw*frames,fh),P['t'])
for i in range(frames):
    b=Image.new('RGBA',(fw,fh),P['t']); d=ImageDraw.Draw(b); pulse=[0,1,2,1,0,-1,-2,-1][i]
    # root body
    px(d,25,26+pulse,15,31,'brown'); px(d,17,34+pulse,11,21,'rust'); px(d,38,34+pulse,11,21,'rust')
    # iron crown/canopy
    d.ellipse((11,8+pulse,53,39+pulse),fill=P['iron']); d.ellipse((16,11+pulse,48,34+pulse),fill=P['darkgreen'])
    # rust blooms
    for x,y in [(18,14),(31,10),(42,17),(23,25),(39,27)]:
        px(d,x,y+pulse,7,7,'rust2'); px(d,x+2,y+2+pulse,3,3,'gold')
    # face core
    px(d,24,23+pulse,18,13,'night'); px(d,27,26+pulse,4,4,'white'); px(d,36,26+pulse,4,4,'white'); px(d,28,27+pulse,2,2,'red'); px(d,37,27+pulse,2,2,'red')
    px(d,29,33+pulse,8,2,'gold')
    # guard plates vary
    if i<4: px(d,18,19+pulse,5,18,'steel'); px(d,44,19+pulse,5,18,'steel')
    else: px(d,9,29+pulse,8,5,'cyan'); px(d,48,29+pulse,8,5,'cyan')
    boss.alpha_composite(b,(i*fw,0))
boss.save(OUT/'rustbloom-warden.v0.1.png'); boss.resize((boss.width*2,boss.height*2),Image.Resampling.NEAREST).save(OUT/'rustbloom-warden.preview.png')

# boss arena
ar=Image.new('RGBA',(336,90),P['night']); d=ImageDraw.Draw(ar)
for y,c in [(0,'night'),(18,'iron'),(42,'darkgreen'),(65,'brown')]: d.rectangle((0,y,335,min(89,y+25)),fill=P[c])
for x in range(0,336,22): d.line((x,0,x+13,66),fill=P['rust'],width=2)
for x in range(8,330,37):
    d.ellipse((x,48,x+18,66),fill=P['darkgreen']); px(d,x+6,52,5,5,'rust2'); px(d,x+8,54,2,2,'gold')
# arena floor
px(d,0,69,336,21,'brown'); px(d,0,68,336,4,'steel')
# shield pylons
for x in (46,286): px(d,x,49,8,20,'iron'); px(d,x-2,45,12,5,'gold'); px(d,x+2,42,4,4,'cyan')
ar=ar.resize((672,180),Image.Resampling.NEAREST); ar.save(OUT/'rustbloom-warden-arena.v0.1.png'); ar.resize((1344,360),Image.Resampling.NEAREST).save(OUT/'rustbloom-warden-arena.preview-2x.png')

# art receipt
art_files=['tessa-coil-npc.v0.1.png','bram-gearroot-npc.v0.1.png','rustling-enemy.v0.1.png','iron-orchard-items.v0.1.png','iron-orchard.map.v0.1.png','rustroot-cavern.stage.v0.1.png','rivet-forge-room.v0.1.png','rustbloom-warden.v0.1.png','rustbloom-warden-arena.v0.1.png']
receipt={'schema':'pixelforge.art-receipt.v5.23','rightsStatus':'original','sourceNote':'Original PixelForge Chapter Three art generated locally from project-authored primitives; no external art assets.','assets':[{'file':f,'sha256':sha(OUT/f)} for f in art_files]}
(OUT/'iron-orchard.art-receipt.v0.1.json').write_text(json.dumps(receipt,indent=2))

# simple deterministic synth audio
SR=22050
def tone(freq,dur,vol=.23,waveform='square'):
    t=np.arange(int(SR*dur))/SR
    if waveform=='triangle': y=(2/np.pi)*np.arcsin(np.sin(2*np.pi*freq*t))
    elif waveform=='sine': y=np.sin(2*np.pi*freq*t)
    else: y=np.sign(np.sin(2*np.pi*freq*t))
    return y*vol
def writewav(path,notes,beat=.16,loop=False):
    chunks=[]
    for n in notes:
        if n==0: chunks.append(np.zeros(int(SR*beat)))
        else:
            a=tone(n,beat*.92,.16,'triangle')+tone(n*2,beat*.92,.05,'square'); pad=np.zeros(max(0,int(SR*beat)-len(a))); chunks.append(np.concatenate([a,pad]))
    data=np.concatenate(chunks); data=np.clip(data,-.95,.95); pcm=(data*32767).astype('<i2')
    with wave.open(str(path),'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

audio_defs={
 'iron-orchard-theme.v0.1.wav':([220,277,330,440,330,277,247,330,220,277,370,440,370,330,277,247]*4,.18,'iron-orchard'),
 'rustroot-cavern-theme.v0.1.wav':([110,0,147,110,165,0,147,123,110,0,185,165,147,123,110,0]*4,.20,'rustroot'),
 'rivet-forge-theme.v0.1.wav':([196,247,294,247,220,277,330,277,196,247,330,370,330,294,247,220]*4,.18,'rivet-forge'),
 'rustbloom-warden-theme.v0.1.wav':([98,98,0,147,98,165,0,196,110,110,0,165,123,196,0,220]*5,.17,'rustbloom-boss'),
 'resonance-bracer-upgrade.v0.1.wav':([220,330,440,554,659,880],.11,'bracer-upgrade'),
 'iron-blossom-victory.v0.1.wav':([262,330,392,523,659,784,1047],.13,'iron-blossom')}
for fn,(notes,beat,_id) in audio_defs.items(): writewav(AUDIO/fn,notes,beat)
manifest={'schema':'pixelforge.chapter-three-audio.v5.23','rightsStatus':'original','cues':[]}
for fn,(_,_,cid) in audio_defs.items(): manifest['cues'].append({'id':cid,'file':fn,'sha256':sha(AUDIO/fn)})
(AUDIO/'iron-orchard-audio.v0.1.json').write_text(json.dumps(manifest,indent=2)); (AUDIO/'iron-orchard-audio.rights-receipt.v0.1.json').write_text(json.dumps({'rightsStatus':'original','noExternalSamples':True,'generator':'tools/generate_iron_orchard_v523.py'},indent=2))

# Adventure config + runtime contracts
chapter={'schema':'pixelforge.adventure.chapter.v5.23','id':'iron-orchard','chapter':3,'title':'The Iron Orchard','hub':{'id':'iron-orchard','nodes':['rivet-row','gearapple-grove','rustroot-cavern','warden-gate'],'npcs':['tessa-coil','bram-gearroot']},'requiredQuest':{'gearApples':3,'trade':'resonanceBracer','purpose':'break-rustling-armor-and-warden-guard'},'optionalQuest':{'id':'brams-lost-wrench','reward':'heartRivet','effect':'max-hearts+1'},'enemyTier':{'id':'rustling','count':3,'health':3,'armorRequires':'resonanceBracer'},'boss':{'id':'rustbloom-warden','health':4,'guardCycles':4,'requiredAbility':'resonanceBracer','reward':'ironBlossom'},'humanBoundaries':['hub-flow','sidequest-value','combat-ability-feel','boss-fairness','commercial-content-depth','price-worthiness']}
(ADV/'chapter-three-iron-orchard.v5.23.json').write_text(json.dumps(chapter,indent=2))
contracts={
'iron-orchard.runtime-scene.v5.23.json':{'schema':'pixelforge.runtime-scene.v5.23','id':'iron-orchard','mode':'overworld-hub','environment':'assets/snes-v523/iron-orchard.map.v0.1.png','musicCue':'iron-orchard','nodes':['rivet-row','gearapple-grove','rustroot-cavern','warden-gate'],'progression':{'requires':['beaconLens'],'awards':['gearApples:3','tessaMet','bramMet']}},
'rivet-forge.runtime-scene.v5.23.json':{'schema':'pixelforge.runtime-scene.v5.23','id':'rivet-forge','mode':'first-person-shop','environment':'assets/snes-v523/rivet-forge-room.v0.1.png','musicCue':'rivet-forge','shop':{'requiredTrade':{'cost':'gearApples:3','reward':'resonanceBracer'},'optionalTrade':{'cost':'wrenchCharm','reward':'heartRivet'}},'progression':{'awards':['resonanceBracer','heartRivet?']}},
'rustroot-cavern.runtime-scene.v5.23.json':{'schema':'pixelforge.runtime-scene.v5.23','id':'rustroot-cavern','mode':'side-view','environment':'assets/snes-v523/rustroot-cavern.stage.v0.1.png','musicCue':'rustroot','enemy':{'id':'rustling','count':3,'health':3,'armorRequires':'resonanceBracer'},'optionalReward':'wrenchCharm','progression':{'requires':['resonanceBracer'],'awards':['wrenchCharm','orchardSigil']}},
'rustbloom-warden.runtime-scene.v5.23.json':{'schema':'pixelforge.runtime-scene.v5.23','id':'rustbloom-warden','mode':'boss','environment':'assets/snes-v523/rustbloom-warden-arena.v0.1.png','musicCue':'rustbloom-boss','boss':{'id':'rustbloom-warden','health':4,'guardCycles':4,'guardBreakAbility':'resonanceBracer','damageAbility':'bounceStrike'},'progression':{'requires':['resonanceBracer','orchardSigil'],'awards':['ironBlossom','chapterThreeComplete']}}
}
for fn,data in contracts.items(): (RUNTIME/fn).write_text(json.dumps(data,indent=2))
print('Generated PixelForge v5.23 Iron Orchard art/audio/runtime assets.')
