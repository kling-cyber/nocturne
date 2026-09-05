/* NOCTURNE case visual planner, global batch queue and temporary cache. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const hf = require('./hf-client');

const ROOT = process.env.NOCTURNE_VISUAL_CACHE_DIR || path.join(os.tmpdir(), 'nocturne-visual-cache');
const TTL = Number(process.env.NOCTURNE_VISUAL_TTL_MS || 3600000);
const DAILY = Number(process.env.HF_DAILY_GPU_SECONDS || 300);
const BATCH = Math.max(1, Math.min(4, Number(process.env.HF_BATCH_SIZE || 4)));
const DURATION = Math.max(10, Math.min(60, Number(process.env.HF_GPU_DURATION_SECONDS || 60)));
const STEPS = Math.max(4, Math.min(12, Number(process.env.HF_IMAGE_STEPS || 8)));
const WIDTH = Number(process.env.HF_IMAGE_WIDTH || 768);
const HEIGHT = Number(process.env.HF_IMAGE_HEIGHT || 512);

const cases = new Map();
const queue = [];
let running = false;
let reserved = 0;
let windowStarted = 0;
let pausedUntil = 0;
fs.mkdirSync(ROOT, { recursive: true });

const hash = v => crypto.createHash('sha256').update(String(v)).digest('hex').slice(0, 16);
const safe = v => String(v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || 'asset';
const clockAt = t => { const x = 19 * 60 + Math.max(0, Number(t) || 0); return `${String(Math.floor(x / 60) % 24).padStart(2,'0')}:${String(x % 60).padStart(2,'0')}`; };

function activeCaseCount() { return [...cases.values()].filter(x => x.sim.room.players.size > 0).length; }
function targetForCase() {
  const n = activeCaseCount();
  if (n <= 1) return 10;
  if (n === 2) return 8;
  if (n === 3) return 6;
  return 4;
}

function plan(sim) {
  const target = targetForCase();
  const cams = (sim.cameras || []).slice().sort((a,b) => hash(`${sim.seed}|${a.id}`).localeCompare(hash(`${sim.seed}|${b.id}`)));
  const camCount = target >= 10 ? 4 : target >= 8 ? 3 : 2;
  const selected = cams.slice(0, camCount);
  const crimeBase = Number(sim.truth?.crimeStart || 20);
  const jobs = [];

  selected.forEach((cam, index) => {
    const times = target >= 6 ? [Math.max(0, crimeBase - 4), crimeBase + 4] : [Math.max(0, crimeBase)];
    times.forEach((capture, slot) => jobs.push({
      id:`cctv-${safe(cam.id)}-${slot}-${hash(`${sim.seed}|${cam.id}|${capture}`)}`,
      kind:'cctv', cameraId:cam.id, area:cam.area, capture,
      priority:slot === 0 ? 100-index : 80-index,
      prompt:`Raw color CCTV surveillance frame from a fictional ${sim.world[0]}. Fixed ${cam.position || 'ceiling-mounted'} security camera, ${cam.view || 'fixed surveillance perspective'}, exact area: ${cam.area}. Stable physical camera position, realistic architecture, capture time ${clockAt(capture)}. Realistic low-light surveillance footage, documentary security-camera quality, natural shadows, subtle sensor noise, mild compression, restrained fisheye character. Preserve the same physical layout for repeated frames from this camera. Ordinary plausible scene. People may be present naturally, but never reveal hidden case truth. No gore, corpse, violence, logos or readable text.`,
      negative:'blurry, low quality, distorted architecture, fantasy, illustration, cinematic poster, watermark, readable text, gore, corpse, violence, changed camera angle'
    }));
  });

  const clues = [
    'a mundane object subtly out of place',
    'a partially obscured reflection or background detail creating a spatial inconsistency',
    'a small environmental disturbance with several innocent explanations',
    'a door, drawer, chair, curtain or cabinet left in a state that invites timeline questions',
    'a faint environmental trace that only becomes meaningful when compared with another evidence source',
    'a time-sensitive environmental detail such as equipment, lighting or an unattended item',
    'a subtle relationship between two ordinary objects',
    'a partially visible peripheral detail that requires cross-reference'
  ];
  const photoCount = Math.min(2, target);
  for (let i=0;i<photoCount;i++) {
    const area = sim.world[1][Math.abs(parseInt(hash(`${sim.seed}|photo|${i}`),16)) % sim.world[1].length];
    const clue = clues[Math.abs(parseInt(hash(`${sim.seed}|clue|${i}`),16)) % clues.length];
    jobs.push({
      id:`photo-${i}-${hash(`${sim.seed}|photo|${i}`)}`,
      kind:'photo', cameraId:'EVIDENCE-PHOTO', area, capture:crimeBase, priority:120-i,
      prompt:`Detailed investigative scene photograph inside the fictional ${sim.world[0]}, exact area: ${area}. Documentary evidence photography with realistic texture, believable architecture, mundane clutter, natural lighting and careful depth. Include exactly one subtle indirect anomaly: ${clue}. Small, naturally integrated, ambiguous and not centered. Never circle, label, explain or exaggerate it. Do not reveal Killer, motive, victim, weapon or hidden answer. No gore, corpse, violence, logos or readable text. The investigator must compare it with time, movement, testimony or another evidence source.`,
      negative:'obvious clue, arrows, circles, labels, highlighted object, cinematic poster, fantasy, illustration, gore, corpse, violence, watermark, readable text'
    });
  }
  return jobs.slice(0,target);
}

function entry(sim) {
  const id=safe(sim.seed);
  if (!cases.has(id)) {
    fs.mkdirSync(path.join(ROOT,id),{recursive:true});
    const e={id,sim,jobs:new Map(),assets:new Map(),lastActive:Date.now()};
    cases.set(id,e);
    for(const j of plan(sim)){ e.jobs.set(j.id,{...j,status:'queued'}); queue.push({caseId:id,jobId:j.id}); }
  }
  return cases.get(id);
}

function register(sim){ entry(sim); processQueue(); }
function touch(sim){ entry(sim).lastActive=Date.now(); }
function resetWindow(){ if(!windowStarted || Date.now()-windowStarted>=86400000){ windowStarted=Date.now(); reserved=0; pausedUntil=0; } }

function choose(){
  const pending=queue.filter(q=>{const e=cases.get(q.caseId),j=e?.jobs.get(q.jobId);return e&&j&&j.status==='queued'&&e.sim.room.players.size>0;});
  pending.sort((a,b)=>{const ja=cases.get(a.caseId).jobs.get(a.jobId),jb=cases.get(b.caseId).jobs.get(b.jobId);return (jb.priority-ja.priority)||(cases.get(a.caseId).lastActive-cases.get(b.caseId).lastActive);});
  const out=[],seen=new Set();
  for(const q of pending){if(out.length>=BATCH)break;if(seen.has(q.caseId))continue;out.push(q);seen.add(q.caseId);}
  for(const q of pending){if(out.length>=BATCH)break;if(!out.some(x=>x.caseId===q.caseId&&x.jobId===q.jobId))out.push(q);}
  return out;
}

async function processQueue(){
  resetWindow();
  if(running||!hf.configured||Date.now()<pausedUntil||reserved+DURATION>DAILY)return;
  const items=choose(); if(!items.length)return;
  running=true;
  const jobs=[];
  for(const q of items){const e=cases.get(q.caseId),j=e?.jobs.get(q.jobId);if(!e||!j)continue;j.status='generating';jobs.push({...j,seed:Number.parseInt(hash(`${e.sim.seed}|${j.id}`),16)>>>0,width:WIDTH,height:HEIGHT,steps:STEPS});}
  if(!jobs.length){running=false;return;}
  reserved+=DURATION;
  try{
    const buffers=await hf.generateBatch(jobs);
    for(let i=0;i<jobs.length;i++){
      const j=jobs[i],e=cases.get(j.caseId),job=e?.jobs.get(j.id);if(!e||!job||!buffers[i])continue;
      const filename=`${safe(j.id)}.png`,filePath=path.join(ROOT,e.id,filename);
      fs.writeFileSync(filePath,buffers[i]);
      e.assets.set(j.id,{id:j.id,kind:j.kind,cameraId:j.cameraId,area:j.area,capture:j.capture,clock:clockAt(j.capture),path:`/visual-cache/${e.id}/${filename}`,filePath,createdAt:Date.now()});
      job.status='ready';
    }
  }catch(error){
    const msg=String(error?.message||error); console.error('[NOCTURNE] HF batch:',msg);
    for(const j of jobs){const e=cases.get(j.caseId),job=e?.jobs.get(j.id);if(job)job.status='queued';}
    if(/quota|limit|exceeded|runs/i.test(msg))pausedUntil=Date.now()+86400000;
  }finally{running=false;setTimeout(processQueue,1500);}
}

function request(sim,pid,payload={}){
  const e=entry(sim);e.lastActive=Date.now();sim.visualCooldowns=sim.visualCooldowns||new Map();
  const remaining=30000-(Date.now()-Number(sim.visualCooldowns.get(pid)||0));
  if(remaining>0)return{error:`Visual request cooldown: ${Math.ceil(remaining/1000)}s remaining.`};
  sim.visualCooldowns.set(pid,Date.now());
  const type=payload.type==='photo'?'photo':'cctv';let asset=null;
  if(type==='cctv'){
    const id=String(payload.cameraId||'').toUpperCase();const list=[...e.assets.values()].filter(x=>x.kind==='cctv'&&x.cameraId===id);const t=Number(sim.t||0);list.sort((a,b)=>Math.abs(a.capture-t)-Math.abs(b.capture-t));asset=list[0]||null;
  }else{const list=[...e.assets.values()].filter(x=>x.kind==='photo');if(list.length)asset=list[Math.abs(parseInt(hash(`${pid}|${sim.t}|photo`),16))%list.length]||null;}
  if(!asset){processQueue();return{error:'This visual is still being prepared for the case. Please try again shortly.'};}
  return{asset};
}

function getFile(caseId,filename){const e=cases.get(safe(caseId));if(!e)return null;const a=[...e.assets.values()].find(x=>path.basename(x.filePath)===path.basename(filename));if(!a||!fs.existsSync(a.filePath))return null;e.lastActive=Date.now();return a.filePath;}
function status(sim){const e=entry(sim),j=[...e.jobs.values()];return{total:j.length,ready:j.filter(x=>x.status==='ready').length,queued:j.filter(x=>x.status==='queued').length,generating:j.filter(x=>x.status==='generating').length};}

setInterval(()=>{const now=Date.now();for(const [id,e] of cases){if(e.sim.room.players.size===0&&now-e.lastActive>=TTL){try{fs.rmSync(path.join(ROOT,id),{recursive:true,force:true});}catch(_){}cases.delete(id);}}processQueue();},5000).unref();

module.exports={register,touch,request,getFile,status,processQueue};
