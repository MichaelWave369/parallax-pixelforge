// PixelForge -> GDevelop 5 native cube-scene bridge.
// Uses GDevelop's built-in Scene3D::Cube3DObject structure, grounded in official
// GDevelop-examples/3d-light-playground/3d-light-playground.json (Oct 2026).
// Produces editable cube instances and empty visual event sheet, not a playable game.
import {validateWorld} from './world.js';
import {zipStore} from './godot-package.js';
import {validateGameplayBlueprint,compileGDevelopVisibilityEvents} from './gameplay-keys.js';

const encode=x=>new TextEncoder().encode(x);
const PNG_WHITE=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
export const GDEVELOP_UNITS_PER_PF_UNIT=100;
const texture='assets/neutral-white.png';
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const hashedUuid=input=>{
  // Deterministic identifiers; do not expose private player metadata or random authority.
  let h=2166136261;
  const accum=[];
  for(let part=0;part<4;part++){
    let state=(h^((part+1)*0x9e3779b9))>>>0;
    for(let i=0;i<input.length;i++){state=Math.imul(state^input.charCodeAt(i),16777619)>>>0;}
    accum.push(state.toString(16).padStart(8,'0'));
  }
  const x=accum.join('');
  return x.slice(0,8)+'-'+x.slice(8,12)+'-'+x.slice(12,16)+'-'+x.slice(16,20)+'-'+x.slice(20,32);
};
const renderName=(i)=>'PF_Obj_'+String(i+1).padStart(3,'0');
const rnd=n=>Number(n.toFixed(5));
const size=n=>Math.max(1,rnd(n*GDEVELOP_UNITS_PER_PF_UNIT));
const cubeContent=(object)=>({
  width:size(object.scale[0]),height:size(object.scale[2]),depth:size(object.scale[1]),
  enableTextureTransparency:false,facesOrientation:'Y',
  backFaceUpThroughWhichAxisRotation:'X',
  materialType:'StandardWithoutMetalness',
  tint:rgb(object.color).join(';'),
  isCastingShadow:false,isReceivingShadow:true,
  ...Object.fromEntries(['front','back','left','right','top','bottom'].flatMap(face=>[
    [face+'FaceResourceName',texture],
    [face+'FaceVisible',true],
    [face+'FaceResourceRepeat',false]
  ]))
});
function sourceInstance(o,i){
  const width=size(o.scale[0]),height=size(o.scale[2]),depth=size(o.scale[1]);
  return {
    name:renderName(i),persistentUuid:hashedUuid('instance-'+o.id),
    angle:rnd(o.yaw),rotationX:0,rotationY:0,
    customSize:true,width,height,depth,keepRatio:false,
    // GDevelop uses X/Y as the ground plane and Z for height; PixelForge uses
    // X/Z as ground and Y for height. This is an approximate center->origin mapping.
    x:rnd(640+(o.position[0]*100)-(width/2)),
    y:rnd(360-(o.position[2]*100)-(height/2)),
    z:rnd((o.position[1]*100)-(depth/2)),
    layer:'',locked:false,zOrder:1,
    numberProperties:[],stringProperties:[],initialVariables:[]
  };
}
function sourceObject(o,i){
  return {
    assetStoreId:'',name:renderName(i),
    persistentUuid:hashedUuid('definition-'+o.id),
    type:'Scene3D::Cube3DObject',variables:[],effects:[],behaviors:[],
    content:cubeContent(o)
  };
}
function baseLayer(){
  return {
    ambientLightColorR:175,ambientLightColorG:185,ambientLightColorB:205,
    camera2DPlaneMaxDrawingDistance:5000,
    camera3DFarPlaneDistance:10000,camera3DFieldOfView:45,
    camera3DNearPlaneDistance:3,cameraType:'',
    followBaseLayerCamera:false,isLightingLayer:false,isLocked:false,
    name:'',renderingType:'',visibility:true,
    cameras:[{defaultSize:true,defaultViewport:true,height:0,
      viewportBottom:1,viewportLeft:0,viewportRight:1,viewportTop:0,width:0}],
    effects:[]
  };
}
function makeNativeProject(world){
  const objects=world.objects.map(sourceObject);
  const instances=world.objects.map(sourceInstance);
  return {
    firstLayout:'PixelForgeWorld',gdVersion:{build:279,major:5,minor:6,revision:0},
    properties:{
      adaptGameResolutionAtRuntime:true,folderProject:false,
      orientation:'landscape',
      packageName:'io.pixelforge.gdevelopbridge',
      pixelsRounding:false,
      projectUuid:hashedUuid('project-'+world.title+world.objects.map(o=>o.id).join(',')),
      scaleMode:'linear',sizeOnStartupMode:'',useExternalSourceFiles:false,
      version:'1.0.0',name:world.title,
      author:'',windowWidth:1280,windowHeight:720,
      latestCompilationDirectory:'',maxFPS:60,minFPS:20,verticalSync:false,
      platformSpecificAssets:{},
      loadingScreen:{
        backgroundColor:723723,backgroundFadeInDuration:0.2,
        backgroundImageResourceName:'',gdevelopLogoStyle:'light',
        logoAndProgressFadeInDuration:0.2,logoAndProgressLogoFadeInDelay:0,
        minDuration:1.5,progressBarColor:16777215,
        progressBarHeight:20,progressBarMaxWidth:200,
        progressBarWidthPercent:30,showGDevelopSplash:true,showProgressBar:true
      },
      authorIds:[],extensionProperties:[],
      platforms:[{name:'GDevelop JS platform'}],
      currentPlatform:'GDevelop JS platform'
    },
    resources:{resources:[{
      alwaysLoaded:false,file:texture,kind:'image',metadata:'',
      name:texture,smoothed:false,userAdded:true
    }],resourceFolders:[]},
    objects:[],objectsFolderStructure:{folderName:'__ROOT',children:[]},
    objectsGroups:[],variables:[],
    layouts:[{
      b:31,disableInputWhenNotFocused:true,mangledName:'PixelForgeWorld',
      name:'PixelForgeWorld',r:21,standardSortMethod:true,
      stopSoundsOnStartup:true,title:'',v:53,
      uiSettings:{
        grid:false,gridType:'rectangular',gridWidth:32,gridHeight:32,
        gridOffsetX:0,gridOffsetY:0,gridColor:10401023,
        gridAlpha:0.8,snap:true,zoomFactor:0.5,windowMask:false
      },
      objectsGroups:[],variables:[],instances,objects,
      objectsFolderStructure:{folderName:'__ROOT',children:objects.map(o=>({objectName:o.name}))},
      events:[],layers:[baseLayer()],behaviorsSharedData:[]
    }],
    externalEvents:[],externalLayouts:[],eventsFunctionsExtensions:[],tests:[]
  };
}
export function exportGDevelopProject(world,options={}){
  validateWorld(world);
  if(!options||typeof options!=='object'||Array.isArray(options)||
      Object.keys(options).some(k=>!['allowPlaceholders','behavior'].includes(k))||
      (options.allowPlaceholders!==undefined && typeof options.allowPlaceholders!=='boolean'))
    throw Error('Invalid GDevelop export options.');
  const proxies=world.objects.filter(o=>o.kind==='asset-proxy');
  if(proxies.length&&!options.allowPlaceholders)
    throw Error('GDevelop cannot embed private GLB models via this native cube adapter. Explicitly approve cuboid placeholders.');
  const native=makeNativeProject(world);
  const behavior=options.behavior===undefined?null:validateGameplayBlueprint(world,options.behavior);
  if(behavior)native.layouts[0].events=compileGDevelopVisibilityEvents(world,behavior);
  const manifest={
    schema:'pixelforge.gdevelop-cubes.v1',sourceFormat:world.format,
    sourceTitle:world.title,
    objectCount:world.objects.length,proxyPlaceholders:proxies.length,
    behavior:behavior?{schema:behavior.schema,rules:behavior.rules}:null,
    sourceToObject:world.objects.map((o,i)=>({
      id:o.id,name:o.name,kind:o.kind,gdevelopObjectName:renderName(i),
      sourceColor:o.color,placeholderOnly:o.kind==='asset-proxy'
    })),
    status:behavior?'NATIVE_VISIBILITY_EVENTS_EDITOR_UNTESTED':'NATIVE_PROJECT_JSON_GENERATED_GDEVELOP_EDITOR_UNTESTED',
    notes:[
      behavior?'3D cuboids and native KeyReleased to Hide/Show visual events, user defined; editor acceptance pending':'3D cuboids with editable GDevelop object definitions and instances, plus blank visual event sheet',
      'Source X/Y/Z are mapped to GDevelop X/Z vertical/Y ground (100 units per source unit)',
      '3D rotations and camera framing are approximations until real GDevelop editor acceptance',
      'No native sprite character, movement events, interactions, physics, scripts or imported GLB bytes',
      'Only an original white pixel image and simple per-object tint are bundled'
    ]
  };
  const readme=[
    '# PixelForge GDevelop native cube scene v1',
    '',
    'Extract into a new local directory. In GDevelop desktop, open game.json as a project.',
    'Inspect the PixelForgeWorld scene and its 3D cubes in the scene editor.',
    'Objects can be edited and visual events added using GDevelop native tools.',
    behavior?'The visual event sheet includes native KeyReleased and Hide/Show actions; not yet verified in GDevelop Editor.':'The event sheet is initially EMPTY; this is a scaffold, not a playable game.',
    '',
    'Coordinate handoff: PixelForge X -> GDevelop X, -Z -> GDevelop Y, Y -> GDevelop Z.',
    'World units scale by 100, and source centers are converted to GDevelop instance origins.',
    'Object Y rotation is approximated as GDevelop Z rotation (angle).',
    'Check rotation/pivots, camera placement, and colors visually before using in production.',
    '',
    'The only image is an original 1 x 1 white PNG tint source.',
    'Purchased GLB models are never bundled. Explicit placeholder export is geometry only.',
    'No GDevelop Editor binary, cloud account, game scripts, physics, collision, AI or XR included.',
    'This ZIP is not a verified GDevelop import or a redistribution license.',
    '',
    'Schema reference: https://github.com/GDevelopApp/GDevelop-examples/tree/main/examples/3d-light-playground',
    ''
  ].join('\n');
  const files=[
    {path:'game.json',bytes:encode(JSON.stringify(native,null,2)+'\n')},
    {path:texture,bytes:PNG_WHITE},
    {path:'pixelforge-manifest.json',bytes:encode(JSON.stringify(manifest,null,2)+'\n')},
    {path:'README.md',bytes:encode(readme)}
  ];
  return Object.freeze({
    filename:'pixelforge-gdevelop-native-3d.zip',
    mime:'application/zip',bytes:zipStore(files),
    project:native,
    report:Object.freeze({status:manifest.status,
      objects:world.objects.length,placeholders:proxies.length,behaviorCount:behavior?.rules.length||0})
  });
}
