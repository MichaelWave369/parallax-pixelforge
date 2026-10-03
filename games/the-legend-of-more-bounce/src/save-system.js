import { normalizeTravelState } from './travel-system.js';
export const LEGEND_SAVE_SCHEMA = 'pixelforge.legend-save.v5.27';
export const LEGEND_SAVE_VERSION = 4;
export const LEGEND_LEGACY_SAVE_SCHEMAS = Object.freeze(['pixelforge.legend-save.v5.24','pixelforge.legend-save.v5.25','pixelforge.legend-save.v5.26']);
export const LEGEND_SAVE_SLOTS = 3;
export const LEGEND_AUTOSAVE_KEY = 'pixelforge.legend.more-bounce.autosave';
export const LEGEND_SLOT_PREFIX = 'pixelforge.legend.more-bounce.slot.';

export const DEFAULT_QUEST = Object.freeze({
  oldTempoMet: false, groveKey: false, rune: false, shards: 0, crest: false, seal: false,
  miraMet: false, relaySparks: 0, echoBoots: false, beaconLens: false, eastComplete: false,
  tessaMet: false, bramMet: false, gearApples: 0, appleNodes: [], applesTraded: 0,
  resonanceBracer: false, wrenchCharm: false, wrenchReturned: false, heartRivet: false,
  orchardSigil: false, ironBlossom: false, chapterThreeComplete: false,
  sableMet: false, tideglassShells: 0, shell1Taken: false, shell2Taken: false, shell3Taken: false,
  galeMantle: false, pressurePrism: false, tideEngineSolved: false, undertowBellDefeated: false, stormglassCompass: false, chapterFourComplete: false,
  perriMet: false, prismCyan: false, prismMagenta: false, prismGold: false, worldBeamAligned: false, pulseNodes: 0, pulseNodesPowered: false, lensStep: 0, viewSigil: false, blindAngleDefeated: false, convergenceCrown: false, chapterFiveComplete: false,
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const bool = (value) => Boolean(value);
const int = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;

function storage() {
  try { return window?.localStorage || null; } catch { return null; }
}

export function normalizeQuest(input = {}) {
  const q = { ...clone(DEFAULT_QUEST), ...(input || {}) };
  q.oldTempoMet = bool(q.oldTempoMet); q.groveKey = bool(q.groveKey); q.rune = bool(q.rune);
  q.shards = Math.min(3, int(q.shards)); q.crest = bool(q.crest); q.seal = bool(q.seal);
  q.miraMet = bool(q.miraMet); q.relaySparks = Math.min(3, int(q.relaySparks)); q.echoBoots = bool(q.echoBoots);
  q.beaconLens = bool(q.beaconLens); q.eastComplete = bool(q.eastComplete);
  q.tessaMet = bool(q.tessaMet); q.bramMet = bool(q.bramMet); q.gearApples = Math.min(3, int(q.gearApples));
  q.appleNodes = Array.isArray(q.appleNodes) ? [...new Set(q.appleNodes.map(String))].slice(0, 3) : [];
  q.applesTraded = Math.min(3, int(q.applesTraded)); q.resonanceBracer = bool(q.resonanceBracer);
  q.wrenchCharm = bool(q.wrenchCharm); q.wrenchReturned = bool(q.wrenchReturned); q.heartRivet = bool(q.heartRivet);
  q.orchardSigil = bool(q.orchardSigil); q.ironBlossom = bool(q.ironBlossom); q.chapterThreeComplete = bool(q.chapterThreeComplete);
  q.sableMet = bool(q.sableMet); q.tideglassShells = Math.min(3, int(q.tideglassShells)); q.shell1Taken = bool(q.shell1Taken); q.shell2Taken = bool(q.shell2Taken); q.shell3Taken = bool(q.shell3Taken);
  q.galeMantle = bool(q.galeMantle); q.pressurePrism = bool(q.pressurePrism); q.tideEngineSolved = bool(q.tideEngineSolved); q.undertowBellDefeated = bool(q.undertowBellDefeated); q.stormglassCompass = bool(q.stormglassCompass); q.chapterFourComplete = bool(q.chapterFourComplete);
  q.perriMet = bool(q.perriMet); q.prismCyan = bool(q.prismCyan); q.prismMagenta = bool(q.prismMagenta); q.prismGold = bool(q.prismGold); q.worldBeamAligned = bool(q.worldBeamAligned || (q.prismCyan && q.prismMagenta && q.prismGold)); q.pulseNodes = Math.min(3, int(q.pulseNodes)); q.pulseNodesPowered = bool(q.pulseNodesPowered || q.pulseNodes >= 3); q.lensStep = Math.min(3, int(q.lensStep)); q.viewSigil = bool(q.viewSigil || q.lensStep >= 3); q.blindAngleDefeated = bool(q.blindAngleDefeated); q.convergenceCrown = bool(q.convergenceCrown); q.chapterFiveComplete = bool(q.chapterFiveComplete);
  return q;
}

export function checkpointForQuest(input = {}) {
  const q = normalizeQuest(input);
  if (q.convergenceCrown || q.chapterFiveComplete) return { id: 'mirrorfall-complete', chapter: 5, label: 'Mirrorfall Basin — Convergence Restored', resumeMode: 'chapter5Ending' };
  if (q.viewSigil) return { id: 'blind-angle', chapter: 5, label: 'Mirrorfall — The Blind Angle', resumeMode: 'mirrorfall' };
  if (q.pulseNodesPowered) return { id: 'triune-observatory', chapter: 5, label: 'Mirrorfall — Triune Observatory', resumeMode: 'mirrorfall' };
  if (q.worldBeamAligned) return { id: 'splitlight-causeway', chapter: 5, label: 'Mirrorfall — Splitlight Causeway', resumeMode: 'mirrorfall' };
  if (q.stormglassCompass || q.chapterFourComplete) return { id: 'mirrorfall-basin', chapter: 5, label: 'Mirrorfall Basin — Prism Shore', resumeMode: 'mirrorfall' };
  if (q.tideEngineSolved) return { id: 'undertow-bell', chapter: 4, label: 'Stormglass Coast — Undertow Bell', resumeMode: 'stormglassCoast' };
  if (q.galeMantle) return { id: 'gale-mantle', chapter: 4, label: 'Stormglass Coast — Gale Mantle', resumeMode: 'stormglassCoast' };
  if (q.ironBlossom || q.chapterThreeComplete) return { id: 'stormglass-coast', chapter: 4, label: 'Stormglass Coast — Tidewatch Pier', resumeMode: 'stormglassCoast' };
  if (q.orchardSigil && q.resonanceBracer) return { id: 'rustroot-cleared', chapter: 3, label: 'Iron Orchard — Warden Road', resumeMode: 'ironOrchard' };
  if (q.resonanceBracer) return { id: 'resonance-bracer', chapter: 3, label: 'Rivet Row — Resonance Bracer', resumeMode: 'ironOrchard' };
  if (q.eastComplete || q.beaconLens) return { id: 'iron-orchard', chapter: 3, label: 'The Iron Orchard', resumeMode: 'ironOrchard' };
  if (q.echoBoots) return { id: 'echo-boots', chapter: 2, label: 'Eastern Road — Echo Boots', resumeMode: 'eastRoad' };
  if (q.seal) return { id: 'eastern-road', chapter: 2, label: 'Larrina Tower — Eastern Road Open', resumeMode: 'eastRoad' };
  if (q.crest) return { id: 'rhythm-crest', chapter: 1, label: 'Beat Shrine — Flat Note Awaits', resumeMode: 'overworld' };
  if (q.shards >= 3) return { id: 'echo-hollow-clear', chapter: 1, label: 'Echo Hollow — Shrine Road', resumeMode: 'overworld' };
  if (q.rune) return { id: 'bounce-rune', chapter: 1, label: 'Bouncehome — Bounce Rune', resumeMode: 'overworld' };
  if (q.groveKey) return { id: 'grove-key', chapter: 1, label: 'Bouncehome — Grove Key', resumeMode: 'overworld' };
  if (q.oldTempoMet) return { id: 'old-tempo-clue', chapter: 1, label: 'Moon Pond — Old Tempo Clue', resumeMode: 'overworld' };
  return { id: 'bouncehome-start', chapter: 1, label: 'Bouncehome Grove — Beginning', resumeMode: 'overworld' };
}

export function safeResumeMode(mode, quest) {
  const q = normalizeQuest(quest);
  if (q.convergenceCrown || q.chapterFiveComplete) return 'chapter5Ending';
  if (['splitlight','observatory','blindAngleBoss'].includes(mode)) return 'mirrorfall';
  if (q.stormglassCompass || q.chapterFourComplete) return 'mirrorfall';
  if (['stormglassCliffs','tideEngine','undertowBoss'].includes(mode)) return 'stormglassCoast';
  if (q.ironBlossom || q.chapterThreeComplete) return 'stormglassCoast';
  if (['rustroot', 'rivetForge', 'rustbloomBoss'].includes(mode)) return 'ironOrchard';
  if (['glassgrass', 'signalMill'].includes(mode)) return 'eastRoad';
  if (['wobble', 'hollow', 'shrine', 'boss', 'tower'].includes(mode)) return 'overworld';
  if (mode === 'chapter2Ending') return 'ironOrchard';
  if (['eastRoad', 'ironOrchard', 'stormglassCoast', 'mirrorfall', 'overworld'].includes(mode)) return mode;
  return checkpointForQuest(q).resumeMode;
}

export function deriveInventory(input = {}) {
  const q = normalizeQuest(input);
  return [
    ['grove-key', 'Grove Key', q.groveKey, 'quest'],
    ['bounce-rune', 'Bounce Rune', q.rune, 'relic'],
    ['echo-shards', `Echo Shards ${q.shards}/3`, q.shards > 0, 'collectible'],
    ['rhythm-crest', 'Rhythm Crest', q.crest, 'relic'],
    ['resonance-seal', 'Resonance Seal', q.seal, 'boss-reward'],
    ['relay-sparks', `Relay Sparks ${q.relaySparks}/3`, q.relaySparks > 0, 'collectible'],
    ['beacon-lens', 'Eastern Beacon Lens', q.beaconLens, 'chapter-reward'],
    ['gear-apples', `Gear Apples ${q.gearApples}/3`, q.gearApples > 0, 'collectible'],
    ['wrench-charm', 'Bram’s Wrench Charm', q.wrenchCharm && !q.wrenchReturned, 'side-quest'],
    ['orchard-sigil', 'Orchard Sigil', q.orchardSigil, 'quest'],
    ['iron-blossom', 'Iron Blossom', q.ironBlossom, 'boss-reward'],
    ['tideglass-shells', `Tideglass Shells ${q.tideglassShells}/3`, q.tideglassShells > 0, 'collectible'],
    ['pressure-prism', 'Pressure Prism', q.pressurePrism, 'quest'],
    ['stormglass-compass', 'Stormglass Compass', q.stormglassCompass, 'boss-reward'],
    ['view-sigil', 'View Sigil', q.viewSigil, 'quest'],
    ['convergence-crown', 'Convergence Crown', q.convergenceCrown, 'boss-reward'],
  ].filter(([, , owned]) => owned).map(([id, name, , type]) => ({ id, name, type }));
}

export function deriveEquipment(input = {}) {
  const q = normalizeQuest(input);
  return [
    { id: 'echo-boots', name: 'Echo Boots', slot: 'boots', equipped: q.echoBoots, effect: 'Second-bounce / high-route access' },
    { id: 'resonance-bracer', name: 'Resonance Bracer', slot: 'bracer', equipped: q.resonanceBracer, effect: 'Breaks iron armor and boss guards' },
    { id: 'heart-rivet', name: 'Heart Rivet', slot: 'charm', equipped: q.heartRivet, effect: '+1 maximum heart in Warden encounters' },
    { id: 'gale-mantle', name: 'Gale Mantle', slot: 'mantle', equipped: q.galeMantle, effect: 'One midair dash between landings / surge phasing' },
  ];
}

export function deriveQuestLog(input = {}) {
  const q = normalizeQuest(input);
  return [
    { id: 'chapter-1', chapter: 1, title: 'Restore the First Rhythm', complete: q.seal, steps: [
      ['Hear Old Tempo’s clue', q.oldTempoMet], ['Recover the Grove Key', q.groveKey], ['Claim the Bounce Rune', q.rune], ['Recover 3 Echo Shards', q.shards >= 3], ['Restore the Rhythm Crest', q.crest], ['Defeat The Flat Note', q.seal],
    ] },
    { id: 'chapter-2', chapter: 2, title: 'Light the Eastern Beacon', complete: q.beaconLens || q.eastComplete, steps: [
      ['Meet Mira Reed', q.miraMet], ['Recover 3 Relay Sparks', q.relaySparks >= 3], ['Earn the Echo Boots', q.echoBoots], ['Restore the Beacon Lens', q.beaconLens],
    ] },
    { id: 'chapter-3', chapter: 3, title: 'Wake the Iron Orchard', complete: q.ironBlossom || q.chapterThreeComplete, steps: [
      ['Meet Tessa Coil and Bram Gearroot', q.tessaMet && q.bramMet], ['Gather 3 Gear Apples', q.appleNodes.length >= 3 || q.applesTraded >= 3 || q.resonanceBracer], ['Equip the Resonance Bracer', q.resonanceBracer], ['Clear Rustroot Cavern', q.orchardSigil], ['Optional: return Bram’s Wrench Charm', q.wrenchReturned || q.heartRivet], ['Defeat the Rustbloom Warden', q.ironBlossom],
    ] },
    { id: 'chapter-4', chapter: 4, title: 'Wake the Stormglass Lighthouse', complete: q.stormglassCompass || q.chapterFourComplete, steps: [
      ['Meet Sable Current', q.sableMet], ['Recover 3 Tideglass Shells', q.galeMantle || q.tideglassShells >= 3], ['Equip the Gale Mantle', q.galeMantle], ['Cross Stormglass Cliffs', q.pressurePrism], ['Synchronize the Tide Engine', q.tideEngineSolved], ['Defeat the Undertow Bell', q.stormglassCompass],
    ] },
    { id: 'chapter-5', chapter: 5, title: 'Restore the Three-View Convergence', complete: q.convergenceCrown || q.chapterFiveComplete, steps: [
      ['Meet Perri Prism', q.perriMet], ['Align 3 world prisms', q.worldBeamAligned], ['Power 3 Pulse Nodes', q.pulseNodesPowered], ['Solve ROOT · PULSE · LENS', q.viewSigil], ['Defeat The Blind Angle', q.convergenceCrown],
    ] },
  ].map((quest) => ({ ...quest, steps: quest.steps.map(([label, complete]) => ({ label, complete: Boolean(complete) })) }));
}

export function deriveBossRecords(input = {}) {
  const q = normalizeQuest(input);
  return [
    { id: 'flat-note', name: 'The Flat Note', defeated: q.seal, reward: 'Resonance Seal' },
    { id: 'rustbloom-warden', name: 'Rustbloom Warden', defeated: q.ironBlossom, reward: 'Iron Blossom' },
    { id: 'undertow-bell', name: 'The Undertow Bell', defeated: q.stormglassCompass, reward: 'Stormglass Compass' },
    { id: 'blind-angle', name: 'The Blind Angle', defeated: q.convergenceCrown, reward: 'Convergence Crown' },
  ];
}

export function buildLegendSave({ slot = 'autosave', mode = 'overworld', quest = {}, visitedModes = [], travelState = {}, playtimeSeconds = 0, kind = 'manual' } = {}) {
  const progress = normalizeQuest(quest);
  const checkpoint = checkpointForQuest(progress);
  return {
    schema: LEGEND_SAVE_SCHEMA,
    schemaVersion: LEGEND_SAVE_VERSION,
    game: 'the-legend-of-more-bounce',
    cartridgeVersion: '1.8.0',
    pixelForgeVersion: '5.27.0-alpha',
    slot: String(slot), kind,
    savedAt: new Date().toISOString(),
    checkpoint,
    resume: { requestedMode: mode, safeMode: safeResumeMode(mode, progress) },
    playtimeSeconds: Math.max(0, Math.round(Number(playtimeSeconds) || 0)),
    progress,
    inventory: deriveInventory(progress),
    equipment: deriveEquipment(progress),
    questLog: deriveQuestLog(progress),
    discoveredLocations: [...new Set((visitedModes || []).map(String))],
    travelNetwork: normalizeTravelState(travelState, progress),
    bossRecords: deriveBossRecords(progress),
  };
}

export function normalizeLegendSave(raw) {
  const source = typeof raw === 'string' ? JSON.parse(raw) : clone(raw || {});
  const accepted = source.schema === LEGEND_SAVE_SCHEMA || LEGEND_LEGACY_SAVE_SCHEMAS.includes(source.schema);
  if (!accepted) throw new Error(`Unsupported save schema: ${source.schema || 'missing'}`);
  if (source.schema === LEGEND_SAVE_SCHEMA && int(source.schemaVersion, 0) > LEGEND_SAVE_VERSION) throw new Error('This save was created by a newer Legend save schema.');
  const progress = normalizeQuest(source.progress || source.quest || {});
  const migratedTravel = source.travelNetwork || { activatedLandmarks: ['bouncehome-shrine', ...((progress.beaconLens || progress.eastComplete) ? ['eastern-beacon'] : [])] };
  return buildLegendSave({
    slot: source.slot || 'import', mode: source.resume?.requestedMode || source.mode || source.checkpoint?.resumeMode || 'overworld',
    quest: progress, visitedModes: source.discoveredLocations || [], travelState: migratedTravel, playtimeSeconds: source.playtimeSeconds || 0, kind: source.kind || 'imported',
  });
}

export function slotKey(slot) { return `${LEGEND_SLOT_PREFIX}${slot}`; }
export function readSlot(slot) { const s = storage(); if (!s) return null; const raw = s.getItem(slotKey(slot)); if (!raw) return null; try { return normalizeLegendSave(raw); } catch { return null; } }
export function listManualSlots() { return Array.from({ length: LEGEND_SAVE_SLOTS }, (_, i) => ({ slot: i + 1, save: readSlot(i + 1) })); }
export function writeSlot(slot, save) { const s = storage(); if (!s) return false; s.setItem(slotKey(slot), JSON.stringify(normalizeLegendSave({ ...save, slot: String(slot), kind: 'manual' }))); return true; }
export function deleteSlot(slot) { const s = storage(); if (!s) return false; s.removeItem(slotKey(slot)); return true; }
export function readAutosave() { const s = storage(); if (!s) return null; const raw = s.getItem(LEGEND_AUTOSAVE_KEY); if (!raw) return null; try { return normalizeLegendSave(raw); } catch { return null; } }
export function writeAutosave(save) { const s = storage(); if (!s) return false; s.setItem(LEGEND_AUTOSAVE_KEY, JSON.stringify(normalizeLegendSave({ ...save, slot: 'autosave', kind: 'autosave' }))); return true; }
export function exportSaveFile(save, filename = 'legend-of-more-bounce-save.v5.27.json') { const blob = new Blob([JSON.stringify(normalizeLegendSave(save), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 600); }
