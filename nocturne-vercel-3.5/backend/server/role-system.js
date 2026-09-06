// NOCTURNE multiplayer role authority.
// AI decides the investigative outcome from the live case context.
// The server remains authoritative for hidden truth and game-state changes.
const CORE={killer:'KILLER',detective:'DETECTIVE',investigator:'INVESTIGATOR',npc:'NPC'};
const SPECIALTIES=['Forensic Analyst','Behavioral Analyst','Digital Investigator','Field Investigator','Investigative Journalist','Security Specialist','Medical Consultant'];
const clean=(s,n=300)=>String(s??'').replace(/[\u0000-\u001F\u007F]/g,'').trim().slice(0,n);
const MODEL=process.env.OPENAI_TEXT_MODEL||'gpt-5.6-luna';
const AI_TIMEOUT=Math.max(2000,Math.min(9000,Number(process.env.NOCTURNE_ROLE_AI_TIMEOUT_MS||7000)));

function notice(room,pid,text){room.io.to(pid).emit('errorMessage',text);return {ok:false,message:text};}

function shuffle(list){
  const a=[...list];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function output(room,pid,sim,p,result,extra={}){
  const title=clean(result?.title||'Role ability resolved.',140);
  const description=clean(result?.description||'The role ability completed successfully.',900);
  const action=clean(result?.action||'',120);
  const reliability=Math.max(35,Math.min(95,Number(result?.reliability)||72));
  const out={ok:true,roleAction:true,title,description,action,reliability,...extra};
  sim.add({type:'role',title,description,reliability,source:p?.name||'ROLE ACTION'});
  sim.event('ROLE ACTION',`${p?.name||'An investigator'} completed a specialized role action: ${title}`);
  return out;
}

function context(sim,p){
  const nearby=sim.people.filter(x=>x.alive&&x.location===p.location&&x.id!==p.id).map(x=>x.name);
  const recent=sim.evidence.slice(-10).map(e=>({type:e.type,title:e.title,description:e.description,reliability:e.reliability,source:e.source}));
  const events=sim.events.slice(-8).map(e=>({time:e.time,type:e.type,text:e.text}));
  let memories=[];
  try{
    if(typeof sim.recall==='function')memories=sim.recall(p,'').slice(-6).map(m=>({type:m.type,text:m.text,confidence:m.confidence,importance:m.importance}));
  }catch(error){console.warn('[NOCTURNE] Role memory context unavailable:',error?.message||error);}
  return {actor:p.name,role:p.role,specialty:p.investigatorRole||null,location:p.location,phase:sim.phase,clock:sim.clock(),nearby,recent,events,memories};
}

function extractOutputText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text;
  const parts=[];
  for(const item of data?.output||[]){
    for(const c of item?.content||[]){if(typeof c?.text==='string')parts.push(c.text);}
  }
  return parts.join('');
}

async function aiResolve(sim,p,action,allowedEffect){
  const key=String(process.env.OPENAI_API_KEY||'').trim();
  if(!key)return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),AI_TIMEOUT);
  try{
    const schema={type:'object',properties:{outcome:{type:'string',enum:['SUCCESS','PARTIAL','NO_FINDING','COMPLICATION']},title:{type:'string'},description:{type:'string'},reliability:{type:'number'},evidence:{anyOf:[{type:'object',properties:{type:{type:'string'},title:{type:'string'},description:{type:'string'},reliability:{type:'number'}},required:['type','title','description','reliability'],additionalProperties:false},{type:'null'}]},suspicionDelta:{type:'number'}},required:['outcome','title','description','reliability','evidence','suspicionDelta'],additionalProperties:false};
    const body={
      model:MODEL,
      input:[
        {role:'system',content:[{type:'input_text',text:'You are the role-resolution AI for NOCTURNE, a fictional non-graphic multiplayer murder mystery. Analyze the live case and the player’s chosen role action. The server is authoritative. Never reveal hidden killer identity, hidden victim identity before the crime, private information belonging to another player, or hidden truth. Never invent impossible facts. Produce a plausible uncertain investigative outcome grounded only in the supplied context. An action may succeed, partially succeed, find nothing, create a contradiction, raise suspicion, lower suspicion, or reveal a mundane detail. Never declare guilt unless the supplied public evidence already establishes it. Keep descriptions concise and useful for deduction. Return JSON only.'}]},
        {role:'user',content:[{type:'input_text',text:JSON.stringify({case:context(sim,p),action,allowedEffect})}]}
      ],
      text:{format:{type:'json_schema',name:'nocturne_role_resolution',strict:true,schema}}
    };
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    if(!response.ok){const detail=await response.text().catch(()=>'' );console.error('[NOCTURNE] Role AI HTTP',response.status,detail.slice(0,300));return null;}
    const data=await response.json();
    const text=extractOutputText(data);
    if(!text)return null;
    const x=JSON.parse(text);
    return {outcome:clean(x.outcome,30),title:clean(x.title,140),description:clean(x.description,900),reliability:Number(x.reliability)||65,evidence:x.evidence,suspicionDelta:Number(x.suspicionDelta)||0};
  }catch(error){console.error('[NOCTURNE] Role AI error:',error?.name||'',error?.message||error);return null;}
  finally{clearTimeout(timer);}
}

async function resolve(room,pid,sim,p,text,opts={}){
  const aiResult=await aiResolve(sim,p,text,opts.allowedEffect||'Create only bounded, non-graphic investigative consequences.');
  const result=aiResult||{outcome:'NO_FINDING',title:'Role action completed',description:`${p.name} applied ${p.role.toLowerCase()} expertise to the current situation, but no reliable new conclusion was established.`,reliability:55,evidence:null,suspicionDelta:0};
  if(result.evidence){
    sim.add({type:clean(result.evidence.type,40)||'observation',title:clean(result.evidence.title,120),description:clean(result.evidence.description,500),reliability:Math.max(20,Math.min(95,Number(result.evidence.reliability)||60)),source:p.name});
  }
  if(opts.target&&result.suspicionDelta){opts.target.suspicion=Math.max(0,Math.min(100,Number(opts.target.suspicion||0)+Math.max(-15,Math.min(20,result.suspicionDelta))));}
  return output(room,pid,sim,p,{...result,action:text},{aiUsed:!!aiResult,outcome:result.outcome});
}

function install(room){
  const sim=room?.sim;
  if(!sim||sim.singlePlayer)return;
  if(sim.__nocturneRolesInstalled&&typeof sim.roleAction==='function')return;
  const humans=sim.people.filter(p=>p.isPlayer);
  const killer=sim.get(sim.truth.killerId);
  if(!killer){sim.__nocturneRolesInstalled=false;return;}

  // Killer is already selected authoritatively by the game engine. Randomize every other human role.
  const nonKillers=shuffle(humans.filter(p=>p.id!==killer.id));
  for(const p of humans){p.role=p.id===killer.id?CORE.killer:CORE.investigator;p.investigatorRole=null;}
  const detective=nonKillers.shift();
  if(detective){detective.role=CORE.detective;detective.investigatorRole='Lead Detective';}
  const specialties=shuffle(SPECIALTIES);
  nonKillers.forEach((p,i)=>{p.role=CORE.investigator;p.investigatorRole=specialties[i%specialties.length];});

  // Fill missing specialist roles with autonomous NPCs.
  const npcs=shuffle(sim.people.filter(p=>!p.isPlayer&&p.alive));
  let ni=0;
  if(!sim.people.some(p=>p.role===CORE.detective)&&npcs[ni]){npcs[ni].role=CORE.detective;npcs[ni].investigatorRole='Lead Detective';npcs[ni].aiRole=true;ni++;}
  if(!sim.people.some(p=>p.role===CORE.investigator)&&npcs[ni]){npcs[ni].role=CORE.investigator;npcs[ni].investigatorRole=specialties[0]||'Field Investigator';npcs[ni].aiRole=true;ni++;}
  for(;ni<npcs.length;ni++){npcs[ni].role=CORE.npc;npcs[ni].investigatorRole=null;npcs[ni].aiRole=true;}

  if(typeof sim.__nocturneOriginalPrivate!=='function')sim.__nocturneOriginalPrivate=sim.private.bind(sim);
  const originalPrivate=sim.__nocturneOriginalPrivate;
  sim.private=function(pid){
    const out=originalPrivate(pid)||{};
    const p=sim.get(pid);
    const abilities=p?.role===CORE.killer?['ELIMINATE','CONCEAL SCENE']:p?.role===CORE.detective?['ANALYZE CASE','INTERROGATE','MARK SUSPECT']:p?.role===CORE.investigator?['FORENSICS','TRACK','RECON']:[];
    return {...out,role:p?.role||out.role||CORE.npc,investigatorRole:p?.investigatorRole||out.investigatorRole||null,abilities};
  };

  sim.roleAction=async function(pid,raw){
    const p=sim.get(pid);
    if(!p||!p.alive||sim.caseClosed)return notice(room,pid,'Your role ability is unavailable because your character is no longer active.');
    const text=clean(raw);
    const lower=text.toLowerCase();

    if(p.role===CORE.killer){
      if(lower==='eliminate'||lower==='kill')return notice(room,pid,'Choose ELIMINATE and select a living target.');
      if(sim.phase!=='CRIME')return notice(room,pid,'KILLER abilities are only available during the critical window.');
      if(lower.startsWith('kill ')){
        const targetName=text.slice(5).trim().toLowerCase();
        const target=sim.people.find(x=>x.alive&&x.id!==p.id&&x.name.toLowerCase()===targetName);
        if(!target)return notice(room,pid,'Choose a living target by exact name.');
        sim.truth.victimId=target.id;
        sim.remember(p,'episodic',`I selected ${target.name} as my target during the critical window.`,{confidence:100,importance:100,source:'self'});
        sim.crime();
        return resolve(room,pid,sim,p,text,{allowedEffect:'Resolve the chosen target action. The server has already applied the authoritative crime state. Describe plausible consequences, witnesses, traces and uncertainty, but never reveal hidden truth.'});
      }
      if(lower==='conceal scene'){
        if(!sim.truth.crimeCommitted)return notice(room,pid,'There is no crime scene to conceal yet.');
        sim.tick(1);
        return resolve(room,pid,sim,p,text,{allowedEffect:'Assess how the concealment attempt changes the scene. It may leave traces, create ambiguity, accomplish little, or make an existing clue harder to interpret. Never erase authoritative truth.'});
      }
      return notice(room,pid,'Killer abilities: ELIMINATE during the critical window, CONCEAL SCENE after the crime.');
    }

    if(p.role===CORE.detective){
      if(lower==='analyze case')return resolve(room,pid,sim,p,text,{allowedEffect:'Analyze recent public evidence and timeline. Produce a reasoned lead, contradiction, pattern, or no useful finding. Do not reveal hidden truth.'});
      if(lower.startsWith('interrogate ')){
        const name=text.slice(12).trim().toLowerCase();
        const target=sim.people.find(x=>x.alive&&x.id!==p.id&&x.name.toLowerCase()===name);
        if(!target)return notice(room,pid,'Choose a living person by exact name.');
        sim.ask(pid,target.id,'Formal interrogation: account for your movements and what you personally remember during the critical period.');
        return resolve(room,pid,sim,p,text,{allowedEffect:'Resolve the interrogation opening from the current case. The target may later answer, hesitate, contradict themselves, or provide a useful detail. Do not impersonate the target.'});
      }
      if(lower.startsWith('mark suspect ')){
        const name=text.slice(13).trim().toLowerCase();
        const target=sim.people.find(x=>x.alive&&x.name.toLowerCase()===name);
        if(!target)return notice(room,pid,'Choose a living person by exact name.');
        return resolve(room,pid,sim,p,text,{target,allowedEffect:'Assess whether current public evidence supports marking this person for review. Suspicion may rise, fall, or remain unchanged. Never treat suspicion as guilt.'});
      }
      return notice(room,pid,'Detective abilities: ANALYZE CASE, INTERROGATE, MARK SUSPECT.');
    }

    if(p.role===CORE.investigator){
      if(lower==='forensics')return resolve(room,pid,sim,p,text,{allowedEffect:'Use the investigator specialty and current location to produce a plausible forensic, behavioral, digital, field, security, medical, journalism, or environmental lead. It may find something useful, mundane, or inconclusive.'});
      if(lower.startsWith('track ')){
        const name=text.slice(6).trim().toLowerCase();
        const target=sim.people.find(x=>x.alive&&x.id!==p.id&&x.name.toLowerCase()===name);
        if(!target)return notice(room,pid,'Choose a living person by exact name.');
        const old=p.location;
        p.location=target.location;
        sim.remember(p,'observation',`I tracked ${target.name} to ${target.location}.`,{confidence:70,importance:65,source:'self'});
        return resolve(room,pid,sim,p,text,{allowedEffect:`Assess the movement trail from ${old} toward ${target.location}. It may produce a reliable lead, ambiguity, or an innocent explanation.`});
      }
      if(lower==='recon')return resolve(room,pid,sim,p,text,{allowedEffect:'Survey the current location using nearby people, recent events, evidence and the investigator specialty. Return useful activity, a mundane observation, an inconsistency, or no actionable finding.'});
      return notice(room,pid,'Investigator abilities: FORENSICS, TRACK, RECON.');
    }
    return notice(room,pid,'NPCs do not have human role abilities.');
  };

  sim.killerDecision=function(pid){return sim.roleAction(pid,'kill');};
  sim.__nocturneRolesInstalled=typeof sim.roleAction==='function';
  if(!sim.__nocturneRolesInstalled)return;
  sim.event('ROLES','The investigation team has been assigned. Human role assignment is randomized after the authoritative killer is selected. Missing human roles are represented by autonomous NPC specialists.');
  sim.emit();
}

function installRoomStart(GameRoom){
  if(GameRoom.prototype.__nocturneRoleStartPatched)return;
  GameRoom.prototype.__nocturneRoleStartPatched=true;
  const originalStart=GameRoom.prototype.start;
  GameRoom.prototype.start=async function(...args){const result=await originalStart.apply(this,args);install(this);return result;};
}

module.exports={install,installRoomStart};
