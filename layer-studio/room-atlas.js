// PixelForge Rung 05 / Room Atlas. Bounded multi-room scene data and local-only travel.
// Rooms reuse Layer Scene v1; links are declarative, never scriptable.
import {startPuzzle,stepPuzzle} from './puzzle.js';
import {normalizeQuestLine,consumeWorldEvents,refreshQuestProgress} from './quest-world.js';

export const ATLAS_SCHEMA='pixelforge.layer-atlas.v1';
const bounded=(v,fallback,low,high)=>Number.isFinite(Number(v))?Math.max(low,Math.min(high,Number(v))):fallback;
const text=(v,fallback,max=80)=>typeof v==='string'&&v.trim()?v.slice(0,max):fallback;
const overlaps=(a,b)=>a.x < b.x+b.w && a.x+a.w>b.x && a.y < b.y+b.h && a.y+a.h>b.y;
export function stripAtlas(scene){
  // Copy the scene envelope only. Nothing from the optional atlas can recurse into a room.
  return {schema:'pixelforge.layer-scene.v1',title:scene.title,width:scene.width,height:scene.height,
    camera:scene.camera,layers:scene.layers,playable:scene.playable};
}
function sanitizePortal(p,i){
  return {
    id:text(p?.id,'door-'+i,64),
    x:bounded(p?.x,100,0,6000),y:bounded(p?.y,420,-200,800),
    w:bounded(p?.w,56,12,300),h:bounded(p?.h,80,12,300),
    targetRoom:text(p?.targetRoom,'',64),
    arrivalX:bounded(p?.arrivalX,80,0,6000),
    arrivalY:bounded(p?.arrivalY,458,-200,750),
    requiresKey:p?.requiresKey===true,
    requiresRelic:text(p?.requiresRelic,'',130),
    requiresFlag:text(p?.requiresFlag,'',64),
    requiresQuest:text(p?.requiresQuest,'',64),
    label:text(p?.label,'PASSAGE',60)
  };
}
function sanitizeRelic(r,i){
  return {id:text(r?.id,'relic-'+i,64),
    name:text(r?.name,'Ancient Relic',70),
    x:bounded(r?.x,350,0,6000),y:bounded(r?.y,440,-200,800)};
}
function collectibleKey(roomId,relicId){return roomId+':'+relicId;}
export function availableRelicKeys(atlas){
  if(!atlas)return [];
  return atlas.rooms.flatMap(room=>
    (room.relics||[]).map(relic=>collectibleKey(room.id,relic.id)));
}
function distinctIds(items,prefix){
  const ids=new Set();
  for(let i=0;i<items.length;i++){
    let id=items[i].id||prefix+'-'+i;
    if(ids.has(id))id=prefix+'-'+i;
    let seed=0;while(ids.has(id))id=prefix+'-'+i+'-'+(++seed);
    items[i].id=id;ids.add(id);
  }
  return items;
}
export function normalizeAtlas(source,normalizeRoom){
  if(source==null)return null;
  if(!source||typeof source!=='object'||Array.isArray(source)||source.schema!==ATLAS_SCHEMA)
    throw new Error('Invalid PixelForge Room Atlas v1 data.');
  if(!Array.isArray(source.rooms)||source.rooms.length<1||source.rooms.length>6)
    throw new Error('Room Atlas requires 1 to 6 rooms.');
  if(typeof normalizeRoom!=='function')throw new Error('Room Atlas requires a scene normalizer.');
  const rooms=distinctIds(source.rooms.map((r,i)=>{
    if(!r||typeof r!=='object'||!r.scene||!Array.isArray(r.scene.layers))
      throw new Error('Every atlas room must contain a Layer Studio scene.');
    const cleaned=normalizeRoom(stripAtlas(r.scene));
    return {
      id:text(r.id,'room-'+i,64),
      title:text(r.title,cleaned.title,80),
      scene:stripAtlas(cleaned),
      portals:distinctIds((Array.isArray(r.portals)?r.portals:[]).slice(0,8).map(sanitizePortal),'portal'),
      relics:distinctIds((Array.isArray(r.relics)?r.relics:[]).slice(0,8).map(sanitizeRelic),'relic')
    };
  }),'room');
  const ids=new Set(rooms.map(r=>r.id));
  for(const room of rooms)for(const portal of room.portals){
    // Invalid destinations are preserved as visibly blocked doors, never followed.
    if(!ids.has(portal.targetRoom))portal.targetRoom='';
    const destination=rooms.find(r=>r.id===portal.targetRoom);
    if(destination){
      portal.arrivalX=Math.min(portal.arrivalX,destination.scene.playable.worldWidth-28);
    }
  }
  // Dangling relic requirements remain visibly locked, never silently become open doors.
  const startRoom=ids.has(source.startRoom)?source.startRoom:rooms[0].id;
  return {schema:ATLAS_SCHEMA,startRoom,rooms,
    quests:normalizeQuestLine(source.quests)};
}
export function makeStarterAtlas(scene,normalizeRoom){
  const first=stripAtlas(normalizeRoom(stripAtlas(scene)));
  const second=stripAtlas(normalizeRoom(stripAtlas(scene)));
  second.title='The Forgotten Reliquary';
  // The original art remains reusable, but the room has distinct composition.
  for(const layer of second.layers){
    if(layer.kind==='sky')layer.overlay.type='runes';
    if(layer.kind==='mountains')layer.opacity=.4;
    if(layer.kind==='arches')layer.overlay.type='mist';
    if(layer.kind==='foreground')layer.overlay.type='fireflies';
  }
  second.playable.spawn={x:100,y:458};
  second.playable.key={x:1180,y:455};
  second.playable.gate={x:1500,y:424};
  second.playable.director={schema:'pixelforge.layer-director.v1',ambient:.5,triggers:[
    {id:'reliquary-whisper',kind:'flag',flagId:'reliquary-awakened',x:230,y:355,w:125,h:145,
      message:'THE RELIQUARY AWAKENS. A NEW PATH MAY BE OPEN.',once:true}
  ],cameras:[],lights:[{id:'relic-lamp',x:315,y:320,radius:350,intensity:1,color:'#a3d9e9'}]};
  return normalizeAtlas({
    schema:ATLAS_SCHEMA,startRoom:'lantern-vault',
    quests:[{id:'oath-of-the-reliquary',title:'The Reliquary Oath',
      description:'Carry a light beyond the vault and awaken what sleeps beneath.',
      objectives:[
        {id:'carry-light',kind:'relic',target:'lantern-vault:lantern-shard',label:'Recover the Lantern Shard'},
        {id:'cross-threshold',kind:'visit',target:'reliquary',label:'Enter the Forgotten Reliquary'},
        {id:'wake-relic',kind:'flag',target:'reliquary-awakened',label:'Awaken the ancient chamber'}
      ]}],
    rooms:[
      {id:'lantern-vault',title:first.title,scene:first,relics:[
        {id:'lantern-shard',name:'Lantern Shard',x:320,y:360}
      ],portals:[
        {id:'vault-to-reliquary',x:1515,y:424,w:56,h:76,
          targetRoom:'reliquary',arrivalX:112,arrivalY:458,requiresKey:true,label:'ENTER RELIQUARY'}
      ]},
      {id:'reliquary',title:second.title,scene:second,relics:[
        {id:'echo-seal',name:'Echo Seal',x:1190,y:440}
      ],portals:[
        {id:'reliquary-to-vault',x:55,y:424,w:56,h:76,
          targetRoom:'lantern-vault',arrivalX:1460,arrivalY:458,
          requiresKey:false,label:'RETURN TO VAULT'}
      ]}
    ]
  },normalizeRoom);
}
export function createWorldSession(rootScene){
  const atlas=rootScene.atlas||null;
  const roomId=atlas?.startRoom||null;
  const room=atlas?.rooms.find(r=>r.id===roomId);
  const scene=room?room.scene:rootScene;
  const game=startPuzzle(scene);
  game.worldTravel=Boolean(atlas);
  const session={atlas,roomId,scene,game,snapshots:{},inventory:new Set(),
    visitedRooms:new Set(atlas?[roomId]:[]),worldFlags:new Set(),completedQuests:new Set(),
    flagVersion:0,questVersion:0,transitions:0,notice:'',noticeLeft:0};
  refreshQuestProgress(session,{silent:true});
  return session;
}
export function nearbyPortal(session){
  if(!session.atlas)return null;
  const room=session.atlas.rooms.find(r=>r.id===session.roomId);
  return room?.portals.find(p=>overlaps(p,session.game.player))||null;
}
export function snapshotRoom(game){
  return {
    keyCollected:game.keyCollected,
    stones:game.enemies.filter(e=>e.stone).map(e=>e.id),
    seen:[...(game.directorSeen||[])],
    checkpoint:game.checkpoint?{...game.checkpoint}:null
  };
}
export function restoreRoom(game,progress){
  if(!progress)return;
  game.keyCollected=progress.keyCollected===true;
  const stones=new Set(progress.stones||[]);
  for(const enemy of game.enemies)enemy.stone=stones.has(enemy.id);
  game.petrified=game.enemies.filter(e=>e.stone).length;
  game.directorSeen=new Set(progress.seen||[]);
  game.checkpoint=progress.checkpoint?{...progress.checkpoint}:null;
}
export function stepWorldSession(session,input={},dt=1/60){
  const game=session.game;
  stepPuzzle(game,input,dt);
  consumeWorldEvents(session);
  if(session.atlas&&game.status==='playing'){
    const room=session.atlas.rooms.find(r=>r.id===session.roomId);
    for(const relic of room?.relics||[]){
      const id=collectibleKey(session.roomId,relic.id);
      if(session.inventory.has(id))continue;
      if(overlaps(game.player,{x:relic.x-12,y:relic.y-18,w:24,h:36})){
        session.inventory.add(id);
        session.notice='FOUND '+relic.name.toUpperCase();
        session.noticeLeft=4;
        session.pickupVersion=(session.pickupVersion||0)+1;
      }
    }
  }
  refreshQuestProgress(session);
  session.noticeLeft=Math.max(0,session.noticeLeft-dt);
  if(!session.noticeLeft)session.notice='';
  if(!session.atlas||!input.interactPressed||game.status!=='playing')return {travelled:false};
  const door=nearbyPortal(session);
  if(!door)return {travelled:false};
  const target=session.atlas.rooms.find(r=>r.id===door.targetRoom);
  if(!target){
    session.notice='THIS DOOR LEADS NOWHERE.';
    session.noticeLeft=3;
    return {travelled:false,denied:'unlinked'};
  }
  if(door.requiresFlag&&!session.worldFlags.has(door.requiresFlag)){
    session.notice='THE WORLD HAS NOT CHANGED ENOUGH FOR THIS PASSAGE.';
    session.noticeLeft=3;
    return {travelled:false,denied:'flag'};
  }
  if(door.requiresQuest&&!session.completedQuests.has(door.requiresQuest)){
    session.notice='COMPLETE THE REQUIRED QUEST TO OPEN THIS PASSAGE.';
    session.noticeLeft=3;
    return {travelled:false,denied:'quest'};
  }
  if(door.requiresRelic&&!session.inventory.has(door.requiresRelic)){
    session.notice='A RELIC IS REQUIRED TO OPEN THIS DOOR.';
    session.noticeLeft=3;
    return {travelled:false,denied:'relic'};
  }
  if(door.requiresKey&&!game.keyCollected){
    session.notice='THE DOOR NEEDS THIS ROOM’S KEY.';
    session.noticeLeft=3;
    return {travelled:false,denied:'key'};
  }
  const from=session.roomId;
  session.snapshots[from]=snapshotRoom(game);
  const next=startPuzzle(target.scene);
  next.worldTravel=true;
  next.health=game.health;
  next.deaths=game.deaths;
  restoreRoom(next,session.snapshots[target.id]);
  next.player.x=Math.min(Math.max(0,door.arrivalX),next.puzzle.worldWidth-next.player.w);
  next.player.y=door.arrivalY;
  next.player.vx=0;next.player.vy=0;
  next.player.grounded=false;
  next.player.invulnerable=1.0;
  session.scene=target.scene;
  session.roomId=target.id;
  session.game=next;
  session.visitedRooms.add(target.id);
  refreshQuestProgress(session);
  session.transitions++;
  session.notice='ENTERED '+target.title.toUpperCase();
  session.noticeLeft=3.5;
  return {travelled:true,from,to:target.id};
}
export function renderPortals(ctx,session,cameraX=0,{guides=false}={}){
  if(!session.atlas)return;
  const room=session.atlas.rooms.find(r=>r.id===session.roomId);
  if(!room)return;
  ctx.save();
  ctx.translate(-Math.round(cameraX),0);
  for(const portal of room.portals){
    const open=(!portal.requiresKey||session.game.keyCollected) &&
      (!portal.requiresRelic||session.inventory?.has(portal.requiresRelic)) &&
      (!portal.requiresFlag||session.worldFlags?.has(portal.requiresFlag)) &&
      (!portal.requiresQuest||session.completedQuests?.has(portal.requiresQuest)) && portal.targetRoom;
    const x=portal.x,y=portal.y,w=portal.w,h=portal.h;
    ctx.fillStyle=open?'#165956b8':'#3a3448c9';
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=open?'#a2e9c7':'#d3aa89';ctx.lineWidth=3;
    ctx.strokeRect(x+2,y+2,w-4,h-4);
    ctx.fillStyle=open?'#d0f8d9':'#ffd09d';ctx.fillRect(x+w/2-5,y+12,10,10);
    if(guides){
      ctx.setLineDash([6,5]);ctx.strokeStyle='#f6d8a5';
      ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);
      ctx.fillStyle='#f6e8cb';ctx.font='bold 10px ui-monospace,monospace';
      ctx.fillText(portal.id,x,y-6);
    }
  }
  ctx.restore();
}
export function renderPortalPrompt(ctx,session,viewWidth=960,viewHeight=540){
  if(!session.atlas)return;
  const door=nearbyPortal(session);
  const message=session.noticeLeft>0?session.notice:door?
    !door.targetRoom?'UNLINKED PASSAGE':door.requiresKey&&!session.game.keyCollected?
    'FIND THE KEY TO OPEN THIS DOOR':door.requiresRelic&&!session.inventory.has(door.requiresRelic)?
    'FIND THE REQUIRED RELIC':door.requiresFlag&&!session.worldFlags?.has(door.requiresFlag)?
    'ACTIVATE THE WORLD FLAG FIRST':door.requiresQuest&&!session.completedQuests?.has(door.requiresQuest)?
    'COMPLETE THE REQUIRED QUEST':'PRESS E / X TO ENTER '+door.label:'';
  if(!message)return;
  ctx.save();ctx.fillStyle='#061624de';ctx.fillRect(18,viewHeight-75,Math.max(100,viewWidth-36),45);
  ctx.fillStyle='#fff0c3';ctx.font='bold 13px ui-monospace,monospace';
  ctx.fillText(message.slice(0,100),30,viewHeight-47);ctx.restore();
}

export function renderRelics(ctx,session,cameraX=0){
  if(!session.atlas)return;
  const room=session.atlas.rooms.find(r=>r.id===session.roomId);
  if(!room)return;
  ctx.save();ctx.translate(-Math.round(cameraX),0);
  for(const relic of room.relics||[]){
    if(session.inventory.has(collectibleKey(room.id,relic.id)))continue;
    const x=relic.x,y=relic.y+Math.sin(session.game.time*3)*3;
    ctx.fillStyle='#f9df8a44';ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f9d78e';ctx.beginPath();
    ctx.moveTo(x,y-12);ctx.lineTo(x+10,y);ctx.lineTo(x,y+12);ctx.lineTo(x-10,y);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff6cc';ctx.fillRect(x-2,y-4,4,8);
  }
  ctx.restore();
}
export function atlasMapData(session){
  if(!session.atlas)return {rooms:[],edges:[]};
  const rooms=session.atlas.rooms.map((r,i)=>({
    id:r.id,title:r.title,index:i,active:r.id===session.roomId,
    visited:session.visitedRooms.has(r.id),portals:r.portals.length,
    collected:(r.relics||[]).filter(item=>session.inventory.has(collectibleKey(r.id,item.id))).length,
    total:(r.relics||[]).length
  }));
  const edges=session.atlas.rooms.flatMap(room=>room.portals
    .filter(p=>p.targetRoom).map(p=>({
      from:room.id,to:p.targetRoom,label:p.label,requiresKey:p.requiresKey,
      requiresRelic:p.requiresRelic||'',requiresFlag:p.requiresFlag||'',requiresQuest:p.requiresQuest||''
    })));
  return {rooms,edges};
}
