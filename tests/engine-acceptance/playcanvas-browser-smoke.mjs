// Execute the generated PixelForge PlayCanvas project in real Chromium.
// This script is copied into the ephemeral project folder and imports Playwright there.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const URL='http://127.0.0.1:5179/';
let server,browser;
const diagnostics=[];
async function waitForServer(){
  for(let i=0;i<160;i++){
    if(server.exitCode!==null)throw Error('Local Vite server exited early.');
    try{if((await fetch(URL)).ok)return;}catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  throw Error('Local Vite server was unavailable.');
}
try{
  server=spawn('npm',['run','dev','--','--port','5179','--strictPort'],{
    cwd:process.cwd(),env:process.env,stdio:['ignore','pipe','pipe']
  });
  server.stdout.on('data',data=>diagnostics.push('Vite: '+data.toString()));
  server.stderr.on('data',data=>diagnostics.push('Vite stderr: '+data.toString()));
  await waitForServer();
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
    '--enable-unsafe-swiftshader','--disable-dev-shm-usage'
  ]});
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const exceptions=[];
  page.on('pageerror',error=>exceptions.push(String(error)));
  page.on('console',message=>{
    if(message.type()==='error')diagnostics.push('Browser: '+message.text());
  });
  page.on('response',response=>{
    if(response.status()>=400)diagnostics.push('HTTP '+response.status()+': '+response.url());
  });
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>{
    const status=document.getElementById('status')?.textContent||'';
    return /visibility rule\(s\) active|Visibility controls not activated|Unable to import PixelForge GLB/.test(status);
  },null,{timeout:30000});
  const initial=await page.locator('#status').textContent();
  if(!initial.includes('2 visibility rule(s) active'))
    throw Error('Actual PlayCanvas importer could not activate both rules: '+initial);
  async function target(){
    return await page.evaluate(()=>{
      const root=window.__PIXELFORGE_ACCEPTANCE_GRAPH;
      if(!root)return {error:'missing temporary test probe'};
      const nodes=[],stack=[root];
      while(stack.length){
        const node=stack.pop();
        if(node.name==='PF_ID_obj-2')nodes.push(node);
        for(const child of node.children||[])stack.push(child);
      }
      return {count:nodes.length,enabled:nodes[0]?.enabled};
    });
  }
  assert.deepEqual(await target(),{count:1,enabled:true},'real GLB node mapping');
  await page.keyboard.press('f');
  assert.equal((await target()).enabled,true,'wrong key must not change entity');
  await page.keyboard.down('e');
  assert.equal((await target()).enabled,true,'keydown ignored');
  await page.keyboard.up('e');
  assert.equal((await target()).enabled,false,'E key release hides actual PlayCanvas entity');
  assert.match(await page.locator('#status').textContent(),/Object obj-2 hide on E release/);
  await page.keyboard.press('Control+e');
  assert.equal((await target()).enabled,false,'Ctrl modifier ignored');
  await page.keyboard.press('Space');
  assert.equal((await target()).enabled,true,'Space release shows actual PlayCanvas entity');
  assert.match(await page.locator('#status').textContent(),/Object obj-2 show on SPACE release/);
  assert.ok(await page.locator('canvas#stage').evaluate(el=>el.width>0&&el.height>0));
  assert.deepEqual(exceptions,[],'no uncaught browser exceptions');
  await page.screenshot({path:'playcanvas-acceptance.png',fullPage:true});
  for(const marker of ['GLB_IMPORT','HIDE_E','SHOW_SPACE','INPUT_GUARDS'])
    console.log('PIXELFORGE_PLAYCANVAS_BROWSER_PASS:'+marker);
}catch(error){
  console.error('PIXELFORGE_PLAYCANVAS_BROWSER_FAIL:',error);
  console.error(diagnostics.join('\n'));
  process.exitCode=1;
}finally{
  if(browser)await browser.close();
  if(server?.exitCode===null)server.kill('SIGTERM');
}
