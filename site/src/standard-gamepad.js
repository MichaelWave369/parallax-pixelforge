// PixelForge v6 Rung 10: deterministic standard Gamepad mapping.
// Pure data in, bounded motion/actions out. No browser APIs inside this file.
export const GAMEPAD_DEADZONE=.19;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function axis(values,index){
  return Array.isArray(values)&&finite(values[index])?clamp(values[index],-1,1):0;
}
function pressed(buttons,i){
  const b=Array.isArray(buttons)?buttons[i]:null;
  return b===true||!!(b&&typeof b==='object'&&b.pressed===true);
}
function stick(x,y){
  const magnitude=Math.hypot(x,y);
  if(magnitude<=GAMEPAD_DEADZONE)return [0,0];
  const scaled=(Math.min(1,magnitude)-GAMEPAD_DEADZONE)/(1-GAMEPAD_DEADZONE);
  return [x/magnitude*scaled,y/magnitude*scaled];
}
export function neutralGamepad(){
  return {connected:false,right:0,forward:0,turn:0,look:0,sprint:false,
    jump:false,interact:false,pause:false,checkpoint:false};
}
export function readStandardGamepad(input){
  if(!input||input.connected!==true||input.mapping!=='standard')return neutralGamepad();
  const axes=Array.from(input.axes||[]),buttons=Array.from(input.buttons||[]);
  const [lx,ly]=stick(axis(axes,0),axis(axes,1));
  const [rx,ry]=stick(axis(axes,2),axis(axes,3));
  const dRight=Number(pressed(buttons,15))-Number(pressed(buttons,14));
  const dForward=Number(pressed(buttons,12))-Number(pressed(buttons,13));
  return {
    connected:true,
    right:clamp(lx+dRight,-1,1),
    forward:clamp(-ly+dForward,-1,1),
    turn:rx,look:ry,
    sprint:pressed(buttons,5)||pressed(buttons,10),
    jump:pressed(buttons,0),
    interact:pressed(buttons,2),
    pause:pressed(buttons,9),
    checkpoint:pressed(buttons,3)
  };
}
export function gamepadRisingEdges(previous,next){
  const prior=previous||neutralGamepad(),current=next||neutralGamepad();
  return {
    jump:current.connected&&current.jump&&!prior.jump,
    interact:current.connected&&current.interact&&!prior.interact,
    pause:current.connected&&current.pause&&!prior.pause,
    checkpoint:current.connected&&current.checkpoint&&!prior.checkpoint
  };
}
export function firstStandardGamepad(pads){
  if(!pads)return null;
  return Array.from(pads).find(p=>p?.connected&&p.mapping==='standard')||null;
}
