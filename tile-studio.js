const DEFAULT_PALETTES = [
  { id:'pf-ui', name:'PixelForge Framed UI', colors:['#0b1020','#151d38','#24305a','#3e4d78','#f8f2de','#d9cfb2','#ffd36e','#ff9b6e','#ff7aa2','#8c6dff','#61f0ff','#8df7c8','#5abf65','#3779d4','#8b4a32','#ffffff'] },
  { id:'bouncehome', name:'Bouncehome Grove', colors:['#101820','#1d2a24','#264d35','#347a46','#55a95d','#7bc96f','#b5df83','#e3efad','#6b4a2d','#9b6b43','#c99a5b','#f0c27a','#ffd36e','#8dc8ff','#f8f2de','#ffffff'] },
  { id:'wobble', name:'Wobble Woods', colors:['#0b1020','#111a2d','#172a35','#1f3d3a','#295a43','#397552','#55a95d','#7bc96f','#123a5a','#285faf','#3779d4','#61f0ff','#8c6dff','#ff7aa2','#ffd36e','#f8f2de'] },
  { id:'tower', name:'Larrina Tower', colors:['#0d0a16','#17121f','#26223e','#3f315f','#5f4b78','#8c6dff','#c38cff','#f1c7ff','#4b2d1a','#8b4a32','#c77b4e','#ffd6a0','#ffd36e','#8dc8ff','#f8f2de','#ffffff'] }
];
const TILE_TAGS=['ground','path','wall','water','foliage','structure','interior','decor','hazard','trigger'];
const MAP_PRESETS=[{label:'16×12 Room',w:16,h:12},{label:'24×16 SNES Scene',w:24,h:16},{label:'32×18 Wide Scene',w:32,h:18},{label:'40×24 Large Area',w:40,h:24}];
let bridge=null;
let undoStack=[];
let redoStack=[];
let tileDrawing=false;
let tileDragStart=null;
let tileLastCell=null;
let mapDrawing=false;
let mapLastCell=null;

const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const hexOK=v=>/^#[0-9a-f]{6}$/i.test(String(v||''));
const blankPixels=(w=16,h=16)=>Array(w*h).fill(null);
const blankLayer=(w,h,value=null)=>Array(w*h).fill(value);
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify=v=>String(v||'tiles').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tiles';

function makeBlankTile(i=0,name='Blank Tile'){
  return {id:`tile_${String(i+1).padStart(3,'0')}`,name,tag:'ground',walkable:true,autotileGroup:'',pixels:blankPixels()};
}

export function buildDemoTileStudio(){
  return {
    studioType:'pixelforge.tile-studio.v5.10',
    tileCanvas:{width:16,height:16,zoom:20,showGrid:true},
    tileTool:'pencil',
    mapTool:'paint',
    color:'#55a95d',
    paletteId:'bouncehome',
    palettes:clone(DEFAULT_PALETTES),
    activeTile:0,
    tiles:[makeBlankTile(0,'Ground Tile')],
    map:{
      width:24,height:16,zoom:2,activeLayer:'ground',sceneId:'scene_roadside',
      layers:{ground:blankLayer(24,16,0),decor:blankLayer(24,16,null),collision:blankLayer(24,16,false)}
    },
    assetSlotId:'bouncehome-grove-tiles',
    rightsStatus:'original',
    lastAttachment:null,
    lastMapExport:null
  };
}

export function normalizeTileStudio(input={}){
  const fallback=buildDemoTileStudio();
  const src=input&&typeof input==='object'&&!Array.isArray(input)?input:fallback;
  const palettes=(Array.isArray(src.palettes)&&src.palettes.length?src.palettes:fallback.palettes).slice(0,16).map((p,i)=>({
    id:String(p.id||`palette_${i+1}`),name:String(p.name||`Palette ${i+1}`),colors:(Array.isArray(p.colors)?p.colors:[]).filter(hexOK).slice(0,32)
  })).filter(p=>p.colors.length);
  const rawTiles=Array.isArray(src.tiles)&&src.tiles.length?src.tiles:fallback.tiles;
  const tiles=rawTiles.slice(0,128).map((t,i)=>{
    const pixels=Array.isArray(t.pixels)?t.pixels.slice(0,256):[]; while(pixels.length<256)pixels.push(null);
    return {
      id:String(t.id||`tile_${String(i+1).padStart(3,'0')}`),name:String(t.name||`Tile ${i+1}`).slice(0,80),
      tag:TILE_TAGS.includes(t.tag)?t.tag:'ground',walkable:t.walkable!==false,autotileGroup:String(t.autotileGroup||'').slice(0,48),
      pixels:pixels.map(v=>hexOK(v)?v:null)
    };
  });
  const mw=clamp(parseInt(src.map?.width,10)||24,8,64), mh=clamp(parseInt(src.map?.height,10)||16,8,48), cells=mw*mh;
  const readLayer=(value,kind)=>{
    const arr=Array.isArray(value)?value.slice(0,cells):[];
    while(arr.length<cells)arr.push(kind==='ground'?0:kind==='collision'?false:null);
    if(kind==='collision') return arr.map(Boolean);
    return arr.map(v=>Number.isInteger(v)&&v>=0&&v<tiles.length?v:(kind==='ground'?0:null));
  };
  return {
    studioType:'pixelforge.tile-studio.v5.10',
    tileCanvas:{width:16,height:16,zoom:clamp(parseInt(src.tileCanvas?.zoom,10)||20,4,32),showGrid:src.tileCanvas?.showGrid!==false},
    tileTool:['pencil','eraser','fill','eyedropper','line','rect'].includes(src.tileTool)?src.tileTool:'pencil',
    mapTool:['paint','erase','fill'].includes(src.mapTool)?src.mapTool:'paint',
    color:hexOK(src.color)?src.color:'#55a95d',
    paletteId:palettes.some(p=>p.id===src.paletteId)?src.paletteId:palettes[0]?.id||'',palettes,
    activeTile:clamp(parseInt(src.activeTile,10)||0,0,Math.max(0,tiles.length-1)),tiles,
    map:{width:mw,height:mh,zoom:clamp(parseInt(src.map?.zoom,10)||2,1,4),activeLayer:['ground','decor','collision'].includes(src.map?.activeLayer)?src.map.activeLayer:'ground',sceneId:String(src.map?.sceneId||'scene_roadside').slice(0,80),layers:{ground:readLayer(src.map?.layers?.ground,'ground'),decor:readLayer(src.map?.layers?.decor,'decor'),collision:readLayer(src.map?.layers?.collision,'collision')}},
    assetSlotId:String(src.assetSlotId||'bouncehome-grove-tiles').slice(0,80),
    rightsStatus:['original','licensed','public-domain','needs-review'].includes(src.rightsStatus)?src.rightsStatus:'original',
    lastAttachment:src.lastAttachment&&typeof src.lastAttachment==='object'?src.lastAttachment:null,
    lastMapExport:src.lastMapExport&&typeof src.lastMapExport==='object'?src.lastMapExport:null
  };
}

export function validateTileStudio(studio,errors=[]){
  const s=normalizeTileStudio(studio);
  if(s.studioType!=='pixelforge.tile-studio.v5.10')errors.push('tileStudio.studioType must be pixelforge.tile-studio.v5.10.');
  if(!s.tiles.length)errors.push('tileStudio.tiles must be non-empty.');
  s.tiles.forEach((t,i)=>{if(t.pixels.length!==256)errors.push(`tileStudio.tiles[${i}].pixels must contain 256 pixels.`);});
  const cells=s.map.width*s.map.height;
  for(const k of ['ground','decor','collision'])if(s.map.layers[k].length!==cells)errors.push(`tileStudio.map.layers.${k} size mismatch.`);
  if(!s.palettes.length)errors.push('tileStudio.palettes must be non-empty.');
  return errors;
}

function getStudio(){return normalizeTileStudio(bridge?.getState?.()||buildDemoTileStudio());}
function setStudio(next,message=''){bridge?.setState?.(normalizeTileStudio(next));if(message)bridge?.log?.(message);renderTileStudio();}
function snapshot(){undoStack.push(clone(getStudio()));if(undoStack.length>40)undoStack.shift();redoStack=[];}
function currentTile(s=getStudio()){return s.tiles[s.activeTile]||s.tiles[0];}
function idx16(x,y){return y*16+x;}
function mapIdx(s,x,y){return y*s.map.width+x;}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}

function tileCell(event,canvas){const r=canvas.getBoundingClientRect(),s=getStudio();return{x:clamp(Math.floor((event.clientX-r.left)/r.width*16),0,15),y:clamp(Math.floor((event.clientY-r.top)/r.height*16),0,15)};}
function mapCell(event,canvas,s=getStudio()){const r=canvas.getBoundingClientRect();return{x:clamp(Math.floor((event.clientX-r.left)/r.width*s.map.width),0,s.map.width-1),y:clamp(Math.floor((event.clientY-r.top)/r.height*s.map.height),0,s.map.height-1)};}
function setTilePixel(s,x,y,color){currentTile(s).pixels[idx16(x,y)]=color;}
function drawLine(s,a,b,color){let x0=a.x,y0=a.y,x1=b.x,y1=b.y;const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(;;){setTilePixel(s,x0,y0,color);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}}
function drawRect(s,a,b,color){const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);for(let x=x0;x<=x1;x++){setTilePixel(s,x,y0,color);setTilePixel(s,x,y1,color);}for(let y=y0;y<=y1;y++){setTilePixel(s,x0,y,color);setTilePixel(s,x1,y,color);}}
function floodTile(s,x,y,color){const tile=currentTile(s),target=tile.pixels[idx16(x,y)]||null;if(target===color)return;const q=[[x,y]],seen=new Set();while(q.length){const[cx,cy]=q.pop(),k=`${cx},${cy}`;if(seen.has(k)||cx<0||cy<0||cx>15||cy>15)continue;seen.add(k);const i=idx16(cx,cy);if((tile.pixels[i]||null)!==target)continue;tile.pixels[i]=color;q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);}}
function floodMap(s,x,y){const layer=s.map.activeLayer,i0=mapIdx(s,x,y),target=s.map.layers[layer][i0];const replacement=layer==='collision'?(s.mapTool==='erase'?false:true):(s.mapTool==='erase'?null:s.activeTile);if(target===replacement)return;const q=[[x,y]],seen=new Set();while(q.length){const[cx,cy]=q.pop(),k=`${cx},${cy}`;if(seen.has(k)||cx<0||cy<0||cx>=s.map.width||cy>=s.map.height)continue;seen.add(k);const i=mapIdx(s,cx,cy);if(s.map.layers[layer][i]!==target)continue;s.map.layers[layer][i]=replacement;q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);}}

function drawTilePixels(ctx,tile,scale,dx=0,dy=0){tile.pixels.forEach((c,i)=>{if(!c)return;ctx.fillStyle=c;ctx.fillRect(dx+(i%16)*scale,dy+Math.floor(i/16)*scale,scale,scale);});}
function drawTileCanvas(){const canvas=document.getElementById('tileArtCanvas');if(!canvas)return;const s=getStudio(),z=s.tileCanvas.zoom;canvas.width=16*z;canvas.height=16*z;canvas.style.width=`${canvas.width}px`;canvas.style.height=`${canvas.height}px`;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#111625';ctx.fillRect(0,0,canvas.width,canvas.height);drawTilePixels(ctx,currentTile(s),z);if(s.tileCanvas.showGrid&&z>=6){ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();for(let x=0;x<=16;x++){ctx.moveTo(x*z+.5,0);ctx.lineTo(x*z+.5,canvas.height);}for(let y=0;y<=16;y++){ctx.moveTo(0,y*z+.5);ctx.lineTo(canvas.width,y*z+.5);}ctx.stroke();}}
function drawMapCanvas(){const canvas=document.getElementById('tileMapCanvas');if(!canvas)return;const s=getStudio(),scale=s.map.zoom,tilePx=16*scale;canvas.width=s.map.width*tilePx;canvas.height=s.map.height*tilePx;canvas.style.width=`${canvas.width}px`;canvas.style.height=`${canvas.height}px`;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0c1220';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<s.map.height;y++)for(let x=0;x<s.map.width;x++){const i=mapIdx(s,x,y),g=s.map.layers.ground[i],d=s.map.layers.decor[i];if(Number.isInteger(g)&&s.tiles[g])drawTilePixels(ctx,s.tiles[g],scale,x*tilePx,y*tilePx);if(Number.isInteger(d)&&s.tiles[d])drawTilePixels(ctx,s.tiles[d],scale,x*tilePx,y*tilePx);if(s.map.layers.collision[i]){ctx.fillStyle='rgba(255,70,90,.22)';ctx.fillRect(x*tilePx,y*tilePx,tilePx,tilePx);ctx.strokeStyle='rgba(255,100,120,.7)';ctx.strokeRect(x*tilePx+.5,y*tilePx+.5,tilePx-1,tilePx-1);}}
  if(scale>=2){ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;for(let x=0;x<=s.map.width;x++){ctx.beginPath();ctx.moveTo(x*tilePx+.5,0);ctx.lineTo(x*tilePx+.5,canvas.height);ctx.stroke();}for(let y=0;y<=s.map.height;y++){ctx.beginPath();ctx.moveTo(0,y*tilePx+.5);ctx.lineTo(canvas.width,y*tilePx+.5);ctx.stroke();}}
}
function drawTileThumb(canvas,tile){const scale=3;canvas.width=48;canvas.height=48;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#111625';ctx.fillRect(0,0,48,48);drawTilePixels(ctx,tile,scale);}

function renderTileBank(s){return s.tiles.map((t,i)=>`<button type="button" class="tile-bank-item ${i===s.activeTile?'active':''}" data-tile-index="${i}" title="${escapeHTML(t.name)}"><canvas data-tile-thumb="${i}" width="48" height="48"></canvas><span>${i+1}. ${escapeHTML(t.name)}</span><small>${escapeHTML(t.tag)}${t.walkable?' · walk':' · solid'}</small></button>`).join('');}
function toolButton(tool,label,s){return `<button type="button" class="tile-tool ${s.tileTool===tool?'active':''}" data-tile-tool="${tool}">${label}</button>`;}

export function renderTileStudio(){
  const root=document.getElementById('tileStudioPanel');if(!root||!bridge)return;const s=getStudio(),tile=currentTile(s),palette=s.palettes.find(p=>p.id===s.paletteId)||s.palettes[0];
  root.innerHTML=`
  <article class="tile-studio-shell">
    <div class="tile-topbar">
      <label>Palette <select id="tilePaletteSelect">${s.palettes.map(p=>`<option value="${escapeHTML(p.id)}" ${p.id===s.paletteId?'selected':''}>${escapeHTML(p.name)}</option>`).join('')}</select></label>
      <label>Tile zoom <input id="tileZoom" type="number" min="4" max="32" value="${s.tileCanvas.zoom}"></label>
      <label>Map size <select id="tileMapPreset">${MAP_PRESETS.map(p=>`<option value="${p.w}x${p.h}" ${p.w===s.map.width&&p.h===s.map.height?'selected':''}>${p.label}</option>`).join('')}</select></label>
      <label>Map zoom <input id="tileMapZoom" type="number" min="1" max="4" value="${s.map.zoom}"></label>
      <label class="check"><input id="tileGridToggle" type="checkbox" ${s.tileCanvas.showGrid?'checked':''}> Pixel grid</label>
    </div>
    <div class="tile-authoring-grid">
      <section class="tile-art-pane">
        <div class="tile-tools">${toolButton('pencil','✎ Pencil',s)}${toolButton('eraser','⌫ Eraser',s)}${toolButton('fill','▣ Fill',s)}${toolButton('eyedropper','◉ Pick',s)}${toolButton('line','／ Line',s)}${toolButton('rect','□ Rect',s)}</div>
        <div class="tile-canvas-wrap"><canvas id="tileArtCanvas"></canvas></div>
        <div class="tile-palette">${palette.colors.map(c=>`<button type="button" class="tile-swatch ${c===s.color?'active':''}" data-tile-color="${c}" style="--swatch:${c}" title="${c}"></button>`).join('')}<label class="tile-custom-color">Custom <input id="tileCustomColor" type="color" value="${s.color}"></label></div>
        <div class="tile-edit-actions"><button id="tileUndo" type="button">Undo</button><button id="tileRedo" type="button">Redo</button><button id="tileMirrorH" type="button">Mirror H</button><button id="tileMirrorV" type="button">Mirror V</button><button id="tileClear" type="button">Clear</button></div>
      </section>
      <section class="tile-meta-pane">
        <h3>Active Tile</h3>
        <label>Name <input id="tileName" value="${escapeHTML(tile.name)}"></label>
        <label>Semantic tag <select id="tileTag">${TILE_TAGS.map(t=>`<option ${tile.tag===t?'selected':''}>${t}</option>`).join('')}</select></label>
        <label class="check"><input id="tileWalkable" type="checkbox" ${tile.walkable?'checked':''}> Walkable</label>
        <label>Autotile group <input id="tileAutotileGroup" value="${escapeHTML(tile.autotileGroup)}" placeholder="forest-edge / path / water"></label>
        <div class="tile-meta-buttons"><button id="tileAdd" type="button">+ New Tile</button><button id="tileDuplicate" type="button">Duplicate</button><button id="tileDelete" type="button">Delete</button><button id="tileSeedGrove" type="button">Seed Grove Skeleton</button></div>
        <p class="tile-boundary">Autotile groups are explicit metadata in v5.10. PixelForge records the group and map relationships, but it does not claim final edge/corner art exists until you draw those variants.</p>
      </section>
    </div>
    <section class="tile-bank"><h3>Tileset Bank <span>${s.tiles.length}/128</span></h3><div class="tile-bank-scroll">${renderTileBank(s)}</div></section>
    <section class="map-composer">
      <div class="map-composer-head"><div><h3>Map Composer</h3><small>${s.map.width}×${s.map.height} cells · 16×16 tiles · scene ${escapeHTML(s.map.sceneId)}</small></div><div class="map-layer-controls"><label>Layer <select id="tileMapLayer"><option value="ground" ${s.map.activeLayer==='ground'?'selected':''}>Ground</option><option value="decor" ${s.map.activeLayer==='decor'?'selected':''}>Decor</option><option value="collision" ${s.map.activeLayer==='collision'?'selected':''}>Collision</option></select></label><button data-map-tool="paint" class="${s.mapTool==='paint'?'active':''}">Paint</button><button data-map-tool="erase" class="${s.mapTool==='erase'?'active':''}">Erase</button><button data-map-tool="fill" class="${s.mapTool==='fill'?'active':''}">Fill</button></div></div>
      <div class="tile-map-wrap"><canvas id="tileMapCanvas"></canvas></div>
    </section>
    <section class="tile-export-pane">
      <label>Scene ID <input id="tileSceneId" value="${escapeHTML(s.map.sceneId)}"></label>
      <label>Asset Forge slot <input id="tileAssetSlot" value="${escapeHTML(s.assetSlotId)}"></label>
      <label>Rights <select id="tileRights"><option ${s.rightsStatus==='original'?'selected':''}>original</option><option ${s.rightsStatus==='licensed'?'selected':''}>licensed</option><option ${s.rightsStatus==='public-domain'?'selected':''}>public-domain</option><option ${s.rightsStatus==='needs-review'?'selected':''}>needs-review</option></select></label>
      <div class="tile-export-actions"><button id="tileExportPng" type="button">Export Tileset PNG</button><button id="tileExportMap" type="button">Export Map JSON</button><button id="tileAttach" type="button">Attach Tileset to Asset Forge</button><button id="tileAttachMap" type="button">Attach Map to Project</button></div>
      <p class="tile-boundary">PixelForge keeps visual authorship explicit: a valid tileset/map contract proves dimensions, tags, collision data, hashing, and declared rights state. It does not substitute for human visual or rights review.</p>
    </section>
  </article>`;
  bindTileStudioEvents();drawTileCanvas();drawMapCanvas();document.querySelectorAll('[data-tile-thumb]').forEach(c=>drawTileThumb(c,s.tiles[Number(c.dataset.tileThumb)]));
}

function mutate(fn,message=''){snapshot();const s=getStudio();fn(s);setStudio(s,message);}
function bindTileStudioEvents(){
  const s=getStudio();
  document.querySelectorAll('[data-tile-tool]').forEach(b=>b.onclick=()=>mutate(x=>x.tileTool=b.dataset.tileTool,`Tile tool: ${b.dataset.tileTool}.`));
  document.querySelectorAll('[data-tile-color]').forEach(b=>b.onclick=()=>mutate(x=>{x.color=b.dataset.tileColor;x.tileTool='pencil';}));
  document.querySelectorAll('[data-tile-index]').forEach(b=>b.onclick=()=>mutate(x=>x.activeTile=Number(b.dataset.tileIndex),`Selected tile ${Number(b.dataset.tileIndex)+1}.`));
  document.querySelectorAll('[data-map-tool]').forEach(b=>b.onclick=()=>mutate(x=>x.mapTool=b.dataset.mapTool,`Map tool: ${b.dataset.mapTool}.`));
  document.getElementById('tilePaletteSelect').onchange=e=>mutate(x=>{x.paletteId=e.target.value;x.color=(x.palettes.find(p=>p.id===x.paletteId)?.colors||[])[4]||x.color;},'Tileset palette changed.');
  document.getElementById('tileZoom').onchange=e=>mutate(x=>x.tileCanvas.zoom=clamp(parseInt(e.target.value,10)||20,4,32));
  document.getElementById('tileMapZoom').onchange=e=>mutate(x=>x.map.zoom=clamp(parseInt(e.target.value,10)||2,1,4));
  document.getElementById('tileGridToggle').onchange=e=>mutate(x=>x.tileCanvas.showGrid=e.target.checked);
  document.getElementById('tileCustomColor').oninput=e=>mutate(x=>{x.color=e.target.value;x.tileTool='pencil';});
  document.getElementById('tileName').onchange=e=>mutate(x=>currentTile(x).name=e.target.value.trim()||'Untitled Tile','Tile name updated.');
  document.getElementById('tileTag').onchange=e=>mutate(x=>currentTile(x).tag=e.target.value,'Tile semantic tag updated.');
  document.getElementById('tileWalkable').onchange=e=>mutate(x=>currentTile(x).walkable=e.target.checked,'Tile walkability updated.');
  document.getElementById('tileAutotileGroup').onchange=e=>mutate(x=>currentTile(x).autotileGroup=e.target.value.trim(),'Autotile group metadata updated.');
  document.getElementById('tileMapLayer').onchange=e=>mutate(x=>x.map.activeLayer=e.target.value,`Map layer: ${e.target.value}.`);
  document.getElementById('tileSceneId').onchange=e=>mutate(x=>x.map.sceneId=e.target.value.trim()||'scene_untitled');
  document.getElementById('tileAssetSlot').onchange=e=>mutate(x=>x.assetSlotId=e.target.value.trim()||'unassigned-tiles');
  document.getElementById('tileRights').onchange=e=>mutate(x=>x.rightsStatus=e.target.value);
  document.getElementById('tileMapPreset').onchange=e=>{const[w,h]=e.target.value.split('x').map(Number);mutate(x=>resizeMap(x,w,h),`Map resized to ${w}×${h}.`);};
  document.getElementById('tileUndo').onclick=undoLocal;document.getElementById('tileRedo').onclick=redoLocal;
  document.getElementById('tileMirrorH').onclick=()=>mutate(mirrorH,'Tile mirrored horizontally.');document.getElementById('tileMirrorV').onclick=()=>mutate(mirrorV,'Tile mirrored vertically.');document.getElementById('tileClear').onclick=()=>mutate(x=>currentTile(x).pixels=blankPixels(),'Tile cleared.');
  document.getElementById('tileAdd').onclick=()=>mutate(addTile,'Blank tile added.');document.getElementById('tileDuplicate').onclick=()=>mutate(duplicateTile,'Tile duplicated.');document.getElementById('tileDelete').onclick=()=>mutate(deleteTile,'Tile deleted; map references normalized.');document.getElementById('tileSeedGrove').onclick=()=>mutate(seedGroveSkeleton,'Seeded SNES Grove tileset skeleton (blank art slots, semantic metadata only).');
  document.getElementById('tileExportPng').onclick=exportTilesetPng;document.getElementById('tileExportMap').onclick=exportMapJson;document.getElementById('tileAttach').onclick=attachTileset;document.getElementById('tileAttachMap').onclick=attachMap;
  const canvas=document.getElementById('tileArtCanvas');canvas.oncontextmenu=e=>e.preventDefault();
  canvas.onpointerdown=e=>{e.preventDefault();canvas.setPointerCapture?.(e.pointerId);const x=getStudio(),cell=tileCell(e,canvas);snapshot();tileDrawing=true;tileDragStart=cell;tileLastCell=cell;if(x.tileTool==='fill'){floodTile(x,cell.x,cell.y,x.color);tileDrawing=false;}else if(x.tileTool==='eyedropper'){const c=currentTile(x).pixels[idx16(cell.x,cell.y)];if(c){x.color=c;x.tileTool='pencil';}tileDrawing=false;}else if(x.tileTool==='pencil'||x.tileTool==='eraser'){setTilePixel(x,cell.x,cell.y,x.tileTool==='eraser'?null:x.color);}bridge.setState(normalizeTileStudio(x));drawTileCanvas();};
  canvas.onpointermove=e=>{if(!tileDrawing)return;const x=getStudio(),cell=tileCell(e,canvas);if((x.tileTool==='pencil'||x.tileTool==='eraser')&&(cell.x!==tileLastCell?.x||cell.y!==tileLastCell?.y)){drawLine(x,tileLastCell,cell,x.tileTool==='eraser'?null:x.color);tileLastCell=cell;bridge.setState(normalizeTileStudio(x));drawTileCanvas();}};
  canvas.onpointerup=e=>{if(!tileDragStart)return;const x=getStudio(),cell=tileCell(e,canvas);if(x.tileTool==='line')drawLine(x,tileDragStart,cell,x.color);if(x.tileTool==='rect')drawRect(x,tileDragStart,cell,x.color);bridge.setState(normalizeTileStudio(x));tileDrawing=false;tileDragStart=null;tileLastCell=null;renderTileStudio();};
  const map=document.getElementById('tileMapCanvas');map.oncontextmenu=e=>e.preventDefault();
  map.onpointerdown=e=>{e.preventDefault();map.setPointerCapture?.(e.pointerId);snapshot();mapDrawing=true;const x=getStudio(),cell=mapCell(e,map,x);paintMapCell(x,cell.x,cell.y);if(x.mapTool==='fill'){floodMap(x,cell.x,cell.y);mapDrawing=false;}mapLastCell=cell;bridge.setState(normalizeTileStudio(x));drawMapCanvas();};
  map.onpointermove=e=>{if(!mapDrawing)return;const x=getStudio(),cell=mapCell(e,map,x);if(cell.x!==mapLastCell?.x||cell.y!==mapLastCell?.y){paintMapCell(x,cell.x,cell.y);mapLastCell=cell;bridge.setState(normalizeTileStudio(x));drawMapCanvas();}};
  map.onpointerup=()=>{mapDrawing=false;mapLastCell=null;renderTileStudio();};
}

function paintMapCell(s,x,y){const i=mapIdx(s,x,y),layer=s.map.activeLayer;if(s.mapTool==='fill')return;if(layer==='collision'){s.map.layers.collision[i]=s.mapTool==='erase'?false:true;return;}s.map.layers[layer][i]=s.mapTool==='erase'?null:s.activeTile;if(layer==='ground'&&s.map.layers.ground[i]===null)s.map.layers.ground[i]=0;}
function addTile(s){if(s.tiles.length>=128)return;s.tiles.push(makeBlankTile(s.tiles.length,`Tile ${s.tiles.length+1}`));s.activeTile=s.tiles.length-1;}
function duplicateTile(s){if(s.tiles.length>=128)return;const t=clone(currentTile(s));t.id=`tile_${String(s.tiles.length+1).padStart(3,'0')}`;t.name=`${t.name} Copy`;s.tiles.splice(s.activeTile+1,0,t);s.activeTile++;for(const layer of ['ground','decor'])s.map.layers[layer]=s.map.layers[layer].map(v=>Number.isInteger(v)&&v>s.activeTile-1?v+1:v);}
function deleteTile(s){if(s.tiles.length===1){currentTile(s).pixels=blankPixels();return;}const removed=s.activeTile;s.tiles.splice(removed,1);for(const layer of ['ground','decor'])s.map.layers[layer]=s.map.layers[layer].map(v=>{if(v===removed)return layer==='ground'?0:null;if(Number.isInteger(v)&&v>removed)return v-1;return v;});s.activeTile=clamp(removed,0,s.tiles.length-1);}
function seedGroveSkeleton(s){const defs=[['Grass','ground',true,'ground'],['Path','path',true,'path'],['Tree Edge','foliage',false,'forest-edge'],['Water','water',false,'water-edge'],['Flowers','decor',true,''],['Stone','wall',false,'stone-edge'],['Gate','structure',true,''],['Rune Accent','trigger',true,'']];s.tiles=defs.map((d,i)=>({...makeBlankTile(i,d[0]),tag:d[1],walkable:d[2],autotileGroup:d[3]}));s.activeTile=0;s.paletteId='bouncehome';s.assetSlotId='bouncehome-grove-tiles';s.map.layers.ground=s.map.layers.ground.map(()=>0);s.map.layers.decor=s.map.layers.decor.map(()=>null);s.map.layers.collision=s.map.layers.collision.map(()=>false);}
function mirrorH(s){const t=currentTile(s),p=blankPixels();for(let y=0;y<16;y++)for(let x=0;x<16;x++)p[y*16+(15-x)]=t.pixels[y*16+x];t.pixels=p;}
function mirrorV(s){const t=currentTile(s),p=blankPixels();for(let y=0;y<16;y++)for(let x=0;x<16;x++)p[(15-y)*16+x]=t.pixels[y*16+x];t.pixels=p;}
function resizeMap(s,w,h){const oldW=s.map.width,oldH=s.map.height,old=clone(s.map.layers);s.map.width=w;s.map.height=h;s.map.layers={ground:blankLayer(w,h,0),decor:blankLayer(w,h,null),collision:blankLayer(w,h,false)};for(let y=0;y<Math.min(oldH,h);y++)for(let x=0;x<Math.min(oldW,w);x++){const oi=y*oldW+x,ni=y*w+x;s.map.layers.ground[ni]=old.ground[oi];s.map.layers.decor[ni]=old.decor[oi];s.map.layers.collision[ni]=old.collision[oi];}}
function undoLocal(){if(!undoStack.length){bridge?.log?.('Tile Studio: nothing to undo.');return;}redoStack.push(clone(getStudio()));bridge.setState(normalizeTileStudio(undoStack.pop()));renderTileStudio();}
function redoLocal(){if(!redoStack.length){bridge?.log?.('Tile Studio: nothing to redo.');return;}undoStack.push(clone(getStudio()));bridge.setState(normalizeTileStudio(redoStack.pop()));renderTileStudio();}

function makeTilesetCanvas(s){const cols=Math.min(8,s.tiles.length),rows=Math.ceil(s.tiles.length/cols),c=document.createElement('canvas');c.width=cols*16;c.height=rows*16;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;s.tiles.forEach((t,i)=>drawTilePixels(ctx,t,1,(i%cols)*16,Math.floor(i/cols)*16));return c;}
function mapPayload(s){return {schema:'pixelforge.tile-map.v5.10',tileSize:16,width:s.map.width,height:s.map.height,sceneId:s.map.sceneId,paletteId:s.paletteId,assetSlotId:s.assetSlotId,layers:clone(s.map.layers),tiles:s.tiles.map((t,i)=>({index:i,id:t.id,name:t.name,tag:t.tag,walkable:t.walkable,autotileGroup:t.autotileGroup})),boundary:'Map JSON records authored tile references, collision and semantic metadata. Human visual review remains required for final art.'};}
function exportTilesetPng(){const s=getStudio(),c=makeTilesetCanvas(s);c.toBlob(blob=>downloadBlob(blob,`${slugify(s.assetSlotId)}.tileset.png`),'image/png');bridge?.log?.(`Exported ${s.tiles.length}-tile PNG sheet.`);}
function exportMapJson(){const s=getStudio(),payload=mapPayload(s);downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`${slugify(s.map.sceneId)}.tile-map.json`);bridge?.log?.(`Exported ${s.map.width}×${s.map.height} map JSON.`);}
async function hashBlob(blob){const buf=await blob.arrayBuffer(),dig=await crypto.subtle.digest('SHA-256',buf);return[...new Uint8Array(dig)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function attachTileset(){const s=getStudio(),sheet=makeTilesetCanvas(s),blob=await new Promise(r=>sheet.toBlob(r,'image/png')),hash=await hashBlob(blob),asset={id:`tile_studio_${slugify(s.assetSlotId).replace(/-/g,'_')}`,name:s.assetSlotId,role:'Tile Studio / Asset Forge',kind:'tileset',tileSize:16,tileCount:s.tiles.length,colors:(s.palettes.find(p=>p.id===s.paletteId)?.colors||[]).slice(0,16),note:`Tile Studio 16×16, ${s.tiles.length} tile(s), rights: ${s.rightsStatus}.`,dataUrl:sheet.toDataURL('image/png'),tiles:s.tiles.map((t,i)=>({index:i,id:t.id,name:t.name,tag:t.tag,walkable:t.walkable,autotileGroup:t.autotileGroup})),assetForgeSlot:s.assetSlotId,sha256:hash,rightsStatus:s.rightsStatus};bridge?.attachTileset?.(asset);const receipt={schema:'pixelforge.asset-forge-tile-attachment.v5.10',createdAt:new Date().toISOString(),projectTitle:bridge?.getProjectTitle?.()||'',slotId:s.assetSlotId,rightsStatus:s.rightsStatus,sha256:hash,tileset:{tileSize:16,tileCount:s.tiles.length,paletteId:s.paletteId},boundary:'Attachment proves local tile production metadata and declared rights state; it is not a substitute for human rights or visual review.'};const next=getStudio();next.lastAttachment=receipt;bridge.setState(next);downloadBlob(blob,`${slugify(s.assetSlotId)}.tileset.png`);downloadBlob(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}),`${slugify(s.assetSlotId)}.asset-forge-tile-receipt.json`);renderTileStudio();bridge?.log?.(`Attached tileset to project asset registry and prepared Asset Forge receipt for ${s.assetSlotId}.`);}
function attachMap(){const s=getStudio(),payload=mapPayload(s);bridge?.attachMap?.(payload);const next=getStudio();next.lastMapExport={createdAt:new Date().toISOString(),sceneId:s.map.sceneId,width:s.map.width,height:s.map.height,assetSlotId:s.assetSlotId};bridge.setState(next);downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`${slugify(s.map.sceneId)}.tile-map.json`);renderTileStudio();bridge?.log?.(`Attached Tile Studio map ${s.map.sceneId} to project scene metadata.`);}

export function initTileStudio(inputBridge){
  bridge=inputBridge;if(!bridge?.getState||!bridge?.setState)throw new Error('Tile Studio bridge requires getState/setState.');bridge.setState(normalizeTileStudio(bridge.getState()));
  const dialog=document.getElementById('tileStudioDialog'),openBtn=document.getElementById('openTileStudioBtn'),closeBtn=document.getElementById('closeTileStudioBtn');
  if(openBtn)openBtn.onclick=()=>{renderTileStudio();if(dialog?.showModal&&!dialog.open)dialog.showModal();};if(closeBtn)closeBtn.onclick=()=>dialog?.close?.();renderTileStudio();
}
