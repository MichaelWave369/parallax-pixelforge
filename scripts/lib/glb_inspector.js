import fs from 'node:fs';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

export function inspectGlbBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error('GLB input must be a Buffer.');
  if (buffer.length < 20) throw new Error('GLB is too small to contain a valid header and JSON chunk.');

  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);

  if (magic !== GLB_MAGIC) throw new Error('Invalid GLB magic; expected glTF.');
  if (version !== 2) throw new Error(`Unsupported GLB version: ${version}. PixelForge v5.30 requires glTF 2.0.`);
  if (declaredLength !== buffer.length) {
    throw new Error(`GLB declared length ${declaredLength} does not match actual length ${buffer.length}.`);
  }

  let offset = 12;
  const chunks = [];
  let json = null;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('Truncated GLB chunk header.');
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;
    if (dataEnd > buffer.length) throw new Error('GLB chunk extends past declared file length.');
    const data = buffer.subarray(dataStart, dataEnd);
    chunks.push({ type: chunkType, length: chunkLength });

    if (chunkType === JSON_CHUNK) {
      if (json !== null) throw new Error('GLB contains more than one JSON chunk.');
      const text = data.toString('utf8').replace(/[\u0000\u0020]+$/g, '');
      try {
        json = JSON.parse(text);
      } catch (error) {
        throw new Error(`GLB JSON chunk is invalid: ${error.message}`);
      }
    }

    offset = dataEnd;
  }

  if (!json) throw new Error('GLB is missing its JSON chunk.');
  if (json.asset?.version !== '2.0') throw new Error(`glTF asset.version must be 2.0, received ${json.asset?.version || '<missing>'}.`);

  const summary = {
    scenes: countArray(json.scenes),
    nodes: countArray(json.nodes),
    meshes: countArray(json.meshes),
    primitives: Array.isArray(json.meshes)
      ? json.meshes.reduce((sum, mesh) => sum + countArray(mesh?.primitives), 0)
      : 0,
    materials: countArray(json.materials),
    textures: countArray(json.textures),
    images: countArray(json.images),
    samplers: countArray(json.samplers),
    accessors: countArray(json.accessors),
    bufferViews: countArray(json.bufferViews),
    buffers: countArray(json.buffers),
    animations: countArray(json.animations),
    skins: countArray(json.skins),
    cameras: countArray(json.cameras),
  };

  return {
    schema: 'pixelforge.glb-inspection.v1',
    valid: true,
    container: {
      magic: 'glTF',
      version,
      declared_length: declaredLength,
      actual_length: buffer.length,
      chunk_count: chunks.length,
      has_binary_chunk: chunks.some(chunk => chunk.type === BIN_CHUNK),
      chunks: chunks.map(chunk => ({
        type: chunk.type === JSON_CHUNK ? 'JSON' : chunk.type === BIN_CHUNK ? 'BIN' : `0x${chunk.type.toString(16).padStart(8, '0')}`,
        length: chunk.length,
      })),
    },
    asset: {
      generator: json.asset?.generator || null,
      copyright: json.asset?.copyright || null,
      minVersion: json.asset?.minVersion || null,
    },
    summary,
    extensions_used: Array.isArray(json.extensionsUsed) ? json.extensionsUsed : [],
    extensions_required: Array.isArray(json.extensionsRequired) ? json.extensionsRequired : [],
    default_scene: Number.isInteger(json.scene) ? json.scene : null,
    json,
  };
}

export function inspectGlbFile(filePath) {
  return inspectGlbBuffer(fs.readFileSync(filePath));
}
