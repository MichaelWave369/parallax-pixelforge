import { buildGlbPreviewPlan, buildPreviewReceipt } from '../scripts/lib/glb_preview_plan.js';

const canvas=document.getElementById('gl');
const statusEl=document.getElementById('status');
const factsEl=document.getElementById('facts');
const dropHint=document.getElementById('dropHint');
const fileInput=document.getElementById('fileInput');
const urlInput=document.getElementById('urlInput');
const urlLoad=document.getElementById('urlLoad');
const receiptBtn=document.getElementById('receiptBtn');

const GLB_MAGIC=0x46546c67;
const JSON_CHUNK=0x4e4f534a;
const BIN_CHUNK=0x004e4942;
const TYPE_SIZE={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const COMPONENT_BYTES={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};

let gl=null;
let sceneState=null;
let currentReceipt=null;
const camera={yaw:0.75,pitch:0.38,distance:4,target:[0,0,0],radius:1};
let drag=null;

function setStatus(text){ statusEl.textContent=text; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

function parseGlb(arrayBuffer){
  const bytes=new Uint8Array(arrayBuffer);
  const view=new DataView(arrayBuffer);
  if(bytes.byteLength<20) throw new Error('GLB too small.');
  if(view.getUint32(0,true)!==GLB_MAGIC) throw new Error('Invalid GLB magic.');
  const version=view.getUint32(4,true);
  const declared=view.getUint32(8,true);
  if(version!==2) throw new Error('Only GLB/glTF 2.0 is supported.');
  if(declared!==bytes.byteLength) throw new Error('GLB declared length does not match file bytes.');

  let offset=12;
  let json=null;
  let bin=null;
  const chunks=[];
  while(offset<bytes.byteLength){
    if(offset+8>bytes.byteLength) throw new Error('Truncated GLB chunk header.');
    const len=view.getUint32(offset,true);
    const type=view.getUint32(offset+4,true);
    const start=offset+8;
    const end=start+len;
    if(end>bytes.byteLength) throw new Error('GLB chunk exceeds file bounds.');
    const data=bytes.slice(start,end);
    chunks.push({type,len});
    if(type===JSON_CHUNK){
      if(json) throw new Error('Multiple JSON chunks are not supported.');
      const text=new TextDecoder().decode(data).replace(/[\u0000\u0020]+$/g,'');
      json=JSON.parse(text);
    }else if(type===BIN_CHUNK && !bin){
      bin=data;
    }
    offset=end;
  }
  if(!json) throw new Error('GLB JSON chunk missing.');
  if(json.asset?.version!=='2.0') throw new Error('glTF asset.version must be 2.0.');
  if(!bin) bin=new Uint8Array();

  const summary={
    scenes:json.scenes?.length||0,
    nodes:json.nodes?.length||0,
    meshes:json.meshes?.length||0,
    primitives:(json.meshes||[]).reduce((n,m)=>n+(m.primitives?.length||0),0),
    materials:json.materials?.length||0,
    textures:json.textures?.length||0,
    images:json.images?.length||0,
    samplers:json.samplers?.length||0,
    accessors:json.accessors?.length||0,
    bufferViews:json.bufferViews?.length||0,
    buffers:json.buffers?.length||0,
    animations:json.animations?.length||0,
    skins:json.skins?.length||0,
    cameras:json.cameras?.length||0,
  };

  return {
    json,bin,bytes,
    inspection:{
      valid:true,
      summary,
      extensions_required:json.extensionsRequired||[],
      extensions_used:json.extensionsUsed||[],
      container:{version,declared_length:declared,actual_length:bytes.byteLength,chunk_count:chunks.length,has_binary_chunk:chunks.some(c=>c.type===BIN_CHUNK)},
      asset:{generator:json.asset?.generator||null,copyright:json.asset?.copyright||null},
    },
  };
}

function componentReader(view,type,offset){
  if(type===5120) return view.getInt8(offset);
  if(type===5121) return view.getUint8(offset);
  if(type===5122) return view.getInt16(offset,true);
  if(type===5123) return view.getUint16(offset,true);
  if(type===5125) return view.getUint32(offset,true);
  if(type===5126) return view.getFloat32(offset,true);
  throw new Error('Unsupported componentType '+type);
}

function normalizeComponent(v,type){
  if(type===5120) return Math.max(v/127,-1);
  if(type===5121) return v/255;
  if(type===5122) return Math.max(v/32767,-1);
  if(type===5123) return v/65535;
  if(type===5125) return v/4294967295;
  return v;
}

function accessorData(gltf,bin,index,asIndex=false){
  const a=gltf.accessors?.[index];
  if(!a) throw new Error('Missing accessor '+index);
  if(a.sparse) throw new Error('Sparse accessors are not supported in v5.31.');
  const bv=gltf.bufferViews?.[a.bufferView];
  if(!bv) throw new Error('Accessor '+index+' has no bufferView.');
  if((bv.buffer??0)!==0) throw new Error('External buffers are not supported in GLB preview.');
  const comps=TYPE_SIZE[a.type];
  const componentBytes=COMPONENT_BYTES[a.componentType];
  if(!comps||!componentBytes) throw new Error('Unsupported accessor layout.');
  const stride=bv.byteStride||componentBytes*comps;
  const start=(bv.byteOffset||0)+(a.byteOffset||0);
  const total=a.count*comps;
  const out=asIndex?new Uint32Array(total):new Float32Array(total);
  const view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
  for(let i=0;i<a.count;i++){
    const base=start+i*stride;
    for(let c=0;c<comps;c++){
      let v=componentReader(view,a.componentType,base+c*componentBytes);
      if(!asIndex && a.normalized) v=normalizeComponent(v,a.componentType);
      out[i*comps+c]=v;
    }
  }
  return {array:out,count:a.count,components:comps,min:a.min||null,max:a.max||null};
}

function mat4Identity(){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
function mat4Multiply(a,b){
  const o=new Float32Array(16);
  for(let c=0;c<4;c++) for(let r=0;r<4;r++){
    o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];
  }
  return o;
}
function mat4Translation(t){ const o=mat4Identity();o[12]=t[0]||0;o[13]=t[1]||0;o[14]=t[2]||0;return o; }
function mat4Scale(s){ const o=mat4Identity();o[0]=s[0]??1;o[5]=s[1]??1;o[10]=s[2]??1;return o; }
function mat4Quat(q){
  const x=q[0]||0,y=q[1]||0,z=q[2]||0,w=q[3]??1;
  const x2=x+x,y2=y+y,z2=z+z;
  const xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  return new Float32Array([
    1-(yy+zz),xy+wz,xz-wy,0,
    xy-wz,1-(xx+zz),yz+wx,0,
    xz+wy,yz-wx,1-(xx+yy),0,
    0,0,0,1
  ]);
}
function nodeMatrix(n){
  if(Array.isArray(n.matrix)&&n.matrix.length===16) return new Float32Array(n.matrix);
  return mat4Multiply(mat4Multiply(mat4Translation(n.translation||[0,0,0]),mat4Quat(n.rotation||[0,0,0,1])),mat4Scale(n.scale||[1,1,1]));
}
function transformPoint(m,x,y,z){
  return [
    m[0]*x+m[4]*y+m[8]*z+m[12],
    m[1]*x+m[5]*y+m[9]*z+m[13],
    m[2]*x+m[6]*y+m[10]*z+m[14],
  ];
}
function vec3Sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function vec3Cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function vec3Dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function vec3Norm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
function mat4LookAt(eye,target,up=[0,1,0]){
  const z=vec3Norm(vec3Sub(eye,target));
  const x=vec3Norm(vec3Cross(up,z));
  const y=vec3Cross(z,x);
  return new Float32Array([
    x[0],y[0],z[0],0,
    x[1],y[1],z[1],0,
    x[2],y[2],z[2],0,
    -vec3Dot(x,eye),-vec3Dot(y,eye),-vec3Dot(z,eye),1
  ]);
}
function mat4Perspective(fovy,aspect,near,far){
  const f=1/Math.tan(fovy/2),nf=1/(near-far);
  return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,(2*far*near)*nf,0]);
}

function compileShader(gl,type,source){
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)||'Shader compile failed');
  return s;
}
function makeProgram(gl){
  const vs=compileShader(gl,gl.VERTEX_SHADER,'#version 300 es\nlayout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUv;uniform mat4 uModel;uniform mat4 uViewProj;out vec3 vNormal;out vec2 vUv;void main(){gl_Position=uViewProj*uModel*vec4(aPosition,1.0);vNormal=normalize(mat3(uModel)*aNormal);vUv=aUv;}');
  const fs=compileShader(gl,gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;in vec3 vNormal;in vec2 vUv;uniform vec4 uBaseColor;uniform sampler2D uBaseTex;uniform bool uUseTex;out vec4 outColor;void main(){vec4 base=uBaseColor;if(uUseTex)base*=texture(uBaseTex,vUv);vec3 n=normalize(vNormal);float d=max(dot(n,normalize(vec3(0.45,0.8,0.35))),0.0);float light=0.28+0.72*d;outColor=vec4(base.rgb*light,base.a);}');
  const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)||'Program link failed');
  return p;
}

async function createTexture(gltf,bin,textureIndex){
  const textureDef=gltf.textures?.[textureIndex];
  const imageDef=gltf.images?.[textureDef?.source];
  if(!imageDef?.bufferView) throw new Error('Only embedded GLB images are supported in v5.31.');
  const bv=gltf.bufferViews?.[imageDef.bufferView];
  if(!bv || (bv.buffer??0)!==0) throw new Error('Texture image uses unsupported external buffer.');
  const start=bv.byteOffset||0;
  const data=bin.slice(start,start+bv.byteLength);
  const blob=new Blob([data],{type:imageDef.mimeType||'application/octet-stream'});
  const bitmap=await createImageBitmap(blob);
  const tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);
  bitmap.close?.();
  return tex;
}

async function buildRenderable(parsed){
  const {json,bin}=parsed;
  const program=makeProgram(gl);
  const renderables=[];
  const warnings=[];
  let drawnPotential=0,skipped=0;
  const materials=new Map();

  async function materialFor(index){
    const key=index??-1;
    if(materials.has(key)) return materials.get(key);
    const def=json.materials?.[index]||{};
    const pbr=def.pbrMetallicRoughness||{};
    const mat={
      factor:new Float32Array(pbr.baseColorFactor||[1,1,1,1]),
      texture:null,
      alphaMode:def.alphaMode||'OPAQUE',
      doubleSided:def.doubleSided===true,
    };
    if(pbr.baseColorTexture?.index!==undefined){
      try{mat.texture=await createTexture(json,bin,pbr.baseColorTexture.index)}
      catch(error){warnings.push('BASE_COLOR_TEXTURE_SKIPPED: '+error.message)}
    }
    if(pbr.metallicFactor!==undefined||pbr.roughnessFactor!==undefined) warnings.push('METALLIC_ROUGHNESS_SIMPLIFIED');
    materials.set(key,mat); return mat;
  }

  const roots=json.scenes?.[json.scene??0]?.nodes || [];
  const rootSet=roots.length?roots:(json.nodes||[]).map((_,i)=>i);

  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  async function visit(index,parent){
    const node=json.nodes?.[index]; if(!node) return;
    const world=mat4Multiply(parent,nodeMatrix(node));
    if(node.mesh!==undefined){
      const mesh=json.meshes?.[node.mesh];
      for(const prim of mesh?.primitives||[]){
        try{
          if((prim.mode??4)!==4) throw new Error('primitive mode is not TRIANGLES');
          if(prim.extensions) throw new Error('primitive extensions require a later renderer lane');
          if(prim.attributes?.POSITION===undefined) throw new Error('POSITION missing');
          const pos=accessorData(json,bin,prim.attributes.POSITION,false);
          const normal=prim.attributes.NORMAL!==undefined?accessorData(json,bin,prim.attributes.NORMAL,false):null;
          const uv=prim.attributes.TEXCOORD_0!==undefined?accessorData(json,bin,prim.attributes.TEXCOORD_0,false):null;
          const indices=prim.indices!==undefined?accessorData(json,bin,prim.indices,true):null;

          const vao=gl.createVertexArray();gl.bindVertexArray(vao);
          const pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,pos.array,gl.STATIC_DRAW);
          gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
          if(normal){
            const nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,normal.array,gl.STATIC_DRAW);
            gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
          }else{
            gl.disableVertexAttribArray(1);gl.vertexAttrib3f(1,0,1,0);warnings.push('NORMAL_MISSING_DEFAULT_UP');
          }
          if(uv){
            const ub=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ub);gl.bufferData(gl.ARRAY_BUFFER,uv.array,gl.STATIC_DRAW);
            gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,2,gl.FLOAT,false,0,0);
          }else{
            gl.disableVertexAttribArray(2);gl.vertexAttrib2f(2,0,0);
          }
          let ib=null;
          if(indices){
            ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices.array,gl.STATIC_DRAW);
          }
          const material=await materialFor(prim.material);
          renderables.push({vao,world,count:indices?indices.count:pos.count,indexed:Boolean(indices),material});
          drawnPotential++;

          for(let i=0;i<pos.array.length;i+=3){
            const p=transformPoint(world,pos.array[i],pos.array[i+1],pos.array[i+2]);
            for(let a=0;a<3;a++){bounds.min[a]=Math.min(bounds.min[a],p[a]);bounds.max[a]=Math.max(bounds.max[a],p[a]);}
          }
        }catch(error){
          skipped++;warnings.push('PRIMITIVE_SKIPPED: '+error.message);
        }
      }
    }
    for(const child of node.children||[]) await visit(child,world);
  }
  for(const root of rootSet) await visit(root,mat4Identity());

  if(!renderables.length) throw new Error('No supported TRIANGLES primitives could be rendered.');
  const center=[(bounds.min[0]+bounds.max[0])/2,(bounds.min[1]+bounds.max[1])/2,(bounds.min[2]+bounds.max[2])/2];
  const radius=Math.max(Math.hypot(bounds.max[0]-center[0],bounds.max[1]-center[1],bounds.max[2]-center[2]),0.01);

  return {program,renderables,warnings,drawnPotential,skipped,bounds,center,radius};
}

function resize(){
  if(!gl) return;
  const dpr=Math.min(devicePixelRatio||1,2);
  const w=Math.max(1,Math.floor(canvas.clientWidth*dpr));
  const h=Math.max(1,Math.floor(canvas.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  gl.viewport(0,0,w,h);
}
function cameraMatrices(){
  const cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch),cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw);
  const eye=[
    camera.target[0]+camera.distance*cp*sy,
    camera.target[1]+camera.distance*sp,
    camera.target[2]+camera.distance*cp*cy,
  ];
  const view=mat4LookAt(eye,camera.target);
  const near=Math.max(camera.radius*0.001,0.001);
  const far=Math.max(camera.radius*50,100);
  const proj=mat4Perspective(Math.PI/4,canvas.width/canvas.height,near,far);
  return mat4Multiply(proj,view);
}
function render(){
  requestAnimationFrame(render);
  if(!gl) return;
  resize();
  gl.clearColor(0.018,0.025,0.045,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(!sceneState) return;
  const vp=cameraMatrices();
  const {program,renderables}=sceneState;
  gl.useProgram(program);
  gl.uniformMatrix4fv(gl.getUniformLocation(program,'uViewProj'),false,vp);
  gl.uniform1i(gl.getUniformLocation(program,'uBaseTex'),0);
  for(const item of renderables){
    gl.bindVertexArray(item.vao);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,'uModel'),false,item.world);
    gl.uniform4fv(gl.getUniformLocation(program,'uBaseColor'),item.material.factor);
    gl.activeTexture(gl.TEXTURE0);
    if(item.material.texture){
      gl.bindTexture(gl.TEXTURE_2D,item.material.texture);
      gl.uniform1i(gl.getUniformLocation(program,'uUseTex'),1);
    }else{
      gl.bindTexture(gl.TEXTURE_2D,null);
      gl.uniform1i(gl.getUniformLocation(program,'uUseTex'),0);
    }
    if(item.indexed) gl.drawElements(gl.TRIANGLES,item.count,gl.UNSIGNED_INT,0);
    else gl.drawArrays(gl.TRIANGLES,0,item.count);
  }
}

function setFacts(entries){
  factsEl.innerHTML='';
  for(const [key,value] of entries){
    const row=document.createElement('div');
    const dt=document.createElement('dt');dt.textContent=key;
    const dd=document.createElement('dd');dd.textContent=String(value);
    row.append(dt,dd);factsEl.append(row);
  }
}

async function loadArrayBuffer(buffer,name){
  setStatus('PARSING '+name);
  currentReceipt=null;receiptBtn.disabled=true;
  try{
    const parsed=parseGlb(buffer);
    const plan=buildGlbPreviewPlan(parsed.inspection);
    if(!plan.eligible) throw new Error('GLB has no mesh content eligible for this preview lane.');
    const built=await buildRenderable(parsed);
    sceneState=built;
    camera.target=[...built.center];
    camera.radius=built.radius;
    camera.distance=Math.max(built.radius*2.8,0.5);
    camera.yaw=0.75;camera.pitch=0.38;

    const runtime={
      status:'RENDERED',
      drawn_primitives:built.drawnPotential,
      skipped_primitives:built.skipped,
      warnings:[...new Set(built.warnings)],
    };
    const preview=buildPreviewReceipt(plan,runtime);
    currentReceipt={
      ...preview,
      generated_at:new Date().toISOString(),
      source_name:name,
      source_bytes:buffer.byteLength,
      structural_summary:parsed.inspection.summary,
      asset_generator:parsed.inspection.asset.generator,
      bounds:{min:built.bounds.min,max:built.bounds.max,center:built.center,radius:built.radius},
      runtime,
    };
    receiptBtn.disabled=false;
    setStatus(preview.status);
    setFacts([
      ['Status',preview.status],
      ['Source',name],
      ['Bytes',buffer.byteLength.toLocaleString()],
      ['Meshes',parsed.inspection.summary.meshes],
      ['Primitives',parsed.inspection.summary.primitives],
      ['Drawn',built.drawnPotential],
      ['Skipped',built.skipped],
      ['Materials',parsed.inspection.summary.materials],
      ['Textures',parsed.inspection.summary.textures],
      ['Animations',parsed.inspection.summary.animations+' (static preview)'],
      ['Skins',parsed.inspection.summary.skins+' (static preview)'],
      ['Generator',parsed.inspection.asset.generator||'not declared'],
      ['Warnings',runtime.warnings.length?runtime.warnings.join(' · '):'none'],
    ]);
  }catch(error){
    sceneState=null;
    setStatus('PREVIEW FAIL');
    setFacts([['Status','PREVIEW FAIL'],['Source',name],['Error',error.message]]);
  }
}

async function loadUrl(){
  const url=urlInput.value.trim();
  if(!url) return;
  try{
    setStatus('FETCHING '+url);
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok) throw new Error('HTTP '+response.status);
    await loadArrayBuffer(await response.arrayBuffer(),url);
  }catch(error){
    setStatus('LOAD FAIL');
    setFacts([['Status','LOAD FAIL'],['URL',url],['Error',error.message]]);
  }
}

function init(){
  gl=canvas.getContext('webgl2',{antialias:true,alpha:false});
  if(!gl){
    setStatus('WEBGL2 UNAVAILABLE');
    setFacts([['Status','WEBGL2 unavailable'],['Requirement','A browser/GPU with WebGL2 support']]);
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  render();

  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:camera.yaw,pitch:camera.pitch};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;
    camera.yaw=drag.yaw+(e.clientX-drag.x)*0.008;
    camera.pitch=clamp(drag.pitch+(e.clientY-drag.y)*0.006,-1.45,1.45);
  });
  canvas.addEventListener('pointerup',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();camera.distance=clamp(camera.distance*Math.exp(e.deltaY*0.001),camera.radius*0.15,camera.radius*30)},{passive:false});
  window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&sceneState){camera.target=[...sceneState.center];camera.distance=Math.max(sceneState.radius*2.8,0.5);camera.yaw=.75;camera.pitch=.38}});

  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];if(file) await loadArrayBuffer(await file.arrayBuffer(),file.name);
  });
  urlLoad.addEventListener('click',loadUrl);
  urlInput.addEventListener('keydown',e=>{if(e.key==='Enter')loadUrl()});
  receiptBtn.addEventListener('click',()=>{
    if(!currentReceipt)return;
    const blob=new Blob([JSON.stringify(currentReceipt,null,2)+'\n'],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(currentReceipt.source_name||'asset').replace(/[^A-Za-z0-9._-]+/g,'-')+'.preview-receipt.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  });

  for(const event of ['dragenter','dragover']) window.addEventListener(event,e=>{e.preventDefault();dropHint.style.display='grid'});
  for(const event of ['dragleave','drop']) window.addEventListener(event,e=>{e.preventDefault();dropHint.style.display='none'});
  window.addEventListener('drop',async e=>{
    const file=[...(e.dataTransfer?.files||[])].find(f=>f.name.toLowerCase().endsWith('.glb'));
    if(file) await loadArrayBuffer(await file.arrayBuffer(),file.name);
  });

  const query=new URLSearchParams(location.search);
  const glb=query.get('glb');
  if(glb){urlInput.value=glb;loadUrl();}
}

init();
