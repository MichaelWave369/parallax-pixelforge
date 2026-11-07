import React,{useRef,useState} from 'react';
import {
  COVER_MAX_BYTES,defaultReleaseExtras,resolveReleaseExtras,
  validateCoverFile,validateReleaseExtras
} from './release-extras.js';
import './release-extras-editor.css';

// Explicit, local-only asset selection. Original files are never uploaded.
export default function ReleaseExtrasEditor({value,onChange}){
  const draft=value??defaultReleaseExtras();
  const picker=useRef(null);
  const [rightsConfirmed,setRightsConfirmed]=useState(false);
  const [message,setMessage]=useState('');
  function edit(patch){onChange({...draft,...patch});}
  async function loadCover(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{
      if(!rightsConfirmed)throw Error('Confirm your right to distribute this artwork.');
      validateCoverFile(file);
      const url=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(Error('Could not read cover file.'));
        reader.readAsDataURL(file);
      });
      const cover={dataUrl:url,alt:draft.cover?.alt||'Cover artwork for this game'};
      const next=validateReleaseExtras({...draft,cover});
      onChange(next);
      setMessage('Cover embedded for offline export; image file stays on your device.');
    }catch(error){setMessage('Cover refused: '+error.message);}
  }
  function changeCredit(index,field,value){
    edit({credits:draft.credits.map((c,i)=>i===index?{...c,[field]:value}:c)});
  }
  function addCredit(){
    if(draft.credits.length>=8)return;
    edit({credits:[...draft.credits,{role:'Contributor',name:'Your name'}]});
  }
  return <div className="pixExtrasEditor">
    <div className="pixExtrasHeader">
      <strong>RUNG 15 · COVER, CREDITS & RIGHTS</strong>
      <span>Offline, standalone release only</span>
    </div>
    <div className="pixExtrasCoverRow">
      {draft.cover?<img src={draft.cover.dataUrl} alt={draft.cover.alt||'Release cover preview'}
        className="pixExtrasCoverPreview"/>:
        <div className="pixExtrasCoverEmpty" aria-hidden="true">◇<span>NO COVER</span></div>}
      <div className="pixExtrasCoverOptions">
        <label className="pixExtrasRights"><input type="checkbox" checked={rightsConfirmed}
          onChange={e=>setRightsConfirmed(e.target.checked)}/>
          I have the right to redistribute the selected cover artwork</label>
        <button type="button" disabled={!rightsConfirmed} onClick={()=>picker.current?.click()}>
          ⇧ Choose Cover Image
        </button>
        {draft.cover&&<button type="button" onClick={()=>edit({cover:null})}>Remove Cover</button>}
        <small>PNG, JPEG or WebP only, maximum {Math.round(COVER_MAX_BYTES/1000)} KB.
          Embedded directly into the exported HTML. SVG and remote URLs are not accepted.</small>
      </div>
    </div>
    <input hidden ref={picker} type="file" accept="image/png,image/jpeg,image/webp" onChange={loadCover}/>
    {draft.cover&&<label className="pixExtrasAltLabel">Cover description (screen readers)
      <input value={draft.cover.alt} maxLength={140}
        onChange={e=>edit({cover:{...draft.cover,alt:e.target.value}})}/>
    </label>}
    <div className="pixExtrasCreditsHead">
      <strong>GAME CREDITS</strong>
      <button type="button" disabled={draft.credits.length>=8} onClick={addCredit}>+ Credit</button>
    </div>
    <div className="pixExtrasCreditsList">
      {draft.credits.length===0&&<p>No custom credits yet. The engine acknowledgements are included automatically.</p>}
      {draft.credits.map((credit,i)=><div key={i} className="pixExtrasCreditRow">
        <label>Role<input value={credit.role} maxLength={38} placeholder="Art, Music, Design…"
          onChange={e=>changeCredit(i,'role',e.target.value)}/></label>
        <label>Name<input value={credit.name} maxLength={90}
          onChange={e=>changeCredit(i,'name',e.target.value)}/></label>
        <button type="button" aria-label={'Remove credit '+(i+1)}
          onClick={()=>edit({credits:draft.credits.filter((_,j)=>j!==i)})}>×</button>
      </div>)}
    </div>
    <label className="pixExtrasNotice">Game content license / redistribution notice
      <textarea maxLength={640} rows={3} value={draft.contentNotice}
        onChange={e=>edit({contentNotice:e.target.value})}/>
    </label>
    <p>Credit music, images and other material only when you have appropriate rights.
      This field describes the creator's game content, not the licenses of the included engine dependencies.</p>
    {message&&<p className="pixExtrasMessage" role="status">{message}</p>}
  </div>;
}
