// Lightweight scene geometry. All dimensions are metres; arguments use Blender XYZ.
export function addApartmentDetails(B,scene,boxes){
 const groups=new Map();
 function mat(name,hex){const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(hex);m.specularColor=B.Color3.Black();m.backFaceCulling=false;m.maxSimultaneousLights=5;return m}
 const ivory=mat('aged enamel','#aa9384'),wood=mat('walnut','#563039'),linen=mat('rose linen','#c993a9'),sheet=mat('ivory linen','#e8d3cf'),iron=mat('bed iron','#49394b'),brass=mat('handles','#96714d'),plaster=mat('exposed plaster','#a69385'),paper=mat('paper reverse','#d7bcaa'),grime=mat('old water marks','#8c7067');
 function keep(o,m){o.material=m;o.layerMask=1;o.isPickable=false;if(!groups.has(m))groups.set(m,[]);groups.get(m).push(o);return o}
 function box(n,[x,y,z],[w,d,h],m,solid=false){const o=keep(B.MeshBuilder.CreateBox(n,{width:w,depth:d,height:h},scene),m);o.position.set(x,z,-y);if(solid)boxes.push({name:n,bounds:[x-w/2,y-d/2,z-h/2,x+w/2,y+d/2,z+h/2]});return o}
 function rod(n,a,b,r,m){const start=new B.Vector3(a[0],a[2],-a[1]),end=new B.Vector3(b[0],b[2],-b[1]),delta=end.subtract(start);const o=keep(B.MeshBuilder.CreateCylinder(n,{height:delta.length(),diameter:r*2,tessellation:8},scene),m);o.position=start.add(end).scale(.5);o.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(),delta.normalize(),new B.Quaternion());return o}
 box('bed base',[-6.6,8.65,.29],[1.45,2.1,.30],wood,true);box('mattress',[-6.6,8.65,.49],[1.4,2.03,.22],sheet);box('coverlet',[-6.6,8.34,.615],[1.43,1.42,.065],linen);box('pillow',[-6.6,9.3,.66],[1.02,.43,.15],sheet);
 for(const x of [-7.27,-5.93])rod('bed post',[x,9.63,.1],[x,9.63,1.22],.035,iron);
 rod('headboard',[-7.27,9.63,1.2],[-5.93,9.63,1.2],.035,iron);
 for(const x of [-7.1,-6.85,-6.6,-6.35,-6.1])rod('spindle',[x,9.63,.5],[x,9.63,1.2],.019,iron);
 for(const x of [-7.28,-5.92])box('linen edge',[x,8.34,.43],[.035,1.42,.36],linen);
 box('dresser',[-4.75,9.53,.55],[1.5,.55,1.1],wood,true);box('dresser top',[-4.75,9.53,1.12],[1.56,.60,.06],wood);
 for(const z of [.25,.58,.91]){box('drawer',[-4.75,9.239,z],[1.36,.025,.27],wood);for(const x of [-5.15,-4.35])rod('drawer handle',[x-.075,9.19,z],[x+.075,9.19,z],.021,brass)}
 for(const [x,y]of [[1.6,9.56],[-1.05,-9.53],[-9.05,-2.75]]){const west=x<-8,pos=(u,v,z)=>west?[x+v,y+u,z]:[x+u,y+v,z];for(let i=0;i<9;i++)rod('radiator rib',pos((i-4)*.105,0,.19),pos((i-4)*.105,0,.82),.055,ivory);for(const z of [.24,.75])rod('radiator manifold',pos(-.5,0,z),pos(.5,0,z),.045,ivory);rod('radiator pipe',pos(.52,0,.1),pos(.52,0,.78),.025,ivory);const [w,d]=west?[.18,1.08]:[1.08,.18];boxes.push({name:'radiator',bounds:[x-w/2,y-d/2,.1,x+w/2,y+d/2,.9]})}
 // The bedroom is a small reward room at the far end of the gallery. Two low walls
 // leave a narrow doorway, but both the geometry and collision stay locked until
 // the central pearl opens the secret passage.
 box('bedroom_partition_west',[-8.9,7.35,1.4],[1.0,.18,2.8],plaster,true);
 box('bedroom_partition_east',[-6.55,7.35,1.4],[1.7,.18,2.8],plaster,true);
 box('bedroom_partition_left',[-7.5,8.65,1.4],[.18,2.45,2.8],plaster,true);
 box('bedroom_partition_right',[-5.6,8.65,1.4],[.18,2.45,2.8],plaster,true);
 function mesh(n,points,indices,m){const v=new B.VertexData();v.positions=points.flatMap(([x,y,z])=>[x,z,-y]);v.indices=indices;v.normals=[];B.VertexData.ComputeNormals(v.positions,indices,v.normals);const o=new B.Mesh(n,scene);v.applyToMesh(o);keep(o,m)}
 for(const [c,w,h,axis,sign]of [[[-1.4,-5.711,1.1],.38,.8,'x',-1],[[-9.389,-2.6,1.65],.48,.65,'y',1],[[-6.3,9.889,1.8],.72,.45,'x',-1],[[-6.2,5.689,1.25],.25,.9,'x',-1],[[9.389,3.5,1.5],.34,.6,'y',-1]]){
  const pts=[c],idx=[];for(let i=0;i<13;i++){const a=i*Math.PI*2/13,r=.8+.18*Math.sin(i*7.3),p=[...c];p[axis==='x'?0:1]+=Math.cos(a)*w*.5*r;p[2]+=Math.sin(a)*h*.5*r;pts.push(p);idx.push(0,i+1,(i+1)%13+1)}mesh('torn wallpaper',pts,idx,plaster);const a=pts[2],b=pts[4],tip=a.map((v,i)=>(v+b[i])/2);tip[2]-=h*.2;tip[axis==='x'?1:0]+=sign*.085;mesh('peeling paper',[a,b,tip],[0,1,2],paper);
 }
 for(const [i,x]of [-7.8,-6.9,-5.8,-3.7,2.1,2.8].entries())box('water mark',[x,9.887,.24],[.25+i%3*.1,.006,.1+i%2*.1],grime);
 // Keep the small furniture set as individual meshes. Babylon cannot merge the
 // mixed box, cylinder and hand-built tear attributes reliably on every device.
 for(const meshes of groups.values())for(const m of meshes)m.freezeWorldMatrix()
}
