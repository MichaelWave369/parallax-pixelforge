import React from 'react';
import {createRoot} from 'react-dom/client';
import WorldPlayer from './WorldPlayer.jsx';
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
  createRoot(mount).render(<WorldPlayer initialWorld={world} standalone/>);
}catch(error){
  mount.textContent='World could not be opened: '+(error?.message||String(error));
}
