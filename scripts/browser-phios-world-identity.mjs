// Actual Chrome browser test for the identity-only button, no app authorizations.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtemp,mkdir,readFile,readdir,rename,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep,extname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('vr-studio');
const temp=await mkdtemp(join(tmpdir(),'pixelforge-phios-chrome-'));
const downloadDir=join(temp,'downloads');
const browser=[process.env.CHROME_BIN,'google-chrome','chromium','chromium-browser']
  .filter(Boolean).find(x=>spawnSync(x,['--version']).status===0);
if(!browser)throw Error('Chrome/Chromium is required for actual browser acceptance');
const server=createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    const file=resolve(root,decodeURIComponent(u.pathname.slice(1)||'index.html'));
    if(file!==join(root,'index.html')&&!file.startsWith(root+sep)){
      res.writeHead(403).end();return;
    }
    if(!(await stat(file)).isFile())throw Error('not file');
    const contentType={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
    res.writeHead(200,{'Content-Type':contentType[extname(file)]||'application/octet-stream',
      'Cache-Control':'no-store'}).end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
let child=null,socket=null,sequence=0,diagnostics='';
const pending=new Map();
async function waitFor(name,check){
  const end=Date.now()+25000;let last='';
  while(Date.now()<end){
    try{const value=await check();if(value)return value;}catch(error){last=error.message;}
    await sleep(100);
  }
  throw Error('Chrome timed out: '+name+' '+last+' '+diagnostics);
}
function send(method,params={},sessionId){
  const id=++sequence;
  return new Promise((ok,fail)=>{
    const timer=setTimeout(()=>{pending.delete(id);fail(Error('CDP '+method+' timeout'));},18000);
    pending.set(id,{ok(v){clearTimeout(timer);pending.delete(id);ok(v);},
      fail(e){clearTimeout(timer);pending.delete(id);fail(e);}});
    socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
}
try{
  await mkdir(downloadDir);
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const origin='http://127.0.0.1:'+server.address().port;
  child=spawn(browser,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-extensions','--disable-background-networking','--disable-sync',
    '--no-first-run','--enable-unsafe-swiftshader','--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1','--user-data-dir='+temp,'about:blank'],
    {stdio:['ignore','ignore','pipe']});
  child.stderr.on('data',x=>{diagnostics=(diagnostics+x).slice(-1200);});
  const endpoint=await waitFor('DevTools endpoint',async()=>{
    if(child.exitCode!==null)throw Error('Chrome exited');
    const parts=(await readFile(join(temp,'DevToolsActivePort'),'utf8').catch(()=>'')).trim().split('\n');
    return /^\d+$/.test(parts[0])&&/^\/devtools\/browser\/[a-f0-9-]+$/i.test(parts[1])
      ?'ws://127.0.0.1:'+parts[0]+parts[1]:null;
  });
  socket=new WebSocket(endpoint);
  await new Promise((ok,fail)=>{socket.addEventListener('open',ok,{once:true});
    socket.addEventListener('error',fail,{once:true});});
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data),p=pending.get(message.id);
    if(!p)return;
    if(message.error)p.fail(Error(message.error.message));else p.ok(message.result);
  });
  const {targetInfos}=await send('Target.getTargets');
  const page=targetInfos.find(t=>t.type==='page');
  assert.ok(page,'No Chrome page target');
  const {sessionId}=await send('Target.attachToTarget',{targetId:page.targetId,flatten:true});
  await send('Page.enable',{},sessionId);
  await send('Runtime.enable',{},sessionId);
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir,eventsEnabled:true});
  const evaluate=async(expression)=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);
    assert.ok(!r.exceptionDetails,'Browser error: '+(JSON.stringify(r.exceptionDetails)||'none').slice(0,320));
    return r.result?.value;
  };
  await send('Page.navigate',{url:origin+'/'},sessionId);
  await waitFor('VR Studio initialized',async()=>{
    const s=await evaluate('document.getElementById("status")?.textContent');
    return s&&s!=='Initializing renderer…';
  });
  const storage=()=>evaluate('localStorage.getItem("pixelforge.vr-world.v1.local")');
  assert.equal(await storage(),null,'No startup world write');
  assert.equal(await evaluate('Boolean(document.getElementById("phiosIdentityExport"))'),true);
  const click=async(value)=>evaluate('(()=>{document.getElementById("phiosProjectId").value='+
    JSON.stringify(value)+';document.getElementById("phiosIdentityExport").click();return true;})()');
  await click('project:../invalid');
  assert.match(await evaluate('document.getElementById("status").textContent'),/Project ID must be/);
  assert.deepEqual(await readdir(downloadDir),[],'Invalid identity cannot download');
  await click('same-project');
  const file=join(downloadDir,'pixelforge-phios-project-identity.v0.1.json');
  await waitFor('actual JSON download',async()=>(await stat(file).catch(()=>null))?.size>20);
  const first=JSON.parse(await readFile(file,'utf8'));
  assert.deepEqual(first,{schema:'pixelforge.phios-vr-world-identity.v0.1',
    projectId:'same-project',title:'Untitled VR World',
    worldFormat:'pixelforge.vr-world.v1'});
  assert.equal(await storage(),null,'Export must not write a world');
  await rename(file,file+'.reviewed');
  await evaluate('(()=>{const input=document.getElementById("worldTitle");'+
    'input.value="Revised World Title";'+
    'input.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
  await click('same-project');
  await waitFor('second actual JSON download',async()=>(await stat(file).catch(()=>null))?.size>20);
  const second=JSON.parse(await readFile(file,'utf8'));
  assert.equal(second.projectId,first.projectId,'Edits never change chosen stable ID');
  assert.equal(second.title,'Revised World Title');
  assert.deepEqual(Object.keys(second),['schema','projectId','title','worldFormat']);
  assert.equal(await storage(),null);
  console.log('PIXELFORGE_R1_CHROME_IDENTITY_EXPORT:'+JSON.stringify({
    exportedFromLiveUI:true,unsafeIdRejected:true,stableAfterRename:true,
    privateAssetsIncluded:false,registryWrites:0,appAdmission:false,
    fullCrossOriginBridgeTested:false,nativeInstalled:false
  }));
}finally{
  if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch{}socket.close();}
  if(child?.exitCode===null)child.kill('SIGTERM');
  await new Promise(done=>server.close(done));
  await rm(temp,{recursive:true,force:true,maxRetries:3,retryDelay:100});
}
