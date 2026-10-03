#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, math, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'games/the-legend-of-more-bounce'
OUT=GAME/'assets/snes-v521'
AUDIO=GAME/'assets/audio-v521'
OUT.mkdir(parents=True, exist_ok=True); AUDIO.mkdir(parents=True, exist_ok=True)

# Pixel palette: deep void violet + PixelForge gold/cyan/green accents
P={
 't':(0,0,0,0),'ink':(8,8,18,255),'void':(22,14,38,255),'violet':(58,30,76,255),'purple':(96,48,118,255),
 'mag':(184,69,164,255),'cyan':(98,239,255,255),'green':(141,247,200,255),'gold':(255,211,110,255),
 'cream':(248,242,222,255),'red':(236,89,102,255),'gray':(79,76,99,255),'stone':(55,50,74,255),
 'moss':(47,91,70,255),'deepgreen':(24,55,49,255)
}

def rect(d,xy,c): d.rectangle(xy,fill=P[c])
def pxrect(d,x,y,w,h,c): rect(d,(x,y,x+w-1,y+h-1),c)

# 8-frame 64x64 boss sheet
fw=fh=64; frames=8
sheet=Image.new('RGBA',(fw*frames,fh),P['t'])
for i in range(frames):
    im=Image.new('RGBA',(fw,fh),P['t']); d=ImageDraw.Draw(im)
    bob=[0,-1,-2,-1,0,1,2,1][i]
    # shadow/void mass
    pxrect(d,14,48,36,5,'ink'); pxrect(d,10,46,44,3,'void')
    # outer note/body shape
    pxrect(d,18,13+bob,28,34,'void'); pxrect(d,14,18+bob,36,24,'violet')
    pxrect(d,18,12+bob,28,4,'purple'); pxrect(d,12,23+bob,4,14,'purple'); pxrect(d,48,23+bob,4,14,'purple')
    # note stem / crown
    pxrect(d,39,5+bob,7,14,'ink'); pxrect(d,40,5+bob,5,13,'purple'); pxrect(d,42,4+bob,7,4,'mag')
    # eyes / face: frame phases change expression
    eye_y=25+bob
    if i in (2,3):
        pxrect(d,22,eye_y,7,3,'gold'); pxrect(d,36,eye_y,7,3,'gold')
    else:
        pxrect(d,22,eye_y,7,7,'cream'); pxrect(d,36,eye_y,7,7,'cream'); pxrect(d,25,eye_y+2,3,4,'ink'); pxrect(d,36,eye_y+2,3,4,'ink')
    # mouth / flat-line motif
    if i in (4,5):
        pxrect(d,24,37+bob,16,2,'red'); pxrect(d,29,35+bob,6,2,'red')
    else: pxrect(d,24,37+bob,16,3,'ink')
    # aura notes / beat weak point
    if i in (1,5,7):
        pxrect(d,5,18,3,3,'cyan'); pxrect(d,56,14,3,3,'green'); pxrect(d,8,40,2,2,'gold'); pxrect(d,54,43,2,2,'mag')
    if i in (3,7):
        # vulnerable beat core
        pxrect(d,28,16+bob,9,9,'gold'); pxrect(d,30,18+bob,5,5,'cream')
    sheet.alpha_composite(im,(i*fw,0))
sheet_path=OUT/'flat-note-boss.v0.1.png'; sheet.save(sheet_path)
# preview scaled
sheet.resize((sheet.width*2,sheet.height*2),Image.Resampling.NEAREST).save(OUT/'flat-note-boss.preview.png')

# Resonance Seal + flat-note glyph atlas 2x16
item=Image.new('RGBA',(32,16),P['t']); d=ImageDraw.Draw(item)
# seal
pxrect(d,2,2,12,12,'gold'); pxrect(d,4,4,8,8,'violet'); pxrect(d,6,4,4,8,'cyan'); pxrect(d,4,6,8,4,'cyan'); pxrect(d,7,7,2,2,'cream')
# note glyph
pxrect(d,20,2,4,9,'purple'); pxrect(d,23,2,5,3,'mag'); pxrect(d,17,9,7,5,'violet'); pxrect(d,18,10,4,3,'gold')
item.save(OUT/'boss-items.v0.1.png')

# 672x180 arena, pixel-authored on a 336x90 logical canvas then scaled 2x
base=Image.new('RGBA',(336,90),P['ink']); d=ImageDraw.Draw(base)
# backdrop stone / void cavern
for y in range(0,68,8):
    c='void' if (y//8)%2==0 else 'violet'
    d.rectangle((0,y,335,min(67,y+7)),fill=P[c])
# side pillars
for x in (12,304):
    d.rectangle((x,15,x+18,72),fill=P['stone']); d.rectangle((x+3,18,x+15,69),fill=P['gray'])
    for yy in range(24,68,14): d.rectangle((x+5,yy,x+13,yy+3),fill=P['void'])
# musical arch
for x,y in [(86,25),(112,18),(138,14),(164,12),(190,14),(216,18),(242,25)]:
    d.rectangle((x,y,x+8,y+3),fill=P['purple']); d.rectangle((x+2,y-4,x+5,y),fill=P['mag'])
# floor
for y in range(69,90): d.rectangle((0,y,335,y),fill=P['stone'] if y%4 else P['gray'])
for x in range(0,336,16):
    d.rectangle((x,69,x+13,72),fill=P['moss'] if (x//16)%3==0 else P['violet'])
# central beat ring
for r,c in [(34,'violet'),(27,'purple'),(20,'mag'),(13,'gold')]:
    d.ellipse((168-r,46-r//2,168+r,46+r//2),outline=P[c],width=2)
# pulse pads at floor
for x in (76,130,206,260):
    d.rectangle((x,70,x+14,76),fill=P['deepgreen']); d.rectangle((x+2,70,x+12,72),fill=P['green']); d.rectangle((x+5,68,x+9,70),fill=P['cyan'])
# dark boss pedestal
for y in range(61,70): d.rectangle((151,y,185,y),fill=P['void'])
# rune cracks
for x in (45,101,232,289):
    d.line((x,36,x+6,44,x+2,51,x+8,58),fill=P['cyan'],width=1)
base=base.resize((672,180),Image.Resampling.NEAREST)
base.save(OUT/'flat-note-arena.v0.1.png')
base.resize((1344,360),Image.Resampling.NEAREST).save(OUT/'flat-note-arena.preview-2x.png')

# Art receipt
assets=[]
for f in ['flat-note-boss.v0.1.png','boss-items.v0.1.png','flat-note-arena.v0.1.png']:
    p=OUT/f; assets.append({'file':f,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
receipt={'schema':'pixelforge.boss-art-receipt.v5.21','cartridge':'the-legend-of-more-bounce','boss':'the-flat-note','rightsStatus':'original','source':'Original PixelForge pixel art generated locally for v5.21 boss/combat pass','assets':assets,'humanVisualApproval':'pending'}
(OUT/'flat-note-boss.art-receipt.v0.1.json').write_text(json.dumps(receipt,indent=2)+'\n')

# Original boss music + break/defeat SFX using deterministic synthesis
SR=22050; RNG=np.random.default_rng(521)
NOTES={'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
def hz(n):
    name=n[:2] if len(n)>=3 and n[1]=='#' else n[0]; octv=int(n[len(name):]); midi=12*(octv+1)+NOTES[name]; return 440.0*2**((midi-69)/12)
def env(n,a=.005,r=.08):
    aa=max(1,int(a*SR)); rr=max(1,int(r*SR)); e=np.ones(n,np.float32); e[:aa]=np.linspace(0,1,aa,endpoint=False); e[-rr:]=np.linspace(1,0,rr); return e
def osc(f,dur,amp=.18,duty=.25,tri=False):
    n=max(1,int(dur*SR)); t=np.arange(n)/SR; p=(f*t)%1
    y=4*np.abs(p-.5)-1 if tri else np.where(p<duty,1.,-1.)
    return (y*amp*env(n)).astype(np.float32)
def add(buf,t,s):
    i=int(t*SR); j=min(len(buf),i+len(s)); buf[i:j]+=s[:j-i]
def noise(dur,amp=.1):
    n=int(dur*SR); return (RNG.uniform(-1,1,n)*amp*env(n,.002,.06)).astype(np.float32)
def save(name,b):
    peak=max(1e-6,float(np.max(np.abs(b)))); pcm=(np.clip(np.tanh(b/peak*1.1)*.82,-1,1)*32767).astype('<i2')
    with wave.open(str(AUDIO/name),'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
# boss theme: intentionally includes drop-out beats / rests
bpm=150; beat=60/bpm; bars=12; total=bars*4*beat; buf=np.zeros(int(total*SR),np.float32)
bass=['E2','E2','D2','B1','E2','G2','D2','B1']
mel=['E5','R','G5','B5','R','A5','G5','R','D5','E5','R','B4','E5','G5','R','D5']
for n in range(int(total/beat)):
    t=n*beat
    add(buf,t,osc(hz(bass[n%len(bass)]),beat*.82,.17,tri=True))
    if n%4 in (0,2): add(buf,t,noise(.09,.06))
    if n%8==7: add(buf,t,noise(.2,.12))
for n in range(int(total/(beat*.5))):
    note=mel[n%len(mel)]
    if note!='R': add(buf,n*beat*.5,osc(hz(note),beat*.38,.16,.125))
# flat-note sustained dissonance near phrase boundaries
for t in np.arange(0,total,beat*8):
    add(buf,float(t+beat*5.5),osc(hz('A#4'),beat*1.15,.08,.5)); add(buf,float(t+beat*5.5),osc(hz('B4'),beat*1.15,.07,.5))
save('flat-note-boss-theme.v0.1.wav',buf)
# weak point / break cue
b=np.zeros(int(.8*SR),np.float32)
for i,n in enumerate(['E5','G5','B5','D6']): add(b,i*.08,osc(hz(n),.28,.18,.25))
add(b,.32,noise(.25,.08)); save('boss-break.v0.1.wav',b)
# defeat / resonance-seal sting
b=np.zeros(int(2.2*SR),np.float32)
for i,n in enumerate(['E4','G4','B4','E5','G5','B5','E6']): add(b,i*.12,osc(hz(n),.5,.15,.25))
for n in ['E3','B3','E4']: add(b,.9,osc(hz(n),1.1,.09,tri=True))
save('boss-defeat.v0.1.wav',b)

cues=[]
for cid,file,loop,role in [
 ('boss','flat-note-boss-theme.v0.1.wav',True,'The Flat Note boss music with deliberate dropped beats'),
 ('boss-break','boss-break.v0.1.wav',False,'On-beat weak-point break'),
 ('boss-defeat','boss-defeat.v0.1.wav',False,'Flat Note defeat / Resonance Seal award')]:
    p=AUDIO/file
    with wave.open(str(p),'rb') as w: dur=w.getnframes()/w.getframerate()
    cues.append({'id':cid,'file':file,'loop':loop,'role':role,'durationSeconds':round(dur,3),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
manifest={'schema':'pixelforge.boss-audio-pack.v5.21','cartridge':'the-legend-of-more-bounce','boss':'the-flat-note','rightsStatus':'original','format':'PCM16 WAV','sampleRate':SR,'channels':1,'generator':'tools/generate_flat_note_v521.py','externalSamplesUsed':False,'cues':cues,'humanAudioApproval':'pending'}
(AUDIO/'flat-note-audio.v0.1.json').write_text(json.dumps(manifest,indent=2)+'\n')
(AUDIO/'flat-note-audio.rights-receipt.v0.1.json').write_text(json.dumps({'schema':'pixelforge.audio-rights-receipt.v5.21','rightsStatus':'original','externalSamplesUsed':False,'externalMusicUsed':False,'cueHashes':{c['id']:c['sha256'] for c in cues}},indent=2)+'\n')
print('Generated v5.21 Flat Note boss art/audio.')
