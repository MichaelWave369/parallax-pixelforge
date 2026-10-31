// PixelForge Rung 09 / Boss Stage.
// Authorable 3-phase boss encounters reuse the existing Stonebridge stone ray and
// player damage rules. No script execution, remote assets or extra game engine.
import {hurtPlayer} from './puzzle.js';

export const BOSS_SCHEMA='pixelforge.layer-boss.v1';
const clamp=(v,fallback,lo,hi)=>{
  const n=Number(v);return Number.isFinite(n)?Math.min(hi,Math.max(lo,n)):fallback;
};
const word=(v,fallback,max=100)=>typeof v==='string'?v.slice(0,max):fallback;
const flag=(v)=>typeof v==='string'&&/^[a-z0-9][a-z0-9:_-]{0,63}$/.test(v)?v:'';
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function normalizeBossBeats(raw){
  if(!Array.isArray(raw))return [];
  return raw.slice(0,4).map((v,i)=>({
    title:word(v?.title,'BEAT '+(i+1),70),
    text:word(v?.text,'The world holds its breath.',220),
    seconds:clamp(v?.seconds,2,0.7,7)
  }));
}
export function bossTimelineBeats(def,kind){
  if(!def)return [];
  const authored=kind==='victory'?def.victoryBeats:def.introBeats;
  if(Array.isArray(authored)&&authored.length)return authored;
  return kind==='victory'?
    [{title:'VICTORY',text:def.name+' has fallen. The way forward opens.',seconds:2.2}]:
    [{title:def.name,text:def.intro,seconds:2.2}];
}
export function createBossTimeline(def,kind){
  if(!['intro','victory'].includes(kind))throw Error('Unknown boss timeline.');
  return {kind,beats:bossTimelineBeats(def,kind),index:0,elapsed:0,finished:false};
}
export function stepBossTimeline(timeline,dt=1/60){
  if(!timeline||timeline.finished)return false;
  const seconds=clamp(dt,0,0,.2);
  timeline.elapsed+=seconds;
  let changed=false;
  while(!timeline.finished && timeline.elapsed>=timeline.beats[timeline.index].seconds){
    timeline.elapsed-=timeline.beats[timeline.index].seconds;
    if(timeline.index>=timeline.beats.length-1){
      timeline.finished=true;
      timeline.elapsed=timeline.beats[timeline.index].seconds;
    }else timeline.index++;
    changed=true;
  }
  return changed;
}
const phaseDefaults=[
  {name:'THE AWAKENING',interval:2.0,speed:210},
  {name:'THE UNRAVELING',interval:1.35,speed:265},
  {name:'THE LAST ECHO',interval:.85,speed:335}
];
export function normalizeBoss(src){
  if(src==null)return null;
  if(!src||typeof src!=='object'||Array.isArray(src)||src.schema!==BOSS_SCHEMA)
    throw new Error('Invalid PixelForge Boss Stage v1 payload.');
  const phases=phaseDefaults.map((d,i)=>{
    const p=src.phases?.[i]||{};
    const interval=clamp(p.interval,d.interval,.45,6);
    return {
      name:word(p.name,d.name,72),
      interval,
      speed:clamp(p.speed,d.speed,70,550),
      ...(p.telegraph!=null?{telegraph:clamp(p.telegraph,.5,.15,Math.max(.16,interval-.1))}:{}),
      ...(p.cue!=null?{cue:word(p.cue,'INCOMING',70)}:{})
    };
  });
  return {
    schema:BOSS_SCHEMA,
    id:flag(src.id)||'boss-warden',
    name:word(src.name,'THE ASH WARDEN',70),
    intro:word(src.intro,'The long silence ends. Show me your courage.',350),
    x:clamp(src.x,1320,0,5940),y:clamp(src.y,409,-200,750),
    w:clamp(src.w,76,40,150),h:clamp(src.h,91,45,170),
    triggerX:clamp(src.triggerX,1200,0,5940),
    triggerY:clamp(src.triggerY,350,-200,750),
    triggerW:clamp(src.triggerW,150,24,700),
    triggerH:clamp(src.triggerH,150,24,600),
    maxHealth:Math.round(clamp(src.maxHealth,6,3,12)),
    victoryFlag:flag(src.victoryFlag),
    phases,
    ...(src.introBeats!=null?{introBeats:normalizeBossBeats(src.introBeats)}:{}),
    ...(src.victoryBeats!=null?{victoryBeats:normalizeBossBeats(src.victoryBeats)}:{})
  };
}
export function bossFlags(atlas){
  return [...new Set((atlas?.rooms||[]).map(r=>r.boss?.victoryFlag).filter(Boolean))];
}
function initialState(def){
  return {id:def.id,status:'dormant',hp:def.maxHealth,phase:0,
    invulnerable:0,attackTimer:def.phases[0].interval,aim:null,orbs:[],time:0,version:0};
}
export function currentBoss(session){
  return session.atlas?.rooms.find(r=>r.id===session.roomId)?.boss||null;
}
export function initializeBossRoom(session){
  const def=currentBoss(session);
  if(!def)return; // Legacy rooms gain no phantom boss state or save fields.
  session.game.boss=initialState(def);
}
export function snapshotBoss(stage){
  if(!stage)return null;
  return {id:stage.id,status:stage.status==='defeated'?'defeated':
      stage.status==='battle'||stage.status==='intro'?'battle':'dormant',
    hp:stage.status==='defeated'?0:stage.hp};
}
export function normalizeBossProgress(def,src){
  if(!def||!src||typeof src!=='object'||Array.isArray(src)||src.id!==def.id)return null;
  const hp=Math.round(clamp(src.hp,def.maxHealth,0,def.maxHealth));
  const defeated=src.status==='defeated'&&hp===0;
  const status=defeated?'defeated':src.status==='battle'||src.status==='intro'?'battle':'dormant';
  return {id:def.id,status,hp:defeated?0:Math.max(1,hp)};
}
export function restoreBossProgress(session,progress){
  const def=currentBoss(session),stage=session.game.boss;
  if(!def||!stage)return;
  const safe=normalizeBossProgress(def,progress);
  if(!safe)return;
  stage.status=safe.status;
  stage.hp=safe.hp;
  stage.phase=stage.status==='defeated'?2:phaseFor(def,stage.hp);
  stage.invulnerable=1.0;
  stage.orbs=[];
  stage.aim=null;
  stage.attackTimer=def.phases[stage.phase].interval;
}
function phaseFor(def,hp){
  const fraction=hp/def.maxHealth;
  return fraction>2/3?0:fraction>1/3?1:2;
}
export function beginBossBattle(session){
  const stage=session.game.boss,def=currentBoss(session);
  if(!stage||!def||stage.status!=='intro')return false;
  stage.status='battle';
  stage.attackTimer=def.phases[0].interval;
  stage.aim=null;
  stage.version++;
  session.bossVersion=(session.bossVersion||0)+1;
  session.notice='BOSS ENCOUNTER: '+def.name.toUpperCase();
  session.noticeLeft=4;
  return true;
}
export function stepBossStage(session,dt=1/60){
  const def=currentBoss(session),stage=session.game.boss;
  if(!def||!stage||session.game.status!=='playing')return {introStarted:false};
  const game=session.game,p=game.player;
  if(stage.status==='dormant'){
    if(overlaps(p,{x:def.triggerX,y:def.triggerY,w:def.triggerW,h:def.triggerH})){
      stage.status='intro';stage.version++;
      return {introStarted:true};
    }
    return {introStarted:false};
  }
  if(stage.status!=='battle')return {introStarted:false};
  const delta=clamp(dt,1/60,0,1/30);
  stage.time+=delta;
  stage.invulnerable=Math.max(0,stage.invulnerable-delta);
  for(const shot of game.shots){
    if(shot.ttl<=0||!overlaps(shot,def))continue;
    shot.ttl=-1; // Boss consumes the ray, even during its hit cooldown.
    if(stage.invulnerable>0)continue;
    stage.hp=Math.max(0,stage.hp-1);
    stage.invulnerable=.32;
    stage.version++;
    if(stage.hp===0){
      stage.status='defeated';
      stage.orbs=[];
      stage.aim=null;
      if(def.victoryFlag)session.worldFlags.add(def.victoryFlag);
      session.notice=def.name.toUpperCase()+' HAS FALLEN.';
      session.noticeLeft=5;
    }else{
      const next=phaseFor(def,stage.hp);
      if(next!==stage.phase){
        stage.phase=next;stage.attackTimer=def.phases[next].interval;
        stage.aim=null;stage.orbs=[];
        session.notice='PHASE '+(next+1)+': '+def.phases[next].name;
        session.noticeLeft=4;
      }
    }
    session.bossVersion=(session.bossVersion||0)+1;
    if(stage.status==='defeated')return {introStarted:false,defeated:true};
  }
  game.shots=game.shots.filter(shot=>shot.ttl>0);
  stage.attackTimer-=delta;
  const phase=def.phases[stage.phase];
  // Aim locks at telegraph start, so the visible warning and real orb use the
  // exact same lane and direction. Dodging after the cue actually matters.
  const telegraph=Math.min(phase.telegraph??Math.min(.55,phase.interval*.5),phase.interval-.08);
  if(stage.attackTimer<=telegraph&&!stage.aim){
    const toward=p.x+p.w/2<def.x+def.w/2?-1:1;
    stage.aim={toward,y:clamp(p.y+p.h/2,350,280,500)};
  }
  if(stage.attackTimer<=0){
    const aim=stage.aim;
    stage.orbs.push({
      x:def.x+def.w/2+32*aim.toward,y:aim.y,
      vx:aim.toward*phase.speed,ttl:4.5
    });
    stage.aim=null;
    stage.attackTimer=phase.interval;
  }
  stage.orbs=stage.orbs.filter(orb=>{
    orb.x+=orb.vx*delta;orb.ttl-=delta;
    if(orb.ttl<=0||orb.x<0||orb.x>game.puzzle.worldWidth)return false;
    if(overlaps({x:orb.x-9,y:orb.y-9,w:18,h:18},p)){
      hurtPlayer(game);
      return false;
    }
    return true;
  }).slice(-24);
  return {introStarted:false};
}
export function renderBossStage(ctx,session,cameraX=0,{guides=false}={}){
  const def=currentBoss(session),stage=session.game.boss;
  if(!def)return;
  ctx.save();
  ctx.translate(-Math.round(cameraX),0);
  if(stage?.status!=='defeated'){
    const t=stage?.time||0;
    const shift=Math.sin(t*3)*3;
    ctx.save();ctx.translate(def.x,def.y+shift);
    ctx.fillStyle='#0d1724';ctx.beginPath();
    ctx.moveTo(def.w/2,-19);ctx.lineTo(def.w+14,def.h);
    ctx.lineTo(-14,def.h);ctx.closePath();ctx.fill();
    ctx.fillStyle=stage?.invulnerable>0?'#d6f7f0':'#607889';
    ctx.beginPath();ctx.arc(def.w/2,10,28,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#132134';ctx.beginPath();ctx.arc(def.w/2,10,23,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e6b6a3';ctx.fillRect(def.w/2-14,8,7,4);ctx.fillRect(def.w/2+7,8,7,4);
    ctx.strokeStyle='#d7dfd8';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(def.w-1,def.h);ctx.lineTo(def.w+23,-12);ctx.stroke();
    ctx.strokeStyle='#f1c39c';ctx.lineWidth=6;
    ctx.beginPath();ctx.arc(def.w+15,-13,26,3.2,5.95);ctx.stroke();
    ctx.restore();
  }
  // Fixed, readable attack telegraph: translucent lane + high-contrast markers.
  // No flashing screen overlays or randomized unannounced projectiles.
  if(stage?.status==='battle'&&stage.aim){
    const y=stage.aim.y,left=stage.aim.toward<0?0:def.x+def.w/2;
    const right=stage.aim.toward<0?def.x+def.w/2:session.game.puzzle.worldWidth;
    const width=Math.max(0,right-left);
    ctx.fillStyle='#e2a3a336';ctx.fillRect(left,y-13,width,26);
    ctx.fillStyle='#ffdfb0';ctx.fillRect(left,y-2,width,4);
    ctx.fillStyle='#f5d5aa';ctx.font='bold 12px ui-monospace,monospace';
    const label=def.phases[stage.phase].cue||'INCOMING';
    ctx.fillText(label.slice(0,70),def.x-30,y-24);
  }
  for(const orb of stage?.orbs||[]){
    ctx.fillStyle='#d6bad455';ctx.beginPath();ctx.arc(orb.x,orb.y,17,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f6baba';ctx.beginPath();ctx.arc(orb.x,orb.y,8,0,Math.PI*2);ctx.fill();
  }
  if(guides){
    ctx.setLineDash([7,4]);ctx.strokeStyle='#ebaa99';ctx.lineWidth=2;
    ctx.strokeRect(def.triggerX,def.triggerY,def.triggerW,def.triggerH);
    ctx.setLineDash([]);
    ctx.strokeStyle='#ffe0a8';ctx.strokeRect(def.x,def.y,def.w,def.h);
  }
  ctx.restore();
}
export function renderBossHud(ctx,session,w=960){
  const def=currentBoss(session),stage=session.game.boss;
  if(!def||!stage||!['battle','defeated'].includes(stage.status))return;
  const left=Math.max(16,(w-390)/2);
  ctx.save();ctx.fillStyle='#07131be8';ctx.fillRect(left,8,390,62);
  ctx.fillStyle='#f4c5aa';ctx.font='bold 12px ui-monospace,monospace';
  ctx.fillText(def.name.toUpperCase().slice(0,42),left+14,28);
  ctx.fillStyle='#455362';ctx.fillRect(left+14,39,362,12);
  ctx.fillStyle=stage.status==='defeated'?'#7dc4a3':'#e0a4a1';
  ctx.fillRect(left+14,39,362*(stage.hp/def.maxHealth),12);
  ctx.fillStyle='#cfdbd9';ctx.font='10px ui-monospace,monospace';
  ctx.fillText(stage.status==='defeated'?'VANQUISHED':
    'PHASE '+(stage.phase+1)+' / '+def.phases[stage.phase].name,left+180,28);
  ctx.restore();
}
