// PixelForge Metroidvania Maker v1: a bounded, data-only world graph.
// This is a planning contract, not an executable game or engine adapter.
export const METROIDVANIA_SCHEMA = 'pixelforge.metroidvania-world.v1';
export const LIMITS = Object.freeze({rooms:32,links:96,abilities:16,bytes:65536});
const ID = /^[a-z][a-z0-9-]{0,47}$/;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function fail(message){throw new Error('Metroidvania world: '+message);}
function exact(value,fields,label){
  if(!record(value))fail(label+' must be an object.');
  const allowed=new Set(fields);
  if(Object.keys(value).some(k=>!allowed.has(k)))fail(label+' has unsupported fields.');
}
function string(value,max,label){
  if(typeof value!=='string'||!value.trim()||value.length>max)fail(label+' must be non-empty text of at most '+max+' characters.');
  return value.trim();
}
function ident(value,label){
  if(typeof value!=='string'||!ID.test(value))fail(label+' must be a lowercase, hyphenated ID.');
  return value;
}
function ids(values,label,max,allowed){
  if(!Array.isArray(values)||values.length>max)fail(label+' must be a bounded array.');
  if(new Set(values).size!==values.length)fail(label+' contains duplicates.');
  return values.map((id,i)=>{
    const key=ident(id,label+' #'+i);
    if(allowed&&!allowed.has(key))fail(label+' references unknown ability '+key+'.');
    return key;
  });
}
function unique(values,label){if(new Set(values).size!==values.length)fail('duplicate '+label+' ID.');}
export function validateMetroidvaniaWorld(input){
  exact(input,['format','title','startRoom','abilities','rooms','links'],'root');
  if(input.format!==METROIDVANIA_SCHEMA)fail('unsupported format.');
  const title=string(input.title,100,'title');
  if(!Array.isArray(input.abilities)||input.abilities.length>LIMITS.abilities)fail('invalid abilities count.');
  const abilities=input.abilities.map((a,i)=>{
    exact(a,['id','name'],'ability '+i);
    return {id:ident(a.id,'ability ID'),name:string(a.name,60,'ability name')};
  });
  unique(abilities.map(a=>a.id),'ability');
  const abilityIds=new Set(abilities.map(a=>a.id));
  if(!Array.isArray(input.rooms)||input.rooms.length<1||input.rooms.length>LIMITS.rooms)fail('requires 1–32 rooms.');
  const rooms=input.rooms.map((r,i)=>{
    exact(r,['id','name','x','y','grants'],'room '+i);
    if(!Number.isInteger(r.x)||r.x<0||r.x>100||!Number.isInteger(r.y)||r.y<0||r.y>100)fail('room coordinates must be integers from 0 to 100.');
    return {id:ident(r.id,'room ID'),name:string(r.name,80,'room name'),x:r.x,y:r.y,
      grants:ids(r.grants,'room grants',LIMITS.abilities,abilityIds)};
  });
  unique(rooms.map(r=>r.id),'room');
  const roomIds=new Set(rooms.map(r=>r.id));
  const startRoom=ident(input.startRoom,'startRoom');
  if(!roomIds.has(startRoom))fail('startRoom must exist.');
  if(!Array.isArray(input.links)||input.links.length>LIMITS.links)fail('invalid links count.');
  const links=input.links.map((link,i)=>{
    exact(link,['id','from','to','requires','twoWay'],'link '+i);
    const from=ident(link.from,'link from'),to=ident(link.to,'link to');
    if(!roomIds.has(from)||!roomIds.has(to)||from===to)fail('links need two different existing rooms.');
    if(typeof link.twoWay!=='boolean')fail('link twoWay must be boolean.');
    return {id:ident(link.id,'link ID'),from,to,requires:ids(link.requires,'link requirements',LIMITS.abilities,abilityIds),
      twoWay:link.twoWay};
  });
  unique(links.map(l=>l.id),'link');
  // Preserve JSON-only, deterministic ordering; no URLs, scripts, actions or file paths.
  const normalized={format:METROIDVANIA_SCHEMA,title,startRoom,abilities,rooms,links};
  if(new TextEncoder().encode(JSON.stringify(normalized)).length>LIMITS.bytes)fail('world exceeds size limit.');
  return normalized;
}
export function analyzeMetroidvaniaWorld(input){
  const world=validateMetroidvaniaWorld(input);
  const found=new Set([world.startRoom]),unlocked=new Set(),steps=[];
  for(let pass=0;pass<=LIMITS.rooms+LIMITS.abilities;pass++){
    const newAbilities=[];
    for(const room of world.rooms){
      if(!found.has(room.id))continue;
      for(const ability of room.grants){
        if(!unlocked.has(ability)){unlocked.add(ability);newAbilities.push(ability);}
      }
    }
    const newRooms=[];
    for(const link of world.links){
      if(!link.requires.every(ability=>unlocked.has(ability)))continue;
      let target=null;
      if(found.has(link.from)&&!found.has(link.to))target=link.to;
      else if(link.twoWay&&found.has(link.to)&&!found.has(link.from))target=link.from;
      if(target){found.add(target);newRooms.push(target);}
    }
    // Traversal may require multiple passes for chained connections.
    if(newAbilities.length||newRooms.length)steps.push({
      pass:steps.length+1,newAbilities,newRooms,visited:[...found],unlocked:[...unlocked]
    });
    if(!newAbilities.length&&!newRooms.length)break;
  }
  return {reachable:[...found],unlocked:[...unlocked],
    unreachable:world.rooms.filter(r=>!found.has(r.id)).map(r=>r.id),
    stages:[{pass:0,newAbilities:[],newRooms:[world.startRoom],visited:[world.startRoom],unlocked:[]},...steps]};
}
const SAMPLE={
  format:METROIDVANIA_SCHEMA,title:'The Ashen Belfry',startRoom:'outer-gate',
  abilities:[{id:'shadow-dash',name:'Shadow Dash'},{id:'wall-climb',name:'Wall Climb'},{id:'mist-form',name:'Mist Form'}],
  rooms:[
    {id:'outer-gate',name:'Outer Gate',x:10,y:65,grants:[]},
    {id:'cathedral-nave',name:'Cathedral Nave',x:33,y:56,grants:[]},
    {id:'forgotten-crypt',name:'Forgotten Crypt',x:36,y:87,grants:['shadow-dash']},
    {id:'bell-tower',name:'Bell Tower',x:64,y:31,grants:['wall-climb']},
    {id:'moon-library',name:'Moon Library',x:74,y:68,grants:['mist-form']},
    {id:'ashen-sanctum',name:'Ashen Sanctum',x:92,y:16,grants:[]}
  ],
  links:[
    {id:'entry-hall',from:'outer-gate',to:'cathedral-nave',requires:[],twoWay:true},
    {id:'crypt-stairs',from:'cathedral-nave',to:'forgotten-crypt',requires:[],twoWay:true},
    {id:'dash-gap',from:'cathedral-nave',to:'bell-tower',requires:['shadow-dash'],twoWay:true},
    {id:'climb-route',from:'bell-tower',to:'moon-library',requires:['wall-climb'],twoWay:true},
    {id:'sanctum-sigil',from:'moon-library',to:'ashen-sanctum',requires:['mist-form'],twoWay:true},
    {id:'crypt-shortcut',from:'forgotten-crypt',to:'moon-library',requires:['wall-climb'],twoWay:true}
  ]
};
export function createMetroidvaniaStarter(){return validateMetroidvaniaWorld(SAMPLE);}
