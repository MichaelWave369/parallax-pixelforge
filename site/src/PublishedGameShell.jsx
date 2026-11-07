import React,{useState} from 'react';
import WorldPlayer from './WorldPlayer.jsx';
import {resolveReleaseMetadata} from './release-metadata.js';
import './published-game.css';

// A published game begins here, without touching world saves or starting
// physics until the player explicitly chooses Start Adventure.
export default function PublishedGameShell({world,release:rawRelease}){
  const release=resolveReleaseMetadata(rawRelease,world.title);
  const [started,setStarted]=useState(false);
  const [settings,setSettings]=useState({
    touchControls:true,
    showPlaytestTools:false,
    reducedMotion:false
  });
  const setFlag=(name,value)=>setSettings(old=>({...old,[name]:value}));
  const backToTitle=()=>{
    if(document.fullscreenElement)void document.exitFullscreen?.().catch(()=>{});
    setStarted(false);
  };
  const palette={'--pixReleaseAccent':release.accent};
  if(started){
    return <div className={'pixPublishedFrame'+(settings.reducedMotion?' pixPublishedReducedMotion':'')}
      style={palette}>
      <WorldPlayer key={world.title} initialWorld={world} standalone
        release={release} publishedSettings={settings} onExit={backToTitle}/>
    </div>;
  }
  return <main className="pixPublishedLaunch" style={palette}>
    <div className="pixPublishedAtmosphere" aria-hidden="true">
      <div className="pixPublishedRing one"/><div className="pixPublishedRing two"/>
      <div className="pixPublishedTower a"/><div className="pixPublishedTower b"/>
    </div>
    <div className="pixPublishedLaunchPanel">
      <div className="pixPublishedTopline"><span>PIXELFORGE / PUBLISHED ADVENTURE</span>
        <span>RELEASE {release.version}</span></div>
      <div className="pixPublishedSeal" aria-hidden="true">Φ</div>
      <p className="pixPublishedCreator">{release.creator.toUpperCase()} PRESENTS</p>
      <h1>{release.title}</h1>
      <p className="pixPublishedTagline">{release.tagline}</p>
      <div className="pixPublishedLaunchActions">
        <button type="button" className="pixPublishedStart" onClick={()=>setStarted(true)}>
          ▶ START ADVENTURE
        </button>
      </div>
      <section className="pixPublishedSettings" aria-label="Launch settings">
        <h2>LAUNCH SETTINGS</h2>
        <label><input type="checkbox" checked={settings.touchControls}
          onChange={e=>setFlag('touchControls',e.target.checked)}/>
          <span><b>Show on-screen movement controls</b>
            <small>Useful for touchscreens; keyboard and controller always work</small></span>
        </label>
        <label><input type="checkbox" checked={settings.showPlaytestTools}
          onChange={e=>setFlag('showPlaytestTools',e.target.checked)}/>
          <span><b>Show advanced playtest tools</b>
            <small>Ghost recording, Inspector, save import/export and diagnostics</small></span>
        </label>
        <label><input type="checkbox" checked={settings.reducedMotion}
          onChange={e=>setFlag('reducedMotion',e.target.checked)}/>
          <span><b>Reduce decorative motion</b>
            <small>Disables non-essential interface animation, not physics simulation</small></span>
        </label>
      </section>
      <p className="pixPublishedControlHint">WASD / ARROWS TO MOVE · SPACE TO JUMP · SHIFT TO SPRINT · E TO INTERACT<br/>
        GAMEPAD: LEFT STICK MOVE · RIGHT STICK CAMERA · A JUMP · X INTERACT</p>
      <footer className="pixPublishedCredits">CREATED WITH PIXELFORGE · OFFLINE PLAYER · NO NETWORK REQUIRED</footer>
    </div>
  </main>;
}
