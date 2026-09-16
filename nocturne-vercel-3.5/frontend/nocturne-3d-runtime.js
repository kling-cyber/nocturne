/* NOCTURNE 3D RUNTIME
   Reads the existing rendered game UI as a presentation bridge, so the
   authoritative game simulation and Socket.IO architecture remain untouched.
*/
(function(){
  'use strict';

  const THREE='https://esm.sh/three@0.180.0';
  const ORBIT='https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js?deps=three@0.180.0';
  const state={T:null,Orbit:null,scene:null,camera:null,renderer:null,controls:null,ray:null,pointer:null,root:null,ready:false,map:false,world:'',areas:[],people:[],locations:new Map(),markers:new Map(),cameras:[],cameraMeshes:[],lastSignature:'',observer:null};

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function shell(){
    if(document.getElementById('nocturne3d-root'))return;
    const root=document.createElement('div');
    root.id='nocturne3d-root';
    root.innerHTML='<div class="nocturne3d-vignette"></div>';
    document.body.insertBefore(root,document.body.firstChild);

    const controls=document.createElement('div');
    controls.id='nocturne3d-controls';
    controls.innerHTML='<button id="nocturne3d-map-btn" class="nocturne3d-btn" type="button">◎ 3D MAP</button>';
    document.body.appendChild(controls);

    const map=document.createElement('div');
    map.id='nocturne3d-map';
    map.innerHTML='<div class="nocturne3d-map-head"><div><div class="nocturne3d-map-kicker">SPATIAL CASE NETWORK</div><div class="nocturne3d-map-title" id="nocturne3d-map-title">CAMPUS MAP</div></div><div><button id="nocturne3d-map-close" class="nocturne3d-btn" type="button">CLOSE ×</button></div></div><div class="nocturne3d-map-hint">DRAG ROTATE · SCROLL ZOOM · CLICK A LOCATION TO FOCUS</div><div class="nocturne3d-map-legend"><span><i class="nocturne3d-dot"></i>PLAYER</span><span><i class="nocturne3d-dot npc"></i>NPC</span><span><i class="nocturne3d-dot cctv"></i>CCTV</span></div>';
    document.body.appendChild(map);

    const tip=document.createElement('div');
    tip.id='nocturne3d-tooltip';
    tip.className='nocturne3d-tooltip';
    document.body.appendChild(tip);

    document.getElementById('nocturne3d-map-btn').onclick=()=>setMap(!state.map);
    document.getElementById('nocturne3d-map-close').onclick=()=>setMap(false);
  }

  async function modules(){
    try{
      const [T,O]=await Promise.all([import(THREE),import(ORBIT)]);
      state.T=T;state.Orbit=O.OrbitControls;return true;
    }catch(e){console.error('[NOCTURNE 3D] Failed to load Three.js:',e);return false}
  }

  function material(color,rough=.72,metal=.15,emissive=0x000000){
    const T=state.T;
    return new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,emissive,emissiveIntensity:0});
  }

  function init(){
    if(state.ready)return;
    const T=state.T;
    state.root=document.getElementById('nocturne3d-root');
    state.scene=new T.Scene();
    state.scene.fog=new T.FogExp2(0x05080b,.015);
    state.camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.1,420);
    state.camera.position.set(0,30,42);
    state.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    state.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
    state.renderer.setSize(innerWidth,innerHeight,false);
    state.renderer.outputColorSpace=T.SRGBColorSpace;
    state.renderer.toneMapping=T.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure=.82;
    state.root.appendChild(state.renderer.domElement);

    state.scene.add(new T.HemisphereLight(0xadc8cb,0x050b0e,.7));
    const key=new T.DirectionalLight(0xd8e8e9,1.1);key.position.set(-22,34,18);state.scene.add(key);
    const fill=new T.PointLight(0x79aeb4,18,95,2);fill.position.set(0,12,-8);state.scene.add(fill);

    const ground=new T.Mesh(new T.PlaneGeometry(190,190),material(0x071013,.96,0));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.35;state.scene.add(ground);
    const grid=new T.GridHelper(160,32,0x173239,0x0a1b20);grid.position.y=-.29;grid.material.transparent=true;grid.material.opacity=.42;state.scene.add(grid);

    [[0,0,7,170],[0,0,170,7],[-43,20,7,82],[43,-20,7,82]].forEach(v=>{const r=new T.Mesh(new T.BoxGeometry(v[2],.07,v[3]),material(0x10181c,.96,0));r.position.set(v[0],-.24,v[1]);state.scene.add(r)});

    state.ray=new T.Raycaster();state.pointer=new T.Vector2();
    state.renderer.domElement.addEventListener('pointermove',pointerMove,{passive:true});
    state.renderer.domElement.addEventListener('click',canvasClick);
    addAmbient();
    window.addEventListener('resize',resize);
    state.ready=true;
    document.body.classList.add('nocturne3d-ready');
    setupControls();
    observeGame();
    syncFromDom();
    requestAnimationFrame(loop);
  }

  function setupControls(){
    state.controls=new state.Orbit(state.camera,state.renderer.domElement);
    state.controls.enableDamping=true;state.controls.dampingFactor=.075;state.controls.minDistance=9;state.controls.maxDistance=100;state.controls.maxPolarAngle=Math.PI*.47;state.controls.minPolarAngle=.2;state.controls.enabled=false;state.controls.target.set(0,0,0);
  }

  function addAmbient(){
    const T=state.T,g=new T.Group();
    for(let i=0;i<100;i++){
      const p=new T.Mesh(new T.SphereGeometry(.022+(i%4)*.012,6,6),material(i%6===0?0xc5dcde:0x49656b,.8,.1));
      const a=i*2.399,r=30+(i%15)*3.5;p.position.set(Math.cos(a)*r,.5+(i%8)*.72,Math.sin(a)*r);g.add(p);
    }
    state.scene.add(g);state.ambient=g;
  }

  function layout(n){
    const cols=Math.max(3,Math.ceil(Math.sqrt(n))),rows=Math.ceil(n/cols),gap=23,out=[];
    for(let i=0;i<n;i++)out.push({x:(i%cols-(cols-1)/2)*gap,z:(Math.floor(i/cols)-(rows-1)/2)*gap});
    return out;
  }

  function rebuildWorld(){
    const T=state.T;
    state.locations.forEach(g=>{g.traverse(o=>{if(o.isMesh){o.geometry?.dispose();o.material?.dispose()}});state.scene.remove(g)});
    state.locations.clear();state.markers.forEach(m=>{m.geometry?.dispose();m.material?.dispose();state.scene.remove(m)});state.markers.clear();
    state.cameraMeshes.forEach(m=>{m.geometry?.dispose();m.material?.dispose();state.scene.remove(m)});state.cameraMeshes=[];
    const names=state.areas.length?state.areas:['Central Hall','Library','Laboratory','Courtyard','Administration','Cafeteria','Security'];
    layout(names.length).forEach((p,i)=>building(names[i],p,i));
    state.cameras.forEach((c,i)=>{
      const area=c.area||names[i%names.length],g=state.locations.get(area);if(!g)return;
      const m=new T.Mesh(new T.CylinderGeometry(.22,.3,.45,12),material(0x9b8056,.48,.5));
      m.position.set(g.position.x,g.userData.height+2.1,g.position.z);m.userData={kind:'cctv',id:c.id,area};state.scene.add(m);state.cameraMeshes.push(m);
    });
  }

  function building(name,p,i){
    const T=state.T,g=new T.Group(),w=9+(i%3)*2,d=8+((i+1)%3)*2,h=3.6+(i%4)*1.15;
    const body=new T.Mesh(new T.BoxGeometry(w,h,d),material(i%2?0x111c20:0x0c161a,.74,.22));body.position.y=h/2;body.userData={kind:'location',name};g.add(body);
    const roof=new T.Mesh(new T.BoxGeometry(w+.5,.28,d+.5),material(0x26363a,.5,.35));roof.position.y=h+.15;roof.userData={kind:'location',name};g.add(roof);
    const band=new T.Mesh(new T.BoxGeometry(w+.08,.16,.14),material(0x7ea9ad,.38,.52));band.position.set(0,h*.58,d/2+.09);band.userData={kind:'location',name};g.add(band);
    const sign=new T.Mesh(new T.BoxGeometry(Math.min(w*.72,7),.38,.08),material(0x17272b,.36,.3));sign.position.set(0,h*.7,d/2+.12);sign.userData={kind:'location',name};g.add(sign);
    g.position.set(p.x,0,p.z);g.userData={kind:'location',name,height:h};state.scene.add(g);state.locations.set(name,g);
  }

  function rebuildMarkers(){
    const T=state.T;
    state.markers.forEach(m=>{m.geometry?.dispose();m.material?.dispose();state.scene.remove(m)});state.markers.clear();
    state.people.forEach((p,i)=>{
      if(!p.location||p.dead)return;const g=state.locations.get(p.location);if(!g)return;
      const m=new T.Mesh(new T.SphereGeometry(p.player?.43:.3,12,12),material(p.player?0xd9eeee:0x788f95,.32,.5));
      m.position.set(g.position.x+((i%3)-1)*1.35,.72,g.position.z+((Math.floor(i/3)%3)-1)*1.35);m.userData={kind:'person',name:p.name,location:p.location,player:p.player};state.scene.add(m);state.markers.set(p.name,m);
    });
  }

  function parseDom(){
    const game=document.getElementById('game');
    if(!game||game.classList.contains('hide'))return null;
    const world=document.getElementById('world')?.textContent.trim()||'';
    const areaEls=[...document.querySelectorAll('#locations .loc')];
    const areas=areaEls.map(x=>x.querySelector('b')?.textContent.trim()).filter(Boolean);
    const people=[...document.querySelectorAll('#people .person')].map(x=>{
      const spans=x.querySelectorAll('span'),b=x.querySelector('b');
      const first=spans[0]?.textContent.trim()||'';const name=b?.childNodes[0]?.textContent?.trim()||b?.textContent?.trim()||'';
      const location=spans[spans.length-1]?.textContent.trim()||'';
      return {name,location,player:/PLAYER/i.test(first),dead:x.classList.contains('dead')};
    }).filter(x=>x.name);
    const cameras=[...document.querySelectorAll('#cameraSelector [data-camera-id]')].map(x=>({id:x.dataset.cameraId||x.textContent.trim().split(' · ')[0],area:x.textContent.split(' · ').slice(1).join(' · ').trim()}));
    return {world,areas,people,cameras};
  }

  function syncFromDom(){
    const d=parseDom();if(!d)return;
    const sig=JSON.stringify(d);
    if(sig===state.lastSignature)return;
    const worldChanged=d.world!==state.world||JSON.stringify(d.areas)!==JSON.stringify(state.areas);
    state.lastSignature=sig;state.world=d.world;state.areas=d.areas;state.people=d.people;state.cameras=d.cameras;
    if(worldChanged||state.locations.size===0)rebuildWorld();
    rebuildMarkers();
    document.getElementById('nocturne3d-map-title').textContent=(state.world||'CAMPUS')+' · 3D MAP';
    document.body.classList.add('nocturne3d-game','nocturne3d-active');
  }

  function observeGame(){
    state.observer=new MutationObserver(()=>{clearTimeout(state.syncTimer);state.syncTimer=setTimeout(syncFromDom,80)});
    state.observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
    setInterval(syncFromDom,1200);
  }

  function focus(name){
    const g=state.locations.get(name);if(!g||!state.controls)return;
    const T=state.T,target=new T.Vector3(g.position.x,0,g.position.z);state.controls.target.copy(target);state.camera.position.set(target.x+14,target.y+15,target.z+18);state.controls.update();
  }

  function setMap(open){
    if(!state.ready)return;state.map=!!open;
    document.getElementById('nocturne3d-map')?.classList.toggle('open',state.map);
    document.getElementById('nocturne3d-map-btn')?.classList.toggle('active',state.map);
    document.body.classList.toggle('nocturne3d-map-open',state.map);
    state.controls.enabled=state.map;
    state.renderer.domElement.style.pointerEvents=state.map?'auto':'none';
    if(state.map){state.camera.position.set(0,38,48);state.controls.target.set(0,0,0);state.controls.update()}
    const tip=document.getElementById('nocturne3d-tooltip');if(tip&&!state.map)tip.style.display='none';
  }

  function pointerMove(e){
    if(!state.map)return;const r=state.renderer.domElement.getBoundingClientRect();state.pointer.x=((e.clientX-r.left)/r.width)*2-1;state.pointer.y=-((e.clientY-r.top)/r.height)*2+1;state.ray.setFromCamera(state.pointer,state.camera);
    const hits=state.ray.intersectObjects([...state.locations.values(),...state.markers.values(),...state.cameraMeshes],true),d=hits[0]?.object?.userData||{},tip=document.getElementById('nocturne3d-tooltip');if(!tip)return;
    if(!d.kind){tip.style.display='none';return}tip.style.display='block';tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';
    tip.innerHTML=d.kind==='location'?`<b>${esc(d.name)}</b><span>LOCATION · CLICK TO FOCUS</span>`:d.kind==='person'?`<b>${esc(d.name)}</b><span>${d.player?'PLAYER':'NPC'} · ${esc(d.location)}</span>`:`<b>${esc(d.id)}</b><span>CCTV · ${esc(d.area)}</span>`;
  }

  function canvasClick(){
    if(!state.map)return;state.ray.setFromCamera(state.pointer,state.camera);const d=state.ray.intersectObjects([...state.locations.values(),...state.markers.values(),...state.cameraMeshes],true)[0]?.object?.userData;if(d?.kind==='location')focus(d.name);else if(d?.kind==='person')focus(d.location);else if(d?.kind==='cctv')focus(d.area);
  }

  function resize(){if(!state.renderer)return;state.camera.aspect=innerWidth/innerHeight;state.camera.updateProjectionMatrix();state.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));state.renderer.setSize(innerWidth,innerHeight,false)}

  function loop(t){
    if(state.ready){const time=t*.0002;if(state.ambient)state.ambient.rotation.y=time*.15;if(!state.map){state.camera.position.x+=((Math.sin(time*.8)*.6)-state.camera.position.x)*.004;state.camera.position.z+=(42-state.camera.position.z)*.004;state.camera.lookAt(0,2,0)}else state.controls.update();state.markers.forEach((m,i)=>{m.position.y=.72+Math.sin(t*.002+i)*.08});state.renderer.render(state.scene,state.camera)}
    requestAnimationFrame(loop);
  }

  async function boot(){shell();if(!(await modules()))return;init()}
  window.nocturne3D={init:boot,setMap,focus,sync:syncFromDom};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
