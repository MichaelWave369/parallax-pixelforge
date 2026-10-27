/* ΦPACK v0.1: portable data, no scripts or engine authority. Browser/Node compatible. */
export const PHIPACK_VERSION = '0.1.0';
export const MAX_PACK_BYTES = 16 * 1024 * 1024;
const MAX_FILES = 128;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
function safePath(path) {
  if (typeof path !== 'string' || !path || path.length > 240 ||
      path.startsWith('/') || path.includes('\\') || path.includes(':') ||
      !/^[a-zA-Z0-9._/-]+$/.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..'))
    throw new Error('Unsafe ΦPACK path: ' + String(path));
  return path;
}
function bytesOnly(data) {
  if (!(data instanceof Uint8Array)) throw new TypeError('Expected Uint8Array');
  return data;
}
function crc32(data) {
  let c = 0xffffffff;
  for (const byte of data) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
export const hexCRC = data => crc32(data).toString(16).padStart(8, '0');
const u16 = (dv, at, n) => dv.setUint16(at, n, true);
const u32 = (dv, at, n) => dv.setUint32(at, n >>> 0, true);
function concat(chunks) {
  const total = chunks.reduce((n, b) => n + b.length, 0);
  if (total > MAX_PACK_BYTES) throw new Error('ΦPACK size limit exceeded');
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out;
}
export function validateManifest(m) {
  const errors = [];
  if (!object(m)) return { ok: false, errors: ['Manifest must be an object'] };
  if (m.format !== 'phipack' || m.formatVersion !== PHIPACK_VERSION) errors.push('Unsupported format or version');
  if (typeof m.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,79}$/i.test(m.id)) errors.push('Invalid package id');
  if (typeof m.title !== 'string' || !m.title.trim() || m.title.length > 160) errors.push('Invalid title');
  if (!((m.kind === 'scene' && m.profile === 'pixelforge.runtime-scene.v5.11') ||
        (m.kind === 'level' && m.profile === 'phi369.raycaster-level.v0.1')))
    errors.push('Unsupported kind/profile combination');
  try { safePath(m.entry); } catch { errors.push('Invalid entry path'); }
  if (!Array.isArray(m.assets) || !m.assets.length || m.assets.length >= MAX_FILES) {
    errors.push('Invalid assets array');
  } else {
    const paths = new Set();
    for (const asset of m.assets) {
      if (!object(asset)) { errors.push('Invalid asset'); continue; }
      try { safePath(asset.path); } catch { errors.push('Invalid asset path'); continue; }
      if (paths.has(asset.path) || asset.path === 'manifest.json') errors.push('Duplicate or reserved path');
      paths.add(asset.path);
      if (!Number.isSafeInteger(asset.size) || asset.size < 0 || asset.size > MAX_FILE_BYTES) errors.push('Invalid asset size');
      if (typeof asset.crc32 !== 'string' || !/^[a-f0-9]{8}$/.test(asset.crc32)) errors.push('Invalid asset CRC');
      if (typeof asset.mediaType !== 'string' || !asset.mediaType.includes('/') || asset.mediaType.length > 100)
        errors.push('Invalid mediaType');
    }
    if (!paths.has(m.entry)) errors.push('Missing declared entry');
  }
  if (!object(m.rights) || typeof m.rights.license !== 'string' || !m.rights.license.trim() ||
      typeof m.rights.redistributionAllowed !== 'boolean') errors.push('Missing rights declaration');
  return { ok: errors.length === 0, errors };
}
function verifyManifest(m) {
  const result = validateManifest(m);
  if (!result.ok) throw new Error('Invalid ΦPACK manifest: ' + result.errors.join('; '));
  return m;
}
/** Deterministic ZIP STORE writer, including local headers, central directory and CRC32. */
export function encodePack(manifest, files) {
  verifyManifest(manifest);
  if (!object(files)) throw new TypeError('Files must be a path-to-Uint8Array object');
  const expected = new Set(manifest.assets.map(a => a.path));
  if (Object.keys(files).length !== expected.size || Object.keys(files).some(p => !expected.has(p)))
    throw new Error('Undeclared or missing asset');
  for (const a of manifest.assets) {
    const data = bytesOnly(files[a.path]);
    if (data.length !== a.size || hexCRC(data) !== a.crc32) throw new Error('Asset checksum or length mismatch: ' + a.path);
  }
  const entries = [['manifest.json', encoder.encode(JSON.stringify(manifest, null, 2) + '\n')],
    ...Object.entries(files)].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  if (entries.length > MAX_FILES) throw new Error('Too many files');
  const chunks = [], directory = [];
  let cursor = 0;
  for (const [name, data] of entries) {
    safePath(name);
    bytesOnly(data);
    if (data.length > MAX_FILE_BYTES) throw new Error('Entry too large');
    const filename = encoder.encode(name);
    const crc = crc32(data);
    const header = new Uint8Array(30 + filename.length), h = view(header);
    u32(h, 0, 0x04034b50); u16(h, 4, 20); u16(h, 6, 0x0800); u16(h, 8, 0);
    u32(h, 14, crc); u32(h, 18, data.length); u32(h, 22, data.length);
    u16(h, 26, filename.length); header.set(filename, 30);
    chunks.push(header, data);
    const central = new Uint8Array(46 + filename.length), c = view(central);
    u32(c, 0, 0x02014b50); u16(c, 4, 20); u16(c, 6, 20); u16(c, 8, 0x0800); u16(c, 10, 0);
    u32(c, 16, crc); u32(c, 20, data.length); u32(c, 24, data.length);
    u16(c, 28, filename.length); u32(c, 42, cursor); central.set(filename, 46);
    directory.push(central);
    cursor += header.length + data.length;
  }
  const directorySize = directory.reduce((n, c) => n + c.length, 0);
  const footer = new Uint8Array(22), f = view(footer);
  u32(f, 0, 0x06054b50);
  u16(f, 8, entries.length); u16(f, 10, entries.length);
  u32(f, 12, directorySize); u32(f, 16, cursor);
  return concat([...chunks, ...directory, footer]);
}
/** Strict, bounded ZIP STORE reader. No extraction, execution, compression or unsafe paths. */
export function decodePack(input) {
  const data = bytesOnly(input);
  if (data.length < 22 || data.length > MAX_PACK_BYTES) throw new Error('Invalid archive size');
  const dv = view(data), end = data.length - 22;
  if (dv.getUint32(end, true) !== 0x06054b50 ||
      dv.getUint16(end + 4, true) !== 0 || dv.getUint16(end + 6, true) !== 0 ||
      dv.getUint16(end + 20, true) !== 0) throw new Error('Invalid ZIP footer');
  const count = dv.getUint16(end + 10, true);
  const start = dv.getUint32(end + 16, true);
  if (!count || count > MAX_FILES || count !== dv.getUint16(end + 8, true) ||
      start + dv.getUint32(end + 12, true) !== end) throw new Error('Invalid ZIP directory');
  const files = Object.create(null);
  let p = start;
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || dv.getUint32(p, true) !== 0x02014b50) throw new Error('Bad ZIP directory entry');
    const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true);
    const crc = dv.getUint32(p + 16, true), compressed = dv.getUint32(p + 20, true);
    const plain = dv.getUint32(p + 24, true), n = dv.getUint16(p + 28, true);
    const extra = dv.getUint16(p + 30, true), comment = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    if (flags !== 0x0800 || method !== 0 || compressed !== plain || compressed > MAX_FILE_BYTES ||
        dv.getUint16(p + 34, true) !== 0 || p + 46 + n + extra + comment > end)
      throw new Error('Unsupported ZIP entry');
    const name = safePath(decoder.decode(data.subarray(p + 46, p + 46 + n)));
    if (Object.hasOwn(files, name)) throw new Error('Duplicate ZIP entry');
    if (offset + 30 > start || dv.getUint32(offset, true) !== 0x04034b50 ||
        dv.getUint16(offset + 6, true) !== flags || dv.getUint16(offset + 8, true) !== method ||
        dv.getUint32(offset + 14, true) !== crc || dv.getUint32(offset + 18, true) !== compressed ||
        dv.getUint32(offset + 22, true) !== plain) throw new Error('Bad local ZIP header');
    const ln = dv.getUint16(offset + 26, true), le = dv.getUint16(offset + 28, true);
    const contentAt = offset + 30 + ln + le;
    if (ln !== n || contentAt + compressed > start ||
        decoder.decode(data.subarray(offset + 30, offset + 30 + ln)) !== name)
      throw new Error('ZIP filename or bounds mismatch');
    const content = data.slice(contentAt, contentAt + compressed);
    if (crc32(content) !== crc) throw new Error('Corrupted ZIP entry');
    files[name] = content;
    p += 46 + n + extra + comment;
  }
  if (p !== end || !Object.hasOwn(files, 'manifest.json')) throw new Error('Bad ZIP directory or missing manifest');
  let manifest;
  try { manifest = JSON.parse(decoder.decode(files['manifest.json'])); }
  catch { throw new Error('Invalid manifest JSON'); }
  verifyManifest(manifest);
  const expected = new Set(manifest.assets.map(a => a.path));
  if (Object.keys(files).length !== expected.size + 1 ||
      Object.keys(files).some(name => name !== 'manifest.json' && !expected.has(name)))
    throw new Error('Unexpected file in pack');
  for (const a of manifest.assets) {
    if (!files[a.path] || files[a.path].length !== a.size || hexCRC(files[a.path]) !== a.crc32)
      throw new Error('Declared asset missing or corrupt');
  }
  return { manifest, files };
}
/** v0.1 authoring adapter for existing PixelForge Runtime Composer exports. */
export function makeRuntimeScenePack(scene, options = {}) {
  if (!validScene(scene)) throw new Error('Invalid PixelForge v5.11 scene');
  const payload = encoder.encode(JSON.stringify(scene));
  const entry = 'scenes/main.runtime-scene.json';
  const manifest = {
    format: 'phipack', formatVersion: PHIPACK_VERSION,
    id: options.id || 'phi369.' + String(scene.sceneId || 'scene').toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    title: options.title || scene.title || 'Untitled scene',
    kind: 'scene', profile: 'pixelforge.runtime-scene.v5.11', entry,
    assets: [{ path: entry, mediaType: 'application/json', size: payload.length, crc32: hexCRC(payload) }],
    rights: { license: options.license || 'UNSPECIFIED', redistributionAllowed: options.redistributionAllowed === true },
  };
  return encodePack(manifest, { [entry]: payload });
}
function validScene(s) {
  return object(s) && s.schema === 'pixelforge.runtime-scene.v5.11' && object(s.runtime) &&
    object(s.map) && Number.isInteger(s.map.width) && Number.isInteger(s.map.height) &&
    s.map.width > 0 && s.map.height > 0 && object(s.map.layers) &&
    Array.isArray(s.map.layers.collision) &&
    s.map.layers.collision.length === s.map.width * s.map.height;
}
/** First consumer adapter: returns data only, preserving the host game's authority. */
export function loadRuntimeScenePack(bytes) {
  const { manifest, files } = decodePack(bytes);
  let scene;
  try { scene = JSON.parse(decoder.decode(files[manifest.entry])); }
  catch { throw new Error('Scene JSON invalid'); }
  if (!validScene(scene) || scene.schema !== manifest.profile) throw new Error('Unsupported or invalid scene profile');
  return { manifest, scene };
}
