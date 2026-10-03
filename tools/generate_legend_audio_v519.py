#!/usr/bin/env python3
from __future__ import annotations
import math, wave, json, hashlib
from pathlib import Path
import numpy as np

SR=22050
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'games/the-legend-of-more-bounce/assets/audio-v519'
OUT.mkdir(parents=True, exist_ok=True)
RNG=np.random.default_rng(369)
NOTES={'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}

def hz(note):
    if note=='R': return 0.0
    name=note[:2] if len(note)>=3 and note[1]=='#' else note[0]
    octv=int(note[len(name):])
    midi=12*(octv+1)+NOTES[name]
    return 440.0*(2**((midi-69)/12))

def env(n,attack=.01,decay=.04,sustain=.72,release=.08):
    a=max(1,int(attack*SR)); d=max(1,int(decay*SR)); r=max(1,int(release*SR))
    if a+d+r>=n:
        q=max(1,n//3); a=d=r=q
    s=max(0,n-a-d-r); e=np.empty(n,dtype=np.float32); i=0
    e[i:i+a]=np.linspace(0,1,a,endpoint=False); i+=a
    e[i:i+d]=np.linspace(1,sustain,d,endpoint=False); i+=d
    if s: e[i:i+s]=sustain; i+=s
    e[i:]=np.linspace(sustain,0,n-i,endpoint=True)
    return e

def osc(freq,dur,kind='pulse',amp=.25,duty=.5):
    n=max(1,int(dur*SR)); t=np.arange(n)/SR
    if freq<=0: return np.zeros(n,np.float32)
    p=(freq*t)%1
    if kind=='pulse': y=np.where(p<duty,1.0,-1.0)
    elif kind=='triangle': y=4*np.abs(p-.5)-1
    else: y=np.sin(2*np.pi*freq*t)
    return (amp*y*env(n)).astype(np.float32)

def add(buf,start,sig):
    i=int(start*SR); j=min(len(buf),i+len(sig))
    if 0<=i<len(buf): buf[i:j]+=sig[:j-i]

def noise(dur,amp=.16):
    n=max(1,int(dur*SR)); x=RNG.uniform(-1,1,n).astype(np.float32)
    return amp*x*env(n,.002,.03,.25,.05)

def kick(dur=.12,amp=.30):
    n=int(dur*SR); t=np.arange(n)/SR
    f=90*np.exp(-9*t)+42; phase=2*np.pi*np.cumsum(f)/SR
    return (amp*np.sin(phase)*env(n,.002,.03,.25,.06)).astype(np.float32)

def save_wav(filename,data):
    peak=max(1e-6,float(np.max(np.abs(data))))
    data=np.tanh(data*0.9/peak*1.15)*.82
    pcm=(np.clip(data,-1,1)*32767).astype('<i2')
    path=OUT/filename
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

def mix_music(name,bpm,bars,melody,bass,chords=None,drums=True,lead='pulse',duty=.25):
    beat=60/bpm; total=bars*4*beat; buf=np.zeros(int(total*SR),np.float32)
    # bass pattern repeated
    cur=0.0; temp=np.zeros_like(buf)
    for note,beats in bass:
        dur=beats*beat; add(temp,cur,osc(hz(note),dur*.92,'triangle',.18)); cur+=dur
    if cur:
        seg=temp[:int(cur*SR)]
        for start in np.arange(0,total,cur): add(buf,float(start),seg)
    if chords:
        for bi in range(int(total/(beat*.5))):
            chord=chords[(bi//8)%len(chords)]; note=chord[bi%len(chord)]
            add(buf,bi*beat*.5,osc(hz(note),beat*.42,'pulse',.07,.125))
    cur=0; idx=0
    while cur<total-.01:
        note,beats=melody[idx%len(melody)]; dur=beats*beat
        add(buf,cur,osc(hz(note),dur*.86,lead,.18,duty)); cur+=dur; idx+=1
    if drums:
        for b in range(int(total/beat)):
            t=b*beat
            if b%4 in (0,2): add(buf,t,kick(.12,.20))
            if b%4 in (1,3): add(buf,t,noise(.09,.10))
            add(buf,t+beat*.5,noise(.025,.045))
    save_wav(name,buf)

# Original themes
mix_music('title-theme.v0.1.wav',112,8,
 [('D5',1),('F#5',.5),('A5',.5),('B5',1),('A5',1),('F#5',1),('E5',1),('D5',2),('R',.5),('A4',.5),('D5',1),('E5',1),('F#5',1),('A5',1),('B5',.5),('A5',.5),('F#5',1),('E5',1),('D5',2)],
 [('D3',2),('A2',2),('B2',2),('G2',2)],
 [('D4','F#4','A4'),('B3','D4','F#4'),('G3','B3','D4'),('A3','C#4','E4')])

mix_music('bouncehome-grove-theme.v0.1.wav',124,8,
 [('G5',.5),('A5',.5),('B5',1),('D6',1),('B5',1),('A5',.5),('G5',.5),('E5',1),('G5',1),('A5',1),('B5',.5),('A5',.5),('G5',1),('D5',1),('E5',1),('G5',2),('R',1)],
 [('G2',1),('D3',1),('E3',1),('B2',1),('C3',1),('G2',1),('D3',1),('D3',1)],
 [('G4','B4','D5'),('E4','G4','B4'),('C4','E4','G4'),('D4','F#4','A4')],lead='pulse',duty=.375)

mix_music('wobble-woods-theme.v0.1.wav',138,8,
 [('E5',.5),('G5',.5),('B5',.5),('A5',.5),('G5',1),('E5',1),('D5',.5),('E5',.5),('G5',1),('B5',1),('C6',.5),('B5',.5),('A5',1),('G5',1),('E5',1),('D5',1),('B4',1),('E5',1)],
 [('E2',1),('B2',1),('D3',1),('B2',1),('C3',1),('G2',1),('B2',1),('D3',1)],
 [('E4','G4','B4'),('D4','G4','B4'),('C4','E4','G4'),('B3','D4','F#4')],lead='pulse',duty=.25)

mix_music('larrina-tower-theme.v0.1.wav',88,8,
 [('A4',1),('C5',1),('E5',2),('D5',1),('C5',1),('B4',2),('A4',1),('E5',1),('G5',1),('E5',1),('D5',2),('C5',2)],
 [('A2',2),('E3',2),('F2',2),('C3',2)],
 [('A3','C4','E4'),('F3','A3','C4'),('C4','E4','G4'),('G3','B3','D4')],drums=False,lead='triangle')

# Original SFX
n=int(.28*SR); t=np.arange(n)/SR; f=170+420*np.exp(-10*t)+80*np.sin(2*np.pi*8*t); ph=2*np.pi*np.cumsum(f)/SR
save_wav('bounce-impact.v0.1.wav',(.38*np.sin(ph)*env(n,.001,.03,.35,.12)).astype(np.float32))
buf=np.zeros(int(.75*SR),np.float32)
for i,note in enumerate(['G5','B5','D6','G6','B6']): add(buf,i*.10,osc(hz(note),.24,'pulse',.23,.25))
add(buf,.48,osc(hz('D7'),.25,'triangle',.14)); save_wav('rune-pickup.v0.1.wav',buf)
buf=np.zeros(int(1.25*SR),np.float32)
for i,note in enumerate(['E4','G4','B4','D5','E5','G5','B5']): add(buf,i*.11,osc(hz(note),.35,'pulse',.12,.125))
add(buf,.55,noise(.65,.08)); save_wav('echo-gate-open.v0.1.wav',buf)
save_wav('dialogue-blip.v0.1.wav',osc(hz('C6'),.055,'pulse',.16,.25))
buf=np.zeros(int(.3*SR),np.float32); add(buf,0,noise(.15,.22)); add(buf,.015,osc(hz('D3'),.22,'triangle',.22)); save_wav('hit.v0.1.wav',buf)
buf=np.zeros(int(2.8*SR),np.float32)
for i,note in enumerate(['G4','B4','D5','G5','B5','D6']): add(buf,i*.16,osc(hz(note),.55,'pulse',.15,.25))
for note in ['G3','B3','D4','G4']: add(buf,1.15,osc(hz(note),1.55,'triangle',.10))
add(buf,1.15,noise(.45,.055)); save_wav('ending-sting.v0.1.wav',buf)

cues=[
 ('title','title-theme.v0.1.wav',True,'Title screen music'),('overworld','bouncehome-grove-theme.v0.1.wav',True,'Bouncehome Grove music'),('woods','wobble-woods-theme.v0.1.wav',True,'Wobble Woods music'),('tower','larrina-tower-theme.v0.1.wav',True,'Larrina Tower music'),('bounce-impact','bounce-impact.v0.1.wav',False,'Bounce pad impact'),('rune-pickup','rune-pickup.v0.1.wav',False,'Bounce Rune pickup'),('gate-open','echo-gate-open.v0.1.wav',False,'Echo Gate opening'),('dialogue-blip','dialogue-blip.v0.1.wav',False,'Dialogue text blip'),('hit','hit.v0.1.wav',False,'Damage/fall hit'),('ending','ending-sting.v0.1.wav',False,'Run-complete ending sting')]
manifest={'schema':'pixelforge.audio-cue-pack.v1','packVersion':'0.1.0','cartridge':'the-legend-of-more-bounce','profile':'snes-inspired-original','sampleRate':SR,'channels':1,'format':'PCM16 WAV','generator':'tools/generate_legend_audio_v519.py','rightsStatus':'original','networkRequired':False,'cues':[],'boundary':'All cues are deterministic oscillator/noise synthesis generated locally from original note/event patterns. No external samples, recordings, or copyrighted game music are used.'}
for cue,file,loop,role in cues:
    p=OUT/file
    with wave.open(str(p),'rb') as w: dur=w.getnframes()/w.getframerate()
    sha=hashlib.sha256(p.read_bytes()).hexdigest()
    manifest['cues'].append({'id':cue,'file':file,'role':role,'loop':loop,'durationSeconds':round(dur,3),'sha256':sha})
(OUT/'legend-audio-cues.v0.1.json').write_bytes((json.dumps(manifest,indent=2)+'\n').encode('utf-8'))
receipt={'schema':'pixelforge.audio-rights-receipt.v1','cartridge':'the-legend-of-more-bounce','pack':'legend-audio-cues.v0.1','rightsStatus':'original','source':'Deterministic synthesis source included in repository','externalSamplesUsed':False,'externalMusicUsed':False,'cueHashes':{c['id']:c['sha256'] for c in manifest['cues']}}
(OUT/'legend-audio.rights-receipt.v0.1.json').write_bytes((json.dumps(receipt,indent=2)+'\n').encode('utf-8'))
print('Generated',len(cues),'cues')
for c in manifest['cues']: print(c['id'],c['durationSeconds'],c['sha256'][:12])
