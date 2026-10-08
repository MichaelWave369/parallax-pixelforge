// Conservative GLB 2.0 decoder for bounded, static, desktop/WebXR mesh previews.
// No network requests, extensions, scripts, animation, physics or compatibility grants.
export const MAX_GLB_BYTES = 50_000_000;
export const MAX_PREVIEW_VERTICES = 150_000;
const MAGIC=0x46546c67, JSON_CHUNK=0x4e4f534a, BIN_CHUNK=0x004e4942;
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const numeric=(n)=>typeof n==='number'&&Number.isFinite(n);
function requireVec(v,n,label) {
  if(!Array.isArray(v)||v.length!==n||!v.every(numeric))throw Error('Invalid '+label);
  return v;
}
function multiply(a,b) {
  const o=Array(16).fill(0);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)
    for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];
  return o;
}
function nodeMatrix(n) {
  if(n.matrix!==undefined)return requireVec(n.matrix,16,'node matrix');
  const t=requireVec(n.translation??[0,0,0],3,'node translation');
  const s=requireVec(n.scale??[1,1,1],3,'node scale');
  const q=requireVec(n.rotation??[0,0,0,1],4,'node rotation');
  const [x,y,z,w]=q;
  const norm=Math.hypot(x,y,z,w);
  if(norm<1e-10)throw Error('Zero-length node quaternion');
  const [a,b,c,d]=q.map(v=>v/norm);
  return [
    (1-2*(b*b+c*c))*s[0],(2*(a*b+c*d))*s[0],(2*(a*c-b*d))*s[0],0,
    (2*(a*b-c*d))*s[1],(1-2*(a*a+c*c))*s[1],(2*(b*c+a*d))*s[1],0,
    (2*(a*c+b*d))*s[2],(2*(b*c-a*d))*s[2],(1-2*(a*a+b*b))*s[2],0,
    t[0],t[1],t[2],1
  ];
}
function point(m,x,y,z){
  return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
}
function finiteVector(v){return v.every(numeric);}
function extract(buffer) {
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<28||buffer.byteLength>MAX_GLB_BYTES)
    throw Error('GLB file is outside bounded preview size (28 bytes to 50 MB).');
  const dv=new DataView(buffer);
  if(dv.getUint32(0,true)!==MAGIC||dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==buffer.byteLength)
    throw Error('Invalid GLB 2.0 container.');
  let json=null,bin=null,p=12;
  while(p<buffer.byteLength) {
    if(p+8>buffer.byteLength)throw Error('Truncated GLB chunk.');
    const len=dv.getUint32(p,true),type=dv.getUint32(p+4,true);
    if(len%4!==0||p+8+len>buffer.byteLength)throw Error('Invalid GLB chunk length.');
    if(type===JSON_CHUNK) {
      if(json!==null)throw Error('Duplicate GLB JSON chunk.');
      json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,p+8,len)).trim());
    } else if(type===BIN_CHUNK) {
      if(bin!==null)throw Error('Multiple GLB binary chunks.');
      bin=new DataView(buffer,p+8,len);
    }
    p+=8+len;
  }
  if(!json||!bin||json.asset?.version!=='2.0')throw Error('Missing GLB 2.0 JSON/binary payload.');
  if((json.extensionsRequired||[]).length)throw Error('Required glTF extensions are unsupported in this renderer.');
  if(!Array.isArray(json.buffers)||json.buffers.length!==1||json.buffers[0].uri)
    throw Error('Only self-contained GLB buffer data is supported.');
  if(!Number.isSafeInteger(json.buffers[0].byteLength)||json.buffers[0].byteLength>bin.byteLength)
    throw Error('GLB buffer size does not match BIN chunk.');
  if((json.animations||[]).length||(json.skins||[]).length)
    throw Error('Animated/skinned GLB is not supported in static world preview.');
  return {json,bin};
}
function accessor(json,bin,index,kind) {
  const a=json.accessors?.[index];
  if(!a||a.sparse||!Number.isSafeInteger(a.count)||a.count<1||a.count>MAX_PREVIEW_VERTICES)
    throw Error('Unsupported or unsafe glTF accessor.');
  const isPos=kind==='position';
  if(a.type!==(isPos?'VEC3':'SCALAR')||!([5121,5123,5125].includes(a.componentType)||isPos&&a.componentType===5126))
    throw Error('Unsupported accessor type.');
  if(isPos&&a.componentType!==5126)throw Error('POSITION must use FLOAT.');
  const size={5121:1,5123:2,5125:4,5126:4}[a.componentType];
  const components=isPos?3:1,byteWidth=size*components;
  const bv=json.bufferViews?.[a.bufferView];
  if(!bv||!Number.isSafeInteger(bv.byteLength)||bv.byteLength<0||bv.buffer!==0&&bv.buffer!==undefined)
    throw Error('Missing or external GLB buffer view.');
  const startView=bv.byteOffset??0,within=a.byteOffset??0;
  const stride=bv.byteStride??byteWidth;
  if(![startView,within,stride].every(Number.isSafeInteger)||Math.min(startView,within)<0||
     stride<byteWidth||stride>255||within+(a.count-1)*stride+byteWidth>bv.byteLength||
     startView+bv.byteLength>bin.byteLength)
    throw Error('GLB accessor exceeds binary buffer bounds.');
  if(((startView+within)%size)!==0)throw Error('Misaligned accessor.');
  const result=new Array(a.count*components);
  for(let i=0;i<a.count;i++)for(let c=0;c<components;c++){
    const offset=startView+within+i*stride+c*size;
    const value= a.componentType===5126?bin.getFloat32(offset,true):
      a.componentType===5125?bin.getUint32(offset,true):
      a.componentType===5123?bin.getUint16(offset,true):bin.getUint8(offset);
    if(!numeric(value))throw Error('Non-finite mesh coordinate.');
    result[i*components+c]=value;
  }
  return {values:result,count:a.count};
}
const norm=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)};
export function decodeGlbMesh(buffer) {
  const {json,bin}=extract(buffer);
  const roots=json.scenes?.[json.scene??0]?.nodes;
  if(!Array.isArray(roots)||!roots.length||!Array.isArray(json.nodes))
    throw Error('A glTF scene with node roots is required.');
  if(json.nodes.length>256)throw Error('Too many GLB nodes for world preview.');
  const materials=json.materials||[];
  const warnings=new Set();
  const meshes=[];
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  let count=0,nodesVisited=0;
  const visit=(idx,parent,stack)=>{
    if(!Number.isSafeInteger(idx)||idx<0||idx>=json.nodes.length||stack.has(idx))
      throw Error('Invalid or cyclic scene graph.');
    if(++nodesVisited>256)throw Error('GLB graph too complex.');
    const node=json.nodes[idx],model=multiply(parent,nodeMatrix(node));
    if(node.skin!==undefined||node.weights)throw Error('Skinned or morphed nodes unsupported.');
    if(node.mesh!==undefined) {
      const mesh=json.meshes?.[node.mesh];
      if(!mesh||!Array.isArray(mesh.primitives))throw Error('Invalid mesh reference.');
      for(const primitive of mesh.primitives) {
        if((primitive.mode??4)!==4||primitive.extensions||primitive.targets)
          throw Error('Only uncompressed static TRIANGLES primitives are supported.');
        if(primitive.attributes?.POSITION===undefined)throw Error('Missing POSITION accessor.');
        const positions=accessor(json,bin,primitive.attributes.POSITION,'position');
        const indices=primitive.indices===undefined
          ? Array.from({length:positions.count},(_,i)=>i)
          : accessor(json,bin,primitive.indices,'index').values;
        if(indices.length%3)throw Error('Triangle index count must be divisible by three.');
        if(count+indices.length>MAX_PREVIEW_VERTICES)throw Error('GLB preview vertex budget exceeded.');
        let color=[0.7,0.85,0.88];
        if(primitive.material!==undefined) {
          const mat=materials[primitive.material];
          if(!mat)throw Error('Missing material.');
          const pbr=mat.pbrMetallicRoughness||{};
          if(pbr.baseColorFactor){
            const factor=requireVec(pbr.baseColorFactor,4,'base color factor');
            if(factor.some(x=>x<0||x>1))throw Error('Base color factor out of range.');
            color=factor.slice(0,3);
          }
          if(pbr.baseColorTexture||mat.normalTexture||mat.occlusionTexture||mat.emissiveTexture)
            warnings.add('TEXTURES_NOT_RENDERED_BASE_COLOR_ONLY');
          if(mat.alphaMode&&mat.alphaMode!=='OPAQUE')warnings.add('ALPHA_MODE_NOT_RENDERED');
        }
        const triangles=new Float32Array(indices.length*6);
        for(let i=0;i<indices.length;i+=3) {
          const points=[];
          for(let j=0;j<3;j++){
            const k=indices[i+j];
            if(!Number.isSafeInteger(k)||k<0||k>=positions.count)throw Error('Triangle index out of bounds.');
            const p=point(model,...positions.values.slice(k*3,k*3+3));
            if(!finiteVector(p))throw Error('Non-finite transformed point.');
            points.push(p);
            for(let a=0;a<3;a++) {
              bounds.min[a]=Math.min(bounds.min[a],p[a]);
              bounds.max[a]=Math.max(bounds.max[a],p[a]);
            }
          }
          const a=points[0],b=points[1],c=points[2];
          const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
          const v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
          const normal=norm([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]);
          for(let j=0;j<3;j++)triangles.set([...points[j],...normal],(i+j)*6);
        }
        meshes.push({vertices:triangles,color});
        count+=indices.length;
        if(meshes.length>128)throw Error('Too many mesh primitives.');
      }
    }
    const next=new Set(stack);next.add(idx);
    for(const child of node.children||[])visit(child,model,next);
  };
  for(const root of roots)visit(root,identity(),new Set());
  if(!meshes.length||!count)throw Error('No supported GLB mesh primitives to draw.');
  if((json.extensionsUsed||[]).length)warnings.add('OPTIONAL_EXTENSIONS_NOT_APPLIED');
  return {meshes,vertexCount:count,meshCount:meshes.length,bounds,warnings:[...warnings],
    status:'STATIC_GEOMETRY_PREVIEW_ONLY'};
}
