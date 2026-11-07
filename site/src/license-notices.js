// Third-party license texts are bundled by the trusted CI/build process.
// This reader never fetches licenses at runtime and never executes their text.
export const NOTICES_FORMAT='pixelforge.bundled-notices.v1';
export const NOTICES_MAX_BYTES=100_000;
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
export const RUNTIME_PACKAGES=[
  {name:'PixelForge',version:'2026',license:'MIT'},
  {name:'react',version:'19.2.0',license:'MIT'},
  {name:'react-dom',version:'19.2.0',license:'MIT'},
  {name:'three',version:'0.180.0',license:'MIT'},
  {name:'@dimforge/rapier3d-compat',version:'0.20.0',license:'Apache-2.0'}
];
export function validateBundledNotices(value){
  if(!plain(value)||Object.keys(value).length!==2||value.format!==NOTICES_FORMAT||
    !Array.isArray(value.packages)||value.packages.length>RUNTIME_PACKAGES.length)
    throw Error('Unsupported bundled license notices.');
  const packages=value.packages.map(entry=>{
    if(!plain(entry)||Object.keys(entry).length!==4||
      !['name','version','license','text'].every(k=>Object.hasOwn(entry,k)))
      throw Error('Malformed third-party notice.');
    const expected=RUNTIME_PACKAGES.find(x=>x.name===entry.name);
    if(!expected||entry.version!==expected.version||entry.license!==expected.license||
      typeof entry.text!=='string'||!entry.text.trim()||entry.text.length>18_000)
      throw Error('Unknown or malformed bundled dependency license.');
    return {name:expected.name,version:expected.version,license:expected.license,text:entry.text};
  });
  if(new Set(packages.map(x=>x.name)).size!==packages.length)
    throw Error('Duplicate bundled dependency license.');
  if(new TextEncoder().encode(JSON.stringify(value)).length>NOTICES_MAX_BYTES)
    throw Error('Bundled license notices exceed the limit.');
  return {format:NOTICES_FORMAT,packages};
}
export function emptyBundledNotices(){
  return {format:NOTICES_FORMAT,packages:[]};
}
