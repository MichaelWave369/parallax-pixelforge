// PixelForge Layer Studio Rung 2: tiny, deterministic, dependency-free 2.5D puzzle runtime.
// All gameplay takes place in one world-space plane. Visual depth is rendered separately.
import {normalizeTileWorld,normalizeActor,tileCellsNear,renderTileWorld,renderActor} from './studio-bridge.js';
import {demoDirector,normalizeDirector,stepDirector,cameraFocus} from './world-director.js';
export const PUZZLE_SCHEMA = 'pixelforge.layer-puzzle.v1';
const bound = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const name = (value, fallback, limit = 64) =>
  typeof value === 'string' && value.length ? value.slice(0,limit) : fallback;
const rectOverlap = (a,b) => a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y;
const box = (x,y,w,h) => ({x,y,w,h});

export function createPuzzle() {
  return {
    schema: PUZZLE_SCHEMA,
    worldWidth: 1700,
    spawn: {x: 72, y: 458},
    platforms: [
      {id:'courtyard',x:0,y:500,w:555,h:40},
      {id:'far-bank',x:820,y:500,w:880,h:40},
      {id:'upper-ledge',x:245,y:418,w:120,h:18},
      {id:'stone-altar',x:1230,y:410,w:110,h:16}
    ],
    enemies: [
      {id:'bridge-sentinel',x:635,y:448,w:56,h:52},
      {id:'hall-wraith',x:1018,y:448,w:36,h:52}
    ],
    key: {x:1150,y:455},
    gate: {x:1515,y:424},
    tileWorld:null,
    actor:null,
    director:demoDirector()
  };
}

export function normalizePuzzle(input) {
  const d=createPuzzle();
  const s=input && typeof input==='object' && !Array.isArray(input) ? input : d;
  const worldWidth=bound(s.worldWidth,d.worldWidth,960,6000);
  const shape=(obj,i,type)=>{
    const w=bound(obj?.w,type==='platform'?120:42,10,type==='platform'?2500:100);
    const h=bound(obj?.h,type==='platform'?20:48,8,120);
    return {
      id:name(obj?.id,type+'-'+i),
      x:bound(obj?.x,60,0,worldWidth),
      y:bound(obj?.y,440,-200,850),
      w,h
    };
  };
  const normalizeSet=(v,type,max)=> {
    const list=Array.isArray(v)?v:(type==='enemy'?d.enemies:d.platforms);
    const unique=new Set();
    return list.slice(0,max).map((value,i)=>{
      const item=shape(value,i,type);
      if(unique.has(item.id))item.id=type+'-unique-'+i;
      unique.add(item.id);
      return item;
    });
  };
  return {
    schema:PUZZLE_SCHEMA,
    worldWidth,
    spawn:{
      x:bound(s.spawn?.x,d.spawn.x,0,worldWidth-28),
      y:bound(s.spawn?.y,d.spawn.y,-200,750)
    },
    platforms:normalizeSet(s.platforms,'platform',64),
    enemies:normalizeSet(s.enemies,'enemy',32),
    key:{
      x:bound(s.key?.x,d.key.x,0,worldWidth),
      y:bound(s.key?.y,d.key.y,-200,800)
    },
    gate:{
      x:bound(s.gate?.x,d.gate.x,0,worldWidth),
      y:bound(s.gate?.y,d.gate.y,-200,800)
    },
    tileWorld:normalizeTileWorld(s.tileWorld),
    actor:normalizeActor(s.actor),
    director:normalizeDirector(s.director)
  };
}
export function stonePlatform(enemy) {
  return {id:'stone-'+enemy.id,x:enemy.x-12,y:enemy.y+3,w:enemy.w+24,h:Math.min(44,enemy.h)};
}
export function startPuzzle(sceneOrPuzzle) {
  const input=sceneOrPuzzle?.playable ?? sceneOrPuzzle;
  const puzzle=normalizePuzzle(input);
  return {
    puzzle,
    player:{x:puzzle.spawn.x,y:puzzle.spawn.y,w:28,h:42,vx:0,vy:0,facing:1,grounded:false,invulnerable:0},
    enemies:puzzle.enemies.map(e=>({...e,stone:false})),
    shots:[],
    effects:[],
    health:3,
    deaths:0,
    keyCollected:false,
    petrified:0,
    shotsFired:0,
    time:0,
    cooldown:0,
    cameraX:0,
    checkpoint:null,
    directorSeen:new Set(),
    directorInside:new Set(),
    eventMessage:'',
    eventMessageRemaining:0,
    eventVersion:0,
    status:'playing'
  };
}
export function shoot(state) {
  if(state.status!=='playing'||state.cooldown>0)return false;
  const p=state.player;
  state.shots.push({
    x:p.facing>0?p.x+p.w-2:p.x-12,
    y:p.y+16,w:12,h:8,vx:680*p.facing,ttl:.6
  });
  state.shotsFired++;
  state.cooldown=.3;
  return true;
}
function solidSurfaces(s) {
  return [...s.puzzle.platforms,...s.enemies.filter(e=>e.stone).map(stonePlatform)];
}
function respawn(state) {
  const p=state.player;
  p.x=state.checkpoint?.x??state.puzzle.spawn.x;
  p.y=state.checkpoint?.y??state.puzzle.spawn.y;
  p.vx=0;p.vy=0;p.grounded=false;p.invulnerable=1.1;
  state.deaths++;
}
// Update in fixed 1/60 s steps for repeatable physics independent of display frame rate.
// Input is an object with held left/right and one-tick jumpPressed/firePressed.
export function stepPuzzle(state,input={},dt=1/60) {
  if(state.status!=='playing')return state;
  const delta=bound(dt,1/60,0,1/30),p=state.player;
  state.time+=delta;
  state.cooldown=Math.max(0,state.cooldown-delta);
  p.invulnerable=Math.max(0,p.invulnerable-delta);
  const move=(input.right?1:0)-(input.left?1:0);
  if(move)p.facing=move;
  p.vx=move*265;
  if(input.jumpPressed&&p.grounded){p.vy=-535;p.grounded=false;}
  if(input.firePressed)shoot(state);
  const previousBottom=p.y+p.h,previousTop=p.y;
  const previousX=p.x;
  p.x=Math.max(0,Math.min(state.puzzle.worldWidth-p.w,p.x+p.vx*delta));
  // The authoring grid is genuine full-block collision, unlike the one-way platforms.
  const tileMap=state.puzzle.tileWorld;
  if(tileMap&&p.vx!==0){
    const occupied=tileCellsNear(tileMap,Math.min(previousX,p.x)-1,p.y,Math.abs(p.x-previousX)+p.w+2,p.h);
    for(const cell of occupied){
      if(!cell.solid||p.y+p.h<=cell.y+1||p.y>=cell.y+cell.h-1)continue;
      if(p.vx>0&&previousX+p.w<=cell.x+1&&p.x+p.w>cell.x){p.x=Math.min(p.x,cell.x-p.w);p.vx=0;}
      if(p.vx<0&&previousX>=cell.x+cell.w-1&&p.x<cell.x+cell.w){p.x=Math.max(p.x,cell.x+cell.w);p.vx=0;}
    }
  }
  p.vy=Math.min(950,p.vy+1420*delta);
  p.y+=p.vy*delta;
  p.grounded=false;
  if(p.vy>=0) {
    let landing=Infinity;
    const tileSolids=tileCellsNear(tileMap,p.x,p.y-8,p.w,p.h+16).filter(cell=>cell.solid);
    for(const platform of [...solidSurfaces(state),...tileSolids]) {
      if(p.x+p.w>platform.x+2&&p.x<platform.x+platform.w-2 &&
         previousBottom<=platform.y+5 && p.y+p.h>=platform.y &&
         platform.y<landing)landing=platform.y;
    }
    if(landing!==Infinity){p.y=landing-p.h;p.vy=0;p.grounded=true;}
  }else if(tileMap){
    // Solid ceilings from Tile Studio; one-way authorable platforms remain jump-through.
    const ceiling=tileCellsNear(tileMap,p.x,p.y,p.w,p.h).filter(cell=>cell.solid&&
      previousTop>=cell.y+cell.h-1&&p.y<cell.y+cell.h&&
      p.x+p.w>cell.x+1&&p.x<cell.x+cell.w-1);
    if(ceiling.length){p.y=Math.max(...ceiling.map(cell=>cell.y+cell.h));p.vy=0;}
  }
  // Hazards have their own semantic tag, independent of solid collision flags.
  if(tileMap&&p.invulnerable===0&&tileCellsNear(tileMap,p.x,p.y,p.w,p.h).some(cell=>cell.hazard)){
    state.health--;
    if(state.health<=0){state.health=3;respawn(state);}
    else {p.invulnerable=1.2;p.vy=-180;}
  }
  for(const projectile of state.shots){
    projectile.x+=projectile.vx*delta;
    projectile.ttl-=delta;
    for(const enemy of state.enemies){
      if(enemy.stone||enemy.dormant||projectile.ttl<0)continue;
      if(rectOverlap(projectile,enemy)){
        enemy.stone=true;
        state.petrified++;
        state.effects.push({x:enemy.x+enemy.w/2,y:enemy.y+15,ttl:.5});
        projectile.ttl=-1;
        break;
      }
    }
  }
  state.shots=state.shots.filter(b=>b.ttl>0&&b.x>=-30&&b.x<state.puzzle.worldWidth+30);
  state.effects=state.effects.filter(e=>(e.ttl-=delta)>0);
  if(p.y>750)respawn(state);
  for(const enemy of state.enemies){
    if(!enemy.stone&&!enemy.dormant&&p.invulnerable===0&&rectOverlap(p,enemy)){
      state.health--;
      if(state.health<=0){state.health=3;respawn(state);}
      else {
        p.invulnerable=1.2;
        p.vy=-250;
        p.x=Math.max(0,Math.min(state.puzzle.worldWidth-p.w,p.x-(p.facing*32)));
      }
      break;
    }
  }
  const key=box(state.puzzle.key.x-13,state.puzzle.key.y-14,26,28);
  if(!state.keyCollected&&rectOverlap(p,key))state.keyCollected=true;
  const gate=box(state.puzzle.gate.x-12,state.puzzle.gate.y,56,76);
  if(state.keyCollected&&rectOverlap(p,gate)&&!state.worldTravel)state.status='won';
  stepDirector(state,delta);
  return state;
}
export function cameraFor(state,viewportWidth) {
  const w=bound(viewportWidth,960,320,2048);
  return Math.max(0,Math.min(Math.max(0,state.puzzle.worldWidth-w),state.player.x-w*cameraFocus(state)));
}
function polygon(ctx,points,fill) {
  ctx.fillStyle=fill;ctx.beginPath();
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();ctx.fill();
}
function drawPlayer(ctx,p,time) {
  ctx.save();
  if(p.invulnerable>0 && Math.floor(time*13)%2===0)ctx.globalAlpha=.35;
  const bob=p.grounded?Math.sin(time*11)*2:0;
  ctx.translate(Math.round(p.x+p.w/2),Math.round(p.y+bob));
  ctx.scale(p.facing,1);
  ctx.fillStyle='#0d182c';ctx.fillRect(-12,15,24,26);
  ctx.fillStyle='#d6b584';ctx.fillRect(-7,3,14,13);
  polygon(ctx,[[-14,20],[14,20],[18,41],[-17,41]],'#773c59');
  ctx.fillStyle='#d3dbce';ctx.fillRect(-9,0,18,6);
  ctx.fillStyle='#f3ce9e';ctx.fillRect(2,9,4,3);
  ctx.fillStyle='#d8c8ad';ctx.fillRect(11,24,17,3);
  ctx.fillStyle='#061723';ctx.fillRect(-10,40,8,3);ctx.fillRect(4,40,8,3);
  ctx.restore();
}
function drawWraith(ctx,e,time) {
  const y=e.y+Math.sin(time*2.4+e.x)*5;
  ctx.save();ctx.translate(e.x,y);
  ctx.fillStyle='#9ae4cf30';ctx.fillRect(-8,-5,e.w+16,e.h+8);
  polygon(ctx,[[7,14],[e.w-7,14],[e.w,e.h],[e.w*.55,e.h-7],[e.w*.28,e.h],[0,e.h]],'#b6dcceaa');
  ctx.fillStyle='#173741';ctx.fillRect(e.w*.20,2,e.w*.6,23);
  ctx.fillStyle='#f6ce83';ctx.fillRect(e.w*.32,12,4,4);ctx.fillRect(e.w*.58,12,4,4);
  ctx.restore();
}
function drawStone(ctx,e){
  const s=stonePlatform(e);
  ctx.fillStyle='#374e59';ctx.fillRect(s.x,s.y,s.w,s.h);
  ctx.strokeStyle='#aac3bc';ctx.lineWidth=3;ctx.strokeRect(s.x+2,s.y+2,s.w-4,s.h-4);
  ctx.fillStyle='#5e7880';ctx.fillRect(s.x+8,s.y+8,s.w-16,7);
  ctx.strokeStyle='#1b3540';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(s.x+20,s.y+15);ctx.lineTo(s.x+34,s.y+27);ctx.lineTo(s.x+29,s.y+39);ctx.stroke();
  ctx.fillStyle='#bcd6ce';ctx.fillRect(s.x+s.w/2-4,s.y+12,8,6);
}
export function renderPuzzle(ctx,state,options={}) {
  const w=options.width||960,h=options.height||540;
  const camera=Number.isFinite(options.cameraX)?options.cameraX:cameraFor(state,w);
  const t=options.reducedMotion?0:state.time;
  if(options.tiles!==false)renderTileWorld(ctx,state.puzzle.tileWorld,camera,w,h);
  ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
  ctx.translate(-Math.round(camera),0);
  for(const platform of state.puzzle.platforms){
    ctx.fillStyle='#192935';ctx.fillRect(platform.x,platform.y,platform.w,platform.h);
    ctx.fillStyle='#6d8986';ctx.fillRect(platform.x,platform.y,platform.w,6);
    ctx.fillStyle='#324d55';
    for(let x=platform.x+10;x<platform.x+platform.w-7;x+=38)ctx.fillRect(x,platform.y+12,19,3);
  }
  const gate=state.puzzle.gate;
  ctx.fillStyle=state.keyCollected?'#c29c65':'#33515d';
  ctx.fillRect(gate.x,gate.y,55,76);
  ctx.fillStyle='#091a2b';ctx.fillRect(gate.x+8,gate.y+8,39,68);
  ctx.fillStyle=state.keyCollected?'#f8cd75':'#53747a';ctx.fillRect(gate.x+23,gate.y+11,10,12);
  if(!state.keyCollected){
    ctx.strokeStyle='#95a8ab';ctx.lineWidth=5;ctx.beginPath();
    ctx.moveTo(gate.x+12,gate.y+42);ctx.lineTo(gate.x+43,gate.y+42);ctx.stroke();
  }
  if(!state.keyCollected){
    const k=state.puzzle.key;
    ctx.save();ctx.translate(k.x,k.y+Math.sin(t*4)*4);
    ctx.strokeStyle='#ffe5a5';ctx.lineWidth=5;ctx.beginPath();
    ctx.arc(-7,-3,8,0,Math.PI*2);ctx.moveTo(1,-3);ctx.lineTo(24,-3);
    ctx.moveTo(16,-3);ctx.lineTo(16,6);ctx.moveTo(22,-3);ctx.lineTo(22,3);
    ctx.stroke();ctx.restore();
  }
  for(const enemy of state.enemies){if(enemy.dormant)continue;if(enemy.stone)drawStone(ctx,enemy);else drawWraith(ctx,enemy,t);}
  for(const shot of state.shots){
    ctx.fillStyle='#8fe5e4';ctx.fillRect(shot.x-6,shot.y-4,shot.w+12,shot.h+8);
    ctx.fillStyle='#fff8d1';ctx.fillRect(shot.x,shot.y,shot.w,shot.h);
  }
  for(const spark of state.effects){
    const r=40*(1-spark.ttl/.5);
    ctx.strokeStyle='#b1f4e2';ctx.lineWidth=3;ctx.beginPath();
    ctx.arc(spark.x,spark.y,r,0,Math.PI*2);ctx.stroke();
  }
  if(!renderActor(ctx,state.puzzle.actor,state.player,state.status,t))drawPlayer(ctx,state.player,t);
  ctx.restore();
  if(options.hud!==false)renderPuzzleHud(ctx,state,{width:w,height:h});
}
// HUD is a separate compositing pass so that foreground planes can occlude actors,
// while interface text always remains on top of the finished scene.
export function renderPuzzleHud(ctx,state,options={}) {
  const w=options.width||960;
  ctx.save();
  ctx.fillStyle='#07131fe8';ctx.fillRect(10,10,365,48);
  ctx.fillStyle='#ffe1b1';ctx.font='bold 16px ui-monospace,monospace';
  ctx.fillText('♥'.repeat(state.health),20,40);
  ctx.fillStyle='#c9e6df';ctx.font='12px ui-monospace,monospace';
  ctx.fillText('STATUES '+state.petrified+'/'+state.enemies.length,113,38);
  ctx.fillStyle=state.keyCollected?'#f7d092':'#87a2a8';
  ctx.fillText(state.keyCollected?'KEY FOUND':'FIND THE KEY',245,38);
  if(state.checkpoint){
    ctx.fillStyle='#98e1b7';ctx.font='10px ui-monospace,monospace';
    ctx.fillText('BEACON ACTIVE',19,70);
  }
  if(state.status==='won') {
    ctx.fillStyle='#061522e8';ctx.fillRect(190,160,w-380,200);
    ctx.strokeStyle='#e4c38f';ctx.strokeRect(190,160,w-380,200);
    ctx.fillStyle='#fff3ca';ctx.font='bold 31px ui-monospace,monospace';ctx.textAlign='center';
    ctx.fillText('THE LANTERN VAULT CLEARED',w/2,245);
    ctx.font='16px ui-monospace,monospace';ctx.fillText('You turned an enemy into the bridge.',w/2,280);
    ctx.fillText('Press R to replay',w/2,312);
    ctx.textAlign='left';
  }
  ctx.restore();
}
