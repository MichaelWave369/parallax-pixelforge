import test from 'node:test';
import assert from 'node:assert/strict';
import {neutralTitlePad,readTitlePad,titlePadEdges,nextTitleFocus} from '../src/title-gamepad.js';
function pad(buttons=[],y=0,mapping='standard'){
  const b=Array.from({length:17},(_,index)=>({pressed:buttons.includes(index)}));
  return {connected:true,mapping,axes:[0,y,0,0],buttons:b};
}
test('title gamepad maps D-pad, A/Start selection and B credits navigation',()=>{
  const n=neutralTitlePad();
  assert.deepEqual(readTitlePad(null),n);
  assert.deepEqual(readTitlePad({...pad([0]),connected:false}),n);
  assert.deepEqual(readTitlePad(pad([0],0,'xr-standard')),n);
  assert.equal(readTitlePad(pad([12])).up,true);
  assert.equal(readTitlePad(pad([13])).down,true);
  assert.equal(readTitlePad(pad([0])).confirm,true);
  assert.equal(readTitlePad(pad([9])).confirm,true);
  assert.equal(readTitlePad(pad([1])).back,true);
});
test('held buttons trigger one menu move or selection until released',()=>{
  const active=readTitlePad(pad([0,13]));
  assert.deepEqual(titlePadEdges(neutralTitlePad(),active),{
    up:false,down:true,confirm:true,back:false
  });
  assert.deepEqual(titlePadEdges(active,active),{
    up:false,down:false,confirm:false,back:false
  });
  assert.deepEqual(titlePadEdges(active,neutralTitlePad()),{
    up:false,down:false,confirm:false,back:false
  });
  assert.deepEqual(titlePadEdges(neutralTitlePad(),readTitlePad(pad([1]))),{
    up:false,down:false,confirm:false,back:true
  });
});
test('left stick ignores small movement and navigates only past 65 percent',()=>{
  assert.equal(readTitlePad(pad([],.3)).down,false);
  assert.equal(readTitlePad(pad([],.7)).down,true);
  assert.equal(readTitlePad(pad([],-.7)).up,true);
  assert.deepEqual(readTitlePad(pad([],Infinity)),readTitlePad(pad()));
});
test('focused menu navigation wraps and refuses unknown menu ranges',()=>{
  assert.equal(nextTitleFocus(0,-1,5),4);
  assert.equal(nextTitleFocus(4,1,5),0);
  assert.equal(nextTitleFocus(2,1,5),3);
  assert.throws(()=>nextTitleFocus(-1,1,5),/Invalid/);
  assert.throws(()=>nextTitleFocus(0,0,5),/Invalid/);
  assert.throws(()=>nextTitleFocus(0,1,0),/Invalid/);
  assert.throws(()=>nextTitleFocus(0,1,33),/Invalid/);
});
