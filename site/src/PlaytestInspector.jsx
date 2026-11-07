import React,{useMemo,useRef,useState} from 'react';
import {downloadJson} from './forge-world.js';
import {GHOST_MAX_BYTES,parseGhostRun} from './ghost-run.js';
import {
  INSPECTOR_MAX_RUNS,compareGhostRuns,createPlaytestReport,
  insertInspectorRun,routeMapPoints
} from './playtest-inspector.js';
import './playtest-inspector.css';

const RUN_COLORS=['#6ce9e9','#ffc474','#c9a9fb','#ff90ac'];
const MAP_W=460,MAP_H=240;

export default function PlaytestInspector({worldDigest,currentGhost}){
  const [runs,setRuns]=useState([]);
  const [message,setMessage]=useState('Import 2–4 recordings of this exact world for comparison. Files remain in this browser session.');
  const picker=useRef(null);
  const comparison=useMemo(()=>worldDigest?compareGhostRuns(runs,worldDigest):null,[runs,worldDigest]);
  const paths=useMemo(()=>comparison?runs.map(run=>routeMapPoints(run,comparison.bounds,MAP_W,MAP_H)):[],[runs,comparison]);
  function addCurrent(){
    try{
      if(!worldDigest||!currentGhost)throw Error('Record, import or load a Ghost Run first.');
      const updated=insertInspectorRun(runs,currentGhost,worldDigest);
      setRuns(updated);setMessage('Added your current ghost to the comparison without changing its saved slot.');
    }catch(e){setMessage('Comparison rejected: '+e.message);}
  }
  async function importFiles(event){
    const files=Array.from(event.target.files||[]);
    event.target.value='';
    if(!files.length)return;
    try{
      if(!worldDigest)throw Error('World SHA-256 is not ready.');
      if(files.length+runs.length>INSPECTOR_MAX_RUNS)
        throw Error('Up to four runs can be compared. Remove a run first.');
      if(files.some(file=>file.size>GHOST_MAX_BYTES))
        throw Error('Individual ghost files must not exceed 320 KB.');
      const parsed=await Promise.all(files.map(async file=>parseGhostRun(await file.text(),worldDigest)));
      let updated=runs;
      for(const item of parsed)updated=insertInspectorRun(updated,item,worldDigest);
      setRuns(updated);
      setMessage('Validated and added '+parsed.length+' matching ghost recording(s). Nothing was uploaded or persisted.');
    }catch(e){setMessage('Import rejected without adding any files: '+e.message);}
  }
  function removeRun(index){
    setRuns(items=>items.filter((_,i)=>i!==index));
    setMessage('Removed one recording from this comparison session only.');
  }
  function exportReport(){
    try{
      if(!worldDigest)throw Error('World digest is not ready.');
      const report=createPlaytestReport(runs,worldDigest);
      downloadJson(report,'pixelforge-playtest-report.v1.json');
      setMessage('Downloaded a summary-only report. Raw ghost routes were not included.');
    }catch(e){setMessage('Report export refused: '+e.message);}
  }
  const mapPosition=(x,z)=>{
    const b=comparison.bounds;
    return {x:(x-b.minX)/(b.maxX-b.minX)*MAP_W,
      y:MAP_H-(z-b.minZ)/(b.maxZ-b.minZ)*MAP_H};
  };
  return <section className="pixInspectorPanel">
    <div className="pixInspectorHeader">
      <div><div className="pixInspectorEyebrow">RUNG 12 · LOCAL FIRST</div>
        <h3>PLAYTEST INSPECTOR</h3>
        <p>Compare routes, movement and shared dwell cells across up to four imported recordings.
          This is evidence for level design investigation, not a verdict on player frustration.</p>
      </div>
      <span className="pixInspectorCount">{runs.length} / {INSPECTOR_MAX_RUNS} RUNS</span>
    </div>
    <div className="pixInspectorActions">
      <button type="button" disabled={!worldDigest||!currentGhost||runs.length>=INSPECTOR_MAX_RUNS}
        onClick={addCurrent}>+ Add Current Ghost</button>
      <button type="button" disabled={!worldDigest||runs.length>=INSPECTOR_MAX_RUNS}
        onClick={()=>picker.current?.click()}>⇧ Import Ghost Runs</button>
      <button type="button" disabled={!comparison?.runCount}
        onClick={exportReport}>⇩ Export Summary Report</button>
      <button type="button" disabled={!runs.length} onClick={()=>{
        setRuns([]);setMessage('Cleared only the temporary inspection list.');
      }}>Clear Comparison</button>
    </div>
    <input ref={picker} hidden type="file" accept=".json,application/json" multiple
      onChange={importFiles}/>
    <p className="pixInspectorStatus" role="status">{message}</p>
    {comparison?.runCount>0&&<>
      <div className="pixInspectorStats">
        <div><strong>{comparison.runCount}</strong><span>Compared runs</span></div>
        <div><strong>{comparison.bestDuration}s</strong><span>Shortest recorded duration</span></div>
        <div><strong>{comparison.meanDuration}s</strong><span>Mean duration</span></div>
        <div><strong>{comparison.meanDistance}m</strong><span>Mean 3D distance</span></div>
      </div>
      <div className="pixInspectorRouteMap">
        <div className="pixInspectorSubhead">
          <h4>TOP-DOWN ROUTE OVERLAY</h4>
          <span>X / Z coordinates · World-relative meters</span>
        </div>
        <svg viewBox="0 0 460 240" role="img" aria-label="Top-down overlay of imported ghost paths and shared dwell locations">
          <rect width="460" height="240" fill="#0a152c"/>
          {[1,2,3,4,5].map(n=><g key={n} stroke="#31476b" strokeWidth=".7" opacity=".7">
            <line x1={n*MAP_W/6} y1="0" x2={n*MAP_W/6} y2={MAP_H}/>
            <line x1="0" y1={n*MAP_H/6} x2={MAP_W} y2={n*MAP_H/6}/>
          </g>)}
          {comparison.sharedCells.map((cell,i)=>{
            const xy=mapPosition(cell.x,cell.z);
            return <g key={i}>
              <circle cx={xy.x} cy={xy.y} r={5+cell.runCount*2.4}
                fill="#f6c57d" fillOpacity=".16" stroke="#f6c57d" strokeDasharray="3 3"/>
              <title>{cell.runCount} runs passed cell X {cell.x} Z {cell.z};
                about {cell.totalSeconds}s combined sampled time</title>
            </g>;
          })}
          {paths.map((points,i)=><g key={i}>
            <polyline points={points.map(p=>p.x+','+p.y).join(' ')}
              fill="none" stroke={RUN_COLORS[i]} strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round" opacity=".86"/>
            <circle cx={points[0].x} cy={points[0].y} r="4" fill={RUN_COLORS[i]}/>
            <rect x={points.at(-1).x-3.2} y={points.at(-1).y-3.2}
              width="6.4" height="6.4" fill={RUN_COLORS[i]}/>
          </g>)}
        </svg>
        <div className="pixInspectorLegend">
          {comparison.metrics.map((m,i)=><span key={m.index}>
            <b style={{background:RUN_COLORS[i]}}/> {m.label}
          </span>)}
          <span>○ Shared 2m cell · ● Start · ■ End</span>
        </div>
      </div>
      <div className="pixInspectorSubhead">
        <h4>RUN COMPARISON</h4><span>Local recording summaries</span>
      </div>
      <div className="pixInspectorTableScroll">
        <table className="pixInspectorTable">
          <thead><tr><th>Run</th><th>Duration</th><th>Distance</th><th>Avg. speed</th>
            <th>Moving</th><th>Approx. jumps</th><th>Samples</th><th>Remove</th></tr></thead>
          <tbody>{comparison.metrics.map((run,i)=><tr key={run.index}>
            <td><span className="pixInspectorRunDot" style={{background:RUN_COLORS[i]}}/>{run.label}</td>
            <td>{run.durationSeconds}s</td><td>{run.distanceMeters}m</td>
            <td>{run.averageSpeed}m/s</td><td>{run.movingSeconds}s</td>
            <td>{run.jumps}</td><td>{run.samples}</td>
            <td><button type="button" onClick={()=>removeRun(i)}
              aria-label={'Remove '+run.label}>Remove</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="pixInspectorSubhead">
        <h4>OVERLAPPING DWELL CELLS</h4><span>2-meter grid · visited by 2+ runs</span>
      </div>
      {comparison.sharedCells.length?
        <div className="pixInspectorHotspots">{comparison.sharedCells.map((cell,i)=>
          <div key={i}><strong>X {cell.x}, Z {cell.z}</strong>
            <span>{cell.runCount} / {comparison.runCount} runs · {cell.totalSeconds}s total
              · {cell.meanSecondsPerVisitingRun}s mean among visitors</span>
          </div>)}</div>:
        <p className="pixInspectorEmpty">No overlapping dwell cells yet. Add another route to see where their sampled paths intersect.</p>}
    </>}
    <p className="pixInspectorPrivacy">Only the selected ghost files are analyzed in memory. No names, accounts,
      network telemetry or remote storage. The exported report contains aggregate cell summaries and per-run
      metrics, but excludes raw route samples. Ghost files can be hand-authored and recordings may differ
      in device performance, sample spacing, and starting point.</p>
  </section>;
}
