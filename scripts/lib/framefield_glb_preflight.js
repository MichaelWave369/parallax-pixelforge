// Read-only PixelForge -> Framefield GLB profile preflight.
// An advisory compatibility estimate only. Framefield's own importer is authoritative.
// No filesystem/network access, rights approval, GLB transformations, or asset writes.
import {createHash} from 'node:crypto';
import {inspectGlbBuffer} from './glb_inspector.js';

export const FRAMEFIELD_PROFILE={
  source:'MichaelWave369/FramefieldStudio',
  version:'static-glb-v0.3',
  reviewed_commit:'54be5e82019fc4943021899dcc2e611d0b7b6682',
  max_bytes:16*1024*1024,
  max_vertices:800,
  max_triangles:1200,
  bpc_coordinate_limit:30
};

const COMPONENT_BYTES={5121:1,5123:2,5125:4,5126:4};
const COMPONENT_READ={5121:(d,o)=>d.getUint8(o),5123:(d,o)=>d.getUint16(o,true),
  5125:(d,o)=>d.getUint32(o,true),5126:(d,o)=>d.getFloat32(o,true)};
const TYPE_WIDTH={SCALAR:1,VEC3:3};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const faceArea=(a,b,c)=>{
  const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
  return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);
};

export function preflightFramefieldGlb(input){
  if(!Buffer.isBuffer(input))throw Error('Preflight expects an in-memory GLB Buffer.');
  const blockers=[],warnings=[],bpcBlockers=[];
  const fail=(code,message,action)=>{
    if(blockers.length<24)blockers.push({code,message,action});
  };
  const warn=(code,message)=>{if(warnings.length<24)warnings.push({code,message});};
  const source={bytes:input.length,sha256:createHash('sha256').update(input).digest('hex')};
  const base={schema:'pixelforge.framefield-glb-preflight.v1',profile:FRAMEFIELD_PROFILE,
    source,summary:null,blockers,warnings,bpc_blockers:bpcBlockers,
    rights:'NOT_EVALUATED',physical_windows_export:'NOT_TESTED',
    physical_quest_3:'NOT_TESTED',
    boundary:'Advisory static mesh profile only: not a Framefield runtime import, BPC/Domistika launch, material fidelity pass, rights clearance, or physical-device qualification.'};
  const finish=()=>{
    const candidate=blockers.length===0;
    if(!candidate && bpcBlockers.length===0)bpcBlockers.push({
      code:'UPSTREAM_FRAMEFIELD_BLOCKED',message:'Framefield static geometry gate is blocked.'
    });
    return {...base,status:candidate?'FRAMEFIELD_STATIC_IMPORT_CANDIDATE':'FRAMEFIELD_IMPORT_BLOCKED',
      framefield_candidate:candidate,bpc_xr_candidate:candidate&&bpcBlockers.length===0};
  };
  if(input.length<20||input.length>FRAMEFIELD_PROFILE.max_bytes){
    fail('FILE_SIZE','GLB must be between 20 bytes and 16 MiB.',
      'Export or select a smaller static GLB; no automatic simplification.');
    return finish();
  }
  let report;
  try{report=inspectGlbBuffer(input);}
  catch(error){
    fail('INVALID_GLB',String(error.message).slice(0,240),
      'Repair or re-export the GLB container.');
    return finish();
  }
  const doc=report.json;
  base.summary=report.summary;
  const chunks=report.container.chunks;
  if(chunks.length!==2||chunks[0].type!=='JSON'||chunks[1].type!=='BIN'||
    chunks.some(c=>c.length%4!==0)){
    fail('CHUNK_LAYOUT','Framefield requires one aligned JSON chunk followed by one BIN chunk.',
      'Re-export a standard embedded-binary GLB.');
    return finish();
  }
  const start=12+8+chunks[0].length+8;
  const binary=input.subarray(start,start+chunks[1].length);
  if(!Array.isArray(doc.buffers)||doc.buffers.length!==1||
    doc.buffers[0]?.uri!==undefined||!integer(doc.buffers[0]?.byteLength)||
    doc.buffers[0].byteLength>binary.length){
    fail('BUFFER_LAYOUT','Requires exactly one embedded buffer with valid byte length.',
      'Export an embedded single-buffer GLB.');
    return finish();
  }
  if(doc.extensionsRequired?.length){
    fail('REQUIRED_EXTENSIONS','Framefield does not implement required glTF extensions.',
      'Export uncompressed standard triangle geometry without required extensions.');
  }
  if(doc.animations?.length||doc.skins?.length||
    doc.nodes?.some(n=>n?.skin!==undefined)){
    fail('RIGGING_ANIMATION','GLB rigging and authored animations are not supported.',
      'Export one static mesh and animate object transforms inside Framefield.');
  }
  if(doc.nodes!==undefined&&!Array.isArray(doc.nodes)){
    fail('NODE_LAYOUT','Malformed node collection.','Repair glTF scene metadata.');
  }else if(doc.nodes?.some(n=>!n||typeof n!=='object'||Array.isArray(n)||
    ['matrix','translation','rotation','scale'].some(k=>n[k]!==undefined))){
    fail('NODE_TRANSFORMS','Framefield rejects authored glTF node transforms.',
      'Bake transforms to the mesh before exporting; preserve winding and orientation.');
  }
  if(Array.isArray(doc.nodes)&&doc.nodes.length>1)
    warn('SCENE_GRAPH_LOST','Framefield imports one mesh surface, not the original node hierarchy.');
  if(report.summary.textures||report.summary.images)
    warn('TEXTURES_NOT_PRESERVED','Embedded/external images, UV mapping, and PBR textures are not imported or fetched.');
  if(report.summary.materials)
    warn('FLAT_MATERIAL_ONLY','Only the selected primitive baseColorFactor becomes one approximate flat color.');
  if(!Array.isArray(doc.meshes)||doc.meshes.length!==1||
    !Array.isArray(doc.meshes[0]?.primitives)||doc.meshes[0].primitives.length!==1){
    fail('MESH_COUNT','Framefield currently imports exactly one mesh and one triangle primitive.',
      'Export one static mesh/primitive or produce a separate simplified derivative.');
    return finish();
  }
  const primitive=doc.meshes[0].primitives[0];
  if(!primitive||typeof primitive!=='object'){
    fail('PRIMITIVE','Invalid mesh primitive.','Re-export a valid static triangle primitive.');
    return finish();
  }
  if(primitive.mode!==undefined&&primitive.mode!==4){
    fail('PRIMITIVE_MODE','Only TRIANGLES primitive mode (4) is supported.',
      'Triangulate geometry before export.');
  }
  if(primitive.targets){
    fail('MORPH_TARGETS','Morph targets cannot be imported.','Bake a single static target to mesh.');
  }
  if(primitive.material!==undefined){
    const index=primitive.material,mat=doc.materials?.[index];
    if(!integer(index)||!mat||typeof mat!=='object'||Array.isArray(mat)){
      fail('MATERIAL_REFERENCE','Material reference is missing or invalid.','Repair material index in the GLB.');
    }else{
      const pbr=mat.pbrMetallicRoughness,factor=pbr?.baseColorFactor??[1,1,1,1];
      if((pbr!==undefined&&(!pbr||typeof pbr!=='object'||Array.isArray(pbr)))||
        !Array.isArray(factor)||factor.length!==4||
        factor.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)){
        fail('MATERIAL_COLOR','Invalid baseColorFactor for flat preview.',
          'Export a bounded RGBA baseColorFactor in [0,1].');
      }
      if(mat.alphaMode&&mat.alphaMode!=='OPAQUE')
        warn('ALPHA_LOST','Transparency is not preserved.');
    }
  }
  const access=(index,type,components,label)=>{
    const a=doc.accessors?.[index];
    if(!integer(index)||!a||a.type!==type||!components.includes(a.componentType)||
      !integer(a.count)||a.count<1||a.sparse||a.normalized||!integer(a.bufferView)){
      fail(label+'_ACCESSOR','Unsupported '+label.toLowerCase()+' accessor.',
        'Use tightly packed non-sparse accessors with supported component types.');
      return null;
    }
    const view=doc.bufferViews?.[a.bufferView];
    if(!view||view.buffer!==0||view.byteStride!==undefined||
      !integer(view.byteOffset??0)||!integer(view.byteLength)||
      !integer(a.byteOffset??0)){
      fail(label+'_VIEW','Unsupported '+label.toLowerCase()+' bufferView.',
        'Use a tightly packed, non-interleaved bufferView.');
      return null;
    }
    const itemBytes=COMPONENT_BYTES[a.componentType],width=TYPE_WIDTH[type];
    const begin=(view.byteOffset??0)+(a.byteOffset??0);
    const length=a.count*width*itemBytes,viewEnd=(view.byteOffset??0)+view.byteLength;
    if(!integer(begin)||!integer(length)||begin%itemBytes!==0||
      begin+length>viewEnd||viewEnd>binary.length){
      fail(label+'_RANGE','Invalid or out-of-bounds '+label.toLowerCase()+' buffer range.',
        'Correct accessor and bufferView bounds.');
      return null;
    }
    const dv=new DataView(binary.buffer,binary.byteOffset+begin,length);
    const values=[];
    for(let i=0;i<a.count;i++){
      const item=[];
      for(let k=0;k<width;k++){
        const value=COMPONENT_READ[a.componentType](dv,(i*width+k)*itemBytes);
        if(!Number.isFinite(value)){
          fail(label+'_NONFINITE','Geometry contains a nonfinite component.',
            'Repair NaN/Infinity geometry before export.');
          return null;
        }
        item.push(value);
      }
      values.push(width===1?item[0]:item);
    }
    return values;
  };
  const positions=access(primitive.attributes?.POSITION,'VEC3',[5126],'POSITION');
  if(positions&&positions.length>FRAMEFIELD_PROFILE.max_vertices)
    fail('VERTEX_BUDGET','More than 800 source vertices.',
      'Create a locally reviewed mesh simplification or select a smaller source asset.');
  if(positions?.some(v=>v.some(c=>Math.abs(c)>10000)))
    fail('POSITION_RANGE','Vertex coordinates exceed Framefield editable mesh range.',
      'Bake scale/normalize positions to within +/-10000.');
  if(positions?.some(v=>v.some(c=>Math.abs(c)>FRAMEFIELD_PROFILE.bpc_coordinate_limit)))
    bpcBlockers.push({code:'BPC_COORD_LIMIT',
      message:'BPC XR export requires coordinates within +/-30 source-native units.'});
  const indices=primitive.indices===undefined?positions?.map((_,i)=>i):
    access(primitive.indices,'SCALAR',[5121,5123,5125],'INDICES');
  if(indices){
    if(indices.length%3!==0||indices.length/3>FRAMEFIELD_PROFILE.max_triangles)
      fail('TRIANGLE_BUDGET','Triangle count must be divisible by three and at most 1200.',
        'Triangulate and simplify the mesh before export.');
    if(positions&&indices.some(n=>!Number.isInteger(n)||n<0||n>=positions.length))
      fail('INDEX_BOUNDS','Triangle indices are outside vertex bounds.',
        'Repair the mesh index buffer.');
    if(positions&&indices.length%3===0){
      for(let i=0;i<indices.length;i+=3){
        const tri=indices.slice(i,i+3);
        if(tri.some(n=>n<0||n>=positions.length))break;
        if(new Set(tri).size!==3||faceArea(...tri.map(n=>positions[n]))<1e-8){
          fail('DEGENERATE_TRIANGLE','Triangle '+(i/3)+' has duplicate or zero-area vertices.',
            'Remove degenerate faces and re-export.');
          break;
        }
      }
    }
  }
  return finish();
}
