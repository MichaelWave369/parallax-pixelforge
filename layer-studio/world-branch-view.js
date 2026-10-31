// PixelForge Rung 14 / World Branch Map SVG view.
// Safely paints only authored text nodes and lines. No innerHTML, remote links,
// script execution or changes to the underlying Room Atlas.
import {analyzeWorldBranches} from './world-branch-map.js';

const NS='http://www.w3.org/2000/svg';
const columns=[
  {kind:'source',title:'AUTHORED EVENTS',x:20,w:255},
  {kind:'flag',title:'WORLD FLAGS',x:308,w:245},
  {kind:'track',title:'DISCOVERIES',x:586,w:255},
  {kind:'gate',title:'GATES & QUESTS',x:874,w:255}
];
const svgEl=(tag,attrs={},label)=>{
  const el=document.createElementNS(NS,tag);
  for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
  if(label!=null)el.textContent=String(label);
  return el;
};
const short=(s,max=30)=>{
  const value=String(s||'');
  return value.length<=max?value:value.slice(0,max-1)+'…';
};
export function selectBranchNodes(graph,roomId=''){
  if(!roomId)return graph.nodes;
  const selected=new Set(graph.nodes.filter(n=>n.roomId===roomId).map(n=>n.id));
  // Show all directly referenced flags and any producers of those flags,
  // even when they belong to another room.
  for(const e of graph.edges){
    if(selected.has(e.from)&&e.to.startsWith('flag:'))selected.add(e.to);
    if(selected.has(e.to)&&e.from.startsWith('flag:'))selected.add(e.from);
  }
  for(const e of graph.edges){
    if(selected.has(e.to)&&e.to.startsWith('flag:')&&
      ['grant','choice'].includes(e.kind))selected.add(e.from);
  }
  return graph.nodes.filter(n=>selected.has(n.id));
}
export function renderWorldBranchMap(svg,atlas,{
  roomId='',selectedId='',onSelect=()=>{},graph=null,simulator=null
}={}){
  const report=graph||analyzeWorldBranches(atlas);
  const all=selectBranchNodes(report,roomId);
  const maxNodes=180;
  const visible=all.slice(0,maxNodes);
  const nodeIds=new Set(visible.map(n=>n.id));
  const edges=report.edges.filter(e=>nodeIds.has(e.from)&&nodeIds.has(e.to));
  const coords=new Map(),groups=columns.map(col=>({
    ...col,nodes:visible.filter(n=>n.kind===col.kind)
      .sort((a,b)=>(a.roomId||'').localeCompare(b.roomId||'')||
        a.label.localeCompare(b.label))
  }));
  const height=Math.max(325,85+Math.max(...groups.map(g=>g.nodes.length))*74);
  svg.replaceChildren();
  svg.setAttribute('viewBox','0 0 1150 '+height);
  svg.setAttribute('width','1150');
  svg.setAttribute('height',String(height));
  svg.setAttribute('role','group');
  svg.setAttribute('aria-label','World Branch Map: authored events, flags, discoveries and gates');
  const defs=svgEl('defs');
  const marker=svgEl('marker',{id:'branch-map-arrow',viewBox:'0 0 10 10',
    refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});
  marker.append(svgEl('path',{d:'M 0 0 L 10 5 L 0 10 Z',class:'branch-map-arrow'}));
  defs.append(marker);svg.append(defs);
  for(const group of groups){
    svg.append(svgEl('text',{x:group.x+4,y:32,class:'branch-map-column'},group.title));
    svg.append(svgEl('line',{x1:group.x,y1:45,x2:group.x+group.w,y2:45,
      class:'branch-map-divider'}));
    group.nodes.forEach((n,i)=>{
      coords.set(n.id,{x:group.x,y:61+i*74,w:group.w,h:62});
    });
  }
  const edgeLayer=svgEl('g',{class:'branch-map-edges'});
  for(const e of edges){
    const from=coords.get(e.from),to=coords.get(e.to);
    if(!from||!to)continue;
    const goingBack=from.x>=to.x;
    const x1=from.x+from.w,y1=from.y+from.h/2;
    const x2=to.x,y2=to.y+to.h/2;
    const dx=Math.max(64,Math.abs(x2-x1)*.52);
    const path=svgEl('path',{d:'M '+x1+' '+y1+' C '+
      (x1+dx)+' '+y1+', '+(x2-dx)+' '+y2+', '+x2+' '+y2,
      class:'branch-map-edge branch-map-edge--'+e.kind+
        (goingBack?' branch-map-back-edge':'')+
        (selectedId&&e.from!==selectedId&&e.to!==selectedId?' branch-map-muted':''),
      'marker-end':'url(#branch-map-arrow)',
      'data-from':e.from,'data-to':e.to
    });
    const t=svgEl('title',{},e.kind.toUpperCase()+
      (e.label?' / '+e.label:'')+': '+e.from+' → '+e.to);
    path.append(t);edgeLayer.append(path);
  }
  svg.append(edgeLayer);
  const simFlags=new Set(simulator?.flags||[]);
  const simReady=new Set(simulator?.readyTracks||[]);
  const simFinished=new Set(simulator?.completedTracks||[]);
  for(const n of visible){
    const p=coords.get(n.id);
    const linked=selectedId&&edges.some(e=>
      (e.from===selectedId&&e.to===n.id)||
      (e.to===selectedId&&e.from===n.id));
    const selected=n.id===selectedId;
    const group=svgEl('g',{
      class:'branch-map-node branch-map-node--'+n.kind+
        (n.reachable===false?' branch-map-node--unreachable':'')+
        (selected?' branch-map-node--selected':'')+
        (linked?' branch-map-node--linked':'')+
        (n.kind==='flag'&&simFlags.has(n.label)?' branch-map-node--sim-earned':'')+
        (n.kind==='track'&&simReady.has(n.id)?' branch-map-node--sim-ready':'')+
        (n.kind==='track'&&simFinished.has(n.id)?' branch-map-node--sim-finished':'')+
        (n.roomId===simulator?.roomId?' branch-map-node--sim-current':'')+
        (selectedId&&!selected&&!linked?' branch-map-muted':''),
      role:'button',tabindex:0,'data-node-id':n.id,
      'aria-label':n.kind+': '+n.label+
        (n.reachable===false?'. No known optimistic route':'')+
        (n.kind==='flag'&&simFlags.has(n.label)?'. Earned in simulated run':'')+
        (simFinished.has(n.id)?'. Completed in simulated run':'')+
        (simReady.has(n.id)?'. Available now in simulated run':'')
    });
    group.append(svgEl('rect',{x:p.x,y:p.y,width:p.w,height:p.h,rx:7}));
    group.append(svgEl('text',{x:p.x+12,y:p.y+25,class:'branch-map-node-title'},
      short(n.label,n.kind==='flag'?31:30)));
    group.append(svgEl('text',{x:p.x+12,y:p.y+44,class:'branch-map-node-detail'},
      short(n.detail||n.roomId||n.kind,35)));
    group.append(svgEl('title',{},n.label+' / '+(n.detail||n.kind)));
    group.addEventListener('click',()=>onSelect(n));
    group.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(n)}
    });
    svg.append(group);
  }
  if(!visible.length){
    svg.append(svgEl('text',{x:30,y:100,class:'branch-map-empty'},
      'No authored world branches to display. Create a Room Atlas discovery first.'));
  }
  if(all.length>maxNodes){
    svg.append(svgEl('text',{x:25,y:height-15,class:'branch-map-truncated'},
      'Showing first '+maxNodes+' nodes. Use a room filter to inspect the rest.'));
  }
  return {report,visibleNodes:visible.length,visibleEdges:edges.length,
    truncated:Math.max(0,all.length-maxNodes)};
}
