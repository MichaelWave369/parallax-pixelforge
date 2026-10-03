const DEFAULT_PALETTES = [
  { id: 'pf-ui', name: 'PixelForge Framed UI', colors: ['#0b1020','#151d38','#24305a','#3e4d78','#f8f2de','#d9cfb2','#ffd36e','#ff9b6e','#ff7aa2','#8c6dff','#61f0ff','#8df7c8','#5abf65','#3779d4','#8b4a32','#ffffff'] },
  { id: 'bouncehome', name: 'Bouncehome Grove', colors: ['#101820','#1d2a24','#264d35','#347a46','#55a95d','#7bc96f','#b5df83','#e3efad','#6b4a2d','#9b6b43','#c99a5b','#f0c27a','#ffd36e','#8dc8ff','#f8f2de','#ffffff'] },
  { id: 'wobble', name: 'Wobble Woods', colors: ['#0b1020','#111a2d','#172a35','#1f3d3a','#295a43','#397552','#55a95d','#7bc96f','#123a5a','#285faf','#3779d4','#61f0ff','#8c6dff','#ff7aa2','#ffd36e','#f8f2de'] },
  { id: 'tower', name: 'Larrina Tower', colors: ['#0d0a16','#17121f','#26223e','#3f315f','#5f4b78','#8c6dff','#c38cff','#f1c7ff','#4b2d1a','#8b4a32','#c77b4e','#ffd6a0','#ffd36e','#8dc8ff','#f8f2de','#ffffff'] }
];
const SIZE_PRESETS = [
  { label:'16×16 Tile / Icon', w:16, h:16 },
  { label:'24×32 NPC', w:24, h:32 },
  { label:'32×32 Character', w:32, h:32 },
  { label:'32×48 SNES Hero', w:32, h:48 },
  { label:'64×64 Effect / Boss', w:64, h:64 },
  { label:'96×96 Portrait', w:96, h:96 }
];
const FRAME_LABELS = ['idle','walk','run','bounce','jump','interact','damage','victory','up','down','left','right','custom'];
let bridge = null;
let undoStack = [];
let redoStack = [];
let drawing = false;
let dragStart = null;
let lastCell = null;
let rafId = 0;
let previewIndex = 0;
let previewLast = 0;

const blankPixels = (w,h) => Array(w*h).fill(null);
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const hexOK = v => /^#[0-9a-f]{6}$/i.test(String(v||''));

export function buildDemoSpriteStudio() {
  return {
    studioType:'pixelforge.sprite-studio.v5.9',
    canvas:{ width:32, height:48, zoom:10, showGrid:true },
    tool:'pencil',
    color:'#ffd36e',
    paletteId:'pf-ui',
    palettes:clone(DEFAULT_PALETTES),
    activeFrame:0,
    fps:8,
    onionPrev:true,
    onionNext:false,
    assetSlotId:'more-bounce-hero',
    rightsStatus:'original',
    frames:[{ id:'frame_001', label:'idle', duration:1, pixels:blankPixels(32,48) }],
    lastAttachment:null
  };
}

export function normalizeSpriteStudio(input={}) {
  const fallback = buildDemoSpriteStudio();
  const src = input && typeof input==='object' && !Array.isArray(input) ? input : fallback;
  const w = clamp(parseInt(src.canvas?.width,10)||32,8,128);
  const h = clamp(parseInt(src.canvas?.height,10)||48,8,128);
  const palettes = Array.isArray(src.palettes)&&src.palettes.length ? src.palettes : fallback.palettes;
  const normPalettes = palettes.slice(0,16).map((p,i)=>({
    id:String(p.id||`palette_${i+1}`), name:String(p.name||`Palette ${i+1}`),
    colors:(Array.isArray(p.colors)?p.colors:[]).filter(hexOK).slice(0,32)
  })).filter(p=>p.colors.length);
  const framesRaw = Array.isArray(src.frames)&&src.frames.length ? src.frames : fallback.frames;
  const frames = framesRaw.slice(0,64).map((f,i)=>{
    const pixels = Array.isArray(f.pixels) ? f.pixels.slice(0,w*h) : [];
    while(pixels.length<w*h) pixels.push(null);
    return { id:String(f.id||`frame_${String(i+1).padStart(3,'0')}`), label:String(f.label||'idle'), duration:clamp(parseInt(f.duration,10)||1,1,16), pixels:pixels.map(v=>hexOK(v)?v:null) };
  });
  return {
    studioType:'pixelforge.sprite-studio.v5.9',
    canvas:{width:w,height:h,zoom:clamp(parseInt(src.canvas?.zoom,10)||10,2,24),showGrid:src.canvas?.showGrid!==false},
    tool:['pencil','eraser','fill','eyedropper','line','rect'].includes(src.tool)?src.tool:'pencil',
    color:hexOK(src.color)?src.color:'#ffd36e',
    paletteId:normPalettes.some(p=>p.id===src.paletteId)?src.paletteId:normPalettes[0]?.id||'',
    palettes:normPalettes,
    activeFrame:clamp(parseInt(src.activeFrame,10)||0,0,Math.max(0,frames.length-1)),
    fps:clamp(parseInt(src.fps,10)||8,1,24),
    onionPrev:src.onionPrev!==false,
    onionNext:src.onionNext===true,
    assetSlotId:String(src.assetSlotId||'more-bounce-hero').slice(0,80),
    rightsStatus:['original','licensed','public-domain','needs-review'].includes(src.rightsStatus)?src.rightsStatus:'original',
    frames,
    lastAttachment:src.lastAttachment&&typeof src.lastAttachment==='object'?src.lastAttachment:null
  };
}

export function validateSpriteStudio(studio, errors=[]) {
  const s = normalizeSpriteStudio(studio);
  if(s.studioType!=='pixelforge.sprite-studio.v5.9') errors.push('spriteStudio.studioType must be pixelforge.sprite-studio.v5.9.');
  if(!Number.isInteger(s.canvas.width)||s.canvas.width<8||s.canvas.width>128) errors.push('spriteStudio.canvas.width must be 8..128.');
  if(!Number.isInteger(s.canvas.height)||s.canvas.height<8||s.canvas.height>128) errors.push('spriteStudio.canvas.height must be 8..128.');
  if(!Array.isArray(s.frames)||!s.frames.length) errors.push('spriteStudio.frames must be non-empty.');
  s.frames.forEach((f,i)=>{ if(f.pixels.length!==s.canvas.width*s.canvas.height) errors.push(`spriteStudio.frames[${i}].pixels size mismatch.`); });
  if(!s.palettes.length) errors.push('spriteStudio.palettes must be non-empty.');
  return errors;
}

function getStudio(){ return normalizeSpriteStudio(bridge?.getState?.()||buildDemoSpriteStudio()); }
function setStudio(next, message=''){
  const normalized=normalizeSpriteStudio(next);
  bridge?.setState?.(normalized);
  if(message) bridge?.log?.(message);
  renderSpriteStudio();
}
function snapshot(){ undoStack.push(clone(getStudio())); if(undoStack.length>40) undoStack.shift(); redoStack=[]; }
function currentFrame(s=getStudio()){ return s.frames[s.activeFrame]||s.frames[0]; }
function idx(s,x,y){ return y*s.canvas.width+x; }
function downloadBlob(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); }
function slugify(v){ return String(v||'sprite').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'sprite'; }

function canvasCell(event, canvas, s){
  const r=canvas.getBoundingClientRect();
  const x=clamp(Math.floor((event.clientX-r.left)/r.width*s.canvas.width),0,s.canvas.width-1);
  const y=clamp(Math.floor((event.clientY-r.top)/r.height*s.canvas.height),0,s.canvas.height-1);
  return {x,y};
}
function setPixel(s,x,y,color){ if(x<0||y<0||x>=s.canvas.width||y>=s.canvas.height)return; currentFrame(s).pixels[idx(s,x,y)]=color; }
function drawLine(s,a,b,color){ let x0=a.x,y0=a.y,x1=b.x,y1=b.y; const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1; let err=dx+dy; for(;;){setPixel(s,x0,y0,color);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}} }
function drawRect(s,a,b,color){ const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y); for(let x=x0;x<=x1;x++){setPixel(s,x,y0,color);setPixel(s,x,y1,color);} for(let y=y0;y<=y1;y++){setPixel(s,x0,y,color);setPixel(s,x1,y,color);} }
function flood(s,x,y,color){ const f=currentFrame(s), target=f.pixels[idx(s,x,y)]||null; if(target===color)return; const q=[[x,y]], seen=new Set(); while(q.length){const [cx,cy]=q.pop(),k=`${cx},${cy}`;if(seen.has(k)||cx<0||cy<0||cx>=s.canvas.width||cy>=s.canvas.height)continue;seen.add(k);const i=idx(s,cx,cy);if((f.pixels[i]||null)!==target)continue;f.pixels[i]=color;q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);} }

function drawPixels(ctx,s,frame,alpha=1){
  if(!frame)return; const z=s.canvas.zoom; ctx.save(); ctx.globalAlpha=alpha;
  frame.pixels.forEach((color,i)=>{if(!color)return;ctx.fillStyle=color;ctx.fillRect((i%s.canvas.width)*z,Math.floor(i/s.canvas.width)*z,z,z);}); ctx.restore();
}
function drawEditorCanvas(){
  const canvas=document.getElementById('spriteCanvas'); if(!canvas)return; const s=getStudio(); const z=s.canvas.zoom;
  canvas.width=s.canvas.width*z; canvas.height=s.canvas.height*z; canvas.style.width=`${canvas.width}px`; canvas.style.height=`${canvas.height}px`;
  const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#111625'; ctx.fillRect(0,0,canvas.width,canvas.height);
  const prev=s.frames[(s.activeFrame-1+s.frames.length)%s.frames.length], next=s.frames[(s.activeFrame+1)%s.frames.length];
  if(s.frames.length>1&&s.onionPrev) drawPixels(ctx,s,prev,.18);
  if(s.frames.length>1&&s.onionNext) drawPixels(ctx,s,next,.10);
  drawPixels(ctx,s,currentFrame(s),1);
  if(s.canvas.showGrid&&z>=5){ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=s.canvas.width;x++){ctx.moveTo(x*z+.5,0);ctx.lineTo(x*z+.5,canvas.height);}for(let y=0;y<=s.canvas.height;y++){ctx.moveTo(0,y*z+.5);ctx.lineTo(canvas.width,y*z+.5);}ctx.stroke();}
}
function drawPreview(timestamp=0){
  const canvas=document.getElementById('spriteAnimPreview'); if(!canvas){rafId=requestAnimationFrame(drawPreview);return;} const s=getStudio();
  if(!previewLast)previewLast=timestamp; const ms=1000/s.fps; if(timestamp-previewLast>=ms){previewIndex=(previewIndex+1)%s.frames.length;previewLast=timestamp;}
  const frame=s.frames[previewIndex%s.frames.length]; const scale=Math.max(1,Math.floor(160/Math.max(s.canvas.width,s.canvas.height)));
  canvas.width=s.canvas.width*scale; canvas.height=s.canvas.height*scale; const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#111625';ctx.fillRect(0,0,canvas.width,canvas.height);
  frame.pixels.forEach((c,i)=>{if(!c)return;ctx.fillStyle=c;ctx.fillRect((i%s.canvas.width)*scale,Math.floor(i/s.canvas.width)*scale,scale,scale);});
  rafId=requestAnimationFrame(drawPreview);
}

function toolButton(tool,label,s){ return `<button type="button" class="sprite-tool ${s.tool===tool?'active':''}" data-sprite-tool="${tool}">${label}</button>`; }
function renderFrames(s){ return s.frames.map((f,i)=>`<button type="button" class="sprite-frame ${i===s.activeFrame?'active':''}" data-sprite-frame="${i}"><span>${i+1}</span><small>${escapeHTML(f.label)}</small></button>`).join(''); }
function escapeHTML(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

export function renderSpriteStudio(){
  const root=document.getElementById('spriteStudioPanel'); if(!root||!bridge)return; const s=getStudio(); const palette=s.palettes.find(p=>p.id===s.paletteId)||s.palettes[0]; const f=currentFrame(s);
  root.innerHTML=`
    <article class="sprite-studio-shell">
      <div class="sprite-topbar">
        <label>Canvas <select id="spriteSizePreset">${SIZE_PRESETS.map(p=>`<option value="${p.w}x${p.h}" ${p.w===s.canvas.width&&p.h===s.canvas.height?'selected':''}>${p.label}</option>`).join('')}</select></label>
        <label>Palette <select id="spritePaletteSelect">${s.palettes.map(p=>`<option value="${escapeHTML(p.id)}" ${p.id===s.paletteId?'selected':''}>${escapeHTML(p.name)}</option>`).join('')}</select></label>
        <label>FPS <input id="spriteFps" type="number" min="1" max="24" value="${s.fps}"></label>
        <label>Zoom <input id="spriteZoom" type="number" min="2" max="24" value="${s.canvas.zoom}"></label>
        <label class="check"><input id="spriteGridToggle" type="checkbox" ${s.canvas.showGrid?'checked':''}> Grid</label>
        <label class="check"><input id="spriteOnionPrev" type="checkbox" ${s.onionPrev?'checked':''}> Onion −</label>
        <label class="check"><input id="spriteOnionNext" type="checkbox" ${s.onionNext?'checked':''}> Onion +</label>
      </div>
      <div class="sprite-workspace">
        <div class="sprite-left-tools">
          ${toolButton('pencil','✎ Pencil',s)}${toolButton('eraser','⌫ Eraser',s)}${toolButton('fill','▣ Fill',s)}${toolButton('eyedropper','◉ Pick',s)}${toolButton('line','╱ Line',s)}${toolButton('rect','□ Rect',s)}
          <button type="button" id="spriteUndo">↶ Undo</button><button type="button" id="spriteRedo">↷ Redo</button>
          <button type="button" id="spriteMirror">⇋ Mirror H</button><button type="button" id="spriteMirrorV">⇵ Mirror V</button><button type="button" id="spriteClear">Clear</button>
        </div>
        <div class="sprite-canvas-wrap"><canvas id="spriteCanvas" aria-label="Pixel sprite drawing canvas"></canvas></div>
        <div class="sprite-right-panel">
          <strong>Animation Preview</strong><canvas id="spriteAnimPreview"></canvas>
          <label>Frame label <select id="spriteFrameLabel">${FRAME_LABELS.map(l=>`<option ${f.label===l?'selected':''}>${l}</option>`).join('')}</select></label>
          <label>Asset Forge slot <input id="spriteAssetSlot" value="${escapeHTML(s.assetSlotId)}" placeholder="more-bounce-hero"></label>
          <label>Rights <select id="spriteRights"><option ${s.rightsStatus==='original'?'selected':''}>original</option><option ${s.rightsStatus==='licensed'?'selected':''}>licensed</option><option ${s.rightsStatus==='public-domain'?'selected':''}>public-domain</option><option ${s.rightsStatus==='needs-review'?'selected':''}>needs-review</option></select></label>
          <div class="sprite-status"><span>${s.canvas.width}×${s.canvas.height}</span><span>${s.frames.length} frame${s.frames.length===1?'':'s'}</span><span>${escapeHTML(f.label)}</span></div>
        </div>
      </div>
      <div class="sprite-palette"><button type="button" class="sprite-swatch transparent" data-sprite-color="transparent" title="Transparent"></button>${palette.colors.map(c=>`<button type="button" class="sprite-swatch ${c.toLowerCase()===s.color.toLowerCase()?'active':''}" data-sprite-color="${c}" style="--swatch:${c}" title="${c}"></button>`).join('')}<label class="custom-color">Custom <input id="spriteCustomColor" type="color" value="${s.color}"></label></div>
      <div class="sprite-timeline">${renderFrames(s)}<button type="button" id="spriteAddFrame">＋ Frame</button><button type="button" id="spriteDuplicateFrame">⧉ Duplicate</button><button type="button" id="spriteDeleteFrame">− Delete</button><button type="button" id="spriteSeedHero">Seed SNES Hero Set</button></div>
      <div class="sprite-actions"><button type="button" id="spriteExportPng">Export Sprite Sheet PNG</button><button type="button" id="spriteExportJson">Export Animation JSON</button><button type="button" id="spriteAttach">Attach to Asset Forge Slot</button></div>
      <p class="sprite-boundary">PixelForge can validate dimensions, frames, palettes and provenance. Human visual review still decides whether artwork reaches the SNES gold standard.</p>
    </article>`;
  bindDynamicEvents(); drawEditorCanvas();
}

function mutate(fn,msg){ snapshot(); const s=getStudio(); fn(s); setStudio(s,msg); }
function bindDynamicEvents(){
  const root=document.getElementById('spriteStudioPanel'); if(!root)return;
  root.querySelectorAll('[data-sprite-tool]').forEach(b=>b.onclick=()=>mutate(s=>s.tool=b.dataset.spriteTool,`Sprite Studio tool: ${b.dataset.spriteTool}.`));
  root.querySelectorAll('[data-sprite-color]').forEach(b=>b.onclick=()=>{const c=b.dataset.spriteColor;mutate(s=>{if(c==='transparent')s.tool='eraser';else{s.color=c;s.tool='pencil';}},c==='transparent'?'Sprite Studio transparent eraser selected.':`Sprite color ${c}.`);});
  root.querySelectorAll('[data-sprite-frame]').forEach(b=>b.onclick=()=>mutate(s=>s.activeFrame=parseInt(b.dataset.spriteFrame,10)||0,`Sprite frame ${Number(b.dataset.spriteFrame)+1} selected.`));
  document.getElementById('spriteSizePreset').onchange=e=>{const [w,h]=e.target.value.split('x').map(Number);mutate(s=>resizeCanvas(s,w,h),`Sprite canvas resized to ${w}×${h}.`);};
  document.getElementById('spritePaletteSelect').onchange=e=>mutate(s=>{s.paletteId=e.target.value;s.color=(s.palettes.find(p=>p.id===s.paletteId)?.colors||[])[6]||s.color;},'Sprite palette changed.');
  document.getElementById('spriteFps').onchange=e=>mutate(s=>s.fps=clamp(parseInt(e.target.value,10)||8,1,24),'Animation FPS updated.');
  document.getElementById('spriteZoom').onchange=e=>mutate(s=>s.canvas.zoom=clamp(parseInt(e.target.value,10)||10,2,24),'Sprite canvas zoom updated.');
  document.getElementById('spriteGridToggle').onchange=e=>mutate(s=>s.canvas.showGrid=e.target.checked);
  document.getElementById('spriteOnionPrev').onchange=e=>mutate(s=>s.onionPrev=e.target.checked);
  document.getElementById('spriteOnionNext').onchange=e=>mutate(s=>s.onionNext=e.target.checked);
  document.getElementById('spriteFrameLabel').onchange=e=>mutate(s=>currentFrame(s).label=e.target.value,'Frame animation label updated.');
  document.getElementById('spriteAssetSlot').onchange=e=>mutate(s=>s.assetSlotId=e.target.value.trim()||'unassigned-slot');
  document.getElementById('spriteRights').onchange=e=>mutate(s=>s.rightsStatus=e.target.value);
  document.getElementById('spriteCustomColor').oninput=e=>mutate(s=>{s.color=e.target.value;s.tool='pencil';});
  document.getElementById('spriteUndo').onclick=undoLocal; document.getElementById('spriteRedo').onclick=redoLocal;
  document.getElementById('spriteMirror').onclick=()=>mutate(mirrorFrame,'Frame mirrored horizontally.');
  document.getElementById('spriteMirrorV').onclick=()=>mutate(mirrorFrameVertical,'Frame mirrored vertically.');
  document.getElementById('spriteClear').onclick=()=>mutate(s=>currentFrame(s).pixels=blankPixels(s.canvas.width,s.canvas.height),'Frame cleared.');
  document.getElementById('spriteAddFrame').onclick=()=>mutate(addBlankFrame,'Blank animation frame added.');
  document.getElementById('spriteDuplicateFrame').onclick=()=>mutate(duplicateFrame,'Animation frame duplicated.');
  document.getElementById('spriteDeleteFrame').onclick=()=>mutate(deleteFrame,'Animation frame deleted.');
  document.getElementById('spriteSeedHero').onclick=()=>mutate(seedHeroAnimationSet,'Seeded SNES hero animation set: idle, walk, run, bounce, interact, damage, victory.');
  document.getElementById('spriteExportPng').onclick=exportSheetPng; document.getElementById('spriteExportJson').onclick=exportAnimationJson; document.getElementById('spriteAttach').onclick=attachToAssetForge;
  const canvas=document.getElementById('spriteCanvas');
  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.onpointerdown=e=>{e.preventDefault();canvas.setPointerCapture?.(e.pointerId);const s=getStudio(),cell=canvasCell(e,canvas,s);snapshot();drawing=true;dragStart=cell;lastCell=cell; if(s.tool==='fill'){flood(s,cell.x,cell.y,s.color);drawing=false;} else if(s.tool==='eyedropper'){const c=currentFrame(s).pixels[idx(s,cell.x,cell.y)];if(c){s.color=c;s.tool='pencil';}drawing=false;} else if(s.tool==='pencil'||s.tool==='eraser'){setPixel(s,cell.x,cell.y,s.tool==='eraser'?null:s.color);} bridge.setState(normalizeSpriteStudio(s));drawEditorCanvas();};
  canvas.onpointermove=e=>{if(!drawing)return;const s=getStudio(),cell=canvasCell(e,canvas,s);if((s.tool==='pencil'||s.tool==='eraser')&&(cell.x!==lastCell?.x||cell.y!==lastCell?.y)){drawLine(s,lastCell,cell,s.tool==='eraser'?null:s.color);lastCell=cell;bridge.setState(normalizeSpriteStudio(s));drawEditorCanvas();}};
  canvas.onpointerup=e=>{if(!dragStart)return;const s=getStudio(),cell=canvasCell(e,canvas,s);if(s.tool==='line')drawLine(s,dragStart,cell,s.color);if(s.tool==='rect')drawRect(s,dragStart,cell,s.color);bridge.setState(normalizeSpriteStudio(s));drawing=false;dragStart=null;lastCell=null;renderSpriteStudio();};
}
function resizeCanvas(s,w,h){ const oldW=s.canvas.width,oldH=s.canvas.height;s.frames=s.frames.map(f=>{const p=blankPixels(w,h);for(let y=0;y<Math.min(oldH,h);y++)for(let x=0;x<Math.min(oldW,w);x++)p[y*w+x]=f.pixels[y*oldW+x]||null;return {...f,pixels:p};});s.canvas.width=w;s.canvas.height=h;s.canvas.zoom=clamp(Math.floor(480/Math.max(w,h)),2,20); }
function mirrorFrame(s){const f=currentFrame(s),w=s.canvas.width,h=s.canvas.height,p=blankPixels(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)p[y*w+(w-1-x)]=f.pixels[y*w+x];f.pixels=p;}
function mirrorFrameVertical(s){const f=currentFrame(s),w=s.canvas.width,h=s.canvas.height,p=blankPixels(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)p[(h-1-y)*w+x]=f.pixels[y*w+x];f.pixels=p;}
function seedHeroAnimationSet(s){const plan=[['idle',4],['walk',4],['run',4],['bounce',4],['interact',2],['damage',2],['victory',3]];s.canvas.width=32;s.canvas.height=48;s.canvas.zoom=10;s.frames=[];let n=1;for(const [label,count] of plan)for(let i=0;i<count;i++)s.frames.push({id:`frame_${String(n++).padStart(3,'0')}`,label,duration:1,pixels:blankPixels(32,48)});s.activeFrame=0;s.assetSlotId=s.assetSlotId||'more-bounce-hero';}
function addBlankFrame(s){const id=`frame_${String(Date.now()).slice(-6)}`;s.frames.push({id,label:currentFrame(s)?.label||'idle',duration:1,pixels:blankPixels(s.canvas.width,s.canvas.height)});s.activeFrame=s.frames.length-1;}
function duplicateFrame(s){const f=clone(currentFrame(s));f.id=`frame_${String(Date.now()).slice(-6)}`;s.frames.splice(s.activeFrame+1,0,f);s.activeFrame++;}
function deleteFrame(s){if(s.frames.length===1){currentFrame(s).pixels=blankPixels(s.canvas.width,s.canvas.height);return;}s.frames.splice(s.activeFrame,1);s.activeFrame=clamp(s.activeFrame,0,s.frames.length-1);}
function undoLocal(){if(!undoStack.length){bridge.log?.('Sprite Studio: nothing to undo.');return;}redoStack.push(clone(getStudio()));bridge.setState(normalizeSpriteStudio(undoStack.pop()));renderSpriteStudio();}
function redoLocal(){if(!redoStack.length){bridge.log?.('Sprite Studio: nothing to redo.');return;}undoStack.push(clone(getStudio()));bridge.setState(normalizeSpriteStudio(redoStack.pop()));renderSpriteStudio();}
function makeSheetCanvas(s){const c=document.createElement('canvas');c.width=s.canvas.width*s.frames.length;c.height=s.canvas.height;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;s.frames.forEach((f,fi)=>f.pixels.forEach((col,i)=>{if(!col)return;ctx.fillStyle=col;ctx.fillRect(fi*s.canvas.width+(i%s.canvas.width),Math.floor(i/s.canvas.width),1,1);}));return c;}
function exportSheetPng(){const s=getStudio();const c=makeSheetCanvas(s);c.toBlob(blob=>downloadBlob(blob,`${slugify(bridge.getProjectTitle?.()||'pixelforge')}-${slugify(s.assetSlotId)}.png`),'image/png');bridge.log?.(`Exported ${s.frames.length}-frame sprite sheet PNG.`);}
function animationMap(s){const groups={};s.frames.forEach((f,i)=>{(groups[f.label]||=[]).push(i);});return {schema:'pixelforge.sprite-animation.v5.9',frameWidth:s.canvas.width,frameHeight:s.canvas.height,frameCount:s.frames.length,fps:s.fps,animations:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,{frames:v,fps:s.fps,loop:!['damage','victory','interact'].includes(k)}]))};}
function exportAnimationJson(){const s=getStudio();downloadBlob(new Blob([JSON.stringify(animationMap(s),null,2)],{type:'application/json'}),`${slugify(bridge.getProjectTitle?.()||'pixelforge')}-${slugify(s.assetSlotId)}.animations.json`);bridge.log?.('Exported Sprite Studio animation map.');}
async function hashBlob(blob){const buf=await blob.arrayBuffer();const dig=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(dig)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function attachToAssetForge(){const s=getStudio();const sheet=makeSheetCanvas(s);const blob=await new Promise(r=>sheet.toBlob(r,'image/png'));const hash=await hashBlob(blob);const dataUrl=sheet.toDataURL('image/png');const asset={id:`sprite_studio_${slugify(s.assetSlotId).replace(/-/g,'_')}`,name:s.assetSlotId,role:'Sprite Studio / Asset Forge',colors:(s.palettes.find(p=>p.id===s.paletteId)?.colors||[]).slice(0,16),note:`Sprite Studio ${s.canvas.width}×${s.canvas.height}, ${s.frames.length} frame(s), rights: ${s.rightsStatus}.`,dataUrl,animationMap:animationMap(s),assetForgeSlot:s.assetSlotId,sha256:hash,rightsStatus:s.rightsStatus};bridge.attachSprite?.(asset);const receipt={schema:'pixelforge.asset-forge-attachment.v5.9',createdAt:new Date().toISOString(),projectTitle:bridge.getProjectTitle?.()||'',slotId:s.assetSlotId,rightsStatus:s.rightsStatus,sha256:hash,sprite:{frameWidth:s.canvas.width,frameHeight:s.canvas.height,frameCount:s.frames.length,fps:s.fps,paletteId:s.paletteId},animationMap:animationMap(s),boundary:'Attachment proves local creation metadata and declared rights state; it is not a substitute for human rights or visual review.'};const next=getStudio();next.lastAttachment=receipt;bridge.setState(next);downloadBlob(blob,`${slugify(s.assetSlotId)}.png`);downloadBlob(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}),`${slugify(s.assetSlotId)}.asset-forge-receipt.json`);renderSpriteStudio();bridge.log?.(`Attached Sprite Studio output to project Sprite Gallery and prepared Asset Forge receipt for ${s.assetSlotId}.`);}

export function initSpriteStudio(inputBridge){
  bridge=inputBridge;
  if(!bridge?.getState||!bridge?.setState) throw new Error('Sprite Studio bridge requires getState/setState.');
  bridge.setState(normalizeSpriteStudio(bridge.getState()));
  const dialog=document.getElementById('spriteStudioDialog');
  const openBtn=document.getElementById('openSpriteStudioBtn');
  const closeBtn=document.getElementById('closeSpriteStudioBtn');
  if(openBtn) openBtn.onclick=()=>{ renderSpriteStudio(); if(dialog?.showModal&&!dialog.open) dialog.showModal(); };
  if(closeBtn) closeBtn.onclick=()=>dialog?.close?.();
  renderSpriteStudio();
  cancelAnimationFrame(rafId); rafId=requestAnimationFrame(drawPreview);
}
