/* NOCTURNE 3D EXPERIENCE
 * Additive presentation layer. The existing game state and server remain authoritative.
 * No game rules live here.
 */
(function(){
  'use strict';

  const THREE_URL='https://esm.sh/three@0.180.0';
  const CONTROLS_URL='https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js?deps=three@0.180.0';

  const state={public:null,private:null,ready:false,loaded:false,mapOpen:false,three:null,controls:null,scene:null,camera:null,renderer:null,root:null,raycaster:null,pointer:null,locationMeshes:new Map(),personMeshes:new Map(),cctvMeshes:[],clock:new Date(),frame:0};

  const qs=s=>document.querySelector(s);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function createShell(){
    if(document.getElementById('nocturne3d-root'))return;
    const root=document.createElement('div');
    root.id='nocturne3d-root';
    root.innerHTML='<div class="nocturne3d-vignette"></div>';
    document.body.insertBefore(root,document.body.firstChild);

    const controls=document.createElement('div');
    controls.id='nocturne3d-controls';
    controls.innerHTML='<button class="nocturne3d-btn" id="nocturne3d-map-btn" type="button">◎ 3D MAP</button>';
    document.body.appendChild(controls);

    const map=document.createElement('div');
    map.id='nocturne3d-map';
    map.innerHTML=`
      <div class="nocturne3d-map-head">
        <div>
          <div class="nocturne3d-map-kicker">SPATIAL CASE NETWORK</div>
          <div class="nocturne3d-map-title" id="nocturne3d-map-title">CAMPUS MAP</div>
        </div>
        <div><button class="nocturne3d-btn nocturne3d-map-close" id="nocturne3d-map-close" type="button">CLOSE ×</button></div>
      </div>
      <div class="nocturne3d-map-hint">DRAG ROTATE · SCROLL ZOOM · CLICK A LOCATION TO FOCUS</div>
      <div class="nocturne3d-map-legend"><span><i class="nocturne3d-dot"></i>PLAYER</span><span><i class="nocturne3d-dot npc"></i>NPC</span><span><i class="nocturne3d-dot cctv"></i>CCTV</span></div>`;
    document.body.appendChild(map);

    const tip=document.createElement('div');
    tip.id='nocturne3d-tooltip';
    tip.className='nocturne3d-tooltip';
    document.body.appendChild(tip);

    document.getElementById('nocturne3d-map-btn').onclick=toggleMap;
    document.getElementById('nocturne3d-map-close').onclick=()=>setMap(false);
  }

  async function loadThree(){
    if(state.loaded)return true;
    try{
      const [THREE,MOD]=await Promise.all([import(THREE_URL),import(CONTROLS_URL)]);
      state.three=THREE;
      state.OrbitControls=MOD.OrbitControls;
      state.loaded=true;
      return true;
    }catch(error){
      console.error('[NOCTURNE 3D] WebGL module load failed:',error);
      return false;
    }
  }

  function initScene(){
    if(state.ready||!state.three)return;
    const T=state.three;
    state.root=document.getElementById('nocturne3d-root');
    state.scene=new T.Scene();
    state.scene.fog=new T.FogExp2(0x05080b,.018);
    state.camera=new T.PerspectiveCamera(46,innerWidth/innerHeight,.1,500);
    state.camera.position.set(0,34,42);

    state.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    state.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    state.renderer.setSize(innerWidth,innerHeight,false);
    state.renderer.outputColorSpace=T.SRGBColorSpace;
    state.renderer.toneMapping=T.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure=.85;
    state.root.appendChild(state.renderer.domElement);

    const hemi=new T.HemisphereLight(0xa8c6c9,0x071014,.72);
    state.scene.add(hemi);
    const key=new T.DirectionalLight(0xd9ecec,1.15);
    key.position.set(-18,32,14);
    state.scene.add(key);
    const rim=new T.PointLight(0x7aa6ad,22,80,2);
    rim.position.set(0,9,-10);
    state.scene.add(rim);

    buildGround();
    buildCampus();
    buildCameras();
    buildAmbient();

    state.raycaster=new T.Raycaster();
    state.pointer=new T.Vector2();
    state.renderer.domElement.addEventListener('pointermove',onPointerMove,{passive:true});
    state.renderer.domElement.addEventListener('click',onCanvasClick);
    window.addEventListener('resize',resize);

    state.ready=true;
    document.body.classList.add('nocturne3d-ready');
    requestAnimationFrame(loop);
  }

  function mat(color,rough=.7,metal=.1,opacity=1){
    const T=state.three;
    return new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,transparent:opacity<1,opacity});
  }

  function buildGround(){
    const T=state.three;
    const ground=new T.Mesh(new T.PlaneGeometry(180,180),mat(0x081014,.95,0));
    ground.rotation.x=-Math.PI/2;
    ground.position.y=-.35;
    ground.name='campus-ground';
    state.scene.add(ground);

    const grid=new T.GridHelper(150,30,0x173039,0x0b1b20);
    grid.position.y=-.3;
    grid.material.transparent=true;
    grid.material.opacity=.42;
    state.scene.add(grid);

    const roadMat=mat(0x11191d,.95,0);
    [[0,0,8,150],[0,0,150,8],[-42,18,8,88],[38,-18,8,88]].forEach(([x,z,w,d])=>{
      const r=new T.Mesh(new T.BoxGeometry(w,.08,d),roadMat);
      r.position.set(x,-.24,z);
      state.scene.add(r);
    });
  }

  function buildCampus(){
    const areas=Array.isArray(state.public?.world?.areas)?state.public.world.areas:[];
    const names=areas.length?areas:['Central Hall','Library','Laboratory','Administration','Courtyard','Cafeteria','Security Office','Parking'];
    const positions=layoutPositions(names.length);
    names.forEach((name,i)=>createBuilding(name,positions[i],i));
  }

  function layoutPositions(n){
    const out=[];
    const cols=Math.max(3,Math.ceil(Math.sqrt(n)));
    const gap=23;
    for(let i=0;i<n;i++){
      const row=Math.floor(i/cols),col=i%cols;
      const x=(col-(cols-1)/2)*gap;
      const z=(row-(Math.ceil(n/cols)-1)/2)*gap;
      out.push({x,z});
    }
    return out;
  }

  function createBuilding(name,pos,index){
    const T=state.three;
    const group=new T.Group();
    const w=10+(index%3)*2;
    const d=8+((index+1)%3)*2;
    const h=3.5+(index%4)*1.25;
    const body=new T.Mesh(new T.BoxGeometry(w,h,d),mat(index%2?0x101b20:0x0d171b,.72,.2));
    body.position.y=h/2;
    body.userData={kind:'location',name};
    group.add(body);

    const roof=new T.Mesh(new T.BoxGeometry(w+.45,.28,d+.45),mat(0x26353a,.5,.35));
    roof.position.y=h+.15;
    roof.userData={kind:'location',name};
    group.add(roof);

    const band=new T.Mesh(new T.BoxGeometry(w+.05,.18,.16),mat(0x86aeb2,.35,.55,.72));
    band.position.set(0,h*.58,d/2+.08);
    band.userData={kind:'location',name};
    group.add(band);

    const sign=new T.Mesh(new T.BoxGeometry(Math.min(w*.72,7),.42,.08),mat(0x17262b,.35,.35,.94));
    sign.position.set(0,h*.68,d/2+.13);
    sign.userData={kind:'location',name};
    group.add(sign);

    group.position.set(pos.x,0,pos.z);
    group.userData={kind:'location',name,position:{x:pos.x,z:pos.z}};
    state.scene.add(group);
    state.locationMeshes.set(name,group);
  }

  function buildCameras(){
    const T=state.three;
    const cams=Array.isArray(state.public?.cameras)?state.public.cameras:[];
    cams.forEach((cam,i)=>{
      const areas=Array.isArray(state.public?.world?.areas)?state.public.world.areas:[];
      const area=cam.area||areas[i%Math.max(1,areas.length)]||'Central';
      const building=state.locationMeshes.get(area);
      if(!building)return;
      const body=new T.Mesh(new T.CylinderGeometry(.22,.28,.42,12),mat(0x9b8056,.5,.5));
      body.position.set(building.position.x,building.children[0].position.y+2.2,building.position.z);
      body.userData={kind:'cctv',id:cam.id,area};
      state.scene.add(body);
      state.cctvMeshes.push(body);
    });
  }

  function buildAmbient(){
    const T=state.three;
    const group=new T.Group();
    for(let i=0;i<90;i++){
      const p=new T.Mesh(new T.SphereGeometry(.025+(i%4)*.012,6,6),mat(i%5===0?0xb8d4d7:0x4c6870,.8,.1));
      const a=i*2.399;
      const r=28+(i%13)*4;
      p.position.set(Math.cos(a)*r,.4+(i%7)*.8,Math.sin(a)*r);
      group.add(p);
    }
    state.scene.add(group);
    state.ambient=group;
  }

  function rebuildPeople(){
    const T=state.three;
    state.personMeshes.forEach(m=>state.scene.remove(m));
    state.personMeshes.clear();
    const people=Array.isArray(state.public?.people)?state.public.people:[];
    people.forEach((p,i)=>{
      if(!p.location||p.alive===false)return;
      const building=state.locationMeshes.get(p.location);
      if(!building)return;
      const color=p.isPlayer?0xd7eeee:0x7c9197;
      const marker=new T.Mesh(new T.SphereGeometry(p.isPlayer?.42:.3,12,12),mat(color,.35,.45));
      marker.position.set(building.position.x+((i%3)-1)*1.35,.75,building.position.z+((Math.floor(i/3)%3)-1)*1.35);
      marker.userData={kind:'person',id:p.id,name:p.name,isPlayer:!!p.isPlayer,location:p.location};
      state.scene.add(marker);
      state.personMeshes.set(p.id,marker);
    });
  }

  function updateLocations(){
    const T=state.three;
    const people=Array.isArray(state.public?.people)?state.public.people:[];
    people.forEach(p=>{
      const marker=state.personMeshes.get(p.id);
      const building=state.locationMeshes.get(p.location);
      if(!marker||!building)return;
      marker.userData.location=p.location;
      marker.userData.alive=p.alive;
      const target=new T.Vector3(building.position.x,marker.position.y,building.position.z);
      const offset=((String(p.id).length%3)-1)*1.4;
      target.x+=offset;
      target.z+=((String(p.name||'').length%3)-1)*1.4;
      marker.position.lerp(target,.055);
      marker.scale.setScalar(p.isPlayer?1.05:1);
    });
  }

  function updateBuildings(){
    const phase=state.public?.phase||'';
    state.locationMeshes.forEach((group,name)=>{
      const active=state.public?.evidence?.some(e=>String(e.description||'').toLowerCase().includes(name.toLowerCase()));
      const pulse=active||phase==='CRIME';
      const band=group.children[2];
      if(band?.material){
        band.material.emissive?.setHex(pulse?0x30484c:0x000000);
        band.material.emissiveIntensity=pulse?.7:0;
      }
    });
  }

  function updateFromState(){
    if(!state.ready)return;
    if(state.locationMeshes.size===0&&state.public?.world?.areas?.length){
      buildCampus();
      buildCameras();
    }
    rebuildPeople();
    updateBuildings();
    updateMapTitle();
    document.body.classList.toggle('nocturne3d-game',!!state.public);
    document.body.classList.toggle('nocturne3d-active',!!state.public);
  }

  function updateMapTitle(){
    const title=document.getElementById('nocturne3d-map-title');
    if(title)title.textContent=state.public?.world?.name?`${state.public.world.name} · 3D MAP`:'CAMPUS MAP';
  }

  function onPointerMove(e){
    if(!state.ready||state.mapOpen===false)return;
    const rect=state.renderer.domElement.getBoundingClientRect();
    state.pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
    state.pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
    state.raycaster.setFromCamera(state.pointer,state.camera);
    const hits=state.raycaster.intersectObjects([...state.locationMeshes.values(),...state.personMeshes.values(),...state.cctvMeshes],true);
    const hit=hits[0]?.object;
    const data=hit?.userData||{};
    const tip=document.getElementById('nocturne3d-tooltip');
    if(!tip)return;
    if(data.kind){
      tip.style.display='block';
      tip.style.left=`${e.clientX+14}px`;
      tip.style.top=`${e.clientY+14}px`;
      if(data.kind==='location')tip.innerHTML=`<b>${esc(data.name)}</b><span>LOCATION · CLICK TO FOCUS</span>`;
      if(data.kind==='person')tip.innerHTML=`<b>${esc(data.name)}</b><span>${data.isPlayer?'PLAYER':'NPC'} · ${esc(data.location||'UNKNOWN')}</span>`;
      if(data.kind==='cctv')tip.innerHTML=`<b>${esc(data.id)}</b><span>CCTV · ${esc(data.area)}</span>`;
      return;
    }
    tip.style.display='none';
  }

  function onCanvasClick(){
    if(!state.mapOpen)return;
    state.raycaster.setFromCamera(state.pointer,state.camera);
    const hits=state.raycaster.intersectObjects([...state.locationMeshes.values(),...state.personMeshes.values(),...state.cctvMeshes],true);
    const data=hits[0]?.object?.userData;
    if(!data)return;
    if(data.kind==='location')focusLocation(data.name);
    if(data.kind==='person')focusLocation(data.location);
    if(data.kind==='cctv')focusLocation(data.area);
  }

  function focusLocation(name){
    const group=state.locationMeshes.get(name);
    if(!group||!state.controls)return;
    const T=state.three;
    const target=new T.Vector3(group.position.x,0,group.position.z);
    const direction=new T.Vector3(0,1,1.25).normalize();
    state.controls.target.copy(target);
    state.camera.position.copy(target.clone().add(direction.multiplyScalar(18)));
    state.controls.update();
    group.children.forEach((m,j)=>{m.scale.setScalar(1);if(j===0)m.scale.setScalar(1.025)});
    window.setTimeout(()=>group.children.forEach(m=>m.scale.setScalar(1)),500);
  }

  function setupControls(){
    if(state.controls||!state.renderer)return;
    state.controls=new state.OrbitControls(state.camera,state.renderer.domElement);
    state.controls.enableDamping=true;
    state.controls.dampingFactor=.075;
    state.controls.minDistance=10;
    state.controls.maxDistance=100;
    state.controls.maxPolarAngle=Math.PI*.46;
    state.controls.minPolarAngle=.25;
    state.controls.target.set(0,0,0);
    state.controls.enabled=false;
  }

  function setMap(open){
    if(!state.public)return;
    state.mapOpen=!!open;
    const map=document.getElementById('nocturne3d-map');
    const btn=document.getElementById('nocturne3d-map-btn');
    map?.classList.toggle('open',state.mapOpen);
    btn?.classList.toggle('active',state.mapOpen);
    document.body.classList.toggle('nocturne3d-map-open',state.mapOpen);
    if(state.renderer){
      state.renderer.domElement.style.pointerEvents=state.mapOpen?'auto':'none';
    }
    if(state.controls){
      state.controls.enabled=state.mapOpen;
      if(state.mapOpen){
        state.controls.target.set(0,0,0);
        state.camera.position.set(0,38,48);
        state.controls.update();
      }
    }
    const tip=document.getElementById('nocturne3d-tooltip');
    if(!state.mapOpen&&tip)tip.style.display='none';
  }

  function toggleMap(){setMap(!state.mapOpen)}

  function resize(){
    if(!state.renderer||!state.camera)return;
    state.camera.aspect=innerWidth/innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    state.renderer.setSize(innerWidth,innerHeight,false);
  }

  function loop(t){
    state.frame++;
    if(state.ready){
      const T=state.three;
      const time=t*.00025;
      if(state.ambient)state.ambient.rotation.y=time*.16;
      if(!state.mapOpen&&state.camera){
        const x=Math.sin(time*.7)*.75;
        const z=Math.cos(time*.6)*.45;
        state.camera.position.x+=(x-state.camera.position.x)*.006;
        state.camera.position.z+=(42+z-state.camera.position.z)*.006;
        state.camera.lookAt(0,2,0);
      }
      updateLocations();
      state.renderer.render(state.scene,state.camera);
    }
    requestAnimationFrame(loop);
  }

  function updatePublicState(publicState){
    state.public=publicState||null;
    if(!state.loaded||!state.ready){
      boot();
      return;
    }
    updateFromState();
  }

  function updatePrivateState(privateState){state.private=privateState||null}

  async function boot(){
    createShell();
    const ok=await loadThree();
    if(!ok)return;
    initScene();
    setupControls();
    if(window.NOCTURNE_PUBLIC_STATE)state.public=window.NOCTURNE_PUBLIC_STATE;
    updateFromState();
  }

  window.nocturne3D={init:boot,updatePublicState,updatePrivateState,focusLocation,setMap,toggleMap,destroy:function(){
    try{state.renderer?.dispose();state.controls?.dispose()}catch(e){}
    document.getElementById('nocturne3d-root')?.remove();
    document.getElementById('nocturne3d-controls')?.remove();
    document.getElementById('nocturne3d-map')?.remove();
    document.getElementById('nocturne3d-tooltip')?.remove();
    document.body.classList.remove('nocturne3d-ready','nocturne3d-game','nocturne3d-active','nocturne3d-map-open');
    state.ready=false;
  }};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
