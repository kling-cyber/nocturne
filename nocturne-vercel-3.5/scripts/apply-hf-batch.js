const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const b=path.join(root,'backend/server');
const f=path.join(root,'frontend');

let game=fs.readFileSync(path.join(b,'game.js'),'utf8');
if(!game.includes('require("./visual-batch")')) game=game.replace('const comfy = require("./comfy-client");','const visualBatch = require("./visual-batch");');
if(!game.includes('visualBatch.register(this);')) game=game.replace('    this.cameraFrames = new Map();\n\n    this.make(players, options);','    this.cameraFrames = new Map();\n    this.visualCooldowns = new Map();\n\n    this.make(players, options);\n    visualBatch.register(this);');

const visualMethod=`  async visual(pid, payload = {}) {
    const actor=this.get(pid);
    if(!actor || !actor.alive || this.caseClosed) return;
    const result=visualBatch.request(this,pid,payload);
    if(result?.error){ this.room.io.to(pid).emit('errorMessage',result.error); return; }
    const asset=result.asset;
    const title=\`${asset.cameraId} // \${asset.kind.toUpperCase()} // \${asset.clock}\`;
    const description=asset.kind==='cctv'
      ?\`Cached CCTV evidence from \${asset.area}. The timestamp is the simulated case capture time.\`
      :\`Cached investigative scene photograph from \${asset.area}. It is an observation, not automatic truth.\`;
    this.add({type:'visual',title,description,reliability:asset.kind==='cctv'?75:65,image:asset.path,source:asset.cameraId,visualAssetId:asset.id});
    this.event('VISUAL',\`\${actor.name} retrieved \${asset.kind.toUpperCase()} evidence from \${asset.cameraId}.\`);
    this.room.io.to(pid).emit('visualReady',{title,description,reliability:asset.kind==='cctv'?75:65,image:asset.path});
    this.emit();
  }


`;
const visualPattern=/  async visual\(pid, payload = \{\}\) \{[\s\S]*?\n  \}\n\n\n  \/\* =======================================================\n     PUBLIC STATE/;
if(visualPattern.test(game)) game=game.replace(visualPattern,visualMethod+'  /* =======================================================\n     PUBLIC STATE');
else if(!game.includes('visualBatch.request(this,pid,payload)')) throw new Error('Could not locate game.js visual method');
if(!game.includes('visualBatch.touch(this);')){
  const marker='  emit() {\n\n    this.room.io\n      .to(this.room.code)';
  if(!game.includes(marker)) throw new Error('Could not locate game.js emit method');
  game=game.replace(marker,'  emit() {\n\n    visualBatch.touch(this);\n\n    this.room.io\n      .to(this.room.code)',1);
}
game=game.replace('imageModel:\n    comfy.CHECKPOINT,','imageModel:\n    "Hugging Face ZeroGPU",');
fs.writeFileSync(path.join(b,'game.js'),game);

let index=fs.readFileSync(path.join(b,'index.js'),'utf8');
if(!index.includes('const visualBatch=require("./visual-batch");')) index=index.replace('const {GameRoom}=require("./game");','const {GameRoom}=require("./game");\nconst visualBatch=require("./visual-batch");',1);
const marker='app.disable("x-powered-by");\n\n';
const route="app.get('/visual-cache/:caseId/:filename',(req,res)=>{\n  const file=visualBatch.getFile(req.params.caseId,req.params.filename);\n  if(!file)return res.status(404).end();\n  res.setHeader('Cache-Control','public, max-age=3600');\n  res.sendFile(file);\n});\n\n";
if(!index.includes("/visual-cache/:caseId/:filename")) index=index.replace(marker,marker+route,1);
fs.writeFileSync(path.join(b,'index.js'),index);

let app=fs.readFileSync(path.join(f,'app.js'),'utf8');
if(!app.includes('let visualCooldownUntil=0;')) app=app.replace('let incomingQ=null;','let incomingQ=null;\nlet visualCooldownUntil=0;',1);
const oldVisual='function visual(type){\n  setBusy(true, type === "cctv" ? "Retrieving CCTV frame..." : "Generating scene photograph...");';
const newVisual='function visual(type){\n  const now=Date.now();\n  if(now<visualCooldownUntil){\n    const seconds=Math.ceil((visualCooldownUntil-now)/1000);\n    return toast(`Visual request cooldown: ${seconds}s remaining.`);\n  }\n  visualCooldownUntil=now+30000;\n  setBusy(true, type === "cctv" ? "Retrieving cached CCTV frame..." : "Retrieving cached scene photograph...");';
if(app.includes(oldVisual)) app=app.replace(oldVisual,newVisual,1);
const oldShow='function showVisual(d){\n\n  setBusy(false);';
const newShow='function visualSrc(src){\n  const value=String(src||\'\');\n  if(!value)return \'\';\n  if(/^https?:\\/\\//i.test(value)||value.startsWith(\'data:\'))return value;\n  return (SOCKET_URL||\'\')+value;\n}\n\nfunction showVisual(d){\n\n  setBusy(false);';
if(app.includes(oldShow) && !app.includes('function visualSrc(src)')) app=app.replace(oldShow,newShow,1);
app=app.replace('src="${esc(d.image||\'\')}"','src="${esc(visualSrc(d.image||\'\'))}"',1);
app=app.replace('src="${esc(e.image)}"','src="${esc(visualSrc(e.image))}"',1);
app=app.replace('function selectCamera(btn){document.querySelectorAll("[data-camera-id]").forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");}\n','');
fs.writeFileSync(path.join(f,'app.js'),app);

const pkgPath=path.join(root,'backend/package.json');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8')); pkg.version='4.1.0'; pkg.description='NOCTURNE: server-authoritative multiplayer and single-player living mystery with batch-generated visual evidence.'; fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
const versionPath=path.join(root,'VERSION.txt');
if(fs.existsSync(versionPath)){let v=fs.readFileSync(versionPath,'utf8').replaceAll('NOCTURNE 4.0','NOCTURNE 4.1'); if(!v.includes('Hugging Face ZeroGPU batch visual generation')) v+='\nNOCTURNE 4.1 visual system:\n- Hugging Face ZeroGPU batch visual generation\n- Global visual generation queue across active cases\n- Case-specific temporary visual cache\n- 30-second per-player visual request limiter\n- Cached visual access during gameplay\n'; fs.writeFileSync(versionPath,v);}

console.log('NOCTURNE HF batch integration applied.');
