// PixelForge v5.40: bounded, portable world lighting, no I/O or executable scripting.
// Lighting values drive WebGL2 uniforms; these are not physical-light calibration.
export const DEFAULT_LIGHTING=Object.freeze({
  ambientStrength:0.38,
  ambientColor:'#ffffff',
  sunStrength:0.62,
  sunColor:'#ffffff',
  sunAzimuth:42,
  sunElevation:35,
  fogColor:'#071322',
  fogDensity:0
});

export const LIGHTING_PRESETS=Object.freeze({
  daylight:Object.freeze({
    ambientStrength:0.48,ambientColor:'#c8deff',
    sunStrength:1.1,sunColor:'#fff4d9',
    sunAzimuth:42,sunElevation:55,fogColor:'#83aed2',fogDensity:0.018
  }),
  sunset:Object.freeze({
    ambientStrength:0.30,ambientColor:'#b3b4ed',
    sunStrength:1.35,sunColor:'#ff9a58',
    sunAzimuth:-55,sunElevation:14,fogColor:'#573c67',fogDensity:0.027
  }),
  midnight:Object.freeze({
    ambientStrength:0.14,ambientColor:'#637bb7',
    sunStrength:0.23,sunColor:'#a5b4ff',
    sunAzimuth:100,sunElevation:42,fogColor:'#050c1d',fogDensity:0.012
  }),
  'neon-lab':Object.freeze({
    ambientStrength:0.42,ambientColor:'#77d9c8',
    sunStrength:0.95,sunColor:'#ff74c8',
    sunAzimuth:-35,sunElevation:30,fogColor:'#08182d',fogDensity:0.028
  })
});
export const LIGHTING_KEYS=Object.freeze(Object.keys(DEFAULT_LIGHTING));
const HEX=/^#[0-9a-fA-F]{6}$/;
const RANGES={
  ambientStrength:[0,1.5],
  sunStrength:[0,2],
  sunAzimuth:[-180,180],
  sunElevation:[0,90],
  fogDensity:[0,0.08]
};
export function validateLighting(value) {
  if(value===null||typeof value!=='object'||Array.isArray(value))
    throw Error('Lighting must be a record.');
  if(Object.keys(value).length!==LIGHTING_KEYS.length||
     Object.keys(value).some(k=>!LIGHTING_KEYS.includes(k)))
    throw Error('Lighting contains missing or unapproved keys.');
  for(const key of LIGHTING_KEYS){
    const v=value[key];
    if(key.endsWith('Color')){
      if(typeof v!=='string'||!HEX.test(v))throw Error('Invalid lighting color: '+key);
    }else {
      const range=RANGES[key];
      if(typeof v!=='number'||!Number.isFinite(v)||v<range[0]||v>range[1])
        throw Error('Lighting intensity/direction out of bounds: '+key);
    }
  }
  return value;
}
export function resolvedLighting(world) {
  return world?.lighting===undefined
    ? {...DEFAULT_LIGHTING}
    : validateLighting(world.lighting);
}
export function lightingWithPatch(base,patch) {
  validateLighting(base);
  if(patch===null||typeof patch!=='object'||Array.isArray(patch)||
    Object.keys(patch).length===0||Object.keys(patch).some(k=>!LIGHTING_KEYS.includes(k)))
    throw Error('Only approved lighting controls may be changed.');
  return validateLighting({...base,...patch});
}
export function lightingPreset(name) {
  if(!Object.hasOwn(LIGHTING_PRESETS,name))throw Error('Unknown lighting preset.');
  return validateLighting({...LIGHTING_PRESETS[name]});
}
export function matchingLightingPreset(value) {
  validateLighting(value);
  return Object.entries(LIGHTING_PRESETS).find(([,p])=>
    LIGHTING_KEYS.every(k=>p[k]===value[k]))?.[0]||'custom';
}
export function rgbOf(hex) {
  if(!HEX.test(hex))throw Error('Invalid RGB hex.');
  return [1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16)/255);
}
export function sunDirection({sunAzimuth,sunElevation}) {
  if(!Number.isFinite(sunAzimuth)||!Number.isFinite(sunElevation)||
    sunAzimuth< -180||sunAzimuth>180||sunElevation<0||sunElevation>90)
    throw Error('Invalid sunlight direction.');
  const a=sunAzimuth*Math.PI/180,e=sunElevation*Math.PI/180;
  return [Math.cos(e)*Math.sin(a),Math.sin(e),Math.cos(e)*Math.cos(a)];
}
