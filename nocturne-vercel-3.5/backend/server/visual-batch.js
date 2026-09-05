/* NOCTURNE direct local ComfyUI visual engine. Images are generated on demand and never stored on disk. */
const crypto=require('crypto');
const comfy=require('./comfy-client');

const GENERATION_TIMEOUT_MS=10000;
const WIDTH=Number(process.env.COMFYUI_WIDTH||768);
const HEIGHT=Number(process.env.COMFYUI_HEIGHT||512);
const STEPS=Math.max(4,Math.min(12,Number(process.env.COMFYUI_STEPS||8)));
const cases=new Map();

const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,16);
const safe=v=>String(v||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)||'asset';
const clockAt=t=>{const x=19*60+Math.max(0,Number(t)||0);return `${String(Math.floor(x/60)%24).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;};

function jobsFor(sim){
  const crimeBase=Number(sim.truth?.crimeStart||20);
  const cams=(sim.cameras||[]);
  const jobs=[];
  for(const cam of cams){
    for(const capture of [Math.max(0,crimeBase-4),crimeBase+4]){
      jobs.push({id:`cctv-${safe(cam.id)}-${capture}`,kind:'cctv',cameraId:cam.id,area:cam.area,capture,
        prompt:`Raw color CCTV surveillance frame from a fictional ${sim.world[0]}. Fixed ${cam.position||'ceiling-mounted'} security camera, ${cam.view||'fixed surveillance perspective'}, exact area: ${cam.area}. Stable physical camera position, realistic architecture, capture time ${clockAt(capture)}. Realistic low-light surveillance footage, documentary security-camera quality, natural shadows, subtle sensor noise, mild compression, restrained fisheye character. Ordinary plausible scene. People may be present naturally, but never reveal hidden case truth. No gore, corpse, violence, logos or readable text.`,
        negative:'blurry, low quality, distorted architecture, fantasy, illustration, cinematic poster, watermark, readable text, gore, corpse, violence, changed camera angle'});
    }
  }
  const clues=['a mundane object subtly out of place','a partially obscured reflection or background detail creating a spatial inconsistency','a small environmental disturbance with several innocent explanations','a door, drawer, chair, curtain or cabinet left in a state that invites timeline questions','a faint environmental trace that only becomes meaningful when compared with another evidence source','a time-sensitive environmental detail such as equipment, lighting or an unattended item','a subtle relationship between two ordinary objects','a partially visible peripheral detail that requires cross-reference'];
  for(let i=0;i<2;i++){
    const area=sim.world[1][Math.abs(parseInt(hash(`${sim.seed}|photo|${i}`),16))%sim.world[1].length];
    const clue=clues[Math.abs(parseInt(hash(`${sim.seed}|clue|${i}`),16))%clues.length];
    jobs.push({id:`photo-${i}-${hash(`${sim.seed}|photo|${i}`)}`,kind:'photo',cameraId:'EVIDENCE-PHOTO',area,capture:crimeBase,
      prompt:`Detailed investigative scene photograph inside the fictional ${sim.world[0]}, exact area: ${area}. Documentary evidence photography with realistic texture, believable architecture, mundane clutter, natural lighting and careful depth. Include exactly one subtle indirect anomaly: ${clue}. Small, naturally integrated, ambiguous and not centered. Never circle, label, explain or exaggerate it. Do not reveal Killer, motive, victim, weapon or hidden answer. No gore, corpse, violence, logos or readable text. The investigator must compare it with time, movement, testimony or another evidence source.`,
      negative:'obvious clue, arrows, circles, labels, highlighted object, cinematic poster, fantasy, illustration, gore, corpse, violence, watermark, readable text'});
  }
  return jobs;
}

function entry(sim){
  const id=safe(sim.seed);
  if(!cases.has(id))cases.set(id,{id,sim,generating:new Set(),lastActive:Date.now()});
  return cases.get(id);
}
function register(sim){entry(sim);}
function touch(sim){entry(sim).lastActive=Date.now();}

async function directRequest(sim,pid,payload={}){
  const e=entry(sim);e.lastActive=Date.now();sim.visualCooldowns=sim.visualCooldowns||new Map();
  const remaining=30000-(Date.now()-Number(sim.visualCooldowns.get(pid)||0));
  if(remaining>0)return {error:`Visual request cooldown: ${Math.ceil(remaining/1000)}s remaining.`};
  if(!comfy.configured)return {error:'Local visual engine is not configured.'};
  const type=payload.type==='photo'?'photo':'cctv';
  const jobs=jobsFor(sim).filter(j=>j.kind===type);
  let job=null;
  if(type==='cctv'){
    const cameraId=String(payload.cameraId||'').toUpperCase();
    const candidates=jobs.filter(j=>j.cameraId===cameraId);
    const t=Number(sim.t||0);
    job=(candidates.length?candidates:jobs).sort((a,b)=>Math.abs(a.capture-t)-Math.abs(b.capture-t))[0];
  }else job=jobs[Math.abs(parseInt(hash(`${pid}|${sim.t}|photo`),16))%jobs.length];
  if(!job)return {error:'No visual source is available for this case.'};
  const lock=`${job.kind}:${job.cameraId}`;
  if(e.generating.has(lock))return {error:'A visual from this source is already being generated.'};
  e.generating.add(lock);sim.visualCooldowns.set(pid,Date.now());
  try{
    console.log(`[NOCTURNE] Direct local visual generation: ${job.kind} ${job.cameraId} ${WIDTH}x${HEIGHT} steps=${STEPS} timeout=${GENERATION_TIMEOUT_MS}ms`);
    const result=await comfy.request({prompt:job.prompt,negativePrompt:job.negative,caseSeed:sim.seed,cameraId:job.cameraId,type:job.kind,capture:job.capture});
    if(!result?.image)throw new Error('ComfyUI returned no image data.');
    const asset={id:`${safe(job.kind)}-${safe(job.cameraId)}-${Date.now()}-${hash(result.promptId||Date.now())}`,kind:job.kind,cameraId:job.cameraId,area:job.area,capture:job.capture,clock:clockAt(job.capture),image:result.image};
    console.log(`[NOCTURNE] Direct visual ready: ${job.kind} ${job.cameraId} ${job.area}`);
    return {asset};
  }catch(error){
    console.error(`[NOCTURNE] Direct local visual generation failed for ${job.kind} ${job.cameraId}:`,error?.message||error);
    return {error:error?.message||'Local visual generation failed.'};
  }finally{e.generating.delete(lock);}
}

function request(){return {error:'Visual generation is now on-demand. Use directRequest().' };}
function getFile(){return null;}
function status(sim){const e=entry(sim);return {total:0,ready:0,queued:0,generating:e.generating.size};}
module.exports={register,touch,request,directRequest,getFile,status,processQueue:()=>{}};
