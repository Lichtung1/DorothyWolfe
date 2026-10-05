import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
import {Reflector} from './vendor/objects/Reflector.js';
export class ApartmentWorld {
 constructor(canvas,map,objects,touch){
  this.objects=objects;this.touch=touch;this.ready=false;this.passageOpen=false;this.props=new Map();this.pearls=[];this.walls=[];this.ray=new T.Raycaster();
  this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.scene=new T.Scene();this.scene.background=new T.Color('#21152f');this.camera=new T.PerspectiveCamera(72,1,.06,90);this.resize();
  this.scene.add(new T.HemisphereLight('#fff0ed','#816376',2.3));this.sun=new T.DirectionalLight('#ffdcc1',2);this.sun.position.set(-4,8,3);this.scene.add(this.sun);
  this.scene.add(new T.AmbientLight('#c6a2d3',.35));
  for(const [x,y,z,c] of [[-7.1,2,1,0xffca8e],[0,3,0,0xcebbff],[8,2,2,0xffc8a2]]){const l=new T.PointLight(c,7,7,2);l.position.set(x,y,z);this.scene.add(l)}
  const pos=[];for(let i=0;i<330;i++){let a=Math.random()*Math.PI*2,h=.12+Math.random()*.87,r=50;pos.push(Math.cos(a)*r*Math.sqrt(1-h*h),h*r,Math.sin(a)*r*Math.sqrt(1-h*h))}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));this.scene.add(new T.Points(g,new T.PointsMaterial({color:'#efc9e1',size:.07,sizeAttenuation:true})));
  this.load();
 }
 async load(){try{
  const [gl,data]=await Promise.all([new GLTFLoader().loadAsync('assets/apartment.glb'),fetch('assets/collision.json').then(r=>{if(!r.ok)throw Error('collision');return r.json()})]);this.boxes=data.boxes;this.floors=data.floors;this.scene.add(gl.scene);gl.scene.updateMatrixWorld(true);
  const batches=new Map();this.wallMats=[];
  gl.scene.traverse(o=>{if(!o.isMesh)return;const name=o.name;const mats=Array.isArray(o.material)?o.material:[o.material];for(let m of mats){m.roughness=1;m.metalness=0;if(m.map){m.map.anisotropy=2;if(m.name.includes('floral'))this.wallMats.push(m)}}
   if(name==='secret_wall'){this.gate=o;this.gateBase=o.position.y;return}
   if(name.includes('Floating_pearl')){this.pearls.push({o,y:o.position.y});return}
   if(name==='mirror_surface'){o.visible=false;return}
   // Bake transforms and merge static meshes by material to reduce draw calls.
   if(!Array.isArray(o.material)){const geom=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geom.applyMatrix4(o.matrixWorld);for(const a of Object.keys(geom.attributes))if(!['position','normal','uv'].includes(a))geom.deleteAttribute(a);if(!geom.attributes.uv)geom.setAttribute('uv',new T.BufferAttribute(new Float32Array(geom.attributes.position.count*2),2));if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geom);o.visible=false}
  });
  for(const [material,geoms] of batches){const geom=mergeGeometries(geoms);if(geom)this.scene.add(new T.Mesh(geom,material));for(const g of geoms)g.dispose()}
  this.mirror=new Reflector(new T.PlaneGeometry(1,2),{textureWidth:this.touch?128:256,textureHeight:this.touch?256:512,color:0xb4a4b9});this.mirror.position.set(9.30,1.3,2.1);this.mirror.rotation.y=-Math.PI/2;this.mirror.camera.layers.enable(1);this.scene.add(this.mirror);
  this.spirit=new T.Mesh(new T.IcosahedronGeometry(.17,2),new T.MeshBasicMaterial({color:'#ffd7ed'}));this.spirit.layers.set(1);this.scene.add(this.spirit);
  for(const o of this.objects.filter(o=>o.key.startsWith('thread'))){const m=new T.Mesh(new T.TorusGeometry(.1,.012,4,12),new T.MeshBasicMaterial({color:'#ffbddd'}));m.position.set(o.x,1.05,o.y);this.scene.add(m);this.props.set(o.key,m)}
  this.wallMats=[...new Set(this.wallMats)];this.maps=this.wallMats.map(m=>m.map);this.ready=true;document.querySelector('#begin').disabled=false;document.querySelector('#begin').textContent='Enter';document.querySelector('#load-state').textContent='';
 }catch(e){console.error(e);document.querySelector('#load-state').textContent='The apartment could not load. Refresh to try again, or explore through Rooms.';document.querySelector('#begin').disabled=false;document.querySelector('#begin').textContent='Open directory';this.failed=true}}
 resize(){let aspect=innerWidth/innerHeight,budget=this.touch?210000:650000,w=Math.min(1250,Math.sqrt(budget*aspect));this.renderer.setSize(Math.floor(w),Math.floor(w/aspect),false);this.camera.aspect=aspect;this.camera.updateProjectionMatrix()}
 blocked(x,z){if(!this.ready)return true;const r=.22,y=-z;
  if(this.boxes.some(({bounds:b,name})=>!(name==='secret_wall'&&this.passageOpen)&&b[2]<1.8&&b[5]>.04&&x>b[0]-r&&x<b[3]+r&&y>b[1]-r&&y<b[4]+r))return true;
  return [[-r,-r],[-r,r],[r,-r],[r,r]].some(([dx,dy])=>!this.floors.some(b=>x+dx>=b[0]&&x+dx<=b[3]&&y+dy>=b[1]&&y+dy<=b[4]));
 }
 clear(x,z,tx,tz){const n=Math.ceil(Math.hypot(tx-x,tz-z)/.1);for(let i=1;i<n-2;i++){let px=x+(tx-x)*i/n,py=-(z+(tz-z)*i/n);if(this.boxes.some(({bounds:b,name})=>(/_\d\d$/.test(name)||(name==='secret_wall'&&!this.passageOpen))&&b[2]<1.55&&b[5]>1.55&&px>b[0]&&px<b[3]&&py>b[1]&&py<b[4]))return false}return true}
 nearest(p,found){if(!this.ready)return null;let best=null,d=2.5;for(const o of this.objects){if(found.has(o.key)||o.key==='passage'&&(!this.dream||this.passageOpen))continue;let dx=o.x-p.x,dz=o.y-p.y,r=Math.hypot(dx,dz);if(r<d&&(dx*Math.cos(p.a)+dz*Math.sin(p.a))/r>.55&&this.clear(p.x,p.y,o.x,o.y)){best=o;d=r}}return best}
 hitAt(){return this.player?this.nearest(this.player,this.found):null}
 activate(key,t){this.active={key,t}}
 openPassage(t){this.openAt=t}
 render(p,found,dream,lace,t,reduced){this.player=p;this.found=found;this.dream=dream;const moved=this.prev?Math.hypot(p.x-this.prev.x,p.y-this.prev.y):0;this.phase=(this.phase||0)+moved*7;this.prev={...p};const bob=!reduced&&moved>.0001?Math.sin(this.phase)*.014:0;this.camera.position.set(p.x,1.55+bob,p.y);this.camera.lookAt(p.x+Math.cos(p.a),1.55+bob,p.y+Math.sin(p.a));
  this.scene.background.set(dream?'#3a204a':'#21152f');this.sun.color.set(dream?'#edbdff':'#ffdcc1');
  if(this.ready){if(this.lace!==lace){this.wallMats.forEach((m,i)=>{m.map=lace?this.maps[i]:null;m.needsUpdate=true});this.lace=lace}
   this.spirit.position.set(p.x,1.25,p.y);this.mirror.visible=Math.hypot(p.x-9.3,p.y-2.1)<4&&p.x<9.3;
   for(const {o,y}of this.pearls)o.position.y=y+(reduced?0:Math.sin(t*.0013+y*4)*.055);
   for(const [key,o]of this.props){o.visible=!found.has(key);if(!reduced)o.rotation.y=t*.001}
   if(this.openAt!==undefined&&this.gate){const a=reduced?1:Math.min(1,(t-this.openAt)/1300);this.gate.position.y=this.gateBase+a*a*(3-2*a)*2.4;this.passageOpen=a>.95}
  }this.renderer.render(this.scene,this.camera)
 }
}
