const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const clone=v=>JSON.parse(JSON.stringify(v));
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify=v=>String(v||'scene').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'scene';
let bridge=null;
let raf=0;
let lastTime=0;
let keys=new Set();

export function buildDemoRuntimeComposer(){
  return {
    composerType:'pixelforge.runtime-composer.v5.11',
    sceneId:'scene_roadside',
    mapSource:'tileStudio',
    spriteSource:'spriteStudio',
    camera:{mode:'follow',zoom:2,viewportWidth:320,viewportHeight:180},
    player:{x:3.5,y:8.5,speed:4,facing:'down',animation:'idle',frame:0},
    transitions:[],
    flags:{showCollision:false,showGrid:false,paused:true},
    lastExport:null
  };
}

export function normalizeRuntimeComposer(input={}){
  const f=buildDemoRuntimeComposer();
  const s=input&&typeof input==='object'&&!Array.isArray(input)?input:f;
  return {
    composerType:'pixelforge.runtime-composer.v5.11',
    sceneId:String(s.sceneId||f.sceneId).slice(0,80),
    mapSource:['tileStudio','assetMap'].includes(s.mapSource)?s.mapSource:'tileStudio',
    spriteSource:['spriteStudio','assetSprite'].includes(s.spriteSource)?s.spriteSource:'spriteStudio',
    camera:{mode:'follow',zoom:clamp(Number(s.camera?.zoom)||2,1,4),viewportWidth:clamp(parseInt(s.camera?.viewportWidth,10)||320,160,640),viewportHeight:clamp(parseInt(s.camera?.viewportHeight,10)||180,120,360)},
    player:{x:Number.isFinite(Number(s.player?.x))?Number(s.player.x):3.5,y:Number.isFinite(Number(s.player?.y))?Number(s.player.y):8.5,speed:clamp(Number(s.player?.speed)||4,1,12),facing:['up','down','left','right'].includes(s.player?.facing)?s.player.facing:'down',animation:String(s.player?.animation||'idle').slice(0,32),frame:Math.max(0,parseInt(s.player?.frame,10)||0)},
    transitions:(Array.isArray(s.transitions)?s.transitions:[]).slice(0,32).map((t,i)=>({id:String(t.id||`transition_${i+1}`),x:Math.max(0,parseInt(t.x,10)||0),y:Math.max(0,parseInt(t.y,10)||0),toSceneId:String(t.toSceneId||'').slice(0,80),spawnX:Number(t.spawnX)||1.5,spawnY:Number(t.spawnY)||1.5,enabled:t.enabled!==false})),
    flags:{showCollision:s.flags?.showCollision===true,showGrid:s.flags?.showGrid===true,paused:s.flags?.paused!==false},
    lastExport:s.lastExport&&typeof s.lastExport==='object'?s.lastExport:null
  };
}

export function validateRuntimeComposer(runtime,errors=[]){
  const r=normalizeRuntimeComposer(runtime);
  if(r.composerType!=='pixelforge.runtime-composer.v5.11')errors.push('runtimeComposer.composerType must be pixelforge.runtime-composer.v5.11.');
  if(!r.sceneId)errors.push('runtimeComposer.sceneId is required.');
  if(r.camera.viewportWidth<160||r.camera.viewportHeight<120)errors.push('runtimeComposer camera viewport is too small.');
  if(r.player.speed<1||r.player.speed>12)errors.push('runtimeComposer.player.speed must be 1..12.');
  return errors;
}

function getRuntime(){return normalizeRuntimeComposer(bridge?.getState?.()||buildDemoRuntimeComposer());}
function setRuntime(next,msg=''){bridge?.setState?.(normalizeRuntimeComposer(next));if(msg)bridge?.log?.(msg);renderRuntimeComposer();}
function getTileStudio(){return bridge?.getTileStudio?.()||null;}
function getSpriteStudio(){return bridge?.getSpriteStudio?.()||null;}
function getAssets(){return bridge?.getAssets?.()||{};}
function cellIndex(map,x,y){return y*map.width+x;}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}

function resolveMap(r){
  const tile=getTileStudio();
  if(r.mapSource==='tileStudio'&&tile?.map)return {map:tile.map,tiles:tile.tiles||[],sourceLabel:'Tile Studio live map'};
  const found=(getAssets().tileMaps||[]).find(m=>m.sceneId===r.sceneId)||(getAssets().tileMaps||[])[0];
  if(found)return {map:found.map||found,tiles:found.tiles||tile?.tiles||[],sourceLabel:'Attached map asset'};
  return tile?.map?{map:tile.map,tiles:tile.tiles||[],sourceLabel:'Tile Studio fallback'}:null;
}

function resolveSprite(r){
  const sprite=getSpriteStudio();
  if(r.spriteSource==='spriteStudio'&&sprite)return {sprite,sourceLabel:'Sprite Studio live sheet'};
  const candidate=(getAssets().sprites||[]).find(s=>s.assetForgeSlot==='more-bounce-hero')||(getAssets().sprites||[])[0];
  if(candidate?.animationMap&&candidate?.dataUrl)return {asset:candidate,sourceLabel:'Attached sprite asset'};
  return sprite?{sprite,sourceLabel:'Sprite Studio fallback'}:null;
}

function tileColor(tile,index=0){
  if(tile?.pixels?.some(Boolean))return null;
  const colors=['#347a46','#c99a5b','#264d35','#3779d4','#55a95d','#8b4a32','#8c6dff','#ffd36e'];
  return colors[index%colors.length];
}

function drawTile(ctx,tile,dx,dy,scale,index){
  if(tile?.pixels?.some(Boolean)){
    for(let i=0;i<256;i++){const c=tile.pixels[i];if(!c)continue;ctx.fillStyle=c;ctx.fillRect(dx+(i%16)*scale,dy+Math.floor(i/16)*scale,scale,scale);}
  }else{
    ctx.fillStyle=tileColor(tile,index);ctx.fillRect(dx,dy,16*scale,16*scale);
    ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(dx+2*scale,dy+2*scale,2*scale,2*scale);
  }
}

function spriteFrameForMovement(sprite,r,moving){
  const frames=sprite?.frames||[];
  if(!frames.length)return null;
  const desired=moving?'walk':'idle';
  const matching=frames.map((f,i)=>({f,i})).filter(x=>x.f.label===desired||x.f.label===r.player.facing);
  if(!matching.length)return frames[0];
  const idx=Math.floor(performance.now()/Math.max(80,1000/(sprite.fps||8)))%matching.length;
  return matching[idx].f;
}

function drawSpritePixels(ctx,sprite,frame,screenX,screenY,scale){
  const w=sprite.canvas?.width||32,h=sprite.canvas?.height||48;
  if(!frame?.pixels?.some(Boolean)){
    // Explicit preview silhouette: not production art.
    ctx.fillStyle='#8c6dff';ctx.fillRect(screenX+10*scale,screenY+9*scale,12*scale,22*scale);
    ctx.fillStyle='#f8f2de';ctx.fillRect(screenX+12*scale,screenY+13*scale,8*scale,7*scale);
    ctx.fillStyle='#101820';ctx.fillRect(screenX+14*scale,screenY+15*scale,2*scale,2*scale);ctx.fillRect(screenX+18*scale,screenY+15*scale,2*scale,2*scale);
    ctx.fillStyle='#ff9b6e';ctx.fillRect(screenX+10*scale,screenY+31*scale,5*scale,4*scale);ctx.fillRect(screenX+19*scale,screenY+31*scale,5*scale,4*scale);
    return;
  }
  for(let i=0;i<w*h;i++){const c=frame.pixels[i];if(!c)continue;ctx.fillStyle=c;ctx.fillRect(screenX+(i%w)*scale,screenY+Math.floor(i/w)*scale,scale,scale);}
}

function isBlocked(map,x,y){
  const cx=Math.floor(x),cy=Math.floor(y);
  if(cx<0||cy<0||cx>=map.width||cy>=map.height)return true;
  return Boolean(map.layers?.collision?.[cellIndex(map,cx,cy)]);
}

function updatePlayer(dt){
  const r=getRuntime();if(r.flags.paused)return;
  const resolved=resolveMap(r);if(!resolved)return;
  const map=resolved.map;
  let dx=0,dy=0;
  if(keys.has('ArrowLeft')||keys.has('a')){dx-=1;r.player.facing='left';}
  if(keys.has('ArrowRight')||keys.has('d')){dx+=1;r.player.facing='right';}
  if(keys.has('ArrowUp')||keys.has('w')){dy-=1;r.player.facing='up';}
  if(keys.has('ArrowDown')||keys.has('s')){dy+=1;r.player.facing='down';}
  const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  const step=r.player.speed*dt;
  const nx=r.player.x+dx*step,ny=r.player.y+dy*step;
  if(!isBlocked(map,nx,r.player.y))r.player.x=nx;
  if(!isBlocked(map,r.player.x,ny))r.player.y=ny;
  r.player.animation=(dx||dy)?'walk':'idle';
  bridge?.setState?.(r);
}

function drawRuntime(){
  const canvas=document.getElementById('runtimeComposerCanvas');if(!canvas)return;
  const r=getRuntime(),resolved=resolveMap(r),spriteResolved=resolveSprite(r);
  const vw=r.camera.viewportWidth,vh=r.camera.viewportHeight;canvas.width=vw;canvas.height=vh;canvas.style.width=`${vw*r.camera.zoom}px`;canvas.style.height=`${vh*r.camera.zoom}px`;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#081019';ctx.fillRect(0,0,vw,vh);
  if(!resolved){ctx.fillStyle='#f8f2de';ctx.font='12px monospace';ctx.fillText('No Tile Studio map available.',12,24);return;}
  const {map,tiles}=resolved;const tilePx=16;
  const cameraX=clamp(r.player.x*tilePx-vw/2,0,Math.max(0,map.width*tilePx-vw));
  const cameraY=clamp(r.player.y*tilePx-vh/2,0,Math.max(0,map.height*tilePx-vh));
  const x0=Math.max(0,Math.floor(cameraX/tilePx)-1),y0=Math.max(0,Math.floor(cameraY/tilePx)-1),x1=Math.min(map.width,Math.ceil((cameraX+vw)/tilePx)+1),y1=Math.min(map.height,Math.ceil((cameraY+vh)/tilePx)+1);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const i=cellIndex(map,x,y),g=map.layers?.ground?.[i],d=map.layers?.decor?.[i],dx=x*tilePx-cameraX,dy=y*tilePx-cameraY;
    if(Number.isInteger(g)&&tiles[g])drawTile(ctx,tiles[g],dx,dy,1,g);else{ctx.fillStyle='#20372a';ctx.fillRect(dx,dy,16,16);}
    if(Number.isInteger(d)&&tiles[d])drawTile(ctx,tiles[d],dx,dy,1,d);
    if(r.flags.showCollision&&map.layers?.collision?.[i]){ctx.fillStyle='rgba(255,70,90,.30)';ctx.fillRect(dx,dy,16,16);}
    if(r.flags.showGrid){ctx.strokeStyle='rgba(255,255,255,.08)';ctx.strokeRect(dx+.5,dy+.5,15,15);}
  }
  const sprite=spriteResolved?.sprite;
  const frame=spriteFrameForMovement(sprite,r,r.player.animation==='walk');
  const sw=sprite?.canvas?.width||32,sh=sprite?.canvas?.height||48;
  const px=r.player.x*tilePx-cameraX-sw/2,py=r.player.y*tilePx-cameraY-sh+8;
  drawSpritePixels(ctx,sprite||{canvas:{width:32,height:48}},frame,px,py,1);
  ctx.fillStyle='rgba(5,8,16,.78)';ctx.fillRect(6,6,190,34);ctx.fillStyle='#f8f2de';ctx.font='10px monospace';ctx.fillText(`${r.sceneId} · ${r.player.animation}/${r.player.facing}`,12,19);ctx.fillStyle='#8df7c8';ctx.fillText('WASD / arrows · collision live',12,32);
  if(!(tiles||[]).some(t=>t?.pixels?.some(Boolean))){ctx.fillStyle='rgba(255,211,110,.95)';ctx.fillText('SEMANTIC PREVIEW — final tile art pending',vw-245,vh-10);}
}

function loop(t){const dt=Math.min(.05,(t-lastTime)/1000||0);lastTime=t;updatePlayer(dt);drawRuntime();raf=requestAnimationFrame(loop);}

function exportScene(){
  const r=getRuntime(),resolved=resolveMap(r),sprite=resolveSprite(r);if(!resolved)return;
  const payload={schema:'pixelforge.runtime-scene.v5.11',exportedAt:new Date().toISOString(),sceneId:r.sceneId,runtime:r,map:{width:resolved.map.width,height:resolved.map.height,tileSize:16,layers:clone(resolved.map.layers)},tileMetadata:(resolved.tiles||[]).map((t,i)=>({index:i,id:t.id,name:t.name,tag:t.tag,walkable:t.walkable,autotileGroup:t.autotileGroup||''})),spriteBinding:{source:r.spriteSource,assetSlotId:getSpriteStudio()?.assetSlotId||'',frameWidth:getSpriteStudio()?.canvas?.width||32,frameHeight:getSpriteStudio()?.canvas?.height||48,fps:getSpriteStudio()?.fps||8},claimBoundary:'Runtime Composer proves scene binding, collision, camera, and authored-data compatibility. Semantic preview colors or blank sprite silhouettes are not final art.'};
  const next=getRuntime();next.lastExport={createdAt:payload.exportedAt,sceneId:r.sceneId};bridge?.setState?.(next);
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`${slugify(r.sceneId)}.runtime-scene.v5.11.json`);bridge?.attachRuntimeScene?.(payload);bridge?.log?.(`Exported Runtime Composer scene ${r.sceneId}.`);renderRuntimeComposer();
}

export function renderRuntimeComposer(){
  const root=document.getElementById('runtimeComposerPanel');if(!root||!bridge)return;const r=getRuntime(),map=resolveMap(r),sprite=resolveSprite(r);
  root.innerHTML=`<article class="runtime-composer-shell">
    <div class="runtime-toolbar">
      <label>Scene ID <input id="runtimeSceneId" value="${escapeHTML(r.sceneId)}"></label>
      <label>Map source <select id="runtimeMapSource"><option value="tileStudio" ${r.mapSource==='tileStudio'?'selected':''}>Tile Studio live</option><option value="assetMap" ${r.mapSource==='assetMap'?'selected':''}>Attached map</option></select></label>
      <label>Sprite source <select id="runtimeSpriteSource"><option value="spriteStudio" ${r.spriteSource==='spriteStudio'?'selected':''}>Sprite Studio live</option><option value="assetSprite" ${r.spriteSource==='assetSprite'?'selected':''}>Attached sprite</option></select></label>
      <label>Camera zoom <input id="runtimeZoom" type="number" min="1" max="4" value="${r.camera.zoom}"></label>
      <label>Move speed <input id="runtimeSpeed" type="number" min="1" max="12" step=".5" value="${r.player.speed}"></label>
    </div>
    <div class="runtime-status"><span>${escapeHTML(map?.sourceLabel||'no map')}</span><span>${escapeHTML(sprite?.sourceLabel||'no sprite')}</span><span>${map?.map?`${map.map.width}×${map.map.height} map`:'map missing'}</span><span>${r.flags.paused?'PAUSED':'PLAYING'}</span></div>
    <div class="runtime-stage-wrap"><canvas id="runtimeComposerCanvas" tabindex="0" aria-label="Runtime Composer playable scene preview"></canvas></div>
    <div class="runtime-actions">
      <button id="runtimePlayPause" type="button">${r.flags.paused?'▶ Play':'❚❚ Pause'}</button>
      <button id="runtimeReset" type="button">Reset Player</button>
      <label class="check"><input id="runtimeCollision" type="checkbox" ${r.flags.showCollision?'checked':''}> Collision overlay</label>
      <label class="check"><input id="runtimeGrid" type="checkbox" ${r.flags.showGrid?'checked':''}> Tile grid</label>
      <button id="runtimeExport" type="button">Export Runtime Scene</button>
    </div>
    <p class="runtime-boundary">Runtime Composer binds authored PixelForge data into a playable local scene. Blank art uses clearly labeled semantic previews; it never upgrades placeholder visuals to final-art status.</p>
  </article>`;
  const update=(fn,msg='')=>{const n=getRuntime();fn(n);setRuntime(n,msg);};
  document.getElementById('runtimeSceneId').onchange=e=>update(n=>n.sceneId=e.target.value,'Runtime scene ID updated.');
  document.getElementById('runtimeMapSource').onchange=e=>update(n=>n.mapSource=e.target.value,'Runtime map source changed.');
  document.getElementById('runtimeSpriteSource').onchange=e=>update(n=>n.spriteSource=e.target.value,'Runtime sprite source changed.');
  document.getElementById('runtimeZoom').onchange=e=>update(n=>n.camera.zoom=clamp(Number(e.target.value)||2,1,4),'Runtime zoom updated.');
  document.getElementById('runtimeSpeed').onchange=e=>update(n=>n.player.speed=clamp(Number(e.target.value)||4,1,12),'Player speed updated.');
  document.getElementById('runtimePlayPause').onclick=()=>{const n=getRuntime();n.flags.paused=!n.flags.paused;setRuntime(n,n.flags.paused?'Runtime paused.':'Runtime playing.');};
  document.getElementById('runtimeReset').onclick=()=>update(n=>{n.player.x=3.5;n.player.y=8.5;n.player.animation='idle';},'Runtime player reset.');
  document.getElementById('runtimeCollision').onchange=e=>update(n=>n.flags.showCollision=e.target.checked);
  document.getElementById('runtimeGrid').onchange=e=>update(n=>n.flags.showGrid=e.target.checked);
  document.getElementById('runtimeExport').onclick=exportScene;
  const canvas=document.getElementById('runtimeComposerCanvas');canvas.onfocus=()=>bridge?.log?.('Runtime Composer keyboard focus active.');
  drawRuntime();
}

export function initRuntimeComposer(inputBridge){
  bridge=inputBridge;if(!bridge?.getState||!bridge?.setState)throw new Error('Runtime Composer bridge requires getState/setState.');bridge.setState(normalizeRuntimeComposer(bridge.getState()));
  const dialog=document.getElementById('runtimeComposerDialog'),openBtn=document.getElementById('openRuntimeComposerBtn'),closeBtn=document.getElementById('closeRuntimeComposerBtn');
  if(openBtn)openBtn.onclick=()=>{renderRuntimeComposer();if(dialog?.showModal&&!dialog.open)dialog.showModal();setTimeout(()=>document.getElementById('runtimeComposerCanvas')?.focus(),30);};
  if(closeBtn)closeBtn.onclick=()=>{const n=getRuntime();n.flags.paused=true;bridge.setState(n);dialog?.close?.();keys.clear();};
  window.addEventListener('keydown',e=>{if(!document.getElementById('runtimeComposerDialog')?.open)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(k)){e.preventDefault();keys.add(k);}});
  window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys.delete(k);});
  if(raf)cancelAnimationFrame(raf);lastTime=performance.now();raf=requestAnimationFrame(loop);renderRuntimeComposer();
}
