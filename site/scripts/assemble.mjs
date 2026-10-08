// Assemble the public GitHub Pages artifact without copying the entire repository.
// Keeping this allowlist explicit prevents publication of a future local asset vault,
// scripts with executable authority, package cache, configuration, or other workspace files.
import {cp, mkdir, readFile, writeFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath),'../..');
const publicRoots = ['assets','community','data','games','pocketgames','runtime','vr-studio','external-preview'];
const publicFiles = ['app.js','styles.css','sprite-studio.js','tile-studio.js','runtime-composer.js'];

async function exists(source) {
  try {return (await stat(source)).isFile() || (await stat(source)).isDirectory();}
  catch(error){if(error.code==='ENOENT')return false;throw error;}
}
async function copyRelative(repoRoot,outDir,relative) {
  const src=path.join(repoRoot,relative);
  if(!await exists(src))throw new Error('Expected PixelForge public path missing: '+relative);
  const dst=path.join(outDir,relative);
  await mkdir(path.dirname(dst),{recursive:true});
  await cp(src,dst,{recursive:true,force:true});
}
export async function assemble(repoRoot,outDir) {
  await mkdir(outDir,{recursive:true});
  const shell=await readFile(path.join(outDir,'index.html'),'utf8');
  if(!shell.includes('id="root"'))throw new Error('Vite React entry was not built.');
  for(const p of [...publicRoots,...publicFiles])await copyRelative(repoRoot,outDir,p);

  // The old Studio is not React yet. Publish it under /studio/ but keep its
  // asset/script imports, and its links to sibling apps, rooted at the site base.
  const legacy=await readFile(path.join(repoRoot,'index.html'),'utf8');
  if(!legacy.includes('<head>')||!legacy.includes('app.js'))
    throw new Error('Existing PixelForge Studio entry has changed unexpectedly.');
  const wrapped=legacy.replace('<head>','<head>\n  <base href="../" />');
  await mkdir(path.join(outDir,'studio'),{recursive:true});
  await writeFile(path.join(outDir,'studio/index.html'),wrapped);

  // The GLB inspector module imports this specific pure data-planning module.
  // Do not publish all scripts: many others are local-only tools.
  await copyRelative(repoRoot,outDir,'scripts/lib/glb_preview_plan.js');
  await writeFile(path.join(outDir,'.nojekyll'),'');
  return {pages:'React portal + legacy Studio + WebGL2 VR/GLB tools',roots:publicRoots.length};
}

if(path.resolve(process.argv[1]||'')===scriptPath) {
  await assemble(projectRoot,path.join(projectRoot,'dist'));
  console.log('PixelForge public site assembled in dist/.');
}
