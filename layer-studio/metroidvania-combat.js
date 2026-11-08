// Optional Metroidvania layer-mode: original short-range chain attack and secret discoveries.
// Pure fixed-step game state; no new engine, network calls, downloads or executable assets.
import {combatEffects} from './metroidvania-profile.js';
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export const CHAIN_REACH=102;
export const CHAIN_COOLDOWN=.28;
export const CHAIN_FLASH=.14;
export const secretKey=(roomId,id)=>roomId+':'+id;

function activeRoom(session){
  return session.atlas?.rooms.find(r=>r.id===session.roomId);
}
export function initializeMetroidvaniaCombat(session){
  if(session.atlas?.combatMode!=='chain')return;
  session.chain={cooldown:0,active:0,swings:0};
  session.brokenSecrets=new Set();
  session.foundSecrets=new Set();
  session.game.chainMode=true;
}
export function chainStrikeBox(player,reach=CHAIN_REACH){
  return {x:player.facing>0?player.x+player.w:player.x-reach,
    y:player.y-6,w:reach,h:player.h+12};
}
export function effectiveChainReach(session){
  const effects=combatEffects(session.atlas?.combatProfile);
  return CHAIN_REACH+(session.atlas?.combatProfile?.movement==='arcane'?18:0)+(effects.has('extra-range')?48:0);
}
export function stepMetroidvaniaCombat(session,input={},previousX,dt=1/60){
  if(session.atlas?.combatMode!=='chain'||session.game.status!=='playing')return;
  const game=session.game,p=game.player,room=activeRoom(session),delta=Math.max(0,Math.min(1/30,dt));
  const chain=session.chain;
  const effects=combatEffects(session.atlas?.combatProfile);
  chain.cooldown=Math.max(0,chain.cooldown-delta);
  chain.active=Math.max(0,chain.active-delta);
  // Keep solid walls physically solid, including when dashing; broken walls cease colliding.
  for(const wall of room?.breakables||[]){
    if(session.brokenSecrets.has(secretKey(session.roomId,wall.id)))continue;
    if(p.y+p.h<=wall.y||p.y>=wall.y+wall.h)continue;
    if(previousX+p.w<=wall.x+1 && p.x+p.w>wall.x){
      p.x=wall.x-p.w;p.vx=0;p.dashTime=0;
    }else if(previousX>=wall.x+wall.w-1 && p.x<wall.x+wall.w){
      p.x=wall.x+wall.w;p.vx=0;p.dashTime=0;
    }
  }
  if(input.firePressed===true&&chain.cooldown===0){
    chain.cooldown=CHAIN_COOLDOWN;
    chain.active=CHAIN_FLASH;
    chain.swings++;
    const hit=chainStrikeBox(p,effectiveChainReach(session));
    if(effects.has('guard-pulse'))p.invulnerable=Math.max(p.invulnerable,.18);
    for(const enemy of game.enemies){
      if(enemy.stone||enemy.dormant||!overlap(hit,enemy))continue;
      const damage=effects.has('bonus-damage')?2:1;
      enemy.hp=Math.max(0,(enemy.hp??enemy.resilience??1)-damage);
      if(enemy.hp===0)enemy.dormant=true;
      if(effects.has('life-steal'))game.health=Math.min(3,game.health+1);
      session.notice=enemy.dormant?'CHAIN STRIKE! WRAITH BANISHED.':'CHAIN STRIKE! ARMOR CRACKED.';
      session.noticeLeft=2.2;
      break;
    }
    for(const wall of room?.breakables||[]){
      const key=secretKey(session.roomId,wall.id);
      if(session.brokenSecrets.has(key)||!overlap(hit,wall))continue;
      if(wall.requiresAbilities.some(id=>!session.abilities?.has(id))){
        session.notice='A TRAVERSAL ABILITY IS NEEDED TO BREAK THIS SEAL.';
        session.noticeLeft=3;
        continue;
      }
      session.brokenSecrets.add(key);
      session.notice='SECRET REVEALED: '+wall.name.toUpperCase();
      session.noticeLeft=3.5;
    }
  }
  // The prize is only collectible once the wall has been broken and the player
  // reaches the physical pickup, not merely by authoring or striking from afar.
  for(const wall of room?.breakables||[]){
    const key=secretKey(session.roomId,wall.id);
    if(!session.brokenSecrets.has(key)||session.foundSecrets.has(key))continue;
    const pickup={x:wall.x+wall.w/2-10,y:wall.y+wall.h/2-10,w:20,h:20};
    if(overlap(p,pickup)){
      session.foundSecrets.add(key);
      session.notice='HIDDEN RELIC FOUND: '+wall.name.toUpperCase();
      session.noticeLeft=4;
    }
  }
}
export function renderMetroidvaniaCombat(ctx,session,cameraX=0,{reducedMotion=false}={}){
  if(session.atlas?.combatMode!=='chain')return;
  const room=activeRoom(session),game=session.game;
  ctx.save();ctx.translate(-Math.round(cameraX),0);
  for(const wall of room?.breakables||[]){
    const key=secretKey(session.roomId,wall.id);
    if(!session.brokenSecrets.has(key)){
      ctx.fillStyle='#333d50';ctx.fillRect(wall.x,wall.y,wall.w,wall.h);
      ctx.strokeStyle='#a9a0ba';ctx.lineWidth=2;ctx.strokeRect(wall.x+2,wall.y+2,wall.w-4,wall.h-4);
      ctx.strokeStyle='#e1bf9e';ctx.beginPath();
      ctx.moveTo(wall.x+wall.w*.52,wall.y+4);
      ctx.lineTo(wall.x+wall.w*.30,wall.y+wall.h*.47);
      ctx.lineTo(wall.x+wall.w*.7,wall.y+wall.h*.65);
      ctx.lineTo(wall.x+wall.w*.43,wall.y+wall.h-4);ctx.stroke();
    }else if(!session.foundSecrets.has(key)){
      const x=wall.x+wall.w/2,y=wall.y+wall.h/2;
      ctx.fillStyle='#ffdda4';ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x+10,y);
      ctx.lineTo(x,y+12);ctx.lineTo(x-10,y);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#fff6d4';ctx.strokeRect(x-12,y-14,24,28);
    }
  }
  if(session.chain?.active>0){
    const p=game.player,box=chainStrikeBox(p,effectiveChainReach(session));
    ctx.save();
    ctx.globalAlpha=reducedMotion?0.7:Math.max(.25,session.chain.active/CHAIN_FLASH);
    ctx.strokeStyle='#ffe1a5';ctx.lineWidth=7;ctx.lineCap='round';
    ctx.beginPath();
    if(p.facing>0){
      ctx.moveTo(p.x+p.w-2,p.y+23);
      ctx.quadraticCurveTo(box.x+48,p.y-35,box.x+box.w,p.y+11);
    }else{
      ctx.moveTo(p.x+2,p.y+23);
      ctx.quadraticCurveTo(box.x+box.w-48,p.y-35,box.x,p.y+11);
    }
    ctx.stroke();ctx.restore();
    if(combatEffects(session.atlas?.combatProfile).has('guard-pulse')){
      ctx.strokeStyle='#a9e6fa';ctx.lineWidth=3;ctx.beginPath();
      ctx.arc(p.x+p.w/2,p.y+p.h/2,43,0,Math.PI*2);ctx.stroke();
    }
  }
  ctx.restore();
}
