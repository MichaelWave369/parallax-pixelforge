import React from 'react';
import {defaultReleaseMetadata} from './release-metadata.js';
import './release-editor.css';

// Creator-facing metadata is separate from the authoritative playable world.
// Edits stay in this editor session until explicitly packaged into HTML.
export default function ReleaseMetadataEditor({value,onChange,worldTitle}){
  const draft=value??defaultReleaseMetadata(worldTitle);
  const edit=(key,next)=>onChange({...draft,[key]:next});
  return <div className="pixReleaseEditor" aria-label="Offline release identity editor">
    <div className="pixReleaseEditorHeader">
      <span>RUNG 14 · PUBLISHED GAME IDENTITY</span>
      <strong>Release metadata only · Original world unchanged</strong>
    </div>
    <div className="pixReleaseFields">
      <label>Game title
        <input type="text" maxLength={100} value={draft.title}
          onChange={e=>edit('title',e.target.value)} placeholder="Name your adventure"/>
      </label>
      <label>Tagline
        <input type="text" maxLength={160} value={draft.tagline}
          onChange={e=>edit('tagline',e.target.value)} placeholder="A world worth exploring"/>
      </label>
      <label>Creator / studio
        <input type="text" maxLength={80} value={draft.creator}
          onChange={e=>edit('creator',e.target.value)} placeholder="Your studio name"/>
      </label>
      <label>Release version
        <input type="text" maxLength={20} value={draft.version}
          onChange={e=>edit('version',e.target.value)} placeholder="1.0.0"/>
      </label>
      <label>Accent color
        <input type="color" value={/^#[a-fA-F0-9]{6}$/.test(draft.accent)?draft.accent:'#70ecdb'}
          onChange={e=>edit('accent',e.target.value)} aria-label="Release accent color"/>
      </label>
    </div>
    <p>Shown on the downloaded game's title screen. Metadata is presentation-only;
      it cannot inject scripts, remote assets or change quest rules. Use version numbers such as 1.0.0 or 1.1.0-beta.</p>
  </div>;
}
