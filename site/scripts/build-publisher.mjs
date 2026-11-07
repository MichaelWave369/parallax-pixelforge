// Build the publish-once offline HTML template from a separate, fully bundled
// Vite entry. Never copy the full repository, local asset vault, or authoring files.
import {execFileSync} from 'node:child_process';
import {readFile,readdir,rm,writeFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {collectRuntimeNotices} from './runtime-license-notices.mjs';
import {emptyBundledNotices} from '../src/license-notices.js';
import {escapeInertJson} from '../src/release-metadata.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(site,'../dist');
const scratch=path.join(output,'.publisher-work');
const token='__PIXELFORGE_WORLD_JSON__';
const releaseToken='__PIXELFORGE_RELEASE_JSON__';
const extrasToken='__PIXELFORGE_EXTRAS_JSON__';
const maxTemplateBytes=12_000_000;

function protectRawScript(source){
  // The bundle is build-owned code, not a world-data field, but HTML parser
  // delimiters must still be escaped before insertion into an inline script.
  return source.replace(/<\/script/gi,'<\\/script');
}
export function makeOfflineTemplate(js,css,notices=emptyBundledNotices()){
  if(typeof js!=='string'||!js.trim()||typeof css!=='string'||!css.trim())
    throw Error('Cannot publish an empty runtime or stylesheet.');
  if(/url\s*\(\s*(['"]?)(?:https?:|\/\/|\/|\.\/|\.\.\/)/i.test(css))
    throw Error('Standalone stylesheet references external or local assets.');
  const safeCss=css.replace(/<\/style/gi,'<\\/style');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#07111d">
<meta name="description" content="PixelForge self-contained offline playable world">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>PixelForge Offline Adventure</title>
<style>${safeCss}</style>
</head>
<body>
<div id="root"></div>
<script type="application/json" id="pixelforge-embedded-world">${token}</script>
<script type="application/json" id="pixelforge-embedded-release">${releaseToken}</script>
<script type="application/json" id="pixelforge-embedded-extras">${extrasToken}</script>
<script type="application/json" id="pixelforge-embedded-notices">${escapeInertJson(notices)}</script>
<script type="module">${protectRawScript(js)}</script>
</body>
</html>`;
}
// Parse actual ESM syntax, not React/Three's string literals mentioning
// "import()". Dynamic and static code imports must both be absent; import.meta
// alone is not an external module fetch.
export async function assertNoExternalImports(js){
  // Site tests run before npm install; load build-only parser just before
  // packaging, after dependencies have been installed by CI.
  const {init,parse}=await import('es-module-lexer');
  await init;
  const [imports]=parse(js);
  const external=imports.filter(record=>record.d!==-2);
  if(external.length)
    throw Error('Offline runtime still contains module imports ('+external.length+').');
}
export async function buildOfflineTemplate(){
  // Site main build has already emitted dist/index.html. This second build
  // writes to a temporary directory and will not touch existing Portal/Studios.
  execFileSync(process.execPath,[path.join(site,'node_modules/vite/bin/vite.js'),
    'build','--config','vite.publisher.config.js'],{cwd:site,stdio:'inherit'});
  const entries=await readdir(scratch);
  if(entries.length!==2||!entries.includes('runtime.js')||!entries.includes('runtime.css'))
    throw Error('Offline build emitted unexpected external chunks/assets: '+entries.join(', '));
  const [js,css]=await Promise.all([
    readFile(path.join(scratch,'runtime.js'),'utf8'),
    readFile(path.join(scratch,'runtime.css'),'utf8')
  ]);
  await assertNoExternalImports(js);
  const notices=await collectRuntimeNotices();
  const html=makeOfflineTemplate(js,css,notices);
  if(Buffer.byteLength(html,'utf8')>maxTemplateBytes)
    throw Error('Offline player template exceeds the 12 MB safety budget.');
  await writeFile(path.join(output,'publisher-template.html'),html,'utf8');
  await rm(scratch,{recursive:true,force:true});
  const bytes=(await stat(path.join(output,'publisher-template.html'))).size;
  console.log('PixelForge standalone offline player template built: '+bytes+' bytes, zero external runtime files.');
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
  buildOfflineTemplate().catch(e=>{console.error(e);process.exitCode=1;});
}
