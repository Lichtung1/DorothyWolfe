const B=window.BABYLON;
import { buildDecor, buildWindThreads, WALLPAPER_SWAP, LACE_WALLS, LACE_SWAP, LACE_LINING, MATERIAL_TINT, HIDE_FROM_GLB } from './decor.js?v=dw-20261025b';
import { buildExterior } from './exterior.js?v=dw-20261025b';
import { Texture, starMesh, buildLightPools } from './babylon-extras.js';
import { buildSnow } from './snow.js?v=dw-20261025b';
import { makeOpal } from './opal.js?v=dw-20261025b';
import { hangGarments } from './garments.js?v=dw-20261025b';
import { installPS1, PS1, ps1Size, LINING } from './ps1.js?v=dw-20261025b';
// Sky + mist colours. SKY is unchanged from the original; MIST is what distant trees fade into.
export const SKY={normal:'#21152f',dream:'#38323f'},MIST={normal:'#2f2a3a',dream:'#4a4555'};
export class ApartmentWorld {
 constructor(canvas,map,objects,touch){
  this.objects=objects;this.touch=touch;this.ready=false;this.passageOpen=false;this.props=new Map();this.pearls=[];
  this.engine=new B.Engine(canvas,false,{preserveDrawingBuffer:false,stencil:false,powerPreference:'low-power'},false);
  this.scene=new B.Scene(this.engine);this.scene.useRightHandedSystem=true;try{const v=localStorage.getItem('dw-ps1');if(v)PS1.enabled=v==='1';const l=localStorage.getItem('dw-lining');if(l)LINING.enabled=l==='1'}catch{}this.ps1=installPS1(this.scene,this.engine);this.scene.clearColor=new B.Color4(.13,.082,.184,1);
  this.camera=new B.FreeCamera('visitor',new B.Vector3(0,1.55,8.5),this.scene);this.camera.minZ=.06;this.camera.maxZ=90;this.camera.fov=72*Math.PI/180;this.camera.layerMask=1;this.camera.inputs.clear();
  const hemi=new B.HemisphericLight('soft light',new B.Vector3(0,1,0),this.scene);hemi.diffuse=B.Color3.FromHexString('#f6f3fa');hemi.groundColor=B.Color3.FromHexString('#6f6a76');hemi.intensity=.85;
  this.sun=new B.DirectionalLight('moon',new B.Vector3(.4,-1,-.3),this.scene);this.sun.diffuse=B.Color3.FromHexString('#eaecff');this.sun.intensity=.75;
  for(const [x,y,z,c]of [[-7.1,2,1,'#ffd9ea'],[0,3,0,'#e4e6ff'],[8,2,2,'#ffd9ea']]){const l=new B.PointLight('lamp',new B.Vector3(x,y,z),this.scene);l.diffuse=B.Color3.FromHexString(c);l.intensity=.35;l.range=7}
  this.makeStars();this.makeMoon();this.makeSky();this.exterior=buildExterior(this.scene,{touch});const halo=this.scene.getMeshByName('moon halo');if(halo)halo.infiniteDistance=true;this.ticks=[...this.exterior.tick];this.snow=buildSnow(this.scene,{touch});this.ticks.push(this.snow.tick);this.resize();this.load();
 }
 makeStars(){
  const p=[],idx=[];for(let i=0;i<330;i++){const a=Math.random()*Math.PI*2,h=.12+Math.random()*.87,r=50,x=Math.cos(a)*r*Math.sqrt(1-h*h),y=h*r,z=Math.sin(a)*r*Math.sqrt(1-h*h),size=.025+Math.random()*.025,k=p.length/3;p.push(x-size,y,z,x+size,y,z,x,y+size*2,z);idx.push(k,k+1,k+2)}
  const stars=this.stars=new B.Mesh('stars',this.scene),v=new B.VertexData();v.positions=p;v.indices=idx;v.normals=[];B.VertexData.ComputeNormals(p,idx,v.normals);v.applyToMesh(stars);stars.infiniteDistance=true;const m=new B.StandardMaterial('starlight',this.scene);m.disableLighting=true;m.emissiveColor=B.Color3.FromHexString('#efc9e1');m.backFaceCulling=false;m.fogEnabled=false;stars.material=m;stars.isPickable=false;
 }
 makeSky(){
  // Gradient sky dome that follows the camera: the original night colour overhead, fading into the mist at the horizon,
  // so the fog melts into the sky instead of meeting a hard edge.
  const d=this.skyDome=B.MeshBuilder.CreateSphere('sky dome',{diameter:150,segments:10},this.scene);d.infiniteDistance=true;d.isPickable=false;
  const m=new B.StandardMaterial('sky dome',this.scene);m.disableLighting=true;m.emissiveColor=B.Color3.White();m.backFaceCulling=false;m.fogEnabled=false;d.material=m;this.paintSky(false);
 }
 paintSky(dream){
  const pos=this.skyDome.getVerticesData('position'),col=[],top=B.Color3.FromHexString(dream?SKY.dream:SKY.normal),low=B.Color3.FromHexString(dream?MIST.dream:MIST.normal),glow=B.Color3.Lerp(low,B.Color3.FromHexString('#4a4256'),.5);
  for(let i=0;i<pos.length;i+=3){const h=pos[i+1]/75;let c;if(h<0)c=low;else if(h<.12)c=B.Color3.Lerp(glow,low,1-h/.12);else c=B.Color3.Lerp(glow,top,Math.min(1,(h-.12)/.35));col.push(c.r,c.g,c.b,1)}
  this.skyDome.setVerticesData('color',col);
 }
 toggleLining(){LINING.enabled=!LINING.enabled;try{localStorage.setItem('dw-lining',LINING.enabled?'1':'0')}catch{}return LINING.enabled}
 toggleSnow(){return this.snow.toggle()}
 toggleWobble(){const on=!(PS1.wobble>0);PS1.wobble=on?.5:0;PS1.warp=on?.3:0;this.resize();return on}
 togglePS1(){PS1.enabled=!PS1.enabled;try{localStorage.setItem('dw-ps1',PS1.enabled?'1':'0')}catch{}this.resize();this.ps1.refreshTextures();return PS1.enabled}
 makeMoon(){
  const moon=B.MeshBuilder.CreateSphere('distant moon',{diameter:3.6,segments:12},this.scene);moon.position.set(-17,23,-37);const m=new B.StandardMaterial('moon ivory',this.scene);m.disableLighting=true;m.emissiveColor=B.Color3.FromHexString('#e6dbe6');m.fogEnabled=false;moon.material=m;moon.isPickable=false;moon.infiniteDistance=true;
 }
 async load(){try{
  const [gl,data]=await Promise.all([B.SceneLoader.ImportMeshAsync(null,'assets/','apartment.glb?v=glbpaper3-20261005',this.scene,e=>dispatchEvent(new CustomEvent('dw-progress',{detail:{stage:'model',fraction:e.lengthComputable&&e.total?e.loaded/e.total:Math.min(.99,e.loaded/2235500)}})),'.glb'),fetch('assets/collision.json?v=dw-20261025b').then(r=>{if(!r.ok)throw Error('collision');return r.json()})]);this.decor=buildDecor(this.scene,{touch:this.touch});this.ticks.push(...this.decor.tick);this.threads=buildWindThreads(this.scene,data.boxes,{touch:this.touch});this.ticks.push(this.threads.tick);this.boxes=data.boxes.concat(this.decor.boxes,this.exterior.boxes);this.exterior.shrine.setOfferings(this.pendingOfferings||{});this.pools=buildLightPools(this.scene,[...this.decor.pools,...this.exterior.pools]);this.ps1.refreshTextures();this.ticks.push(...this.decor.poolTicks);const opal=()=>{if(!makeOpal(this.scene,this.decor.glassMats))this.scene.onAfterRenderObservable.addOnce(opal)};this.scene.onAfterRenderObservable.addOnce(opal);this.floors=data.floors.concat(this.exterior.floors);
  const materials=new Map(),groups=new Map();this.wallMats=[];
  for(const o of gl.meshes){if(HIDE_FROM_GLB.some(r=>r.test(o.name))){o.dispose();continue}if(!o.getTotalVertices())continue;o.computeWorldMatrix(true);o.layerMask=1;const src=o.material;
   if(src){if(!materials.has(src)){const m=new B.StandardMaterial(src.name,this.scene);m.diffuseColor=src.albedoColor?.clone()||B.Color3.White();m.diffuseTexture=src.albedoTexture||null;m.emissiveColor=src.emissiveColor?.clone()||B.Color3.Black();m.emissiveTexture=src.emissiveTexture||null;m.specularColor=B.Color3.Black();m.backFaceCulling=src.backFaceCulling;m.maxSimultaneousLights=5;materials.set(src,m);const laceKey=LACE_WALLS&&Object.keys(LACE_SWAP).find(k=>src.name.includes(k)),swap=laceKey||Object.keys(WALLPAPER_SWAP).find(k=>src.name.includes(k)),old=m.diffuseTexture;if(swap&&old){const t=new Texture(laceKey?'assets/textures/'+LACE_SWAP[laceKey]+'.png':'assets/wallpapers/'+WALLPAPER_SWAP[swap],this.scene,false,old.invertY);if(laceKey){t.hasAlpha=true;m.backFaceCulling=true;const lc=B.Color3.FromHexString(LACE_LINING.color),rule=LACE_LINING.rules.find(([k])=>src.name.includes(k));m._dwLine={o:rule?rule[1]:LACE_LINING.interior,c:[lc.r,lc.g,lc.b],seed:(this.wallMats.length*5)%16};/* one layer of lace per wall: you see a wall's own face, not its back side 20 cm behind */m.emissiveColor=B.Color3.FromHexString('#3a3238')}for(const k of ['wrapU','wrapV','uScale','vScale','uOffset','vOffset','uAng','vAng','wAng','coordinatesIndex'])t[k]=old[k];m.diffuseTexture=t}if(/Parquet/.test(src.name))m.zOffset=-2;if(MATERIAL_TINT[src.name])m.diffuseColor=B.Color3.FromHexString(MATERIAL_TINT[src.name]);if(m.diffuseTexture)m.diffuseTexture.anisotropicFilteringLevel=2;if(src.name.includes('floral')||src.name.startsWith('Wallpaper'))this.wallMats.push(m)}o.material=materials.get(src)}
   if(o.name==='secret_wall'){this.gate=o;this.gateBase=o.position.y;const src2=o.material;o.material=src2.clone('passage highlight');if(src2._dwLine)o.material._dwLine={...src2._dwLine,o:LACE_LINING.secretWall,seed:11};continue}
   if(/Floating[ _]pearl/.test(o.name)){this.pearls.push({o,y:o.position.y});continue}
   if(o.name==='mirror_surface'){o.setEnabled(false);continue}
   if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o);
  }
  // Performance: combine static pieces that share a material into one mesh (≈190 draw calls → a few dozen). Visual result is identical.
  for(const meshes of groups.values()){const sets=new Map();for(const mesh of meshes){const sig=mesh.getClassName()==='InstancedMesh'||mesh.skeleton||mesh.morphTargetManager?'solo:'+mesh.uniqueId:mesh.getVerticesDataKinds().sort().join()+'|'+(mesh.sideOrientation??'');if(!sets.has(sig))sets.set(sig,[]);sets.get(sig).push(mesh)}
   for(const [sig,set]of sets){let merged=null;if(set.length>1&&!sig.startsWith('solo:')){try{merged=B.Mesh.MergeMeshes(set,true,true,undefined,false,false)}catch(e){console.warn('merge skipped',e)}}
    for(const mesh of merged?[merged]:set){mesh.layerMask=1;mesh.isPickable=false;mesh.freezeWorldMatrix();mesh.doNotSyncBoundingInfo=true}}}
  // The seven floating pearls become one mesh (one draw call); their bobbing is done by moving vertices.
  if(this.pearls.length>1){const ms=this.pearls.map(q=>q.o),counts=ms.map(q=>q.getTotalVertices()),ys=this.pearls.map(q=>q.y);const merged=B.Mesh.MergeMeshes(ms,true,true);if(merged){merged.name='floating pearls';merged.isPickable=false;merged.layerMask=1;const base=Float32Array.from(merged.getVerticesData('position'));merged.setVerticesData('position',base,true);const id=new Uint8Array(base.length/3);let k=0;counts.forEach((c,i)=>{id.fill(i,k,k+c);k+=c});this.pearlMesh={merged,base,id,ys,pos:new Float32Array(base.length),last:0};this.pearls=[]}}
  this.mirror=B.MeshBuilder.CreatePlane('mirror',{width:1,height:2,sideOrientation:B.Mesh.DOUBLESIDE},this.scene);this.mirror.position.set(9.30,1.3,2.1);this.mirror.rotation.y=Math.PI/2;
  const mirrorMat=new B.StandardMaterial('silver mirror',this.scene);mirrorMat.diffuseColor=new B.Color3(.1,.07,.1);mirrorMat.specularColor=B.Color3.Black();this.reflection=new B.MirrorTexture('reflection',{width:this.touch?128:256,height:this.touch?256:512},this.scene,false);this.reflection.mirrorPlane=new B.Plane(1,0,0,-9.30);this.reflection.level=.85;mirrorMat.reflectionTexture=this.reflection;this.mirror.material=mirrorMat;
  this.spirit=starMesh('visitor star',this.scene,{outer:.24,inner:.1,depth:.06});this.spirit.layerMask=2;const spiritMat=new B.StandardMaterial('pearl light',this.scene);spiritMat.disableLighting=true;spiritMat.emissiveColor=B.Color3.FromHexString('#ffd7ed');this.spirit.material=spiritMat;
  const outside=new Set(this.exterior.meshes);this.reflection.renderList=this.scene.meshes.filter(o=>o!==this.mirror&&o.isEnabled()&&!outside.has(o));this.reflection.onBeforeRenderObservable.add(()=>this.camera.layerMask=3);this.reflection.onAfterRenderObservable.add(()=>this.camera.layerMask=1);
  const threadMat=new B.StandardMaterial('sky thread',this.scene);threadMat.disableLighting=true;threadMat.emissiveColor=B.Color3.White();threadMat.fogEnabled=false;
  for(const obj of this.objects.filter(o=>o.key.startsWith('thread'))){const m=this.skyThread(obj.key);m.position.set(obj.x,7.8,obj.y);m.material=threadMat;m.baseY=7.8;this.props.set(obj.key,m)}
  this.wallMats=[...new Set(this.wallMats)];this.maps=this.wallMats.map(m=>m.diffuseTexture);this.sightBoxes=this.boxes.filter(({bounds:b,name})=>(/_\d\d$/.test(name)||name==='secret_wall')&&b[2]<1.55&&b[5]>1.55);this.scene.skipPointerMovePicking=true;this.ready=true;dispatchEvent(new CustomEvent('dw-ready'));document.querySelector('#begin').disabled=false;document.querySelector('#begin').textContent='Enter the apartment';document.querySelector('#load-state').textContent='';
 }catch(e){console.error(e);document.querySelector('#load-state').textContent='The apartment could not load. Refresh to try again, or explore through Rooms.';document.querySelector('#begin').disabled=true;document.querySelector('#begin').textContent='Apartment unavailable';this.failed=true;dispatchEvent(new CustomEvent('dw-failed'))}}
 skyThread(name){
  // A loose thread hanging down out of the night sky, with a little spool on the end: pull it.
  const parts=[],col=(m,hex)=>{const c=B.Color3.FromHexString(hex),n=m.getTotalVertices(),a=[];for(let i=0;i<n;i++)a.push(c.r,c.g,c.b,1);m.setVerticesData('color',a);parts.push(m);return m};
  col(B.MeshBuilder.CreateCylinder('t',{diameter:.016,height:6.6,tessellation:4},this.scene),'#ff7cf6').position.y=-3.3;
  col(B.MeshBuilder.CreateCylinder('t',{diameter:.075,height:.1,tessellation:8},this.scene),'#f45ff0').position.y=-6.68;
  for(const y of [-6.62,-6.74])col(B.MeshBuilder.CreateCylinder('t',{diameter:.115,height:.016,tessellation:8},this.scene),'#e6e4ee').position.y=y;
  const tail=col(B.MeshBuilder.CreateCylinder('t',{diameter:.01,height:.3,tessellation:3},this.scene),'#ffb0f8');tail.position.set(.05,-6.88,0);tail.rotation.z=.3;
  const m=B.Mesh.MergeMeshes(parts,true,true);m.name=name;m.isPickable=false;return m;
 }
 resize(){const aspect=innerWidth/innerHeight,budget=this.touch?210000:650000,w=Math.min(1250,Math.sqrt(budget*aspect));const [rw,rh]=PS1.enabled?ps1Size(aspect):[Math.floor(w),Math.floor(w/aspect)];this.engine.setSize(rw,rh);this.ps1?.setRenderSize(rw,rh);
  // Babylon's fov is vertical. In portrait that leaves a narrow ~35° side-to-side view, so widen it to keep ~64° across, capped so walls don't fisheye.
  const deg=Math.PI/180,across=(aspect<1?62:80)*deg,v=2*Math.atan(Math.tan(across/2)/aspect);this.camera.fov=aspect<1?Math.min(95*deg,v):Math.min(70*deg,Math.max(50*deg,v));this.hHalf=Math.atan(Math.tan(this.camera.fov/2)*aspect)}
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
 async hangGarments(list){const r=await hangGarments(this.scene,list,{});this.ticks.push(r.tick);this.ps1.refreshTextures();return r.cards.length}
 setOfferings(st){if(this.exterior?.shrine&&this.boxes)this.exterior.shrine.setOfferings(st);else this.pendingOfferings=st}
 outside(z){return z>this.exterior.outsideZ}
 constrain(x,z){return this.exterior.constrain(x,z)}
 hitsBox(x,z){const r=.22,y=-z;return this.boxes.some(({bounds:b,name})=>!(name==='secret_wall'&&this.passageOpen)&&b[2]<1.8&&b[5]>.04&&x>b[0]-r&&x<b[3]+r&&y>b[1]-r&&y<b[4]+r)}
 openPassage(t){this.openAt=t}
 render(p,found,dream,lace,t,reduced){this.player=p;this.found=found;this.dream=dream;const moved=this.prev?Math.hypot(p.x-this.prev.x,p.y-this.prev.y):0;this.phase=(this.phase||0)+moved*7;this.prev={...p};const bob=!reduced&&moved>.0001?Math.sin(this.phase)*.014:0;this.camera.position.set(p.x,1.55+bob,p.y);this.camera.setTarget(new B.Vector3(p.x+Math.cos(p.a),1.55+bob,p.y+Math.sin(p.a)));
  if(this.dream!==this.lastDream){this.lastDream=this.dream;LINING.factor=dream?LACE_LINING.dream:1;this.paintSky(!!dream);this.scene.clearColor=B.Color4.FromHexString((dream?SKY.dream:SKY.normal)+'ff');this.scene.fogColor=B.Color3.FromHexString(dream?MIST.dream:MIST.normal);this.sun.diffuse=B.Color3.FromHexString(dream?'#d8e2ff':'#eaecff')}if(this.stars)this.stars.rotation.y=reduced?0:t*(dream?.000025:.000002);
  if(this.gate)this.gate.material.emissiveColor=B.Color3.FromHexString(dream?'#b23fae':'#000000');
  if(this.ready){if(this.lace!==lace){this.wallMats.forEach((m,i)=>m.diffuseTexture=lace?this.maps[i]:null);this.lace=lace}
   this.spirit.position.set(p.x,1.3,p.y);if(!reduced)this.spirit.rotation.y=t*.0012;const md=Math.hypot(p.x-9.3,p.y-2.1),facing=md>.01?((9.3-p.x)*Math.cos(p.a)+(2.1-p.y)*Math.sin(p.a))/md:1,seen=p.x<9.3&&md<9&&facing>Math.cos(Math.min(1.5,(this.hHalf||.7)+.3)),rr=!seen?1e6:md<5?(this.touch?2:1):(this.touch?4:2);if(this.reflection.refreshRate!==rr)this.reflection.refreshRate=rr;
   for(const f of this.ticks)f(t,reduced,p);
   for(const {o,y}of this.pearls)o.position.y=y+(reduced?0:Math.sin(t*.0013+y*4)*.055);const pm=this.pearlMesh;if(pm&&!reduced&&t-pm.last>33){pm.last=t;const off=pm.ys.map(y=>Math.sin(t*.0013+y*4)*.055);for(let i=0;i<pm.id.length;i++){pm.pos[i*3]=pm.base[i*3];pm.pos[i*3+1]=pm.base[i*3+1]+off[pm.id[i]];pm.pos[i*3+2]=pm.base[i*3+2]}pm.merged.updateVerticesData('position',pm.pos)}
   let ti=0;for(const [key,o]of this.props){ti++;if(found.has(key)){if(!o.gone){o.t0??=t;const k=reduced?1:Math.min(1,(t-o.t0)/900);o.position.y=o.baseY+k*k*9;if(k>=1){o.setEnabled(false);o.gone=true}}}else if(!reduced){o.rotation.z=Math.sin(t*.0009+ti*2)*.035;o.rotation.x=Math.sin(t*.0007+ti)*.03;o.rotation.y=t*.0006}}
   if(this.openAt!==undefined&&this.gate){const a=reduced?1:Math.min(1,(t-this.openAt)/1300);this.gate.position.y=this.gateBase+a*a*(3-2*a)*2.4;this.passageOpen=a>.95}
  }this.engine.beginFrame();this.scene.render();this.engine.endFrame()
 }
}
