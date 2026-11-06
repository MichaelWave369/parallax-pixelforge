import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import RAPIER from '@dimforge/rapier3d-compat';

const FIXED_STEP=1/60;
const MAX_BODIES=250;
const PALETTE=[0x50e4cf,0xfcb75b,0xb28bff,0xf675bd,0x62aaff];
function PhysicsStage({paused=false,gravity=-9.81,onStats,onStatus,sceneObjects=null,onObjectClick,walkMode=false,
    selectedObjectId=null,gizmoMode='inspect',gizmoSnap=null,onTransformCommit=null,sceneKey=null},ref) {
  const mountRef=useRef(null),apiRef=useRef(null),pausedRef=useRef(paused),gravityRef=useRef(gravity);
  const statsRef=useRef(onStats),statusRef=useRef(onStatus);
  const sceneObjectsRef=useRef(sceneObjects),selectionRef=useRef(onObjectClick),walkRef=useRef(walkMode);
  const sceneKeyRef=useRef(sceneKey),gizmoOptionsRef=useRef({selectedObjectId,gizmoMode,gizmoSnap});
  const commitRef=useRef(onTransformCommit);
  const [error,setError]=useState('');
  useEffect(()=>{pausedRef.current=paused;apiRef.current?.syncGizmo();},[paused]);
  useEffect(()=>{gravityRef.current=gravity;},[gravity]);
  useEffect(()=>{statsRef.current=onStats;statusRef.current=onStatus;selectionRef.current=onObjectClick;},[onStats,onStatus,onObjectClick]);
  useEffect(()=>{
    const frame=sceneKeyRef.current!==sceneKey;
    sceneKeyRef.current=sceneKey;
    sceneObjectsRef.current=sceneObjects;
    apiRef.current?.loadScene(frame);
  },[sceneObjects,sceneKey]);
  useEffect(()=>{walkRef.current=walkMode;apiRef.current?.loadScene(true);},[walkMode]);
  useEffect(()=>{
    gizmoOptionsRef.current={selectedObjectId,gizmoMode,gizmoSnap};
    commitRef.current=onTransformCommit;
    apiRef.current?.syncGizmo();
  },[selectedObjectId,gizmoMode,gizmoSnap,onTransformCommit]);
  useImperativeHandle(ref,()=>({
    spawn:shape=>apiRef.current?.spawn(shape),
    reset:()=>apiRef.current?.reset()
  }),[]);
  useEffect(()=>{
    let cancelled=false,renderer=null,controls=null,resizeObserver=null,world=null,scene=null;
    let dynamic=[],environment=[],canvas=null,player=null,gizmo=null,outline=null;
    let dragStarted=false,ignoreNextClick=false;
    const disposeOutline=()=>{
      if(!outline)return;
      scene.remove(outline);outline.geometry.dispose();outline.material.dispose();outline=null;
    };
    const syncGizmo=()=>{
      if(!scene)return;
      if(gizmo)gizmo.detach();
      disposeOutline();
      const options=gizmoOptionsRef.current;
      const selected=[...environment,...dynamic.map(d=>d.mesh)].find(m=>m.userData.sourceObjectId===options.selectedObjectId);
      if(!selected)return;
      outline=new THREE.BoxHelper(selected,0xffdc84);
      scene.add(outline);
      if(!gizmo||!pausedRef.current||walkRef.current||options.gizmoMode==='inspect'||!sceneObjectsRef.current)return;
      const record=sceneObjectsRef.current.find(o=>o.id===options.selectedObjectId);
      if(!record||record.proxy)return;
      gizmo.attach(selected);
      gizmo.setMode(options.gizmoMode);
      gizmo.setSpace('world');
      gizmo.showX=options.gizmoMode!=='rotate';
      gizmo.showY=true;
      gizmo.showZ=options.gizmoMode!=='rotate';
      // VR World v1 is strictly yaw-only. Disable screen/free rotation
      // and all plane handles, not merely the X/Z axis rings.
      gizmo.showE=false;gizmo.showXYZE=false;
      gizmo.showXY=false;gizmo.showYZ=false;gizmo.showXZ=false;
      gizmo.minX=-100;gizmo.maxX=100;
      gizmo.minY=-100;gizmo.maxY=100;
      gizmo.minZ=-100;gizmo.maxZ=100;
      gizmo.setTranslationSnap(options.gizmoSnap?.translation||null);
      gizmo.setRotationSnap(options.gizmoSnap?.rotation?THREE.MathUtils.degToRad(options.gizmoSnap.rotation):null);
      gizmo.setScaleSnap(options.gizmoSnap?.scale||null);
    };
    const held=new Set();
    const onKeyDown=e=>{
      if(e.key==='Escape'&&apiRef.current?.cancelTransform?.()){e.preventDefault();return;}
      if(!walkRef.current||/^(input|textarea|select)$/i.test(e.target?.tagName||''))return;
      const k=e.key.toLowerCase();
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){held.add(k);e.preventDefault();}
    };
    const onKeyUp=e=>held.delete(e.key.toLowerCase());
    window.addEventListener('keydown',onKeyDown);
    window.addEventListener('keyup',onKeyUp);
    const clearDynamic=()=>{
      for(const item of dynamic){scene.remove(item.mesh);item.mesh.geometry.dispose();item.mesh.material.dispose();}
      dynamic=[];player=null;
    };
    async function initialize() {
      try {
        await RAPIER.init();
        if(cancelled)return;
        const mount=mountRef.current;
        if(!mount)return;
        scene=new THREE.Scene();
        scene.background=new THREE.Color(0x080f25);
        scene.fog=new THREE.Fog(0x080f25,20,43);
        const camera=new THREE.PerspectiveCamera(53,1,0.1,100);
        camera.position.set(12,12,17);
        renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
        renderer.outputColorSpace=THREE.SRGBColorSpace;
        canvas=renderer.domElement;
        mount.appendChild(canvas);
        controls=new OrbitControls(camera,canvas);
        controls.target.set(0,2,0);
        controls.enableDamping=true;
        controls.maxDistance=40;
        controls.minDistance=5;
        controls.maxPolarAngle=Math.PI/2.02;
        controls.update();
        scene.add(new THREE.HemisphereLight(0x93c9ff,0x15203a,2.1));
        const sun=new THREE.DirectionalLight(0xffddaf,2.5);
        sun.position.set(7,12,5);scene.add(sun);
        const grid=new THREE.GridHelper(16,16,0x6b49ac,0x2f395b);
        grid.position.y=0.012;scene.add(grid);
        function addStatic(size,pos,color) {
          const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.68,metalness:.18}));
          mesh.position.set(...pos);
          scene.add(mesh);environment.push(mesh);
          world.createCollider(RAPIER.ColliderDesc.cuboid(size[0]/2,size[1]/2,size[2]/2).setTranslation(...pos).setFriction(.85));
        }
        function addAuthoredObject(o) {
          const material=new THREE.MeshStandardMaterial({
            color:new THREE.Color(o.color),
            roughness:.62,
            metalness:.12,
            transparent:o.proxy||o.body==='none',
            opacity:o.proxy?.45:o.body==='none'?.7:1
          });
          const mesh=new THREE.Mesh(new THREE.BoxGeometry(...o.scale),material);
          mesh.position.set(...o.position);
          mesh.rotation.y=o.yaw*Math.PI/180;
          mesh.userData.sourceObjectId=o.id;
          scene.add(mesh);
          if(o.proxy||o.body==='none'){environment.push(mesh);return;}
          const q={x:0,y:Math.sin(o.yaw*Math.PI/360),z:0,w:Math.cos(o.yaw*Math.PI/360)};
          const bodyDesc=(o.body==='dynamic'?RAPIER.RigidBodyDesc.dynamic():RAPIER.RigidBodyDesc.fixed())
            .setTranslation(...o.position).setRotation(q);
          if(o.body==='dynamic')bodyDesc.setCcdEnabled(true);
          const body=world.createRigidBody(bodyDesc);
          const collider=RAPIER.ColliderDesc.cuboid(o.scale[0]/2,o.scale[1]/2,o.scale[2]/2)
            .setFriction(o.friction).setRestitution(o.restitution);
          world.createCollider(collider,body);
          if(o.body==='dynamic')dynamic.push({mesh,body});else environment.push(mesh);
        }
        function addWalkAvatar(authored){
          const floor=authored.find(o=>o.kind==='floor'&&o.body!=='none');
          const center=floor||authored[0];
          const x=center?.position[0]??0,z=center?.position[2]??0;
          const y=(center?.position[1]??0)+(center?.scale[1]??0)/2+2.2;
          const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.33,1,6,10),
            new THREE.MeshStandardMaterial({color:0xffd36d,emissive:0x40240c,roughness:.4}));
          const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x,y,z).lockRotations().setLinearDamping(.9).setCcdEnabled(true));
          world.createCollider(RAPIER.ColliderDesc.capsule(.5,.33).setFriction(.8),body);
          scene.add(mesh);player={body,mesh};dynamic.push(player);
          controls.target.set(x,y,z);camera.position.set(x+8,y+6,z+9);controls.update();
        }
        const makeWorld=(frame=true)=>{
          if(gizmo)gizmo.detach();
          disposeOutline();
          clearDynamic();
          if(world)world.free();
          world=new RAPIER.World({x:0,y:gravityRef.current,z:0});
          world.timestep=FIXED_STEP;
          for(const mesh of environment){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
          environment=[];
          const authored=sceneObjectsRef.current;
          if(Array.isArray(authored)){
            for(const o of authored)addAuthoredObject(o);
            if(!authored.some(o=>o.kind==='floor'&&o.body!=='none'))
              addStatic([16,.4,16],[0,-.2,0],0x28334d);
            if(walkRef.current)addWalkAvatar(authored);
            else if(frame) {
              const center=authored.find(o=>o.kind==='floor')||authored[0];
              controls.target.set(center?.position[0]??0,center?.position[1]??1,center?.position[2]??0);
              camera.position.set(controls.target.x+12,controls.target.y+11,controls.target.z+16);
              controls.update();
            }
          }else{
            addStatic([16,.4,16],[0,-.2,0],0x28334d);
            addStatic([4,.35,3],[-3,1.1,-2],0x365472);
            addStatic([3,.35,3],[3,2.3,0],0x563b75);
            addStatic([2,.35,3],[0,.85,3],0x285f68);
            for(let i=0;i<8;i++)spawn(i%3===0?'ball':'box',true);
          }
          syncGizmo();
          statsRef.current?.({fps:0,bodies:dynamic.length});
        };
        function spawn(shape='box',initial=false) {
          if(dynamic.length>=MAX_BODIES)return;
          const ball=shape==='ball';
          const size=ball?.42:.82;
          const geometry=ball?new THREE.SphereGeometry(.42,18,12):new THREE.BoxGeometry(size,size,size);
          const material=new THREE.MeshStandardMaterial({color:PALETTE[dynamic.length%PALETTE.length],metalness:.25,roughness:.36});
          const mesh=new THREE.Mesh(geometry,material);
          const i=dynamic.length;
          const floor=sceneObjectsRef.current?.find(o=>o.kind==='floor');
          const origin=floor?.position||[0,0,0];
          const x=(initial?((i%4)-1.5)*1.1:(Math.random()-.5)*4)+origin[0];
          const y=(initial?5+Math.floor(i/4)*1.1:9)+origin[1];
          const z=(initial?((i%3)-1)*.5:(Math.random()-.5)*3)+origin[2];
          const desc=RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setCcdEnabled(true);
          const body=world.createRigidBody(desc);
          const collider=ball?RAPIER.ColliderDesc.ball(.42):RAPIER.ColliderDesc.cuboid(.41,.41,.41);
          world.createCollider(collider.setRestitution(.4).setFriction(.7),body);
          scene.add(mesh);dynamic.push({mesh,body});
          statsRef.current?.({bodies:dynamic.length});
        }
        makeWorld();
        gizmo=new TransformControls(camera,canvas);
        gizmo.setSize(.85);
        scene.add(gizmo.getHelper());
        gizmo.addEventListener('dragging-changed',event=>{controls.enabled=!event.value;});
        gizmo.addEventListener('mouseDown',()=>{dragStarted=true;ignoreNextClick=true;});
        gizmo.addEventListener('mouseUp',()=>{
          if(!dragStarted)return;
          dragStarted=false;
          const obj=gizmo.object;
          const id=obj?.userData.sourceObjectId;
          const original=sceneObjectsRef.current?.find(o=>o.id===id);
          const mode=gizmoOptionsRef.current.gizmoMode;
          if(!id||!original||!pausedRef.current||walkRef.current){makeWorld(false);return;}
          const raw={
            position:obj.position.toArray(),
            yaw:THREE.MathUtils.radToDeg(obj.rotation.y),
            scale:[original.scale[0]*obj.scale.x,original.scale[1]*obj.scale.y,original.scale[2]*obj.scale.z]
          };
          const committed=commitRef.current?.(id,mode,raw);
          if(committed!==true)makeWorld(false);
        });
        syncGizmo();
        apiRef.current={
          spawn:shape=>spawn(shape,false),
          reset:()=>makeWorld(false),
          loadScene:frame=>makeWorld(frame!==false),
          syncGizmo,
          cancelTransform:()=>{
            if(!gizmo?.dragging)return false;
            dragStarted=false;
            controls.enabled=true;
            makeWorld(false);
            return true;
          }
        };
        function resize() {
          if(!mount||!renderer)return;
          const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);
          renderer.setSize(w,h,false);
          camera.aspect=w/h;camera.updateProjectionMatrix();
        }
        resize();
        resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);
        const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
        const onClick=e=>{
          if(ignoreNextClick||gizmo?.dragging){ignoreNextClick=false;return;}
          if(!Array.isArray(sceneObjectsRef.current))return;
          const rect=canvas.getBoundingClientRect();
          pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
          pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
          raycaster.setFromCamera(pointer,camera);
          const meshes=[...environment,...dynamic.map(d=>d.mesh)];
          const hit=raycaster.intersectObjects(meshes,false).find(h=>h.object.userData.sourceObjectId);
          if(hit)selectionRef.current?.(hit.object.userData.sourceObjectId);
        };
        const onPointerDown=()=>{if(!gizmo?.axis)ignoreNextClick=false;};
        canvas.addEventListener('pointerdown',onPointerDown);
        canvas.addEventListener('click',onClick);
        apiRef.current.removePointerHandlers=()=>{
          canvas.removeEventListener('pointerdown',onPointerDown);
          canvas.removeEventListener('click',onClick);
        };
        let last=performance.now(),accumulator=0,frames=0,elapsed=0;
        const animate=(now)=>{
          const dt=Math.min((now-last)/1000,.1);last=now;
          if(!pausedRef.current){
            accumulator+=dt;
            if(world)world.gravity={x:0,y:gravityRef.current,z:0};
            let steps=0;
            while(accumulator>=FIXED_STEP&&steps<6) {
              if(player){
                const vx=Number(held.has('d')||held.has('arrowright'))-Number(held.has('a')||held.has('arrowleft'));
                const vz=Number(held.has('s')||held.has('arrowdown'))-Number(held.has('w')||held.has('arrowup'));
                const n=Math.hypot(vx,vz)||1,v=player.body.linvel();
                player.body.setLinvel({x:3.7*vx/n,y:v.y,z:3.7*vz/n},true);
              }
              world.step();accumulator-=FIXED_STEP;steps++;
            }
            if(steps===6)accumulator=0;
          } else accumulator=0;
          for(const {mesh,body} of dynamic){
            const p=body.translation(),q=body.rotation();
            mesh.position.set(p.x,p.y,p.z);
            mesh.quaternion.set(q.x,q.y,q.z,q.w);
          }
          if(outline)outline.update();
          if(player){
            const shift=new THREE.Vector3().subVectors(player.mesh.position,controls.target).multiplyScalar(.1);
            controls.target.add(shift);camera.position.add(shift);
          }
          controls.update();
          renderer.render(scene,camera);
          frames++;elapsed+=dt;
          if(elapsed>=.75){
            statsRef.current?.({fps:Math.round(frames/elapsed),bodies:dynamic.length});
            frames=0;elapsed=0;
          }
        };
        renderer.setAnimationLoop(animate);
        statusRef.current?.('ready');
      }catch(e){
        if(!cancelled){setError('Physics unavailable: '+(e?.message||String(e)));statusRef.current?.('error');}
      }
    }
    initialize();
    return()=>{
      cancelled=true;
      apiRef.current?.removePointerHandlers?.();
      apiRef.current=null;
      window.removeEventListener('keydown',onKeyDown);
      window.removeEventListener('keyup',onKeyUp);
      if(renderer)renderer.setAnimationLoop(null);
      if(resizeObserver)resizeObserver.disconnect();
      if(gizmo){gizmo.detach();scene?.remove(gizmo.getHelper());gizmo.dispose();}
      if(scene)disposeOutline();
      if(controls)controls.dispose();
      if(scene) {
        clearDynamic();
        for(const mesh of environment){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
      }
      if(world)world.free();
      if(renderer){renderer.dispose();renderer.forceContextLoss();if(canvas?.parentNode)canvas.parentNode.removeChild(canvas);}
    };
  },[]);
  return <div className="forgePhysicsCanvas" ref={mountRef} aria-label="Interactive 3D Rapier physics simulation. Drag to orbit, scroll to zoom.">
    {error?<div className="forgePhysicsError" role="alert">{error}</div>:<div className="forgeCanvasOverlay">DRAG TO ORBIT · W/E/R TRANSFORMS IN PAUSED SCENE · ESC CANCEL · RAPIER COLLIDERS</div>}
  </div>;
}
export default forwardRef(PhysicsStage);
