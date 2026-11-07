/**
 * PixelForge VR Studio -> PhiOS candidate project identity *sidecar* v0.1.
 *
 * Operator-supplied stable project ID only: titles, scene IDs, asset IDs
 * and mutable content hashes are NOT durable cross-app project identities.
 * This exports metadata; it cannot attest ownership, read project files,
 * authorize a bridge, install an app, or modify the saved VR world.
 */
import { FORMAT as WORLD_FORMAT, validateWorld } from './world.js';

export const PHIOS_WORLD_IDENTITY_SCHEMA = 'pixelforge.phios-vr-world-identity.v0.1';
export const PHIOS_WORLD_IDENTITY_SOURCE = PHIOS_WORLD_IDENTITY_SCHEMA;
export const PHIOS_WORLD_IDENTITY_MAX_BYTES = 4 * 1024;

const plain = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);

function exact(value, keys) {
  return Object.keys(value).length === keys.length
    && Object.keys(value).every(key => keys.includes(key));
}

export function validateOperatorWorldProjectId(id) {
  if (typeof id !== 'string'
      || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(id)
      || id.includes('..') || id.endsWith('.')) {
    throw new Error('Project ID must be 1–64 ASCII letters, numbers, dots, dashes or underscores; no repeated/trailing dots.');
  }
  return id;
}

export function validatePhiOSWorldIdentityManifest(value) {
  if (!plain(value) || !exact(value, ['schema', 'projectId', 'title', 'worldFormat'])
      || value.schema !== PHIOS_WORLD_IDENTITY_SCHEMA
      || value.worldFormat !== WORLD_FORMAT) {
    throw new Error('Unsupported PixelForge PhiOS world identity manifest');
  }
  validateOperatorWorldProjectId(value.projectId);
  if (typeof value.title !== 'string' || value.title.length < 1
      || value.title.length > 100 || value.title !== value.title.trim()
      || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value.title)) {
    throw new Error('Invalid project display title; rename the world before exporting an identity');
  }
  return Object.freeze({
    schema: PHIOS_WORLD_IDENTITY_SCHEMA,
    projectId: value.projectId,
    title: value.title,
    worldFormat: WORLD_FORMAT,
  });
}

export function buildPhiOSWorldIdentityManifest(world, operatorId) {
  const validated = validateWorld(world);
  return validatePhiOSWorldIdentityManifest({
    schema: PHIOS_WORLD_IDENTITY_SCHEMA,
    projectId: validateOperatorWorldProjectId(operatorId),
    title: validated.title,
    worldFormat: WORLD_FORMAT,
  });
}

export function decodePhiOSWorldIdentityManifest(raw) {
  if (typeof raw !== 'string'
      || new TextEncoder().encode(raw).byteLength > PHIOS_WORLD_IDENTITY_MAX_BYTES) {
    throw new Error('PhiOS identity manifest exceeds 4 KiB');
  }
  let input;
  try { input = JSON.parse(raw); }
  catch { throw new Error('PhiOS identity manifest is not valid JSON'); }
  return validatePhiOSWorldIdentityManifest(input);
}

export function encodePhiOSWorldIdentityManifest(value) {
  const validated = validatePhiOSWorldIdentityManifest(value);
  const json = JSON.stringify(validated, null, 2) + '\n';
  decodePhiOSWorldIdentityManifest(json);
  return json;
}

/**
 * Candidate consumer projection only. This is NOT a reviewed/active PhiOS
 * adapter until an independent PhiOS parser and real two-origin Chrome test
 * have been approved.
 */
export function projectIdentityProjection(value) {
  const valid = validatePhiOSWorldIdentityManifest(value);
  return Object.freeze({
    projectRef: 'project:' + valid.projectId,
    title: valid.title,
    source: PHIOS_WORLD_IDENTITY_SOURCE,
  });
}
