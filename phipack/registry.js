/*
 * ΦPACK adapter registry: package transport is universal; game support is opt-in.
 * An adapter never receives authority to execute code or mutate the host runtime.
 */
import { decodePack, loadRuntimeScenePack } from './core.js';

export function createAdapterRegistry() {
  const adapters = new Map();

  function register(descriptor) {
    if (!descriptor || typeof descriptor.engineId !== 'string' ||
        !/^[a-z0-9][a-z0-9._-]{2,79}$/i.test(descriptor.engineId) ||
        !Array.isArray(descriptor.profiles) || !descriptor.profiles.length ||
        descriptor.profiles.some(p => typeof p !== 'string' || !p.trim()) ||
        typeof descriptor.load !== 'function')
      throw new TypeError('Invalid ΦPACK engine adapter descriptor');
    if (adapters.has(descriptor.engineId)) throw new Error('Duplicate engine adapter: ' + descriptor.engineId);
    const safe = Object.freeze({
      engineId: descriptor.engineId,
      profiles: Object.freeze([...new Set(descriptor.profiles)]),
      load: descriptor.load,
    });
    adapters.set(safe.engineId, safe);
    return safe.engineId;
  }

  function support(engineId, manifest) {
    const adapter = adapters.get(engineId);
    if (!adapter) return { supported: false, reason: 'No adapter registered for engine: ' + engineId };
    if (!adapter.profiles.includes(manifest.profile))
      return { supported: false, reason: 'Engine does not support profile: ' + manifest.profile };
    return { supported: true, engineId, profile: manifest.profile };
  }

  function load(engineId, bytes) {
    const { manifest } = decodePack(bytes);
    const result = support(engineId, manifest);
    if (!result.supported) throw new Error(result.reason);
    return adapters.get(engineId).load(bytes);
  }

  return Object.freeze({
    register,
    support,
    load,
    list: () => [...adapters.values()].map(a => ({
      engineId: a.engineId, profiles: [...a.profiles],
    })),
  });
}

export function createPixelForgeRegistry() {
  const registry = createAdapterRegistry();
  registry.register({
    engineId: 'pixelforge-runtime-composer',
    profiles: ['pixelforge.runtime-scene.v5.11'],
    load: loadRuntimeScenePack,
  });
  return registry;
}
