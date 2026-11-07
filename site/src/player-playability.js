// Rung 8: pure, browser-agnostic helpers for a more playable Rapier preview.
// Neither motion parameters nor visual door poses are authority-bearing world data.
export const PLAYER_MOTION=Object.freeze({
  walkSpeed:3.7,
  sprintSpeed:5.6,
  acceleration:13.5,
  braking:17,
  jumpSpeed:5.3,
  groundProbe:1.02,
  fallResetY:-125
});
export const DOOR_DISSOLVE_SECONDS=.75;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function horizontalMotion({forward,input,previous,dt,sprint=false}){
  if(!Array.isArray(forward)||forward.length!==2||!forward.every(finite)||
    !Array.isArray(previous)||previous.length!==2||!previous.every(finite)||
    !Array.isArray(input)||input.length!==2||!input.every(finite)||
    !finite(dt)||dt<0||dt>.1)throw Error('Invalid player movement vectors.');
  const magnitude=Math.hypot(...forward);
  const f=magnitude>.0001?[forward[0]/magnitude,forward[1]/magnitude]:[0,-1];
  const right=[-f[1],f[0]];
  const x=clamp(input[0],-1,1),z=clamp(input[1],-1,1);
  const diagonal=Math.max(1,Math.hypot(x,z));
  const direction=[(right[0]*x+f[0]*z)/diagonal,(right[1]*x+f[1]*z)/diagonal];
  const speed=sprint?PLAYER_MOTION.sprintSpeed:PLAYER_MOTION.walkSpeed;
  const rate=Math.hypot(x,z)>.0001?PLAYER_MOTION.acceleration:PLAYER_MOTION.braking;
  const factor=1-Math.exp(-rate*dt);
  return [
    previous[0]+(direction[0]*speed-previous[0])*factor,
    previous[1]+(direction[1]*speed-previous[1])*factor
  ];
}
export function canJump(requested,grounded,paused){
  return requested===true&&grounded===true&&paused===false;
}
export function doorDissolvePose(elapsed){
  if(!finite(elapsed))throw Error('Invalid door animation time.');
  const t=clamp(elapsed/DOOR_DISSOLVE_SECONDS,0,1);
  const ease=t*t*(3-2*t);
  return {opacity:1-ease,scaleY:t>=1?.04:Math.max(.04,1-.96*ease),
    lift:.45*ease,emissive:ease*.55,done:t>=1};
}
