// Engine Shelf: original, standalone GLB 2.0 layout bridge.
// Source v1 primitives are ALL cuboids. No external files, scripts, physics or game runtime.
import {validateWorld} from './world.js';

const enc=new TextEncoder();
const NUM=n=>Number(n.toFixed(8));
const FACE_DATA=[
  {n:[0,0,1],p:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},
  {n:[0,0,-1],p:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]},
  {n:[1,0,0],p:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]},
  {n:[-1,0,0],p:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]},
  {n:[0,1,0],p:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},
  {n:[0,-1,0],p:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]}
];
function meshBinary(){
  const positions=FACE_DATA.flatMap(f=>f.p.flat());
  const normals=FACE_DATA.flatMap(f=>f.p.flatMap(()=>f.n));
  const indices=FACE_DATA.flatMap((_,i)=>[0,1,2,0,2,3].map(n=>n+i*4));
  const bytes=new Uint8Array((positions.length+normals.length)*4+indices.length*2);
  const view=new DataView(bytes.buffer);
  let off=0;
  for(const n of [...positions,...normals]){view.setFloat32(off,n,true);off+=4;}
  for(const n of indices){view.setUint16(off,n,true);off+=2;}
  return {bytes,posBytes:positions.length*4,normalBytes:normals.length*4,indexBytes:indices.length*2};
}
export function exportUniversalGlb(world,options={}){
  validateWorld(world);
  if(!options||typeof options!=='object'||Array.isArray(options)||
     Object.keys(options).some(k=>k!=='allowPlaceholders')||
     (options.allowPlaceholders!==undefined&&typeof options.allowPlaceholders!=='boolean'))
    throw Error('Invalid universal GLB options.');
  const proxies=world.objects.filter(o=>o.kind==='asset-proxy');
  if(proxies.length&&!options.allowPlaceholders)
    throw Error('Actual GLB asset proxies cannot be combined silently. Approve layout-only placeholder boxes or use the private Godot pack.');
  if(!world.objects.length)throw Error('Universal GLB requires at least one scene object.');
  const mesh=meshBinary();
  const doc={
    asset:{version:'2.0',generator:'PixelForge Universal Interchange v1'},
    scene:0,scenes:[{nodes:world.objects.map((_,i)=>i)}],
    nodes:world.objects.map((o,i)=>{
      const angle=o.yaw*Math.PI/360;
      return {
        name:o.name,
        mesh:i,
        translation:o.position,
        rotation:[0,NUM(Math.sin(angle)),0,NUM(Math.cos(angle))],
        scale:o.scale,
        extras:{pixelforgeId:o.id,pixelforgeKind:o.kind,
          placeholderOnly:o.kind==='asset-proxy'}
      };
    }),
    meshes:world.objects.map((o,i)=>({
      name:o.name,
      primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,material:i,mode:4}]
    })),
    materials:world.objects.map(o=>({
      name:o.name,
      pbrMetallicRoughness:{
        baseColorFactor:[1,3,5].map(i=>parseInt(o.color.slice(i,i+2),16)/255).concat([1]),
        metallicFactor:0,roughnessFactor:1
      },doubleSided:false
    })),
    buffers:[{byteLength:mesh.bytes.length}],
    bufferViews:[
      {buffer:0,byteOffset:0,byteLength:mesh.posBytes,target:34962},
      {buffer:0,byteOffset:mesh.posBytes,byteLength:mesh.normalBytes,target:34962},
      {buffer:0,byteOffset:mesh.posBytes+mesh.normalBytes,byteLength:mesh.indexBytes,target:34963}
    ],
    accessors:[
      {bufferView:0,componentType:5126,count:24,type:'VEC3',min:[-.5,-.5,-.5],max:[.5,.5,.5]},
      {bufferView:1,componentType:5126,count:24,type:'VEC3'},
      {bufferView:2,componentType:5123,count:36,type:'SCALAR',min:[0],max:[23]}
    ],
    extras:{
      sourceFormat:world.format,sourceTitle:world.title,
      limitation:'Static, authored cuboid meshes only. Lighting, third-party assets, interactions, physics, AI, gameplay and XR are not transferred.'
    }
  };
  const raw=enc.encode(JSON.stringify(doc));
  const padded=(raw.length+3)&~3;
  const bytes=new Uint8Array(12+8+padded+8+mesh.bytes.length);
  const header=new DataView(bytes.buffer);
  header.setUint32(0,0x46546c67,true);
  header.setUint32(4,2,true);
  header.setUint32(8,bytes.length,true);
  header.setUint32(12,padded,true);
  header.setUint32(16,0x4e4f534a,true);
  bytes.fill(0x20,20,20+padded);
  bytes.set(raw,20);
  const dataOffset=20+padded;
  header.setUint32(dataOffset,mesh.bytes.length,true);
  header.setUint32(dataOffset+4,0x004e4942,true);
  bytes.set(mesh.bytes,dataOffset+8);
  return Object.freeze({
    filename:'pixelforge-world-universal.glb',
    mime:'model/gltf-binary',
    bytes,
    report:Object.freeze({
      status:proxies.length?'STATIC_CUBOIDS_WITH_EXPLICIT_PLACEHOLDERS':'STATIC_CUBOIDS_GLTF2',
      objectCount:world.objects.length,placeholderCount:proxies.length,
      limitations:'Asset imports, game logic, lighting, physics and runtime compatibility not verified.'
    })
  });
}
