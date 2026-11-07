// Rung 15: pure standard Gamepad API controls for standalone title menus.
// No polling, I/O, DOM operations or user interaction claims in this module.
const down=(buttons,index)=>buttons?.[index]?.pressed===true;
export function neutralTitlePad(){
  return {connected:false,up:false,down:false,confirm:false,back:false};
}
export function readTitlePad(pad){
  if(!pad||pad.connected!==true||pad.mapping!=='standard')return neutralTitlePad();
  const axis=Number.isFinite(pad.axes?.[1])?pad.axes[1]:0;
  return {connected:true,
    up:down(pad.buttons,12)||axis<-.65,
    down:down(pad.buttons,13)||axis>.65,
    confirm:down(pad.buttons,0)||down(pad.buttons,9),
    back:down(pad.buttons,1)};
}
export function titlePadEdges(previous,next){
  const prior=previous||neutralTitlePad(),now=next||neutralTitlePad();
  return {up:now.connected&&now.up&&!prior.up,
    down:now.connected&&now.down&&!prior.down,
    confirm:now.connected&&now.confirm&&!prior.confirm,
    back:now.connected&&now.back&&!prior.back};
}
export function nextTitleFocus(index,direction,length){
  if(!Number.isSafeInteger(length)||length<1||length>32||
    !Number.isSafeInteger(index)||index<0||index>=length||
    ![-1,1].includes(direction))
    throw Error('Invalid title-menu focus movement.');
  return (index+direction+length)%length;
}
