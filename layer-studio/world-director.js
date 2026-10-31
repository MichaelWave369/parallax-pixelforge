// Layer Studio Rung 4 / World Director. Data-only triggers, camera zones and light masks.
// Deliberately no arbitrary callbacks, script actions, URLs or host capabilities.
export const DIRECTOR_SCHEMA='pixelforge.layer-director.v1';
export const TRIGGER_KINDS=['message','checkpoint','flag'];
const limit=(v,def,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
const label=(s,fallback,max=100)=>typeof s==='string'?s.slice(0,max):fallback;
const color=(c,fallback='#ffcf93')=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)?c:fallback;
const rectsOverlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function emptyDirector(){
  return {schema:DIRECTOR_SCHEMA,ambient:0,triggers:[],cameras:[],lights:[]};
}
export function demoDirector(){
  return {
    schema:DIRECTOR_SCHEMA,ambient:.32,
    triggers:[
      {id:'vault-whisper',kind:'message',x:198,y:360,w:110,h:140,message:'THE STONE REMEMBERS. THE BRIDGE AWAITS.',once:true},
      {id:'far-bank-beacon',kind:'checkpoint',x:862,y:406,w:100,h:94,message:'BEACON LIT. RETURN HERE IF YOU FALL.',once:true}
    ],
    cameras:[
      {id:'cathedral-reveal',x:1040,w:430,focus:.57}
    ],
    lights:[
      {id:'courtyard-lantern',x:340,y:302,radius:265,intensity:1,color:'#e8bc81'},
      {id:'sentinel-glow',x:685,y:375,radius:205,intensity:.85,color:'#8fded2'},
      {id:'altar-fire',x:1250,y:350,radius:265,intensity:1,color:'#efac82'}
    ]
  };
}
export function normalizeDirector(source){
  if(source==null)return emptyDirector();
  if(!source||typeof source!=='object'||Array.isArray(source)||source.schema!==DIRECTOR_SCHEMA)
    throw new Error('Invalid PixelForge World Director v1 payload.');
  const ids=new Set();
  const unique=(item,prefix,index)=>{
    let id=label(item?.id,prefix+'-'+index,64)||prefix+'-'+index;
    if(ids.has(id))id=prefix+'-'+index;
    if(ids.has(id)){let serial=1;while(ids.has(id+'-'+serial))serial++;id+='-'+serial;}
    ids.add(id);return id;
  };
  const triggers=(Array.isArray(source.triggers)?source.triggers:[]).slice(0,32).map((t,i)=>({
    id:unique(t,'trigger',i),
    kind:TRIGGER_KINDS.includes(t?.kind)?t.kind:'message',
    x:limit(t?.x,0,-2048,6000),y:limit(t?.y,400,-1000,1500),
    w:limit(t?.w,90,8,1200),h:limit(t?.h,100,8,1200),
    message:label(t?.message,'',180),once:t?.once!==false,
    ...(t?.kind==='flag'?{flagId:typeof t?.flagId==='string'&&
      /^[a-z0-9][a-z0-9:_-]{0,63}$/.test(t.flagId)?t.flagId:''}:{})
  }));
  const cameras=(Array.isArray(source.cameras)?source.cameras:[]).slice(0,16).map((z,i)=>({
    id:unique(z,'camera',i),
    x:limit(z?.x,0,0,6000),w:limit(z?.w,400,50,2400),
    focus:limit(z?.focus,.38,.15,.85)
  }));
  const lights=(Array.isArray(source.lights)?source.lights:[]).slice(0,24).map((l,i)=>({
    id:unique(l,'light',i),
    x:limit(l?.x,0,-2048,6000),y:limit(l?.y,270,-1000,1500),
    radius:limit(l?.radius,240,24,1200),
    intensity:limit(l?.intensity,.9,0,1),
    color:color(l?.color)
  }));
  return {schema:DIRECTOR_SCHEMA,ambient:limit(source.ambient,0,0,.8),triggers,cameras,lights};
}
// Runs on the same fixed tick as physics. Once triggers never repeat in the same attempt.
// Repeat triggers fire on a new entry, not every frame while standing inside.
export function stepDirector(state,dt=1/60){
  const director=state.puzzle?.director;
  if(!director)return;
  state.eventMessageRemaining=Math.max(0,(state.eventMessageRemaining||0)-dt);
  if(state.eventMessageRemaining===0)state.eventMessage='';
  const player=state.player,inside=new Set();
  for(const trigger of director.triggers){
    if(!rectsOverlap(player,trigger))continue;
    // A checkpoint entered in midair must remain eligible when the player lands.
    if(trigger.kind==='checkpoint'&&!player.grounded)continue;
    inside.add(trigger.id);
    if(state.directorSeen.has(trigger.id)&&trigger.once)continue;
    if(state.directorInside.has(trigger.id))continue;
    // Save a grounded checkpoint only, so respawns cannot trap the hero in midair.
    if(trigger.kind==='checkpoint'){
      state.checkpoint={id:trigger.id,x:player.x,y:player.y};
    }
    if(trigger.once)state.directorSeen.add(trigger.id);
    state.eventMessage=trigger.message||(trigger.kind==='checkpoint'?'CHECKPOINT ACTIVE':'ZONE ENTERED');
    state.eventMessageRemaining=4;
    state.eventVersion++;
    // Fixed-tick event receipt, consumed only by the Room Atlas session.
    // Independent quests never execute imported code.
    (state.directorEvents??=[]).push({id:trigger.id,kind:trigger.kind,flagId:trigger.flagId});
  }
  state.directorInside=inside;
}
export function cameraFocus(state){
  const zones=state.puzzle?.director?.cameras||[];
  const center=state.player.x+state.player.w/2;
  const active=zones.find(zone=>center>=zone.x&&center<zone.x+zone.w);
  return active?.focus??.38;
}
let maskCanvas=null;
export function renderDirectorLighting(ctx,director,cameraX=0,w=960,h=540,{enabled=true}={}){
  if(!enabled||!director||director.ambient<=0||typeof document==='undefined')return false;
  // The darkness lives on its own offscreen surface. destination-out must never
  // operate on the scene canvas, or it would erase already-rendered scenery.
  if(!maskCanvas||maskCanvas.width!==w||maskCanvas.height!==h){
    maskCanvas=document.createElement('canvas');maskCanvas.width=w;maskCanvas.height=h;
  }
  const m=maskCanvas.getContext('2d');if(!m)return false;
  m.save();m.globalCompositeOperation='source-over';m.clearRect(0,0,w,h);
  m.fillStyle='rgba(2,8,18,'+director.ambient+')';m.fillRect(0,0,w,h);
  m.globalCompositeOperation='destination-out';
  for(const light of director.lights){
    if(light.intensity<=0)continue;
    const x=light.x-cameraX,y=light.y,r=light.radius;
    if(x+r<0||x-r>w||y+r<0||y-r>h)continue;
    const g=m.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,'rgba(0,0,0,'+light.intensity+')');
    g.addColorStop(.28,'rgba(0,0,0,'+(light.intensity*.85)+')');
    g.addColorStop(.75,'rgba(0,0,0,'+(light.intensity*.25)+')');
    g.addColorStop(1,'rgba(0,0,0,0)');
    m.fillStyle=g;m.beginPath();m.arc(x,y,r,0,Math.PI*2);m.fill();
  }
  m.restore();
  ctx.save();ctx.drawImage(maskCanvas,0,0);
  // Tiny colored glow, deliberately subtle so imported pixel art remains readable.
  ctx.globalCompositeOperation='screen';ctx.globalAlpha=.13;
  for(const light of director.lights){
    if(light.intensity<=0)continue;
    const x=light.x-cameraX,y=light.y,r=light.radius*.7;
    if(x+r<0||x-r>w||y+r<0||y-r>h)continue;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,light.color);g.addColorStop(1,'#000000');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();return true;
}
export function renderDirectorGuides(ctx,director,cameraX=0,w=960,h=540){
  if(!director)return;
  ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
  ctx.lineWidth=2;ctx.font='bold 11px ui-monospace,monospace';
  for(const t of director.triggers){
    const x=t.x-cameraX;if(x+t.w<0||x>w)continue;
    ctx.fillStyle=t.kind==='checkpoint'?'#8fe9b927':'#e6c18b22';
    ctx.strokeStyle=t.kind==='checkpoint'?'#7fe8bd':'#e9ca92';
    ctx.fillRect(x,t.y,t.w,t.h);ctx.strokeRect(x,t.y,t.w,t.h);
    ctx.fillStyle='#e5f6ee';ctx.fillText(t.id,x+3,t.y-5);
  }
  for(const z of director.cameras){
    const x=z.x-cameraX;ctx.strokeStyle='#9dbbfa';ctx.setLineDash([8,6]);
    ctx.strokeRect(x,0,z.w,h);ctx.setLineDash([]);
  }
  for(const l of director.lights){
    const x=l.x-cameraX;ctx.strokeStyle=l.color;ctx.beginPath();
    ctx.arc(x,l.y,l.radius,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=l.color;ctx.fillRect(x-4,l.y-4,8,8);
  }
  ctx.restore();
}
