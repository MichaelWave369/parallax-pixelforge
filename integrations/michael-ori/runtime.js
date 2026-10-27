/**
 * Opt-in ΦWAD mission bridge for Michael Wave & Ori v0.2.1.
 * Runs solely inside the owned game page. Does not use eval, fetch,
 * untrusted scripts, or modify the six canonical campaign definitions.
 */
import { loadMissionPack, toMichaelOriHandoff } from './phiwad/mission.js';

const isObject = x => !!x && typeof x === 'object' && !Array.isArray(x);
function missionSector(layout, title) {
  const toCoords = obj => [obj.x, obj.y];
  const enemies = layout.enemies.map(e => [e.type, e.x, e.y]);
  const items = layout.items.map(e => [e.type, e.x, e.y]);
  return {
    name: String(title || 'ΦWAD CUSTOM SIGNAL').slice(0, 90).toUpperCase(),
    tag: 'CUSTOM ΦWAD / COMMUNITY LEVEL',
    color: '#78eec8',
    subtitle: 'Ori says: Somebody else brought the level design. Nice.',
    wall: 1,
    spawn: { x: layout.spawn.x, y: layout.spawn.y, a: layout.spawn.a },
    // createLevel needs this well-formed authoring shell. Runtime cells
    // are replaced with the already validated, exact authored handoff.
    rooms: [[1, 1, 27, 23]], halls: [], doors: [], pillars: [],
    relays: layout.relays.map(toCoords), key: toCoords(layout.key),
    exit: toCoords(layout.exit), enemies, items,
    captives: layout.captives.map(toCoords), secret: [1, 1]
  };
}
function assertHandoff(data) {
  const l = data?.level;
  if (!isObject(l) || l.w !== 29 || l.h !== 25 ||
      !Array.isArray(l.cells) || l.cells.length !== 25 ||
      l.cells.some(row => !Array.isArray(row) || row.length !== 29 ||
        row.some(v => v !== 0 && v !== 1)) ||
      !Array.isArray(l.relays) || l.relays.length !== 2 ||
      !isObject(l.key) || !isObject(l.exit) || !isObject(l.spawn) ||
      !Array.isArray(l.enemies) || !Array.isArray(l.items) ||
      !Array.isArray(l.captives))
    throw new Error('ΦWAD game handoff incompatible with the 29×25 sector contract');
  return l;
}
export function installPhiWadLoader({
  game, sectors, titleScreen, enterGame, restartCampaign, notify
}) {
  if (!game || !Array.isArray(sectors) || sectors.length !== 6 ||
      !titleScreen || typeof enterGame !== 'function' ||
      typeof restartCampaign !== 'function')
    throw new Error('ΦWAD loader requires the canonical v0.2.1 game shell');
  let addedIndex = null;
  let loading = false;
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.phiwad,.phipack,application/zip';
  input.hidden = true; input.id = 'phiwad-mission-input';
  const button = document.createElement('button');
  button.type = 'button'; button.id = 'phiwad-load-button';
  button.textContent = 'LOAD ΦWAD CUSTOM MISSION';
  button.setAttribute('aria-label', 'Choose a local PhiWad custom mission file');
  button.className = 'secondary';
  titleScreen.append(button, input);
  button.addEventListener('click', () => input.click());
  function exitCustom() {
    if (addedIndex === null) return false;
    // Discard custom, session-only checkpoints before restoring the title shell.
    game.events.length = 0;
    game.phiwadCustom = false;
    if (sectors.length !== addedIndex + 1) throw new Error('Unexpected sector registry change');
    sectors.pop();
    addedIndex = null;
    game.loadLevel(0, false);
    game.mode = 'title';
    game.events.length = 0;
    return true;
  }
  async function loadFile(file) {
    if (loading || !file) return;
    loading = true;
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error('ΦWAD exceeds 16 MiB limit');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { manifest, level, mission } = loadMissionPack(bytes);
      const handoff = toMichaelOriHandoff(level, mission);
      const l = assertHandoff(handoff);
      if (addedIndex !== null) exitCustom();
      if (sectors.length !== 6) throw new Error('Campaign sector count has changed');
      addedIndex = sectors.length;
      sectors.push(missionSector(l, manifest.title));
      try {
        game.totalFreed = 0; game.totalArtifacts = 0;
        game.totalSecrets = 0; game.campaignTime = 0;
        game.rng = 369;
        game.loadLevel(addedIndex, false);
        game.level.cells = l.cells.map(row => row.slice());
        game.level.seen = Array(29 * 25).fill(false);
        game.level.regions = [{ bounds: [1, 1, 27, 23], name: 'CUSTOM SIGNAL' }];
        game.level.signs = []; game.level.props = [];
        game.level.doors = {};
        game.level.secretFound = false;
        game.player.x = l.spawn.x;
        game.player.y = l.spawn.y;
        game.player.a = l.spawn.a;
        game.unlocked = 6; game.weapon = 1;
        game.phiwadCustom = true;
        game.checkpoint = game.snapshot();
        // Remove the unqualified pre-geometry checkpoint and sector event.
        game.events.length = 0;
        enterGame();
        notify?.('CUSTOM ΦWAD LOADED / ORIGINAL CAMPAIGN PRESERVED');
      } catch (error) {
        exitCustom();
        throw error;
      }
    } catch (error) {
      notify?.('ΦWAD IMPORT FAILED: ' + error.message);
    } finally {
      loading = false; input.value = '';
    }
  }
  input.addEventListener('change', () => void loadFile(input.files?.[0]));
  // Capture prevents the original completion handler treating a community
  // level as an Act II sector. Death/retry still use original checkpoint code.
  const resultButton = document.getElementById('result-btn');
  resultButton?.addEventListener('click', event => {
    if (!game.phiwadCustom || game.mode === 'dead') return;
    event.stopImmediatePropagation();
    exitCustom();
    restartCampaign();
  }, true);
  for (const id of ['quit-btn', 'result-home']) {
    document.getElementById(id)?.addEventListener('click', () => {
      if (game.phiwadCustom) exitCustom();
    }, true);
  }
  return Object.freeze({
    loadBytes: async bytes => loadFile(new File([bytes], 'custom.phiwad')),
    exitCustom,
    get active() { return !!game.phiwadCustom; }
  });
}
