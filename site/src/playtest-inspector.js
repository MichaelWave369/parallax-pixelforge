// Rung 12: ephemeral, consent-based comparison of world-bound Ghost Run files.
// No analytics transmission, persistent identity, or game authority. Input is
// validated using the existing Rung 11 ghost contract before every comparison.
import {analyzeGhostRun,validateGhostRun} from './ghost-run.js';

export const INSPECTOR_MAX_RUNS=4;
export const INSPECTOR_REPORT_FORMAT='pixelforge.playtest-report.v1';
const GRID_METERS=2,MAX_SHARED_CELLS=8;
const round=n=>Math.round(n*10)/10;
function validRuns(runs,digest){
  if(!Array.isArray(runs)||runs.length>INSPECTOR_MAX_RUNS)
    throw Error('Inspector supports up to four recordings.');
  const validated=runs.map(run=>validateGhostRun(run,digest));
  const keys=new Set();
  for(const run of validated){
    const key=JSON.stringify(run.samples);
    if(keys.has(key))throw Error('Duplicate ghost routes are not independent playtests.');
    keys.add(key);
  }
  return validated;
}
export function insertInspectorRun(runs,newRun,digest){
  const items=validRuns(runs,digest);
  return validRuns([...items,newRun],digest);
}
export function inspectorCells(run){
  const cells=new Map();
  const samples=run.samples;
  for(let i=0;i<samples.length-1;i++){
    const a=samples[i],b=samples[i+1],ms=b.t-a.t;
    const x=Math.floor(a.position[0]/GRID_METERS),z=Math.floor(a.position[2]/GRID_METERS);
    const key=x+','+z;
    cells.set(key,(cells.get(key)||0)+ms);
  }
  return cells;
}
export function routeBounds(runs,digest){
  const items=validRuns(runs,digest);
  if(!items.length)return {minX:-8,maxX:8,minZ:-8,maxZ:8};
  let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
  for(const run of items)for(const {position:p} of run.samples){
    minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);
    minZ=Math.min(minZ,p[2]);maxZ=Math.max(maxZ,p[2]);
  }
  // Guarantee 2m of room for stationary/straight-line paths.
  const midX=(minX+maxX)/2,midZ=(minZ+maxZ)/2;
  const spanX=Math.max(maxX-minX,2),spanZ=Math.max(maxZ-minZ,2);
  return {minX:midX-spanX/2-1,maxX:midX+spanX/2+1,
    minZ:midZ-spanZ/2-1,maxZ:midZ+spanZ/2+1};
}
export function routeMapPoints(run,bounds,width=460,height=240){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
    throw Error('Invalid route preview dimensions.');
  const samples=run.samples;
  if(!Array.isArray(samples)||samples.length<2)throw Error('Ghost route needs samples.');
  const sx=width/(bounds.maxX-bounds.minX),sz=height/(bounds.maxZ-bounds.minZ);
  if(!Number.isFinite(sx)||!Number.isFinite(sz)||sx<=0||sz<=0)
    throw Error('Invalid route preview bounds.');
  // Bounded SVG polyline, preserving first/last sample.
  const stride=Math.max(1,Math.ceil((samples.length-1)/398));
  const point=s=>({
    x:round((s.position[0]-bounds.minX)*sx),
    y:round(height-(s.position[2]-bounds.minZ)*sz)
  });
  const list=[];
  for(let i=0;i<samples.length;i+=stride)list.push(point(samples[i]));
  if((samples.length-1)%stride!==0)list.push(point(samples.at(-1)));
  return list;
}
export function compareGhostRuns(runs,digest){
  const items=validRuns(runs,digest),metrics=items.map((run,i)=>({
    index:i,label:'Run '+(i+1),...analyzeGhostRun(run)
  }));
  const cellSummary=new Map();
  for(const run of items){
    for(const [key,ms] of inspectorCells(run)){
      const current=cellSummary.get(key)||{visits:0,totalMs:0,perRunMs:[]};
      current.visits++;current.totalMs+=ms;current.perRunMs.push(ms);
      cellSummary.set(key,current);
    }
  }
  const sharedCells=[...cellSummary].filter(([,cell])=>cell.visits>=2)
    .map(([key,cell])=>{
      const [x,z]=key.split(',').map(Number);
      return {x:x*GRID_METERS+GRID_METERS/2,
        z:z*GRID_METERS+GRID_METERS/2,
        runCount:cell.visits,totalSeconds:round(cell.totalMs/1000),
        meanSecondsPerVisitingRun:round(cell.totalMs/1000/cell.visits)};
    })
    .sort((a,b)=>b.runCount-a.runCount||b.totalSeconds-a.totalSeconds||a.x-b.x||a.z-b.z)
    .slice(0,MAX_SHARED_CELLS);
  const bestDuration=metrics.length?Math.min(...metrics.map(r=>r.durationSeconds)):null;
  const meanDuration=metrics.length?round(metrics.reduce((sum,r)=>sum+r.durationSeconds,0)/metrics.length):null;
  const meanDistance=metrics.length?round(metrics.reduce((sum,r)=>sum+r.distanceMeters,0)/metrics.length):null;
  return {runCount:items.length,metrics,sharedCells,bestDuration,meanDuration,meanDistance,
    bounds:routeBounds(items,digest)};
}
export function createPlaytestReport(runs,digest,generatedAt=Date.now()){
  if(!Number.isSafeInteger(generatedAt)||generatedAt<0)
    throw Error('Invalid report timestamp.');
  const comparison=compareGhostRuns(runs,digest);
  if(!comparison.runCount)throw Error('Import a ghost recording before exporting a report.');
  // Intentionally summary-only: no raw path coordinate arrays in report.
  return {
    format:INSPECTOR_REPORT_FORMAT,world_sha256:digest,
    generated_at:generatedAt,run_count:comparison.runCount,
    metrics:comparison.metrics.map(({label,samples,durationSeconds,distanceMeters,
      averageSpeed,movingSeconds,jumps})=>({
        label,samples,durationSeconds,distanceMeters,averageSpeed,movingSeconds,jumps
      })),
    shared_cells:comparison.sharedCells,
    notes:[
      'User-imported, unsupervised paths; no identity or playtest validity claims.',
      'Shared cells indicate overlapping sampled time, not proven difficulty.',
      'Metrics and jump counts are approximate; imported paths may be hand-authored.'
    ]
  };
}
