export const LEGEND_TRAVEL_SCHEMA = 'pixelforge.legend-travel.v5.27';
export const LEGEND_TRAVEL_VERSION = 3;

export const LEGEND_LANDMARKS = Object.freeze([
  { id:'bouncehome-shrine', name:'Bouncehome Shrine', region:'Bouncehome Grove', chapter:1, mode:'overworld', checkpoint:'bouncehome-start', x:13, y:65, icon:'✦', activation:'home-active' },
  { id:'larrina-tower-beacon', name:'Larrina Tower Beacon', region:'Central Heights', chapter:1, mode:'tower', checkpoint:'eastern-road', x:50, y:37, icon:'♛', activation:'manual' },
  { id:'eastern-beacon', name:'Eastern Beacon', region:'Eastwind Road', chapter:2, mode:'eastRoad', checkpoint:'iron-orchard', x:78, y:50, icon:'☀', activation:'quest-auto' },
  { id:'iron-orchard-shrine', name:'Iron Orchard Shrine', region:'The Iron Orchard', chapter:3, mode:'ironOrchard', checkpoint:'iron-orchard', x:88, y:74, icon:'⚙', activation:'manual' },
  { id:'stormglass-lighthouse', name:'Stormglass Lighthouse', region:'Stormglass Coast', chapter:4, mode:'stormglassCoast', checkpoint:'stormglass-coast', x:88, y:83, icon:'≋', activation:'quest-auto' },
  { id:'mirrorfall-observatory', name:'Mirrorfall Observatory', region:'Mirrorfall Basin', chapter:5, mode:'mirrorfall', checkpoint:'mirrorfall-basin', x:18, y:24, icon:'◈', activation:'quest-auto' },
]);

const uniq = (values=[]) => [...new Set((values||[]).map(String))];
const bool = (v) => Boolean(v);
const int = (v, fallback=0) => Number.isFinite(Number(v)) ? Math.max(0,Math.floor(Number(v))) : fallback;

export function landmarkById(id){ return LEGEND_LANDMARKS.find((item)=>item.id===id) || null; }

export function isLandmarkUnlocked(landmark, quest={}) {
  if (!landmark) return false;
  if (landmark.id === 'bouncehome-shrine') return true;
  if (landmark.id === 'larrina-tower-beacon') return bool(quest.seal);
  if (landmark.id === 'eastern-beacon') return bool(quest.beaconLens || quest.eastComplete);
  if (landmark.id === 'iron-orchard-shrine') return bool(quest.beaconLens || quest.eastComplete || quest.resonanceBracer || quest.ironBlossom);
  if (landmark.id === 'stormglass-lighthouse') return bool(quest.ironBlossom || quest.chapterThreeComplete || quest.stormglassCompass || quest.chapterFourComplete);
  if (landmark.id === 'mirrorfall-observatory') return bool(quest.stormglassCompass || quest.chapterFourComplete || quest.convergenceCrown || quest.chapterFiveComplete);
  return false;
}

export function isLandmarkDiscovered(landmark, quest={}, discoveredLocations=[]) {
  if (!landmark || !isLandmarkUnlocked(landmark, quest)) return false;
  const discovered = new Set(uniq(discoveredLocations));
  if (landmark.id === 'bouncehome-shrine') return true;
  if (landmark.id === 'eastern-beacon') return bool(quest.beaconLens || quest.eastComplete) || discovered.has('eastRoad');
  if (landmark.id === 'stormglass-lighthouse') return bool(quest.stormglassCompass || quest.chapterFourComplete) || discovered.has('stormglassCoast');
  if (landmark.id === 'mirrorfall-observatory') return bool(quest.convergenceCrown || quest.chapterFiveComplete) || discovered.has('mirrorfall');
  return discovered.has(landmark.mode);
}

export function defaultTravelState(quest={}) {
  const activated = ['bouncehome-shrine'];
  if (quest.beaconLens || quest.eastComplete) activated.push('eastern-beacon');
  if (quest.stormglassCompass || quest.chapterFourComplete) activated.push('stormglass-lighthouse');
  if (quest.convergenceCrown || quest.chapterFiveComplete) activated.push('mirrorfall-observatory');
  return { schema:LEGEND_TRAVEL_SCHEMA, schemaVersion:LEGEND_TRAVEL_VERSION, activatedLandmarks:uniq(activated), travelCount:0, lastTravelFrom:null, lastTravelTo:null };
}

export function normalizeTravelState(input={}, quest={}) {
  const base = defaultTravelState(quest);
  const raw = input && typeof input === 'object' ? input : {};
  const validIds = new Set(LEGEND_LANDMARKS.map((item)=>item.id));
  const activated = uniq([...(base.activatedLandmarks||[]), ...(raw.activatedLandmarks||[])]).filter((id)=>validIds.has(id));
  if ((quest.beaconLens || quest.eastComplete) && !activated.includes('eastern-beacon')) activated.push('eastern-beacon');
  if ((quest.stormglassCompass || quest.chapterFourComplete) && !activated.includes('stormglass-lighthouse')) activated.push('stormglass-lighthouse');
  if ((quest.convergenceCrown || quest.chapterFiveComplete) && !activated.includes('mirrorfall-observatory')) activated.push('mirrorfall-observatory');
  return {
    schema: LEGEND_TRAVEL_SCHEMA,
    schemaVersion: LEGEND_TRAVEL_VERSION,
    activatedLandmarks: activated,
    travelCount: int(raw.travelCount,0),
    lastTravelFrom: raw.lastTravelFrom ? String(raw.lastTravelFrom) : null,
    lastTravelTo: raw.lastTravelTo ? String(raw.lastTravelTo) : null,
  };
}

export function deriveTravelNetwork({ quest={}, discoveredLocations=[], travelState={} }={}) {
  const state = normalizeTravelState(travelState, quest);
  return LEGEND_LANDMARKS.map((landmark)=>{
    const unlocked=isLandmarkUnlocked(landmark,quest);
    const discovered=isLandmarkDiscovered(landmark,quest,discoveredLocations);
    const activated=state.activatedLandmarks.includes(landmark.id) && unlocked;
    return { ...landmark, unlocked, discovered, activated, safeMode: landmark.mode };
  });
}

export function activateLandmark(travelState, id, {quest={}, discoveredLocations=[], currentMode=''}={}) {
  const landmark=landmarkById(id);
  if (!landmark) throw new Error(`Unknown travel landmark: ${id}`);
  if (!isLandmarkDiscovered(landmark,quest,discoveredLocations)) throw new Error(`${landmark.name} has not been discovered.`);
  if (landmark.activation === 'manual' && currentMode !== landmark.mode) throw new Error(`${landmark.name} can only be activated while you are there.`);
  const next=normalizeTravelState(travelState,quest);
  next.activatedLandmarks=uniq([...next.activatedLandmarks,id]);
  return next;
}

export function recordFastTravel(travelState, fromId, toId, quest={}) {
  const next=normalizeTravelState(travelState,quest);
  if (!next.activatedLandmarks.includes(toId)) throw new Error('Fast travel destination is not activated.');
  next.travelCount += 1;
  next.lastTravelFrom = fromId || null;
  next.lastTravelTo = toId;
  return next;
}

export function currentLandmarkForMode(mode, network=[]) {
  return network.find((item)=>item.mode===mode && item.discovered) || null;
}
