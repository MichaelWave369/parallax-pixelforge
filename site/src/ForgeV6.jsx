import React,{Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {WIDTH,HEIGHT,TILE_TYPES,STORAGE_KEY,createSeedWorld,validateDemoWorld,paintTile,movePlayer,downloadJson} from './forge-world.js';
import {VR_SCENE_STORAGE_KEY,MAX_SCENE_BYTES,MAX_PROFILE_BYTES,sampleVrWorld,parseVrScene,
  fingerprintVrWorld,newPhysicsProfile,validatePhysicsProfile,editPhysicsObject,toPhysicsDescriptors,
  placeOnSurface,removePlacedObject,PLACEMENT_TEMPLATES,MAX_PLACED_OBJECTS} from './vr-physics-bridge.js';
import {applyGizmoTransform,DEFAULT_GIZMO_SNAP,GIZMO_SNAPS} from './vr-gizmo-contract.js';
import {buildPlayableWorld} from './playable-world.js';
import {downloadOfflineWorld} from './offline-publisher.js';
import {defaultReleaseMetadata} from './release-metadata.js';
import ReleaseMetadataEditor from './ReleaseMetadataEditor.jsx';
import {MAX_PICKUPS,MAX_TRIGGERS,newGameplayRules,validateGameplayRules,
  addGameplayMarker,removeGameplayMarker,editGameplayMarker,markerPositionForObject} from './gameplay-rules.js';
import {newEventGraph,addEventNode,addEventDoor,removeEventNode,updateEventNode,
  validateEventGraphTargets,MAX_GRAPH_NODES,MAX_GRAPH_DOORS} from './event-graph.js';
import './forge.css';
const PhysicsStage=lazy(()=>import('./PhysicsStage.jsx'));
const WorldPlayer=lazy(()=>import('./WorldPlayer.jsx'));
const BASE=import.meta.env.BASE_URL;
const NAV=[
  ['Studio','⌂'],['World Builder','▧'],['Game Logic','⌘'],['Physics','⚛'],['VFX Studio','✧'],
  ['Assets','▣'],['Build & Export','⬡'],['Playtest','▹'],['VR / XR','◈']
];
const LIBRARY=[
  ['Project Hub','▣','World Builder'],['Scenes','▧','World Builder'],['Assets','⬡','Assets'],
  ['Characters','♙','Game Logic'],['NPCs & AI','♧','Game Logic'],['Items & Loot','◇','Game Logic'],
  ['Maps & Worlds','◫','World Builder'],['Dialogue & Quests','☷','Game Logic'],
  ['Events & Triggers','ϟ','Game Logic'],['Audio & Music','♫','VFX Studio'],
  ['Library / Commons','♧','Assets']
];
const TILES=[
 ['grass','Grass','▧'],['tree','Trees','♠'],['water','Water','≈'],['path','Path','▫'],
 ['stone','Stone','▲'],['wall','Wall','▥'],['portal','Portal','◈'],['treasure','Treasure','◆'],
 ['house','Building','⌂'],['spike','Hazard','⚠'],['flower','Flowers','✿']
];
const LINK_PANELS={
 'Game Logic':{title:'Game Logic & Runtime',text:'Keep real game rules in the existing PixelForge Runtime Composer. This v6 shell does not silently replace those contracts.',links:[['Open Runtime Composer', 'studio/'],['Explore Layer Studio','layer-studio/']]},
 'VFX Studio':{title:'VFX Studio / Integration lane',text:'The neon interface is a design direction; a reusable particle VFX authoring system is not implemented in this first rung. Build and inspect visual assets with the existing editors.',links:[['Open Layer Effects','layer-studio/'],['Inspect 3D Assets','external-preview/']]},
 'Assets':{title:'Asset Forge & Library',text:'Your governed GLB inspection, provenance records, and private Unreal library remain in their established tools. This demo never copies private asset bytes into the public portal.',links:[['GLB Inspector','external-preview/'],['VR Asset Library','vr-studio/'],['Creator Asset Tools','studio/']]},
 'Build & Export':{title:'Build & Export',text:'Publish your validated 3D adventure as a self-contained offline HTML file, export portable JSON, or use the existing Creator Studio cartridge workflows.',links:[['Existing Creator Exports','studio/'],['VR World Exports','vr-studio/']]},
 'VR / XR':{title:'VR / XR Studio',text:'Experimental WebXR remains in the existing VR Studio. No Quest 3 performance, hand tracking or headset physics claim is being made for this v6 browser prototype.',links:[['Enter Experimental VR Studio','vr-studio/'],['GLB Inspector','external-preview/']]}
};
function Tile({type,player,grid,index,onClick,mode}) {
  const name=TILES.find(t=>t[0]===type)?.[1]||type;
  return <button type="button" className={'forgeTile forgeTile-'+type+(player?' forgePlayerHere':'')+(grid?' forgeShowGrid':'')}
    onClick={()=>onClick(index)} title={name+' · '+(index%WIDTH)+','+Math.floor(index/WIDTH)}
    aria-label={name+' tile, '+(index%WIDTH)+','+Math.floor(index/WIDTH)+(mode==='play'?', explore':', paint')}>
      <span className="forgeTileGlyph">{({tree:'♠',portal:'◈',treasure:'◆',house:'⌂',spike:'▲',flower:'✦'})[type]||''}</span>
      {player&&<span className="forgePlayer" aria-label="Player">●</span>}
    </button>;
}
function ActionLink({path,children}){return <a className="forgeActionLink" href={BASE+path}>{children}<span>↗</span></a>;}
function GraphConditionControls({condition,available,onChange,minOne=false}){
  const chosen=condition?.ids||[];
  return <div className="forgeGraphConditions">
    <label>Require
      <select value={condition?.mode||'all'} onChange={e=>onChange({mode:e.target.value,ids:chosen})}>
        <option value="all">ALL connected events (AND)</option>
        <option value="any">ANY connected event (OR)</option>
      </select>
    </label>
    <div className="forgeGraphChips" role="group" aria-label="Prerequisite event connections">
      {available.length?available.map(({id,label})=><label key={id}>
        <input type="checkbox" checked={chosen.includes(id)}
          disabled={minOne&&chosen.length===1&&chosen.includes(id)}
          onChange={e=>onChange({mode:condition?.mode||'all',
            ids:e.target.checked?[...chosen,id]:chosen.filter(x=>x!==id)})}/>
        {label}
      </label>):<span>Make a pickup, checkpoint, switch or secret to connect first.</span>}
    </div>
  </div>;
}
export default function ForgeV6(){
  const [workspace,setWorkspace]=useState('World Builder');
  const [history,setHistory]=useState(()=>({current:createSeedWorld(),past:[],future:[]}));
  const [brush,setBrush]=useState('grass');
  const [grid,setGrid]=useState(true);
  const [mode,setMode]=useState('edit');
  const [player,setPlayer]=useState({x:2,y:14});
  const [message,setMessage]=useState('Welcome to the Forge. Edit the sample world or enter Play Preview.');
  const [paused,setPaused]=useState(false);
  const [gravity,setGravity]=useState(-9.81);
  const [physicsStatus,setPhysicsStatus]=useState('standby');
  const [physicsStats,setPhysicsStats]=useState({fps:0,bodies:0});
  const [saved,setSaved]=useState(false);
  const [vrScene,setVrScene]=useState(null);
  const [vrHash,setVrHash]=useState('');
  const [vrPhysicsProfile,setVrPhysicsProfile]=useState(null);
  const [vrSelected,setVrSelected]=useState(null);
  const [walkMode,setWalkMode]=useState(false);
  const [gizmoMode,setGizmoMode]=useState('translate');
  const [gizmoSnap,setGizmoSnap]=useState({...DEFAULT_GIZMO_SNAP});
  const [profileHistory,setProfileHistory]=useState({past:[],future:[]});
  const [placementKind,setPlacementKind]=useState(null);
  const [playablePreview,setPlayablePreview]=useState(null);
  const [releaseDraft,setReleaseDraft]=useState(null);
  const [gameplayRules,setGameplayRules]=useState(null);
  const [gameRuleHistory,setGameRuleHistory]=useState({past:[],future:[]});
  const [ruleAnchor,setRuleAnchor]=useState('');
  const [ruleName,setRuleName]=useState('');
  const [ruleMessage,setRuleMessage]=useState('Checkpoint reached.');
  const [doorTarget,setDoorTarget]=useState('');
  const [doorPrerequisite,setDoorPrerequisite]=useState('');
  const physicsRef=useRef(null);
  const fileRef=useRef(null);
  const vrFileRef=useRef(null);
  const profileFileRef=useRef(null);
  const gameplayFileRef=useRef(null);
  const physicsDescriptors=useMemo(()=>vrScene&&vrPhysicsProfile
    ?toPhysicsDescriptors(vrScene,vrPhysicsProfile,vrHash):null,[vrScene,vrPhysicsProfile,vrHash]);
  const selectedVr=vrScene?.objects.find(o=>o.id===vrSelected)
    ||vrPhysicsProfile?.placed?.find(o=>o.id===vrSelected)||null;
  const selectedPhysics=[...(vrPhysicsProfile?.objects||[]),...(vrPhysicsProfile?.placed||[])]
    .find(o=>o.id===vrSelected)||null;
  const doc=history.current;
  const edit=useCallback(next=>{
    setHistory(h=>({current:next(h.current),past:[...h.past.slice(-39),h.current],future:[]}));
    setSaved(false);
  },[]);
  const undo=()=>setHistory(h=>h.past.length?{current:h.past[h.past.length-1],past:h.past.slice(0,-1),future:[h.current,...h.future]}:h);
  const redo=()=>setHistory(h=>h.future.length?{current:h.future[0],past:[...h.past,h.current],future:h.future.slice(1)}:h);
  function paint(index){
    if(mode==='play'){
      const x=index%WIDTH,y=Math.floor(index/WIDTH);
      const t=doc.tiles[index];
      setMessage(t==='treasure'?'You found a shimmering artifact!':t==='portal'?'Portal spotted. The full quest runtime lives in the original Studio.':t==='spike'?'Hazard ahead.':t==='house'?'A building in Mt. Shasta Roadside.':'Tile: '+t+' at '+x+', '+y);
      return;
    }
    if(doc.tiles[index]===brush)return;
    edit(current=>paintTile(current,index,brush));
  }
  useEffect(()=>{
    if(mode!=='play'||!['World Builder','Playtest'].includes(workspace))return;
    const handler=e=>{
      if(/input|textarea|select/i.test(e.target?.tagName||''))return;
      const key=e.key.toLowerCase();
      const moves={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
      if(!moves[key])return;
      e.preventDefault();
      setPlayer(p=>movePlayer(doc,p,...moves[key]));
    };
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  },[mode,doc,workspace]);
  function setSection(name){
    if(name!=='Physics')setPhysicsStatus('standby');
    setWorkspace(name==='Studio'?'World Builder':name);
    if(name==='Playtest'){setMode('play');setMessage('Play Preview: use WASD or arrow keys to walk around the demo map.');}
  }
  function save(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(doc));setSaved(true);setMessage('Saved the v6 demo world in this browser. Existing v5 saves were not touched.');}
    catch(e){setMessage('Local save failed: '+e.message);}
  }
  function load(){
    try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw){setMessage('No v6 demo save found in this browser.');return;}
      const next=validateDemoWorld(JSON.parse(raw));edit(()=>next);setSaved(true);setMessage('Loaded your v6 demo save.');}
    catch(e){setMessage('Load rejected: '+e.message);}
  }
  async function importFile(e){
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    try{if(file.size>1024*1024)throw new Error('Import limit is 1 MB.');
      const next=validateDemoWorld(JSON.parse(await file.text()));edit(()=>next);setMessage('Validated v6 demo world imported.');}
    catch(err){setMessage('Import rejected: '+err.message);}
  }
  async function adoptVrScene(world) {
    const source=parseVrScene(JSON.stringify(world));
    const hash=await fingerprintVrWorld(source);
    const draft=newPhysicsProfile(source,hash);
    setVrScene(source);setVrHash(hash);setVrPhysicsProfile(draft);
    setGameplayRules(newGameplayRules(hash));setGameRuleHistory({past:[],future:[]});
    setRuleAnchor(draft.objects[0]?.id||'');setDoorTarget('');setDoorPrerequisite('');
    setVrSelected(draft.objects[0]?.id||source.objects[0]?.id||null);
    setWalkMode(false);setPaused(true);
    setGizmoMode('translate');setPlacementKind(null);setProfileHistory({past:[],future:[]});
    setMessage('VR scene '+source.title+' loaded into sandbox only. Original VR Studio scene remains unchanged.');
  }
  async function useVrLocalSave(){
    try {
      const raw=localStorage.getItem(VR_SCENE_STORAGE_KEY);
      if(!raw)throw Error('VR Studio has no saved scene on this browser/origin. Export JSON from VR Studio instead.');
      if(raw.length>MAX_SCENE_BYTES)throw Error('VR scene exceeds the import limit.');
      await adoptVrScene(parseVrScene(raw));
    }catch(e){setMessage('VR scene load rejected: '+e.message);}
  }
  async function importVrFile(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try {
      if(file.size>MAX_SCENE_BYTES)throw Error('VR World JSON exceeds 200 KB.');
      await adoptVrScene(parseVrScene(await file.text()));
    }catch(e){setMessage('VR scene import rejected: '+e.message);}
  }
  async function importPhysicsFile(event){
    const file=event.target.files?.[0];event.target.value='';if(!file||!vrScene)return;
    try{
      if(file.size>MAX_PROFILE_BYTES)throw Error('Physics profile exceeds 100 KB.');
      const loaded=validatePhysicsProfile(JSON.parse(await file.text()),vrScene,vrHash);
      setVrPhysicsProfile(loaded);setWalkMode(false);setPaused(true);
      setProfileHistory({past:[],future:[]});setPlacementKind(null);
      setMessage('Scene-bound physics profile loaded. The source scene was not changed.');
    }catch(e){setMessage('Physics profile import rejected: '+e.message);}
  }
  function commitProfile(next){
    if(!vrPhysicsProfile)return false;
    if(JSON.stringify(next)===JSON.stringify(vrPhysicsProfile))return true;
    setProfileHistory(h=>({past:[...h.past.slice(-39),vrPhysicsProfile],future:[]}));
    setVrPhysicsProfile(next);
    return true;
  }
  function editPhysics(patch){
    if(!selectedPhysics||!vrScene)return false;
    try {
      const next=editPhysicsObject(vrPhysicsProfile,vrScene,vrHash,selectedPhysics.id,patch);
      return commitProfile(next);
    }catch(e){setMessage('Physics edit rejected: '+e.message);return false;}
  }
  function acceptSurfacePlacement(hit){
    if(!vrScene||!vrPhysicsProfile||!paused||walkMode||!placementKind)return;
    try{
      const {id,profile}=placeOnSurface(vrPhysicsProfile,vrScene,vrHash,placementKind,hit,
        gizmoSnap.translation);
      commitProfile(profile);
      setVrSelected(id);
      setMessage('Placed '+placementKind+' '+id+' on '+hit.targetId+'. Stored only in the scene-bound physics sidecar.');
    }catch(e){setMessage('Placement rejected: '+e.message);}
  }
  function removeSelectedConstruction(){
    if(!vrScene||!vrPhysicsProfile||!vrSelected?.startsWith('placed-'))return;
    try{
      const next=removePlacedObject(vrPhysicsProfile,vrScene,vrHash,vrSelected);
      if(commitProfile(next)){
        setVrSelected(vrScene.objects[0]?.id||null);
        setMessage('Removed sandbox prefab. Original VR scene unchanged.');
      }
    }catch(e){setMessage('Removal rejected: '+e.message);}
  }
  function togglePlacement(kind){
    if(!vrScene||walkMode)return;
    const next=placementKind===kind?null:kind;
    if(next&&!paused){setPaused(true);physicsRef.current?.reset();}
    setPlacementKind(next);
    if(next)setGizmoMode('inspect');
    setMessage(next?'Placement armed: '+PLACEMENT_TEMPLATES[next].label+'. Hover over a fixed collider top to preview, then click to place.':
      'Placement mode ended.');
  }
  function acceptGizmoTransform(id,tool,transform){
    if(!vrScene||!vrPhysicsProfile||walkMode||!paused)return false;
    try {
      const next=applyGizmoTransform(vrPhysicsProfile,vrScene,vrHash,id,tool,transform,gizmoSnap);
      const changed=JSON.stringify(next)!==JSON.stringify(vrPhysicsProfile);
      if(!changed){setMessage('Snap returned the object to its existing transform. No edit recorded.');return false;}
      const accepted=commitProfile(next);
      setMessage('Committed one '+tool+' edit for '+id+' to the sandbox sidecar. Source scene unchanged.');
      return accepted;
    }catch(e){setMessage('Gizmo edit rejected: '+e.message);return false;}
  }
  function selectVrObject(id){
    setVrSelected(id);
    if(!walkMode&&gizmoMode!=='inspect'&&!paused){
      setPaused(true);
      physicsRef.current?.reset();
    }
  }
  function chooseGizmoMode(next){
    if(walkMode)return;
    if(!paused){setPaused(true);physicsRef.current?.reset();}
    setPlacementKind(null);setGizmoMode(next);
  }
  function undoPhysics(){
    if(!profileHistory.past.length)return;
    setVrPhysicsProfile(profileHistory.past[profileHistory.past.length-1]);
    setProfileHistory(h=>({past:h.past.slice(0,-1),future:[vrPhysicsProfile,...h.future].slice(0,40)}));
    setMessage('Undid one sandbox physics edit. Source world unchanged.');
  }
  function redoPhysics(){
    if(!profileHistory.future.length)return;
    setVrPhysicsProfile(profileHistory.future[0]);
    setProfileHistory(h=>({past:[...h.past,vrPhysicsProfile].slice(-40),future:h.future.slice(1)}));
    setMessage('Redid one sandbox physics edit. Source world unchanged.');
  }
  function toggleWalkTest(){
    if(!vrScene)return;
    const next=!walkMode;
    setPlacementKind(null);setWalkMode(next);setPaused(!next);
    setMessage(next?'Walk test active. WASD/arrow keys move the Rapier capsule.':'Walk test ended. Editor paused, source transforms restored.');
  }
  useEffect(()=>{
    if(workspace!=='Physics'||!vrScene||walkMode)return;
    const key=e=>{
      if(e.ctrlKey||e.altKey||e.metaKey||/^(input|textarea|select)$/i.test(e.target?.tagName||''))return;
      const tool={w:'translate',e:'rotate',r:'scale'}[e.key.toLowerCase()];
      if(!tool)return;
      e.preventDefault();chooseGizmoMode(tool);
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[workspace,vrScene,walkMode,paused,gizmoMode]);
  function editVector(field,axis,value){
    if(!selectedPhysics)return;
    const num=Number(value);
    if(value.trim()===''||!Number.isFinite(num)){setMessage('Enter a finite transform value.');return;}
    const next=[...selectedPhysics[field]];next[axis]=num;
    editPhysics({[field]:next});
  }
  function leaveVrScene(){
    setVrScene(null);setVrHash('');setVrPhysicsProfile(null);
    setGameplayRules(null);setGameRuleHistory({past:[],future:[]});
    setRuleAnchor('');setDoorTarget('');setDoorPrerequisite('');
    setVrSelected(null);setWalkMode(false);setPaused(false);
    setProfileHistory({past:[],future:[]});setGizmoMode('translate');setPlacementKind(null);
    setMessage('Returned to the standard Physics Lab. No VR Studio files were changed.');
  }
  function commitGameplay(next){
    if(!gameplayRules||JSON.stringify(gameplayRules)===JSON.stringify(next))return;
    setGameRuleHistory(h=>({past:[...h.past.slice(-29),gameplayRules],future:[]}));
    setGameplayRules(next);
  }
  function createRule(kind){
    if(!vrScene||!gameplayRules)return;
    try{
      const anchor=physicsDescriptors?.find(o=>o.id===ruleAnchor&&!o.proxy);
      if(!anchor)throw Error('Select a source or placed primitive, not a private asset proxy.');
      const labels={collectible:'New Spark',trigger:'New Checkpoint',goal:'Finish Line'};
      const next=addGameplayMarker(gameplayRules,vrHash,kind,markerPositionForObject(anchor),
        ruleName.trim()||labels[kind],ruleMessage.trim()||'Checkpoint reached.');
      commitGameplay(next);setRuleName('');
      setMessage('Added '+kind+' marker near '+anchor.name+'. Export to test it in World Player.');
    }catch(e){setMessage('Game rule rejected: '+e.message);}
  }
  function removeRule(id){
    try{commitGameplay(removeGameplayMarker(gameplayRules,vrHash,id));
      setMessage('Removed gameplay marker '+id+'.');}
    catch(e){setMessage('Gameplay removal rejected: '+e.message);}
  }
  function editRuleNumber(id,field,axis,input){
    if(!gameplayRules||input.trim()==='')return;
    const value=Number(input);
    if(!Number.isFinite(value)){setMessage('Marker position/radius must be finite.');return;}
    const all=[...gameplayRules.collectibles,...gameplayRules.triggers,...(gameplayRules.goal?[gameplayRules.goal]:[])];
    const marker=all.find(o=>o.id===id);if(!marker)return;
    const next=field==='position'?{position:marker.position.map((n,i)=>i===axis?value:n)}:{radius:value};
    try{commitGameplay(editGameplayMarker(gameplayRules,vrHash,id,next));}
    catch(e){setMessage('Gameplay edit rejected: '+e.message);}
  }
  function undoGameRules(){
    if(!gameRuleHistory.past.length)return;
    setGameplayRules(gameRuleHistory.past.at(-1));
    setGameRuleHistory(h=>({past:h.past.slice(0,-1),future:[gameplayRules,...h.future].slice(0,30)}));
  }
  function redoGameRules(){
    if(!gameRuleHistory.future.length)return;
    setGameplayRules(gameRuleHistory.future[0]);
    setGameRuleHistory(h=>({past:[...h.past,gameplayRules].slice(-30),future:h.future.slice(1)}));
  }
  function exportRules(){
    if(gameplayRules)downloadJson(validateGameplayRules(gameplayRules,vrHash),'pixelforge-gameplay.v1.json');
  }
  async function importRules(event){
    const file=event.target.files?.[0];event.target.value='';if(!file||!vrScene)return;
    try{
      if(file.size>20000)throw Error('Game rule file must be under 20 KB.');
      const validated=validateGameplayRules(JSON.parse(await file.text()),vrHash);
      commitGameplay(validated);
      setMessage('Loaded matching source-bound gameplay rule file.');
    }catch(e){setMessage('Gameplay import rejected: '+e.message);}
  }
  const eventGraph=gameplayRules?.graph||newEventGraph();
  const graphMarkerIds=gameplayRules?
    [...gameplayRules.collectibles.map(o=>o.id),...gameplayRules.triggers.map(o=>o.id)]:[];
  const graphDependencies=gameplayRules?[
    ...gameplayRules.collectibles.map(o=>({id:o.id,label:'◆ '+o.name})),
    ...gameplayRules.triggers.map(o=>({id:o.id,label:'⌖ '+o.name})),
    ...eventGraph.nodes.map(o=>({id:o.id,label:(o.kind==='switch'?'⌘ ':'✧ ')+o.name}))
  ]:[];
  const doorCandidates=physicsDescriptors?.filter(o=>!o.proxy&&o.body==='fixed'&&
    ['block','pillar','platform'].includes(o.kind))||[];
  function commitEventGraph(next){
    if(!gameplayRules)return;
    try{
      const validated=validateGameplayRules({...gameplayRules,graph:next},vrHash);
      validateEventGraphTargets(validated.graph,physicsDescriptors||[]);
      commitGameplay(validated);
      return true;
    }catch(e){setMessage('Event graph rejected: '+e.message);return false;}
  }
  function createGraphNode(kind){
    if(!gameplayRules)return;
    try{
      const anchor=physicsDescriptors?.find(o=>o.id===ruleAnchor&&!o.proxy)||
        physicsDescriptors?.find(o=>!o.proxy);
      if(!anchor)throw Error('Select a primitive anchor to place this event.');
      const next=addEventNode(eventGraph,graphMarkerIds,kind,markerPositionForObject(anchor),
        ruleName.trim()||(kind==='switch'?'New Switch':'Hidden Secret'));
      if(commitEventGraph(next))setMessage('Added '+kind+' node. Connect its prerequisites below.');
    }catch(e){setMessage('Event graph creation rejected: '+e.message);}
  }
  function createGraphDoor(){
    if(!gameplayRules)return;
    try{
      const target=doorCandidates.find(o=>o.id===(doorTarget||doorCandidates[0]?.id));
      const dep=graphDependencies.find(o=>o.id===(doorPrerequisite||graphDependencies[0]?.id));
      if(!target||!dep)throw Error('Choose a solid block/pillar and an event that unlocks it.');
      const next=addEventDoor(eventGraph,graphMarkerIds,target.id,
        target.name+' Gate',dep.id);
      if(commitEventGraph(next))setMessage('Linked '+dep.id+' to a locked collider: '+target.name+'.');
    }catch(e){setMessage('Door connection rejected: '+e.message);}
  }
  function changeGraphNode(id,patch){
    try{commitEventGraph(updateEventNode(eventGraph,graphMarkerIds,id,patch));}
    catch(e){setMessage('Graph edit rejected: '+e.message);}
  }
  function deleteGraphNode(id){
    try{
      if(commitEventGraph(removeEventNode(eventGraph,graphMarkerIds,id)))
        setMessage('Removed event node and its dependent connections.');
    }catch(e){setMessage('Graph removal rejected: '+e.message);}
  }
  function editGraphNumber(id,field,axis,input){
    if(input.trim()==='')return;
    const value=Number(input);
    if(!Number.isFinite(value)){setMessage('Graph coordinate/radius must be finite.');return;}
    const node=eventGraph.nodes.find(n=>n.id===id);
    if(!node)return;
    changeGraphNode(id,field==='position'?
      {position:node.position.map((v,i)=>i===axis?value:v)}:{radius:value});
  }
  function setGraphGoalCondition(condition){
    changeGraphNode('goal',{goalRequires:condition});
  }
  const gameplayForExport=gameplayRules&&
    (gameplayRules.collectibles.length||gameplayRules.triggers.length||gameplayRules.goal||
      gameplayRules.graph?.nodes.length||gameplayRules.graph?.doors.length||
      gameplayRules.graph?.goalRequires)?gameplayRules:null;
  const exportDemo=()=>downloadJson(doc,'pixelforge-v6-demo-world.json');
  const exportPhysicsProfile=()=>{if(vrScene&&vrPhysicsProfile)
    downloadJson(validatePhysicsProfile(vrPhysicsProfile,vrScene,vrHash),'pixelforge-physics-sandbox.v1.json');};
  function exportPlayable(){
    if(!vrScene||!vrPhysicsProfile)return;
    try{
      const world=buildPlayableWorld(vrScene,vrPhysicsProfile,vrHash,gravity,gameplayForExport);
      downloadJson(world,'pixelforge-playable-world.v1.json');
      setMessage('Exported playable-world.v1 JSON, ready for the standalone World Player.');
    }catch(e){setMessage('World export rejected: '+e.message);}
  }
  async function publishPlayable(){
    try{
      if(!vrScene||!vrPhysicsProfile)throw Error('Load or build a validated VR scene and physics profile first.');
      const playable=buildPlayableWorld(vrScene,vrPhysicsProfile,vrHash,gravity,gameplayForExport);
      const result=await downloadOfflineWorld(playable,
        releaseDraft??defaultReleaseMetadata(playable.title));
      setMessage('Published offline adventure: '+result.filename+'. It contains no private GLB mesh data or executable world scripts.');
    }catch(e){setMessage('Offline publish refused: '+e.message);}
  }
  function previewPlayable(){
    if(!vrScene||!vrPhysicsProfile)return;
    try{
      const world=buildPlayableWorld(vrScene,vrPhysicsProfile,vrHash,gravity,gameplayForExport);
      setPaused(true);setPhysicsStatus('standby');
      setPlayablePreview(world);
    }catch(e){setMessage('World preview rejected: '+e.message);}
  }
  const showMap=workspace==='World Builder'||workspace==='Playtest';
  const physics=workspace==='Physics';
  const stats=[['SCENES','1'],['TILES',String(doc.tiles.length)],['KINDS',String(new Set(doc.tiles).size)],['BODIES',physics?String(physicsStats.bodies):'–']];
  if(playablePreview)return <Suspense fallback={<div className="forgeLoading">Launching your playable world…</div>}>
    <WorldPlayer initialWorld={playablePreview} onExit={()=>{setPlayablePreview(null);setPaused(true);setPhysicsStatus('standby');}}/>
  </Suspense>;
  return <div className="forgePage">
    <header className="forgeMast">
      <div className="forgeOrbLogo">Φ</div>
      <div className="forgeBrand"><span>PHI369 LABS / THE CREATOR'S FORGE</span><strong>PARALLAX <em>PIXELFORGE</em></strong><small>RETRO GAME CREATOR STUDIO</small></div>
      <div className="forgeSun" aria-hidden="true">Φ</div>
      <div className="forgeSkyline" aria-hidden="true"/>
      <div className="forgeMastRight"><b>v6.0 / FORGE PREVIEW</b><span>EDIT&nbsp; · &nbsp;BUILD&nbsp; · &nbsp;PLAY&nbsp; · &nbsp;EXPORT&nbsp; · &nbsp;XR</span></div>
    </header>
    <nav className="forgeNav" aria-label="PixelForge v6 workspaces">
      {NAV.map(([label,glyph])=><button key={label} onClick={()=>setSection(label)} className={workspace===label||(label==='Studio'&&workspace==='World Builder')?'active':''} type="button"><span>{glyph}</span>{label}</button>)}
      <a href={BASE} className="forgeBack">Portal ↗</a>
    </nav>
    <div className="forgeLayout">
      <aside className="forgeSidebar forgePanel">
        <div className="forgeIdentity"><div className="forgeLogoTile">⬡</div><div><b>PixelForge</b><strong>v6.0</strong><small>PARALLAX STUDIO</small></div></div>
        <div className="forgeMenu">
          {LIBRARY.map(([label,glyph,target])=><button key={label} type="button" className={workspace===target?'active':''} onClick={()=>setSection(target)}><span>{glyph}</span>{label}</button>)}
        </div>
        <ActionLink path="studio/">ΦPACK Workshop</ActionLink>
        <ActionLink path="vr-studio/">Existing VR Studio</ActionLink>
        <p className="forgeFine">V6 is an isolated preview workspace. Existing creator tools, project files and local asset permissions remain unchanged.</p>
      </aside>
      <main className="forgeMain">
        <section className="forgeProject forgePanel">
          <div className="forgeProjectArt" aria-hidden="true"><span>✦</span></div>
          <div className="forgeProjectCopy"><span className="forgeEyebrow">PROJECT / DEMONSTRATION WORLD</span><h1>{doc.title}</h1><p>{doc.scene} · overworld</p><div className="forgeTags"><span>DEMO</span><span>RPG</span><span>PIXEL</span><span>LOCAL FIRST</span></div></div>
          <div className="forgeProjectState"><span className="forgePill">● {saved?'Saved locally':'Unsaved / editing'}</span><small>Separate from v5 saves</small></div>
        </section>
        <section className="forgeToolbar forgePanel" aria-label="Workspace tools">
          <span className="forgeSmallLabel">{workspace.toUpperCase()}</span>
          {showMap&&<><button className={mode==='edit'?'selected':''} onClick={()=>setMode('edit')} type="button">✎ Editor</button><button className={mode==='play'?'selected':''} onClick={()=>{setMode('play');setMessage('Use WASD or arrow keys to explore.');}} type="button">▶ Play Preview</button><button onClick={undo} disabled={!history.past.length} type="button">↶ Undo</button><button onClick={redo} disabled={!history.future.length} type="button">↷ Redo</button><button onClick={()=>setGrid(v=>!v)} type="button">▦ Grid {grid?'On':'Off'}</button></>}
          {physics&&<><button className="selected" type="button" onClick={()=>setPaused(v=>!v)}>{paused?'▶ Resume':'Ⅱ Pause'}</button><button type="button" onClick={()=>physicsRef.current?.reset()}>↻ Reset</button></>}
          <div className="forgeToolbarSpacer"/>
          <button type="button" onClick={save}>▣ Save Local</button><button type="button" onClick={load}>↻ Load Local</button><button type="button" onClick={exportDemo}>⇩ Export JSON</button>
          <button type="button" onClick={()=>fileRef.current?.click()}>⇧ Import</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile}/>
        </section>
        {showMap&&<section className="forgeWorkspace forgePanel">
          <div className="forgeToolPanel"><h2>Tools / Tileset</h2><p>Choose a tile then click the map to paint.</p>
            <div className="forgeBrushes">{TILES.map(([type,label,glyph])=><button type="button" key={type} aria-pressed={brush===type} onClick={()=>{setBrush(type);setMode('edit');}} className={brush===type?'active':''} title={label}><span className={'forgeBrush forgeTile-'+type}>{glyph}</span><small>{label}</small></button>)}</div>
            <div className="forgeToolInfo"><b>BRUSH</b><span>{TILES.find(t=>t[0]===brush)?.[1]}</span><b>CANVAS</b><span>{WIDTH} × {HEIGHT} tiles</span><b>MODE</b><span>{mode==='play'?'Play Preview':'Paint / Edit'}</span></div>
          </div>
          <div className="forgeWorldCanvas">
            <div className="forgeCanvasLabel">EDITOR: {mode==='edit'?'PAINT':'PLAY'} · {doc.scene} · {WIDTH}×{HEIGHT}</div>
            <div className="forgeMapScroll"><div className="forgeMap" style={{gridTemplateColumns:'repeat('+WIDTH+',1fr)'}}>
              {doc.tiles.map((type,i)=><Tile key={i} type={type} index={i} grid={grid} onClick={paint} mode={mode} player={mode==='play'&&i===player.y*WIDTH+player.x}/>)}
            </div></div>
            <div className="forgeCanvasFoot"><span>▦ Grid {grid?'visible':'hidden'}</span><span>SELECTED: {brush.toUpperCase()}</span><span>{mode==='play'?'WASD / ARROWS TO MOVE':'CLICK TILE TO PAINT'}</span></div>
          </div>
        </section>}
        {physics&&<section className="forgePhysicsArea forgePanel">
          <div className="forgeViewportTitle"><div><span className="forgeEyebrow">PHYSICS LAB / WORKING PROTOTYPE</span><h2>Three.js + Rapier rigid-body playground</h2></div><span className="forgePill">{physicsStatus==='ready'?'● SIMULATION READY':physicsStatus==='error'?'UNAVAILABLE':'INITIALIZING'}</span></div>
          {vrScene&&<div className="forgeGizmoToolbar" role="group" aria-label="3D transform tools">
            <span>3D EDITOR</span>
            {[['inspect','Inspect','⌖'],['translate','Move (W)','✥'],['rotate','Rotate Y (E)','⟳'],['scale','Scale (R)','⇲']].map(([tool,label,icon])=>
              <button key={tool} type="button" aria-pressed={gizmoMode===tool} className={gizmoMode===tool?'active':''} disabled={walkMode}
                onClick={()=>chooseGizmoMode(tool)}>{icon} {label}</button>)}
            <label>Snap
              <select aria-label="Transform snap increment" disabled={walkMode||gizmoMode==='inspect'}
                value={gizmoMode==='translate'?gizmoSnap.translation:gizmoMode==='rotate'?gizmoSnap.rotation:gizmoSnap.scale}
                onChange={e=>setGizmoSnap(old=>({...old,[gizmoMode==='translate'?'translation':gizmoMode==='rotate'?'rotation':'scale']:Number(e.target.value)}))}>
                {GIZMO_SNAPS[gizmoMode==='translate'?'translation':gizmoMode==='rotate'?'rotation':'scale'].map(x=>
                  <option value={x} key={x}>{x===0?'Off':x+(gizmoMode==='rotate'?'°':gizmoMode==='translate'?' m':' units')}</option>)}
              </select>
            </label>
            <button type="button" disabled={!profileHistory.past.length||walkMode} onClick={undoPhysics}>↶ Undo</button>
            <button type="button" disabled={!profileHistory.future.length||walkMode} onClick={redoPhysics}>↷ Redo</button>
            <small>{walkMode?'WALK TEST':placementKind?'PLACEMENT ARMED':paused?'EDIT PAUSED':'SIMULATING · PAUSE TO EDIT'}</small>
          </div>}
          <Suspense fallback={<div className="forgeLoading">Loading 3D physics bundle…</div>}>
            <PhysicsStage ref={physicsRef} paused={paused} gravity={gravity} onStatus={setPhysicsStatus} onStats={setPhysicsStats}
              sceneObjects={physicsDescriptors} onObjectClick={selectVrObject} walkMode={walkMode}
              sceneKey={vrHash||null} selectedObjectId={vrSelected} gizmoMode={gizmoMode} gizmoSnap={gizmoSnap}
              onTransformCommit={acceptGizmoTransform} placementKind={placementKind}
              onPlacementRequest={acceptSurfacePlacement} onPlacementStatus={setMessage}/>
          </Suspense>
          {vrScene&&<div className="forgeConstructionToolbar" role="group" aria-label="Place sandbox geometry">
            <span>WORLD CONSTRUCTION</span>
            {Object.entries(PLACEMENT_TEMPLATES).map(([kind,template])=>
              <button type="button" key={kind} aria-pressed={placementKind===kind}
                className={placementKind===kind?'active':''} disabled={walkMode||vrPhysicsProfile.placed.length>=MAX_PLACED_OBJECTS}
                onClick={()=>togglePlacement(kind)}>+ {template.label}</button>)}
            {placementKind&&<button type="button" onClick={()=>setPlacementKind(null)}>✕ Finish placing</button>}
            <small>{vrPhysicsProfile.placed.length} / {MAX_PLACED_OBJECTS} sandbox objects</small>
          </div>}
          <div className="forgePhysicsControls"><button type="button" onClick={()=>physicsRef.current?.spawn('box')} disabled={physicsStatus!=='ready'}>+ Drop Box</button><button type="button" onClick={()=>physicsRef.current?.spawn('ball')} disabled={physicsStatus!=='ready'}>+ Drop Ball</button><button type="button" onClick={()=>physicsRef.current?.reset()} disabled={physicsStatus!=='ready'}>↻ Reset Scene</button><label>Gravity: {gravity.toFixed(1)} m/s²<input type="range" min="-20" max="0" step=".5" value={gravity} onChange={e=>setGravity(Number(e.target.value))}/></label></div>
          <section className="forgeVrBridge" aria-label="VR Studio scene physics bridge">
            <div className="forgeVrBridgeTitle"><div><span className="forgeEyebrow">RUNG 2 / THE LIVING WORLD</span><h3>VR Studio scene → Rapier sandbox</h3></div>
              <span className="forgePill">{vrScene?'● SCENE IMPORTED':'READ-ONLY SCENE BRIDGE'}</span></div>
            <p>Load an existing PixelForge VR World v1 scene. Preview cuboid colliders, change physics and transforms, then export a separate sidecar. The original scene stays untouched.</p>
            <div className="forgeVrButtons">
              <button type="button" onClick={()=>{void adoptVrScene(sampleVrWorld()).catch(e=>setMessage('Sample load failed: '+e.message));}}>Load VR sample</button>
              <button type="button" onClick={()=>{void useVrLocalSave();}}>Read VR Studio save</button>
              <button type="button" onClick={()=>vrFileRef.current?.click()}>Import VR scene JSON</button>
              {vrScene&&<button type="button" onClick={leaveVrScene}>Return to Physics Lab</button>}
            </div>
            <input ref={vrFileRef} hidden type="file" accept=".json,application/json" onChange={importVrFile}/>
            {vrScene&&<div className="forgeVrEditor">
              <div className="forgeVrSceneInfo"><strong>{vrScene.title}</strong><span>{vrScene.objects.length} source + {vrPhysicsProfile.placed.length} placed · Source SHA-256: {vrHash.slice(0,12)}…</span></div>
              <div className="forgeVrEditorGrid">
                <div className="forgeVrObjectList" aria-label="VR scene objects">{[...vrScene.objects,...vrPhysicsProfile.placed].map(o=><button type="button" key={o.id} className={vrSelected===o.id?'active':''} onClick={()=>selectVrObject(o.id)}>
                  <strong>{o.name}</strong><small>{o.id} · {o.kind}{o.kind==='asset-proxy'?' · proxy only':''}</small></button>)}</div>
                <div className="forgeVrInspector">
                  {selectedVr&&<><h4>{selectedVr.name}</h4><p>{selectedVr.kind==='asset-proxy'?'Asset proxy: no mesh bytes or inferred GLB collider are imported.': 'Select the object in the scene or here. Edits rebuild the simulation preview.'}</p>
                  {selectedPhysics?<div key={selectedPhysics.id}>
                    <label>Collision / rigid body mode<select value={selectedPhysics.body} onChange={e=>editPhysics({body:e.target.value})}>
                      <option value="fixed">Fixed solid</option><option value="dynamic">Dynamic rigid body</option><option value="none">No collider / visual only</option>
                    </select></label>
                    <div className="forgeVrSliders"><label>Friction {selectedPhysics.friction.toFixed(2)}<input type="range" min="0" max="1" step=".05" value={selectedPhysics.friction} onChange={e=>editPhysics({friction:Number(e.target.value)})}/></label>
                    <label>Bounce {selectedPhysics.restitution.toFixed(2)}<input type="range" min="0" max="1" step=".05" value={selectedPhysics.restitution} onChange={e=>editPhysics({restitution:Number(e.target.value)})}/></label></div>
                    <h4>Draft position (meters)</h4><div className="forgeVrAxes">{['X','Y','Z'].map((label,axis)=><label key={label}>{label}<input type="number" step=".25" min="-100" max="100" key={selectedPhysics.id+'-position-'+axis+'-'+selectedPhysics.position[axis]} defaultValue={selectedPhysics.position[axis]} onBlur={e=>editVector('position',axis,e.target.value)}/></label>)}</div>
                    <h4>Draft scale</h4><div className="forgeVrAxes">{['X','Y','Z'].map((label,axis)=><label key={label}>{label}<input type="number" step=".1" min=".05" max="50" key={selectedPhysics.id+'-scale-'+axis+'-'+selectedPhysics.scale[axis]} defaultValue={selectedPhysics.scale[axis]} onBlur={e=>editVector('scale',axis,e.target.value)}/></label>)}</div>
                    <label>Yaw in degrees<input type="number" min="-360" max="360" step="5" key={selectedPhysics.id+'-yaw-'+selectedPhysics.yaw} defaultValue={selectedPhysics.yaw} onBlur={e=>{if(e.target.value.trim()!=='')editPhysics({yaw:Number(e.target.value)});}}/></label>
                    {vrSelected?.startsWith('placed-')&&<button className="forgeDeletePrefab" type="button" onClick={removeSelectedConstruction}>Delete this sandbox object</button>}
                  </div>:<p>External asset geometry stays private. Proxy collision is intentionally unavailable.</p>}</>}
                </div>
              </div>
              <div className="forgeVrButtons">
                <button type="button" className={walkMode?'forgeVrActive':''} onClick={toggleWalkTest}>{walkMode?'■ End walk test':'▶ Walk test (WASD)'}</button>
                <button type="button" onClick={exportPhysicsProfile}>⇩ Export physics sidecar</button>
                <button type="button" onClick={()=>profileFileRef.current?.click()}>⇧ Import matching sidecar</button>
              </div>
              <div className="forgePlayableBridge" aria-label="Playable World export">
                <div><span className="forgeEyebrow">RUNG 5 / WORLD PLAYER</span><h4>Build a playable world</h4>
                  <p>Export geometry, colliders and optional gameplay objectives as portable JSON. Add collectibles and victory goals in Game Logic first. Private asset proxies and scripts remain excluded.</p></div>
                <button type="button" onClick={()=>setSection('Game Logic')}>⌘ Author Game Rules</button>
                <button type="button" onClick={previewPlayable}>▶ Play This World</button>
                <button type="button" onClick={exportPlayable}>⇩ Export Playable World</button>
                <button type="button" onClick={()=>void publishPlayable()}>⇩ Publish Offline Adventure (.html)</button>
                <a href={BASE+'?play=1'}>Standalone World Player ↗</a>
              </div>
              <input hidden ref={profileFileRef} type="file" accept=".json,application/json" onChange={importPhysicsFile}/>
              <p className="forgeVrNotice">Rung 4: click + Block, + Platform, or + Pillar, hover over an upward fixed surface for a ghost preview, and click to place. Only the sidecar changes. Rung 3: click an eligible object, pause simulation, then drag X/Y/Z move or scale handles, or the Y rotation ring. W/E/R select tools; Esc cancels an active drag. One drag commits one bounded sidecar edit with Undo/Redo. Collisions use cuboid proxies, not real GLB mesh triangles. Walk mode uses a Rapier capsule. This is a sandbox proof, not a runtime capability change, game-cartridge export, or validated Quest 3 behavior.</p>
            </div>}
          </section>
        </section>}
        {workspace==='Game Logic'&&<section className="forgeRuleEditor forgePanel">
          <div className="forgeRuleHead"><div><span className="forgeEyebrow">RUNG 6 / DECLARATIVE GAMEPLAY</span>
            <h2>Quest & Trigger Builder</h2>
            <p>Build collectibles, checkpoint triggers and an event dependency graph with switches, secrets, locked doors and AND/OR victory paths. No scripts or network actions.</p></div>
            <a className="forgeActionLink" href={BASE+'studio/'}>Original Logic Composer ↗</a>
          </div>
          {!vrScene?<div className="forgeRuleEmpty"><p>Start with the official VR World sample, or import your own world through Physics first.</p>
            <button type="button" onClick={()=>{void adoptVrScene(sampleVrWorld()).catch(e=>setMessage(e.message));}}>◎ Load VR world sample</button>
            <button type="button" onClick={()=>setSection('Physics')}>Open Physics / Scene Import</button></div>:
          <div className="forgeRuleWorkspace">
            <div className="forgeRuleComposer">
              <h3>Place a gameplay marker</h3>
              <label>Attach near primitive
                <select value={physicsDescriptors?.some(o=>o.id===ruleAnchor&&!o.proxy)?ruleAnchor:
                  physicsDescriptors?.find(o=>!o.proxy)?.id||''}
                  onChange={e=>setRuleAnchor(e.target.value)}>
                  {physicsDescriptors?.filter(o=>!o.proxy).map(o=><option value={o.id} key={o.id}>{o.name} ({o.id})</option>)}
                </select>
              </label>
              <label>Display name<input maxLength={60} value={ruleName} onChange={e=>setRuleName(e.target.value)}
                placeholder="Example: Field Spark"/></label>
              <label>Checkpoint / victory message<input maxLength={180} value={ruleMessage} onChange={e=>setRuleMessage(e.target.value)}
                placeholder="You found the hidden frequency!"/></label>
              <div className="forgeRuleActions">
                <button type="button" disabled={gameplayRules.collectibles.length>=MAX_PICKUPS} onClick={()=>createRule('collectible')}>◆ Add Collectible</button>
                <button type="button" disabled={gameplayRules.triggers.length>=MAX_TRIGGERS} onClick={()=>createRule('trigger')}>⌖ Add Checkpoint</button>
                <button type="button" onClick={()=>createRule('goal')}>◎ {gameplayRules.goal?'Replace Finish':'Set Finish'}</button>
              </div>
              <p>Markers are positioned above the selected object's center. Adjust their X/Y/Z coordinates and radius below to fine-tune the player interaction.</p>
            </div>
            <div className="forgeRuleList">
              <div className="forgeRuleListHeader"><h3>Objective sequence</h3>
                <span>{gameplayRules.collectibles.length} collectible(s) · {gameplayRules.triggers.length} checkpoint(s)</span></div>
              {[...gameplayRules.collectibles.map(o=>({...o,markerType:'Collectible'})),
                ...gameplayRules.triggers.map(o=>({...o,markerType:'Checkpoint'})),
                ...(gameplayRules.goal?[{...gameplayRules.goal,markerType:'Finish'}]:[])].map(entry=>
                <div className="forgeRuleRow" key={entry.id}>
                  <div><strong>{entry.markerType}: {entry.name}</strong><span>{entry.id}</span></div>
                  <div className="forgeRuleCoords">
                    {['X','Y','Z'].map((axis,i)=><label key={axis}>{axis}<input type="number" step=".25"
                      min="-100" max="100" key={entry.id+'-'+i+'-'+entry.position[i]}
                      defaultValue={entry.position[i]} onBlur={e=>editRuleNumber(entry.id,'position',i,e.target.value)}/></label>)}
                    <label>Radius<input type="number" step=".1" min=".3" max="4"
                      key={entry.id+'-radius-'+entry.radius} defaultValue={entry.radius}
                      onBlur={e=>editRuleNumber(entry.id,'radius',0,e.target.value)}/></label>
                  </div>
                  <button type="button" onClick={()=>removeRule(entry.id)}>Delete</button>
                </div>)}
              {!gameplayRules.goal&&<p className="forgeRuleWarning">Add a Finish marker to enable a victory condition.</p>}
              {gameplayRules.goal&&<p className="forgeRuleNotice">
                {eventGraph.goalRequires?'Victory follows the graph branch requirements below.':
                  'Default victory requires every collectible and checkpoint, then entering the Finish marker.'}
              </p>}
              <div className="forgeRuleActions">
                <button disabled={!gameRuleHistory.past.length} onClick={undoGameRules} type="button">↶ Undo</button>
                <button disabled={!gameRuleHistory.future.length} onClick={redoGameRules} type="button">↷ Redo</button>
                <button type="button" onClick={exportRules}>⇩ Export Game Rules</button>
                <button type="button" onClick={()=>gameplayFileRef.current?.click()}>⇧ Import Matching Rules</button>
                <button type="button" onClick={previewPlayable}>▶ Play With Rules</button>
                <button type="button" onClick={exportPlayable}>⇩ Export Playable World</button>
                <button type="button" onClick={()=>void publishPlayable()}>⇩ Publish Offline HTML</button>
              </div>
              <input hidden ref={gameplayFileRef} type="file" accept=".json,application/json" onChange={importRules}/>
            </div>
            <section className="forgeGraphBoard" aria-label="Event graph editor">
              <div className="forgeGraphIntro">
                <div><span className="forgeEyebrow">RUNG 7 / EVENT GRAPH</span>
                  <h3>Switches · Secrets · Doors · Branches</h3>
                  <p>Connect event IDs through checked prerequisites. A switch requires E during play; a secret activates when approached. Doors remove only their declared fixed collider.</p>
                </div>
                <span className="forgePill">{eventGraph.nodes.length} EVENTS · {eventGraph.doors.length} DOORS</span>
              </div>
              <div className="forgeGraphCreate">
                <button type="button" disabled={eventGraph.nodes.length>=MAX_GRAPH_NODES}
                  onClick={()=>createGraphNode('switch')}>⌘ Add Interactive Switch</button>
                <button type="button" disabled={eventGraph.nodes.length>=MAX_GRAPH_NODES}
                  onClick={()=>createGraphNode('secret')}>✧ Add Hidden Secret</button>
                <div className="forgeGraphDoorCreator">
                  <label>Locked collider<select aria-label="Door collider" value={doorCandidates.some(o=>o.id===doorTarget)?doorTarget:doorCandidates[0]?.id||''}
                    onChange={e=>setDoorTarget(e.target.value)}>
                    {doorCandidates.map(o=><option key={o.id} value={o.id}>{o.name} ({o.id})</option>)}
                  </select></label>
                  <label>Initial prerequisite<select aria-label="Door prerequisite" value={graphDependencies.some(o=>o.id===doorPrerequisite)?doorPrerequisite:graphDependencies[0]?.id||''}
                    onChange={e=>setDoorPrerequisite(e.target.value)}>
                    {graphDependencies.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
                  </select></label>
                  <button type="button" disabled={!doorCandidates.length||!graphDependencies.length||eventGraph.doors.length>=MAX_GRAPH_DOORS}
                    onClick={createGraphDoor}>▣ Connect Locked Door</button>
                </div>
              </div>
              <div className="forgeGraphCards">
                {eventGraph.nodes.map(node=><article className="forgeGraphCard" key={node.id}>
                  <div className="forgeGraphCardHead">
                    <div><small>{node.id} · {node.kind==='switch'?'PRESS E TO ACTIVATE':'HIDDEN DISCOVERY'}</small>
                      <h4>{node.kind==='switch'?'⌘':'✧'} {node.name}</h4></div>
                    <button type="button" onClick={()=>deleteGraphNode(node.id)}>Delete</button>
                  </div>
                  <div className="forgeGraphSequence"><span>IF PREREQUISITES</span><b>→</b><strong>{node.kind.toUpperCase()} ACTIVATES</strong></div>
                  <GraphConditionControls condition={node.requires}
                    available={graphDependencies.filter(x=>x.id!==node.id)}
                    onChange={requires=>changeGraphNode(node.id,{requires})}/>
                  <div className="forgeGraphCoords">{['X','Y','Z'].map((axis,i)=><label key={axis}>{axis}
                    <input type="number" min="-100" max="100" step=".25"
                      key={node.id+'-pos-'+i+'-'+node.position[i]} defaultValue={node.position[i]}
                      onBlur={e=>editGraphNumber(node.id,'position',i,e.target.value)}/></label>)}
                    <label>Radius<input type="number" min=".3" max="4" step=".1"
                      key={node.id+'-radius-'+node.radius} defaultValue={node.radius}
                      onBlur={e=>editGraphNumber(node.id,'radius',0,e.target.value)}/></label></div>
                  <label>Event message<input type="text" maxLength={180} key={node.id+'-message-'+node.message}
                    defaultValue={node.message} onBlur={e=>{if(e.target.value!==node.message)
                      changeGraphNode(node.id,{message:e.target.value});}}/></label>
                </article>)}
                {eventGraph.doors.map(door=><article className="forgeGraphCard forgeDoorCard" key={door.id}>
                  <div className="forgeGraphCardHead"><div><small>{door.id} · FIXED COLLIDER {door.objectId}</small>
                    <h4>▣ {door.name}</h4></div>
                    <button type="button" onClick={()=>deleteGraphNode(door.id)}>Delete</button></div>
                  <div className="forgeGraphSequence"><span>IF PREREQUISITES</span><b>→</b><strong>REMOVE COLLIDER</strong></div>
                  <GraphConditionControls condition={door.requires} available={graphDependencies}
                    minOne onChange={requires=>changeGraphNode(door.id,{requires})}/>
                  <label>Unlock message<input maxLength={180} type="text" defaultValue={door.message}
                    key={door.id+'-message-'+door.message}
                    onBlur={e=>{if(e.target.value!==door.message)changeGraphNode(door.id,{message:e.target.value});}}/></label>
                </article>)}
                <article className="forgeGraphCard forgeGoalCard">
                  <div className="forgeGraphCardHead"><div><small>FINISH LINE / CONDITIONAL VICTORY</small>
                    <h4>◎ Branching Objective</h4></div>
                    {eventGraph.goalRequires&&<button type="button" onClick={()=>setGraphGoalCondition(null)}>Use classic goal</button>}</div>
                  <div className="forgeGraphSequence"><span>IF CONDITION</span><b>→</b><strong>ENABLE VICTORY</strong></div>
                  {!eventGraph.goalRequires?
                    <><p>Classic goal: require all pickups and checkpoints. Enable branching to choose AND/OR event dependencies instead.</p>
                      <button type="button" disabled={!graphDependencies.length} onClick={()=>
                        setGraphGoalCondition({mode:'any',ids:[graphDependencies[0].id]})}>+ Enable Alternative Route</button></>:
                    <GraphConditionControls condition={eventGraph.goalRequires}
                      available={graphDependencies} minOne onChange={setGraphGoalCondition}/>}
                  {!gameplayRules.goal&&<p className="forgeRuleWarning">Add a Finish marker above before victory can fire.</p>}
                </article>
              </div>
              <p className="forgeGraphFoot">All graph edges are checked before export. Cyclic links, missing markers and unsafe actions are refused. Changes are covered by Game Logic Undo/Redo.</p>
            </section>
          </div>}
        </section>}
        {!showMap&&!physics&&workspace!=='Game Logic'&&<section className="forgeBridge forgePanel"><span className="forgeEyebrow">BRIDGED WORKSPACE / GRADUAL MIGRATION</span><h2>{LINK_PANELS[workspace]?.title||workspace}</h2><p>{LINK_PANELS[workspace]?.text||'This workflow remains in the existing PixelForge toolchain.'}</p><div className="forgeBridgeLinks">{(LINK_PANELS[workspace]?.links||[]).map(([label,path])=><ActionLink key={label} path={path}>{label}</ActionLink>)}</div>{workspace==='Build & Export'&&<>
  <ReleaseMetadataEditor value={releaseDraft} onChange={setReleaseDraft}
    worldTitle={vrScene?.title||'PixelForge Adventure'}/>
  <button onClick={exportDemo} type="button" className="forgePrimary">⇩ Export current demo world JSON</button>
  <button onClick={()=>void publishPlayable()} type="button" className="forgePrimary">⇩ Publish Current 3D World Offline (.html)</button>
</>}</section>}
        <section className="forgeBottom">
          <div className="forgeTimeline forgePanel"><h2>Scene Timeline / Events <span>PREVIEW</span></h2><div className="forgeTrack"><span>▶</span><span className="forgeTrackLine"/><i/><i/><i/></div><p>Animation timeline authoring is planned. Map edits and physics are functional in this rung.</p></div>
          <div className="forgeLog forgePanel"><h2>Console / Activity</h2><p>✓ v6 workspace loaded without changing v5 saves</p><p>✓ Demo grid: {WIDTH} × {HEIGHT}</p><p>{physicsStatus==='ready'?'✓ Rapier and Three.js initialized':'· Physics initializes when its workspace opens'}</p>
            {vrScene&&<p>✓ Read-only VR scene loaded: {vrScene.title} ({vrScene.objects.length} objects)</p>}<p className="forgeMessage" role="status">{message}</p></div>
        </section>
      </main>
      <aside className="forgeRight">
        <section className="forgePanel forgeWidget"><h2>Runtime & Simulation</h2><div className="forgeStateRow"><span>⬡ Three.js Runtime</span><strong className={physicsStatus==='ready'?'on':''}>{physicsStatus==='ready'?'ON':'STANDBY'}</strong></div><div className="forgeStateRow"><span>⚛ Rapier Physics</span><strong className={physicsStatus==='ready'?'on':''}>{physicsStatus==='ready'?'ON':'STANDBY'}</strong></div><div className="forgeStateRow"><span>✧ VFX Authoring</span><strong>PLANNED</strong></div><div className="forgeStateRow"><span>◈ WebXR / Quest 3</span><strong>EXPERIMENTAL</strong></div><button className="forgePrimary" type="button" onClick={()=>setSection(physics?'World Builder':'Physics')}>{physics?'▧ WORLD BUILDER':'▶ OPEN PHYSICS LAB'}</button><div className="forgeSmallLinks"><ActionLink path="studio/">Original Studio</ActionLink><ActionLink path="vr-studio/">VR Preview</ActionLink></div></section>
        <section className="forgePanel forgeWidget"><h2>Quick Actions</h2><div className="forgeQuick"><button onClick={exportDemo} type="button">⇩<span>Demo JSON</span></button><button onClick={save} type="button">▣<span>Save Local</span></button><button onClick={()=>setSection('Playtest')} type="button">▹<span>2D Preview</span></button><button onClick={()=>setSection('Physics')} type="button">⚛<span>Physics Lab</span></button></div></section>
        <section className="forgePanel forgeWidget"><h2>Studio Metrics</h2><div className="forgeMetrics">{stats.map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>{physics&&<p className="forgeFps">Measured FPS: <b>{physicsStats.fps||'measuring…'}</b> · Fixed simulation: 60 Hz</p>}</section>
        <section className="forgePanel forgeWidget forgeSafety"><h2>World Data Boundary</h2><p>V6 demo format: <code>pixelforge.v6.demo-world.v1</code></p><p>Only the dedicated v6 browser-local key is touched. Existing v5 scenes and protected asset pipelines are preserved.</p></section>
      </aside>
    </div>
    <footer className="forgeFooter"><span>© PHI369 LABS · PIXELFORGE V6 PREVIEW</span><span>LOCAL-FIRST · FUNCTIONAL PHYSICS · WORKSPACE MIGRATION IN PROGRESS</span></footer>
  </div>;
}
