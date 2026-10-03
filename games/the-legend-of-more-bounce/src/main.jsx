import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { DEFAULT_QUEST, buildLegendSave, normalizeLegendSave, listManualSlots, readAutosave, writeAutosave, writeSlot, deleteSlot, exportSaveFile, deriveInventory, deriveEquipment, deriveQuestLog, deriveBossRecords } from './save-system.js';
import { normalizeTravelState, deriveTravelNetwork, activateLandmark, recordFastTravel, currentLandmarkForMode } from './travel-system.js';
import heroSheet from '../assets/snes-v512/more-bounce-hero.v0.1.png';
import groveMap from '../assets/snes-v512/bouncehome-grove.map-background.png';
import wobbleStage from '../assets/snes-v513/wobble-woods.stage-base.png';
import wobbleTiles from '../assets/snes-v513/wobble-woods-tiles.v0.1.png';
import larrinaSheet from '../assets/snes-v514/larrina-character.v0.1.png';
import larrinaPortraits from '../assets/snes-v514/larrina-portraits.v0.1.png';
import towerRoom from '../assets/snes-v515/larrina-tower-room.v0.1.png';
import uiFrame from '../assets/snes-v516/shared-ui-dialogue-frame.v0.1.png';
import uiRuneChip from '../assets/snes-v516/shared-ui-rune-chip.v0.1.png';
import bounceEffects from '../assets/snes-v517/bounce-effects.v0.1.png';
import oldTempoSheet from '../assets/snes-v520/old-tempo-npc.v0.1.png';
import flatlingSheet from '../assets/snes-v520/flatling-enemy.v0.1.png';
import adventureItems from '../assets/snes-v520/adventure-items.v0.1.png';
import echoHollowStage from '../assets/snes-v520/echo-hollow.stage-base.v0.1.png';
import beatShrineRoom from '../assets/snes-v520/beat-shrine-room.v0.1.png';
import flatNoteBoss from '../assets/snes-v521/flat-note-boss.v0.1.png';
import flatNoteArena from '../assets/snes-v521/flat-note-arena.v0.1.png';
import bossItems from '../assets/snes-v521/boss-items.v0.1.png';
import miraReedSheet from '../assets/snes-v522/mira-reed-npc.v0.1.png';
import staticSpriteSheet from '../assets/snes-v522/static-sprite-enemy.v0.1.png';
import chapterTwoItems from '../assets/snes-v522/chapter-two-items.v0.1.png';
import eastwindMap from '../assets/snes-v522/eastwind-road.map.v0.1.png';
import glassgrassStage from '../assets/snes-v522/glassgrass-pass.stage.v0.1.png';
import signalMillRoom from '../assets/snes-v522/signal-mill-room.v0.1.png';
import tessaCoilSheet from '../assets/snes-v523/tessa-coil-npc.v0.1.png';
import bramGearrootSheet from '../assets/snes-v523/bram-gearroot-npc.v0.1.png';
import rustlingSheet from '../assets/snes-v523/rustling-enemy.v0.1.png';
import ironOrchardItems from '../assets/snes-v523/iron-orchard-items.v0.1.png';
import ironOrchardMap from '../assets/snes-v523/iron-orchard.map.v0.1.png';
import rustrootCavern from '../assets/snes-v523/rustroot-cavern.stage.v0.1.png';
import rivetForgeRoom from '../assets/snes-v523/rivet-forge-room.v0.1.png';
import rustbloomWardenSheet from '../assets/snes-v523/rustbloom-warden.v0.1.png';
import rustbloomArena from '../assets/snes-v523/rustbloom-warden-arena.v0.1.png';
import legendWorldMap from '../assets/snes-v527/legend-world-map.v0.3.png';
import sableCurrentSheet from '../assets/snes-v526/sable-current-npc.v0.1.png';
import stormglassItems from '../assets/snes-v526/stormglass-items.v0.1.png';
import stormglassCoastMap from '../assets/snes-v526/stormglass-coast.map.v0.1.png';
import stormglassCliffsStage from '../assets/snes-v526/stormglass-cliffs.stage.v0.1.png';
import tideEngineRoom from '../assets/snes-v526/tide-engine-room.v0.1.png';
import undertowBellSheet from '../assets/snes-v526/undertow-bell.v0.1.png';
import undertowBellArena from '../assets/snes-v526/undertow-bell-arena.v0.1.png';
import perriPrismSheet from '../assets/snes-v527/perri-prism-npc.v0.1.png';
import convergenceItems from '../assets/snes-v527/convergence-items.v0.1.png';
import mirrorfallMap from '../assets/snes-v527/mirrorfall-basin.map.v0.1.png';
import splitlightStage from '../assets/snes-v527/splitlight-causeway.stage.v0.1.png';
import observatoryRoom from '../assets/snes-v527/triune-observatory-room.v0.1.png';
import blindAngleSheet from '../assets/snes-v527/blind-angle.v0.1.png';
import blindAngleArena from '../assets/snes-v527/blind-angle-arena.v0.1.png';

import titleTheme from '../assets/audio-v519/title-theme.v0.1.wav';
import overworldTheme from '../assets/audio-v519/bouncehome-grove-theme.v0.1.wav';
import woodsTheme from '../assets/audio-v519/wobble-woods-theme.v0.1.wav';
import towerTheme from '../assets/audio-v519/larrina-tower-theme.v0.1.wav';
import bounceSfx from '../assets/audio-v519/bounce-impact.v0.1.wav';
import runeSfx from '../assets/audio-v519/rune-pickup.v0.1.wav';
import gateSfx from '../assets/audio-v519/echo-gate-open.v0.1.wav';
import dialogueSfx from '../assets/audio-v519/dialogue-blip.v0.1.wav';
import hitSfx from '../assets/audio-v519/hit.v0.1.wav';
import endingSfx from '../assets/audio-v519/ending-sting.v0.1.wav';
import bossTheme from '../assets/audio-v521/flat-note-boss-theme.v0.1.wav';
import bossBreakSfx from '../assets/audio-v521/boss-break.v0.1.wav';
import bossDefeatSfx from '../assets/audio-v521/boss-defeat.v0.1.wav';
import eastRoadTheme from '../assets/audio-v522/eastwind-road-theme.v0.1.wav';
import glassgrassTheme from '../assets/audio-v522/glassgrass-pass-theme.v0.1.wav';
import signalMillTheme from '../assets/audio-v522/signal-mill-theme.v0.1.wav';
import echoBootsSfx from '../assets/audio-v522/echo-boots-upgrade.v0.1.wav';
import beaconSfx from '../assets/audio-v522/beacon-restored.v0.1.wav';
import ironOrchardTheme from '../assets/audio-v523/iron-orchard-theme.v0.1.wav';
import rustrootTheme from '../assets/audio-v523/rustroot-cavern-theme.v0.1.wav';
import rivetForgeTheme from '../assets/audio-v523/rivet-forge-theme.v0.1.wav';
import rustbloomTheme from '../assets/audio-v523/rustbloom-warden-theme.v0.1.wav';
import bracerSfx from '../assets/audio-v523/resonance-bracer-upgrade.v0.1.wav';
import ironBlossomSfx from '../assets/audio-v523/iron-blossom-victory.v0.1.wav';
import stormglassCoastTheme from '../assets/audio-v526/stormglass-coast-theme.v0.1.wav';
import stormglassCliffsTheme from '../assets/audio-v526/stormglass-cliffs-theme.v0.1.wav';
import tideEngineTheme from '../assets/audio-v526/tide-engine-theme.v0.1.wav';
import undertowBellTheme from '../assets/audio-v526/undertow-bell-theme.v0.1.wav';
import galeMantleSfx from '../assets/audio-v526/gale-mantle-upgrade.v0.1.wav';
import stormglassCompassSfx from '../assets/audio-v526/stormglass-compass-victory.v0.1.wav';
import mirrorfallTheme from '../assets/audio-v527/mirrorfall-basin-theme.v0.1.wav';
import splitlightTheme from '../assets/audio-v527/splitlight-causeway-theme.v0.1.wav';
import observatoryTheme from '../assets/audio-v527/triune-observatory-theme.v0.1.wav';
import blindAngleTheme from '../assets/audio-v527/blind-angle-theme.v0.1.wav';
import viewShiftSfx from '../assets/audio-v527/view-shift.v0.1.wav';
import convergenceVictorySfx from '../assets/audio-v527/convergence-victory.v0.1.wav';


const CARTRIDGE_TITLE = 'The Legend of More Bounce';
const VERSION = '1.8.0 — Chapter Five: Three-View Convergence';

const MUSIC_BY_MODE = {
  title: titleTheme,
  overworld: overworldTheme,
  wobble: woodsTheme,
  hollow: woodsTheme,
  shrine: towerTheme,
  tower: towerTheme,
  boss: bossTheme,
  eastRoad: eastRoadTheme,
  glassgrass: glassgrassTheme,
  signalMill: signalMillTheme,
  ironOrchard: ironOrchardTheme,
  rustroot: rustrootTheme,
  rivetForge: rivetForgeTheme,
  rustbloomBoss: rustbloomTheme,
  stormglassCoast: stormglassCoastTheme,
  stormglassCliffs: stormglassCliffsTheme,
  tideEngine: tideEngineTheme,
  undertowBoss: undertowBellTheme,
  mirrorfall: mirrorfallTheme,
  splitlight: splitlightTheme,
  observatory: observatoryTheme,
  blindAngleBoss: blindAngleTheme,
};
const SFX = { bounce: bounceSfx, rune: runeSfx, gate: gateSfx, dialogue: dialogueSfx, hit: hitSfx, ending: endingSfx, bossBreak: bossBreakSfx, bossDefeat: bossDefeatSfx, echoBoots: echoBootsSfx, beacon: beaconSfx, bracer: bracerSfx, ironBlossom: ironBlossomSfx, galeMantle: galeMantleSfx, stormglassCompass: stormglassCompassSfx, viewShift: viewShiftSfx, convergenceVictory: convergenceVictorySfx };

function useAudioDirector(mode) {
  const [enabled, setEnabled] = useState(false);
  const musicRef = useRef(null);
  const endingPlayedRef = useRef(false);
  const stopMusic = () => {
    if (!musicRef.current) return;
    musicRef.current.pause();
    musicRef.current.currentTime = 0;
    musicRef.current = null;
  };
  const playSfx = (src, volume = 0.55) => {
    if (!enabled || !src) return;
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  };
  useEffect(() => {
    if (!enabled) { stopMusic(); return; }
    if (mode === 'ending') {
      stopMusic();
      if (!endingPlayedRef.current) {
        endingPlayedRef.current = true;
        const sting = new Audio(endingSfx);
        sting.volume = 0.62;
        sting.play().catch(() => {});
      }
      return;
    }
    endingPlayedRef.current = false;
    const src = MUSIC_BY_MODE[mode];
    if (!src) { stopMusic(); return; }
    if (musicRef.current?.dataset?.src === src) return;
    stopMusic();
    const music = new Audio(src);
    music.dataset.src = src;
    music.loop = true;
    music.volume = 0.28;
    musicRef.current = music;
    music.play().catch(() => {});
  }, [mode, enabled]);
  useEffect(() => () => stopMusic(), []);
  return {
    enabled,
    enable: () => setEnabled(true),
    toggle: () => setEnabled((value) => !value),
    play: (name, volume) => playSfx(SFX[name], volume),
  };
}

function PixelAvatar({ small = false, frame = 0 }) {
  const safeFrame = Math.max(0, Math.min(22, frame));
  return <span className={small ? 'pixel-avatar small' : 'pixel-avatar'} role="img" aria-label="More Bounce pixel hero" style={{ backgroundImage: `url(${heroSheet})`, backgroundPosition: `${-safeFrame * 32}px 0` }} />;
}
function OldTempo({ frame = 0 }) {
  return <span className="old-tempo-sprite" role="img" aria-label="Old Tempo" style={{ backgroundImage: `url(${oldTempoSheet})`, backgroundPosition: `${-(frame % 4) * 24}px 0` }} />;
}
function Flatling({ frame = 0, defeated = false }) {
  return <span className={defeated ? 'flatling-sprite defeated' : 'flatling-sprite'} role="img" aria-label="Flatling enemy" style={{ backgroundImage: `url(${flatlingSheet})`, backgroundPosition: `${-(frame % 8) * 24}px 0` }} />;
}
function ItemIcon({ index = 0, label = 'Quest item' }) {
  return <span className="adventure-item" role="img" aria-label={label} style={{ backgroundImage: `url(${adventureItems})`, backgroundPosition: `${-index * 16}px 0` }} />;
}
function BossItem({ index = 0, label = 'Boss item' }) {
  return <span className="boss-item" role="img" aria-label={label} style={{ backgroundImage: `url(${bossItems})`, backgroundPosition: `${-index * 16}px 0` }} />;
}
function FlatNoteSprite({ frame = 0, defeated = false }) {
  return <span className={defeated ? 'flat-note-sprite defeated' : 'flat-note-sprite'} role="img" aria-label="The Flat Note boss" style={{ backgroundImage: `url(${flatNoteBoss})`, backgroundPosition: `${-(frame % 8) * 64}px 0` }} />;
}

function PerriPrism({ frame=0 }) { return <span className="perri-prism-sprite" role="img" aria-label="Perri Prism" style={{ backgroundImage:`url(${perriPrismSheet})`, backgroundPosition:`${-(frame%4)*24}px 0` }} />; }
function ConvergenceItem({ index=0, label='Convergence item' }) { return <span className="convergence-item" role="img" aria-label={label} style={{ backgroundImage:`url(${convergenceItems})`, backgroundPosition:`${-index*16}px 0` }} />; }
function BlindAngleSprite({ frame=0, defeated=false }) { return <span className={defeated?'blind-angle-sprite defeated':'blind-angle-sprite'} role="img" aria-label="The Blind Angle boss" style={{ backgroundImage:`url(${blindAngleSheet})`, backgroundPosition:`${-(frame%8)*64}px 0` }} />; }

function MiraReed({ frame = 0 }) { return <span className="mira-reed-sprite" role="img" aria-label="Mira Reed the Wayfinder" style={{ backgroundImage:`url(${miraReedSheet})`, backgroundPosition:`${-(frame%4)*24}px 0` }} />; }
function StaticSprite({ frame = 0, defeated = false }) { return <span className={defeated?'static-sprite-enemy defeated':'static-sprite-enemy'} role="img" aria-label="Static Sprite enemy" style={{ backgroundImage:`url(${staticSpriteSheet})`, backgroundPosition:`${-(frame%8)*24}px 0` }} />; }
function ChapterTwoItem({ index = 0, label = 'Chapter Two item' }) { return <span className="chapter-two-item" role="img" aria-label={label} style={{backgroundImage:`url(${chapterTwoItems})`,backgroundPosition:`${-index*16}px 0`}}/>; }

function TessaCoil({ frame = 0 }) { return <span className="iron-npc-sprite" role="img" aria-label="Tessa Coil" style={{backgroundImage:`url(${tessaCoilSheet})`,backgroundPosition:`${-(frame%4)*24}px 0`}}/>; }
function BramGearroot({ frame = 0 }) { return <span className="iron-npc-sprite" role="img" aria-label="Bram Gearroot" style={{backgroundImage:`url(${bramGearrootSheet})`,backgroundPosition:`${-(frame%4)*24}px 0`}}/>; }
function Rustling({ frame = 0, defeated = false }) { return <span className={defeated?'rustling-sprite defeated':'rustling-sprite'} role="img" aria-label="Rustling armored enemy" style={{backgroundImage:`url(${rustlingSheet})`,backgroundPosition:`${-(frame%8)*24}px 0`}}/>; }
function IronItem({ index=0, label='Iron Orchard item' }) { return <span className="iron-item" role="img" aria-label={label} style={{backgroundImage:`url(${ironOrchardItems})`,backgroundPosition:`${-index*16}px 0`}}/>; }
function RustbloomWardenSprite({ frame=0, defeated=false }) { return <span className={defeated?'rustbloom-sprite defeated':'rustbloom-sprite'} role="img" aria-label="Rustbloom Warden" style={{backgroundImage:`url(${rustbloomWardenSheet})`,backgroundPosition:`${-(frame%8)*64}px 0`}}/>; }

function SableCurrent({ frame = 0 }) { return <span className="stormglass-npc-sprite" role="img" aria-label="Sable Current the Tidekeeper" style={{backgroundImage:`url(${sableCurrentSheet})`,backgroundPosition:`${-(frame%4)*24}px 0`}}/>; }
function StormglassItem({ index=0, label='Stormglass item' }) { return <span className="stormglass-item" role="img" aria-label={label} style={{backgroundImage:`url(${stormglassItems})`,backgroundPosition:`${-index*16}px 0`}}/>; }
function UndertowBellSprite({ frame=0, defeated=false }) { return <span className={defeated?'undertow-bell-sprite defeated':'undertow-bell-sprite'} role="img" aria-label="The Undertow Bell" style={{backgroundImage:`url(${undertowBellSheet})`,backgroundPosition:`${-(frame%8)*64}px 0`}}/>; }


const LARRINA_PORTRAIT_INDEX = { neutral: 0, smile: 1, concern: 2, surprised: 3 };
function LarrinaPortrait({ expression = 'neutral' }) {
  const frame = LARRINA_PORTRAIT_INDEX[expression] ?? 0;
  return <span className="larrina-real-portrait" role="img" aria-label={`Princess Larrina — ${expression}`} style={{ backgroundImage: `url(${larrinaPortraits})`, backgroundPosition: `${-frame * 96}px 0` }} />;
}
function LarrinaCharacter({ frame = 0 }) {
  return <span className="larrina-real-character" role="img" aria-label="Princess Larrina" style={{ backgroundImage: `url(${larrinaSheet})`, backgroundPosition: `${-Math.max(0, Math.min(23, frame)) * 32}px 0` }} />;
}

function modeCategory(mode) {
  if (['wobble', 'hollow', 'boss', 'glassgrass', 'rustroot', 'rustbloomBoss', 'stormglassCliffs', 'undertowBoss'].includes(mode)) return 'side';
  if (['shrine', 'tower', 'signalMill', 'rivetForge', 'tideEngine'].includes(mode)) return 'first';
  if (['eastRoad','ironOrchard','stormglassCoast'].includes(mode)) return 'overworld';
  return mode;
}
function ModeRail({ mode }) {
  const current = modeCategory(mode);
  const steps = [['overworld', 'I', 'Overworld'], ['side', 'II', 'Side View'], ['first', 'III', 'First Person'], ['ending', '★', 'Legend']];
  return <nav className="mode-rail" aria-label="Tri-view cartridge progress">{steps.map(([id, numeral, label]) => <div className={current === id ? 'mode-step active' : 'mode-step'} key={id}><span>{numeral}</span><small>{label}</small></div>)}</nav>;
}

function Header({ mode, quest, soundEnabled, onToggleSound, onOpenSave, onOpenJournal, onOpenMap }) {
  return <header className="game-header">
    <div className="brand-lockup"><PixelAvatar small /><div><p className="eyebrow">PixelForge Studio • Parallax Adventure</p><h1>{CARTRIDGE_TITLE}</h1><p className="version">{VERSION}</p></div></div>
    <div className="quest-strip" aria-label="Quest inventory">
      <span className={quest.rune ? 'quest-chip earned final-ui-art' : 'quest-chip final-ui-art'} style={{ backgroundImage: `url(${uiRuneChip})` }}><ItemIcon index={1} label="Bounce Rune" /> Rune {quest.rune ? '✓' : '—'}</span>
      <span className={quest.shards >= 3 ? 'quest-chip earned' : 'quest-chip'}><ItemIcon index={1} label="Echo Shard" /> Shards {quest.shards}/3</span>
      <span className={quest.crest ? 'quest-chip earned' : 'quest-chip'}><ItemIcon index={2} label="Rhythm Crest" /> Crest {quest.crest ? '✓' : '—'}</span>
      <span className={quest.seal ? 'quest-chip earned' : 'quest-chip'}><BossItem index={0} label="Resonance Seal" /> Seal {quest.seal ? '✓' : '—'}</span>
      <span className={quest.echoBoots ? 'quest-chip earned' : 'quest-chip'}><ChapterTwoItem index={0} label="Echo Boots" /> Boots {quest.echoBoots ? '✓' : '—'}</span>
      <span className={quest.beaconLens ? 'quest-chip earned' : 'quest-chip'}><ChapterTwoItem index={2} label="Beacon Lens" /> Lens {quest.beaconLens ? '✓' : '—'}</span>
      <span className={quest.resonanceBracer ? 'quest-chip earned' : 'quest-chip'}><IronItem index={1} label="Resonance Bracer" /> Bracer {quest.resonanceBracer ? '✓' : '—'}</span>
      <span className={quest.ironBlossom ? 'quest-chip earned' : 'quest-chip'}><IronItem index={3} label="Iron Blossom" /> Blossom {quest.ironBlossom ? '✓' : '—'}</span>
      <span className={quest.galeMantle ? 'quest-chip earned' : 'quest-chip'}><StormglassItem index={1} label="Gale Mantle" /> Mantle {quest.galeMantle ? '✓' : '—'}</span>
      <span className={quest.stormglassCompass ? 'quest-chip earned' : 'quest-chip'}><StormglassItem index={3} label="Stormglass Compass" /> Compass {quest.stormglassCompass ? '✓' : '—'}</span>
    </div>
    <div className="header-tools"><button className="save-tool-button map-tool-button" onClick={onOpenMap}>⌖ MAP</button><button className="save-tool-button" onClick={onOpenJournal}>☰ JOURNAL</button><button className="save-tool-button" onClick={onOpenSave}>▣ SAVE</button><button className="sound-toggle" onClick={onToggleSound} aria-pressed={soundEnabled}>{soundEnabled ? '♫ SOUND ON' : '♫ SOUND OFF'}</button></div>
    <ModeRail mode={mode} />
  </header>;
}

function TitleScreen({ onStart, onContinue, continueAvailable, onOpenSave, soundEnabled, onToggleSound }) {
  return <section className="mode-panel title-panel" aria-labelledby="title-screen-heading">
    <div className="title-sky" aria-hidden="true"><div className="title-moon" /><div className="title-stars">✦ · ✧ · ✦ · ✧ · ✦</div><div className="title-ridge ridge-far" /><div className="title-ridge ridge-near" /><div className="title-hero"><PixelAvatar /></div><div className="title-tower">♛</div></div>
    <div className="title-copy"><p className="mode-kicker">PF_GOLD_STANDARD_001 · CHAPTER FIVE / THREE-VIEW CONVERGENCE</p><h2 id="title-screen-heading">The Legend of<br/><span>More Bounce</span></h2><p>Five chapters now persist between sessions. The Stormglass Compass points to Mirrorfall Basin, where top-down, side-view and first-person actions all modify the same puzzle state.</p><div className="title-actions"><button className="primary-button title-start" onClick={onStart}>NEW ADVENTURE ✦</button>{continueAvailable && <button className="primary-button continue-button" onClick={onContinue}>CONTINUE AUTOSAVE →</button>}<button className="secondary-button" onClick={onOpenSave}>SAVE SLOTS</button><button className="secondary-button" onClick={onToggleSound}>{soundEnabled ? '♫ SOUND ON' : '♫ TURN SOUND ON'}</button></div><small>v5.27 Chapter Five · Three-View Convergence candidate</small></div>
  </section>;
}


function SaveMenu({ open, onClose, slots, autosave, currentSave, onSave, onLoad, onDelete, onExport, onImport }) {
  if (!open) return null;
  const slotLabel = (save) => save ? `CH ${save.checkpoint.chapter} · ${save.checkpoint.label}` : 'EMPTY SLOT';
  return <div className="legend-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="legend-modal save-menu" role="dialog" aria-modal="true" aria-labelledby="save-menu-title"><header><div><p className="mode-kicker">PIXELFORGE SAVE SYSTEM · v5.26</p><h2 id="save-menu-title">Adventure Save Slots</h2></div><button className="modal-close" onClick={onClose}>×</button></header><div className="current-checkpoint"><strong>CURRENT CHECKPOINT</strong><span>{currentSave.checkpoint.label}</span><small>Safe resume: {currentSave.resume.safeMode} · Playtime {Math.floor(currentSave.playtimeSeconds / 60)}m {currentSave.playtimeSeconds % 60}s</small></div><div className="save-slot-grid">{slots.map(({ slot, save }) => <article className="save-slot" key={slot}><div><span className="slot-number">SLOT {slot}</span><strong>{slotLabel(save)}</strong>{save && <small>{new Date(save.savedAt).toLocaleString()} · {Math.floor(save.playtimeSeconds / 60)}m</small>}</div><div className="slot-actions"><button onClick={() => onSave(slot)}>SAVE</button><button disabled={!save} onClick={() => onLoad(save)}>LOAD</button><button disabled={!save} onClick={() => onDelete(slot)}>DELETE</button></div></article>)}</div><article className="save-slot autosave-slot"><div><span className="slot-number">AUTOSAVE</span><strong>{slotLabel(autosave)}</strong>{autosave && <small>{new Date(autosave.savedAt).toLocaleString()}</small>}</div><div className="slot-actions"><button disabled={!autosave} onClick={() => onLoad(autosave)}>CONTINUE</button><button onClick={() => onExport(currentSave)}>EXPORT CURRENT</button><label className="import-save">IMPORT JSON<input type="file" accept="application/json,.json" onChange={onImport}/></label></div></article><p className="save-boundary">Local browser storage only. No cloud account, network sync, or telemetry. Manual saves resume from safe checkpoints rather than volatile mid-jump/mid-boss state.</p></section></div>;
}

function WorldMapModal({ open, onClose, quest, visitedModes, travelState, currentMode, onActivate, onTravel }) {
  if (!open) return null;
  const network = deriveTravelNetwork({ quest, discoveredLocations: visitedModes, travelState });
  const current = currentLandmarkForMode(currentMode, network);
  const activeCount = network.filter((item) => item.activated).length;
  return <div className="legend-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="legend-modal world-travel-menu" role="dialog" aria-modal="true" aria-labelledby="world-map-title"><header><div><p className="mode-kicker">MORE BOUNCE'S WORLD MAP · v5.26</p><h2 id="world-map-title">Shrines · Beacons · Fast Travel</h2></div><button className="modal-close" onClick={onClose}>×</button></header><div className="travel-summary"><strong>{activeCount}/{network.length} LANDMARKS ACTIVE</strong><span>{current ? `Current region: ${current.region}` : 'Current scene has no travel shrine.'}</span><small>Discovery reveals a node. First arrival/quest activation lights it. Travel only targets activated safe scenes.</small></div><div className="travel-map" style={{backgroundImage:`url(${legendWorldMap})`}}>{network.map((landmark) => {
    const currentHere = current?.id === landmark.id;
    const canActivate = landmark.discovered && !landmark.activated && currentMode === landmark.mode;
    const canTravel = landmark.activated && !currentHere;
    const stateClass = !landmark.discovered ? 'hidden-landmark' : landmark.activated ? 'activated-landmark' : 'discovered-landmark';
    return <button key={landmark.id} className={`travel-pin ${stateClass} ${currentHere ? 'current-landmark' : ''}`} style={{left:`${landmark.x}%`,top:`${landmark.y}%`}} disabled={!landmark.discovered} onClick={() => canActivate ? onActivate(landmark.id) : canTravel ? onTravel(landmark.id) : undefined}><span className="travel-pin-icon">{landmark.discovered ? landmark.icon : '?'}</span><b>{landmark.discovered ? landmark.name : 'UNDISCOVERED'}</b><small>{currentHere ? 'YOU ARE HERE' : landmark.activated ? 'FAST TRAVEL' : canActivate ? 'ACTIVATE' : landmark.discovered ? 'SHRINE DORMANT' : '???'}</small></button>;
  })}</div><div className="travel-legend"><span>✦ Activated</span><span>◇ Discovered / dormant</span><span>? Undiscovered</span></div><p className="save-boundary">Fast travel never unlocks content, grants quest rewards, or resumes volatile combat. It moves only between activated landmark scenes already earned through normal play.</p></section></div>;
}

function JournalModal({ open, onClose, quest, visitedModes, checkpoint }) {
  if (!open) return null;
  const inventory = deriveInventory(quest), equipment = deriveEquipment(quest), quests = deriveQuestLog(quest), bosses = deriveBossRecords(quest);
  return <div className="legend-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="legend-modal journal-menu" role="dialog" aria-modal="true" aria-labelledby="journal-title"><header><div><p className="mode-kicker">MORE BOUNCE'S FIELD JOURNAL</p><h2 id="journal-title">Inventory · Equipment · Quests</h2></div><button className="modal-close" onClick={onClose}>×</button></header><div className="journal-checkpoint"><span>CHECKPOINT</span><strong>{checkpoint.label}</strong></div><div className="journal-grid"><article><h3>Equipment</h3>{equipment.map((item) => <div className={item.equipped ? 'journal-row equipped' : 'journal-row'} key={item.id}><span>{item.equipped ? '◆' : '◇'} {item.name}</span><small>{item.equipped ? item.effect : 'Not acquired'}</small></div>)}</article><article><h3>Inventory</h3>{inventory.length ? inventory.map((item) => <div className="journal-row" key={item.id}><span>▣ {item.name}</span><small>{item.type}</small></div>) : <p className="empty-note">The bag is suspiciously light.</p>}</article><article className="quest-journal"><h3>Quest Log</h3>{quests.map((q) => <div className="quest-card" key={q.id}><strong>CH {q.chapter} · {q.title} {q.complete ? '✓' : ''}</strong>{q.steps.map((step) => <span className={step.complete ? 'done' : ''} key={step.label}>{step.complete ? '✓' : '○'} {step.label}</span>)}</div>)}</article><article><h3>World & Bosses</h3><div className="journal-row"><span>Discovered scenes</span><small>{visitedModes.length}</small></div>{[...new Set(visitedModes)].map((mode) => <div className="journal-row compact" key={mode}><span>• {mode}</span></div>)}<h3 className="boss-heading">Boss Record</h3>{bosses.map((boss) => <div className={boss.defeated ? 'journal-row equipped' : 'journal-row'} key={boss.id}><span>{boss.defeated ? '★' : '☆'} {boss.name}</span><small>{boss.defeated ? `Defeated · ${boss.reward}` : 'Unresolved'}</small></div>)}</article></div><p className="save-boundary">Journal status is derived from the saveable adventure state. It does not invent hidden completion or human review outcomes.</p></section></div>;
}

const WORLD_NODES = [
  { id: 'grove', label: 'Bouncehome', icon: '⌂', x: 14, y: 70, note: 'Home base. The paths have multiplied.' },
  { id: 'pond', label: 'Moon Pond', icon: '◔', x: 31, y: 39, note: 'An old traveler taps a staff beside the water.' },
  { id: 'ruin', label: 'Old Ruin', icon: '▥', x: 44, y: 62, note: 'A mossy chest is wedged behind a broken wall.' },
  { id: 'woods', label: 'Wobble Woods', icon: '♣', x: 60, y: 36, note: 'The Bounce Rune still hums beyond the platforms.' },
  { id: 'hollow', label: 'Echo Hollow', icon: '◆', x: 72, y: 62, note: 'Flatlings guard three crystalline Echo Shards.' },
  { id: 'tower', label: 'Larrina Tower', icon: '♛', x: 86, y: 23, note: 'The Tower responds to the Rhythm Crest — but a flat pulse is blocking the final road.' },
];

function Overworld({ quest, setQuest, enter, playSfx }) {
  const [focus, setFocus] = useState('grove');
  const [message, setMessage] = useState('The grove is wider than it looked from the first road.');
  const node = WORLD_NODES.find((item) => item.id === focus);
  const act = () => {
    if (focus === 'pond') {
      if (!quest.oldTempoMet) { setQuest((q) => ({ ...q, oldTempoMet: true })); playSfx('dialogue', .32); setMessage('Old Tempo: “Moon. Rune. Bounce. Remember that order. And take the ruin key-path before the Hollow.”'); }
      else setMessage('Old Tempo taps three beats on his staff: Moon. Rune. Bounce.');
      return;
    }
    if (focus === 'ruin') {
      if (!quest.oldTempoMet) { setMessage('The chest lock has three strange rhythm marks. Maybe somebody nearby knows them.'); return; }
      if (!quest.groveKey) { setQuest((q) => ({ ...q, groveKey: true })); playSfx('rune', .42); setMessage('CHEST OPENED! You found the Grove Key — an old bronze key with a tiny bouncing note engraved in it.'); }
      else setMessage('The old chest is empty now, but the lid still smells faintly like cedar and adventure.');
      return;
    }
    if (focus === 'woods') { enter('wobble'); return; }
    if (focus === 'hollow') {
      if (!quest.rune) { setMessage('The Hollow refuses to open. Something in Wobble Woods is still calling you.'); return; }
      if (!quest.groveKey) { setMessage('A bronze keyhole glints in the root-door. The Old Ruin probably matters.'); return; }
      enter('hollow'); return;
    }
    if (focus === 'tower') {
      if (!quest.crest && quest.shards < 3) { setMessage('The Tower is awake, but the road bends away. Three Echo Shards are missing.'); return; }
      if (!quest.crest) { enter('shrine'); return; }
      if (!quest.seal) { enter('boss'); return; }
      enter('tower'); return;
    }
    setMessage('Bouncehome is safe. For now. The bass note keeps pulling east.');
  };
  const actionLabel = focus === 'pond' ? (quest.oldTempoMet ? 'Hear the clue again' : 'Talk to Old Tempo') : focus === 'ruin' ? (quest.groveKey ? 'Inspect the empty chest' : 'Open the old chest') : focus === 'woods' ? 'Enter Wobble Woods →' : focus === 'hollow' ? 'Enter Echo Hollow →' : focus === 'tower' ? (quest.seal ? 'Enter Larrina Tower →' : quest.crest ? 'Descend to The Flat Note →' : quest.shards >= 3 ? 'Enter the Beat Shrine →' : 'Approach the Tower road') : 'Look around';
  return <section className="mode-panel overworld-panel adventure-overworld" aria-labelledby="overworld-title">
    <div className="panel-copy"><p className="mode-kicker">MODE I · EXPANDED OVERWORLD</p><h2 id="overworld-title">Bouncehome has secrets now.</h2><p>Follow clues, recover the Grove Key, claim the Bounce Rune, and open the route into Echo Hollow.</p></div>
    <div className="world-map" role="group" aria-label="Expanded Bouncehome overworld"><img className="world-map-pixel-bg" src={groveMap} alt="" aria-hidden="true" />{WORLD_NODES.map((item) => <button key={item.id} className={focus === item.id ? 'world-node active' : 'world-node'} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => { setFocus(item.id); setMessage(item.note); }} aria-pressed={focus === item.id}><span className="node-icon">{item.icon}</span><span>{item.label}</span></button>)}<div className="map-hero" style={{ left: `${node.x + 2}%`, top: `${node.y - 10}%` }}><PixelAvatar small /></div>{focus === 'pond' && <div className="map-npc"><OldTempo frame={quest.oldTempoMet ? 2 : 0} /></div>}</div>
    <div className="map-readout adventure-readout"><div><strong>{node.label}</strong><span>{message}</span></div><button className="primary-button" onClick={act}>{actionLabel}</button></div>
    <div className="quest-log"><span className={quest.oldTempoMet ? 'done' : ''}>Talk to Old Tempo</span><span className={quest.groveKey ? 'done' : ''}>Find Grove Key</span><span className={quest.rune ? 'done' : ''}>Claim Bounce Rune</span><span className={quest.shards >= 3 ? 'done' : ''}>Recover 3 Echo Shards</span><span className={quest.crest ? 'done' : ''}>Restore Rhythm Crest</span><span className={quest.seal ? 'done' : ''}>Defeat The Flat Note</span></div>
  </section>;
}

const effectFrames = { 'bounce-impact': { start: 0, frames: 4, ms: 360 }, 'rune-pickup': { start: 4, frames: 4, ms: 520 }, 'gate-open': { start: 8, frames: 5, ms: 650 }, sparkle: { start: 13, frames: 4, ms: 620 }, hit: { start: 17, frames: 3, ms: 320 } };
function EffectSprite({ type, left, bottom, id }) { const spec = effectFrames[type]; if (!spec) return null; return <div key={id} className={`pixel-effect fx-${type}`} style={{ left, bottom, backgroundImage: `url(${bounceEffects})`, '--fx-start': `${-spec.start * 32}px`, '--fx-end': `${-(spec.start + spec.frames) * 32}px`, '--fx-steps': spec.frames, '--fx-ms': `${spec.ms}ms` }} aria-hidden="true" />; }

function WobbleWoods({ quest, setQuest, onExit, playSfx }) {
  const [x, setX] = useState(7); const [jumping, setJumping] = useState(false); const [message, setMessage] = useState(quest.rune ? 'The Rune remembers you. Reach the west trail to return.' : 'Move right. The forest is keeping rhythm with you.'); const [effect, setEffect] = useState(null); const [gateFxShown, setGateFxShown] = useState(false);
  const triggerEffect = (type, left, bottom) => { const spec = effectFrames[type]; const id = `${type}-${Date.now()}-${Math.random()}`; setEffect({ type, left, bottom, id }); window.setTimeout(() => setEffect((current) => current?.id === id ? null : current), (spec?.ms || 500) + 60); };
  const move = (delta) => setX((current) => { const next = Math.max(4, Math.min(91, current + delta)); if (next >= 58 && !quest.rune) { triggerEffect('rune-pickup', '58%', '41%'); playSfx('rune', .62); setQuest((q) => ({ ...q, rune: true })); setMessage('BOING! The Bounce Rune snaps into your inventory.'); } else if (next >= 86 && quest.rune) { if (!gateFxShown) { triggerEffect('gate-open', '88%', '37%'); playSfx('gate', .62); setGateFxShown(true); } setMessage('The Rune reveals a return path to the expanded grove.'); } return next; });
  const jump = () => { if (jumping) return; setJumping(true); triggerEffect('bounce-impact', `${x}%`, '18%'); playSfx('bounce', .48); setMessage('More Bounce does, in fact, bounce.'); window.setTimeout(() => setJumping(false), 420); };
  useEffect(() => { const key = (event) => { if (['ArrowLeft', 'a', 'A'].includes(event.key)) move(-7); if (['ArrowRight', 'd', 'D'].includes(event.key)) move(7); if (['ArrowUp', 'w', 'W', ' '].includes(event.key)) { event.preventDefault(); jump(); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); });
  return <section className="mode-panel side-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE II-A · SIDE-VIEW ACTION</p><h2>Wobble Woods</h2><p>Claim the Bounce Rune, then take the Echo Gate back to the expanded overworld.</p></div><div className="side-stage wobble-art-stage" style={{ backgroundImage: `url(${wobbleStage})` }}><div className={quest.rune ? 'rune-pickup art-tile collected' : 'rune-pickup art-tile'} style={{ backgroundImage: `url(${wobbleTiles})`, backgroundPosition: '-176px 0' }} /><div className={quest.rune ? 'echo-gate art-tile open' : 'echo-gate art-tile'} style={{ backgroundImage: `url(${wobbleTiles})`, backgroundPosition: '-160px 0' }}><small>{quest.rune ? 'OPEN' : 'LOCKED'}</small></div>{effect && <EffectSprite {...effect} />}<div className={jumping ? 'side-hero jumping' : 'side-hero'} style={{ left: `${x}%` }}><PixelAvatar frame={jumping ? 13 : (Math.floor(x / 7) % 4) + 4} /></div><div className="wobble-art-credit">ORIGINAL WOBBLE WOODS + EFFECTS · v5.20</div></div><div className="side-hud"><div className="message-box">{message}</div><div className="controls"><button onClick={() => move(-7)}>←</button><button onClick={jump}>BOUNCE</button><button onClick={() => move(7)}>→</button></div>{x >= 84 && quest.rune && <button className="primary-button gate-button" onClick={onExit}>Return to Bouncehome →</button>}</div></section>;
}

function EchoHollow({ quest, setQuest, onExit, playSfx }) {
  const [x, setX] = useState(7); const [jumping, setJumping] = useState(false); const [hearts, setHearts] = useState(3); const [defeated, setDefeated] = useState([false, false, false]); const [message, setMessage] = useState('Three Flatlings wobble between you and the sealed root-door.');
  const enemyX = [27, 51, 73];
  const defeatNear = () => { const i = enemyX.findIndex((pos, idx) => !defeated[idx] && Math.abs(pos - x) <= 10); if (i < 0) { setMessage('BOUNCE! No Flatling underfoot — but the Hollow echoes approvingly.'); return; } const next = [...defeated]; next[i] = true; setDefeated(next); setQuest((q) => ({ ...q, shards: Math.min(3, q.shards + 1) })); playSfx('rune', .5); setMessage(`FLATLING ${i + 1} POPPED! An Echo Shard drops into your bag.`); };
  const jump = () => { if (jumping) return; setJumping(true); playSfx('bounce', .48); defeatNear(); window.setTimeout(() => setJumping(false), 420); };
  const move = (delta) => setX((current) => { const nextX = Math.max(4, Math.min(91, current + delta)); const collision = enemyX.findIndex((pos, idx) => !defeated[idx] && Math.abs(pos - nextX) < 5); if (collision >= 0 && !jumping) { playSfx('hit', .6); setHearts((h) => Math.max(1, h - 1)); setMessage('WHUMP! The Flatling knocks you back. Bounce near it to pop it.'); return Math.max(5, current - 12); } return nextX; });
  useEffect(() => { const key = (event) => { if (['ArrowLeft', 'a', 'A'].includes(event.key)) move(-6); if (['ArrowRight', 'd', 'D'].includes(event.key)) move(6); if (['ArrowUp', 'w', 'W', ' '].includes(event.key)) { event.preventDefault(); jump(); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); });
  const cleared = defeated.every(Boolean);
  return <section className="mode-panel side-panel echo-hollow-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE II-B · ENCOUNTER ROUTE</p><h2>Echo Hollow</h2><p>Bounce near each Flatling to pop it. Each one releases an Echo Shard. Hearts: {'♥'.repeat(hearts)}</p></div><div className="side-stage echo-hollow-stage" style={{ backgroundImage: `url(${echoHollowStage})` }}>{enemyX.map((pos, i) => <div key={pos} className="flatling-wrap" style={{ left: `${pos}%` }}><Flatling frame={(Math.floor(x / 6) + i) % 8} defeated={defeated[i]} />{defeated[i] && <ItemIcon index={1} label="Collected Echo Shard" />}</div>)}<div className={jumping ? 'side-hero jumping' : 'side-hero'} style={{ left: `${x}%` }}><PixelAvatar frame={jumping ? 13 : (Math.floor(x / 6) % 4) + 4} /></div><div className="wobble-art-credit">ECHO HOLLOW · v5.20 ORIGINAL EXPANSION ART</div></div><div className="side-hud"><div className="message-box">{message}</div><div className="controls"><button onClick={() => move(-6)}>←</button><button onClick={jump}>BOUNCE ATTACK</button><button onClick={() => move(6)}>→</button></div>{cleared && <button className="primary-button" onClick={onExit}>Carry 3 Echo Shards back to the Grove →</button>}</div></section>;
}

function BeatShrine({ onComplete, playSfx }) {
  const order = ['moon', 'rune', 'bounce']; const [step, setStep] = useState(0); const [solved, setSolved] = useState(false); const [message, setMessage] = useState('Old Tempo said: Moon. Rune. Bounce. The three plaques wait in silence.');
  const choose = (symbol) => { if (solved) return; if (symbol === order[step]) { playSfx(step === 1 ? 'rune' : 'dialogue', .4); const next = step + 1; setStep(next); setMessage(`${symbol.toUpperCase()} answers. ${next}/3 beats restored.`); if (next === order.length) { setSolved(true); playSfx('gate', .6); setMessage('THE RHYTHM CREST IS RESTORED. A stairwell cracks open beneath the altar. Something below answers with one impossible flat note.'); } } else { playSfx('hit', .4); setStep(0); setMessage('The shrine answers with a flat note. The sequence resets: Moon. Rune. Bounce.'); } };
  return <section className="mode-panel first-panel shrine-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE III-A · FIRST-PERSON PUZZLE</p><h2>The Beat Shrine</h2><p>Restore the ancient three-beat phrase. No combat — observe, remember, and choose.</p></div><div className="beat-shrine-room" style={{ backgroundImage: `url(${beatShrineRoom})` }}>{solved && <div className="crest-reward"><ItemIcon index={2} label="Rhythm Crest" /></div>}</div><div className="dialogue-box shrine-dialogue"><p>{message}</p></div><div className="shrine-controls"><button onClick={() => choose('moon')}>◔ MOON</button><button onClick={() => choose('rune')}>◇ RUNE</button><button onClick={() => choose('bounce')}>↶ BOUNCE</button>{solved && <button className="primary-button" onClick={onComplete}>Claim Crest & descend →</button>}</div></section>;
}

function FlatNoteBoss({ onVictory, playSfx }) {
  const [x, setX] = useState(18); const [hp, setHp] = useState(6); const [hearts, setHearts] = useState(4); const [beat, setBeat] = useState(0); const [message, setMessage] = useState('Listen for the GOLD beat. The Flat Note is only solid for a moment.'); const [won, setWon] = useState(false);
  const vulnerable = beat === 0; const bossFrame = won ? 6 : vulnerable ? 3 : beat === 2 ? 4 : beat;
  useEffect(() => { if (won) return undefined; const timer = window.setInterval(() => setBeat((b) => (b + 1) % 4), 700); return () => window.clearInterval(timer); }, [won]);
  const move = (d) => setX((v) => Math.max(8, Math.min(68, v + d)));
  const resetPlayer = () => { setX(18); setHearts(4); setMessage('The Flat Note spits you back onto the downbeat. Try again — hit only on GOLD.'); };
  const strike = () => {
    if (won) return;
    if (x < 53) { setMessage('Too far away. Ride the pulse closer before you bounce-strike.'); return; }
    if (!vulnerable) { playSfx('hit', .55); const next = hearts - 1; setHearts(next); setMessage('DEAD NOTE! Off-beat contact hurts. Wait for GOLD.'); if (next <= 0) window.setTimeout(resetPlayer, 250); return; }
    playSfx('bossBreak', .62); const next = hp - 1; setHp(next); setMessage(next > 0 ? `ON BEAT! The Flat Note cracks. ${next}/6 resonance left.` : 'THE FLAT NOTE BREAKS! The missing rhythm rushes back into the room.');
    if (next <= 0) { setWon(true); playSfx('bossDefeat', .68); }
  };
  return <section className="mode-panel side-panel boss-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE II-C · RHYTHM BOSS</p><h2>The Flat Note</h2><p>Six on-beat hits. The weak point only opens on the GOLD pulse. Off-beat attacks cost a heart.</p></div><div className="boss-status"><div>MORE BOUNCE {'♥'.repeat(Math.max(0, hearts))}</div><div>FLAT NOTE {'◆'.repeat(Math.max(0, hp))}{'◇'.repeat(Math.max(0, 6-hp))}</div></div><div className="beat-meter" aria-label="Four-beat vulnerability meter">{[0,1,2,3].map((b)=><span key={b} className={beat===b ? (b===0?'beat active vulnerable':'beat active'):'beat'}>{b===0?'GOLD':b+1}</span>)}</div><div className="boss-arena" style={{ backgroundImage:`url(${flatNoteArena})` }}><div className="boss-player" style={{left:`${x}%`}}><PixelAvatar frame={vulnerable ? 12 : 4 + (beat%4)} /></div><div className="flat-note-wrap"><FlatNoteSprite frame={bossFrame} defeated={won} />{vulnerable && !won && <span className="weak-point">BOUNCE!</span>}</div>{won && <div className="seal-reward"><BossItem index={0} label="Resonance Seal" /></div>}</div><div className="message-box boss-message">{message}</div><div className="controls"><button onClick={()=>move(-7)}>←</button><button className={vulnerable?'boss-strike ready':'boss-strike'} onClick={strike}>BOUNCE STRIKE</button><button onClick={()=>move(7)}>→</button></div>{won && <button className="primary-button" onClick={onVictory}>Claim the Resonance Seal ◈</button>}<p className="human-boundary">Machine timing can prove the vulnerability window exists. Whether the fight is fun, readable, or satisfying remains a human playtest judgment.</p></section>;
}


const EAST_NODES=[
  {id:'gate',label:'Tower Gate',x:12,y:67,note:'The old western road ends here. The wind smells different beyond the gate.'},
  {id:'mill',label:'Eastwind Mill',x:31,y:31,note:'Mira Reed watches the vanes and an old brass compass.'},
  {id:'glass',label:'Glassgrass Pass',x:55,y:67,note:'Crystal grass sings when the wind hits it. Static Sprites are nesting in the relay pylons.'},
  {id:'bridge',label:'High Bridge',x:72,y:48,note:'The bridge route climbs too high for an ordinary bounce.'},
  {id:'signal',label:'Signal Mill',x:88,y:20,note:'The eastern beacon is dark. Three relay sparks and the Echo Boots should get you inside.'},
];
function EasternRoad({quest,setQuest,enter,playSfx}){
 const [focus,setFocus]=useState('gate'); const node=EAST_NODES.find(n=>n.id===focus); const [message,setMessage]=useState('Chapter Two begins east of Larrina Tower. Find the Wayfinder at Eastwind Mill.');
 const act=()=>{if(focus==='mill'){setQuest(q=>({...q,miraMet:true}));setMessage('Mira Reed: “The Signal Mill is blind. Clear the Static Sprites from Glassgrass and the pass will give you the Echo Boots.”');playSfx('dialogue',.3);return;}if(focus==='glass'){if(!quest.miraMet){setMessage('The crystal grass is beautiful, but you do not yet know which relay pylons matter.');playSfx('hit',.3);return;}return enter('glassgrass')}if(focus==='bridge'){if(!quest.echoBoots){setMessage('The high approach is one bounce too tall. You need a second kick in the air.');playSfx('hit',.3);return;}setMessage('The Echo Boots catch the wind. The high bridge is finally reachable.');return;}if(focus==='signal'){if(!quest.echoBoots||quest.relaySparks<3){setMessage('Signal Mill stays sealed. Bring the Echo Boots and all three Relay Sparks.');playSfx('hit',.3);return;}return enter('signalMill')}setMessage(node.note)};
 return <section className="mode-panel east-road-panel"><div className="panel-copy"><p className="mode-kicker">CHAPTER II · EASTERN OVERWORLD</p><h2>Eastwind Road</h2><p>The wound continues east. Find Mira Reed, clear Glassgrass Pass, and relight the beacon.</p></div><div className="east-map" style={{backgroundImage:`url(${eastwindMap})`}}>{EAST_NODES.map(n=><button key={n.id} className={focus===n.id?'east-node active':'east-node'} style={{left:`${n.x}%`,top:`${n.y}%`}} onClick={()=>{setFocus(n.id);setMessage(n.note)}}>{n.label}</button>)}<div className="east-hero" style={{left:`${node.x+2}%`,top:`${node.y-9}%`}}><PixelAvatar small/></div>{focus==='mill'&&<div className="mira-wrap"><MiraReed frame={quest.miraMet?2:0}/></div>}</div><div className="message-box">{message}</div><button className="primary-button" onClick={act}>{focus==='mill'?(quest.miraMet?'Ask Mira again':'Talk to Mira Reed'):focus==='glass'?'Enter Glassgrass Pass →':focus==='bridge'?'Try the High Bridge':focus==='signal'?'Enter Signal Mill →':'Inspect'}</button></section>
}
function GlassgrassPass({quest,setQuest,onExit,playSfx}){
 const [x,setX]=useState(8); const [hp,setHp]=useState([2,2,2]); const [message,setMessage]=useState('Static Sprites take TWO clean bounce hits. Clear all three relay pylons.'); const positions=[31,55,79]; const cleared=hp.every(v=>v<=0);
 const move=d=>setX(v=>Math.max(5,Math.min(90,v+d)));
 const strike=()=>{let idx=positions.findIndex((p,i)=>hp[i]>0&&Math.abs(p-x)<9);if(idx<0){setMessage('BOUNCE! The glassgrass rings, but no Static Sprite is close enough.');playSfx('bounce',.3);return;}const next=[...hp];next[idx]-=1;setHp(next);playSfx(next[idx]<=0?'rune':'bounce',.45);setMessage(next[idx]<=0?`STATIC SPRITE ${idx+1} BREAKS! Relay Spark released.`:`Static shell cracked — one more hit on Sprite ${idx+1}.`);if(next[idx]<=0)setQuest(q=>({...q,relaySparks:Math.min(3,(q.relaySparks||0)+1)}));};
 const claim=()=>{setQuest(q=>({...q,echoBoots:true}));playSfx('echoBoots',.7);onExit();};
 return <section className="mode-panel side-panel glassgrass-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE II-D · STRONGER ENEMY ROUTE</p><h2>Glassgrass Pass</h2><p>Two-hit Static Sprites guard the relay. Clear all three to awaken the Echo Boots.</p></div><div className="glassgrass-stage" style={{backgroundImage:`url(${glassgrassStage})`}}>{positions.map((p,i)=><div key={p} className="static-wrap" style={{left:`${p}%`}}><StaticSprite frame={(Math.floor(x/5)+i)%8} defeated={hp[i]<=0}/>{hp[i]<=0&&<ChapterTwoItem index={1} label="Relay Spark"/>}</div>)}<div className="glassgrass-hero" style={{left:`${x}%`}}><PixelAvatar frame={12}/></div>{cleared&&<div className="boots-reward"><ChapterTwoItem index={0} label="Echo Boots"/></div>}</div><div className="message-box">{message}</div><div className="controls"><button onClick={()=>move(-7)}>←</button><button onClick={strike}>BOUNCE ATTACK</button><button onClick={()=>move(7)}>→</button></div>{cleared&&!quest.echoBoots&&<button className="primary-button" onClick={claim}>Claim Echo Boots — SECOND BOUNCE ✦</button>}{quest.echoBoots&&<button className="primary-button" onClick={onExit}>Return to Eastwind Road →</button>}</section>
}
function SignalMill({quest,setQuest,onComplete,playSfx}){
 const target=['sun','wind','rune']; const [step,setStep]=useState(0); const [message,setMessage]=useState('Three relay dials surround the empty Beacon Lens socket. Mira marked the phrase: SUN · WIND · RUNE.'); const solved=step>=3;
 const choose=s=>{if(solved)return;if(s===target[step]){const n=step+1;setStep(n);playSfx('dialogue',.25);setMessage(n===3?'THE EASTERN BEACON ALIGNs. A Beacon Lens condenses from the restored signal.':`Correct. ${n}/3 relay dials aligned.`)}else{setStep(0);setMessage('The machinery groans and resets. SUN · WIND · RUNE.');playSfx('hit',.35)}};
 const claim=()=>{setQuest(q=>({...q,beaconLens:true,eastComplete:true}));playSfx('beacon',.75);onComplete()};
 return <section className="mode-panel first-panel signal-mill-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE III-C · SIGNAL PUZZLE</p><h2>Signal Mill</h2><p>Use the Echo Boots to reach the high controls, then align the eastern relay.</p></div><div className="signal-mill-room" style={{backgroundImage:`url(${signalMillRoom})`}}>{solved&&<div className="lens-reward"><ChapterTwoItem index={2} label="Beacon Lens"/></div>}</div><div className="dialogue-box"><p>{message}</p></div><div className="shrine-controls"><button onClick={()=>choose('sun')}>☀ SUN</button><button onClick={()=>choose('wind')}>≋ WIND</button><button onClick={()=>choose('rune')}>◇ RUNE</button>{solved&&<button className="primary-button" onClick={claim}>Install Beacon Lens ✦</button>}</div></section>
}
function ChapterTwoEnding({onContinue}){return <section className="mode-panel ending-panel chapter-two-ending"><div className="ending-stars">✦ · ✧ · ✦ · ✧ · ✦</div><PixelAvatar/><p className="mode-kicker">CHAPTER TWO COMPLETE</p><h2>The Eastern Beacon Wakes.</h2><p>The Signal Mill throws a clean line of light across the hills. An iron-colored orchard answers with one distant pulse.</p><blockquote>“The road did not end. It finally became a world.”</blockquote><div className="proof-grid"><span>✓ Eastern Beacon restored</span><span>✓ Echo Boots retained</span><span>✓ A new hub answers the signal</span></div><p className="human-boundary">Chapter Two remains retained. Chapter Three begins at the Iron Orchard.</p><button className="primary-button" onClick={onContinue}>Follow the Beacon to the Iron Orchard →</button></section>}


const IRON_NODES=[
  {id:'beacon',label:'Beacon Road',x:12,y:66,note:'The Eastern Beacon road finally reaches the orchard.'},
  {id:'rivet',label:'Rivet Row',x:34,y:39,note:'Tessa Coil and Bram Gearroot run the little hub under the iron-fruit trees.'},
  {id:'apple1',label:'North Apples',x:50,y:25,note:'A Gear Apple glints between iron leaves.'},
  {id:'apple2',label:'Moon Apples',x:57,y:68,note:'A second Gear Apple hangs beside the old fountain.'},
  {id:'apple3',label:'Cave Apples',x:73,y:51,note:'A third Gear Apple grows near the Rustroot cave mouth.'},
  {id:'cave',label:'Rustroot Cavern',x:78,y:76,note:'Armored Rustlings scrape beneath the orchard roots.'},
  {id:'warden',label:'Warden Gate',x:91,y:24,note:'The Rustbloom Warden sleeps behind an iron-root seal.'},
];
function IronOrchard({quest,setQuest,enter,playSfx}){
 const [focus,setFocus]=useState('beacon'); const [message,setMessage]=useState('The orchard hums like a machine remembering how to be a forest.'); const node=IRON_NODES.find(n=>n.id===focus);
 const collectApple=(id)=>{if(quest.appleNodes?.includes(id)){setMessage('Only a square rust-colored leaf remains.');return;}setQuest(q=>({...q,gearApples:(q.gearApples||0)+1,appleNodes:[...(q.appleNodes||[]),id]}));playSfx('rune',.35);setMessage('GEAR APPLE FOUND! Tessa Coil trades upgrades for these impossible little fruits.');};
 const act=()=>{if(focus.startsWith('apple'))return collectApple(focus);if(focus==='rivet'){setQuest(q=>({...q,tessaMet:true,bramMet:true}));playSfx('dialogue',.28);setMessage('Tessa: “Three Gear Apples buys a Resonance Bracer.”  Bram: “If you find my Wrench Charm in Rustroot, bring it home. I make health hardware.”');return;}if(focus==='cave'){if(!quest.resonanceBracer){setMessage('Iron roots seal the cave. A normal bounce barely makes them ring. Tessa mentioned a Bracer.');playSfx('hit',.25);return;}enter('rustroot');return;}if(focus==='warden'){if(!quest.resonanceBracer||!quest.orchardSigil){setMessage('The Warden Gate needs both a Resonance Bracer and the Orchard Sigil from Rustroot Cavern.');playSfx('hit',.25);return;}enter('rustbloomBoss');return;}setMessage(node.note)};
 return <section className="mode-panel iron-orchard-panel"><div className="panel-copy"><p className="mode-kicker">CHAPTER III · HUB + BRANCHING QUESTS</p><h2>The Iron Orchard</h2><p>Rivet Row is a real hub now: trade, optional quests, a hidden cavern, and a boss road.</p></div><div className="iron-orchard-map" style={{backgroundImage:`url(${ironOrchardMap})`}}>{IRON_NODES.map(n=><button key={n.id} className={focus===n.id?'iron-node active':'iron-node'} style={{left:`${n.x}%`,top:`${n.y}%`}} onClick={()=>{setFocus(n.id);setMessage(n.note)}}>{n.label}</button>)}<div className="iron-hero" style={{left:`${node.x+2}%`,top:`${node.y-10}%`}}><PixelAvatar small/></div>{focus==='rivet'&&<div className="iron-npcs"><TessaCoil frame={quest.tessaMet?2:0}/><BramGearroot frame={quest.bramMet?2:0}/></div>}</div><div className="message-box">{message}</div><div className="iron-hub-actions"><button className="primary-button" onClick={act}>{focus==='rivet'?'Talk to Tessa + Bram':focus.startsWith('apple')?'Pick Gear Apple':focus==='cave'?'Enter Rustroot Cavern →':focus==='warden'?'Open Warden Gate →':'Inspect'}</button>{focus==='rivet'&&quest.tessaMet&&<button className="secondary-button" onClick={()=>enter('rivetForge')}>Enter Tessa's Forge →</button>}</div><div className="quest-log"><span className={quest.gearApples>=3||quest.resonanceBracer?'done':''}>Gear Apples {quest.gearApples||0}/3</span><span className={quest.resonanceBracer?'done':''}>Resonance Bracer</span><span className={quest.wrenchCharm?'done':''}>Optional: Wrench Charm</span><span className={quest.heartRivet?'done':''}>Optional: Heart Rivet</span><span className={quest.orchardSigil?'done':''}>Orchard Sigil</span></div></section>;
}
function RivetForge({quest,setQuest,onExit,playSfx}){
 const [message,setMessage]=useState('Tessa Coil lays a humming iron cuff beside the forge. “Three Gear Apples. No subscriptions.”');
 const bracer=()=>{if(quest.resonanceBracer){setMessage('Your Resonance Bracer is already tuned.');return;}if((quest.gearApples||0)<3){setMessage(`Tessa needs three Gear Apples. You have ${quest.gearApples||0}.`);playSfx('hit',.25);return;}setQuest(q=>({...q,gearApples:q.gearApples-3,applesTraded:3,resonanceBracer:true}));playSfx('bracer',.7);setMessage('RESONANCE BRACER INSTALLED! Charged bounce attacks can now crack iron armor and root seals.');};
 const heart=()=>{if(quest.heartRivet){setMessage('Bram already riveted the extra heart housing into your gear.');return;}if(!quest.wrenchCharm){setMessage('Bram needs his Wrench Charm from Rustroot Cavern before he can make the Heart Rivet.');return;}setQuest(q=>({...q,heartRivet:true,wrenchReturned:true}));playSfx('rune',.45);setMessage('OPTIONAL QUEST COMPLETE! Bram installs a Heart Rivet: +1 heart in the Warden fight.');};
 return <section className="mode-panel first-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE III-D · SHOP + OPTIONAL UPGRADE</p><h2>Rivet Forge</h2><p>Tessa sells progression. Bram rewards exploration. Nothing here is a loot box.</p></div><div className="rivet-forge-room" style={{backgroundImage:`url(${rivetForgeRoom})`}}><div className="forge-bracer"><IronItem index={1} label="Resonance Bracer"/></div></div><div className="dialogue-box"><p>{message}</p></div><div className="shrine-controls"><button onClick={bracer}>Trade 3 Gear Apples → Bracer</button><button onClick={heart}>Return Wrench Charm → Heart Rivet</button><button onClick={onExit}>Return to Rivet Row →</button></div></section>;
}
function RustrootCavern({quest,setQuest,onExit,playSfx}){
 const [x,setX]=useState(8); const [hp,setHp]=useState([3,3,3]); const [message,setMessage]=useState('Rustlings wear iron shells. The Resonance Bracer turns your bounce into a cracking pulse.'); const positions=[29,55,80]; const cleared=hp.every(v=>v<=0);
 const move=d=>setX(v=>Math.max(5,Math.min(91,v+d))); const burst=()=>{if(!quest.resonanceBracer){setMessage('CLANG. Normal bounce cannot break the iron shell.');playSfx('hit',.3);return;}const i=positions.findIndex((p,j)=>hp[j]>0&&Math.abs(p-x)<9);if(i<0){setMessage('RESONANCE BURST! The cave rings, but no Rustling is close enough.');playSfx('bounce',.3);return;}const n=[...hp];n[i]-=1;setHp(n);playSfx(n[i]<=0?'rune':'bounce',.5);setMessage(n[i]<=0?`RUSTLING ${i+1} SHATTERS!`:`Iron armor cracked — ${n[i]} shell hit${n[i]===1?'':'s'} remain.`)};
 const claim=()=>{setQuest(q=>({...q,wrenchCharm:true,orchardSigil:true}));playSfx('rune',.5);setMessage('Rustroot cache opened: BRAM’S WRENCH CHARM + ORCHARD SIGIL recovered.');};
 return <section className="mode-panel side-panel rustroot-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE II-E · ABILITY-GATED COMBAT</p><h2>Rustroot Cavern</h2><p>Three 3-hit Rustlings. The Bracer is required to damage their iron shells.</p></div><div className="rustroot-stage" style={{backgroundImage:`url(${rustrootCavern})`}}>{positions.map((p,i)=><div className="rustling-wrap" style={{left:`${p}%`}} key={p}><Rustling frame={(i+Math.floor(x/7))%8} defeated={hp[i]<=0}/></div>)}<div className="rustroot-hero" style={{left:`${x}%`}}><PixelAvatar frame={12}/></div>{cleared&&!quest.wrenchCharm&&<div className="wrench-reward"><IronItem index={2} label="Wrench Charm"/></div>}</div><div className="message-box">{message}</div><div className="controls"><button onClick={()=>move(-7)}>←</button><button className="boss-strike ready" onClick={burst}>RESONANCE BURST</button><button onClick={()=>move(7)}>→</button></div>{cleared&&!quest.wrenchCharm&&<button className="primary-button" onClick={claim}>Claim Wrench Charm + Orchard Sigil ✦</button>}{quest.orchardSigil&&<button className="primary-button" onClick={onExit}>Return to Iron Orchard →</button>}</section>;
}
function RustbloomBoss({quest,setQuest,onVictory,playSfx}){
 const [hp,setHp]=useState(4); const [hearts,setHearts]=useState(quest.heartRivet?5:4); const [guard,setGuard]=useState(true); const [message,setMessage]=useState('IRON GUARD! Use RESONANCE BURST to crack the shell, then BOUNCE STRIKE the exposed bloom.'); const won=hp<=0;
 const hurt=()=>{const h=hearts-1;if(h<=0){setHearts(quest.heartRivet?5:4);setHp(4);setGuard(true);setMessage('The orchard throws you back to the gate. Bram’s hardware resets with you.');playSfx('hit',.5)}else{setHearts(h);playSfx('hit',.45)}};
 const burst=()=>{if(won)return;if(!guard){setMessage('The bloom is already exposed — BOUNCE STRIKE now!');hurt();return;}setGuard(false);playSfx('bracer',.6);setMessage('IRON GUARD CRACKED! The Rustbloom core is exposed for one strike.');};
 const strike=()=>{if(won)return;if(guard){setMessage('CLANG! Bounce Strike hits the iron guard and the roots counterattack.');hurt();return;}const n=hp-1;setHp(n);setGuard(n>0);playSfx(n<=0?'ironBlossom':'bossBreak',.65);setMessage(n<=0?'THE RUSTBLOOM WARDEN FALLS. An Iron Blossom opens in the quiet.':`CLEAN HIT! ${n}/4 bloom hearts remain. The iron guard regrows.`)};
 const claim=()=>{setQuest(q=>({...q,ironBlossom:true,chapterThreeComplete:true}));playSfx('ironBlossom',.8);onVictory()};
 return <section className="mode-panel side-panel rustbloom-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">CHAPTER III BOSS · ABILITY COMBO</p><h2>The Rustbloom Warden</h2><p>Alternate the new Bracer and your core Bounce Strike. Optional Heart Rivet raises your health from 4 to 5.</p></div><div className="rustbloom-status"><span>WARDEN ♥ {Math.max(0,hp)}/4</span><span>MORE BOUNCE ♥ {hearts}/{quest.heartRivet?5:4}</span><span>{guard?'IRON GUARD':'BLOOM OPEN'}</span></div><div className="rustbloom-arena" style={{backgroundImage:`url(${rustbloomArena})`}}><div className="rustbloom-hero"><PixelAvatar frame={12}/></div><div className="rustbloom-wrap"><RustbloomWardenSprite frame={(hp+hearts)%8} defeated={won}/></div>{won&&<div className="blossom-reward"><IronItem index={3} label="Iron Blossom"/></div>}</div><div className="message-box">{message}</div><div className="controls"><button onClick={burst}>RESONANCE BURST</button><button className="primary-button" onClick={strike}>BOUNCE STRIKE</button></div>{won&&<button className="primary-button" onClick={claim}>Claim the Iron Blossom ✦</button>}</section>;
}
function ChapterThreeEnding({onContinue,onRestart}){return <section className="mode-panel ending-panel iron-ending"><div className="ending-stars">✦ · ⚙ · ✦ · ⚙ · ✦</div><PixelAvatar/><p className="mode-kicker">CHAPTER THREE COMPLETE</p><h2>The Iron Orchard Blooms.</h2><p>The Iron Blossom resonates with a salt-bright current beyond the southern cliffs. A new coast has appeared on More Bounce's map.</p><blockquote>“When the road runs out, apparently we bounce toward the ocean.”</blockquote><div className="proof-grid"><span>✓ Iron Blossom claimed</span><span>✓ Stormglass route revealed</span><span>✓ Save + travel state retained</span></div><p className="human-boundary">Chapter Three review remains pending. Chapter Four adds a new traversal identity rather than rewriting the previous chapter.</p><div className="title-actions"><button className="primary-button" onClick={onContinue}>Continue to Stormglass Coast →</button><button className="secondary-button" onClick={onRestart}>Restart adventure ↻</button></div></section>}


const STORMGLASS_NODES=[
 {id:'pier',label:'Tidewatch Pier',x:12,y:70,note:'Salt wind rattles the pier. Sable Current watches the tide gauges.'},
 {id:'sable',label:'Sable Current',x:25,y:43,note:'The Tidekeeper has a folded mantle made from stormglass thread.'},
 {id:'shell1',label:'Shell Cove',x:43,y:68,note:'A Tideglass Shell glints where the foam withdraws.'},
 {id:'shell2',label:'Wind Vane',x:58,y:35,note:'A shell has lodged beneath an old wind vane.'},
 {id:'shell3',label:'Glassgrass Shelf',x:73,y:63,note:'Glassgrass rings around another shell.'},
 {id:'cliffs',label:'Stormglass Cliffs',x:84,y:39,note:'The cliff route has gaps too wide for an ordinary jump.'},
 {id:'lighthouse',label:'Lighthouse',x:94,y:18,note:'The lighthouse is dark. Something beneath it is ringing underwater.'},
];
function StormglassCoast({quest,setQuest,enter,playSfx}){
 const [focus,setFocus]=useState('pier'); const [message,setMessage]=useState('The Iron Blossom pulls south like a compass needle. Stormglass Coast answers with a wall of salt wind.'); const node=STORMGLASS_NODES.find(n=>n.id===focus);
 const collectShell=(id)=>{const key=`${id}Taken`; if(quest[key]){setMessage('Only a wet ring remains where that Tideglass Shell sat.');return;}setQuest(q=>({...q,[key]:true,tideglassShells:Math.min(3,(q.tideglassShells||0)+1)}));playSfx('rune',.45);setMessage('TIDEGLASS SHELL RECOVERED! The shell hums when the wind hits its spiral.')};
 const act=()=>{if(focus==='sable'){if(!quest.sableMet){setQuest(q=>({...q,sableMet:true}));playSfx('dialogue',.28);}if(quest.galeMantle){setMessage('Sable: “Mantle is tuned. Dash through the gust, not against it.”');return;}if((quest.tideglassShells||0)<3){setMessage(`Sable: “Bring me three Tideglass Shells. You have ${quest.tideglassShells||0}. I can weave them into a Gale Mantle.”`);return;}setQuest(q=>({...q,galeMantle:true,tideglassShells:q.tideglassShells-3}));playSfx('galeMantle',.75);setMessage('GALE MANTLE EQUIPPED! More Bounce can AIR DASH once between landings.');return;}if(focus.startsWith('shell'))return collectShell(focus);if(focus==='cliffs'){if(!quest.galeMantle){setMessage('The first cliff gap laughs at a normal jump. Sable’s mantle looks suddenly very relevant.');playSfx('hit',.2);return;}enter('stormglassCliffs');return;}if(focus==='lighthouse'){if(!quest.stormglassCompass){setMessage('The lighthouse door is pressure-locked. The cliffs lead to the Tide Engine below it.');return;}setMessage('The Stormglass Compass has relit the lighthouse. Its shrine is now part of the travel network.');return;}setMessage(node.note)};
 return <section className="mode-panel stormglass-panel"><div className="panel-copy"><p className="mode-kicker">CHAPTER IV · NEW COAST / NEW MOVEMENT</p><h2>Stormglass Coast</h2><p>Collect three Tideglass Shells, earn the Gale Mantle, cross the cliffs, and wake the lighthouse.</p></div><div className="stormglass-map" style={{backgroundImage:`url(${stormglassCoastMap})`}}>{STORMGLASS_NODES.map(n=><button key={n.id} className={focus===n.id?'storm-node active':'storm-node'} style={{left:`${n.x}%`,top:`${n.y}%`}} onClick={()=>{setFocus(n.id);setMessage(n.note)}}>{n.label}</button>)}<div className="stormglass-hero" style={{left:`${node.x+2}%`,top:`${node.y-9}%`}}><PixelAvatar small/></div>{focus==='sable'&&<div className="sable-wrap"><SableCurrent frame={quest.galeMantle?2:0}/></div>}</div><div className="message-box">{message}</div><div className="stormglass-actions"><button className="primary-button" onClick={act}>{focus==='sable'?'Talk / Trade':focus.startsWith('shell')?'Collect Tideglass Shell':focus==='cliffs'?'Enter Stormglass Cliffs →':'Inspect'}</button></div><div className="quest-log"><span className={quest.galeMantle?'done':''}>Tideglass Shells {(quest.tideglassShells||0)}/3</span><span className={quest.galeMantle?'done':''}>Gale Mantle</span><span className={quest.pressurePrism?'done':''}>Pressure Prism</span><span className={quest.tideEngineSolved?'done':''}>Tide Engine</span><span className={quest.stormglassCompass?'done':''}>Stormglass Compass</span></div></section>;
}
function StormglassCliffs({quest,setQuest,enter,playSfx}){
 const [x,setX]=useState(6); const [airDash,setAirDash]=useState(true); const [message,setMessage]=useState('The Gale Mantle catches the crosswind. RUN between ledges; AIR DASH across the marked gust gaps.'); const gaps=[[20,31],[43,55],[67,79]]; const atGap=(nx)=>gaps.find(([a,b])=>x<a&&nx>=a&&nx<=b);
 const run=()=>{const nx=Math.min(94,x+7);if(atGap(nx)){setMessage('TOO FAR. The next ledge needs an AIR DASH.');playSfx('hit',.2);return;}setX(nx);setAirDash(true);if(nx>=91)setMessage('The Tide Engine intake is just below the lighthouse.');};
 const dash=()=>{if(!quest.galeMantle){setMessage('No Gale Mantle. No air dash.');return;}if(!airDash){setMessage('The Mantle needs a landing before it can catch another gust.');return;}const nx=Math.min(94,x+15);setX(nx);setAirDash(false);playSfx('galeMantle',.36);setMessage(nx>=91?'AIR DASH CLEAR! The Tide Engine hatch opens below.':'WHOOSH! The Gale Mantle carries More Bounce across the gap.');window.setTimeout(()=>setAirDash(true),180)};
 const prism=()=>{setQuest(q=>({...q,pressurePrism:true}));playSfx('rune',.45);enter('tideEngine')};
 return <section className="mode-panel side-panel stormglass-cliffs-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE II-F · AIR-DASH TRAVERSAL</p><h2>Stormglass Cliffs</h2><p>Three gaps are deliberately too wide for the old movement kit. The Gale Mantle is required.</p></div><div className="stormglass-stage" style={{backgroundImage:`url(${stormglassCliffsStage})`}}><div className="stormglass-cliff-hero" style={{left:`${x}%`}}><PixelAvatar frame={x%2?8:12}/></div></div><div className="message-box">{message}</div><div className="controls"><button onClick={()=>setX(v=>Math.max(5,v-6))}>← BACK</button><button onClick={run}>RUN →</button><button className="primary-button" onClick={dash}>AIR DASH ✦</button></div>{x>=91&&!quest.pressurePrism&&<button className="primary-button" onClick={prism}>Claim Pressure Prism + Enter Tide Engine →</button>}{quest.pressurePrism&&<button className="primary-button" onClick={()=>enter('tideEngine')}>Enter Tide Engine →</button>}</section>;
}
function TideEngine({quest,setQuest,enter,playSfx}){
 const target=['tide','wind','light','bell']; const [step,setStep]=useState(quest.tideEngineSolved?4:0); const [message,setMessage]=useState(quest.tideEngineSolved?'The Tide Engine is synchronized. A heavy bell rings beneath the lighthouse.':'Four pressure dials surround the engine core. The etched order reads: TIDE · WIND · LIGHT · BELL.'); const solved=step>=4;
 const choose=(symbol)=>{if(solved)return;if(symbol===target[step]){const n=step+1;setStep(n);playSfx('dialogue',.25);if(n===4){setQuest(q=>({...q,tideEngineSolved:true}));playSfx('beacon',.55);setMessage('TIDE ENGINE SYNCHRONIZED! The Undertow Bell wakes beneath the lighthouse.')}else setMessage(`Pressure ${n}/4 locked. Next symbol.`)}else{setStep(0);playSfx('hit',.25);setMessage('PRESSURE LOST. The dials reset: TIDE · WIND · LIGHT · BELL.')}};
 return <section className="mode-panel first-panel tide-engine-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE III-F · PRESSURE PUZZLE</p><h2>Tide Engine</h2><p>The Pressure Prism lets you read the submerged mechanism.</p></div><div className="tide-engine-room" style={{backgroundImage:`url(${tideEngineRoom})`}}></div><div className="message-box">{message}</div><div className="shrine-controls">{['tide','wind','light','bell'].map(x=><button key={x} onClick={()=>choose(x)}>{x.toUpperCase()}</button>)}</div>{solved&&<button className="primary-button" onClick={()=>enter('undertowBoss')}>Descend to the Undertow Bell →</button>}</section>;
}
function UndertowBellBoss({quest,setQuest,onVictory,playSfx}){
 const [hp,setHp]=useState(5); const [hearts,setHearts]=useState(quest.heartRivet?5:4); const [phase,setPhase]=useState(0); const [exposed,setExposed]=useState(false); const [message,setMessage]=useState('The bell pulls the whole room inward. Wait for SURGE, AIR DASH through the wave, then BOUNCE STRIKE the exposed clapper.');
 useEffect(()=>{if(hp<=0)return;const id=window.setInterval(()=>setPhase(v=>(v+1)%4),800);return()=>window.clearInterval(id)},[hp]); const phaseName=['SWELL','SURGE','ECHO','CALM'][phase];
 const hurt=()=>{const h=hearts-1;playSfx('hit',.45);if(h<=0){setHearts(quest.heartRivet?5:4);setHp(5);setExposed(false);setMessage('The Undertow throws you back to the ledge. The Bell resets its rhythm.')}else setHearts(h)};
 const dash=()=>{if(!quest.galeMantle){setMessage('The Gale Mantle is required here.');return;}if(phase!==1){setMessage('AIR DASH misses the SURGE window — undertow catches you.');hurt();return;}setExposed(true);playSfx('galeMantle',.5);setMessage('SURGE PHASED! The Bell’s clapper is exposed — BOUNCE STRIKE!')};
 const strike=()=>{if(!exposed){setMessage('The bell shell is sealed. AIR DASH through a SURGE first.');hurt();return;}const n=hp-1;setHp(n);setExposed(false);playSfx(n<=0?'stormglassCompass':'bossBreak',.65);setMessage(n<=0?'THE UNDERTOW BELL FALLS SILENT. A Stormglass Compass rises from the foam.':`CLEAN STRIKE! ${n}/5 bell hearts remain.`)};
 const claim=()=>{setQuest(q=>({...q,undertowBellDefeated:true,stormglassCompass:true,chapterFourComplete:true}));playSfx('stormglassCompass',.8);onVictory()};
 return <section className="mode-panel side-panel undertow-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">CHAPTER IV BOSS · MOVEMENT AS COMBAT</p><h2>The Undertow Bell</h2><p>Your new traversal ability is also the boss key: phase through the SURGE, then bounce the exposed clapper.</p></div><div className="undertow-status"><span>BELL ♥ {Math.max(0,hp)}/5</span><span>MORE BOUNCE ♥ {hearts}/{quest.heartRivet?5:4}</span><span>{phaseName}{exposed?' · EXPOSED':''}</span></div><div className="undertow-arena" style={{backgroundImage:`url(${undertowBellArena})`}}><div className="undertow-hero"><PixelAvatar frame={12}/></div><div className="undertow-wrap"><UndertowBellSprite frame={(phase+hp)%8} defeated={hp<=0}/></div>{hp<=0&&<div className="stormglass-reward"><StormglassItem index={3} label="Stormglass Compass"/></div>}</div><div className="message-box">{message}</div><div className="controls"><button className="primary-button" onClick={dash}>AIR DASH ✦</button><button onClick={strike}>BOUNCE STRIKE</button></div>{hp<=0&&<button className="primary-button" onClick={claim}>Claim Stormglass Compass ✦</button>}</section>;
}
function ChapterFourEnding({onContinue,onRestart}){return <section className="mode-panel ending-panel stormglass-ending"><div className="ending-stars">✦ · ≋ · ✦ · ≋ · ✦</div><PixelAvatar/><p className="mode-kicker">CHAPTER FOUR COMPLETE</p><h2>The Lighthouse Answers.</h2><p>The Tide Engine is synchronized, the Undertow Bell is quiet, and the Stormglass Compass points beyond the mapped coast.</p><blockquote>“Every new way of moving makes the world bigger.”</blockquote><div className="proof-grid"><span>✓ New coastal hub</span><span>✓ 3 Tideglass Shells</span><span>✓ Permanent Gale Mantle</span><span>✓ 3 air-dash gaps</span><span>✓ 4-step Tide Engine puzzle</span><span>✓ Undertow Bell boss</span><span>✓ Fifth travel landmark</span></div><p className="human-boundary">Air-dash feel, cliff readability, puzzle clarity, boss fairness, chapter pacing and commercial depth remain human review gates.</p><div className="title-actions"><button className="primary-button" onClick={onContinue}>Follow the Compass to Mirrorfall Basin →</button><button className="secondary-button" onClick={onRestart}>Restart adventure ↻</button></div></section>}

const MIRRORFALL_NODES=[
 {id:'perri',label:'Perri Prism',x:24,y:48,note:'A prism archivist is studying the lake from three impossible angles.'},
 {id:'cyan',label:'Cyan Pylon',x:32,y:32,note:'This pylon controls the first reflected platform family.'},
 {id:'magenta',label:'Magenta Pylon',x:51,y:20,note:'This pylon bends the middle beam toward Splitlight Causeway.'},
 {id:'gold',label:'Gold Pylon',x:74,y:60,note:'This pylon sends the final beam toward the Observatory.'},
 {id:'causeway',label:'Splitlight Gate',x:16,y:61,note:'The side-view road only becomes stable after all three prisms align.'},
 {id:'observatory',label:'Triune Observatory',x:89,y:20,note:'Three shutters wait for power from the Pulse Nodes.'},
];
function MirrorfallBasin({quest,setQuest,enter,playSfx}){
 const [focus,setFocus]=useState('perri'); const node=MIRRORFALL_NODES.find(n=>n.id===focus); const [message,setMessage]=useState('The Stormglass Compass points across the lake, then somehow points sideways.');
 const align=(key)=>{setQuest(q=>{const next={...q,[key]:true};next.worldBeamAligned=Boolean(next.prismCyan&&next.prismMagenta&&next.prismGold);return next});playSfx('viewShift',.45);setMessage('The pylon rotates. Somewhere beyond the gate, a reflected platform snaps into existence.')};
 const act=()=>{if(focus==='perri'){setQuest(q=>({...q,perriMet:true}));playSfx('dialogue',.28);setMessage('Perri: “Do not solve three rooms. Solve one world from three angles. Align the basin, strike the Causeway, then read the Observatory.”');return;}if(focus==='cyan'){align('prismCyan');return;}if(focus==='magenta'){align('prismMagenta');return;}if(focus==='gold'){align('prismGold');return;}if(focus==='causeway'){if(!quest.worldBeamAligned){setMessage('The Causeway flickers. All three basin pylons must align first.');return;}enter('splitlight');return;}if(focus==='observatory'){if(!quest.pulseNodesPowered){setMessage('The Observatory lenses are dark. Something in the Causeway still needs power.');return;}enter('observatory')}};
 return <section className="mode-panel top-panel mirrorfall-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">CHAPTER V · MODE I-G · WORLD STATE</p><h2>Mirrorfall Basin</h2><p>Actions here alter the geometry of the side-view Causeway.</p></div><div className="mirrorfall-map" style={{backgroundImage:`url(${mirrorfallMap})`}}>{MIRRORFALL_NODES.map(n=><button key={n.id} className={focus===n.id?'mirror-node active':'mirror-node'} style={{left:`${n.x}%`,top:`${n.y}%`}} onClick={()=>{setFocus(n.id);setMessage(n.note)}}>{n.label}</button>)}{focus==='perri'&&<div className="perri-wrap"><PerriPrism frame={quest.worldBeamAligned?2:0}/></div>}</div><div className="message-box">{message}</div><button className="primary-button" onClick={act}>{focus==='causeway'?'Enter Causeway →':focus==='observatory'?'Enter Observatory →':focus==='perri'?'Talk to Perri':'ALIGN PRISM ◈'}</button><div className="quest-log"><span className={quest.prismCyan?'done':''}>Cyan prism</span><span className={quest.prismMagenta?'done':''}>Magenta prism</span><span className={quest.prismGold?'done':''}>Gold prism</span><span className={quest.worldBeamAligned?'done':''}>World Beam</span><span className={quest.pulseNodesPowered?'done':''}>Pulse Nodes</span><span className={quest.viewSigil?'done':''}>View Sigil</span></div></section>;
}
function SplitlightCauseway({quest,setQuest,enter,playSfx}){
 const [x,setX]=useState(7); const [message,setMessage]=useState('The reflected platforms are solid because the basin pylons are aligned. Strike all three Pulse Nodes.'); const nodes=[30,61,84];
 const move=(d)=>setX(v=>Math.max(5,Math.min(94,v+d*9))); const strike=()=>{const idx=nodes.findIndex(n=>Math.abs(n-x)<=9);if(idx<0){setMessage('No Pulse Node in bounce range.');return;}const next=Math.min(3,(quest.pulseNodes||0)+1);setQuest(q=>({...q,pulseNodes:next,pulseNodesPowered:next>=3}));playSfx('viewShift',.45);setMessage(next>=3?'ALL THREE PULSE NODES POWERED. The Observatory lenses ignite in the distance.':`Pulse Node ${next}/3 powered. The first-person lens room changes.`)};
 return <section className="mode-panel side-panel splitlight-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">CHAPTER V · MODE II-G · REFLECTED GEOMETRY</p><h2>Splitlight Causeway</h2><p>The platforms under your feet only exist because of the top-down prism alignment.</p></div><div className="splitlight-stage" style={{backgroundImage:`url(${splitlightStage})`}}><div className="splitlight-hero" style={{left:`${x}%`}}><PixelAvatar frame={x%2?8:12}/></div></div><div className="message-box">{message}</div><div className="controls"><button onClick={()=>move(-1)}>←</button><button className="primary-button" onClick={strike}>BOUNCE PULSE ✦</button><button onClick={()=>move(1)}>→</button></div><div className="quest-log"><span className={quest.worldBeamAligned?'done':''}>World Beam aligned</span><span className={quest.pulseNodesPowered?'done':''}>Pulse Nodes {quest.pulseNodes||0}/3</span></div>{quest.pulseNodesPowered&&<button className="primary-button" onClick={()=>enter('observatory')}>Enter Triune Observatory →</button>}</section>;
}
function TriuneObservatory({quest,setQuest,enter,playSfx}){
 const target=['root','pulse','lens']; const step=quest.lensStep||0; const [message,setMessage]=useState(quest.viewSigil?'The View Sigil is stable. A route appears back on the Basin map.':'Three powered shutters reveal one phrase: ROOT · PULSE · LENS.');
 const choose=(v)=>{if(quest.viewSigil)return;if(v===target[step]){const next=step+1;setQuest(q=>({...q,lensStep:next,viewSigil:next>=3}));playSfx('viewShift',.4);setMessage(next>=3?'VIEW SIGIL FORMED. The sealed boss road appears on the overworld.':`Lens ${next}/3 locked. The other viewpoints answer.`)}else{setQuest(q=>({...q,lensStep:0}));playSfx('hit',.22);setMessage('The shutters close. ROOT · PULSE · LENS.')};};
 return <section className="mode-panel first-panel observatory-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">CHAPTER V · MODE III-G · LENS CAUSALITY</p><h2>Triune Observatory</h2><p>The shutters only have power because you struck the side-view Pulse Nodes.</p></div><div className="observatory-room" style={{backgroundImage:`url(${observatoryRoom})`}}></div><div className="message-box">{message}</div><div className="shrine-controls">{target.map(v=><button key={v} onClick={()=>choose(v)}>{v.toUpperCase()}</button>)}</div>{quest.viewSigil&&<button className="primary-button" onClick={()=>enter('blindAngleBoss')}>Follow the new route to The Blind Angle →</button>}</section>;
}
function BlindAngleBoss({quest,setQuest,onVictory,playSfx}){
 const [phase,setPhase]=useState(0); const [message,setMessage]=useState('The Blind Angle cannot be attacked from one perspective. Use the mechanic each phase remembers.'); const phaseNames=['TOP-DOWN PRISM','SIDE-VIEW PULSE','FIRST-PERSON LENS']; const attacks=['PRISM STRIKE','PULSE STRIKE','LENS STRIKE'];
 const strike=()=>{const requirements=[quest.worldBeamAligned,quest.pulseNodesPowered,quest.viewSigil];if(!requirements[phase]){setMessage('That viewpoint is not stabilized. The Blind Angle folds away.');playSfx('hit',.3);return;}const next=phase+1;playSfx('viewShift',.55);if(next>=3){setQuest(q=>({...q,blindAngleDefeated:true,convergenceCrown:true,chapterFiveComplete:true}));playSfx('convergenceVictory',.8);setMessage('THE BLIND ANGLE COLLAPSES. All three viewpoints agree on one world at last.');}else{setPhase(next);setMessage(`PHASE ${next} BROKEN. The boss rotates into ${phaseNames[next]}.`);}};
 const won=quest.convergenceCrown;
 return <section className="mode-panel side-panel blind-angle-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">CHAPTER V BOSS · THREE-VIEW COMBAT</p><h2>The Blind Angle</h2><p>Each boss phase is vulnerable only to state established in a different viewpoint.</p></div><div className="blind-status"><span>PHASE {Math.min(phase+1,3)}/3</span><span>{won?'CONVERGENCE RESTORED':phaseNames[phase]}</span></div><div className="blind-angle-arena" style={{backgroundImage:`url(${blindAngleArena})`}}><div className="blind-angle-wrap"><BlindAngleSprite frame={phase*2} defeated={won}/></div></div><div className="message-box">{message}</div>{!won&&<button className="primary-button" onClick={strike}>{attacks[phase]} ✦</button>}{won&&<button className="primary-button" onClick={onVictory}>Claim Convergence Crown ◈</button>}</section>;
}
function ChapterFiveEnding({onRestart}){return <section className="mode-panel ending-panel convergence-ending"><div className="ending-stars">◈ · ✦ · ◈ · ✦ · ◈</div><PixelAvatar/><p className="mode-kicker">CHAPTER FIVE COMPLETE</p><h2>Three Views. One World.</h2><p>The Basin prisms, Causeway Pulse Nodes, and Observatory lenses now agree on the same geometry. The Blind Angle is gone.</p><blockquote>“One world. Three ways of seeing it.”</blockquote><div className="proof-grid"><span>✓ Top-down changes side-view</span><span>✓ Side-view powers first-person</span><span>✓ First-person opens overworld route</span><span>✓ Three-phase convergence boss</span><span>✓ Save state preserves all three</span><span>✓ Sixth travel landmark</span></div><p className="human-boundary">Cross-view clarity, switching friction, boss readability, pacing and commercial depth remain human review gates.</p><button className="primary-button" onClick={onRestart}>Restart the five-chapter adventure ↻</button></section>}

const dialogue = [
  { speaker: 'Princess Larrina', expression: 'surprised', text: 'You brought back the Rhythm Crest — and the Resonance Seal. The Tower stopped shaking the instant The Flat Note broke. I was hoping the old songs were exaggerating about the part where the hero has to bounce on monsters.' },
  { speaker: 'More Bounce', expression: 'neutral', text: 'They were Flatlings. “Monsters” gives them a lot of credit.' },
  { speaker: 'Princess Larrina', expression: 'smile', text: 'Three Echo Shards, one Rune, one Crest, one ridiculous beard. The kingdom has had worse restoration plans.' },
  { speaker: 'Princess Larrina', expression: 'concern', text: 'The Flat Note was guarding a wound, not causing it. This fixed one broken rhythm — not the source. There are other roads, other shrines, and something farther east is still swallowing the beat. Take the eastern gate. Find Mira Reed at the old windmill.' },
];
function LarrinaTower({ onFinish, playSfx }) {
  const [line, setLine] = useState(0); const [inspected, setInspected] = useState(false); const current = dialogue[line];
  const next = () => { playSfx('dialogue', .34); if (line >= dialogue.length - 1) onFinish(); else setLine((v) => v + 1); };
  return <section className="mode-panel first-panel"><div className="panel-copy compact-copy"><p className="mode-kicker">MODE III-B · STORY PAYOFF</p><h2>Larrina Tower</h2><p>The Crest and Seal are whole again. Larrina is about to open the road into Chapter Two.</p></div><div className="first-person-room tower-final-art" style={{ backgroundImage: `url(${towerRoom})` }}><div className="tower-art-credit">LARRINA TOWER · FINAL ART</div><button className="hotspot window-hotspot" onClick={() => setInspected(true)} aria-label="Inspect moon window">MOON WINDOW</button><div className="fp-rune">◈</div><div className="princess-wrap"><LarrinaCharacter frame={line === 0 ? 16 : line === 2 ? 12 : 0} /></div></div><div className="dialogue-box larrina-dialogue-box"><LarrinaPortrait expression={current.expression} /><div className="dialogue-copy"><p className="speaker">{current.speaker}</p><p>{current.text}</p>{inspected && <p className="inspection">Far beyond the window, another dark pulse rolls across the eastern hills. This adventure is now clearly bigger than one Rune.</p>}</div></div><div className="dialogue-actions"><button className="primary-button" onClick={next}>{line === dialogue.length - 1 ? 'Raise the Rhythm Crest ◈' : 'Continue →'}</button></div></section>;
}

function Ending({ onRestart }) {
  return <section className="mode-panel ending-panel"><div className="ending-stars">✦ · ✧ · ✦ · ✧ · ✦</div><PixelAvatar /><p className="mode-kicker">BOSS + COMBAT PASS COMPLETE</p><h2>The First Rhythm Returns.</h2><p>More Bounce has followed a clue, opened an old ruin, claimed the Rune, cleared Echo Hollow, restored the Beat Shrine, defeated The Flat Note, and brought the Rhythm Crest and Resonance Seal to Larrina.</p><blockquote>“One world. Three ways of seeing it. More than one road worth taking.”</blockquote><div className="proof-grid"><span>✓ 6 overworld nodes</span><span>✓ 2 side-view routes</span><span>✓ 2 first-person interiors</span><span>✓ NPC + treasure + enemies</span><span>✓ 3-shard collection arc</span><span>✓ 3-step shrine puzzle</span><span>✓ 1 six-hit rhythm boss</span></div><p className="human-boundary">Commercial depth is still a human judgment. v5.21 adds a real boss/combat loop; it does not automatically declare the game worth $3.69.</p><button className="primary-button" onClick={onRestart}>Play the expanded adventure again ↻</button></section>;
}

function App() {
  const captureMode = useMemo(() => new URLSearchParams(window.location.search).get('capture') === '1', []);
  const [mode, setMode] = useState(captureMode ? 'overworld' : 'title');
  const [quest, setQuest] = useState(() => ({ ...DEFAULT_QUEST, appleNodes: [] }));
  const [visitedModes, setVisitedModes] = useState(captureMode ? ['overworld'] : []);
  const [saveOpen, setSaveOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [travelState, setTravelState] = useState(() => normalizeTravelState({}, {}));
  const [slots, setSlots] = useState(() => listManualSlots());
  const [autosave, setAutosave] = useState(() => readAutosave());
  const playStartedAt = useRef(Date.now());
  const playtimeBase = useRef(0);
  const audio = useAudioDirector(mode);
  const playtimeSeconds = () => playtimeBase.current + Math.max(0, Math.floor((Date.now() - playStartedAt.current) / 1000));
  const makeSave = (kind = 'manual', slot = 'current') => buildLegendSave({ slot, kind, mode, quest, visitedModes, travelState, playtimeSeconds: playtimeSeconds() });
  const refreshSaves = () => { setSlots(listManualSlots()); setAutosave(readAutosave()); };
  const restart = () => { setQuest({ ...DEFAULT_QUEST, appleNodes: [] }); setVisitedModes([]); setTravelState(normalizeTravelState({}, {})); playtimeBase.current = 0; playStartedAt.current = Date.now(); setMode(captureMode ? 'overworld' : 'title'); };
  const loadSave = (save) => { if (!save) return; const normalized = normalizeLegendSave(save); setQuest({ ...DEFAULT_QUEST, ...normalized.progress, appleNodes: normalized.progress.appleNodes || [] }); setVisitedModes(normalized.discoveredLocations || []); setTravelState(normalizeTravelState(normalized.travelNetwork || {}, normalized.progress)); playtimeBase.current = normalized.playtimeSeconds || 0; playStartedAt.current = Date.now(); setSaveOpen(false); setJournalOpen(false); setWorldMapOpen(false); setMode(normalized.resume.safeMode); };
  const saveManual = (slot) => { writeSlot(slot, makeSave('manual', slot)); refreshSaves(); };
  const deleteManual = (slot) => { deleteSlot(slot); refreshSaves(); };
  const importSave = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const imported = normalizeLegendSave(JSON.parse(await file.text())); loadSave(imported); } catch (error) { window.alert(`Could not import save: ${error.message}`); } finally { event.target.value = ''; } };
  useEffect(() => { if (mode === 'title') return; setVisitedModes((current) => current.includes(mode) ? current : [...current, mode]); }, [mode]);
  useEffect(() => { if (captureMode || mode === 'title') return undefined; const timer = window.setTimeout(() => { const save = buildLegendSave({ slot: 'autosave', kind: 'autosave', mode, quest, visitedModes: visitedModes.includes(mode) ? visitedModes : [...visitedModes, mode], travelState, playtimeSeconds: playtimeSeconds() }); writeAutosave(save); setAutosave(readAutosave()); }, 220); return () => window.clearTimeout(timer); }, [mode, quest, visitedModes, travelState, captureMode]);
  useEffect(() => { setTravelState((current) => normalizeTravelState(current, quest)); }, [quest.beaconLens, quest.eastComplete, quest.stormglassCompass, quest.chapterFourComplete, quest.convergenceCrown, quest.chapterFiveComplete]);
  useEffect(() => {
    if (!['tower','ironOrchard'].includes(mode)) return;
    const network = deriveTravelNetwork({ quest, discoveredLocations: visitedModes.includes(mode) ? visitedModes : [...visitedModes, mode], travelState });
    const landmark = network.find((item) => item.mode === mode);
    if (landmark?.discovered && !landmark.activated) {
      try { setTravelState((current) => activateLandmark(current, landmark.id, { quest, discoveredLocations: visitedModes.includes(mode) ? visitedModes : [...visitedModes, mode], currentMode: mode })); } catch {}
    }
  }, [mode, quest, visitedModes]);
  const activateTravelLandmark = (id) => { try { setTravelState((current) => activateLandmark(current, id, { quest, discoveredLocations: visitedModes, currentMode: mode })); } catch (error) { window.alert(error.message); } };
  const fastTravelTo = (id) => {
    const network = deriveTravelNetwork({ quest, discoveredLocations: visitedModes, travelState });
    const target = network.find((item) => item.id === id);
    if (!target?.activated) return;
    const from = currentLandmarkForMode(mode, network);
    try { setTravelState((current) => recordFastTravel(current, from?.id || null, id, quest)); setWorldMapOpen(false); setMode(target.safeMode); } catch (error) { window.alert(error.message); }
  };
  const currentSave = makeSave('preview', 'current');
  return <main className={captureMode ? 'screen capture-mode' : 'screen'}><div className="game-shell" style={{ '--pf-ui-frame': `url(${uiFrame})` }}>
    {mode !== 'title' && <Header mode={mode} quest={quest} soundEnabled={audio.enabled} onToggleSound={audio.toggle} onOpenSave={() => setSaveOpen(true)} onOpenJournal={() => setJournalOpen(true)} onOpenMap={() => setWorldMapOpen(true)} />}
    {mode === 'title' && <TitleScreen soundEnabled={audio.enabled} onToggleSound={audio.toggle} continueAvailable={Boolean(autosave)} onContinue={() => loadSave(autosave)} onOpenSave={() => setSaveOpen(true)} onStart={() => { audio.enable(); restart(); setMode('overworld'); }} />}
    {mode === 'overworld' && <Overworld quest={quest} setQuest={setQuest} playSfx={audio.play} enter={setMode} />}
    {mode === 'wobble' && <WobbleWoods quest={quest} setQuest={setQuest} onExit={() => setMode('overworld')} playSfx={audio.play} />}
    {mode === 'hollow' && <EchoHollow quest={quest} setQuest={setQuest} onExit={() => setMode('overworld')} playSfx={audio.play} />}
    {mode === 'shrine' && <BeatShrine playSfx={audio.play} onComplete={() => { setQuest((q) => ({ ...q, crest: true })); setMode('boss'); }} />}
    {mode === 'boss' && <FlatNoteBoss playSfx={audio.play} onVictory={() => { setQuest((q) => ({ ...q, seal: true })); setMode('overworld'); }} />}
    {mode === 'tower' && <LarrinaTower playSfx={audio.play} onFinish={() => setMode('eastRoad')} />}
    {mode === 'eastRoad' && <EasternRoad quest={quest} setQuest={setQuest} playSfx={audio.play} enter={setMode} />}
    {mode === 'glassgrass' && <GlassgrassPass quest={quest} setQuest={setQuest} playSfx={audio.play} onExit={() => setMode('eastRoad')} />}
    {mode === 'signalMill' && <SignalMill quest={quest} setQuest={setQuest} playSfx={audio.play} onComplete={() => setMode('chapter2Ending')} />}
    {mode === 'chapter2Ending' && <ChapterTwoEnding onContinue={() => setMode('ironOrchard')} />}
    {mode === 'ironOrchard' && <IronOrchard quest={quest} setQuest={setQuest} playSfx={audio.play} enter={setMode} />}
    {mode === 'rivetForge' && <RivetForge quest={quest} setQuest={setQuest} playSfx={audio.play} onExit={() => setMode('ironOrchard')} />}
    {mode === 'rustroot' && <RustrootCavern quest={quest} setQuest={setQuest} playSfx={audio.play} onExit={() => setMode('ironOrchard')} />}
    {mode === 'rustbloomBoss' && <RustbloomBoss quest={quest} setQuest={setQuest} playSfx={audio.play} onVictory={() => setMode('chapter3Ending')} />}
    {mode === 'chapter3Ending' && <ChapterThreeEnding onContinue={() => setMode('stormglassCoast')} onRestart={restart} />}
    {mode === 'stormglassCoast' && <StormglassCoast quest={quest} setQuest={setQuest} playSfx={audio.play} enter={setMode} />}
    {mode === 'stormglassCliffs' && <StormglassCliffs quest={quest} setQuest={setQuest} playSfx={audio.play} enter={setMode} />}
    {mode === 'tideEngine' && <TideEngine quest={quest} setQuest={setQuest} playSfx={audio.play} enter={setMode} />}
    {mode === 'undertowBoss' && <UndertowBellBoss quest={quest} setQuest={setQuest} playSfx={audio.play} onVictory={() => setMode('chapter4Ending')} />}
    {mode === 'chapter4Ending' && <ChapterFourEnding onContinue={() => setMode('mirrorfall')} onRestart={restart} />}
    {mode === 'mirrorfall' && <MirrorfallBasin quest={quest} setQuest={setQuest} enter={setMode} playSfx={audio.play} />}
    {mode === 'splitlight' && <SplitlightCauseway quest={quest} setQuest={setQuest} enter={setMode} playSfx={audio.play} />}
    {mode === 'observatory' && <TriuneObservatory quest={quest} setQuest={setQuest} enter={setMode} playSfx={audio.play} />}
    {mode === 'blindAngleBoss' && <BlindAngleBoss quest={quest} setQuest={setQuest} playSfx={audio.play} onVictory={() => setMode('chapter5Ending')} />}
    {mode === 'chapter5Ending' && <ChapterFiveEnding onRestart={restart} />}
    {mode === 'ending' && <Ending onRestart={restart} />}
    <WorldMapModal open={worldMapOpen} onClose={() => setWorldMapOpen(false)} quest={quest} visitedModes={visitedModes} travelState={travelState} currentMode={mode} onActivate={activateTravelLandmark} onTravel={fastTravelTo} />
    <SaveMenu open={saveOpen} onClose={() => setSaveOpen(false)} slots={slots} autosave={autosave} currentSave={currentSave} onSave={saveManual} onLoad={loadSave} onDelete={deleteManual} onExport={(save) => exportSaveFile(save)} onImport={importSave} />
    <JournalModal open={journalOpen} onClose={() => setJournalOpen(false)} quest={quest} visitedModes={visitedModes} checkpoint={currentSave.checkpoint} />
    {!captureMode && <footer className="proof-footer"><span>Original PixelForge adventure</span><span>3 manual slots + autosave · 6-point shrine network · local-only</span><span>v1.8 Three-View Convergence · cross-view clarity + boss readability + commercial-depth review pending</span></footer>}
  </div></main>;
}
createRoot(document.getElementById('root')).render(<App />);
