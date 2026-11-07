// Rung 11: portable, world-bound path ghost. This is telemetry, not a game save,
// deterministic physics replay, identity proof, or privileged executable program.
export const GHOST_FORMAT='pixelforge.ghost-run.v1';
export const GHOST_STORAGE_PREFIX='pixelforge.v6.ghost.v1.';
export const GHOST_SAMPLE_INTERVAL_MS=200; // ~5 Hz, no extra RAF loop
export const GHOST_MAX_SAMPLES=2400;
export const GHOST_MAX_DURATION_MS=600000;
export const GHOST_MAX_BYTES=320000;
const HEX=/^[a-f0-9]{64}$/;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function fields(o,keys){
  if(!plain(o)||Object.keys(o).length!==keys.length||
    keys.some(k=>!Object.hasOwn(o,k)))throw Error('Ghost run contains unknown or missing fields.');
}
function checkHash(v){
  if(typeof v!=='string'||!HEX.test(v))throw Error('Ghost run needs a valid world digest.');
  return v;
}
function checkPosition(v){
  if(!Array.isArray(v)||v.length!==3||!v.every(n=>finite(n)&&n>=-100&&n<=100))
    throw Error('Ghost position must contain three finite bounded coordinates.');
  return [...v];
}
function frame(raw){
  fields(raw,['t','position','grounded']);
  if(!Number.isSafeInteger(raw.t)||raw.t<0||raw.t>GHOST_MAX_DURATION_MS||
    typeof raw.grounded!=='boolean')throw Error('Invalid ghost sample time or grounded state.');
  return {t:raw.t,position:checkPosition(raw.position),grounded:raw.grounded};
}
export function ghostStorageKey(worldDigest){
  return GHOST_STORAGE_PREFIX+checkHash(worldDigest);
}
export function appendGhostSample(samples,raw){
  if(!Array.isArray(samples)||samples.length>=GHOST_MAX_SAMPLES)
    throw Error('Ghost recording reached its 2400-sample limit.');
  const next=frame(raw),last=samples.at(-1);
  if(last&&next.t<=last.t)throw Error('Ghost samples must be strictly time-ordered.');
  return [...samples,next];
}
export function validateGhostRun(value,worldDigest){
  fields(value,['format','world_sha256','created_at','samples']);
  if(value.format!==GHOST_FORMAT)throw Error('Unsupported ghost recording version.');
  if(value.world_sha256!==checkHash(worldDigest))
    throw Error('Ghost belongs to a different playable world or revision.');
  if(!Number.isSafeInteger(value.created_at)||value.created_at<0)
    throw Error('Invalid ghost recording timestamp.');
  if(!Array.isArray(value.samples)||value.samples.length<2||value.samples.length>GHOST_MAX_SAMPLES)
    throw Error('Ghost recording needs 2 to 2400 samples.');
  const samples=[];
  for(const raw of value.samples){
    const next=frame(raw);
    if(samples.length&&next.t<=samples.at(-1).t)
      throw Error('Ghost samples must be strictly time-ordered.');
    samples.push(next);
  }
  if(samples[0].t!==0)throw Error('Ghost recording must start at t=0.');
  return {format:GHOST_FORMAT,world_sha256:worldDigest,created_at:value.created_at,samples};
}
export function createGhostRun(worldDigest,samples,createdAt=Date.now()){
  return validateGhostRun({format:GHOST_FORMAT,world_sha256:checkHash(worldDigest),
    created_at:createdAt,samples},worldDigest);
}
export function parseGhostRun(raw,worldDigest){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>GHOST_MAX_BYTES)
    throw Error('Ghost JSON exceeds the 320 KB import limit.');
  return validateGhostRun(JSON.parse(raw),worldDigest);
}
export function ghostPoseAt(run,timeMs){
  if(!finite(timeMs))throw Error('Invalid ghost playback time.');
  const samples=run.samples;
  if(!Array.isArray(samples)||!samples.length)throw Error('Ghost has no samples.');
  if(timeMs<=samples[0].t)return {position:[...samples[0].position],grounded:samples[0].grounded,done:false};
  const end=samples.at(-1);
  if(timeMs>=end.t)return {position:[...end.position],grounded:end.grounded,done:true};
  // Binary search: drawing a ghost is O(log n), not O(number of samples).
  let lo=0,hi=samples.length-1;
  while(lo+1<hi){
    const mid=(lo+hi)>>1;
    if(samples[mid].t<=timeMs)lo=mid;else hi=mid;
  }
  const a=samples[lo],b=samples[hi],t=(timeMs-a.t)/(b.t-a.t);
  return {position:a.position.map((v,i)=>v+(b.position[i]-v)*t),
    grounded:a.grounded,done:false};
}
export function analyzeGhostRun(run){
  const samples=run.samples;
  let distance=0,movingMs=0,jumps=0;
  const cells=new Map();
  for(let i=0;i<samples.length;i++){
    const a=samples[i],b=samples[i+1];
    if(i>0&&samples[i-1].grounded&&!a.grounded&&a.position[1]>samples[i-1].position[1])
      jumps++;
    if(!b)break;
    const dt=b.t-a.t;
    const segment=Math.hypot(...a.position.map((v,k)=>v-b.position[k]));
    distance+=segment;
    if(segment/dt*1000>.3)movingMs+=dt;
    const x=Math.floor(a.position[0]/2),z=Math.floor(a.position[2]/2),key=x+','+z;
    cells.set(key,(cells.get(key)||0)+dt);
  }
  const duration=samples.at(-1).t;
  const hotspots=[...cells].sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([key,ms])=>{const [x,z]=key.split(',').map(Number);
      return {x:x*2+1,z:z*2+1,seconds:Math.round(ms/100)/10};});
  return {samples:samples.length,durationSeconds:Math.round(duration/100)/10,
    distanceMeters:Math.round(distance*10)/10,
    averageSpeed:duration?Math.round(distance/duration*10000)/10:0,
    movingSeconds:Math.round(movingMs/100)/10,
    jumps,hotspots};
}
