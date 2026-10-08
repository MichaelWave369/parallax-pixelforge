// PixelForge VR World v1: portable scene data; no executable code or provider authority.
import {DEFAULT_LIGHTING,resolvedLighting,validateLighting,lightingWithPatch} from './world-lighting.js';
export const FORMAT = 'pixelforge.vr-world.v1';
export const KINDS = Object.freeze(['floor', 'block', 'pillar', 'portal', 'asset-proxy']);
export const MAX_OBJECTS = 128;

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = n => typeof n === 'number' && Number.isFinite(n);
const vec3 = (v, min, max) =>
  Array.isArray(v) && v.length === 3 && v.every(n => finite(n) && n >= min && n <= max);

export function newWorld() {
  return {
    format: FORMAT,
    title: 'Untitled VR World',
    next_id: 4,
    lighting: {...DEFAULT_LIGHTING},
    objects: [
      {id:'obj-1',name:'Ground',kind:'floor',position:[0,-0.15,-4],scale:[12,0.3,12],yaw:0,color:'#263b53',asset:null},
      {id:'obj-2',name:'Welcome Pillar',kind:'pillar',position:[-2,1,-4],scale:[0.7,2,0.7],yaw:0,color:'#f4a65d',asset:null},
      {id:'obj-3',name:'Portal Marker',kind:'portal',position:[2,1.4,-5],scale:[2,2.8,0.35],yaw:0,color:'#61e8d4',asset:null}
    ],
    runtime: {authority:'OPERATOR_ONLY',physics:'UNSUPPORTED',multiplayer:'UNSUPPORTED'}
  };
}

function checkObject(o) {
  if (!plain(o)) throw new Error('Scene object must be a record.');
  if (!/^obj-[1-9][0-9]{0,8}$/.test(o.id ?? '')) throw new Error('Invalid object ID.');
  if (typeof o.name !== 'string' || !o.name.trim() || o.name.length > 80) throw new Error('Invalid object name.');
  if (!KINDS.includes(o.kind)) throw new Error('Unsupported object kind.');
  if (!vec3(o.position, -100, 100)) throw new Error('Invalid object position.');
  if (!vec3(o.scale, 0.05, 50)) throw new Error('Invalid object scale.');
  if (!finite(o.yaw) || o.yaw < -360 || o.yaw > 360) throw new Error('Invalid object yaw.');
  if (typeof o.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(o.color)) throw new Error('Invalid object color.');
  if (o.asset !== null) {
    if (o.kind !== 'asset-proxy' || !plain(o.asset)) throw new Error('Only asset proxies may bind an asset.');
    if (!/^ASSET-[0-9]{6}$/.test(o.asset.asset_id)) throw new Error('Invalid governed asset ID.');
    if (typeof o.asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(o.asset.sha256)) throw new Error('Invalid asset SHA-256.');
    if (typeof o.asset.source_name !== 'string' || !/^[\w.\- ]{1,120}\.glb$/i.test(o.asset.source_name))
      throw new Error('Invalid source GLB filename.');
    if (!Number.isSafeInteger(o.asset.byte_length) || o.asset.byte_length < 20 || o.asset.byte_length > 250000000)
      throw new Error('Invalid source GLB size.');
  } else if (o.kind === 'asset-proxy') {
    throw new Error('Asset proxy requires a bound asset passport.');
  }
}

export function validateWorld(world) {
  if (!plain(world) || world.format !== FORMAT) throw new Error('Unsupported VR world format.');
  if (typeof world.title !== 'string' || !world.title.trim() || world.title.length > 100)
    throw new Error('Invalid world title.');
  if (!Number.isSafeInteger(world.next_id) || world.next_id < 1 || world.next_id > 1000000000)
    throw new Error('Invalid next_id.');
  if (!Array.isArray(world.objects) || world.objects.length > MAX_OBJECTS) throw new Error('World object limit exceeded.');
  // Pre-v5.40 scenes omit lighting. Accept them and apply defaults only in the viewer;
  // save/import never gains permissions or silently rewrites old source files.
  if (world.lighting !== undefined) validateLighting(world.lighting);
  const ids = new Set();
  let highest = 0;
  for (const o of world.objects) {
    checkObject(o);
    if (ids.has(o.id)) throw new Error('Duplicate object ID.');
    ids.add(o.id);
    highest = Math.max(highest, Number(o.id.slice(4)));
  }
  if (world.next_id <= highest) throw new Error('next_id must exceed all object IDs.');
  if (!plain(world.runtime) || world.runtime.authority !== 'OPERATOR_ONLY' ||
      world.runtime.physics !== 'UNSUPPORTED' || world.runtime.multiplayer !== 'UNSUPPORTED')
    throw new Error('Unqualified runtime capability claim.');
  return world;
}

export function parseWorld(raw) {
  if (typeof raw !== 'string' || raw.length > 200000) throw new Error('Scene file too large.');
  const value = JSON.parse(raw);
  return structuredClone(validateWorld(value));
}

export function addObject(world, kind = 'block', asset = null) {
  validateWorld(world);
  if (world.objects.length >= MAX_OBJECTS) throw new Error('Reached 128-object preview limit.');
  if (!KINDS.includes(kind) || (kind === 'asset-proxy') !== Boolean(asset))
    throw new Error('Unsupported object/asset combination.');
  const id = 'obj-' + world.next_id;
  const obj = {
    id, name:kind === 'asset-proxy' ? asset.source_name : kind[0].toUpperCase()+kind.slice(1)+' '+world.next_id,
    kind, position:[0,kind === 'floor' ? -0.1 : 1,-4], scale:kind === 'floor' ? [4,0.2,4] : [1,2,1],
    yaw:0, color:kind === 'asset-proxy' ? '#bda5f9' : '#67cfe3', asset
  };
  const next = {...world, next_id:world.next_id + 1, objects:[...world.objects,obj]};
  return validateWorld(next);
}

export function editObject(world, id, patch) {
  validateWorld(world);
  if (!plain(patch) || Object.keys(patch).some(k => !['name','position','scale','yaw','color'].includes(k)))
    throw new Error('Only approved transforms and presentation fields are editable.');
  if (!world.objects.some(o => o.id === id)) throw new Error('Object not found.');
  const next = {...world, objects:world.objects.map(o => o.id === id ? {...o,...patch} : o)};
  return validateWorld(next);
}

export function removeObject(world, id) {
  validateWorld(world);
  if (!world.objects.some(o => o.id === id)) throw new Error('Object not found.');
  return validateWorld({...world, objects:world.objects.filter(o=>o.id !== id)});
}

export function renameWorld(world, title) {
  return validateWorld({...world, title});
}

// Operator-only environment changes: no scripting, remote fetches or runtime power.
export function editWorldLighting(world,patch){
  validateWorld(world);
  return validateWorld({...world,lighting:lightingWithPatch(resolvedLighting(world),patch)});
}
export function replaceWorldLighting(world,preset){
  validateWorld(world);
  return validateWorld({...world,lighting:{...validateLighting(preset)}});
}
