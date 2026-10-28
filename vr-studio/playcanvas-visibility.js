// PlayCanvas adapter for the portable key-release visibility gameplay contract.
// Compile only validated identifiers and allowlisted actions, never user scripts.
import {validateGameplayBlueprint} from './gameplay-keys.js';

export const PLAYCANVAS_BEHAVIOR_FORMAT='pixelforge.playcanvas.key-visibility.v1';
export const playcanvasNodeName=id=>'PF_ID_'+id;
export function compilePlayCanvasVisibility(world,blueprint){
  const safe=validateGameplayBlueprint(world,blueprint);
  return {
    schema:PLAYCANVAS_BEHAVIOR_FORMAT,
    sourceSchema:safe.schema,
    worldFormat:safe.worldFormat,
    worldTitle:safe.worldTitle,
    rules:safe.rules.map(rule=>({
      id:rule.id,on:rule.on,key:rule.key,
      targetId:rule.targetId,entityName:playcanvasNodeName(rule.targetId),
      effect:rule.effect
    }))
  };
}
// Generator-owned code only; the blueprint supplies JSON data, never executable text.
// Resolve all entity IDs on load, refuse ambiguous matches, and handle exact keyup actions.
export function playcanvasVisibilityRuntime(compiled){
  if(!compiled||compiled.schema!==PLAYCANVAS_BEHAVIOR_FORMAT ||
     !Array.isArray(compiled.rules)||!compiled.rules.length)
    throw new Error('Invalid compiled PlayCanvas behavior.');
  const statements=[
    '  const controls='+JSON.stringify(compiled)+';',
    '  const available=new Map();',
    '  const names=new Set(controls.rules.map(rule=>rule.entityName));',
    '  const stack=[imported];',
    '  while(stack.length){',
    '    const node=stack.pop();',
    '    if(names.has(node.name)){',
    '      if(!available.has(node.name))available.set(node.name,[]);',
    '      available.get(node.name).push(node);',
    '    }',
    '    for(const child of node.children||[])stack.push(child);',
    '  }',
    '  const unresolved=[...names].filter(name=>available.get(name)?.length!==1);',
    '  if(unresolved.length){',
    "    status.textContent='Visibility controls not activated: missing or ambiguous objects '+unresolved.join(', ');",
    "    console.warn('PixelForge: no gameplay listener installed',unresolved);",
    '  }else{',
    '    const targets=new Map([...available].map(([name,nodes])=>[name,nodes[0]]));',
    "    window.addEventListener('keyup',event=>{",
    '      if(event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;',
    "      if(event.target?.closest?.('input,textarea,select,button'))return;",
    "      const key=event.key===' '?'space':String(event.key).toLowerCase();",
    "      if(key!=='e'&&key!=='f'&&key!=='space')return;",
    '      for(const rule of controls.rules){',
    '        if(rule.key!==key)continue;',
    '        const target=targets.get(rule.entityName);',
    '        if(!target)continue;',
    "        target.enabled=rule.effect==='show';",
    "        status.textContent='Object '+rule.targetId+' '+rule.effect+' on '+key.toUpperCase()+' release.';",
    '      }',
    '    });',
    "    status.textContent='World loaded. '+controls.rules.length+' visibility rule(s) active. Release assigned key to show/hide an object.';",
    '  }'
  ];
  return statements.join('\n');
}
