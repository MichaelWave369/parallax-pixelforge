import React,{useEffect,useMemo,useRef,useState} from 'react';
import WorldPlayer from './WorldPlayer.jsx';
import {resolveReleaseMetadata} from './release-metadata.js';
import {resolveReleaseExtras} from './release-extras.js';
import {emptyBundledNotices,validateBundledNotices} from './license-notices.js';
import {firstStandardGamepad} from './standard-gamepad.js';
import {neutralTitlePad,readTitlePad,titlePadEdges,nextTitleFocus} from './title-gamepad.js';
import './published-game.css';

// The standalone game's title and credits never start physics or edit saves.
export default function PublishedGameShell({world,release:rawRelease,extras:rawExtras,notices:rawNotices}){
  const release=useMemo(()=>resolveReleaseMetadata(rawRelease,world.title),[rawRelease,world.title]);
  const extras=useMemo(()=>resolveReleaseExtras(rawExtras),[rawExtras]);
  const notices=useMemo(()=>validateBundledNotices(rawNotices??emptyBundledNotices()),[rawNotices]);
  const [started,setStarted]=useState(false);
  const [creditsOpen,setCreditsOpen]=useState(false);
  const [gamepadConnected,setGamepadConnected]=useState(false);
  const [settings,setSettings]=useState({
    touchControls:true,showPlaytestTools:false,reducedMotion:false
  });
  const menuRefs=useRef([]);
  const selectedIndex=useRef(0);
  const closeCreditsRef=useRef(null);
  const lastPadRef=useRef(neutralTitlePad());
  const setFlag=(name,value)=>setSettings(old=>({...old,[name]:value}));
  const closeCredits=()=>{setCreditsOpen(false);selectedIndex.current=1;};
  const backToTitle=()=>{
    if(document.fullscreenElement)void document.exitFullscreen?.().catch(()=>{});
    setStarted(false);
  };
  useEffect(()=>{
    if(started)return;
    // Poll only while the title/credits menu exists. No global Gamepad timer.
    function getPad(){
      try{return readTitlePad(firstStandardGamepad(navigator.getGamepads?.()));}
      catch{return neutralTitlePad();}
    }
    lastPadRef.current=getPad();
    let active=true,frame=0;
    const tick=()=>{
      if(!active)return;
      if(document.visibilityState==='visible'){
        const next=getPad();
        const edges=titlePadEdges(lastPadRef.current,next);
        if(next.connected!==lastPadRef.current.connected)setGamepadConnected(next.connected);
        lastPadRef.current=next;
        if(creditsOpen){
          if(edges.back||edges.confirm)closeCredits();
        }else{
          if(edges.up||edges.down){
            const nextIndex=nextTitleFocus(selectedIndex.current,edges.down?1:-1,5);
            selectedIndex.current=nextIndex;
            menuRefs.current[nextIndex]?.focus();
          }
          if(edges.confirm)menuRefs.current[selectedIndex.current]?.click();
        }
      }
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{active=false;cancelAnimationFrame(frame);};
  },[started,creditsOpen]);
  useEffect(()=>{
    if(creditsOpen)closeCreditsRef.current?.focus();
    else if(!started)menuRefs.current[selectedIndex.current]?.focus();
  },[creditsOpen,started]);
  const palette={'--pixReleaseAccent':release.accent};
  if(started){
    return <div className={'pixPublishedFrame'+(settings.reducedMotion?' pixPublishedReducedMotion':'')+
      (settings.touchControls?' pixPublishedShowTouch':'')+
      (settings.showPlaytestTools?' pixPublishedShowTools':'')} style={palette}>
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
      {creditsOpen?<section className="pixPublishedCreditsPanel" aria-label="Game credits and license notices">
        <div className="pixPublishedCreditsHeader">
          <h1>CREDITS & LICENSES</h1>
          <button type="button" ref={closeCreditsRef} onClick={closeCredits}>← BACK TO TITLE</button>
        </div>
        <p className="pixPublishedCreator">{release.title} · {release.creator}</p>
        <h2>GAME CREDITS</h2>
        {extras.credits.length?
          <dl className="pixPublishedCreditsList">
            {extras.credits.map((item,i)=><div key={i}><dt>{item.role}</dt><dd>{item.name}</dd></div>)}
          </dl>:
          <p>No additional contributor credits were supplied by the creator.</p>}
        <h2>CREATOR CONTENT RIGHTS</h2>
        <p className="pixPublishedContentNotice">{extras.contentNotice}</p>
        <h2>PIXELFORGE & THIRD-PARTY SOFTWARE LICENSES</h2>
        <p>The published player includes the libraries below. Their license texts are copied
          from the installed runtime packages when this offline player is built.</p>
        {notices.packages.length?notices.packages.map(entry=>
          <details key={entry.name} className="pixPublishedLicense">
            <summary>{entry.name} · v{entry.version} · {entry.license}</summary>
            <pre>{entry.text}</pre>
          </details>):<p>No bundled license texts were found in this older release.</p>}
        <p className="pixPublishedControlHint">GAMEPAD: B TO RETURN · A TO RETURN</p>
      </section>:<>
        {extras.cover?
          <figure className="pixPublishedCoverFigure">
            <img src={extras.cover.dataUrl} alt={extras.cover.alt}/>
          </figure>:
          <div className="pixPublishedSeal" aria-hidden="true">Φ</div>}
        <p className="pixPublishedCreator">{release.creator.toUpperCase()} PRESENTS</p>
        <h1>{release.title}</h1>
        <p className="pixPublishedTagline">{release.tagline}</p>
        <div className="pixPublishedLaunchActions">
          <button type="button" className="pixPublishedStart"
            ref={element=>{menuRefs.current[0]=element;}}
            onFocus={()=>{selectedIndex.current=0;}} onClick={()=>setStarted(true)}>
            ▶ START ADVENTURE
          </button>
          <button type="button" className="pixPublishedCreditsButton"
            ref={element=>{menuRefs.current[1]=element;}}
            onFocus={()=>{selectedIndex.current=1;}} onClick={()=>setCreditsOpen(true)}>
            ◇ CREDITS & LICENSES
          </button>
        </div>
        <section className="pixPublishedSettings" aria-label="Launch settings">
          <h2>LAUNCH SETTINGS</h2>
          <label><input type="checkbox" checked={settings.touchControls}
            ref={element=>{menuRefs.current[2]=element;}}
            onFocus={()=>{selectedIndex.current=2;}}
            onChange={e=>setFlag('touchControls',e.target.checked)}/>
            <span><b>Show on-screen movement controls</b>
              <small>Useful for touchscreens; keyboard and controller always work</small></span>
          </label>
          <label><input type="checkbox" checked={settings.showPlaytestTools}
            ref={element=>{menuRefs.current[3]=element;}}
            onFocus={()=>{selectedIndex.current=3;}}
            onChange={e=>setFlag('showPlaytestTools',e.target.checked)}/>
            <span><b>Show advanced playtest tools</b>
              <small>Ghost recording, Inspector, save import/export and diagnostics</small></span>
          </label>
          <label><input type="checkbox" checked={settings.reducedMotion}
            ref={element=>{menuRefs.current[4]=element;}}
            onFocus={()=>{selectedIndex.current=4;}}
            onChange={e=>setFlag('reducedMotion',e.target.checked)}/>
            <span><b>Reduce decorative motion</b>
              <small>Disables non-essential interface animation, not physics simulation</small></span>
          </label>
        </section>
        <p className="pixPublishedControlHint">WASD / ARROWS MOVE · SPACE JUMP · SHIFT SPRINT · E INTERACT
          <br/>GAMEPAD: D-PAD / LEFT STICK NAVIGATE · A OR START SELECT · B BACK</p>
        <footer className="pixPublishedCredits">CREATED WITH PIXELFORGE · OFFLINE PLAYER · NO NETWORK REQUIRED
          {gamepadConnected&&<span className="pixPublishedGamepadStatus"> · STANDARD CONTROLLER CONNECTED</span>}
        </footer>
      </>}
    </div>
  </main>;
}
