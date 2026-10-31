// PixelForge Layer Studio / standalone browser canvas renderer, no runtime privileges.
// Scene format: pixelforge.layer-scene.v1. No remote assets, scripts or HTML are loaded.
export const SCHEMA = 'pixelforge.layer-scene.v1';
export const KINDS = ['sky', 'mountains', 'ruins', 'arches', 'stairway', 'silhouettes', 'foreground', 'image'];
export const EFFECTS = ['none', 'stars', 'mist', 'dust', 'runes', 'rain', 'embers', 'fireflies'];
export const MOTIONS = ['none', 'float', 'sway', 'drift'];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const number = (value, fallback, low, high) => {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, low, high) : fallback;
};
const textValue = (s, fallback, length) => typeof s === 'string' ? s.slice(0, length) : fallback;
export function isSafeAsset(value) {
  return typeof value === 'string' && value.length <= 3_000_000 &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
const seedLayers = [
  ['The Distant Night', 'sky', .05, 'stars', 'none'],
  ['Moonlit Cliffs', 'mountains', .13, 'mist', 'drift'],
  ['Forgotten City', 'ruins', .26, 'dust', 'sway'],
  ['Cathedral Arches', 'arches', .44, 'runes', 'none'],
  ['Stairway & Platforms', 'stairway', .69, 'dust', 'none'],
  ['Wandering Spirits', 'silhouettes', .84, 'fireflies', 'float'],
  ['Hanging Thorns', 'foreground', 1.12, 'embers', 'sway']
];
export function makeLayer(index = 0) {
  const preset = seedLayers[index % seedLayers.length];
  return {
    id: 'plane-' + (index + 1),
    name: preset[0],
    kind: preset[1],
    visible: true,
    locked: false,
    parallax: preset[2],
    x: 0, y: 0,
    opacity: 1,
    scale: 1,
    motion: { type: preset[4], amplitude: 9, speed: .38 },
    overlay: { type: preset[3], intensity: .75, speed: 1, asset: null, x: 0, y: 0 },
    asset: null
  };
}
export function createScene() {
  return {
    schema: SCHEMA, title: 'The Lantern Vault', width: 960, height: 540,
    camera: { x: 0 },
    layers: seedLayers.map((_, i) => makeLayer(i))
  };
}
export function normalizeLayer(source, index = 0) {
  const s = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const basis = makeLayer(index);
  const safeSheet = item => item && typeof item === 'object' && isSafeAsset(item.dataUrl) ? {
    dataUrl: item.dataUrl,
    frames: Math.round(number(item.frames, 1, 1, 64)),
    fps: number(item.fps, 8, .1, 60)
  } : null;
  const asset = safeSheet(s.asset);
  return {
    id: textValue(s.id, basis.id, 64) || basis.id,
    name: textValue(s.name, basis.name, 80),
    kind: KINDS.includes(s.kind) ? s.kind : basis.kind,
    visible: s.visible !== false,
    locked: s.locked === true,
    parallax: number(s.parallax, basis.parallax, 0, 2.5),
    x: number(s.x, 0, -4000, 4000),
    y: number(s.y, 0, -2000, 2000),
    opacity: number(s.opacity, 1, 0, 1),
    scale: number(s.scale, 1, .25, 4),
    motion: {
      type: MOTIONS.includes(s.motion?.type) ? s.motion.type : basis.motion.type,
      amplitude: number(s.motion?.amplitude, 9, 0, 160),
      speed: number(s.motion?.speed, .38, 0, 8)
    },
    overlay: {
      type: EFFECTS.includes(s.overlay?.type) ? s.overlay.type : basis.overlay.type,
      intensity: number(s.overlay?.intensity, .75, 0, 2),
      speed: number(s.overlay?.speed, 1, 0, 8),
      x: number(s.overlay?.x, 0, -2000, 2000),
      y: number(s.overlay?.y, 0, -2000, 2000),
      asset: safeSheet(s.overlay?.asset)
    },
    asset
  };
}
export function normalizeScene(input) {
  if (!input || typeof input !== 'object' || input.schema !== SCHEMA || !Array.isArray(input.layers))
    throw new Error('Not a PixelForge Layer Scene v1 file.');
  if (input.layers.length < 1 || input.layers.length > 24)
    throw new Error('Layer scenes require 1 to 24 planes.');
  const layers = input.layers.map(normalizeLayer);
  const ids = new Set();
  for (const [i, layer] of layers.entries()) {
    if (ids.has(layer.id)) layer.id = 'plane-unique-' + i;
    ids.add(layer.id);
  }
  return {
    schema: SCHEMA,
    title: textValue(input.title, 'Untitled layered scene', 100),
    width: Math.round(number(input.width, 960, 320, 2048)),
    height: Math.round(number(input.height, 540, 180, 1152)),
    camera: { x: number(input.camera?.x, 0, -10000, 10000) },
    layers
  };
}
export function layerOffset(layer, time, cameraX, reducedMotion = false) {
  const t = reducedMotion ? 0 : Math.max(0, time) * layer.motion.speed;
  const amount = reducedMotion ? 0 : layer.motion.amplitude;
  let mx = 0, my = 0;
  if (layer.motion.type === 'float') my = Math.sin(t * 2) * amount;
  if (layer.motion.type === 'sway') mx = Math.sin(t * 2) * amount;
  if (layer.motion.type === 'drift') mx = t * amount;
  return { x: layer.x - cameraX * layer.parallax + mx, y: layer.y + my };
}
const fract = v => v - Math.floor(v);
const noise = v => fract(Math.sin(v * 12.9898 + 78.233) * 43758.5453);
function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath();
  ctx.fill();
}
function ellipse(ctx,x,y,rx,ry,color) {
  ctx.fillStyle=color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill();
}
function sky(ctx,w,h) {
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#071224');g.addColorStop(.48,'#152e42');g.addColorStop(1,'#277073');
  ctx.fillStyle=g;ctx.fillRect(-w*4,-h*2,w*9,h*5);
  ellipse(ctx,w*.74,h*.25,52,52,'#e8dbc1');
  ellipse(ctx,w*.74+17,h*.25-12,50,48,'#12283a');
  const glow=ctx.createRadialGradient(w*.74,h*.25,20,w*.74,h*.25,250);
  glow.addColorStop(0,'#83dedf45');glow.addColorStop(1,'#0b223200');
  ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
}
function mountains(ctx,w,h) {
  for(let repeat=-3;repeat<6;repeat++){
    const b=repeat*w;
    polygon(ctx,[[b-90,h],[b+110,h*.37],[b+275,h*.75],[b+450,h*.27],[b+660,h*.71],[b+835,h*.4],[b+w+90,h]],'#1c4151');
    polygon(ctx,[[b-80,h],[b+140,h*.6],[b+320,h*.86],[b+600,h*.52],[b+790,h*.82],[b+w+80,h]],'#224f57');
  }
}
function ruins(ctx,w,h) {
  const gap=200;
  for(let x=-w*3;x<w*5;x+=gap){
    const towerH = 100 + noise(x+8)*95;
    ctx.fillStyle='#142a36';ctx.fillRect(x+24,h*.70-towerH,65,towerH+h*.3);
    ctx.fillStyle='#1b3942';ctx.fillRect(x+18,h*.70-towerH-22,78,25);
    for(let k=0;k<3;k++){
      const wx=x+35+k*17;
      ctx.fillStyle='#8bb3a145';ctx.fillRect(wx,h*.70-towerH+29,7,21);
    }
    polygon(ctx,[[x+18,h*.70-towerH-22],[x+57,h*.70-towerH-64],[x+96,h*.70-towerH-22]],'#142d39');
  }
}
function arches(ctx,w,h){
  const gap=235;
  for(let x=-w*3;x<w*5;x+=gap){
    ctx.fillStyle='#254552';ctx.fillRect(x+14,h*.34,28,h*.6);ctx.fillRect(x+196,h*.34,29,h*.6);
    ctx.strokeStyle='#426f6d';ctx.lineWidth=32;ctx.beginPath();
    ctx.arc(x+119,h*.35,91,Math.PI,0);ctx.stroke();
    ctx.strokeStyle='#192f40';ctx.lineWidth=3;ctx.beginPath();
    ctx.arc(x+119,h*.35,91,Math.PI,0);ctx.stroke();
    ctx.fillStyle='#315c62';ctx.fillRect(x+3,h*.3,235,13);
    ctx.strokeStyle='#7db0a033';ctx.lineWidth=2;
    for(let k=0;k<7;k++){const y=h*.43+k*45;ctx.beginPath();ctx.moveTo(x+12,y);ctx.lineTo(x+45,y);ctx.moveTo(x+193,y);ctx.lineTo(x+227,y);ctx.stroke();}
  }
}
function stairway(ctx,w,h) {
  polygon(ctx,[[-w,h],[w*2,h],[w*2,h*.94],[-w,h*.50]],'#071724');
  ctx.strokeStyle='#d0cb96';ctx.lineWidth=4;
  for(let x=-w*2;x<w*3;x+=32){
    const y=h*.75+x*.18;
    if(y>h*.25&&y<h*1.22){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+32,y);ctx.lineTo(x+32,y+6);ctx.stroke();}
  }
  polygon(ctx,[[-w,h*.57],[w*.08,h*.57],[w*.21,h*.61],[w*.21,h*.67],[-w,h*.67]],'#0c1926');
}
function silhouettes(ctx,w,h,time){
  ctx.fillStyle='#0b2832';
  for(let i=0;i<8;i++){
    const x=i*160-100+Math.sin(time*.7+i)*8;
    const y=h*.7+(i%3)*33;
    ellipse(ctx,x,y-65,11,14,'#c8d9c477');
    polygon(ctx,[[x-12,y-46],[x+10,y-47],[x+19,y-14],[x-17,y-12]],'#b7d3ce66');
    ctx.strokeStyle='#bfdcd077';ctx.lineWidth=4;ctx.beginPath();
    ctx.moveTo(x-10,y-15);ctx.lineTo(x-15,y+8);
    ctx.moveTo(x+10,y-15);ctx.lineTo(x+22,y+12);
    ctx.moveTo(x-10,y-40);ctx.lineTo(x-30,y-16);
    ctx.moveTo(x+10,y-40);ctx.lineTo(x+29,y-22);ctx.stroke();
  }
}
function foreground(ctx,w,h){
  ctx.strokeStyle='#071722';ctx.lineWidth=6;
  for(let k=-4;k<7;k++){
    const x=k*190+23;ctx.beginPath();ctx.moveTo(x,-80);
    ctx.bezierCurveTo(x-45,90,x+70,150,x+25,260);ctx.stroke();
    for(let j=0;j<5;j++){
      const yy=j*57;ctx.beginPath();ctx.moveTo(x+18,yy);ctx.lineTo(x-22,yy-26);ctx.stroke();
    }
  }
  polygon(ctx,[[-w,h],[w*2,h],[w*2,h*.95],[w,h*.91],[w*.7,h*.98],[w*.35,h*.94],[-w,h*.96]],'#08141b');
}
function drawEffect(ctx,layer,w,h,time) {
  const kind=layer.overlay.type, power=layer.overlay.intensity;
  if(kind==='none'||power<=0)return;
  const clock=time*layer.overlay.speed;
  const count=Math.min(110,Math.round(35*power));
  if(kind==='mist'){
    for(let i=0;i<11;i++){
      const x=(noise(i+61)*w+clock*12*(i%2?1:-1)+w*100)%w;
      const y=h*(.3+noise(i+7)*.68);
      const g=ctx.createRadialGradient(x,y,4,x,y,110);
      g.addColorStop(0,'#85dfdb26');g.addColorStop(1,'#9ae3ca00');
      ctx.fillStyle=g;ctx.fillRect(x-110,y-110,220,220);
    }
    return;
  }
  ctx.save();
  for(let i=0;i<count;i++){
    const px=noise(i*3+17)*w;
    const py=noise(i*7+31)*h;
    let x=px,y=py,r=1+noise(i*13)*2, color='#b7f4e6b2';
    if(kind==='stars'){color='#f4e3c3aa';r*=.75;ctx.globalAlpha=.35+.55*(.5+.5*Math.sin(clock*2+i));}
    else if(kind==='dust'){x+=Math.sin(clock+i)*17;y+=(clock*(6+i%4))%h-h*.1;color='#dce9ce7a';r*=.7;}
    else if(kind==='runes'){y+=(Math.sin(clock*.5+i)*10);color='#75e5c5b2';r=2.2;}
    else if(kind==='rain'){y=(py+clock*(60+i%8*10))%h;color='#b8e2df72';}
    else if(kind==='embers'){y=(py-clock*(9+i%4*6)+h*500)%h;color='#ffc78bba';}
    else if(kind==='fireflies'){x+=Math.sin(clock+i)*22;y+=Math.cos(clock*.8+i)*15;color='#aaf9b0bf';r=2.8;}
    if(kind==='rain'){ctx.strokeStyle=color;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-6,y+19);ctx.stroke();}
    else{ctx.fillStyle=color;ellipse(ctx,x,y,r,r,ctx.fillStyle);}
  }
  ctx.restore();
}
const cache = new Map();
function imageFor(asset) {
  if(typeof Image==='undefined'||!asset)return null;
  let entry=cache.get(asset.dataUrl);
  if(!entry){
    const image=new Image(); entry={image,ready:false};
    image.onload=()=>{entry.ready=true;};image.onerror=()=>{entry.ready=false;};
    image.src=asset.dataUrl;
    cache.set(asset.dataUrl,entry);
    if(cache.size>24)cache.delete(cache.keys().next().value);
  }
  return entry.ready?entry.image:null;
}
function imageLayer(ctx,asset,w,h,time,reducedMotion,scale=1) {
  const im=imageFor(asset);
  if(!im)return;
  const frames=Math.max(1,Math.min(asset.frames,Math.floor(im.width)));
  const fw=im.width/frames, fh=im.height;
  const frame=reducedMotion?0:Math.floor(time*asset.fps)%frames;
  const dw=w*scale,dh=h*scale;
  for(let i=-5;i<6;i++)ctx.drawImage(im,frame*fw,0,fw,fh,i*dw,0,dw,dh);
}
export function renderScene(ctx,input,time=0,options={}) {
  const scene=input.schema===SCHEMA?input:normalizeScene(input);
  const w=scene.width,h=scene.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#081521';ctx.fillRect(0,0,w,h);
  const camera=Number.isFinite(options.cameraX)?options.cameraX:scene.camera.x;
  scene.layers.forEach((layer,i)=>{
    if(!layer.visible || options.solo && options.solo!==layer.id)return;
    const offset=layerOffset(layer,time,camera,options.reducedMotion);
    const spread=number(options.spread,0,0,100)*(i-(scene.layers.length-1)/2)*.8;
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
    ctx.globalAlpha=layer.opacity;
    ctx.translate(offset.x,offset.y+spread);
    if(layer.kind==='image')imageLayer(ctx,layer.asset,w,h,time,options.reducedMotion,layer.scale);
    else {
      const actions={sky,mountains,ruins,arches,stairway,silhouettes,foreground};
      actions[layer.kind]?.(ctx,w,h,time);
    }
    drawEffect(ctx,layer,w,h,options.reducedMotion?0:time);
    // Every plane may carry a separate, independently timed transparent art strip.
    if(layer.overlay.asset){
      ctx.save();ctx.translate(layer.overlay.x,layer.overlay.y);
      imageLayer(ctx,layer.overlay.asset,w,h,time,options.reducedMotion,layer.scale);
      ctx.restore();
    }
    ctx.restore();
  });
}
