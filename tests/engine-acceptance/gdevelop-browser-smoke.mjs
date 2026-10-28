// PixelForge exported GDevelop HTML5 browser acceptance; isolated CI fixture only.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const root=process.argv[2],scenario=process.argv[3];
if(!root||!['plain','hide-e','show-space'].includes(scenario))
  throw Error('Required valid native GDevelop fixture directory/scenario.');
const port=5188;
let child,browser;
const logs=[];
async function waitForServer(){
  for(let i=0;i<160;i++){
    if(child.exitCode!==null)throw Error('Local GDevelop file server exited.');
    try{if((await fetch('http://127.0.0.1:'+port+'/')).ok)return;}catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  throw Error('Local GDevelop HTML5 game server timed out.');
}
async function visibility(page,name){
  return page.evaluate(name=>{
    const scene=window.__PF_GDEVELOP_NATIVE_GAME?.getSceneStack()?.getCurrentScene();
    const objects=scene?.getObjects(name);
    if(!objects)return {error:'No loaded native GDevelop scene'};
    return {count:objects.length,visible:objects[0]?.isVisible()};
  },name);
}
try{
  child=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',root+'/build'],
    {cwd:root,env:process.env,detached:true,stdio:['ignore','pipe','pipe']});
  child.stderr.on('data',b=>logs.push('server: '+b.toString()));
  await waitForServer();
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
    '--enable-unsafe-swiftshader','--disable-dev-shm-usage'
  ]});
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  page.on('console',msg=>{if(msg.type()==='error')logs.push('page: '+msg.text());});
  page.on('response',response=>{
    if(response.status()>=400)logs.push('HTTP '+response.status()+' '+response.url());
  });
  await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>{
    const game=window.__PF_GDEVELOP_NATIVE_GAME;
    const scene=game?.getSceneStack()?.getCurrentScene();
    return !!scene?.getObjects('PF_Obj_002')?.length;
  },null,{timeout:30000});
  const name=scenario==='show-space'?'PF_Obj_003':'PF_Obj_002';
  assert.deepEqual(await visibility(page,name),{count:1,visible:true},
    'actual GDevelop runtime object exists and starts visible');
  if(scenario==='hide-e'){
    await page.keyboard.press('f');
    assert.equal((await visibility(page,name)).visible,true,'wrong key must be ignored');
    await page.keyboard.press('e');
    await page.waitForFunction(name=>{
      const scene=window.__PF_GDEVELOP_NATIVE_GAME?.getSceneStack()?.getCurrentScene();
      return scene?.getObjects(name)?.[0]?.isVisible()===false;
    },name,{timeout:5000});
    assert.equal((await visibility(page,name)).visible,false,'E release must hide the native object');
    console.log('PIXELFORGE_GDEVELOP_BROWSER_PASS:HIDE_E');
  }
  if(scenario==='show-space'){
    await page.evaluate(name=>{
      const scene=window.__PF_GDEVELOP_NATIVE_GAME.getSceneStack().getCurrentScene();
      scene.getObjects(name)[0].hide(true);
    },name);
    assert.equal((await visibility(page,name)).visible,false,'precondition is hidden');
    await page.keyboard.press('Space');
    await page.waitForFunction(name=>{
      const scene=window.__PF_GDEVELOP_NATIVE_GAME?.getSceneStack()?.getCurrentScene();
      return scene?.getObjects(name)?.[0]?.isVisible()===true;
    },name,{timeout:5000});
    assert.equal((await visibility(page,name)).visible,true,'Space release must show native object');
    console.log('PIXELFORGE_GDEVELOP_BROWSER_PASS:SHOW_SPACE');
  }
  assert.deepEqual(errors,[],'no uncaught browser JS errors');
  const canvas=page.locator('canvas').first();
  assert.ok(await canvas.count(),'a real game canvas exists');
  assert.ok(await canvas.evaluate(el=>el.width>0&&el.height>0),'canvas has dimensions');
  await page.screenshot({path:root+'/gdevelop-'+scenario+'.png',fullPage:true});
  console.log('PIXELFORGE_GDEVELOP_BROWSER_PASS:SCENE_'+scenario.toUpperCase().replaceAll('-','_'));
}catch(err){
  console.error('PIXELFORGE_GDEVELOP_BROWSER_FAILURE:'+scenario,err);
  console.error(logs.join('\n'));
  process.exitCode=1;
}finally{
  if(browser)await browser.close();
  if(child?.pid)try{process.kill(-child.pid,'SIGTERM');}catch{}
  child?.stdout?.destroy();child?.stderr?.destroy();
}
