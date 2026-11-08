import React,{useMemo,useRef,useState} from 'react';
import {METROIDVANIA_SCHEMA,LIMITS,createMetroidvaniaStarter,validateMetroidvaniaWorld,analyzeMetroidvaniaWorld} from './metroidvania-world.js';
import './metroidvania-maker.css';
import MetroidvaniaCreativeLab from './MetroidvaniaCreativeLab.jsx';
import {buildMetroidvaniaLayerScene} from './metroidvania-layer-bridge.js';
import {CONTENT_LIMITS,PROJECT_SCHEMA,createMetroidvaniaContent,validateMetroidvaniaContent,validateMetroidvaniaProject} from './metroidvania-content.js';
const BASE=import.meta.env.BASE_URL;
function slug(value){return (value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'room');}
function saveJson(world){
  const blob=new Blob([JSON.stringify(world,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='pixelforge-metroidvania-world.json';a.click();
  URL.revokeObjectURL(url);
}
function saveProjectJson(world,content){
  const project=validateMetroidvaniaProject({format:PROJECT_SCHEMA,world,content});
  const blob=new Blob([JSON.stringify(project,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='pixelforge-metroidvania-project.json';a.click();URL.revokeObjectURL(url);
}
export default function MetroidvaniaMaker(){
  const [world,setWorld]=useState(createMetroidvaniaStarter);
  const [content,setContent]=useState(()=>createMetroidvaniaContent(createMetroidvaniaStarter()));
  const [characterId,setCharacterId]=useState('wanderer');
  const [selected,setSelected]=useState('cathedral-nave');
  const [newRoom,setNewRoom]=useState('');
  const [newAbility,setNewAbility]=useState('');
  const [target,setTarget]=useState('forgotten-crypt');
  const [required,setRequired]=useState('');
  const [twoWay,setTwoWay]=useState(true);
  const [step,setStep]=useState(-1);
  const [status,setStatus]=useState('Sample loaded. Select a room, design an ability gate, or import your own world.');
  const picker=useRef(null);
  const activeCharacter=content.characters.find(c=>c.id===characterId)||content.characters[0];
  const report=useMemo(()=>analyzeMetroidvaniaWorld(world,{startingAbilities:activeCharacter?.startingAbilities||[]}),[world,activeCharacter]);
  const stage=report.stages[step<0?report.stages.length-1:Math.min(step,report.stages.length-1)];
  const accessible=new Set(stage.visited),activeAbilities=new Set(stage.unlocked);
  const room=world.rooms.find(r=>r.id===selected)||world.rooms[0];
  const outbound=world.links.filter(link=>link.from===room.id||(link.twoWay&&link.to===room.id));
  const destinations=world.rooms.filter(r=>r.id!==room.id);
  const mutate=(fn,message)=>{
    try{
      const draft=JSON.parse(JSON.stringify(world));fn(draft);
      const valid=validateMetroidvaniaWorld(draft);
      validateMetroidvaniaContent(content,valid);
      setWorld(valid);setStep(-1);setStatus(message);
    }catch(error){setStatus(error.message||'Update refused.');}
  };
  const addRoom=event=>{
    event.preventDefault();
    const name=newRoom.trim();
    if(!name){setStatus('Enter a room name first.');return;}
    const base=slug(name);
    let id=base,n=2;while(world.rooms.some(r=>r.id===id)){id=(base.slice(0,40)+'-'+n++).slice(0,48);}
    mutate(w=>w.rooms.push({id,name,x:15+(w.rooms.length*17)%75,y:18+(w.rooms.length*23)%68,grants:[]}), 'Room added: '+name);
    if(world.rooms.length<LIMITS.rooms){setSelected(id);setNewRoom('');}
  };
  const addAbility=event=>{
    event.preventDefault();const name=newAbility.trim();
    if(!name){setStatus('Enter an ability name first.');return;}
    const id=slug(name);
    mutate(w=>w.abilities.push({id,name}), 'Ability added: '+name);
    setNewAbility('');
  };
  const addLink=event=>{
    event.preventDefault();
    if(!world.rooms.some(r=>r.id===target)||room.id===target){setStatus('Choose a different destination room.');return;}
    const base=slug(room.id+'-'+target), existing=new Set(world.links.map(l=>l.id));
    let id=base,n=2;while(existing.has(id)){id=(base.slice(0,40)+'-'+n++).slice(0,48);}
    mutate(w=>w.links.push({id,from:room.id,to:target,requires:required?[required]:[],twoWay}), 'New doorway added.');
  };
  const playLayerProof=()=>{
    try{
      const layerScene=buildMetroidvaniaLayerScene(world,content,activeCharacter?.id);
      sessionStorage.setItem('pixelforge.layer-studio.play-scene.v1',JSON.stringify(layerScene));
      window.location.href=BASE+'layer-studio/play.html';
    }catch(error){setStatus('Playable prototype unavailable: '+error.message);}
  };
  const importJson=async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(file.size>CONTENT_LIMITS.projectBytes){throw Error('Import exceeds 128 KB limit.');}
      const data=JSON.parse(await file.text());
      if(data.format===PROJECT_SCHEMA){
        const project=validateMetroidvaniaProject(data);
        setWorld(project.world);setContent(project.content);
        setCharacterId(project.content.characters[0]?.id||'');
        setSelected(project.world.startRoom);
        setStatus('Full Maker project imported: world, characters, secrets, equipment and atmosphere.');
      }else{
        if(file.size>LIMITS.bytes)throw Error('World-only import exceeds 64 KB limit.');
        const incoming=validateMetroidvaniaWorld(data);
        const freshContent=createMetroidvaniaContent(incoming);
        setWorld(incoming);setContent(freshContent);setCharacterId(freshContent.characters[0]?.id||'');
        setSelected(incoming.startRoom);
        setStatus('World imported; character, secret, equipment and atmosphere designs reset to new project defaults. Export the FULL Maker project to retain all creative designs.');
      }
      setStep(-1);
    }catch(error){setStatus('Import refused: '+error.message);}
    event.target.value='';
  };
  return <div className="mvApp">
    <header className="mvHeader">
      <a href={BASE} className="mvBack">← PixelForge</a>
      <div><span className="mvEyebrow">PARALLAX PIXELFORGE / EXPERIMENTAL CREATOR MODE</span><h1>Metroidvania <em>Maker</em></h1>
        <p>Build an interconnected world. Place abilities. Gate shortcuts and secrets. Test the route before building rooms.</p></div>
      <span className="mvVersion">PLAYABLE LOADOUTS · RUNG 5</span>
    </header>
    <div className="mvToolbar">
      <label>World title <input value={world.title} maxLength={100} onChange={e=>mutate(w=>{w.title=e.target.value;},'World title updated.')}/></label>
      <label>Start room <select value={world.startRoom} onChange={e=>mutate(w=>{w.startRoom=e.target.value;},'Starting room changed.')}>
        {world.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <button type="button" onClick={playLayerProof}>Play 2.5D prototype ↗</button>
      <button type="button" onClick={()=>saveProjectJson(world,content)}>Export FULL Maker project ↓</button>
      <button type="button" onClick={()=>saveJson(world)}>Export atlas only ↓</button>
      <button type="button" onClick={()=>picker.current?.click()}>Import world / project ↑</button>
      <input ref={picker} type="file" accept=".json,application/json" hidden onChange={importJson}/>
      <button type="button" onClick={()=>{
        const sample=createMetroidvaniaStarter(),design=createMetroidvaniaContent(sample);
        setWorld(sample);setContent(design);setCharacterId('wanderer');
        setSelected('cathedral-nave');setStep(-1);setStatus('Original sample and creative designs restored.');
      }}>Restore sample</button>
    </div>
    <p className="mvStatus" role="status">{status}</p>
    <p className="mvStatus">2.5D preview now includes original chain combat, physical breakable-wall rewards, character-specific movement speeds, five bounded two-item effects, ability-gated doors and Shadow Dash. Max 6 rooms. Other secret types, original audio, Unreal and VR remain design-only.</p>
    <div className="mvColumns">
      <section className="mvPanel mvMapPanel" aria-label="World map">
        <div className="mvPanelTitle"><h2>World atlas</h2><span>{world.rooms.length}/{LIMITS.rooms} rooms · {world.links.length} passages</span></div>
        <div className="mvMap">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {world.links.map(link=>{
              const a=world.rooms.find(r=>r.id===link.from),b=world.rooms.find(r=>r.id===link.to);
              const isOpen=link.requires.every(id=>activeAbilities.has(id));
              return <line key={link.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isOpen?'#86cfb4':'#bb7c87'} strokeDasharray={isOpen?'none':'1.5 1.5'} strokeWidth=".65" vectorEffect="non-scaling-stroke"/>;
            })}
          </svg>
          {world.rooms.map(r=><button type="button" key={r.id}
            className={'mvRoom'+(selected===r.id?' chosen':'')+(accessible.has(r.id)?' reached':' locked')}
            style={{left:r.x+'%',top:r.y+'%'}} onClick={()=>{setSelected(r.id);setTarget(world.rooms.find(x=>x.id!==r.id)?.id||r.id);}}>
            <span>{r.id===world.startRoom?'★ ':'◈ '}{r.name}</span>
          </button>)}
        </div>
        <div className="mvLegend"><span>● Reachable</span><span>● Locked or undiscovered</span><span>┄ Ability-gated</span></div>
        <div className="mvProgress">
          <h3>Progression simulator · {activeCharacter?.name||'Default'}</h3>
          <p>This analysis collects abilities in entered rooms, then tests every passage until no more rooms unlock. It is a planning check, not a playable character.</p>
          <div className="mvStepBtns">
            <button type="button" onClick={()=>setStep(0)}>Spawn</button>
            <button type="button" onClick={()=>setStep(Math.max(0,(step<0?report.stages.length-1:step)-1))}>← Previous</button>
            <button type="button" onClick={()=>setStep(Math.min(report.stages.length-1,(step<0?report.stages.length-1:step)+1))}>Next →</button>
            <button type="button" onClick={()=>setStep(-1)}>Full route</button>
          </div>
          <p><strong>Stage {step<0?'final':step}</strong>: {stage.visited.length} rooms reachable · {stage.unlocked.length} abilities acquired</p>
          <p>Abilities: {stage.unlocked.map(id=>world.abilities.find(a=>a.id===id)?.name).join(', ')||'None'}</p>
          {report.unreachable.length>0?<p className="mvWarning">Unreachable from starting room: {report.unreachable.map(id=>world.rooms.find(r=>r.id===id)?.name).join(', ')}.</p>
            :<p className="mvSuccess">All rooms eventually reachable with available abilities.</p>}
        </div>
      </section>
      <section className="mvPanel mvEditor" aria-label="World graph editor">
        <div className="mvPanelTitle"><h2>Room and ability editor</h2><span>Local-only</span></div>
        <label>Selected room
          <select value={room.id} onChange={e=>{setSelected(e.target.value);setTarget(world.rooms.find(r=>r.id!==e.target.value)?.id||e.target.value);}}>
            {world.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <div className="mvRoomDetails"><strong>{room.name}</strong><span>ID: {room.id}</span>
          <p>Choose abilities earned by entering this room.</p>
          {world.abilities.map(a=><label key={a.id} className="mvCheck">
            <input type="checkbox" checked={room.grants.includes(a.id)}
              onChange={e=>mutate(w=>{const r=w.rooms.find(x=>x.id===room.id);r.grants=e.target.checked?[...r.grants,a.id]:r.grants.filter(x=>x!==a.id);},'Room rewards updated.')}/>
            {a.name}</label>)}
        </div>
        <form onSubmit={addLink} className="mvForm">
          <h3>Create doorway from {room.name}</h3>
          <label>Destination<select value={destinations.some(r=>r.id===target)?target:destinations[0]?.id||''} onChange={e=>setTarget(e.target.value)}>
            {destinations.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
          <label>Required ability<select value={required} onChange={e=>setRequired(e.target.value)}>
            <option value="">Open passage</option>{world.abilities.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label className="mvCheck"><input type="checkbox" checked={twoWay} onChange={e=>setTwoWay(e.target.checked)}/> Two-way backtracking</label>
          <button type="submit" disabled={!destinations.length}>+ Add doorway</button>
        </form>
        <div className="mvLinks"><h3>Doorways connected to {room.name}</h3>
          {outbound.length?outbound.map(l=><div key={l.id} className="mvLink">
            <span>{world.rooms.find(r=>r.id===(l.from===room.id?l.to:l.from))?.name} · {l.requires.length?l.requires.map(id=>world.abilities.find(a=>a.id===id)?.name).join(', '):'Open'} {l.twoWay?'↔':'→'}</span>
            <button type="button" onClick={()=>mutate(w=>{w.links=w.links.filter(link=>link.id!==l.id);},'Doorway removed.')} aria-label={'Remove doorway '+l.id}>Remove</button>
          </div>):<p>No passages connected yet.</p>}
        </div>
        <form className="mvForm" onSubmit={addRoom}>
          <h3>Create room</h3><label>Room name<input value={newRoom} maxLength={80} onChange={e=>setNewRoom(e.target.value)} placeholder="The Glass Conservatory"/></label>
          <button type="submit" disabled={world.rooms.length>=LIMITS.rooms}>+ Add room</button>
        </form>
        <form className="mvForm" onSubmit={addAbility}>
          <h3>Create traversal ability</h3><label>Ability name<input value={newAbility} maxLength={60} onChange={e=>setNewAbility(e.target.value)} placeholder="Grapple Chain"/></label>
          <button type="submit" disabled={world.abilities.length>=LIMITS.abilities}>+ Add ability</button>
        </form>
        <button className="mvDanger" type="button" disabled={world.rooms.length<=1} onClick={()=>{
          if(!window.confirm('Remove '+room.name+' and all its connected doorways?'))return;
          const nextRoom=world.rooms.find(r=>r.id!==room.id);
          mutate(w=>{w.rooms=w.rooms.filter(r=>r.id!==room.id);w.links=w.links.filter(l=>l.from!==room.id&&l.to!==room.id);
            if(w.startRoom===room.id)w.startRoom=nextRoom.id;},'Room and connected doorways removed.');
          setSelected(nextRoom.id);
        }}>Remove selected room</button>
      </section>
    </div>
    <MetroidvaniaCreativeLab world={world} content={content} onChange={next=>{setContent(next);setStep(-1);}}
      selectedCharacter={activeCharacter?.id||''} onSelectCharacter={next=>{setCharacterId(next);setStep(-1);}}
      selectedRoom={room.id} onStatus={setStatus}/>
    <footer className="mvFooter">
      <p><strong>{METROIDVANIA_SCHEMA}</strong> · Browser-local world and creative designs. Project JSON exports contain no game code, purchased assets, audio, or private credentials.</p>
      <p>Playable bridge: original Layer Studio 2.5D placeholder scenes with ability gates, physical chain combat and breakable-wall rewards. Unreal and VR exporters are not implemented.</p>
    </footer>
  </div>;
}
