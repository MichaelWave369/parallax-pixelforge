// PixelForge PlayCanvas local-project export v1.
// Real static GLB + local npm/Vite PlayCanvas Engine viewer. No engine execution.
import {validateWorld} from './world.js';
import {exportUniversalGlb} from './universal-glb.js';
import {zipStore} from './godot-package.js';
import {compilePlayCanvasVisibility,playcanvasNodeName,playcanvasVisibilityRuntime} from './playcanvas-visibility.js';

const encode=text=>new TextEncoder().encode(text);
const VIEWER="import * as pc from 'playcanvas';\n\nconst canvas=document.getElementById('stage');\nconst status=document.getElementById('status');\nconst device=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGPU]});\ndevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,2);\nconst options=new pc.AppOptions();\noptions.graphicsDevice=device;\noptions.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,pc.LightComponentSystem];\noptions.resourceHandlers=[pc.TextureHandler,pc.ContainerHandler];\nconst app=new pc.AppBase(canvas);\napp.init(options);\napp.setCanvasResolution(pc.RESOLUTION_AUTO);\napp.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);\nwindow.addEventListener('resize',()=>app.resizeCanvas());\nconst camera=new pc.Entity('PixelForge Orbit Camera');\ncamera.addComponent('camera',{clearColor:new pc.Color(0.025,0.037,0.067),nearClip:0.1,farClip:500});\napp.root.addChild(camera);\nconst sun=new pc.Entity('Preview Sun');\nsun.addComponent('light',{type:'directional',intensity:1.35});\nsun.setEulerAngles(50,45,0);\napp.root.addChild(sun);\nconst point=new pc.Vec3(0,0.5,-4);\nlet yaw=0.7,pitch=0.48,radius=19;\nfunction updateCamera(){\n  const c=Math.cos(pitch);\n  camera.setPosition(point.x+radius*c*Math.sin(yaw),point.y+radius*Math.sin(pitch),point.z+radius*c*Math.cos(yaw));\n  camera.lookAt(point);\n}\nupdateCamera();\ncanvas.addEventListener('pointerdown',event=>{\n  if(event.button===0)canvas.setPointerCapture(event.pointerId);\n});\ncanvas.addEventListener('pointermove',event=>{\n  if(!(event.buttons&1))return;\n  yaw-=event.movementX*0.006;\n  pitch=Math.max(-1.3,Math.min(1.3,pitch-event.movementY*0.006));\n  updateCamera();\n});\ncanvas.addEventListener('wheel',event=>{\n  event.preventDefault();\n  radius=Math.max(2,Math.min(120,radius*Math.exp(event.deltaY*0.001)));\n  updateCamera();\n},{passive:false});\ndocument.getElementById('reset').addEventListener('click',()=>{\n  yaw=0.7;pitch=0.48;radius=19;updateCamera();\n});\napp.start();\napp.assets.loadFromUrl('./world.glb','container',(error,asset)=>{\n  if(error){\n    status.textContent='Unable to import PixelForge GLB: '+String(error);\n    console.error(error);\n    return;\n  }\n  app.root.addChild(asset.resource.instantiateRenderEntity());\n  status.textContent='World geometry loaded. Orbit: drag. Zoom: wheel. Static preview, not a game.';\n});\n";
const HTML="<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>PixelForge | PlayCanvas World Preview</title>\n<style>\n:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif}\n*{box-sizing:border-box}body{margin:0;background:#070d1b;color:#f3f6fa;overflow:hidden}\ncanvas{width:100vw;height:100vh;display:block;touch-action:none}\nheader{position:fixed;top:16px;left:16px;right:16px;display:flex;align-items:start;justify-content:space-between;gap:12px;pointer-events:none;z-index:2}\n.panel{background:#101a2bdb;border:1px solid #41607880;padding:12px 16px;border-radius:12px;max-width:520px;backdrop-filter:blur(12px);pointer-events:auto}\nstrong{font-size:13px;letter-spacing:.11em}p{font-size:12px;line-height:1.5;color:#c9d6e2;margin:7px 0 0}\nbutton{background:#21586d;border:1px solid #6dd8de;color:white;border-radius:8px;padding:10px 12px;cursor:pointer}\nbutton:focus-visible{outline:3px solid white}\n</style>\n</head>\n<body>\n<header><div class=\"panel\"><strong>PIXELFORGE x PLAYCANVAS</strong><p id=\"status\" role=\"status\">Loading local 3D geometry...</p><p>Desktop preview: drag to orbit, scroll to zoom. No collisions, gameplay or verified XR support.</p></div><div class=\"panel\"><button id=\"reset\" type=\"button\">Reset camera</button></div></header>\n<canvas id=\"stage\" aria-label=\"Imported PixelForge 3D world\"></canvas>\n<script type=\"module\" src=\"/src/main.js\"></script>\n</body>\n</html>\n";
const README="# PixelForge to PlayCanvas Engine: local 3D preview\n\nThis folder is generated from a validated PixelForge VR World v1. It is an\neditable **local PlayCanvas Engine project** with an original world.glb and a\nstatic orbit-camera viewer. It is not a hosted PlayCanvas Editor project,\na game runtime, a Quest-ready experience, or proof of runtime compatibility.\n\nRequires Node.js 22+.\n\n    npm install\n    npm run dev\n\nOpen the local address shown by Vite, usually http://localhost:5173.\nOnce npm dependencies are installed, build locally with:\n\n    npm run build\n    npm run preview\n\nThe dist/ folder is static and can be served locally without a hosted\nPlayCanvas account. The original JS source and glTF binary remain editable.\n\nThe initial npm install requires an npm source unless packages are cached.\nNo engine binaries or third-party libraries are bundled in this ZIP.\nThe viewer itself loads no CDN URLs and needs no hosted PlayCanvas login.\n\nOnly PixelForge-authored floor/block/pillar/portal cuboid geometry is included.\nIf the world had privately imported models, their actual bytes are NOT\nincluded. Explicitly authorized placeholder cubes may represent them.\nUse the separate private Godot bundle workflow for original GLB assets.\n\nCoordinate system: Y-up and right-handed. Positions, Y yaw and scale are\nglTF node transforms. Materials are simple colors; IDs are in extras.\nNo AI, scripts from source world, physics, navigation, NPCs, missions,\nlighting/fog parity, persistence, rights clearance or headset tests.\n\nThe viewer uses the open-source MIT PlayCanvas Engine, installed by npm.\nDocs: https://developer.playcanvas.com/user-manual/engine/standalone/\n";
export function exportPlayCanvasProject(world,settings={}){
  validateWorld(world);
  if(!settings||typeof settings!=='object'||Array.isArray(settings)||
     Object.keys(settings).some(key=>!['allowPlaceholders','behavior'].includes(key))||
     (settings.allowPlaceholders!==undefined&&typeof settings.allowPlaceholders!=='boolean'))
    throw Error('Invalid PlayCanvas export settings.');
  const behavior=settings.behavior===undefined?null:compilePlayCanvasVisibility(world,settings.behavior);
  // Unique target names are emitted only for behavioral projects. Plain GLB export is unchanged.
  const exportWorld=behavior
    ? {...world,objects:world.objects.map(object=>({...object,name:playcanvasNodeName(object.id)}))}
    : world;
  const artifact=exportUniversalGlb(exportWorld,{allowPlaceholders:settings.allowPlaceholders===true});
  const anchor="  app.root.addChild(asset.resource.instantiateRenderEntity());";
  const behaviorViewer=behavior?VIEWER.replace(
    anchor,
    "  const imported=asset.resource.instantiateRenderEntity();\n  app.root.addChild(imported);\n"+playcanvasVisibilityRuntime(behavior)
  ).replace(
    "  status.textContent='World geometry loaded. Orbit: drag. Zoom: wheel. Static preview, not a game.';",
    ""
  ):VIEWER;
  if(behavior&&!behaviorViewer.includes('visibility rule(s) active'))throw Error('Viewer behavior injection failed.');
  const project={
    name:'pixelforge-playcanvas-preview',version:'1.0.0',private:true,type:'module',
    scripts:{dev:'vite --host 127.0.0.1',build:'vite build',preview:'vite preview --host 127.0.0.1'},
    dependencies:{playcanvas:'2.23.3'},devDependencies:{vite:'^7.1.0'},
    engines:{node:'>=22'}
  };
  const manifest={
    schema:'pixelforge.playcanvas-preview.v1',sourceFormat:world.format,
    title:world.title,objectCount:world.objects.length,
    placeholderCount:artifact.report.placeholderCount,
    status:behavior?'KEY_VISIBILITY_RUNTIME_GENERATED_NOT_BROWSER_VERIFIED':'PROJECT_GENERATED_ENGINE_RUNTIME_UNTESTED',
    behavior:behavior?{schema:behavior.schema,rules:behavior.rules}:null,
    sourceAssetRights:'No third-party GLB asset bytes included',
    limitations:[
      'Requires local npm install of MIT PlayCanvas Engine and Vite',
      behavior?'Static camera preview with only E/F/Space key-release show/hide behavior; no physics, NPCs or XR':'Static GLB camera preview only: no original gameplay, scripts, physics, NPCs or XR',
      'Generated JavaScript has no runtime authority over source PixelForge world'
    ]
  };
  const entries=[
    {path:'package.json',bytes:encode(JSON.stringify(project,null,2)+'\n')},
    {path:'index.html',bytes:encode(HTML)},
    {path:'src/main.js',bytes:encode(behaviorViewer)},
    {path:'vite.config.js',bytes:encode("export default {base:'./'};\n")},
    {path:'public/world.glb',bytes:artifact.bytes},
    ...(behavior?[{path:'public/gameplay.json',bytes:encode(JSON.stringify(behavior,null,2)+'\n')}]:[]),
    {path:'manifest.json',bytes:encode(JSON.stringify(manifest,null,2)+'\n')},
    {path:'README.md',bytes:encode(README+(behavior?'\nOPTIONAL GAMEPLAY: This project includes a bounded E/F/Space key-release visibility rule. Imported target names are PF_ID_<source-id>, mapped in public/gameplay.json. The target is enabled or disabled by PlayCanvas GraphNode.enabled. The compiled browser viewer is not yet validated in a running PlayCanvas installation.\n':''))}
  ];
  return Object.freeze({
    filename:'pixelforge-playcanvas-local-project.zip',
    mime:'application/zip',bytes:zipStore(entries),
    report:Object.freeze({status:manifest.status,
      objectCount:world.objects.length,placeholderCount:artifact.report.placeholderCount,
      behaviorCount:behavior?.rules.length||0})
  });
}
