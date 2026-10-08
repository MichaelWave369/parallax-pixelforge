// PixelForge v5.42: immutable export evidence handoff, not a license grant.
// Pure browser-safe functions; no filesystem, fetch, storage or code execution.
export const HANDOFF_SCHEMA='pixelforge.vr-asset-handoff.v1';
const SHA=/^[a-f0-9]{64}$/;
const ID=/^ASSET-[0-9]{6}$/;
const FILE=/^[\w.\- ]{1,120}\.glb$/i;
export const HANDOFF_MAX_BYTES=16384;
const asRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);

export function validateHandoff(value){
  if(!asRecord(value)||value.schema!==HANDOFF_SCHEMA)
    throw Error('Unsupported or malformed PixelForge VR handoff.');
  if(Object.keys(value).some(k=>![
    'schema','record_id','source_record_sha256','file_name','file_bytes',
    'file_sha256','producer','evidence_status','boundary'
  ].includes(k)))throw Error('Unapproved handoff field.');
  if(!ID.test(value.record_id||'')||
     !SHA.test(value.source_record_sha256||'')||
     !FILE.test(value.file_name||'')||
     !Number.isSafeInteger(value.file_bytes)||value.file_bytes<28||value.file_bytes>50000000||
     !SHA.test(value.file_sha256||'')||
     value.producer!=='PIXELFORGE_LOCAL_UNREAL_EXPORT'||
     value.evidence_status!=='EXPORT_HASH_AND_STRUCTURE_CHECKED'||
     typeof value.boundary!=='string'||value.boundary.length<20||value.boundary.length>500)
    throw Error('Handoff identity, bounds, producer or evidence status invalid.');
  return Object.freeze({
    schema:HANDOFF_SCHEMA,
    record_id:value.record_id,
    source_record_sha256:value.source_record_sha256,
    file_name:value.file_name,
    file_bytes:value.file_bytes,
    file_sha256:value.file_sha256,
    producer:value.producer,
    evidence_status:value.evidence_status,
    boundary:value.boundary
  });
}
export function parseHandoff(raw){
  if(typeof raw!=='string'||raw.length>HANDOFF_MAX_BYTES)
    throw Error('Handoff JSON exceeds 16 KB limit.');
  return validateHandoff(JSON.parse(raw));
}
export function assertHandoffForSelection(handoff,assetId,file){
  validateHandoff(handoff);
  if(!ID.test(assetId||'')||handoff.record_id!==assetId)
    throw Error('Handoff record ID does not match selected catalog asset.');
  if(!file||file.name!==handoff.file_name||file.size!==handoff.file_bytes)
    throw Error('GLB filename or byte count differs from local Unreal export evidence.');
}
export function assertHandoffHash(handoff,sha256){
  validateHandoff(handoff);
  if(typeof sha256!=='string'||sha256!==handoff.file_sha256)
    throw Error('GLB SHA-256 differs from the verified local Unreal export.');
  return true;
}
export function createHandoffFromVerifiedExport({job,receipt,verification,inspection}){
  if(!asRecord(job)||!asRecord(receipt)||!verification?.verified||
     !Object.values(verification.checks||{}).length||
     !Object.values(verification.checks||{}).every(Boolean)||
     !inspection?.valid)
    throw Error('Verified local export and valid structural GLB inspection required.');
  if(job.schema!=='pixelforge.unreal-export-job.v2'||
     receipt.schema!=='pixelforge.unreal-export-receipt.v1'||
     receipt.status!=='PASS'||job.record_id!==receipt.record_id||
     job.source_record_sha256!==receipt.source_record_sha256||
     job.requested_interchange_format!=='GLB'||
     receipt.requested_interchange_format!=='GLB'||
     !ID.test(job.record_id||'')||!SHA.test(job.source_record_sha256||''))
    throw Error('Bound job, source identity and GLB receipt do not match.');
  const fullPath=receipt.output?.file_path;
  if(typeof fullPath!=='string')throw Error('No output file declared.');
  const name=fullPath.replace(/\\/g,'/').split('/').at(-1);
  const handoff={
    schema:HANDOFF_SCHEMA,
    record_id:job.record_id,
    source_record_sha256:job.source_record_sha256,
    file_name:name,
    file_bytes:receipt.output?.bytes,
    file_sha256:receipt.output?.sha256,
    producer:'PIXELFORGE_LOCAL_UNREAL_EXPORT',
    evidence_status:'EXPORT_HASH_AND_STRUCTURE_CHECKED',
    boundary:'Integrity evidence from an operator-run local exporter, not a cryptographic signature or proof of source licensing, rendering fidelity, physical VR readiness, or runtime compatibility.'
  };
  return validateHandoff(handoff);
}
