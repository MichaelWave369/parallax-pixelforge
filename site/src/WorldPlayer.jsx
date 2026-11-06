import React,{Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {downloadJson} from './forge-world.js';
import {PLAYABLE_MAX_BYTES,createSamplePlayableWorld,parsePlayableWorld,validatePlayableWorld} from './playable-world.js';
import {advanceGameplaySession,newGameplaySession} from './gameplay-rules.js';
import {dependenciesMet} from './event-graph.js';
import './world-player.css';
const PhysicsStage=lazy(()=>import('./PhysicsStage.jsx'));
const BASE=import.meta.env.BASE_URL;

export default function WorldPlayer({initialWorld=null,onExit=null}){
  const [world,setWorld]=useState(()=>initialWorld?validatePlayableWorld(initialWorld):createSamplePlayableWorld());
  const [status,setStatus]=useState(initialWorld?'Previewing your current Forge construction.':'Loaded public PixelForge starter course.');
  const [runtime,setRuntime]=useState('loading');
  const [paused,setPaused]=useState(false);
  const [fps,setFps]=useState({fps:0,bodies:0});
  const [session,setSession]=useState(0);
  const [gameSession,setGameSession]=useState(newGameplaySession);
  const [activity,setActivity]=useState([]);
  const gameRef=useRef(gameSession),lastPosition=useRef(initialWorld?.spawn||[0,2.2,0]);
  const chooser=useRef(null),stage=useRef(null);
  const resetRules=()=>{
    const fresh=newGameplaySession();gameRef.current=fresh;
    setGameSession(fresh);setActivity([]);
  };
  const evaluate=useCallback((position,interact=false)=>{
    if(!world.gameplay||paused)return;
    try{
      const result=advanceGameplaySession(world.gameplay,gameRef.current,position,{interact});
      if(result.events.length){
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
      resetRules();lastPosition.current=[...validated.spawn];
      setWorld(validated);setSession(n=>n+1);setRuntime('loading');setPaused(false);
      setStatus('Loaded portable world: '+validated.title+'. No scripts executed.');
    }catch(error){setStatus('Import rejected: '+error.message);}
  }
  function reset(){
    resetRules();lastPosition.current=[...world.spawn];
    setSession(n=>n+1);setPaused(false);
    setStatus('World restarted at its declared spawn point. Collectibles and checkpoints reset.');
  }
  function demo(){
    const sample=createSamplePlayableWorld();
    resetRules();lastPosition.current=[...sample.spawn];
    setWorld(sample);setSession(n=>n+1);setPaused(false);
    setRuntime('loading');setStatus('Loaded the public starter world.');
  }
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
  return <div className="pixWorldPlayer">
    <header className="pixWorldTop">
      <div className="pixWorldBrand"><span className="pixWorldLogo">Φ</span><div><small>PHI369 LABS · PIXELFORGE v6</small><h1>WORLD <em>PLAYER</em></h1></div></div>
      <div className="pixWorldTopRight"><span className="pixWorldBadge">{runtime==='ready'?'● RAPIER LIVE':runtime==='error'?'RENDERER UNAVAILABLE':'LOADING WORLD'}</span>
        {onExit?<button type="button" onClick={onExit}>← Back to Forge</button>:<a href={BASE+'?forge=1'}>← Creator Forge</a>}
        <a href={BASE}>Portal ↗</a></div>
    </header>
    <main className="pixWorldMain">
      <section className="pixWorldOverview">
        <div><div className="pixWorldEyebrow">PLAYABLE-WORLD.V1 / BROWSER-LOCAL RUNTIME · {rules?'GAMEPLAY RULES ACTIVE':'EXPLORATION MODE'}</div>
          <h2>{world.title}</h2><p>Explore a portable 3D scene using real rigid-body collisions. Data-only worlds can be imported without executable scripts, remote fetching or special permissions.</p></div>
        <div className="pixWorldCounts"><div><strong>{world.objects.length}</strong><span>OBJECTS</span></div><div><strong>{playable}</strong><span>COLLIDERS</span></div><div><strong>{fps.fps||'…'}</strong><span>FPS</span></div></div>
      </section>
      <div className="pixWorldLayout">
        <section className="pixWorldScreen">
          <div className="pixWorldScreenHeader"><b>WORLD VIEWPORT</b><span>WASD / ARROWS MOVE · DRAG TO ORBIT · SCROLL TO ZOOM</span></div>
          <Suspense fallback={<div className="pixWorldLoading">Loading Three.js + Rapier world runtime…</div>}>
            <PhysicsStage key={sceneKey} ref={stage} paused={paused} gravity={world.gravity} sceneObjects={world.objects}
              sceneKey={sceneKey} playerSpawn={world.spawn} walkMode={true}
              gameplay={rules} gameplayProgress={gameSession} onPlayerPosition={onPlayerPosition}
              onStats={setFps} onStatus={setRuntime}/>
          </Suspense>
          <div className="pixWorldScreenFooter">
            <span>COLLISION-BASED PLAY TEST</span><span>{paused?'PAUSED':'SIMULATING'}</span>
            <span>60 HZ FIXED PHYSICS STEP</span>
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
          <section><h3>PLAYER CONTROLS</h3><div className="pixWorldActions">
            <button type="button" onClick={()=>setPaused(v=>!v)}>{paused?'▶ Resume World':'Ⅱ Pause World'}</button>
            <button type="button" onClick={reset}>↻ Restart / Respawn</button>
          </div>
            <div className="pixWorldKeys" aria-label="Move with W A S D or arrow keys"><span></span><kbd>W ↑</kbd><span></span><kbd>A ←</kbd><kbd>S ↓</kbd><kbd>D →</kbd></div>
            <p>Your character is a Rapier capsule. Walk into secrets and checkpoints; press <b>E</b> near switches. Unlocking a door removes its fixed collider. No combat, advanced jumping, or VR controls yet.</p>
          </section>
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
    <footer className="pixWorldFooter">PIXELFORGE V6 / WORLD PLAYER · READ-ONLY DATA CONTRACT · NO NETWORK AUTHORITY</footer>
  </div>;
}
