// Pure, bounded bridge from existing PixelForge Tile Studio and Sprite Studio contracts.
// No remote URL fetching, privileged file access or eval. Imported pixels remain local.
export const TILE_SCHEMA='pixelforge.layer-tiles.v1';
export const ACTOR_SCHEMA='pixelforge.layer-actor.v1';
const finite=(x,def,min,max)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):def;
const integer=(x,def,min,max)=>Math.round(finite(x,def,min,max));
const cleanText=(x,def,max=80)=>typeof x==='string'?x.slice(0,max):def;
const HEX=/^#[0-9a-f]{6}$/i;
const color=(x)=>typeof x==='string'&&HEX.test(x)?x:null;
const tags=new Set(['ground','path','wall','water','foliage','structure','interior','decor','hazard','trigger']);
const cellVal=(x,count)=>Number.isInteger(x)&&x>=0&&x<count?x:null;
const array=(x,n,defaultVal)=>Array.from({length:n},(_,i)=>Array.isArray(x)?x[i]??defaultVal:defaultVal);
const boundedMap=(value,kind,length,count)=>array(value,length,null).map(v=>{
  if(kind==='collision')return v===true||v===1;
  const tile=cellVal(v,count);
  return tile===null?null:tile;
});
export function normalizeTileWorld(input){
  if(input===null||input===undefined)return null;
  if(!input||typeof input!=='object'||Array.isArray(input)||input.schema!==TILE_SCHEMA)throw Error('Invalid Layer Studio tile-world format.');
  const width=integer(input.width,24,1,64),height=integer(input.height,16,1,48);
  const count=width*height;
  const tiles=(Array.isArray(input.tiles)?input.tiles:[]).slice(0,128).map((t,i)=>({
    id:cleanText(t?.id,'tile-'+i,64),
    name:cleanText(t?.name,'Tile '+i,80),
    tag:tags.has(t?.tag)?t.tag:'ground',
    walkable:t?.walkable!==false,
    pixels:array(t?.pixels,256,null).map(color)
  }));
  return {
    schema:TILE_SCHEMA,
    sceneId:cleanText(input.sceneId,'imported-map'),
    width,height,tileSize:16,scale:integer(input.scale,2,1,4),
    originX:integer(input.originX,0,-2048,2048),
    originY:integer(input.originY,0,-2048,2048),
    tiles,
    layers:{
      ground:boundedMap(input.layers?.ground,'ground',count,tiles.length),
      decor:boundedMap(input.layers?.decor,'decor',count,tiles.length),
      collision:boundedMap(input.layers?.collision,'collision',count,tiles.length)
    }
  };
}
export function importTileStudio(input,{scale=2,originX=0,originY=0}={}){
  const data=input?.tileStudio?.studioType==='pixelforge.tile-studio.v5.10'?input.tileStudio:input;
  const isNative=data?.studioType==='pixelforge.tile-studio.v5.10';
  const isMap=data?.schema==='pixelforge.tile-map.v5.10';
  if(!isNative&&!isMap)throw Error('Choose a Tile Studio v5.10 JSON state or exported .tile-map.json.');
  const source=isNative?data.map:data;
  if(!source||!Array.isArray(source.layers?.collision)||!Array.isArray(source.layers?.ground))
    throw Error('The tile file needs its authored ground and collision layers.');
  const width=integer(source.width,24,1,64),height=integer(source.height,16,1,48);
  const count=width*height;
  if(source.layers.collision.length!==count||source.layers.ground.length!==count)
    throw Error('Map layer sizes do not match the grid dimensions.');
  if(isNative&&!Array.isArray(data.tiles))throw Error('Native Tile Studio file is missing its painted tiles.');
  const incoming=Array.isArray(data.tiles)?data.tiles:[];
  if(!incoming.length||incoming.length>128)throw Error('Tile Studio file must have 1–128 tiles.');
  const map={
    schema:TILE_SCHEMA,sceneId:source.sceneId,
    width,height,tileSize:16,scale,originX,originY,
    tiles:incoming.map((t,i)=>({
      id:t?.id||('tile-'+i),name:t?.name||('Tile '+i),
      tag:t?.tag||'ground',walkable:t?.walkable!==false,
      pixels:isNative?t?.pixels:undefined
    })),
    layers:source.layers
  };
  return normalizeTileWorld(map);
}
export function normalizeActor(input){
  if(input===null||input===undefined)return null;
  if(!input||typeof input!=='object'||Array.isArray(input)||input.schema!==ACTOR_SCHEMA)throw Error('Invalid PixelForge actor payload.');
  const width=integer(input.width,32,8,128),height=integer(input.height,48,8,128);
  const raw=Array.isArray(input.frames)?input.frames:[];
  if(raw.length<1||raw.length>64)throw Error('Actor requires 1–64 sprite frames.');
  return {
    schema:ACTOR_SCHEMA,width,height,fps:integer(input.fps,8,1,24),
    frames:raw.map((f,i)=>({
      label:cleanText(f?.label,'idle',32).toLowerCase(),
      duration:integer(f?.duration,1,1,16),
      pixels:array(f?.pixels,width*height,null).map(color)
    }))
  };
}
export function importSpriteStudio(input){
  const data=input?.spriteStudio?.studioType==='pixelforge.sprite-studio.v5.9'?input.spriteStudio:input;
  if(data?.studioType!=='pixelforge.sprite-studio.v5.9'||!data.canvas||!Array.isArray(data.frames))
    throw Error('Choose a Sprite Studio v5.9 JSON state with painted frames. A PNG-only export does not include frame labels.');
  return normalizeActor({
    schema:ACTOR_SCHEMA,width:data.canvas.width,height:data.canvas.height,
    fps:data.fps,frames:data.frames
  });
}
export function tileCell(world,col,row){
  if(!world||col<0||row<0||col>=world.width||row>=world.height)return null;
  const i=row*world.width+col;
  const tile=world.tiles[world.layers.ground[i]];
  return {
    col,row,index:i,tile,
    solid:world.layers.collision[i]===true||tile?.walkable===false||tile?.tag==='wall',
    hazard:tile?.tag==='hazard'
  };
}
export function tileCellsNear(world,x,y,w,h){
  if(!world)return [];
  const size=world.tileSize*world.scale;
  const minCol=Math.max(0,Math.floor((x-world.originX)/size));
  const maxCol=Math.min(world.width-1,Math.floor((x+w-world.originX)/size));
  const minRow=Math.max(0,Math.floor((y-world.originY)/size));
  const maxRow=Math.min(world.height-1,Math.floor((y+h-world.originY)/size));
  const matches=[];
  for(let row=minRow;row<=maxRow;row++)for(let col=minCol;col<=maxCol;col++){
    const cell=tileCell(world,col,row);
    if(cell)matches.push({...cell,x:world.originX+col*size,y:world.originY+row*size,w:size,h:size});
  }
  return matches;
}
export function actorFrame(actor,mode='idle',elapsed=0){
  if(!actor)return null;
  const aliases=mode==='run'?['run','walk','idle']:mode==='hurt'?['damage','idle']:mode==='air'?['jump','bounce','idle']:mode==='victory'?['victory','idle']:['idle','walk'];
  let frames=[];
  for(const alias of aliases){
    frames=actor.frames.filter(frame=>frame.label===alias);
    if(frames.length)break;
  }
  if(!frames.length)frames=actor.frames;
  const duration=frames.reduce((n,f)=>n+f.duration,0);
  let tick=Math.floor(Math.max(0,elapsed)*actor.fps)%duration;
  for(const frame of frames){tick-=frame.duration;if(tick<0)return frame;}
  return frames[0];
}
// Use an explicit cache keyed by normalized world object. No global renderer state beyond data.
const rasterCache=new WeakMap();
function makeTileAtlas(world){
  if(typeof document==='undefined')return null;
  let cache=rasterCache.get(world);
  if(cache)return cache;
  const images=[];
  for(const tile of world.tiles){
    const c=document.createElement('canvas');
    c.width=c.height=16;
    const g=c.getContext('2d');
    if(!g){images.push(null);continue;}
    for(let i=0;i<tile.pixels.length;i++)if(tile.pixels[i]){
      g.fillStyle=tile.pixels[i];g.fillRect(i%16,Math.floor(i/16),1,1);
    }
    images.push(c);
  }
  cache=images;
  rasterCache.set(world,cache);
  return cache;
}
const fallbackFill={ground:'#30545b',path:'#5f6970',wall:'#384b60',water:'#28697b',foliage:'#36745f',structure:'#5b5768',interior:'#51586a',decor:'#777260',hazard:'#a75e5c',trigger:'#a89853'};
export function renderTileWorld(ctx,world,cameraX=0,viewWidth=960,viewHeight=540){
  if(!world)return;
  const size=world.tileSize*world.scale,images=makeTileAtlas(world);
  const firstCol=Math.max(0,Math.floor((cameraX-world.originX)/size));
  const lastCol=Math.min(world.width-1,Math.ceil((cameraX+viewWidth-world.originX)/size));
  const firstRow=Math.max(0,Math.floor((0-world.originY)/size));
  const lastRow=Math.min(world.height-1,Math.ceil((viewHeight-world.originY)/size));
  ctx.save();ctx.beginPath();ctx.rect(0,0,viewWidth,viewHeight);ctx.clip();
  ctx.translate(-Math.round(cameraX),0);
  for(const pass of ['ground','decor'])for(let row=firstRow;row<=lastRow;row++)for(let col=firstCol;col<=lastCol;col++){
    const i=row*world.width+col,tileIndex=world.layers[pass][i];
    if(tileIndex===null||tileIndex===undefined)continue;
    const tile=world.tiles[tileIndex];if(!tile)continue;
    const x=world.originX+col*size,y=world.originY+row*size;
    const canvas=images?.[tileIndex];
    const painted=tile.pixels.some(Boolean);
    if(canvas&&painted){ctx.imageSmoothingEnabled=false;ctx.drawImage(canvas,x,y,size,size);}
    else {
      ctx.fillStyle=fallbackFill[tile.tag]||fallbackFill.ground;
      ctx.fillRect(x,y,size,size);
      ctx.strokeStyle='#d4eeea20';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,size-1,size-1);
    }
    if(pass==='ground'&&world.layers.collision[i]){
      ctx.fillStyle='#f2c78a30';ctx.fillRect(x,y,size,4);
    }
  }
  ctx.restore();
}
export function renderActor(ctx,actor,player,status='playing',elapsed=0){
  if(!actor)return false;
  const mode=status==='won'?'victory':player.invulnerable>0?'hurt':!player.grounded?'air':Math.abs(player.vx)>1?'run':'idle';
  const frame=actorFrame(actor,mode,elapsed);
  if(!frame||!frame.pixels.some(Boolean))return false;
  ctx.save();
  if(player.invulnerable>0&&Math.floor(elapsed*13)%2===0)ctx.globalAlpha=.4;
  ctx.translate(Math.round(player.x+(player.facing<0?player.w:0)),Math.round(player.y));
  if(player.facing<0)ctx.scale(-1,1);
  const sx=player.w/actor.width,sy=player.h/actor.height;
  ctx.scale(sx,sy);
  for(let i=0;i<frame.pixels.length;i++)if(frame.pixels[i]){
    ctx.fillStyle=frame.pixels[i];
    ctx.fillRect(i%actor.width,Math.floor(i/actor.width),1,1);
  }
  ctx.restore();
  return true;
}
