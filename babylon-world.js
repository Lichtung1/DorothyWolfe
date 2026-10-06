import { paperWalls, paperFor } from './wallpapers.js?v=paper-20261005';
const B=window.BABYLON;
export class ApartmentWorld {
 constructor(canvas,map,objects,touch){
  this.objects=objects;this.touch=touch;this.ready=false;this.passageOpen=false;this.props=new Map();this.pearls=[];
  this.engine=new B.Engine(canvas,false,{preserveDrawingBuffer:false,stencil:false,powerPreference:'low-power'},false);
  this.scene=new B.Scene(this.engine);this.scene.useRightHandedSystem=true;this.scene.clearColor=new B.Color4(.13,.082,.184,1);
  this.camera=new B.FreeCamera('visitor',new B.Vector3(0,1.55,8.5),this.scene);this.camera.minZ=.06;this.camera.maxZ=90;this.camera.fov=72*Math.PI/180;this.camera.layerMask=1;this.camera.inputs.clear();
  const hemi=new B.HemisphericLight('soft light',new B.Vector3(0,1,0),this.scene);hemi.diffuse=B.Color3.FromHexString('#fff0ed');hemi.groundColor=B.Color3.FromHexString('#816376');hemi.intensity=.85;
  this.sun=new B.DirectionalLight('moon',new B.Vector3(.4,-1,-.3),this.scene);this.sun.diffuse=B.Color3.FromHexString('#ffdcc1');this.sun.intensity=.75;
  for(const [x,y,z,c]of [[-7.1,2,1,'#ffca8e'],[0,3,0,'#cebbff'],[8,2,2,'#ffc8a2']]){const l=new B.PointLight('lamp',new B.Vector3(x,y,z),this.scene);l.diffuse=B.Color3.FromHexString(c);l.intensity=.35;l.range=7}
  this.makeStars();this.makeMoon();this.resize();this.load();
 }
 makeStars(){
  const p=[],idx=[];for(let i=0;i<330;i++){const a=Math.random()*Math.PI*2,h=.12+Math.random()*.87,r=50,x=Math.cos(a)*r*Math.sqrt(1-h*h),y=h*r,z=Math.sin(a)*r*Math.sqrt(1-h*h),size=.025+Math.random()*.025,k=p.length/3;p.push(x-size,y,z,x+size,y,z,x,y+size*2,z);idx.push(k,k+1,k+2)}
  const stars=this.stars=new B.Mesh('stars',this.scene),v=new B.VertexData();v.positions=p;v.indices=idx;v.normals=[];B.VertexData.ComputeNormals(p,idx,v.normals);v.applyToMesh(stars);const m=new B.StandardMaterial('starlight',this.scene);m.disableLighting=true;m.emissiveColor=B.Color3.FromHexString('#efc9e1');m.backFaceCulling=false;stars.material=m;stars.isPickable=false;
 }
 makeMoon(){
  const moon=B.MeshBuilder.CreateSphere('distant moon',{diameter:3.6,segments:12},this.scene);moon.position.set(-17,23,-37);const m=new B.StandardMaterial('moon ivory',this.scene);m.disableLighting=true;m.emissiveColor=B.Color3.FromHexString('#d9bccf');moon.material=m;moon.isPickable=false;moon.freezeWorldMatrix();
 }
 async load(){try{
  const [gl,data]=await Promise.all([B.SceneLoader.ImportMeshAsync(null,'assets/','apartment.glb',this.scene,e=>dispatchEvent(new CustomEvent('dw-progress',{detail:{stage:'model',fraction:e.lengthComputable&&e.total?e.loaded/e.total:Math.min(.99,e.loaded/1606964)}}))),fetch('assets/collision.json').then(r=>{if(!r.ok)throw Error('collision');return r.json()})]);this.boxes=data.boxes;this.floors=data.floors;
  const materials=new Map(),groups=new Map(),walls=[];this.wallMats=[];
  for(const o of gl.meshes){if(!o.getTotalVertices())continue;o.computeWorldMatrix(true);o.layerMask=1;const src=o.material;
   if(src){if(!materials.has(src)){const m=new B.StandardMaterial(src.name,this.scene);m.diffuseColor=src.albedoColor?.clone()||B.Color3.White();m.diffuseTexture=src.albedoTexture||null;m.emissiveColor=src.emissiveColor?.clone()||B.Color3.Black();m.emissiveTexture=src.emissiveTexture||null;m.specularColor=B.Color3.Black();m.backFaceCulling=src.backFaceCulling;m.maxSimultaneousLights=5;materials.set(src,m);if(m.diffuseTexture)m.diffuseTexture.anisotropicFilteringLevel=2;if(src.name.includes('floral'))this.wallMats.push(m)}o.material=materials.get(src)}
   if(o.name==='secret_wall'){this.gate=o;this.gateBase=o.position.y;o.material=o.material.clone('passage highlight');continue}
   if(/Floating[ _]pearl/.test(o.name)){this.pearls.push({o,y:o.position.y});continue}
   if(o.name==='mirror_surface'){o.setEnabled(false);continue}
   if(src&&src.name.includes('floral')){walls.push(o);continue}
   if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o);
  }
  // Performance: combine static pieces that share a material into one mesh (≈190 draw calls → a few dozen). Visual result is identical.
  for(const meshes of groups.values()){const sets=new Map();for(const mesh of meshes){const sig=mesh.getClassName()==='InstancedMesh'||mesh.skeleton||mesh.morphTargetManager?'solo:'+mesh.uniqueId:mesh.getVerticesDataKinds().sort().join()+'|'+(mesh.sideOrientation??'');if(!sets.has(sig))sets.set(sig,[]);sets.get(sig).push(mesh)}
   for(const [sig,set]of sets){let merged=null;if(set.length>1&&!sig.startsWith('solo:')){try{merged=B.Mesh.MergeMeshes(set,true,true,undefined,false,false)}catch(e){console.warn('merge skipped',e)}}
    for(const mesh of merged?[merged]:set){mesh.layerMask=1;mesh.isPickable=false;mesh.freezeWorldMatrix();mesh.doNotSyncBoundingInfo=true}}}
  // Wallpaper per room (see wallpapers.js).
  if(walls.length&&this.wallMats[0]){dispatchEvent(new CustomEvent('dw-progress',{detail:{stage:'model',fraction:.99}}));const paper=paperWalls(B,this.scene,walls,this.wallMats[0]);await paper.ready;this.wallMats=paper.materials;if(this.gate){const t=paperFor('textile',this.scene,this.gate.material.diffuseTexture);if(t)this.gate.material.diffuseTexture=t}}
  this.mirror=B.MeshBuilder.CreatePlane('mirror',{width:1,height:2,sideOrientation:B.Mesh.DOUBLESIDE},this.scene);this.mirror.position.set(9.30,1.3,2.1);this.mirror.rotation.y=Math.PI/2;
  const mirrorMat=new B.StandardMaterial('silver mirror',this.scene);mirrorMat.diffuseColor=new B.Color3(.1,.07,.1);mirrorMat.specularColor=B.Color3.Black();this.reflection=new B.MirrorTexture('reflection',{width:this.touch?128:256,height:this.touch?256:512},this.scene,false);this.reflection.mirrorPlane=new B.Plane(1,0,0,-9.30);this.reflection.level=.85;mirrorMat.reflectionTexture=this.reflection;this.mirror.material=mirrorMat;
  this.spirit=B.MeshBuilder.CreateSphere('visitor light',{diameter:.34,segments:8},this.scene);this.spirit.layerMask=2;const spiritMat=new B.StandardMaterial('pearl light',this.scene);spiritMat.disableLighting=true;spiritMat.emissiveColor=B.Color3.FromHexString('#ffd7ed');this.spirit.material=spiritMat;
  this.reflection.renderList=this.scene.meshes.filter(o=>o!==this.mirror&&o.isEnabled());this.reflection.onBeforeRenderObservable.add(()=>this.camera.layerMask=3);this.reflection.onAfterRenderObservable.add(()=>this.camera.layerMask=1);
  for(const obj of this.objects.filter(o=>o.key.startsWith('thread'))){const m=B.MeshBuilder.CreateTorus(obj.key,{diameter:.2,thickness:.024,tessellation:12},this.scene);m.position.set(obj.x,1.05,obj.y);m.rotation.x=Math.PI/2;m.material=spiritMat;this.props.set(obj.key,m)}
  this.wallMats=[...new Set(this.wallMats)];this.maps=this.wallMats.map(m=>m.diffuseTexture);this.sightBoxes=this.boxes.filter(({bounds:b,name})=>(/_\d\d$/.test(name)||name==='secret_wall')&&b[2]<1.55&&b[5]>1.55);this.scene.skipPointerMovePicking=true;this.ready=true;dispatchEvent(new CustomEvent('dw-ready'));document.querySelector('#begin').disabled=false;document.querySelector('#begin').textContent='Enter the apartment';document.querySelector('#load-state').textContent='';
 }catch(e){console.error(e);document.querySelector('#load-state').textContent='The apartment could not load. Refresh to try again, or explore through Rooms.';document.querySelector('#begin').disabled=true;document.querySelector('#begin').textContent='Apartment unavailable';this.failed=true;dispatchEvent(new CustomEvent('dw-failed'))}}
 resize(){const aspect=innerWidth/innerHeight,budget=this.touch?210000:650000,w=Math.min(1250,Math.sqrt(budget*aspect));this.engine.setSize(Math.floor(w),Math.floor(w/aspect));
  // Babylon's fov is vertical. In portrait that leaves a narrow ~35° side-to-side view, so widen it to keep ~64° across, capped so walls don't fisheye.
  const deg=Math.PI/180,wide=aspect<1?2*Math.atan(Math.tan(32*deg)/aspect):72*deg;this.camera.fov=Math.min(100*deg,Math.max(72*deg,wide))}
 blocked(x,z){if(!this.ready)return true;const r=.22,y=-z;
  if(this.boxes.some(({bounds:b,name})=>!(name==='secret_wall'&&this.passageOpen)&&!(name.startsWith('bedroom_partition')&&this.passageOpen)&&b[2]<1.8&&b[5]>.04&&x>b[0]-r&&x<b[3]+r&&y>b[1]-r&&y<b[4]+r))return true;
  return [[-r,-r],[-r,r],[r,-r],[r,r]].some(([dx,dy])=>!this.floors.some(b=>x+dx>=b[0]&&x+dx<=b[3]&&y+dy>=b[1]&&y+dy<=b[4]));
 }
 clear(x,z,tx,tz){const n=Math.ceil(Math.hypot(tx-x,tz-z)/.1);for(let i=1;i<n-2;i++){let px=x+(tx-x)*i/n,py=-(z+(tz-z)*i/n);if(this.sightBoxes.some(({bounds:b,name})=>!(name==='secret_wall'&&this.passageOpen)&&px>b[0]&&px<b[3]&&py>b[1]&&py<b[4]))return false}return true}
 projectRoom(sign,p,t,reduced){
  if(!this.ready)return null;
  const dx=sign.x-p.x,dz=sign.z-p.y,d=Math.hypot(dx,dz);
  if(d<.75||d>8||(dx*Math.cos(p.a)+dz*Math.sin(p.a))/d<.35||!this.clear(p.x,p.y,sign.x,sign.z))return null;
  const point=B.Vector3.Project(new B.Vector3(sign.x,1.95+(reduced?0:Math.sin(t*.0018)*.06),sign.z),B.Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()));
  const x=point.x/this.engine.getRenderWidth()*100,y=point.y/this.engine.getRenderHeight()*100;
  return point.z>0&&point.z<1&&x>12&&x<88&&y>22&&y<65?{x,y}:null;
 }
 nearest(p,found){if(!this.ready)return null;let best=null,d=2.5;for(const o of this.objects){if(found.has(o.key)||o.key==='passage'&&(!this.dream||this.passageOpen))continue;let dx=o.x-p.x,dz=o.y-p.y,r=Math.hypot(dx,dz);if(r<d&&(dx*Math.cos(p.a)+dz*Math.sin(p.a))/r>.55&&this.clear(p.x,p.y,o.x,o.y)){best=o;d=r}}return best}
 hitAt(){return this.player?this.nearest(this.player,this.found):null}
 activate(key,t){this.active={key,t}}
 openPassage(t){this.openAt=t}
 render(p,found,dream,lace,t,reduced){this.player=p;this.found=found;this.dream=dream;const moved=this.prev?Math.hypot(p.x-this.prev.x,p.y-this.prev.y):0;this.phase=(this.phase||0)+moved*7;this.prev={...p};const bob=!reduced&&moved>.0001?Math.sin(this.phase)*.014:0;this.camera.position.set(p.x,1.55+bob,p.y);this.camera.setTarget(new B.Vector3(p.x+Math.cos(p.a),1.55+bob,p.y+Math.sin(p.a)));
  this.scene.clearColor=B.Color4.FromHexString(dream?'#51405fff':'#21152fff');this.sun.diffuse=B.Color3.FromHexString(dream?'#b7dffff':'#ffdcc1');if(this.stars)this.stars.rotation.y=reduced?0:t*(dream?.000025:.000002);
  if(this.gate)this.gate.material.emissiveColor=B.Color3.FromHexString(dream?'#874875':'#000000');
  if(this.ready){if(this.lace!==lace){this.wallMats.forEach((m,i)=>m.diffuseTexture=lace?this.maps[i]:null);this.lace=lace}
   this.spirit.position.set(p.x,1.25,p.y);const near=Math.hypot(p.x-9.3,p.y-2.1)<4&&p.x<9.3;this.mirror.setEnabled(near);this.reflection.refreshRate=this.touch?2:1;
   for(const {o,y}of this.pearls)o.position.y=y+(reduced?0:Math.sin(t*.0013+y*4)*.055);
   for(const [key,o]of this.props){o.setEnabled(!found.has(key));if(!reduced)o.rotation.y=t*.001}
   if(this.openAt!==undefined&&this.gate){const a=reduced?1:Math.min(1,(t-this.openAt)/1300);this.gate.position.y=this.gateBase+a*a*(3-2*a)*2.4;this.passageOpen=a>.95}
  }this.engine.beginFrame();this.scene.render();this.engine.endFrame()
 }
}
