import React,{useMemo,useState} from 'react';
import {validateMetroidvaniaContent,analyzeMetroidvaniaCharacter,ITEM_TYPES,MOVEMENT_STYLES,SECRET_TYPES,SYNERGY_EFFECTS,MOODS,CONTENT_LIMITS} from './metroidvania-content.js';
import './metroidvania-creative.css';

function slug(text){return (text.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'new-creation');}
function nextId(name,entries){const existing=new Set(entries.map(item=>item.id));const base=slug(name);let id=base,n=2;while(existing.has(id))id=(base.slice(0,40)+'-'+n++).slice(0,48);return id;}
const nice=text=>text.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());

export default function MetroidvaniaCreativeLab({world,content,onChange,selectedCharacter,onSelectCharacter,selectedRoom,onStatus}){
  const [characterName,setCharacterName]=useState('');
  const [itemName,setItemName]=useState('');
  const [itemType,setItemType]=useState('weapon');
  const [secretName,setSecretName]=useState('');
  const [secretType,setSecretType]=useState('breakable-wall');
  const [secretGate,setSecretGate]=useState('');
  const [quietName,setQuietName]=useState('');
  const [quietMood,setQuietMood]=useState('haunting');
  const [synergyName,setSynergyName]=useState('');
  const [pairA,setPairA]=useState('');
  const [pairB,setPairB]=useState('');
  const [synergyEffect,setSynergyEffect]=useState('guard-pulse');
  const character=content.characters.find(c=>c.id===selectedCharacter)||content.characters[0];
  const build=useMemo(()=>character?analyzeMetroidvaniaCharacter(world,content,character.id):null,[world,content,character?.id]);
  const roomName=id=>world.rooms.find(r=>r.id===id)?.name||id;

  function edit(update,message){
    try{
      const draft=JSON.parse(JSON.stringify(content));
      update(draft);
      const validated=validateMetroidvaniaContent(draft,world);
      onChange(validated);onStatus(message);
      return true;
    }catch(error){onStatus(error.message||'Invalid design change.');return false;}
  }
  function addCharacter(e){
    e.preventDefault();const name=characterName.trim();if(!name)return onStatus('Enter a character name.');
    const id=nextId(name,content.characters);
    if(edit(c=>c.characters.push({id,name,movement:'balanced',startingAbilities:[],equipment:[]}),name+' created.')){
      onSelectCharacter(id);setCharacterName('');
    }
  }
  function addItem(e){
    e.preventDefault();const name=itemName.trim();if(!name)return onStatus('Enter an item name.');
    if(edit(c=>c.items.push({id:nextId(name,c.items),name,type:itemType}),name+' added to item catalog.'))setItemName('');
  }
  function addSecret(e){
    e.preventDefault();const name=secretName.trim();if(!name)return onStatus('Enter a secret name.');
    if(edit(c=>c.secrets.push({id:nextId(name,c.secrets),name,roomId:selectedRoom,
      type:secretType,requires:secretGate?[secretGate]:[]}),name+' hidden in '+roomName(selectedRoom)+'.'))setSecretName('');
  }
  function addSynergy(e){
    e.preventDefault();const name=synergyName.trim();
    const a=content.items.some(item=>item.id===pairA)?pairA:content.items[0]?.id;
    const b=content.items.some(item=>item.id===pairB)?pairB:content.items[1]?.id;
    if(!name||!a||!b||a===b)return onStatus('Choose a name and two different items.');
    if(edit(c=>c.synergies.push({id:nextId(name,c.synergies),name,itemA:a,itemB:b,effect:synergyEffect}),name+' synergy added.'))setSynergyName('');
  }
  function addQuiet(e){
    e.preventDefault();const name=quietName.trim();if(!name)return onStatus('Enter an atmosphere spot name.');
    if(edit(c=>c.quietSpaces.push({roomId:selectedRoom,name,mood:quietMood,note:'A quiet place to stop and listen.'}),name+' atmosphere spot added.'))setQuietName('');
  }
  return <section className="mvCreative" aria-label="Character creator, secrets and equipment synergies">
    <div className="mvCreativeHeading"><h2>Character Creator & Castle Secrets</h2><p>Design alternate playable characters, secret walls and two-item combinations. Movement styles and the five listed synergies now affect the 2.5D prototype; listening spots and other secret types remain design-only.</p></div>
    <div className="mvCreativeGrid">
      <article className="mvCreativeCard">
        <div className="mvCreativeTitle"><h3>Playable characters</h3><small>{content.characters.length}/{CONTENT_LIMITS.characters}</small></div>
        {character&&<>
          <label>Test character<select value={character.id} onChange={e=>onSelectCharacter(e.target.value)}>
            {content.characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
          <label>Name<input key={character.id} defaultValue={character.name} maxLength={70}
            onBlur={e=>{if(e.target.value.trim()!==character.name)edit(c=>{c.characters.find(x=>x.id===character.id).name=e.target.value;},'Character renamed.');}}/></label>
          <label>Movement style<select value={character.movement}
            onChange={e=>edit(c=>{c.characters.find(x=>x.id===character.id).movement=e.target.value;},'Movement style updated.')}>
            {MOVEMENT_STYLES.map(m=><option key={m} value={m}>{nice(m)}</option>)}
          </select></label>
          <fieldset><legend>Abilities at game start</legend>
            {world.abilities.map(a=><label key={a.id} className="mvCreativeCheck">
              <input type="checkbox" checked={character.startingAbilities.includes(a.id)}
                onChange={e=>edit(c=>{const p=c.characters.find(x=>x.id===character.id);p.startingAbilities=e.target.checked?[...p.startingAbilities,a.id]:p.startingAbilities.filter(id=>id!==a.id);},'Starting ability updated.')}/>
              {a.name}</label>)}
          </fieldset>
          <fieldset><legend>Starting equipment (max 2)</legend>
            {content.items.map(item=><label key={item.id} className="mvCreativeCheck">
              <input type="checkbox" checked={character.equipment.includes(item.id)}
                disabled={!character.equipment.includes(item.id)&&character.equipment.length>=2}
                onChange={e=>edit(c=>{const p=c.characters.find(x=>x.id===character.id);p.equipment=e.target.checked?[...p.equipment,item.id]:p.equipment.filter(id=>id!==item.id);},'Character equipment updated.')}/>
              {item.name} <small>({item.type})</small></label>)}
          </fieldset>
          {build&&<div className="mvCreativeReadout">
            <strong>{build.progression.reachable.length}/{world.rooms.length} rooms accessible</strong>
            <p>{build.discoverableSecrets.length} discoverable secrets · {build.activeSynergies.length} active synergies · {build.quietSpaces.length} accessible listening spots</p>
            {build.activeSynergies.length>0&&<p>Active: {build.activeSynergies.map(id=>content.synergies.find(s=>s.id===id)?.name).join(', ')}</p>}
          </div>}
          <button type="button" className="mvCreativeRemove" disabled={content.characters.length===1}
            onClick={()=>{const next=content.characters.find(c=>c.id!==character.id);if(edit(c=>{c.characters=c.characters.filter(x=>x.id!==character.id);},'Character removed.'))onSelectCharacter(next.id);}}>
            Remove selected character
          </button>
        </>}
        <form onSubmit={addCharacter}><h4>Create another playable character</h4>
          <label>Name<input value={characterName} onChange={e=>setCharacterName(e.target.value)} maxLength={70} placeholder="The Night Scholar"/></label>
          <button disabled={content.characters.length>=CONTENT_LIMITS.characters}>+ Create character</button>
        </form>
      </article>
      <article className="mvCreativeCard">
        <div className="mvCreativeTitle"><h3>Hidden discoveries</h3><small>{content.secrets.length}/{CONTENT_LIMITS.secrets}</small></div>
        <p>Current room: <strong>{roomName(selectedRoom)}</strong>. Choose a room on the world atlas to place its secrets.</p>
        <div className="mvCreativeEntries">
          {content.secrets.map(secret=><div key={secret.id}><div>
            <strong>{secret.name}</strong><small>{roomName(secret.roomId)} · {nice(secret.type)}</small>
            <small>{secret.requires.length?'Needs '+secret.requires.map(id=>world.abilities.find(a=>a.id===id)?.name).join(', '):'No ability required'}</small>
          </div><button type="button" onClick={()=>edit(c=>{c.secrets=c.secrets.filter(s=>s.id!==secret.id);},'Secret removed.')}>Remove</button></div>)}
          {!content.secrets.length&&<p>No hidden discoveries authored.</p>}
        </div>
        <form onSubmit={addSecret}><h4>Add a secret to the selected room</h4>
          <label>Name<input value={secretName} onChange={e=>setSecretName(e.target.value)} maxLength={70} placeholder="Cracked Chapel Wall"/></label>
          <label>Secret type<select value={secretType} onChange={e=>setSecretType(e.target.value)}>{SECRET_TYPES.map(t=><option key={t} value={t}>{nice(t)}</option>)}</select></label>
          <label>Required ability<select value={secretGate} onChange={e=>setSecretGate(e.target.value)}>
            <option value="">None</option>{world.abilities.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <button disabled={content.secrets.length>=CONTENT_LIMITS.secrets}>+ Add secret</button>
        </form>
      </article>
      <article className="mvCreativeCard">
        <div className="mvCreativeTitle"><h3>Equipment combinations</h3><small>{content.synergies.length} combinations</small></div>
        <p>Two equipped items activate their authored effect in the 2.5D chain-combat prototype. One equipment pair can be active at a time; effects use a fixed, tested vocabulary.</p>
        <div className="mvCreativeEntries">
          {content.synergies.map(s=><div key={s.id}><div><strong>{s.name}</strong>
            <small>{content.items.find(i=>i.id===s.itemA)?.name} + {content.items.find(i=>i.id===s.itemB)?.name}</small>
            <small>Design effect: {nice(s.effect)}</small>
          </div><button type="button" onClick={()=>edit(c=>{c.synergies=c.synergies.filter(x=>x.id!==s.id);},'Synergy removed.')}>Remove</button></div>)}
        </div>
        <form onSubmit={addItem}><h4>Add equipment</h4>
          <label>Name<input value={itemName} maxLength={70} onChange={e=>setItemName(e.target.value)} placeholder="Lantern Shield"/></label>
          <label>Type<select value={itemType} onChange={e=>setItemType(e.target.value)}>
            {ITEM_TYPES.map(t=><option key={t} value={t}>{nice(t)}</option>)}</select></label>
          <button disabled={content.items.length>=CONTENT_LIMITS.items}>+ Add item</button>
        </form>
        <form onSubmit={addSynergy}><h4>Create two-item synergy</h4>
          <label>Name<input value={synergyName} maxLength={80} onChange={e=>setSynergyName(e.target.value)} placeholder="Moonlit Resonance"/></label>
          <label>Item A<select value={content.items.some(i=>i.id===pairA)?pairA:content.items[0]?.id||''} onChange={e=>setPairA(e.target.value)}>
            {content.items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
          <label>Item B<select value={content.items.some(i=>i.id===pairB)?pairB:content.items[1]?.id||''} onChange={e=>setPairB(e.target.value)}>
            {content.items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
          <label>Effect<select value={synergyEffect} onChange={e=>setSynergyEffect(e.target.value)}>
            {SYNERGY_EFFECTS.map(t=><option key={t} value={t}>{nice(t)}</option>)}</select></label>
          <button disabled={content.synergies.length>=CONTENT_LIMITS.synergies||content.items.length<2}>+ Create synergy</button>
        </form>
      </article>
      <article className="mvCreativeCard">
        <div className="mvCreativeTitle"><h3>Atmosphere & listening spots</h3><small>{content.quietSpaces.length}/{CONTENT_LIMITS.quietSpaces}</small></div>
        <p>The places where the player can put the controller down and just enjoy the world. No forced encounter or timed objective is implied.</p>
        <div className="mvCreativeEntries">
          {content.quietSpaces.map(q=><div key={q.roomId}><div>
            <strong>{q.name}</strong><small>{roomName(q.roomId)} · {nice(q.mood)}</small>
            <small>{q.note}</small>
          </div><button type="button" onClick={()=>edit(c=>{c.quietSpaces=c.quietSpaces.filter(x=>x.roomId!==q.roomId);},'Listening spot removed.')}>Remove</button></div>)}
        </div>
        <form onSubmit={addQuiet}><h4>Add a listening spot to {roomName(selectedRoom)}</h4>
          <label>Name<input value={quietName} onChange={e=>setQuietName(e.target.value)} maxLength={80} placeholder="Moonlit Balcony"/></label>
          <label>Atmospheric mood<select value={quietMood} onChange={e=>setQuietMood(e.target.value)}>
            {MOODS.map(m=><option value={m} key={m}>{nice(m)}</option>)}</select></label>
          <button disabled={content.quietSpaces.length>=CONTENT_LIMITS.quietSpaces||content.quietSpaces.some(q=>q.roomId===selectedRoom)}>+ Add listening spot</button>
          {content.quietSpaces.some(q=>q.roomId===selectedRoom)&&<small>This room already has an atmosphere spot.</small>}
        </form>
      </article>
    </div>
  </section>;
}
