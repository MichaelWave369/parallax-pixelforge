import React,{useEffect,useMemo,useRef,useState} from 'react';
import WorldPlayer from './WorldPlayer.jsx';
import {resolveReleaseMetadata} from './release-metadata.js';
import {resolveReleaseExtras} from './release-extras.js';
import {emptyBundledNotices,validateBundledNotices} from './license-notices.js';
import {firstStandardGamepad} from './standard-gamepad.js';
import {neutralTitlePad,readTitlePad,titlePadEdges,nextTitleFocus} from './title-gamepad.js';
import {digestPlayableWorld,PLAYTEST_MAX_BYTES} from './playtest-save.js';
import {inspectBrowserSave,importTitleSaveJson,requireFreshRunConfirmation} from './published-save-menu.js';
import {downloadJson} from './forge-world.js';
import './published-game.css';

// The standalone game's title and credits never start physics or edit saves.
export default function PublishedGameShell({world,release:rawRelease,extras:rawExtras,notices:rawNotices}){
  const release=useMemo(()=>resolveReleaseMetadata(rawRelease,world.title),[rawRelease,world.title]);
  const extras=useMemo(()=>resolveReleaseExtras(rawExtras),[rawExtras]);
  const notices=useMemo(()=>validateBundledNotices(rawNotices??emptyBundledNotices()),[rawNotices]);
  const [started,setStarted]=useState(false);
  const [launchSave,setLaunchSave]=useState(null);
  const [browserSave,setBrowserSave]=useState({status:'checking',save:null,summary:null,reason:'Checking browser-local saved progress…',otherSlots:0});
  const [worldDigest,setWorldDigest]=useState('');
  const [importedSave,setImportedSave]=useState(null);
  const [saveChoice,setSaveChoice]=useState('browser');
  const [saveMessage,setSaveMessage]=useState('');
  const [newRunConfirmation,setNewRunConfirmation]=useState(false);
  const savePicker=useRef(null);
  useEffect(()=>{
    if(started)return;
    let active=true;
    setBrowserSave({status:'checking',save:null,summary:null,reason:'Checking browser-local saved progress…',otherSlots:0});
    digestPlayableWorld(world).then(digest=>{
      if(!active)return;
      setWorldDigest(digest);
      let storage=null;
      try{storage=window.localStorage;}catch{/* File origin may prohibit local storage. */}
      const result=inspectBrowserSave(world,digest,storage);
      setBrowserSave(result);
      setSaveMessage(result.status==='invalid'?result.reason:'');
    }).catch(error=>{
      if(active){
        setWorldDigest('');
        setBrowserSave({status:'unavailable',save:null,summary:null,otherSlots:0,
          reason:'Cannot verify world digest for local saves: '+error.message});
      }
    });
    return()=>{active=false;};
  },[world,started]);
  const selectedSave=saveChoice==='imported'?importedSave:browserSave.save;
  function beginAdventure(save=null){
    setLaunchSave(save);setNewRunConfirmation(false);setStarted(true);
  }
  function startFresh(){
    if(requireFreshRunConfirmation(browserSave.status)){
      setNewRunConfirmation(true);setSaveMessage('New Adventure starts at the beginning without deleting any browser save. Confirm to continue.');
    }else beginAdventure(null);
  }
  async function importSave(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{
      if(!worldDigest)throw Error('World verification is not ready.');
      if(file.size>PLAYTEST_MAX_BYTES)throw Error('Save file exceeds the 64 KB limit.');
      const save=importTitleSaveJson(await file.text(),world,worldDigest);
      setImportedSave(save);setSaveChoice('imported');setSaveMessage('Imported save verified for this exact world. It is held in memory only.');
    }catch(error){setSaveMessage('Import rejected: '+error.message);}
  }
  function exportBrowserSave(){
    if(browserSave.status!=='ready'||!browserSave.save)return;
    downloadJson(browserSave.save,'pixelforge-save-backup.v1.json');
    setSaveMessage('Downloaded a copy of the browser save; its original slot is unchanged.');
  }
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
    setImportedSave(null);setSaveChoice('browser');setLaunchSave(null);
    setNewRunConfirmation(false);setSaveMessage('');
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
            const available=menuRefs.current.map((el,i)=>el&&!el.disabled?i:-1)
              .filter(i=>i>=0);
            if(available.length){
              const current=Math.max(0,available.indexOf(selectedIndex.current));
              const nextIndex=nextTitleFocus(current,edges.down?1:-1,available.length);
              selectedIndex.current=available[nextIndex];
              menuRefs.current[selectedIndex.current]?.focus();
            }
          }
          if(edges.confirm){
            const target=menuRefs.current[selectedIndex.current];
            if(target&&!target.disabled)target.click();
          }
        }
      }
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{active=false;cancelAnimationFrame(frame);};
  },[started,creditsOpen]);
  useEffect(()=>{
    if(creditsOpen)closeCreditsRef.current?.focus();
    else if(!started){
      const chosen=menuRefs.current[selectedIndex.current];
      if(chosen&&!chosen.disabled)chosen.focus();
      else{
        const first=menuRefs.current.find(el=>el&&!el.disabled);
        first?.focus();
      }
    }
  },[creditsOpen,started]);
  const palette={'--pixReleaseAccent':release.accent};
  if(started){
    return <div className={'pixPublishedFrame'+(settings.reducedMotion?' pixPublishedReducedMotion':'')+
      (settings.touchControls?' pixPublishedShowTouch':'')+
      (settings.showPlaytestTools?' pixPublishedShowTools':'')} style={palette}>
      <WorldPlayer key={world.title} initialWorld={world} standalone initialSave={launchSave}
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
