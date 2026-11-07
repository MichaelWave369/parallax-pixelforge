import React,{Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {downloadJson} from './forge-world.js';
import {downloadOfflineWorld} from './offline-publisher.js';
import {defaultReleaseMetadata} from './release-metadata.js';
import ReleaseMetadataEditor from './ReleaseMetadataEditor.jsx';
import ReleaseExtrasEditor from './ReleaseExtrasEditor.jsx';
import {PLAYABLE_MAX_BYTES,createSamplePlayableWorld,parsePlayableWorld,validatePlayableWorld} from './playable-world.js';
import {advanceGameplaySession,newGameplaySession} from './gameplay-rules.js';
import {dependenciesMet} from './event-graph.js';
import {
  GHOST_MAX_BYTES,GHOST_MAX_SAMPLES,appendGhostSample,ghostStorageKey,
  validateGhostRun,createGhostRun,parseGhostRun,analyzeGhostRun
} from './ghost-run.js';
import {
  PLAYTEST_MAX_BYTES,digestPlayableWorld,playtestStorageKey,
  appendPlaytestFrame,replayPlaytestTrace,createPlaytestSave,parsePlaytestSave,
  lastPlaytestCheckpoint,listPlaytestCheckpoints,playtestCheckpointAt
} from './playtest-save.js';
import './world-player.css';
import PlaytestInspector from './PlaytestInspector.jsx';
import {preparePublishedRun} from './published-session.js';
const PhysicsStage=lazy(()=>import('./PhysicsStage.jsx'));
const BASE=import.meta.env.BASE_URL;

export default function WorldPlayer({initialWorld=null,onExit=null,standalone=false,
  release=null,publishedSettings=null,initialSave=null}){
  const [world,setWorld]=useState(()=>initialWorld?validatePlayableWorld(initialWorld):createSamplePlayableWorld());
  // Rung 16 restores the initial session BEFORE Rapier starts, so gates,
  // pickups and player spawn are correct on the first physics tick.
  const boot=useMemo(()=>
    initialSave?preparePublishedRun(initialWorld,initialSave):null,
    [initialSave,initialWorld]);
  const [status,setStatus]=useState(initialSave?'Verified saved adventure restored at its recorded position.':
    standalone?'Offline adventure ready. All world assets are embedded locally.':
    initialWorld?'Previewing your current Forge construction.':'Loaded public PixelForge starter course.');
  const [runtime,setRuntime]=useState('loading');
  const [paused,setPaused]=useState(false);
  const [fullscreenActive,setFullscreenActive]=useState(false);
  useEffect(()=>{
    if(!standalone)return;
    const changed=()=>setFullscreenActive(Boolean(document.fullscreenElement));
    changed();
    document.addEventListener('fullscreenchange',changed);
    return()=>document.removeEventListener('fullscreenchange',changed);
  },[standalone]);
  async function toggleFullscreen(){
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else{
        if(!document.documentElement.requestFullscreen)throw Error('This browser does not support fullscreen.');
        await document.documentElement.requestFullscreen();
      }
    }catch(error){setStatus('Fullscreen unavailable: '+error.message);}
  }
  const [fps,setFps]=useState({fps:0,bodies:0});
  const [session,setSession]=useState(0);
  const [respawnAt,setRespawnAt]=useState(()=>[...(boot?.position||initialWorld?.spawn||[0,2.2,0])]);
  const [worldDigest,setWorldDigest]=useState('');
  const [releaseDraft,setReleaseDraft]=useState(null);
  const [extrasDraft,setExtrasDraft]=useState(null);
  const [hasLocalSave,setHasLocalSave]=useState(false);
  const [pendingSaveOverwrite,setPendingSaveOverwrite]=useState(false);
  const [pendingSaveDelete,setPendingSaveDelete]=useState(false);
  const [traceFrames,setTraceFrames]=useState(()=>boot?.frames||[]);
  const [replayCursor,setReplayCursor]=useState(boot?boot.frames.length-1:-1);
  const [checkpointChoice,setCheckpointChoice]=useState('latest');
  const [gamepadConnected,setGamepadConnected]=useState(false);
  const [recordGhost,setRecordGhost]=useState(false);
  const [ghostRun,setGhostRun]=useState(null);
  const [showGhost,setShowGhost]=useState(false);
  const [ghostReplaySerial,setGhostReplaySerial]=useState(0);
  const [ghostSampleCount,setGhostSampleCount]=useState(0);
  const [hasLocalGhost,setHasLocalGhost]=useState(false);
  const [gameSession,setGameSession]=useState(()=>boot?.progress||newGameplaySession());
  const [activity,setActivity]=useState(()=>boot?.activity||[]);
  const [motion,setMotion]=useState({grounded:false,speed:0,sprinting:false,
    position:boot?.position||initialWorld?.spawn||[0,2.2,0]});
  const [virtualControls,setVirtualControls]=useState({right:0,forward:0,sprint:false,jumpSerial:0});
  const gameRef=useRef(gameSession),lastPosition=useRef(boot?.position||initialWorld?.spawn||[0,2.2,0]);
  const traceRef=useRef(boot?.frames||[]);
  const recordingRef=useRef(false),ghostSamplesRef=useRef([]);
  const chooser=useRef(null),saveChooser=useRef(null),ghostChooser=useRef(null),stage=useRef(null);
  useEffect(()=>{
    let active=true;
    setWorldDigest('');setHasLocalSave(false);setHasLocalGhost(false);
    digestPlayableWorld(world).then(hash=>{
      if(!active)return;
      setWorldDigest(hash);
      try{
        setHasLocalSave(localStorage.getItem(playtestStorageKey(hash))!==null);
        setHasLocalGhost(localStorage.getItem(ghostStorageKey(hash))!==null);
      }catch{setHasLocalSave(false);setHasLocalGhost(false);}
    }).catch(error=>{if(active)setStatus('Local save unavailable: '+error.message);});
    return()=>{active=false;};
  },[world]);
  const resetRules=()=>{
    recordingRef.current=false;ghostSamplesRef.current=[];
    setRecordGhost(false);setGhostSampleCount(0);
    const fresh=newGameplaySession();gameRef.current=fresh;
    setGameSession(fresh);setActivity([]);
    traceRef.current=[];setTraceFrames([]);setReplayCursor(-1);setCheckpointChoice('latest');
    setVirtualControls({right:0,forward:0,sprint:false,jumpSerial:0});
  };
  const onMotionStatus=useCallback(data=>setMotion(data),[]);
  const onGhostSample=useCallback(sample=>{
    if(!recordingRef.current)return;
    try{
      ghostSamplesRef.current=appendGhostSample(ghostSamplesRef.current,sample);
      if(ghostSamplesRef.current.length%5===0)
        setGhostSampleCount(ghostSamplesRef.current.length);
    }catch(e){
      recordingRef.current=false;setRecordGhost(false);
      setGhostSampleCount(ghostSamplesRef.current.length);
      setStatus('Ghost capture reached a limit: '+e.message+'. Preview Captured Samples to keep the recorded route.');
    }
  },[]);
  function startGhostCapture(){
    try{
      if(!worldDigest||runtime!=='ready'||paused)
        throw Error('Open a ready, running world with a completed digest first.');
      const position=stage.current?.getPlayerPosition?.();
      if(!position)throw Error('Rapier player has not spawned yet.');
      ghostSamplesRef.current=appendGhostSample([],{t:0,position,grounded:Boolean(motion.grounded)});
      recordingRef.current=true;
      setGhostSampleCount(1);setRecordGhost(true);
      setStatus('Recording local ghost path at approximately 5 Hz. Press Stop & Preview to finish.');
    }catch(e){setStatus('Ghost capture refused: '+e.message);}
  }
  function stopGhostCapture(){
    recordingRef.current=false;setRecordGhost(false);
    try{
      if(!worldDigest)throw Error('World digest has not loaded.');
      const run=createGhostRun(worldDigest,ghostSamplesRef.current);
      setGhostRun(run);setShowGhost(true);
      setGhostReplaySerial(n=>n+1);
      setGhostSampleCount(run.samples.length);
      setStatus('Ghost captured. A translucent path replay is running. Save or export it explicitly.');
    }catch(e){setStatus('Ghost preview refused: '+e.message);}
  }
  function playGhost(){
    if(!ghostRun)return;
    setShowGhost(true);setGhostReplaySerial(n=>n+1);
    setStatus('Playing the captured ghost route. The ghost cannot collide or change objectives.');
  }
  function saveGhostLocal(){
    try{
      const run=validateGhostRun(ghostRun,worldDigest);
      localStorage.setItem(ghostStorageKey(worldDigest),JSON.stringify(run));
      setHasLocalGhost(true);setStatus('Saved ghost locally under this exact world digest.');
    }catch(e){setStatus('Ghost save failed: '+e.message);}
  }
  function loadGhostLocal(){
    try{
      if(!worldDigest)throw Error('World digest is not ready.');
      const raw=localStorage.getItem(ghostStorageKey(worldDigest));
      if(raw===null)throw Error('No ghost recording saved for this world.');
      const run=parseGhostRun(raw,worldDigest);
      setGhostRun(run);setShowGhost(true);setGhostReplaySerial(n=>n+1);
      setStatus('Loaded matching browser-local ghost. Its playback is visual only.');
    }catch(e){setStatus('Ghost load rejected: '+e.message);}
  }
  function deleteGhostLocal(){
    try{
      if(!worldDigest)throw Error('World digest is not ready.');
      localStorage.removeItem(ghostStorageKey(worldDigest));
      setHasLocalGhost(false);setStatus('Deleted this world’s ghost slot only. The current preview remains available.');
    }catch(e){setStatus('Ghost delete failed: '+e.message);}
  }
  function exportGhost(){
    try{
      downloadJson(validateGhostRun(ghostRun,worldDigest),'pixelforge-ghost-run.v1.json');
      setStatus('Downloaded world-bound ghost JSON. Share the matching playable world separately.');
    }catch(e){setStatus('Ghost export refused: '+e.message);}
  }
  async function importGhost(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{
      if(file.size>GHOST_MAX_BYTES)throw Error('Ghost file exceeds 320 KB.');
      if(!worldDigest)throw Error('World digest is not ready.');
      const run=parseGhostRun(await file.text(),worldDigest);
      setGhostRun(run);setShowGhost(true);setGhostReplaySerial(n=>n+1);
      setGhostSampleCount(run.samples.length);
      setStatus('Imported matching ghost. No browser save was written.');
    }catch(e){setStatus('Ghost import rejected: '+e.message);}
  }
  const ghostStats=useMemo(()=>ghostRun?analyzeGhostRun(ghostRun):null,[ghostRun]);
  function startHold(axis,value,event){
    if(paused)return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setVirtualControls(c=>({...c,[axis]:value}));
  }
  function stopHold(axis){
    setVirtualControls(c=>c[axis]===0?c:{...c,[axis]:0});
  }
  function jump(){
    if(!paused)setVirtualControls(c=>({...c,jumpSerial:c.jumpSerial+1}));
  }
  const evaluate=useCallback((position,interact=false)=>{
    if(!world.gameplay||paused)return;
    try{
      const result=advanceGameplaySession(world.gameplay,gameRef.current,position,{interact});
      if(result.events.length){
        const frames=appendPlaytestFrame(traceRef.current,position,interact,result.events);
        traceRef.current=frames;setTraceFrames(frames);setReplayCursor(frames.length-1);
    setCheckpointChoice('latest');
        gameRef.current=result.session;
        setGameSession(result.session);
        setActivity(previous=>[...result.events.map(e=>({type:e.type,id:e.id,text:e.text})),...previous].slice(0,8));
        setStatus(result.events[result.events.length-1].text);
      }
    }catch(e){setStatus('Gameplay evaluation halted: '+e.message);}
  },[world.gameplay,paused]);
  const onPlayerPosition=useCallback(position=>{
    lastPosition.current=position;
    evaluate(position,false);
  },[evaluate]);
  useEffect(()=>{
    if(!world.gameplay?.graph)return;
    const handler=e=>{
      if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.key.toLowerCase()!=='e'||
        /^(input|textarea|select)$/i.test(e.target?.tagName||''))return;
      e.preventDefault();
      evaluate(lastPosition.current,true);
    };
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  },[world.gameplay,evaluate]);
  const sceneKey=useMemo(()=>world.title+' / '+world.source.sha256+' / session '+session,[world,session]);
  async function importFile(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{
      if(file.size>PLAYABLE_MAX_BYTES)throw Error('Playable world file exceeds 160 KB.');
      const validated=parsePlayableWorld(await file.text());
      resetRules();setPendingSaveOverwrite(false);setPendingSaveDelete(false);lastPosition.current=[...validated.spawn];
      setGhostRun(null);setShowGhost(false);setGhostReplaySerial(0);
      setReleaseDraft(null);setExtrasDraft(null);
      setRespawnAt([...validated.spawn]);setWorldDigest('');
      setWorld(validated);setSession(n=>n+1);setRuntime('loading');setPaused(false);
      setStatus('Loaded portable world: '+validated.title+'. No scripts executed.');
    }catch(error){setStatus('Import rejected: '+error.message);}
  }
  async function publishCurrentWorld(){
    try{
      setStatus('Preparing the trusted offline adventure package…');
      const result=await downloadOfflineWorld(world,releaseDraft??defaultReleaseMetadata(world.title),extrasDraft);
      setStatus('Published '+result.filename+' ('+Math.round(result.bytes/1024)+' KiB). Open the HTML locally in a WebGL2 browser.');
    }catch(e){setStatus('Offline publishing refused: '+e.message);}
  }
  function reset(){
    resetRules();setPendingSaveOverwrite(false);setPendingSaveDelete(false);lastPosition.current=[...world.spawn];setRespawnAt([...world.spawn]);
    setSession(n=>n+1);setPaused(false);
    setStatus('World restarted at its declared spawn point. Collectibles and checkpoints reset.');
  }
  function demo(){
    const sample=createSamplePlayableWorld();
    resetRules();setPendingSaveOverwrite(false);setPendingSaveDelete(false);lastPosition.current=[...sample.spawn];setRespawnAt([...sample.spawn]);
    setGhostRun(null);setShowGhost(false);setGhostReplaySerial(0);
    setReleaseDraft(null);setExtrasDraft(null);
    setWorldDigest('');setWorld(sample);setSession(n=>n+1);setPaused(false);
    setRuntime('loading');setStatus('Loaded the public starter world.');
  }
  function restoreRun(save,message){
    recordingRef.current=false;ghostSamplesRef.current=[];
    setRecordGhost(false);setGhostSampleCount(0);
    const replay=replayPlaytestTrace(world,save.frames);
    const progress=replay.progress;
    gameRef.current=progress;setGameSession(progress);
    const frames=save.frames.map(x=>({...x,position:[...x.position],event_ids:[...x.event_ids]}));
    traceRef.current=frames;setTraceFrames(frames);setReplayCursor(frames.length-1);
    setActivity(replay.timeline.flatMap(item=>item.events).slice(-8).reverse());
    const spawn=[...save.position];
    setRespawnAt(spawn);lastPosition.current=spawn;
    setMotion({grounded:false,speed:0,sprinting:false,position:spawn});
    setVirtualControls({right:0,forward:0,sprint:false,jumpSerial:0});
    setSession(n=>n+1);setRuntime('loading');setPaused(false);
    setStatus(message);
  }
  function buildSave(){
    if(!worldDigest)throw Error('Waiting for validated world SHA-256 digest.');
    const current=stage.current?.getPlayerPosition?.()||lastPosition.current;
    return createPlaytestSave(world,worldDigest,current,traceRef.current);
  }
  function saveLocal(confirmed=false){
    try{
      if(!worldDigest)throw Error('World digest is not ready.');
      // Re-check storage itself; React state can be stale after another tab saves.
      const key=playtestStorageKey(worldDigest);
      if(localStorage.getItem(key)!==null&&!confirmed){
        setPendingSaveOverwrite(true);
        setStatus('A browser save already exists. Confirm explicitly to replace it, or export a backup first.');
        return;
      }
      const save=buildSave();
      localStorage.setItem(key,JSON.stringify(save));
      setPendingSaveOverwrite(false);
      setHasLocalSave(true);setStatus('Saved this world locally. No account, upload, or source file was modified.');
    }catch(error){setStatus('Local save failed: '+error.message);}
  }
  function loadLocal(){
    try{
      if(!worldDigest)throw Error('World digest is not ready.');
      const raw=localStorage.getItem(playtestStorageKey(worldDigest));
      if(raw===null)throw Error('No browser-local save exists for this world.');
      restoreRun(parsePlaytestSave(raw,world,worldDigest),'Loaded world-bound save and recreated objective/door state.');
    }catch(error){setStatus('Resume refused: '+error.message);}
  }
  function deleteLocal(confirmed=false){
    try{
      if(!worldDigest)throw Error('World digest is not ready.');
      if(!confirmed){
        setPendingSaveDelete(true);
        setStatus('Confirm deletion of this world’s browser save. Export a backup first if you need it.');
        return;
      }
      localStorage.removeItem(playtestStorageKey(worldDigest));
      setPendingSaveDelete(false);setPendingSaveOverwrite(false);
      setHasLocalSave(false);setStatus('Deleted only this world’s browser-local playtest save.');
    }catch(error){setStatus('Delete failed: '+error.message);}
  }
  function exportSave(){
    try{downloadJson(buildSave(),'pixelforge-playtest-save.v1.json');
      setStatus('Downloaded a portable playtest save. Share the matching playable-world JSON separately.');}
    catch(error){setStatus('Save export refused: '+error.message);}
  }
  async function importSave(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{
      if(file.size>PLAYTEST_MAX_BYTES)throw Error('Save file exceeds 64 KB.');
      if(!worldDigest)throw Error('World digest is not ready.');
      const save=parsePlaytestSave(await file.text(),world,worldDigest);
      restoreRun(save,'Imported matching save. Press Save Browser to keep it in this browser.');
    }catch(error){setStatus('Save import rejected: '+error.message);}
  }
  function respawnCheckpoint(){
    if(!world.gameplay)return;
    try{
      const available=listPlaytestCheckpoints(world,traceRef.current);
      const index=checkpointChoice==='latest'?available.at(-1)?.frameIndex:Number(checkpointChoice);
      if(index===undefined||!available.some(cp=>cp.frameIndex===index))
        throw Error('Select a checkpoint already activated in this run.');
      const cp=playtestCheckpointAt(world,traceRef.current,index);
      restoreRun({position:cp.position,frames:cp.frames},
        'Returned to '+cp.id+' with events after step '+(index+1)+' rolled back.');
    }catch(error){setStatus('Checkpoint respawn refused: '+error.message);}
  }
  const timeline=useMemo(()=>replayPlaytestTrace(world,traceFrames).timeline,[world,traceFrames]);
  const checkpoints=useMemo(()=>listPlaytestCheckpoints(world,traceFrames),[world,traceFrames]);
  const checkpoint=checkpointChoice==='latest'?checkpoints.at(-1):
    checkpoints.find(cp=>String(cp.frameIndex)===checkpointChoice);
  const onGamepadAction=useCallback(action=>{
    if(action==='pause'){
      setPaused(value=>!value);
      setVirtualControls(c=>({...c,right:0,forward:0,sprint:false}));
      return;
    }
    if(paused)return;
    if(action==='interact'){
      evaluate(stage.current?.getPlayerPosition?.()||lastPosition.current,true);
    }else if(action==='checkpoint'){
      respawnCheckpoint();
    }
  },[paused,evaluate,checkpointChoice,world,traceFrames]);
  const selectedReplay=replayCursor>=0?timeline[replayCursor]:null;
  const playable=world.objects.filter(o=>o.body!=='none').length;
  const rules=world.gameplay||null;
  const objectives=rules?rules.collectibles.length+rules.triggers.length+
    (rules.graph?.nodes.length||0):0;
  const completed=gameSession.collected.length+gameSession.triggered.length+
    (gameSession.activated?.length||0);
  const activeIds=new Set([...gameSession.collected,...gameSession.triggered,...(gameSession.activated||[])]);
  const goalReady=rules?.graph?.goalRequires?
    dependenciesMet(rules.graph.goalRequires,activeIds):
    gameSession.collected.length===(rules?.collectibles.length||0)&&
    gameSession.triggered.length===(rules?.triggers.length||0);
  const nearSwitch=rules?.graph?.nodes.find(n=>n.kind==='switch'&&!activeIds.has(n.id)&&
    dependenciesMet(n.requires,activeIds)&&
    Math.hypot(...motion.position.map((v,i)=>v-n.position[i]))<=n.radius);
  return <div className={'pixWorldPlayer'+(standalone?' pixWorldPublished':'')}>
    <header className="pixWorldTop">
      <div className="pixWorldBrand"><span className="pixWorldLogo">Φ</span><div>
        <small>{standalone?release?.creator||'PIXELFORGE PUBLISHED GAME':'PHI369 LABS · PIXELFORGE v6'}</small>
        <h1>{standalone?release?.title||world.title:<>WORLD <em>PLAYER</em></>}</h1>
        {standalone&&<div className="pixWorldPublishedMeta">{release?.tagline} · v{release?.version||'1.0.0'}</div>}
      </div></div>
      <div className="pixWorldTopRight"><span className="pixWorldBadge">{runtime==='ready'?'● RAPIER LIVE':runtime==='error'?'RENDERER UNAVAILABLE':'LOADING WORLD'}</span>
        {standalone?<div className="pixWorldPublishedHeader">
          <button type="button" aria-label={fullscreenActive?'Exit fullscreen':'Enter fullscreen'}
            onClick={()=>void toggleFullscreen()}>{fullscreenActive?'⛶ Exit Fullscreen':'⛶ Fullscreen'}</button>
          {onExit&&<button type="button" onClick={onExit}>← Title Screen</button>}
        </div>:(onExit?<button type="button" onClick={onExit}>← Back to Forge</button>:<a href={BASE+'?forge=1'}>← Creator Forge</a>)}
        {!standalone&&<a href={BASE}>Portal ↗</a>}</div>
    </header>
    <main className="pixWorldMain">
      <section className="pixWorldOverview">
        <div><div className="pixWorldEyebrow">{standalone?'OFFLINE PUBLISHED GAME · NETWORK DISABLED':
          'PLAYABLE-WORLD.V1 / BROWSER-LOCAL RUNTIME · '+(rules?'GAMEPLAY RULES ACTIVE':'EXPLORATION MODE')}</div>
          <h2>{standalone?release?.title||world.title:world.title}</h2>
          <p>{standalone?'Explore this locally published adventure. Your progress stays in your browser; the original creator project is not included.':
            'Explore a portable 3D scene using real rigid-body collisions. Data-only worlds can be imported without executable scripts, remote fetching or special permissions.'}</p>
        </div>
        <div className="pixWorldCounts"><div><strong>{world.objects.length}</strong><span>OBJECTS</span></div><div><strong>{playable}</strong><span>COLLIDERS</span></div><div><strong>{fps.fps||'…'}</strong><span>FPS</span></div></div>
      </section>
      <div className="pixWorldLayout">
        <section className="pixWorldScreen">
          <div className="pixWorldScreenHeader"><b>WORLD VIEWPORT</b><span>WASD MOVE · SHIFT SPRINT · SPACE JUMP · E SWITCH · MOUSE ORBIT</span></div>
          <div className="pixWorldViewportWrap">
            <Suspense fallback={<div className="pixWorldLoading">Loading Three.js + Rapier world runtime…</div>}>
              <PhysicsStage key={sceneKey} ref={stage} paused={paused} gravity={world.gravity} sceneObjects={world.objects}
                sceneKey={sceneKey} playerSpawn={respawnAt} walkMode={true}
                gameplay={rules} gameplayProgress={gameSession} onPlayerPosition={onPlayerPosition}
                onMotionStatus={onMotionStatus} virtualControls={virtualControls}
                onGamepadStatus={setGamepadConnected} onGamepadAction={onGamepadAction}
                recordGhost={recordGhost} onGhostSample={onGhostSample}
                ghostRun={ghostRun} showGhost={showGhost} ghostReplaySerial={ghostReplaySerial}
                onStats={setFps} onStatus={setRuntime}/>
            </Suspense>
            <div className="pixWorldOverlay" aria-label="Touch-friendly movement and interaction overlay">
              {recordGhost&&<div className="pixWorldRecordBadge" aria-live="polite">
                ● RECORDING PATH · {ghostSampleCount} / {GHOST_MAX_SAMPLES}
              </div>}
              <div className="pixWorldCenterPrompt">
                {paused?<span>Ⅱ SIMULATION PAUSED</span>:
                  nearSwitch?<span>⌘ {nearSwitch.name} · PRESS E OR TAP INTERACT</span>:null}
              </div>
              {activity.length>0&&<div className="pixWorldEventToast" role="status">
                {activity[0].type==='win'?'★ ':activity[0].type==='door'?'▣ ':'◆ '}{activity[0].text}
              </div>}
              <div className="pixWorldOverlayBottom">
                <div className="pixWorldTouchPad" role="group" aria-label="Hold to move">
                  <button type="button" className="up" aria-label="Hold forward"
                    onPointerDown={e=>startHold('forward',1,e)}
                    onPointerUp={()=>stopHold('forward')} onPointerCancel={()=>stopHold('forward')}
                    onLostPointerCapture={()=>stopHold('forward')}>▲</button>
                  <button type="button" className="left" aria-label="Hold left"
                    onPointerDown={e=>startHold('right',-1,e)}
                    onPointerUp={()=>stopHold('right')} onPointerCancel={()=>stopHold('right')}
                    onLostPointerCapture={()=>stopHold('right')}>◀</button>
                  <button type="button" className="down" aria-label="Hold backward"
                    onPointerDown={e=>startHold('forward',-1,e)}
                    onPointerUp={()=>stopHold('forward')} onPointerCancel={()=>stopHold('forward')}
                    onLostPointerCapture={()=>stopHold('forward')}>▼</button>
                  <button type="button" className="right" aria-label="Hold right"
                    onPointerDown={e=>startHold('right',1,e)}
                    onPointerUp={()=>stopHold('right')} onPointerCancel={()=>stopHold('right')}
                    onLostPointerCapture={()=>stopHold('right')}>▶</button>
                </div>
                <div className="pixWorldTouchActions" role="group" aria-label="Jump and interact">
                  <button type="button" onClick={jump} disabled={paused}>↑ Jump</button>
                  <button type="button" disabled={paused}
                    onPointerDown={e=>startHold('sprint',true,e)}
                    onPointerUp={()=>stopHold('sprint')} onPointerCancel={()=>stopHold('sprint')}
                    onLostPointerCapture={()=>stopHold('sprint')}>» Sprint</button>
                  <button type="button" disabled={paused||!nearSwitch}
                    className={nearSwitch?'ready':''} onClick={()=>evaluate(lastPosition.current,true)}>⌘ Interact</button>
                </div>
              </div>
            </div>
          </div>
          <div className="pixWorldScreenFooter">
            <span>COLLISION-BASED PLAY TEST</span><span>{paused?'PAUSED':'SIMULATING'}</span>
            <span>{motion.grounded?'● GROUNDED':'○ AIRBORNE'} · {motion.sprinting?'SPRINT':'WALK'} · {motion.speed.toFixed(1)} m/s</span>
          </div>
        </section>
        <aside className="pixWorldInspector">
          {rules&&<section className="pixWorldQuest"><h3>{gameSession.won?'✓ WORLD COMPLETE':'MISSION / OBJECTIVES'}</h3>
            <div className="pixWorldProgress"><span>Progress</span><strong>{completed} / {objectives}</strong></div>
            <progress max={Math.max(1,objectives)} value={completed} aria-label="Objectives completed"/>
            <p>{rules.graph?.goalRequires?
              'Choose a valid branch: '+rules.graph.goalRequires.mode.toUpperCase()+
                ' of '+rules.graph.goalRequires.ids.join(', ')+'. Then enter the finish marker.':
              'Complete all pickups and checkpoints, then enter the finish marker.'}
              {rules.graph?.nodes.some(n=>n.kind==='switch')?' Press E near glowing switches.':''}</p>
            <div className="pixWorldObjectiveList">
              {rules.collectibles.map(x=><div key={x.id} className={gameSession.collected.includes(x.id)?'done':''}>
                <span>{gameSession.collected.includes(x.id)?'✓':'◇'}</span>{x.name}</div>)}
              {rules.triggers.map(x=><div key={x.id} className={gameSession.triggered.includes(x.id)?'done':''}>
                <span>{gameSession.triggered.includes(x.id)?'✓':'⌖'}</span>{x.name}</div>)}
              {rules.graph?.nodes.map(node=><div key={node.id}
                className={(gameSession.activated||[]).includes(node.id)?'done':''}>
                <span>{(gameSession.activated||[]).includes(node.id)?'✓':node.kind==='switch'?'⌘':'✧'}</span>
                {node.name} {node.kind==='switch'?'(press E)':'(secret)'}
              </div>)}
              {rules.goal&&<div className={gameSession.won?'done':''}><span>{gameSession.won?'✓':'◎'}</span>
                {rules.goal.name} {goalReady?'(unlocked)':'(locked)'}</div>}
            </div>
            {rules.graph?.doors.length>0&&<div className="pixWorldDoorList">
              {rules.graph.doors.map(door=><div key={door.id} className={(gameSession.openedDoors||[]).includes(door.id)?'open':''}>
                <span>{(gameSession.openedDoors||[]).includes(door.id)?'◉':'▣'}</span>
                {door.name}: {(gameSession.openedDoors||[]).includes(door.id)?'OPEN':'LOCKED'}
              </div>)}
            </div>}
            {gameSession.won&&<div className="pixWorldVictory" role="status">WORLD COMPLETE · {rules.goal.message}</div>}
          </section>}
          <section className="pixWorldControllerPanel">
            <h3>RUNG 10 / CONTROLLER INPUT</h3>
            <div className="pixWorldPadState"><span className={gamepadConnected?'connected':''}>
              {gamepadConnected?'● STANDARD GAMEPAD CONNECTED':'○ CONTROLLER NOT DETECTED'}</span>
            </div>
            <p>Connect an Xbox-compatible or other browser-supported <b>standard-mapped controller</b>, then press a button to activate browser detection.</p>
            <div className="pixWorldControllerKeys">
              <span><b>Left stick / D-pad</b> Move</span><span><b>Right stick</b> Orbit camera</span>
              <span><b>A</b> Jump</span><span><b>X</b> Interact</span>
              <span><b>RB / L3</b> Sprint</span><span><b>Y</b> Selected checkpoint</span>
              <span><b>Start</b> Pause / Resume</span>
            </div>
            <p>Controller inputs release on disconnect. Unsupported mappings remain inactive; keyboard and touch controls still work.</p>
          </section>
          <section className="pixWorldPlayerControls"><h3>PLAYER CONTROLS</h3><div className="pixWorldActions">
            <button type="button" onClick={()=>setPaused(v=>!v)}>{paused?'▶ Resume World':'Ⅱ Pause World'}</button>
            <button type="button" onClick={reset}>↻ Restart / Respawn</button>
          </div>
            <div className="pixWorldKeys" aria-label="Move with W A S D or arrow keys"><span></span><kbd>W ↑</kbd><span></span><kbd>A ←</kbd><kbd>S ↓</kbd><kbd>D →</kbd></div>
            <div className="pixWorldMovementHints"><span><kbd>Shift</kbd> Sprint</span><span><kbd>Space</kbd> Jump</span>
              <span><kbd>E</kbd> Interact with switch</span></div>
            <p>Camera-relative movement accelerates and brakes smoothly. Jump is ground-gated by Rapier; doors dissolve after their collision bodies are removed. Touch-friendly buttons are available in the viewport.</p>
          </section>
          <section className="pixWorldSavePanel">
            <h3>RUNG 9 / SAVE & CHECKPOINTS</h3>
            <p>One browser-local save slot per exact playable world. Saves capture position, quest progress, door states and a verifiable event trace.</p>
            <div className="pixWorldSaveBadge">
              <span>{worldDigest?'WORLD SHA-256 · '+worldDigest.slice(0,14)+'…':'VALIDATING WORLD DIGEST…'}</span>
              <strong>{hasLocalSave?'LOCAL SAVE FOUND':'NO LOCAL SAVE'}</strong>
            </div>
            <label className="pixWorldCheckpointChoice">Checkpoint to restore
              <select value={checkpointChoice} disabled={!checkpoints.length}
                onChange={e=>setCheckpointChoice(e.target.value)}>
                <option value="latest">Most recent activated checkpoint</option>
                {checkpoints.map(cp=><option key={cp.frameIndex} value={String(cp.frameIndex)}>
                  {cp.name} · Event {cp.frameIndex+1}
                </option>)}
              </select>
            </label>
            <div className="pixWorldActions">
              <button type="button" disabled={!worldDigest} onClick={()=>saveLocal(false)}>▣ Save Browser Progress</button>
              {pendingSaveOverwrite&&<>
        <p className="pixWorldOverwriteWarning" role="alert">This will replace the existing local save for this world. Export a backup first if you want to keep it.</p>
        <button type="button" onClick={()=>saveLocal(true)}>Confirm Replace Browser Save</button>
        <button type="button" onClick={()=>{setPendingSaveOverwrite(false);setStatus('Save replacement canceled. Original slot unchanged.');}}>Cancel Replacement</button>
      </>}
      <button type="button" disabled={!worldDigest||!hasLocalSave} onClick={loadLocal}>▶ Resume Browser Save</button>
              <button type="button" disabled={!checkpoint} onClick={respawnCheckpoint}>
                ◉ Respawn at {checkpoint?.name||'Checkpoint'}
              </button>
              <button type="button" disabled={!worldDigest} onClick={exportSave}>⇩ Export Save JSON</button>
              <button type="button" disabled={!worldDigest} onClick={()=>saveChooser.current?.click()}>⇧ Import Matching Save</button>
              <button type="button" className="pixWorldDeleteSave" disabled={!worldDigest||!hasLocalSave}
                onClick={()=>deleteLocal(false)}>Delete This World's Local Save</button>
              {pendingSaveDelete&&<>
                <p className="pixWorldOverwriteWarning" role="alert">Delete this world's browser save permanently? Export a JSON backup first. This action cannot be undone.</p>
                <button type="button" className="pixWorldDeleteSave" onClick={()=>deleteLocal(true)}>Confirm Delete Local Save</button>
                <button type="button" onClick={()=>{setPendingSaveDelete(false);setStatus('Deletion canceled. Saved progress preserved.');}}>Cancel Deletion</button>
              </>}
            </div>
            <input hidden ref={saveChooser} type="file" accept=".json,application/json" onChange={importSave}/>
            <p>Restart begins a fresh run without deleting your saved slot. Choose any previously activated checkpoint, then roll back later events, doors and pickups. Controller Y performs the selected respawn.</p>
          </section>
          <section className="pixWorldGhostPanel">
            <h3>RUNG 11 / GHOST RUNS</h3>
            <p>Record your Rapier capsule route, then race alongside a transparent ghost of that run. The cyan path has no collider and never affects game rules.</p>
            <div className="pixWorldGhostStatus">
              <span>{recordGhost?'● RECORDING IN THIS BROWSER':ghostRun?'◇ GHOST READY':'○ NO ROUTE CAPTURED'}</span>
              <span>{hasLocalGhost?'SAVED LOCALLY':'NOT SAVED'}</span>
            </div>
            <div className="pixWorldActions">
              {!recordGhost?
                <>
                  <button type="button" disabled={!worldDigest||runtime!=='ready'||paused}
                    onClick={startGhostCapture}>● Start Recording New Run</button>
                  {ghostSampleCount>=2&&
                    <button type="button" onClick={stopGhostCapture}>◇ Preview Captured Samples</button>}
                </>:
                <button type="button" onClick={stopGhostCapture}>■ Stop & Preview Ghost</button>}
              <button type="button" disabled={!ghostRun} onClick={playGhost}>▶ Replay Ghost from Start</button>
              <button type="button" disabled={!ghostRun} onClick={()=>setShowGhost(v=>!v)}>
                {showGhost?'◉ Hide Ghost & Route':'◎ Show Ghost & Route'}
              </button>
              <button type="button" disabled={!ghostRun||!worldDigest} onClick={saveGhostLocal}>▣ Save Ghost in Browser</button>
              <button type="button" disabled={!hasLocalGhost||!worldDigest} onClick={loadGhostLocal}>↻ Load Saved Ghost</button>
              <button type="button" disabled={!ghostRun||!worldDigest} onClick={exportGhost}>⇩ Export Ghost JSON</button>
              <button type="button" disabled={!worldDigest} onClick={()=>ghostChooser.current?.click()}>
                ⇧ Import Matching Ghost
              </button>
              <button type="button" disabled={!hasLocalGhost||!worldDigest}
                className="pixWorldDeleteSave" onClick={deleteGhostLocal}>Delete Only This World’s Saved Ghost</button>
            </div>
            <input ref={ghostChooser} hidden type="file" accept=".json,application/json" onChange={importGhost}/>
            {ghostStats&&<div className="pixWorldGhostAnalytics">
              <h4>ROUTE DIAGNOSTICS</h4>
              <div className="pixWorldGhostNumbers">
                <div><b>{ghostStats.durationSeconds}s</b><span>Duration</span></div>
                <div><b>{ghostStats.distanceMeters}m</b><span>Distance</span></div>
                <div><b>{ghostStats.averageSpeed}m/s</b><span>Avg. speed</span></div>
                <div><b>{ghostStats.movingSeconds}s</b><span>Moving</span></div>
                <div><b>{ghostStats.jumps}</b><span>Approx. jumps</span></div>
                <div><b>{ghostStats.samples}</b><span>Samples</span></div>
              </div>
              <h4>FREQUENTLY VISITED 2m GRID CELLS</h4>
              {ghostStats.hotspots.map((cell,i)=><p key={i}>
                {i+1}. X {cell.x}, Z {cell.z} · about {cell.seconds}s of sampled time
              </p>)}
            </div>}
            <p>Recordings are sampled at approximately 5 Hz, capped at 2,400 samples. They describe one avatar’s path, not the physics state or a full video. Save/export is always explicit.</p>
          </section>
          <PlaytestInspector key={worldDigest||'pending'} worldDigest={worldDigest} currentGhost={ghostRun}/>
          <section className="pixWorldReplayPanel">
            <h3>EVENT TRACE / REPLAY</h3>
            <p>Inspect reproducible gameplay events step by step. This is a rule-event replay, not a recorded video or physics-motion rewind.</p>
            <div className="pixWorldReplayControls">
              <button type="button" disabled={!timeline.length||replayCursor<=0}
                onClick={()=>setReplayCursor(i=>Math.max(0,i-1))}>← Previous</button>
              <span>{timeline.length?Math.max(0,replayCursor+1)+' / '+timeline.length:'NO EVENTS YET'}</span>
              <button type="button" disabled={!timeline.length||replayCursor>=timeline.length-1}
                onClick={()=>setReplayCursor(i=>Math.min(timeline.length-1,i+1))}>Next →</button>
            </div>
            {selectedReplay?<div className="pixWorldReplayStep">
              <small>STEP {selectedReplay.index+1} · {selectedReplay.interact?'INTERACT':'PROXIMITY'} ·
                X {selectedReplay.position[0].toFixed(1)} · Y {selectedReplay.position[1].toFixed(1)} · Z {selectedReplay.position[2].toFixed(1)}</small>
              {selectedReplay.events.map(event=><p key={event.type+'-'+event.id}>● {event.type.toUpperCase()}: {event.text}</p>)}
            </div>:<p>Collect a spark or activate a checkpoint to record your first event step.</p>}
            {timeline.length>0&&<div className="pixWorldReplayTimeline" role="group" aria-label="Event replay steps">
              {timeline.map((frame,i)=><button type="button" key={i}
                aria-pressed={replayCursor===i} onClick={()=>setReplayCursor(i)}
                className={replayCursor===i?'active':''} title={frame.events.map(e=>e.text).join(' · ')}>{i+1}</button>)}
            </div>}
          </section>
          {!standalone&&<section className="pixWorldPublishPanel">
            <h3>RUNG 13 / OFFLINE WORLD PUBLISHING</h3>
            <p>Publish this exact validated world as a <strong>single HTML file</strong>, with its own Three.js + Rapier player, styles and game rules included. No Forge editor, CDN, server or installation is required to open the file.</p>
            <ReleaseMetadataEditor value={releaseDraft} onChange={setReleaseDraft} worldTitle={world.title}/>
            <ReleaseExtrasEditor value={extrasDraft} onChange={setExtrasDraft}/>
            <div className="pixWorldPublishFacts">
              <span>Runtime</span><b>EMBEDDED / OFFLINE</b>
              <span>Code from world file</span><b>NONE</b>
              <span>Network</span><b>DISABLED BY CSP</b>
              <span>Creator asset vault</span><b>EXCLUDED</b>
            </div>
            <div className="pixWorldActions">
              <button type="button" onClick={publishCurrentWorld}>
                ⇩ Publish Offline Adventure (.html)
              </button>
            </div>
            <p>The public website supplies the prebuilt trusted player during export. Once downloaded, the released HTML plays without website access. Browser WebGL2 and WASM support are still required; test the release on your target device before sharing.</p>
          </section>}
          <section><h3>WORLD LIBRARY</h3><div className="pixWorldActions">
            <button type="button" onClick={()=>chooser.current?.click()}>⇧ Import Playable JSON</button>
            <button type="button" onClick={()=>downloadJson(world,'pixelforge-playable-world.v1.json')}>⇩ Export World JSON</button>
            <button type="button" onClick={demo}>◇ Load Sample Course</button>
          </div>
            <input ref={chooser} hidden type="file" accept=".json,application/json" onChange={importFile}/>
            <p>Import a playable-world.v1 JSON file from the Forge, including optional data-only collectibles, triggers and win conditions. Files stay in this browser.</p>
          </section>
          <section><h3>BOUNDARIES</h3>
            <div className="pixWorldFacts"><span>Execution authority</span><b>LOCAL BROWSER</b><span>External network</span><b>NONE</b><span>Game scripts</span><b>NONE</b><span>GLB mesh collisions</span><b>NOT INCLUDED</b><span>Source fingerprint</span><b title={world.source.sha256}>{world.source.sha256.slice(0,12)}…</b></div>
            <p>Source hash is descriptive metadata, not a signature or rights certification. The player does not reconstruct private GLBs or write original VR Studio saves.</p>
          </section>
        </aside>
      </div>
      {rules&&activity.length>0&&<section className="pixWorldActivity"><h3>LIVE GAME EVENTS</h3>
        {activity.map((entry,i)=><p key={entry.id+'-'+i}>
          {entry.type==='win'?'★':entry.type==='collect'?'◆':entry.type==='door'?'▣':entry.type==='secret'?'✧':entry.type==='switch'?'⌘':'◎'} {entry.text}</p>)}
      </section>}
      <p className="pixWorldStatus" role="status">{status}</p>
    </main>
    <footer className="pixWorldFooter">{standalone?
      'PIXELFORGE OFFLINE ADVENTURE · SELF-CONTAINED PLAYER · NETWORK DISABLED':
      'PIXELFORGE V6 / WORLD PLAYER · READ-ONLY DATA CONTRACT · NO NETWORK AUTHORITY'}</footer>
  </div>;
}
