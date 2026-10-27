/* ΦWAD v0.1: deterministic 2.5D raycaster interchange in ΦPACK ZIP.
 * This module is a content adapter, not a Doom IWAD/PWAD parser or game engine.
 */
import { encodePack, decodePack, hexCRC } from '../phipack/core.js';
export const PHIWAD_PROFILE = 'phi369.raycaster-level.v0.1';
const SCENE_PROFILE = 'pixelforge.runtime-scene.v5.11';
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = Number.isInteger;
const limitedString = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
const heading = { up: -Math.PI/2, right: 0, down: Math.PI/2, left: Math.PI };

export function validateRaycasterLevel(level) {
  const errors = [];
  if (!record(level) || level.format !== PHIWAD_PROFILE) return { ok: false, errors: ['Unknown level format'] };
  const { width: w, height: h } = level;
  if (!integer(w) || !integer(h) || w < 3 || h < 3 || w > 128 || h > 128)
    errors.push('Width and height must be integers from 3 to 128');
  const dimensionsOK = errors.length === 0;
  if (!Array.isArray(level.walls) || !dimensionsOK || level.walls.length !== w*h ||
      level.walls.some(v => v !== 0 && v !== 1))
    errors.push('Walls must be a rectangular 0/1 array');
  if (!limitedString(level.id,80) || !limitedString(level.title,160)) errors.push('Missing level id or title');
  const s = level.spawn;
  if (!record(s) || !Number.isFinite(s.x) || !Number.isFinite(s.y) ||
      !Number.isFinite(s.angle) || !dimensionsOK ||
      s.x < 1 || s.y < 1 || s.x >= w - 1 || s.y >= h - 1 ||
      (Array.isArray(level.walls) && level.walls[Math.floor(s.y)*w+Math.floor(s.x)] !== 0))
    errors.push('Player spawn is outside navigable space');
  if (!Array.isArray(level.exits) || level.exits.length > 64) errors.push('Invalid exit list');
  else for (const exit of level.exits) {
    if (!record(exit) || !limitedString(exit.id,80) || !limitedString(exit.toSceneId,80) ||
        !Number.isFinite(exit.x) || !Number.isFinite(exit.y) || !dimensionsOK ||
        exit.x < 1 || exit.y < 1 || exit.x >= w-1 || exit.y >= h-1 ||
        (Array.isArray(level.walls) && level.walls[Math.floor(exit.y)*w+Math.floor(exit.x)] !== 0))
      errors.push('Invalid exit placement');
  }
  if (dimensionsOK && Array.isArray(level.walls) && level.walls.length === w*h) {
    for (let x=0;x<w;x++) if (level.walls[x] !== 1 || level.walls[(h-1)*w+x] !== 1)
      { errors.push('Map boundary must be sealed'); break; }
    for (let y=0;y<h;y++) if (level.walls[y*w] !== 1 || level.walls[y*w+w-1] !== 1)
      { errors.push('Map boundary must be sealed'); break; }
  }
  return { ok: errors.length === 0, errors };
}
function checked(level) {
  const result = validateRaycasterLevel(level);
  if (!result.ok) throw new Error('Invalid ΦWAD level: ' + result.errors.join('; '));
  return level;
}

/** Convert authored 2D collision geometry into simple sealed raycaster walls.
 * Unsupported gameplay/graphics are reported, never silently claimed playable.
 */
export function convertRuntimeSceneToRaycaster(scene) {
  const map = scene?.map;
  const runtime = scene?.runtime;
  if (scene?.schema !== SCENE_PROFILE || !record(map) || !record(runtime) ||
      !integer(map.width) || !integer(map.height) ||
      map.width < 1 || map.height < 1 || map.width > 126 || map.height > 126)
    throw new Error('Expected bounded PixelForge v5.11 Runtime Composer scene');
  const { width, height } = map;
  const collision = map.layers?.collision;
  if (!Array.isArray(collision) || collision.length !== width*height ||
      collision.some(x => ![0, 1, false, true].includes(x)))
    throw new Error('Invalid authored collision array');
  const player = runtime.player;
  if (!record(player) || !Number.isFinite(player.x) || !Number.isFinite(player.y) ||
      player.x < 0 || player.y < 0 || player.x >= width || player.y >= height ||
      collision[Math.floor(player.y)*width+Math.floor(player.x)])
    throw new Error('Player spawn must be inside an unblocked authored tile');
  const w = width + 2, h = height + 2;
  const walls = Array(w*h).fill(1);
  for (let y=0;y<height;y++) for (let x=0;x<width;x++)
    walls[(y+1)*w+x+1] = Number(Boolean(collision[y*width+x]));
  const exits = [];
  for (const transition of Array.isArray(runtime.transitions) ? runtime.transitions : []) {
    if (transition?.enabled === false) continue;
    if (!record(transition) || !Number.isInteger(transition.x) ||
        !Number.isInteger(transition.y) || transition.x < 0 || transition.y < 0 ||
        transition.x >= width || transition.y >= height ||
        collision[transition.y*width+transition.x] ||
        !limitedString(transition.toSceneId,80) || !limitedString(transition.id,80))
      throw new Error('Transition cannot be mapped to a walkable raycaster exit');
    exits.push({ id: transition.id, x: transition.x+1.5, y: transition.y+1.5,
      toSceneId: transition.toSceneId });
  }
  const result = {
    format: PHIWAD_PROFILE,
    id: String(scene.sceneId || 'scene').slice(0,80),
    title: String(scene.title || scene.sceneId || 'Untitled Level').slice(0,160),
    source: { profile: SCENE_PROFILE, sceneId: String(scene.sceneId || '') },
    width: w, height: h, walls,
    spawn: { x: player.x+1, y: player.y+1,
      angle: heading[player.facing] ?? 0 },
    exits,
    omittedFeatures: [
      'Sprite/tileset art is not transferred as raycaster textures',
      'Quests, audio, narrative logic, enemies and inventory are not converted',
      'Collision tiles become binary walls; this is not a Doom WAD converter'
    ]
  };
  return checked(result);
}
export function buildPhiWad(scene, options = {}) {
  const level = convertRuntimeSceneToRaycaster(scene);
  const entry = 'levels/main.raycaster.json';
  const content = enc.encode(JSON.stringify(level));
  const manifest = {
    format: 'phipack', formatVersion: '0.1.0',
    id: options.id || 'phi369.' + level.id.toLowerCase().replace(/[^a-z0-9_-]/g,'-'),
    title: options.title || level.title,
    kind: 'level', profile: PHIWAD_PROFILE, entry,
    assets: [{ path: entry, mediaType: 'application/json', size: content.length,
      crc32: hexCRC(content) }],
    rights: { license: options.license || 'UNSPECIFIED',
      redistributionAllowed: options.redistributionAllowed === true }
  };
  return encodePack(manifest, { [entry]: content });
}
export function loadPhiWad(bytes) {
  const { manifest, files } = decodePack(bytes);
  if (manifest.kind !== 'level' || manifest.profile !== PHIWAD_PROFILE)
    throw new Error('ΦWAD adapter requires a raycaster-level profile');
  let level;
  try { level = JSON.parse(dec.decode(files[manifest.entry])); }
  catch { throw new Error('Invalid UTF-8 or JSON level data'); }
  return { manifest, level: checked(level) };
}
