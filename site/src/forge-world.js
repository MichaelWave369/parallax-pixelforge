// PixelForge v6 preview: isolated demo document, never writes the v5 project key.
export const WIDTH = 28;
export const HEIGHT = 18;
export const STORAGE_KEY = 'pixelforge.v6.forge.demo.v1';
export const TILE_TYPES = Object.freeze(['grass','tree','water','path','stone','wall','portal','treasure','house','spike','flower']);
export const BLOCKING = new Set(['tree','water','stone','wall','house','spike']);
export function createSeedWorld() {
  const tiles = Array.from({length:WIDTH*HEIGHT},()=> 'grass');
  const put = (x,y,t)=> { if(x>=0&&x<WIDTH&&y>=0&&y<HEIGHT) tiles[y*WIDTH+x]=t; };
  for(let x=0;x<WIDTH;x++){put(x,0,'tree');put(x,HEIGHT-1,'tree');if(x%3===0)put(x,1,'tree');}
  for(let y=0;y<HEIGHT;y++){put(0,y,'tree');put(WIDTH-1,y,'tree');}
  for(let y=10;y<14;y++)for(let x=5;x<9;x++)if((x+y)%4!==0)put(x,y,'water');
  for(let x=5;x<23;x++)put(x,8,'path');
  for(let y=8;y<16;y++)put(12,y,'path');
  for(let y=5;y<10;y++)put(21,y,'path');
  for(let x=18;x<26;x++)for(let y=3;y<6;y++)if((x+y)%3!==0)put(x,y,'stone');
  [[3,4],[9,4],[18,13],[24,12],[16,3],[20,15]].forEach(([x,y])=>put(x,y,'flower'));
  [[19,6],[20,6],[21,6],[22,6]].forEach(([x,y])=>put(x,y,'spike'));
  put(13,8,'treasure');put(15,7,'house');put(3,14,'portal');put(23,8,'portal');
  return {format:'pixelforge.v6.demo-world.v1',title:'Journey to the Parallax Institute',scene:'Mt. Shasta Roadside',width:WIDTH,height:HEIGHT,tiles};
}
export function validateDemoWorld(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||value.format!=='pixelforge.v6.demo-world.v1') throw new Error('Unsupported v6 demo world file.');
  if(value.width!==WIDTH||value.height!==HEIGHT||!Array.isArray(value.tiles)||value.tiles.length!==WIDTH*HEIGHT) throw new Error('Expected a 28 × 18 tile grid.');
  if(!value.tiles.every(t=>TILE_TYPES.includes(t))) throw new Error('Unknown tile type.');
  if(typeof value.title!=='string'||value.title.length<1||value.title.length>100||typeof value.scene!=='string'||value.scene.length<1||value.scene.length>100) throw new Error('Invalid project title or scene.');
  return {format:value.format,title:value.title,scene:value.scene,width:WIDTH,height:HEIGHT,tiles:[...value.tiles]};
}
export function paintTile(world,index,tile) {
  if(!Number.isInteger(index)||index<0||index>=WIDTH*HEIGHT||!TILE_TYPES.includes(tile)) throw new Error('Invalid paint operation.');
  const result=validateDemoWorld(world);
  result.tiles[index]=tile;
  return result;
}
export function movePlayer(world,player,dx,dy) {
  const x=player.x+dx,y=player.y+dy;
  if(x<0||x>=WIDTH||y<0||y>=HEIGHT)return player;
  if(BLOCKING.has(world.tiles[y*WIDTH+x]))return player;
  return {x,y};
}
export function downloadJson(value,filename) {
  const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
