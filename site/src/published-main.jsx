import React from 'react';
import {createRoot} from 'react-dom/client';
import PublishedGameShell from './PublishedGameShell.jsx';
import {resolveReleaseMetadata} from './release-metadata.js';
import {parsePlayableWorld} from './playable-world.js';

// Deliberately no fetch, router, editor, network imports, accounts, or CDN.
// The only world is parsed from inert, escaped JSON embedded by the publisher.
const mount=document.getElementById('root');
const source=document.getElementById('pixelforge-embedded-world');
if(!mount||!source){
  throw Error('Published PixelForge world data or player mount is missing.');
}
try{
  const world=parsePlayableWorld(source.textContent);
  const releaseNode=document.getElementById('pixelforge-embedded-release');
  // Older Rung 13 releases without a release block still have safe defaults.
  const release=resolveReleaseMetadata(releaseNode?JSON.parse(releaseNode.textContent):null,world.title);
  document.title=release.title+' | PixelForge';
  createRoot(mount).render(<PublishedGameShell world={world} release={release}/>);
}catch(error){
  mount.textContent='World could not be opened: '+(error?.message||String(error));
}
