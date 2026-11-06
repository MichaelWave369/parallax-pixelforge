import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import RAPIER from '@dimforge/rapier3d-compat';

const FIXED_STEP=1/60;
const MAX_BODIES=250;
const PALETTE=[0x50e4cf,0xfcb75b,0xb28bff,0xf675bd,0x62aaff];
function PhysicsStage({paused=false,gravity=-9.81,onStats,onStatus},ref) {
  const mountRef=useRef(null),apiRef=useRef(null),pausedRef=useRef(paused),gravityRef=useRef(gravity);
  const statsRef=useRef(onStats),statusRef=useRef(onStatus);
  const [error,setError]=useState('');
  useEffect(()=>{pausedRef.current=paused;},[paused]);
  useEffect(()=>{gravityRef.current=gravity;},[gravity]);
  useEffect(()=>{statsRef.current=onStats;statusRef.current=onStatus;},[onStats,onStatus]);
  useImperativeHandle(ref,()=>({
    spawn:shape=>apiRef.current?.spawn(shape),
    reset:()=>apiRef.current?.reset()
  }),[]);
  useEffect(()=>{
    let cancelled=false,renderer=null,controls=null,resizeObserver=null,world=null,scene=null;
    let dynamic=[],environment=[],canvas=null;
    const clearDynamic=()=>{
      for(const item of dynamic){scene.remove(item.mesh);item.mesh.geometry.dispose();item.mesh.material.dispose();}
      dynamic=[];
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
        const makeWorld=()=>{
          if(world)world.free();
          world=new RAPIER.World({x:0,y:gravityRef.current,z:0});
          world.timestep=FIXED_STEP;
          for(const mesh of environment){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
          environment=[];
          addStatic([16,.4,16],[0,-.2,0],0x28334d);
          addStatic([4,.35,3],[-3,1.1,-2],0x365472);
          addStatic([3,.35,3],[3,2.3,0],0x563b75);
          addStatic([2,.35,3],[0,.85,3],0x285f68);
          for(let i=0;i<8;i++)spawn(i%3===0?'ball':'box',true);
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
          const x=initial?((i%4)-1.5)*1.1:(Math.random()-.5)*4;
          const y=initial?5+Math.floor(i/4)*1.1:9;
          const z=initial?((i%3)-1)*.5:(Math.random()-.5)*3;
          const desc=RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setCcdEnabled(true);
          const body=world.createRigidBody(desc);
          const collider=ball?RAPIER.ColliderDesc.ball(.42):RAPIER.ColliderDesc.cuboid(.41,.41,.41);
          world.createCollider(collider.setRestitution(.4).setFriction(.7),body);
          scene.add(mesh);dynamic.push({mesh,body});
          statsRef.current?.({bodies:dynamic.length});
        }
        makeWorld();
        apiRef.current={
          spawn:shape=>spawn(shape,false),
          reset:()=>{clearDynamic();makeWorld();}
        };
        function resize() {
          if(!mount||!renderer)return;
          const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);
          renderer.setSize(w,h,false);
          camera.aspect=w/h;camera.updateProjectionMatrix();
        }
        resize();
        resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);
        let last=performance.now(),accumulator=0,frames=0,elapsed=0;
        const animate=(now)=>{
          const dt=Math.min((now-last)/1000,.1);last=now;
          if(!pausedRef.current){
            accumulator+=dt;
            if(world)world.gravity={x:0,y:gravityRef.current,z:0};
            let steps=0;
            while(accumulator>=FIXED_STEP&&steps<6) {
              world.step();accumulator-=FIXED_STEP;steps++;
            }
            if(steps===6)accumulator=0;
          } else accumulator=0;
          for(const {mesh,body} of dynamic){
            const p=body.translation(),q=body.rotation();
            mesh.position.set(p.x,p.y,p.z);
            mesh.quaternion.set(q.x,q.y,q.z,q.w);
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
      cancelled=true;apiRef.current=null;
      if(renderer)renderer.setAnimationLoop(null);
      if(resizeObserver)resizeObserver.disconnect();
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
    {error?<div className="forgePhysicsError" role="alert">{error}</div>:<div className="forgeCanvasOverlay">DRAG TO ORBIT · SCROLL TO ZOOM · REAL RAPIER RIGID BODIES</div>}
  </div>;
}
export default forwardRef(PhysicsStage);
