// v5.43: browser-safe, operator-reviewed DRAFT planning only.
// Never authorizes local executor or claims source usage rights.
import {canPlanGlb} from './asset-catalog.js';

export const EXPORT_QUEUE_SCHEMA='pixelforge.unreal-export-queue.v1';
export const EXPORT_QUEUE_MAX=24;
export const EXPORT_QUEUE_BYTES=8192;
const ID=/^ASSET-[0-9]{6}$/;
const fields=['schema','state','target','format','record_ids','authority','boundary'];
const BOUNDARY='Operator-reviewed export planning only. No Unreal execution, content publication, compatibility, licensing or asset-use approval.';

export function validateExportQueue(v) {
  if(!v||typeof v!=='object'||Array.isArray(v)||
     Object.keys(v).length!==fields.length||Object.keys(v).some(k=>!fields.includes(k))||
     v.schema!==EXPORT_QUEUE_SCHEMA||v.state!=='OPERATOR_REVIEWED_DRAFT'||
     v.target!=='NATIVE_3D'||v.format!=='GLB'||
     v.authority!=='PLAN_ONLY_NO_EXECUTION'||v.boundary!==BOUNDARY||
     !Array.isArray(v.record_ids)||!v.record_ids.length||v.record_ids.length>EXPORT_QUEUE_MAX)
    throw Error('Invalid export planning queue format, authority or size.');
  const seen=new Set();
  for(const id of v.record_ids) {
    if(typeof id!=='string'||!ID.test(id)||seen.has(id))
      throw Error('Export queue has an invalid or duplicate asset ID.');
    seen.add(id);
  }
  return v;
}
export function createExportQueue(ids,catalog) {
  if(!Array.isArray(ids)||!Array.isArray(catalog))
    throw Error('A loaded private catalog and reviewed IDs are required.');
  const index=new Map(catalog.map(x=>[x.id,x]));
  for(const id of ids){
    const record=index.get(id);
    if(!record||!canPlanGlb(record))
      throw Error('Not a portable static-3D export candidate: '+String(id));
  }
  return validateExportQueue({
    schema:EXPORT_QUEUE_SCHEMA,
    state:'OPERATOR_REVIEWED_DRAFT',
    target:'NATIVE_3D',format:'GLB',
    record_ids:[...ids],
    authority:'PLAN_ONLY_NO_EXECUTION',
    boundary:BOUNDARY
  });
}
export function parseExportQueue(raw){
  if(typeof raw!=='string'||raw.length>EXPORT_QUEUE_BYTES)
    throw Error('Export planning queue is larger than 8 KB.');
  return validateExportQueue(JSON.parse(raw));
}
export function queueEligibleCount(items){
  return items.filter(canPlanGlb).length;
}
