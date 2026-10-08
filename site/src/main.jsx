import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const BASE = import.meta.env.BASE_URL;
const studioModules = [
  {id:'studio',eyebrow:'01 / PIXEL & GAME DESIGN',title:'Creator Studio',description:'Sprite work, tile maps, runtime composition, project editing and cartridge export in the original PixelForge workbench.',path:'studio/',cta:'Launch Creator Studio',glyph:'▦',accent:'coral',tags:['2D','Sprite Studio','Tile Composer','Local saves']},
  {id:'vr',eyebrow:'02 / SPATIAL CREATION',title:'VR World Studio',description:'Build and edit a 3D scene with bounded objects, transform controls, scene export and experimental WebXR preview.',path:'vr-studio/',cta:'Enter VR Studio',glyph:'⬡',accent:'mint',tags:['WebGL2','WebXR preview','Scene graph','Experimental']},
  {id:'assets',eyebrow:'03 / ASSET PIPELINE',title:'3D Asset Inspector',description:'Inspect supported GLB meshes in the native WebGL2 viewport. Visual parity, rights and runtime compatibility are not automatically approved.',path:'external-preview/',cta:'Open GLB Inspector',glyph:'◇',accent:'violet',tags:['GLB','Unreal exports','Local file','Static preview']}
];
const links = [
  {title:'PhiCade',description:'Governed game runtime and agent-controller research',href:'https://github.com/MichaelWave369/PhiCade',tag:'CONNECTED PROJECT'},
  {title:'PixelForge source',description:'Open-source creator tools, examples and issue tracker',href:'https://github.com/MichaelWave369/parallax-pixelforge',tag:'REPOSITORY'},
  {title:'VR Studio build notes',description:'Current limitations, test plan and hardware qualification',href:'https://github.com/MichaelWave369/parallax-pixelforge/blob/main/docs/V5_35_VR_WORLD_FOUNDATION.md',tag:'DOCUMENTATION'}
];

function readSavedState() {
  try {
    const legacy = localStorage.getItem('parallax.pixelforge.v5.0.project');
    const vr = localStorage.getItem('pixelforge.vr-world.v1.local');
    return {
      studio: !!legacy,
      vr: !!vr,
      vrTitle: vr ? JSON.parse(vr).title : null
    };
  } catch { return {studio:false,vr:false,vrTitle:null}; }
}
function App() {
  const [search,setSearch]=useState('');
  const [saved,setSaved]=useState(readSavedState);
  const [features,setFeatures]=useState({gl:'checking',xr:'checking'});
  const searchRef=useRef(null);
  useEffect(()=>{
    const onFocus=()=>setSaved(readSavedState());
    const onKey=e=>{
      if(e.key==='/' && !/input|textarea/i.test(document.activeElement?.tagName||'')){
        e.preventDefault();searchRef.current?.focus();
      }
    };
    window.addEventListener('focus',onFocus);
    window.addEventListener('keydown',onKey);
    let cancelled=false;
    const gl=(()=>{try{ return !!document.createElement('canvas').getContext('webgl2'); }catch{return false;}})();
    setFeatures({gl:gl?'available':'unavailable',xr:'checking'});
    (async()=>{
      let xr='unavailable';
      try{if(navigator.xr && await navigator.xr.isSessionSupported('immersive-vr')) xr='available';}
      catch{xr='unavailable';}
      if(!cancelled)setFeatures({gl:gl?'available':'unavailable',xr});
    })();
    return()=>{cancelled=true;window.removeEventListener('focus',onFocus);window.removeEventListener('keydown',onKey);};
  },[]);
  const filtered=useMemo(()=>studioModules.filter(m=>[m.title,m.description,...m.tags].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[search]);
  return (
    <div className="app">
      <header className="siteHeader">
        <a className="brand" href={BASE} aria-label="PixelForge home"><span className="brandMark">✣</span><span>PARALLAX <b>PIXELFORGE</b><small>CREATOR OPERATING SYSTEM</small></span></a>
        <nav className="nav" aria-label="Main"><a href="#workspaces">Workspaces</a><a href="#ecosystem">Ecosystem</a><a href="https://github.com/MichaelWave369/parallax-pixelforge" target="_blank" rel="noopener noreferrer">GitHub ↗</a></nav>
      </header>

      <main>
        <section className="hero">
          <div className="heroCopy">
            <div className="tinyLabel"><span className="pulse"></span> ENTER THE FIELD / PIXELFORGE ONLINE</div>
            <h1>Build worlds.<br/><em>Make them real.</em></h1>
            <p className="lede">From a single pixel to a playable world to an immersive 3D scene. One creative home for human makers and governed agent workflows.</p>
            <div className="heroActions">
              <a className="button bright" href={BASE+'studio/'}>Open PixelForge Studio <span>↗</span></a>
              <a className="button outline" href={BASE+'vr-studio/'}>Explore VR Studio <span>⬡</span></a>
            </div>
            <div className="heroFoot"><span>LOCAL-FIRST TOOLS</span><span>●</span><span>OPEN WORKFLOWS</span><span>●</span><span>BUILD IN PUBLIC</span></div>
          </div>
          <div className="showcase" aria-label="Illustrative PixelForge world tile composition">
            <div className="showcaseHeading"><span>WORLD VIEW / FIELD-369</span><span className="livePill">PREVIEW VISUAL</span></div>
            <div className="isoWorld" aria-hidden="true">
              <div className="gridPlane"></div>
              <div className="sunOrb"></div>
              <div className="worldCube cubeOne"><span></span></div>
              <div className="worldCube cubeTwo"><span></span></div>
              <div className="worldCube cubeThree"><span></span></div>
              <div className="ring ringOne"></div><div className="ring ringTwo"></div>
            </div>
            <div className="hud"><div><span>MODE</span><strong>CREATE</strong></div><div><span>DIMENSION</span><strong>2D / 3D / XR</strong></div><div><span>ENGINE</span><strong>PIXELFORGE</strong></div></div>
          </div>
        </section>

        <section id="workspaces" className="workspaces">
          <div className="sectionHead"><div><p className="kicker">YOUR CREATIVE COMMAND CENTER</p><h2>Choose your workspace.</h2></div><label className="search"><span aria-hidden="true">⌕</span><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} aria-label="Filter workspaces" placeholder="Find a tool  /" type="search"/></label></div>
          <div className="moduleGrid">
            {filtered.map(m=><article className={'module '+m.accent} key={m.id}>
              <div className="moduleTop"><span>{m.eyebrow}</span><span className="moduleGlyph">{m.glyph}</span></div>
              <div className="moduleArtwork"><span className="artSymbol">{m.glyph}</span><span className="artCross">+ + +</span></div>
              <div className="moduleBody"><h3>{m.title}</h3><p>{m.description}</p>
                <div className="chips">{m.tags.map(t=><span key={t}>{t}</span>)}</div>
                {saved[m.id] && <p className="saved">● Browser-local project found{m.id==='vr' && saved.vrTitle ? ': '+saved.vrTitle : ''}</p>}
                <a className="moduleCta" href={BASE+m.path}>{m.cta}<span aria-hidden="true">↗</span></a>
              </div>
            </article>)}
            {!filtered.length && <div className="noMatch">No matching tools. Clear your search to see the studios.</div>}
          </div>
        </section>

        <section id="ecosystem" className="lower">
          <div className="infoPanel"><p className="kicker">RUNTIME NOTES</p><h2>Your browser, your workshop.</h2>
            <div className="healthRows">
              <div><span>WebGL2 rendering</span><strong className={features.gl==='available'?'good':'muted'}>{features.gl.toUpperCase()}</strong></div>
              <div><span>Immersive WebXR</span><strong className={features.xr==='available'?'good':'muted'}>{features.xr.toUpperCase()}</strong></div>
              <div><span>Local Unreal asset vault</span><strong className="muted">NOT HOSTED</strong></div>
            </div>
            <p className="note">Browser-local scenes and files remain under your control. GitHub Pages cannot run the local Ollama provider, desktop bridges, Python exports, or privileged asset access. Experimental XR still requires a compatible headset and validation.</p>
          </div>
          <div className="infoPanel"><p className="kicker">BEYOND THE STUDIO</p><h2>Connected field.</h2>
            <div className="linkList">{links.map(l=><a href={l.href} target="_blank" rel="noopener noreferrer" key={l.title}><span><b>{l.title}</b><small>{l.description}</small></span><span className="linkRight">{l.tag} ↗</span></a>)}</div>
          </div>
        </section>
      </main>
      <footer><span>PIXELFORGE / PHI369 LABS</span><span>CAPABILITY ≠ AUTHORITY · LOCAL FIRST · <a href="https://github.com/MichaelWave369/parallax-pixelforge">SOURCE ↗</a></span></footer>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App/>);
