import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,mkdir,writeFile,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {assemble} from './assemble.mjs';

test('public assembly preserves all three frontends and leaves local assets unpublished',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'pixelforge-pages-'));
 const repo=path.join(root,'source'),dist=path.join(root,'dist');
 const make=async(relative,content='placeholder')=>{
   const p=path.join(repo,relative);await mkdir(path.dirname(p),{recursive:true});await writeFile(p,content);
 };
 try {
   await mkdir(dist,{recursive:true});
   await writeFile(path.join(dist,'index.html'),'<div id="root"></div>');
   await make('index.html','<html><head><title>Studio</title></head><body><script src="app.js"></script></body></html>');
   for(const dir of ['assets','community','data','games','pocketgames','runtime','vr-studio','external-preview'])
     await make(dir+'/placeholder.txt');
   for(const f of ['app.js','styles.css','sprite-studio.js','tile-studio.js','runtime-composer.js'])
     await make(f);
   await make('scripts/lib/glb_preview_plan.js','export const x=1;');
   await make('local-assets/private-asset.glb','NOT FOR WEB');
   await make('.env','SECRET');
   await assemble(repo,dist);
   const legacy=await readFile(path.join(dist,'studio/index.html'),'utf8');
   assert.match(legacy,/<base href="\.\.\/"\s*\/>/);
   assert.match(await readFile(path.join(dist,'index.html'),'utf8'),/id="root"/);
   await access(path.join(dist,'vr-studio/placeholder.txt'));
   await access(path.join(dist,'external-preview/placeholder.txt'));
   await assert.rejects(access(path.join(dist,'local-assets/private-asset.glb')));
   await assert.rejects(access(path.join(dist,'.env')));
 } finally {await rm(root,{recursive:true,force:true});}
});
