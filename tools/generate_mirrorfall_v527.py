#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, math, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'games/the-legend-of-more-bounce'
OUT=GAME/'assets/snes-v527'; AUDIO=GAME/'assets/audio-v527'; ADV=GAME/'adventure'; RUNTIME=GAME/'runtime'
for p in (OUT,AUDIO,ADV,RUNTIME): p.mkdir(parents=True, exist_ok=True)
P={
 't':(0,0,0,0),'ink':(8,10,20,255),'night':(17,20,45,255),'indigo':(43,46,92,255),'violet':(87,63,142,255),
 'purple':(136,91,183,255),'magenta':(205,101,180,255),'cyan':(75,211,223,255),'glass':(142,239,224,255),
 'white':(245,247,232,255),'gold':(245,201,76,255),'lime':(147,214,94,255),'green':(67,135,95,255),
 'blue':(55,116,176,255),'deepblue':(26,56,103,255),'stone':(91,100,128,255),'lightstone':(157,166,188,255),
 'brown':(100,69,57,255),'wood':(157,108,72,255),'coral':(220,108,105,255),'red':(186,63,83,255),'black':(4,5,12,255)
}
def px(d,x,y,w,h,c): d.rectangle((x,y,x+w-1,y+h-1),fill=P[c])
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save_preview(im,path,scale=2): im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST).save(path)

# NPC: Perri Prism, 4x24x32
fw,fh=24,32
sheet=Image.new('RGBA',(fw*4,fh),P['t'])
for i in range(4):
    im=Image.new('RGBA',(fw,fh),P['t']); d=ImageDraw.Draw(im); bob=[0,-1,0,1][i]
    px(d,5,4+bob,14,7,'violet'); px(d,7,2+bob,10,4,'purple')
    px(d,8,9+bob,8,7,'white'); px(d,9,11+bob,2,2,'ink'); px(d,14,11+bob,2,2,'ink'); px(d,11,15+bob,4,1,'coral')
    px(d,5,16+bob,14,9,'indigo'); px(d,3,18+bob,4,7,'cyan'); px(d,17,18+bob,4,7,'magenta')
    px(d,8,25+bob,4,6,'brown'); px(d,13,25+bob,4,6,'brown')
    d.polygon([(18,4+bob),(22,7+bob),(18,10+bob)],fill=P['gold']); px(d,19,6+bob,2,2,'glass')
    sheet.alpha_composite(im,(i*fw,0))
sheet.save(OUT/'perri-prism-npc.v0.1.png'); save_preview(sheet,OUT/'perri-prism-npc.preview.png',4)

# Items: Parallax Lens, Pulse Node, View Sigil, Convergence Crown, Mirrorfall Star
items=Image.new('RGBA',(80,16),P['t']); d=ImageDraw.Draw(items)
# lens
for r,c in [(6,'gold'),(4,'cyan'),(2,'white')]: d.ellipse((8-r,8-r,8+r,8+r),outline=P[c],width=1)
d.line((8,2,8,14),fill=P['magenta'],width=1); d.line((2,8,14,8),fill=P['glass'],width=1)
# pulse node
px(d,20,3,8,10,'violet'); px(d,22,5,4,6,'cyan'); px(d,18,7,12,2,'gold')
# view sigil
for ang,c in [(0,'cyan'),(120,'magenta'),(240,'gold')]:
    a=math.radians(ang); x=40+int(math.cos(a)*5); y=8+int(math.sin(a)*5); d.line((40,8,x,y),fill=P[c],width=2)
d.ellipse((37,5,43,11),fill=P['night'],outline=P['white'])
# crown
px(d,51,7,12,6,'gold'); d.polygon([(51,7),(53,2),(56,7),(59,1),(61,7),(63,3),(63,9),(51,9)],fill=P['gold']); px(d,56,7,3,3,'magenta')
# star
px(d,70,6,10,3,'cyan'); px(d,73,2,3,11,'cyan'); px(d,72,5,5,5,'white')
items.save(OUT/'convergence-items.v0.1.png'); save_preview(items,OUT/'convergence-items.preview.png',5)

# Mirrorfall Basin overworld 320x180 -> 640x360
im=Image.new('RGBA',(320,180),P['night']); d=ImageDraw.Draw(im)
# basin ground
px(d,0,0,320,180,'deepblue')
d.polygon([(0,22),(70,12),(132,25),(196,15),(252,31),(320,20),(320,180),(0,180)],fill=P['green'])
# mirror lake
lake=[(111,55),(164,43),(218,60),(231,105),(190,130),(132,119),(95,86)]
d.polygon(lake,fill=P['blue']); d.line(lake+[lake[0]],fill=P['cyan'],width=3)
for y in (66,82,99,114):
    for x in range(116+(y%7),212,19): d.arc((x,y,x+14,y+4),180,355,fill=P['glass'],width=1)
# paths
road=[(18,145),(55,132),(77,108),(91,84),(111,64)]
d.line(road,fill=P['brown'],width=12); d.line(road,fill=P['lightstone'],width=8); d.line(road,fill=P['gold'],width=2)
# observatory road
road2=[(214,64),(244,75),(273,60),(301,72)]
d.line(road2,fill=P['stone'],width=10); d.line(road2,fill=P['lightstone'],width=5)
# prisms / pylons
for x,y,col in [(82,58,'cyan'),(158,33,'magenta'),(238,106,'gold')]:
    d.polygon([(x,y-10),(x+8,y),(x,y+10),(x-8,y)],fill=P[col],outline=P['white']); px(d,x-2,y-13,4,26,'white')
# trees / crystals
rng=np.random.default_rng(527)
for _ in range(170):
    x=int(rng.integers(8,310)); y=int(rng.integers(10,168))
    if im.getpixel((x,y))[:3]==P['green'][:3]:
        if rng.random()<.65:
            d.ellipse((x-3,y-5,x+4,y+2),fill=P['deepblue']); px(d,x,y+1,2,4,'brown')
        else:
            c=['cyan','magenta','gold'][int(rng.integers(0,3))]; d.polygon([(x,y-5),(x+3,y+2),(x,y+5),(x-3,y+2)],fill=P[c])
# observatory
px(d,270,25,30,24,'stone'); d.polygon([(265,26),(285,12),(305,26)],fill=P['indigo']); px(d,279,30,10,15,'night'); d.ellipse((279,16,291,28),outline=P['cyan'],width=2)
# causeway gate
px(d,38,79,24,20,'stone'); d.arc((40,70,60,98),180,360,fill=P['gold'],width=3); px(d,47,86,6,13,'night')
# beams visually connect pylons
for a,b,c in [((82,58),(158,33),'cyan'),((158,33),(238,106),'magenta'),((238,106),(285,25),'gold')]: d.line((*a,*b),fill=P[c],width=1)
im2=im.resize((640,360),Image.Resampling.NEAREST); im2.save(OUT/'mirrorfall-basin.map.v0.1.png'); save_preview(im2,OUT/'mirrorfall-basin.map-preview-2x.png',2)

# Splitlight Causeway side view
st=Image.new('RGBA',(336,90),P['night']); d=ImageDraw.Draw(st)
# layered canyon/sky
px(d,0,0,336,90,'night');
for x,h in [(0,24),(42,17),(86,28),(139,20),(203,25),(258,18),(306,26)]: d.polygon([(x,62),(x+25,62-h),(x+52,62)],fill=P['indigo'])
# floor fragments
for x,w,y in [(6,40,66),(71,30,56),(128,31,45),(190,33,56),(254,38,42),(305,27,62)]:
    d.rectangle((x,y,x+w,y+4),fill=P['lightstone']); d.rectangle((x+2,y+5,x+w-2,y+13),fill=P['stone'])
# reflected platforms: ghostly / beam-dependent
for x,w,y,c in [(49,18,50,'cyan'),(105,19,39,'magenta'),(164,20,48,'gold'),(230,18,34,'cyan'),(287,17,52,'magenta')]:
    d.rectangle((x,y,x+w,y+2),fill=P[c]);
    for q in range(x,x+w,4): d.point((q,y+4),fill=P['white'])
# pulse nodes
for x,y,c in [(91,47,'cyan'),(207,47,'magenta'),(285,34,'gold')]:
    d.ellipse((x-5,y-5,x+5,y+5),outline=P[c],width=2); d.ellipse((x-2,y-2,x+2,y+2),fill=P['white'])
# light beams
for x,c in [(58,'cyan'),(172,'magenta'),(265,'gold')]: d.line((x,6,x+14,80),fill=P[c],width=1)
st2=st.resize((672,180),Image.Resampling.NEAREST); st2.save(OUT/'splitlight-causeway.stage.v0.1.png'); save_preview(st2,OUT/'splitlight-causeway.stage-preview-2x.png',2)

# Triune Observatory first-person room
room=Image.new('RGBA',(320,180),P['night']); d=ImageDraw.Draw(room)
for y in range(0,132,12): d.rectangle((0,y,319,y+11),fill=P['indigo'] if (y//12)%2 else P['night'])
d.polygon([(0,132),(320,132),(270,180),(50,180)],fill=P['stone'])
# central three-lens apparatus
for cx,c in [(116,'cyan'),(160,'magenta'),(204,'gold')]:
    d.ellipse((cx-24,34,cx+24,82),fill=P['black'],outline=P[c],width=3); d.ellipse((cx-14,44,cx+14,72),outline=P['white'],width=2); d.line((cx,32,cx,84),fill=P['lightstone'],width=1)
# shutters / handles
for cx in (116,160,204): px(d,cx-8,91,16,20,'wood'); px(d,cx-4,95,8,12,'gold')
# wall star-map
for x,y,c in [(47,31,'cyan'),(63,51,'gold'),(41,76,'magenta'),(269,39,'white'),(286,66,'cyan'),(255,86,'gold')]: d.ellipse((x-1,y-1,x+2,y+2),fill=P[c])
d.line((47,31,63,51,41,76),fill=P['deepblue'],width=1); d.line((269,39,286,66,255,86),fill=P['deepblue'],width=1)
# sealed door
px(d,135,122,50,45,'black'); d.arc((135,106,185,148),180,360,fill=P['gold'],width=3); px(d,153,138,14,29,'night')
room.save(OUT/'triune-observatory-room.v0.1.png'); save_preview(room,OUT/'triune-observatory-room.preview-2x.png',2)

# Blind Angle boss sheet 8x64
boss=Image.new('RGBA',(512,64),P['t'])
for i in range(8):
    b=Image.new('RGBA',(64,64),P['t']); d=ImageDraw.Draw(b); bob=[0,-1,-2,-1,0,1,2,1][i]
    # impossible triangular body
    tri=[(32,7+bob),(55,51+bob),(10,50+bob)]
    d.polygon(tri,fill=P['indigo'],outline=P['white'])
    d.polygon([(32,14+bob),(47,45+bob),(18,44+bob)],fill=P['black'])
    # eye that points differently per frame
    ex=32+int(math.sin(i*math.pi/4)*6); ey=31+bob
    d.ellipse((ex-7,ey-5,ex+7,ey+5),fill=P['white'],outline=P['cyan']); d.ellipse((ex-2,ey-2,ex+2,ey+2),fill=P['magenta'])
    # three view spikes
    for ang,c in [(0,'cyan'),(120,'magenta'),(240,'gold')]:
        a=math.radians(ang+i*5); x=32+int(math.cos(a)*27); y=32+bob+int(math.sin(a)*27); d.line((32,32+bob,x,y),fill=P[c],width=2)
    boss.alpha_composite(b,(i*64,0))
boss.save(OUT/'blind-angle.v0.1.png'); save_preview(boss,OUT/'blind-angle.preview.png',2)

# Boss arena triptych 672x180
ar=Image.new('RGBA',(336,90),P['night']); d=ImageDraw.Draw(ar)
# 3 zones corresponding perspectives
px(d,0,0,112,90,'green'); px(d,112,0,112,90,'indigo'); px(d,224,0,112,90,'deepblue')
# left topdown grid/grove
for x in range(8,108,16): d.line((x,8,x,82),fill=P['deepblue'],width=1)
for y in range(8,82,16): d.line((8,y,108,y),fill=P['deepblue'],width=1)
# middle side platforms
for x,w,y,c in [(120,28,65,'cyan'),(158,26,49,'magenta'),(193,24,35,'gold')]: d.rectangle((x,y,x+w,y+3),fill=P[c])
# right lens room
for cx,c in [(245,'cyan'),(280,'magenta'),(315,'gold')]: d.ellipse((cx-12,25,cx+12,49),outline=P[c],width=2)
# central boss aperture
d.ellipse((145,15,191,61),fill=P['black'],outline=P['white'],width=2)
for a,c in [(0,'cyan'),(120,'magenta'),(240,'gold')]:
    rad=math.radians(a); d.line((168,38,168+int(math.cos(rad)*25),38+int(math.sin(rad)*25)),fill=P[c],width=2)
ar2=ar.resize((672,180),Image.Resampling.NEAREST); ar2.save(OUT/'blind-angle-arena.v0.1.png'); save_preview(ar2,OUT/'blind-angle-arena.preview-2x.png',2)

# Extend world map from v5.26 to v5.27 with Mirrorfall node
base=OUT.parent/'snes-v526'/'legend-world-map.v0.2.png'
wm=Image.open(base).convert('RGBA') if base.exists() else Image.new('RGBA',(320,180),P['night'])
d=ImageDraw.Draw(wm); # new north-west mirrorfall inset
# node + route
for a,b in [((45,31),(61,48)),((61,48),(78,63))]: d.line((*a,*b),fill=P['cyan'],width=2)
d.ellipse((36,20,54,38),fill=P['night'],outline=P['cyan'],width=2); d.polygon([(45,22),(50,29),(45,36),(40,29)],fill=P['glass']); d.point((45,29),fill=P['white'])
wm.save(OUT/'legend-world-map.v0.3.png'); save_preview(wm,OUT/'legend-world-map.v0.3.preview.png',2)

# Audio synthesis
SR=22050
def tone(freq,dur,vol=.18,kind='square'):
    t=np.arange(int(SR*dur))/SR
    if kind=='tri': y=(2/np.pi)*np.arcsin(np.sin(2*np.pi*freq*t))
    elif kind=='sine': y=np.sin(2*np.pi*freq*t)
    else: y=np.sign(np.sin(2*np.pi*freq*t))
    env=np.minimum(1,t/.02)*np.minimum(1,(dur-t)/.05)
    return y*env*vol
def write_wav(name,parts):
    data=np.concatenate(parts); data=np.clip(data,-1,1); pcm=(data*32767).astype('<i2')
    p=AUDIO/name
    with wave.open(str(p),'wb') as w: w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    return p

def melody(notes,unit=.17,kind='square',vol=.12,reps=2):
    out=[]
    for _ in range(reps):
        for n in notes: out.append(np.zeros(int(SR*unit)) if n==0 else tone(n,unit,vol,kind))
    return out
A4=440; freqs={'c4':261.63,'d4':293.66,'e4':329.63,'g4':392.0,'a4':440.0,'b4':493.88,'c5':523.25,'e5':659.25,'g5':783.99}
files=[]
files.append(write_wav('mirrorfall-basin-theme.v0.1.wav',melody([freqs['c4'],freqs['e4'],freqs['g4'],freqs['c5'],freqs['b4'],freqs['g4'],freqs['e4'],freqs['d4']],.18,'tri',.13,5)))
files.append(write_wav('splitlight-causeway-theme.v0.1.wav',melody([freqs['e4'],0,freqs['g4'],freqs['a4'],freqs['g4'],freqs['e4'],freqs['c5'],0],.15,'square',.10,6)))
files.append(write_wav('triune-observatory-theme.v0.1.wav',melody([freqs['c4'],freqs['g4'],freqs['e5'],freqs['g4'],freqs['d4'],freqs['a4'],freqs['g5'],freqs['a4']],.21,'sine',.11,4)))
files.append(write_wav('blind-angle-theme.v0.1.wav',melody([freqs['c4'],freqs['e4'],0,freqs['c5'],freqs['g4'],0,freqs['b4'],freqs['d4']],.14,'square',.11,7)))
files.append(write_wav('view-shift.v0.1.wav',[tone(330,.08,.18,'square'),tone(440,.08,.18,'square'),tone(660,.12,.16,'tri')]))
files.append(write_wav('convergence-victory.v0.1.wav',[tone(392,.12,.18,'tri'),tone(523,.12,.18,'tri'),tone(659,.12,.18,'tri'),tone(784,.30,.18,'tri')]))

art_files=['perri-prism-npc.v0.1.png','convergence-items.v0.1.png','mirrorfall-basin.map.v0.1.png','splitlight-causeway.stage.v0.1.png','triune-observatory-room.v0.1.png','blind-angle.v0.1.png','blind-angle-arena.v0.1.png','legend-world-map.v0.3.png']
json.dump({'schema':'pixelforge.art-receipt.v5.27','rightsStatus':'original','sourceNote':'Original PixelForge Chapter Five art generated from deterministic local drawing primitives; no external game assets.','assets':[{'file':f,'sha256':sha(OUT/f)} for f in art_files]},open(OUT/'mirrorfall-convergence.art-receipt.v0.1.json','w'),indent=2)
audio_cues=[]
for p in files:
    audio_cues.append({'id':p.stem.replace('.v0.1',''),'file':p.name,'sha256':sha(p),'rights':'original','localOnly':True})
json.dump({'schema':'pixelforge.audio-cues.v5.27','cues':audio_cues,'externalSamples':False},open(AUDIO/'mirrorfall-audio.v0.1.json','w'),indent=2)
json.dump({'schema':'pixelforge.audio-rights.v5.27','rightsStatus':'original','source':'deterministic-local-synthesis','files':[{'file':p.name,'sha256':sha(p)} for p in files]},open(AUDIO/'mirrorfall-audio.rights-receipt.v0.1.json','w'),indent=2)

chapter={
 'schema':'pixelforge.adventure.chapter.v5.27','id':'mirrorfall-convergence','chapter':5,'title':'Mirrorfall Basin — Three-View Convergence','entryRequires':['stormglassCompass'],
 'thesis':'One world. Three ways of seeing it. Each viewpoint changes the state of the other two.',
 'topDown':{'id':'mirrorfall-basin','prismPylons':3,'targetOrder':['cyan','magenta','gold'],'reward':'worldBeamAligned','changes':'creates-reflected-platforms-in-side-view'},
 'sideView':{'id':'splitlight-causeway','requires':'worldBeamAligned','pulseNodes':3,'reward':'pulseNodesPowered','changes':'powers-lens-shutters-in-first-person'},
 'firstPerson':{'id':'triune-observatory','requires':'pulseNodesPowered','shutters':3,'targetOrder':['root','pulse','lens'],'reward':'viewSigil','changes':'opens-hidden-overworld-route-to-boss'},
 'boss':{'id':'blind-angle','phases':3,'phaseOrder':['top-down-prism','side-view-pulse','first-person-lens'],'healthPerPhase':1,'reward':'convergenceCrown'},
 'travelLandmark':'mirrorfall-observatory','humanBoundaries':['cross-view-causality-clarity','view-switch-friction','boss-phase-readability','chapter-pacing','commercial-content-depth','price-worthiness']
}
json.dump(chapter,open(ADV/'chapter-five-mirrorfall-convergence.v5.27.json','w'),indent=2)

# Runtime scene contracts
scenes=[
 ('mirrorfall-basin','top-down',{'prismPylons':3,'outputs':['worldBeamAligned'],'crossViewEffect':'reflected-platforms'}),
 ('splitlight-causeway','side-view',{'requires':['worldBeamAligned'],'pulseNodes':3,'outputs':['pulseNodesPowered'],'crossViewEffect':'observatory-lenses-powered'}),
 ('triune-observatory','first-person',{'requires':['pulseNodesPowered'],'lensShutters':3,'outputs':['viewSigil'],'crossViewEffect':'boss-route-open'}),
 ('blind-angle','tri-view-boss',{'requires':['viewSigil'],'phases':['top-down-prism','side-view-pulse','first-person-lens'],'outputs':['convergenceCrown','chapterFiveComplete']})
]
for sid,mode,contract in scenes:
    json.dump({'schema':'pixelforge.runtime-scene.v5.27','id':sid,'mode':mode,'chapter':5,'contract':contract,'rightsStatus':'original'},open(RUNTIME/f'{sid}.runtime-scene.v5.27.json','w'),indent=2)

save_profile={'schema':'pixelforge.legend-save-profile.v5.27','game':'the-legend-of-more-bounce','saveSchema':'pixelforge.legend-save.v5.27','schemaVersion':4,'manualSlots':3,'autosave':True,'storage':'local-browser-first','networkSync':False,'resumePolicy':'safe-checkpoint','portableJson':True,'migrationPolicy':'accept-v5.24-v5.25-v5.26-and-add-chapter-five-convergence-plus-sixth-travel-landmark','records':['progress','inventory','equipment','questLog','discoveredLocations','travelNetwork','bossRecords','checkpoint','playtimeSeconds'],'travelNetwork':{'schema':'pixelforge.legend-travel.v5.27','startingActivatedLandmarks':['bouncehome-shrine'],'fastTravel':'activated-landmarks-only','chapterFiveLandmark':'mirrorfall-observatory'},'humanBoundaries':['save-menu-usability','checkpoint-placement-feel','world-map-readability','cross-view-causality-clarity']}
json.dump(save_profile,open(GAME/'save-profile.v5.27.json','w'),indent=2)
travel_profile={'schema':'pixelforge.legend-travel-profile.v5.27','game':'the-legend-of-more-bounce','travelSchema':'pixelforge.legend-travel.v5.27','schemaVersion':3,'localOnly':True,'networkSync':False,'discoveryRule':'visit-or-quest-reveal','activationRule':'activate-landmark-before-fast-travel','fastTravelRule':'activated-landmarks-only-safe-scene-entry','startingActivatedLandmarks':['bouncehome-shrine'],'landmarks':[
 {'id':'bouncehome-shrine','name':'Bouncehome Shrine','mode':'overworld','chapter':1,'activation':'home-active'},
 {'id':'larrina-tower-beacon','name':'Larrina Tower Beacon','mode':'tower','chapter':1,'activation':'manual'},
 {'id':'eastern-beacon','name':'Eastern Beacon','mode':'eastRoad','chapter':2,'activation':'quest-auto'},
 {'id':'iron-orchard-shrine','name':'Iron Orchard Shrine','mode':'ironOrchard','chapter':3,'activation':'manual'},
 {'id':'stormglass-lighthouse','name':'Stormglass Lighthouse','mode':'stormglassCoast','chapter':4,'activation':'quest-auto'},
 {'id':'mirrorfall-observatory','name':'Mirrorfall Observatory','mode':'mirrorfall','chapter':5,'activation':'quest-auto'}],
 'humanBoundaries':['map-readability','fast-travel-convenience-vs-exploration-balance','shrine-placement-feel']}
json.dump(travel_profile,open(GAME/'travel-profile.v5.27.json','w'),indent=2)
print('Generated PixelForge v5.27 Mirrorfall Basin assets, audio, chapter/runtime/save/travel contracts.')
