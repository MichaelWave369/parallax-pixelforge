#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, math, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'games/the-legend-of-more-bounce'
OUT=GAME/'assets/snes-v522'
AUDIO=GAME/'assets/audio-v522'
OUT.mkdir(parents=True, exist_ok=True); AUDIO.mkdir(parents=True, exist_ok=True)
P={
 't':(0,0,0,0),'ink':(10,12,22,255),'night':(19,26,43,255),'sky':(48,79,110,255),'cyan':(93,224,220,255),
 'mint':(143,238,184,255),'green':(64,128,86,255),'deepgreen':(28,74,56,255),'grass':(91,153,79,255),
 'gold':(246,205,94,255),'cream':(245,236,204,255),'orange':(221,126,69,255),'red':(190,70,79,255),
 'plum':(82,48,92,255),'purple':(128,74,146,255),'brown':(96,67,48,255),'wood':(145,98,61,255),
 'stone':(86,92,105,255),'lightstone':(135,145,151,255),'water':(57,117,151,255),'white':(245,246,236,255)
}
def px(d,x,y,w,h,c): d.rectangle((x,y,x+w-1,y+h-1),fill=P[c])
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

# Mira Reed — 4x 24x32 frames
fw,fh,frames=24,32,4
sheet=Image.new('RGBA',(fw*frames,fh),P['t'])
for i in range(frames):
    im=Image.new('RGBA',(fw,fh),P['t']); d=ImageDraw.Draw(im); bob=[0,-1,0,1][i]
    px(d,7,5+bob,10,8,'brown'); px(d,5,7+bob,14,5,'brown')
    px(d,8,8+bob,8,7,'cream'); px(d,9,10+bob,2,2,'ink'); px(d,14,10+bob,2,2,'ink')
    px(d,7,15+bob,10,9,'green'); px(d,5,18+bob,4,7,'mint'); px(d,16,18+bob,4,7,'mint')
    px(d,8,24+bob,4,6,'brown'); px(d,13,24+bob,4,6,'brown')
    # reed-map satchel / compass accent
    px(d,16,14+bob,5,5,'gold'); px(d,17,15+bob,3,3,'sky')
    sheet.alpha_composite(im,(i*fw,0))
sheet.save(OUT/'mira-reed-npc.v0.1.png'); sheet.resize((sheet.width*3,sheet.height*3),Image.Resampling.NEAREST).save(OUT/'mira-reed-npc.preview.png')

# Static Sprite — 8x 24x24 stronger enemy
fw,fh,frames=24,24,8
enemy=Image.new('RGBA',(fw*frames,fh),P['t'])
for i in range(frames):
    im=Image.new('RGBA',(fw,fh),P['t']); d=ImageDraw.Draw(im); bob=[0,-1,-2,-1,0,1,2,1][i]
    px(d,5,7+bob,14,11,'plum'); px(d,7,5+bob,10,3,'purple')
    px(d,8,9+bob,3,3,'white'); px(d,14,9+bob,3,3,'white'); px(d,9,10+bob,1,2,'ink'); px(d,15,10+bob,1,2,'ink')
    px(d,9,15+bob,7,2,'ink')
    # electric prongs
    px(d,2,8+bob,3,2,'cyan'); px(d,19,6+bob,3,2,'cyan'); px(d,3,4+bob,2,2,'gold'); px(d,20,12+bob,2,2,'gold')
    if i in (2,6): px(d,1,15,4,2,'mint'); px(d,19,17,4,2,'mint')
    px(d,7,18+bob,4,4,'stone'); px(d,13,18+bob,4,4,'stone')
    enemy.alpha_composite(im,(i*fw,0))
enemy.save(OUT/'static-sprite-enemy.v0.1.png'); enemy.resize((enemy.width*3,enemy.height*3),Image.Resampling.NEAREST).save(OUT/'static-sprite-enemy.preview.png')

# Chapter two item atlas: Echo Boots, Relay Spark, Beacon Lens, East Sigil
items=Image.new('RGBA',(64,16),P['t']); d=ImageDraw.Draw(items)
# boots
px(d,1,7,5,7,'purple'); px(d,6,10,5,4,'gold'); px(d,8,12,5,2,'brown'); px(d,4,4,4,4,'cyan')
# spark
px(d,20,3,4,10,'cyan'); px(d,17,6,10,4,'cyan'); px(d,21,5,2,6,'white'); px(d,19,7,6,2,'white')
# lens
px(d,34,3,10,10,'gold'); px(d,36,5,6,6,'sky'); px(d,38,7,2,2,'white'); px(d,43,11,4,3,'brown')
# east sigil
px(d,51,2,10,12,'plum'); px(d,53,4,6,8,'gold'); px(d,55,5,2,6,'cyan'); px(d,52,8,8,2,'cyan')
items.save(OUT/'chapter-two-items.v0.1.png'); items.resize((items.width*4,items.height*4),Image.Resampling.NEAREST).save(OUT/'chapter-two-items.preview.png')

# Eastwind Road top-down 320x180 logical -> 640x360
base=Image.new('RGBA',(320,180),P['grass']); d=ImageDraw.Draw(base)
rng=np.random.default_rng(220522)
# ground texture, flowers and tiny stones
for _ in range(330):
    x=int(rng.integers(5,315)); y=int(rng.integers(24,170)); k=int(rng.integers(0,6))
    if k<3: d.point((x,y),fill=P['green'])
    elif k==3: d.point((x,y),fill=P['deepgreen'])
    elif k==4: d.rectangle((x,y,x+1,y+1),fill=P['gold'])
    else: d.point((x,y),fill=P['cream'])
# reusable detailed tree sprite
def tree(cx,cy,scale=1):
    # shadow/trunk
    d.ellipse((cx-7*scale,cy+6*scale,cx+8*scale,cy+12*scale),fill=P['deepgreen'])
    d.rectangle((cx-2*scale,cy,cx+2*scale,cy+11*scale),fill=P['brown'])
    # dark outer canopy then layered greens/highlights
    d.polygon([(cx,cy-17*scale),(cx-11*scale,cy-2*scale),(cx-7*scale,cy+7*scale),(cx+8*scale,cy+7*scale),(cx+12*scale,cy-2*scale)],fill=P['deepgreen'])
    d.ellipse((cx-10*scale,cy-10*scale,cx+3*scale,cy+4*scale),fill=P['green'])
    d.ellipse((cx-2*scale,cy-13*scale,cx+10*scale,cy+2*scale),fill=P['green'])
    d.ellipse((cx-6*scale,cy-7*scale,cx+8*scale,cy+7*scale),fill=P['grass'])
    d.rectangle((cx-4*scale,cy-9*scale,cx+1*scale,cy-6*scale),fill=P['mint'])
    d.rectangle((cx+3*scale,cy-6*scale,cx+6*scale,cy-4*scale),fill=P['mint'])
# forest borders, irregular not stamped circles
for x in range(6,320,19):
    tree(x+int((x*7)%9)-4,20+int((x*5)%5),1)
    tree(x+int((x*3)%11)-5,169-int((x*2)%4),1)
# winding road: dark edge, cream shoulder, gold center
pts=[(8,128),(45,125),(70,116),(93,94),(126,100),(156,76),(192,82),(221,61),(251,65),(283,57),(313,40)]
d.line(pts,fill=P['brown'],width=15); d.line(pts,fill=P['cream'],width=11); d.line(pts,fill=P['gold'],width=5)
# cobble accents / roadside markers
for x,y in [(45,124),(88,99),(126,99),(158,77),(220,62),(283,57)]:
    d.rectangle((x-2,y-4,x+1,y-1),fill=P['lightstone']); d.point((x,y),fill=P['white'])
# Eastwind Mill — detailed roof/windows/blades
px(d,72,42,31,25,'wood'); px(d,76,37,23,8,'brown'); px(d,81,49,7,11,'cream'); px(d,92,49,6,6,'sky'); px(d,83,60,4,7,'brown')
# mill hub / blades
px(d,85,37,5,5,'gold');
for a,b,c,e in [(87,39,66,19),(87,39,108,19),(87,39,66,59),(87,39,108,59)]: d.line((a,b,c,e),fill=P['white'],width=2)
for a,b,c,e in [(87,39,70,23),(87,39,104,23),(87,39,70,55),(87,39,104,55)]: d.line((a,b,c,e),fill=P['cream'],width=1)
# glassgrass field — crystal blades + flowers
for x in range(135,207,5):
    for y in range(112,153,7):
        h=3+((x+y)//3)%6; col='cyan' if (x+y)%4 else 'mint'; d.line((x,y,x+1,y-h),fill=P[col],width=1)
for x,y,c in [(146,126,'gold'),(172,140,'white'),(199,121,'purple')]:
    px(d,x,y,2,2,c); d.point((x-1,y+1),fill=P[c]); d.point((x+2,y+1),fill=P[c])
# high bridge with rails, posts, planks and shadow
px(d,214,101,62,5,'brown'); px(d,214,97,62,4,'wood');
for x in range(217,274,8):
    px(d,x,91,2,6,'gold'); px(d,x,96,2,6,'wood')
d.line((216,93,274,93),fill=P['cream'],width=1)
# signal mill / eastern beacon — tower, roof, windows, antenna
px(d,267,24,34,32,'stone'); px(d,271,20,26,7,'lightstone'); px(d,274,31,7,9,'sky'); px(d,287,31,7,9,'sky'); px(d,281,45,8,11,'brown')
px(d,280,12,8,11,'lightstone'); px(d,283,6,2,8,'gold'); px(d,282,4,4,3,'cyan'); d.line((284,5,277,1),fill=P['mint'],width=1); d.line((284,5,291,1),fill=P['mint'],width=1)
# ruin stones and directional east sigil
for x,y in [(37,73),(177,49),(239,135),(302,112)]:
    px(d,x,y,10,7,'stone'); px(d,x+2,y-2,6,3,'lightstone'); d.point((x+3,y+1),fill=P['mint'])
px(d,306,73,7,12,'plum'); px(d,308,75,3,8,'gold'); d.line((309,79,316,79),fill=P['cyan'],width=1)
base=base.resize((640,360),Image.Resampling.NEAREST); base.save(OUT/'eastwind-road.map.v0.1.png'); base.resize((1280,720),Image.Resampling.NEAREST).save(OUT/'eastwind-road.map-preview-2x.png')

# Glassgrass Pass 672x180 sideview on 336x90 logical
stage=Image.new('RGBA',(336,90),P['sky']); d=ImageDraw.Draw(stage)
# layered sky / clouds
for y,c in [(0,'night'),(14,'sky'),(30,'sky'),(46,'night')]: d.rectangle((0,y,335,min(89,y+16)),fill=P[c])
for x,y,w in [(28,14,36),(110,23,27),(216,11,42)]:
    d.rectangle((x,y,x+w,y+2),fill=P['cream']); d.rectangle((x+6,y-2,x+w-7,y+3),fill=P['white'])
# far mountains + near pine silhouettes
for x in range(-10,336,28):
    h=12+(x*7)%14; d.polygon([(x,58),(x+14,58-h),(x+28,58)],fill=P['deepgreen'])
for x in range(3,336,38):
    h=17+(x*5)%12; d.polygon([(x,64),(x+9,64-h),(x+18,64)],fill=P['green'])
# glassgrass clusters, two depth rows
for x in range(0,336,4):
    h=4+(x*3)%8; d.line((x,68,x+1,68-h),fill=P['cyan'] if x%12 else P['mint'])
    if x%16==0: d.point((x+2,63),fill=P['gold'])
# textured ground
for y in range(69,90): d.rectangle((0,y,335,y),fill=P['brown'] if y>75 else P['green'])
for x in range(0,336,7):
    d.rectangle((x,70,x+3,72),fill=P['grass']); d.point((x+2,79),fill=P['wood'])
# platforms with moss caps, stone faces, hanging roots
for x,w,y in [(22,39,56),(92,37,49),(157,40,42),(224,36,50),(284,34,39)]:
    d.rectangle((x,y,x+w,y+3),fill=P['mint']); d.rectangle((x+1,y+3,x+w-1,y+6),fill=P['green']); d.rectangle((x+3,y+7,x+w-3,y+12),fill=P['brown'])
    for xx in range(x+5,x+w-2,8): d.line((xx,y+11,xx,y+15),fill=P['deepgreen'],width=1)
# relay spark pylons
for x in (70,174,272):
    px(d,x,49,5,20,'stone'); px(d,x-2,47,9,4,'gold'); px(d,x,44,5,4,'cyan'); px(d,x+1,43,3,2,'white')
# crystal flowers / ruins
for x,y in [(48,65),(132,63),(204,59),(251,66)]:
    px(d,x,y,2,3,'purple'); d.point((x-1,y+1),fill=P['cyan']); d.point((x+2,y+1),fill=P['gold'])
for x in (121,244): px(d,x,62,9,7,'stone'); px(d,x+2,60,5,3,'lightstone')
# signal mill silhouette with wind blades
px(d,298,27,23,30,'stone'); px(d,304,20,10,9,'lightstone'); px(d,307,17,4,4,'gold'); d.line((309,19,296,6),fill=P['cream'],width=1); d.line((309,19,322,6),fill=P['cream'],width=1); d.line((309,19,296,32),fill=P['cream'],width=1); d.line((309,19,322,32),fill=P['cream'],width=1)
stage=stage.resize((672,180),Image.Resampling.NEAREST); stage.save(OUT/'glassgrass-pass.stage.v0.1.png'); stage.resize((1344,360),Image.Resampling.NEAREST).save(OUT/'glassgrass-pass.stage-preview-2x.png')

# Signal Mill first-person 320x180
room=Image.new('RGBA',(320,180),P['night']); d=ImageDraw.Draw(room)
# walls/floor
for y in range(0,126,12): d.rectangle((0,y,319,y+11),fill=P['plum'] if (y//12)%2 else P['night'])
d.polygon([(0,126),(320,126),(280,180),(40,180)],fill=P['brown'])
# huge round mechanism
cx,cy=160,74
for r,c in [(52,'stone'),(43,'lightstone'),(34,'plum'),(24,'gold'),(15,'sky')]: d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=P[c],width=3)
# dial symbols sun / wind / rune
for x,c in [(86,'gold'),(160,'cyan'),(234,'purple')]:
    d.rectangle((x-15,128,x+15,156),fill=P['ink']); d.rectangle((x-12,131,x+12,153),outline=P[c],width=2)
# beacon lens socket
px(d,151,62,18,24,'sky'); px(d,155,66,10,16,'white')
# side pipes / books / switches
for x in (20,287):
    px(d,x,34,12,70,'stone'); px(d,x+3,38,6,62,'lightstone')
for x in (45,260):
    px(d,x,98,20,24,'wood'); px(d,x+3,101,14,4,'gold'); px(d,x+3,108,14,3,'red')
room.save(OUT/'signal-mill-room.v0.1.png'); room.resize((640,360),Image.Resampling.NEAREST).save(OUT/'signal-mill-room.preview-2x.png')

# art receipt
files=['mira-reed-npc.v0.1.png','static-sprite-enemy.v0.1.png','chapter-two-items.v0.1.png','eastwind-road.map.v0.1.png','glassgrass-pass.stage.v0.1.png','signal-mill-room.v0.1.png']
receipt={'schema':'pixelforge.chapter-two-art-receipt.v5.22','cartridge':'the-legend-of-more-bounce','rightsStatus':'original','source':'Original PixelForge pixel art generated locally for v5.22 Eastern Road / Chapter Two','assets':[{'file':f,'sha256':sha(OUT/f)} for f in files],'humanVisualApproval':'pending'}
(OUT/'chapter-two.art-receipt.v0.1.json').write_text(json.dumps(receipt,indent=2)+'\n')

# Audio synthesis
SR=22050; RNG=np.random.default_rng(522); NOTES={'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
def hz(n):
    name=n[:2] if len(n)>=3 and n[1]=='#' else n[0]; o=int(n[len(name):]); midi=12*(o+1)+NOTES[name]; return 440*2**((midi-69)/12)
def env(n,a=.005,r=.08):
    aa=max(1,int(a*SR)); rr=max(1,int(r*SR)); e=np.ones(n,np.float32); e[:aa]=np.linspace(0,1,aa,endpoint=False); e[-rr:]=np.linspace(1,0,rr); return e
def osc(f,dur,amp=.15,duty=.25,tri=False):
    n=max(1,int(dur*SR)); t=np.arange(n)/SR; p=(f*t)%1; y=4*np.abs(p-.5)-1 if tri else np.where(p<duty,1.,-1.); return (y*amp*env(n)).astype(np.float32)
def noise(dur,amp=.08):
    n=int(dur*SR); return (RNG.uniform(-1,1,n)*amp*env(n,.002,.05)).astype(np.float32)
def add(buf,t,s):
    i=int(t*SR); j=min(len(buf),i+len(s)); buf[i:j]+=s[:j-i]
def save(name,b):
    peak=max(1e-6,float(np.max(np.abs(b)))); pcm=(np.clip(np.tanh(b/peak*1.1)*.82,-1,1)*32767).astype('<i2');
    with wave.open(str(AUDIO/name),'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
def loop_song(name,bpm,bass,mel,bars=8):
    beat=60/bpm; total=bars*4*beat; b=np.zeros(int(total*SR),np.float32)
    for i in range(int(total/beat)):
        add(b,i*beat,osc(hz(bass[i%len(bass)]),beat*.85,.14,tri=True));
        if i%2==0:add(b,i*beat,noise(.08,.035))
    for i in range(int(total/(beat*.5))):
        n=mel[i%len(mel)];
        if n!='R': add(b,i*beat*.5,osc(hz(n),beat*.38,.12,.25))
    save(name,b)
loop_song('eastwind-road-theme.v0.1.wav',132,['C3','G2','A2','F2'],['E5','G5','A5','G5','E5','D5','C5','R'])
loop_song('glassgrass-pass-theme.v0.1.wav',156,['A2','E2','G2','D2'],['A5','C6','E6','R','G5','A5','E5','R'])
loop_song('signal-mill-theme.v0.1.wav',108,['D2','A2','C3','G2'],['D5','R','F5','A5','C6','A5','F5','R'])
# upgrade sting
b=np.zeros(int(1.7*SR),np.float32)
for i,n in enumerate(['C5','E5','G5','C6','E6']): add(b,i*.12,osc(hz(n),.45,.16,.25))
add(b,.7,osc(hz('C4'),.8,.08,tri=True)); save('echo-boots-upgrade.v0.1.wav',b)
# beacon restored
b=np.zeros(int(2.2*SR),np.float32)
for i,n in enumerate(['D4','F4','A4','D5','F5','A5','D6']): add(b,i*.13,osc(hz(n),.52,.14,.25))
for t in (.2,.5,.8,1.1): add(b,t,noise(.12,.035)); save('beacon-restored.v0.1.wav',b)

cues=[]
for cid,file,loop,role in [
 ('east-road','eastwind-road-theme.v0.1.wav',True,'Eastern Road overworld theme'),('glassgrass','glassgrass-pass-theme.v0.1.wav',True,'Glassgrass Pass route theme'),('signal-mill','signal-mill-theme.v0.1.wav',True,'Signal Mill puzzle ambience'),('echo-boots','echo-boots-upgrade.v0.1.wav',False,'Echo Boots permanent-upgrade sting'),('beacon-restored','beacon-restored.v0.1.wav',False,'Eastern Beacon restored chapter payoff')]:
    p=AUDIO/file
    with wave.open(str(p),'rb') as w: dur=w.getnframes()/w.getframerate()
    cues.append({'id':cid,'file':file,'loop':loop,'role':role,'durationSeconds':round(dur,3),'sha256':sha(p)})
manifest={'schema':'pixelforge.chapter-two-audio-pack.v5.22','cartridge':'the-legend-of-more-bounce','rightsStatus':'original','format':'PCM16 WAV','sampleRate':SR,'channels':1,'generator':'tools/generate_eastern_road_v522.py','externalSamplesUsed':False,'cues':cues,'humanAudioApproval':'pending'}
(AUDIO/'chapter-two-audio.v0.1.json').write_text(json.dumps(manifest,indent=2)+'\n')
(AUDIO/'chapter-two-audio.rights-receipt.v0.1.json').write_text(json.dumps({'schema':'pixelforge.audio-rights-receipt.v5.22','rightsStatus':'original','externalSamplesUsed':False,'externalMusicUsed':False,'cueHashes':{c['id']:c['sha256'] for c in cues}},indent=2)+'\n')
print('Generated v5.22 Eastern Road / Chapter Two art and audio.')
