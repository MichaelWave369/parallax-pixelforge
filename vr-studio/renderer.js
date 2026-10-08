// Dependency-free WebGL2 scene renderer with a capability-gated WebXR prototype.
// VR headsets, device compatibility and frame performance require physical qualification.
const VS = `#version 300 es
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
uniform mat4 uVP;
uniform mat4 uModel;
out vec3 vNormal;
void main() {
  gl_Position = uVP * uModel * vec4(aPosition,1.0);
  vNormal = mat3(uModel) * aNormal;
}`;
const FS = `#version 300 es
precision highp float;
in vec3 vNormal;
uniform vec3 uColor;
uniform float uSelected;
out vec4 fragColor;
void main() {
  float light = 0.38 + 0.62 * max(dot(normalize(vNormal), normalize(vec3(0.55,1.0,0.5))),0.0);
  vec3 rgb = uColor * light + vec3(uSelected * 0.15, uSelected * 0.13, 0.0);
  fragColor = vec4(rgb,1.0);
}`;

const ident=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mul(a,b) {
  const c=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)
    c[col*4+row]=a[row]*b[col*4]+a[4+row]*b[col*4+1]+a[8+row]*b[col*4+2]+a[12+row]*b[col*4+3];
  return c;
}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n)};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function view(eye,target) {
  const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);
  return new Float32Array([
    x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
    -dot(x,eye),-dot(y,eye),-dot(z,eye),1
  ]);
}
function perspective(fov,aspect,near,far) {
  const f=1/Math.tan(fov/2),nf=1/(near-far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
}
function modelFor(o) {
  const a=o.yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const m=ident();
  m[0]=c*o.scale[0]; m[2]=-s*o.scale[0];
  m[5]=o.scale[1];
  m[8]=s*o.scale[2]; m[10]=c*o.scale[2];
  m[12]=o.position[0];m[13]=o.position[1];m[14]=o.position[2];
  return m;
}
function cubeVertices() {
  const faces=[
    {n:[0,0,1],p:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},
    {n:[0,0,-1],p:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]},
    {n:[1,0,0],p:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]},
    {n:[-1,0,0],p:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]},
    {n:[0,1,0],p:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},
    {n:[0,-1,0],p:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]}
  ];
  const v=[];
  for(const face of faces)for(const k of [0,1,2,0,2,3])v.push(...face.p[k],...face.n);
  return new Float32Array(v);
}
function shader(gl,type,source) {
  const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'Shader compile failed');
  return sh;
}
function program(gl) {
  const p=gl.createProgram();
  gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VS));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FS));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Shader link failed');
  return p;
}
function rgb(hex) {
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
}
export function createRenderer(canvas,getWorld,getSelected,onSessionEnd=()=>{}) {
  const gl=canvas.getContext('webgl2',{antialias:true,xrCompatible:true,alpha:false});
  if(!gl)throw new Error('WebGL2 is required for VR Studio.');
  const prog=program(gl);
  const vert=cubeVertices(),vao=gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,vert,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(prog);
  const loc={vp:gl.getUniformLocation(prog,'uVP'),model:gl.getUniformLocation(prog,'uModel'),
    color:gl.getUniformLocation(prog,'uColor'),selected:gl.getUniformLocation(prog,'uSelected')};
  const camera={yaw:0.6,pitch:0.46,distance:17,target:[0,0.5,-4]};
  const loadedMeshes=new Map();

  // GPU data is scoped to this browser session. No GLB bytes are sent to Pages,
  // embedded into scene JSON, or implicitly marked compatibility-approved.
  function registerMesh(sha256,decoded) {
    if(!/^[a-f0-9]{64}$/.test(sha256))throw new Error('Invalid SHA-256 identity.');
    if(loadedMeshes.has(sha256))return loadedMeshes.get(sha256).report;
    if(loadedMeshes.size>=8)throw new Error('Maximum eight unique in-memory GLB preview assets per session.');
    if(!decoded||decoded.status!=='STATIC_GEOMETRY_PREVIEW_ONLY'||
      !Array.isArray(decoded.meshes)||decoded.vertexCount>150000||decoded.vertexCount<=0)
      throw new Error('Unqualified preview mesh payload.');
    const parts=[];
    try {
      for(const m of decoded.meshes) {
        if(!(m.vertices instanceof Float32Array)||m.vertices.length%6||m.vertices.length===0||
          !m.color||m.color.length!==3)throw new Error('Invalid preview primitive.');
        const vao=gl.createVertexArray(),buffer=gl.createBuffer();
        if(!vao||!buffer)throw new Error('GPU resource allocation failed.');
        parts.push({vao,buffer,count:m.vertices.length/6,color:m.color});
        gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,m.vertices,gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
        gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
      }
    }catch(error){
      for(const p of parts){gl.deleteBuffer(p.buffer);gl.deleteVertexArray(p.vao);}
      throw error;
    }
    const report={status:decoded.status,meshCount:decoded.meshCount,
      vertexCount:decoded.vertexCount,warnings:decoded.warnings};
    loadedMeshes.set(sha256,{parts,report});
    return report;
  }
  const hasMesh=sha256=>loadedMeshes.has(sha256);

  let xrSession=null;
  let xrReferenceSpace=null;
  let disposed=false;

  function paint(vp) {
    gl.useProgram(prog);
    gl.uniformMatrix4fv(loc.vp,false,vp);
    for(const o of getWorld().objects) {
      gl.uniformMatrix4fv(loc.model,false,modelFor(o));
      gl.uniform1f(loc.selected,getSelected()===o.id?1:0);
      const asset=o.kind==='asset-proxy'&&o.asset?loadedMeshes.get(o.asset.sha256):null;
      if(asset) {
        for(const part of asset.parts) {
          gl.bindVertexArray(part.vao);
          gl.uniform3fv(loc.color,part.color);
          gl.drawArrays(gl.TRIANGLES,0,part.count);
        }
      }else {
        gl.bindVertexArray(vao);
        gl.uniform3fv(loc.color,rgb(o.color));
        gl.drawArrays(gl.TRIANGLES,0,36);
      }
    }
  }
  function desktopLoop() {
    if(disposed)return;
    requestAnimationFrame(desktopLoop);
    if(xrSession)return;
    const ratio=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(1,Math.floor(canvas.clientWidth*ratio)),h=Math.max(1,Math.floor(canvas.clientHeight*ratio));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,w,h);
    gl.clearColor(0.025,0.041,0.077,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const {yaw,pitch,distance,target}=camera;
    const eye=[target[0]+distance*Math.cos(pitch)*Math.sin(yaw),
      target[1]+distance*Math.sin(pitch),target[2]+distance*Math.cos(pitch)*Math.cos(yaw)];
    paint(mul(perspective(Math.PI/3,w/h,.05,250),view(eye,target)));
  }
  function xrLoop(time,frame) {
    if(!xrSession||disposed)return;
    xrSession.requestAnimationFrame(xrLoop);
    const pose=frame.getViewerPose(xrReferenceSpace);
    if(!pose)return;
    const layer=xrSession.renderState.baseLayer;
    gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);
    gl.clearColor(0.025,0.041,0.077,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    for(const v of pose.views) {
      const rect=layer.getViewport(v);
      gl.viewport(rect.x,rect.y,rect.width,rect.height);
      paint(mul(v.projectionMatrix,v.transform.inverse.matrix));
    }
  }
  async function enterVR() {
    if(xrSession)throw new Error('VR session already running.');
    if(!navigator.xr || !await navigator.xr.isSessionSupported('immersive-vr'))
      throw new Error('Immersive VR is unavailable in this browser or headset.');
    await gl.makeXRCompatible();
    const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});
    try {
      const referenceSpace=await session.requestReferenceSpace('local-floor')
        .catch(()=>session.requestReferenceSpace('local'));
      await session.updateRenderState({baseLayer:new XRWebGLLayer(session,gl,{alpha:false,depth:true})});
      xrReferenceSpace=referenceSpace;
      xrSession=session;
      session.addEventListener('end',()=>{
        if(xrSession===session){xrSession=null;xrReferenceSpace=null;onSessionEnd();}
      },{once:true});
      session.requestAnimationFrame(xrLoop);
    } catch(error) {await session.end();throw error;}
  }
  function exitVR(){return xrSession?.end();}
  desktopLoop();
  return {camera,enterVR,exitVR,registerMesh,hasMesh,
    dispose(){
      disposed=true;void exitVR();
      for(const mesh of loadedMeshes.values())for(const p of mesh.parts){
        gl.deleteBuffer(p.buffer);gl.deleteVertexArray(p.vao);
      }
      gl.deleteBuffer(buf);gl.deleteVertexArray(vao);gl.deleteProgram(prog);
      loadedMeshes.clear();
    }
  };
}
