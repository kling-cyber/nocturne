// NOCTURNE multiplayer role authority.
// Role actions use the same two public investigation surfaces as normal acts.
const OpenAI=require('openai');
const CORE={killer:'KILLER',detective:'DETECTIVE',investigator:'INVESTIGATOR',npc:'NPC'};
const SPECIALTIES=['Forensic Analyst','Behavioral Analyst','Digital Investigator','Field Investigator','Investigative Journalist','Security Specialist','Medical Consultant'];
const clean=(s,n=300)=>String(s??'').replace(/[\u0000-\u001F\u007F]/g,'').trim().slice(0,n);
const apiKey=String(process.env.OPENAI_API_KEY||'').trim();
const ai=apiKey?new OpenAI({apiKey}):null;
const MODEL=process.env.OPENAI_TEXT_MODEL||'gpt-5.6-luna';
function notice(room,pid,text){room.io.to(pid).emit('errorMessage',text);return {ok:false,message:text};}
function output(room,pid,sim,p,result,extra={}){
 const title=clean(result?.title||'Role ability resolved.',140),description=clean(result?.description||'The role ability completed successfully.',900),action=clean(result?.action||'',120);
 const out={ok:true,roleAction:true,title,description,action,...extra};
 sim.add({type:'role',title,description,reliability:Math.max(35,Math.min(95,Number(result?.reliability||72))),source:p?.name||'ROLE ACTION'});
 sim.event('ROLE ACTION',`${p?.name||'An investigator'} completed a specialized role action: ${title}`);
 return out;
}
function context(sim,p){
 const nearby=sim.people.filter(x=>x.alive&&x.location===p.location&&x.id!==p.id).map(x=>x.name);
 const recent=sim.evidence.slice(-10).map(e=>({type:e.type,title:e.title,description:e.description,reliability:e.reliability,source:e.source}));
 const events=sim.events.slice(-8).map(e=>({time:e.time,type:e.type,text:e.text}));
 const memories=sim.recall(p,'').slice(-6).map(m=>({type:m.type,text:m.text,confidence:m.confidence,importance:m.importance}));
 return {actor:p.name,role:p.role,specialty:p.investigatorRole||null,location:p.location,phase:sim.phase,clock:sim.clock(),nearby,recent,events,memories};
}
async function aiResolve(sim,p,action,allowedEffect){
 if(!ai)return null;
 try{
  const response=await ai.responses.create({model:MODEL,input:[
   {role:'system',content:'You are the role-resolution AI for NOCTURNE, a fictional non-graphic multiplayer murder mystery. Analyze the current public case situation and the player\'s chosen role action. The server is authoritative. Do not reveal hidden killer identity, victim identity before the crime, private memories of other players, or hidden truth. Do not invent impossible facts. Produce a plausible, uncertain investigative outcome grounded in the supplied situation. A role action may succeed, partially succeed, fail to find anything useful, create a contradiction, raise suspicion, or reveal a mundane detail. Keep the result useful for deduction, never make the culprit certain unless public evidence already proves it. Return JSON only.'},
   {role:'user',content:JSON.stringify({case:context(sim,p),action,allowedEffect})}
  ],text:{format:{type:'json_schema',name:'nocturne_role_resolution',strict:true,schema:{type:'object',properties:{outcome:{type:'string',enum:['SUCCESS','PARTIAL','NO_FINDING','COMPLICATION']},title:{type:'string'},description:{type:'string'},reliability:{type:'number'},evidence:{anyOf:[{type:'object',properties:{type:{type:'string'},title:{type:'string'},description:{type:'string'},reliability:{type:'number'}},required:['type','title','description','reliability'],additionalProperties:false},{type:'null'}]},suspicionDelta:{type:'number'}},required:['outcome','title','description','reliability','evidence','suspicionDelta'],additionalProperties:false}}}}});
  const x=JSON.parse(response.output_text||'{}');
  return {outcome:clean(x.outcome,30),title:clean(x.title,140),description:clean(x.description,900),reliability:Number(x.reliability)||65,evidence:x.evidence,suspicionDelta:Number(x.suspicionDelta)||0};
 }catch(error){console.error('[NOCTURNE] Role AI error:',error.message||error);return null;}
}
async function resolve(room,pid,sim,p,text,opts={}){
 const aiResult=await aiResolve(sim,p,text,opts.allowedEffect||'Create only bounded, non-graphic investigative consequences.');
 const result=aiResult||{outcome:'SUCCESS',title:'Role action resolved',description:`${p.name} applied ${p.role.toLowerCase()} expertise to the current situation. The result is a lead that should be corroborated.`,reliability:62,evidence:null,suspicionDelta:0};
 if(result.evidence){sim.add({type:clean(result.evidence.type,40)||'observation',title:clean(result.evidence.title,120),description:clean(result.evidence.description,500),reliability:Math.max(20,Math.min(95,Number(result.evidence.reliability)||60)),source:p.name});}
 if(opts.target&&result.suspicionDelta){opts.target.suspicion=Math.max(0,Math.min(100,Number(opts.target.suspicion||0)+Math.max(-15,Math.min(20,result.suspicionDelta))));}
 return output(room,pid,sim,p,{...result,action:text},{aiUsed:!!aiResult,outcome:result.outcome});
}
function install(room){
 const sim=room?.sim;if(!sim||sim.singlePlayer)return;
 if(sim.__nocturneRolesInstalled&&typeof sim.roleAction==='function')return;
 const humans=sim.people.filter(p=>p.isPlayer),killer=sim.get(sim.truth.killerId);if(!killer){sim.__nocturneRolesInstalled=false;return;}
 for(const p of humans){p.role=p.id===killer.id?CORE.killer:CORE.investigator;p.investigatorRole=null;}
 const detective=humans.find(p=>p.id!==killer.id);if(detective){detective.role=CORE.detective;detective.investigatorRole='Lead Detective';}
 let si=0;for(const p of humans){if(p.id===killer.id||p.id===detective?.id)continue;p.role=CORE.investigator;p.investigatorRole=SPECIALTIES[si%SPECIALTIES.length];si++;}
 const npcs=sim.people.filter(p=>!p.isPlayer&&p.alive);let ni=0;if(!sim.people.some(p=>p.role===CORE.detective)&&npcs[ni]){npcs[ni].role=CORE.detective;npcs[ni].investigatorRole='Lead Detective';npcs[ni].aiRole=true;ni++;}if(!sim.people.some(p=>p.role===CORE.investigator)&&npcs[ni]){npcs[ni].role=CORE.investigator;npcs[ni].investigatorRole='Field Investigator';npcs[ni].aiRole=true;ni++;}for(;ni<npcs.length;ni++){npcs[ni].role=CORE.npc;npcs[ni].investigatorRole=null;npcs[ni].aiRole=true;}
 if(typeof sim.__nocturneOriginalPrivate!=='function')sim.__nocturneOriginalPrivate=sim.private.bind(sim);const originalPrivate=sim.__nocturneOriginalPrivate;
 sim.private=function(pid){const out=originalPrivate(pid)||{},p=sim.get(pid),abilities=p?.role===CORE.killer?['ELIMINATE','CONCEAL SCENE']:p?.role===CORE.detective?['ANALYZE CASE','INTERROGATE','MARK SUSPECT']:p?.role===CORE.investigator?['FORENSICS','TRACK','RECON']:[];return {...out,role:p?.role||out.role||CORE.npc,investigatorRole:p?.investigatorRole||out.investigatorRole||null,abilities};};
 sim.roleAction=async function(pid,raw){
  const p=sim.get(pid);if(!p||!p.alive||sim.caseClosed)return notice(room,pid,'Your role ability is unavailable because your character is no longer active.');
  const text=clean(raw),lower=text.toLowerCase();
  if(p.role===CORE.killer){
   if(sim.phase!=='CRIME')return notice(room,pid,'KILLER abilities are only available during the critical window.');
   if(lower.startsWith('kill ')){const targetName=text.slice(5).trim().toLowerCase(),target=sim.people.find(x=>x.alive&&x.id!==p.id&&x.name.toLowerCase()===targetName);if(!target)return notice(room,pid,'Choose a living target by exact name.');sim.truth.victimId=target.id;sim.remember(p,'episodic',`I selected ${target.name} as my target during the critical window.`,{confidence:100,importance:100,source:'self'});sim.crime();return resolve(room,pid,sim,p,text,{allowedEffect:'Resolve the chosen target action. The server has already applied the authoritative crime state. You may describe consequences, witnesses, traces, uncertainty and plausible scene details, but never reveal hidden truth.'});}
   if(lower==='conceal scene'){if(!sim.truth.crimeCommitted)return notice(room,pid,'There is no crime scene to conceal yet.');sim.tick(1);return resolve(room,pid,sim,p,text,{allowedEffect:'Assess how the concealment attempt changes the scene. It may leave traces, remove obvious signs, create ambiguity, or accomplish little. Never erase authoritative case truth.'});}
   return notice(room,pid,'Killer abilities: ELIMINATE during the critical window, CONCEAL SCENE after the crime.');
  }
  if(p.role===CORE.detective){
   if(lower==='analyze case')return resolve(room,pid,sim,p,text,{allowedEffect:'Analyze the recent public evidence and timeline. Produce a reasoned lead, contradiction, pattern, or no useful finding. Do not reveal hidden truth.'});
   if(lower.startsWith('interrogate ')){const name=text.slice(12).trim().toLowerCase(),target=sim.people.find(x=>x.alive&&x.id!==p.id&&x.name.toLowerCase()===name);if(!target)return notice(room,pid,'Choose a living person by exact name.');sim.ask(pid,target.id,'Formal interrogation: account for your movements and what you personally remember during the critical period.');return resolve(room,pid,sim,p,text,{allowedEffect:'Resolve the interrogation opening based on the current case. The target may later answer, hesitate, contradict themselves, or provide a useful detail. Do not speak as the target beyond opening the interview.'});}
   if(lower.startsWith('mark suspect ')){const name=text.slice(13).trim().toLowerCase(),target=sim.people.find(x=>x.alive&&x.name.toLowerCase()===name);if(!target)return notice(room,pid,'Choose a living person by exact name.');return resolve(room,pid,sim,p,text,{target,allowedEffect:'Assess whether the current evidence supports marking this person for review. Suspicion may rise, fall, or remain unchanged. Never treat suspicion as guilt.'});}
   return notice(room,pid,'Detective abilities: ANALYZE CASE, INTERROGATE, MARK SUSPECT.');
  }
  if(p.role===CORE.investigator){
   if(lower==='forensics')return resolve(room,pid,sim,p,text,{allowedEffect:'Use the investigator specialty and current location to produce a plausible forensic, behavioral, digital, field, security, medical, journalism, or environmental lead. It may find something useful, something mundane, or nothing conclusive.'});
   if(lower.startsWith('track ')){const name=text.slice(6).trim().toLowerCase(),target=sim.people.find(x=>x.alive&&x.id!==p.id&&x.name.toLowerCase()===name);if(!target)return notice(room,pid,'Choose a living person by exact name.');const old=p.location;p.location=target.location;sim.remember(p,'observation',`I tracked ${target.name} to ${target.location}.`,{confidence:70,importance:65,source:'self'});return resolve(room,pid,sim,p,text,{allowedEffect:`Assess the movement trail from ${old} toward ${target.location}. It may produce a reliable lead, ambiguity, or an innocent explanation.`});}
   if(lower==='recon')return resolve(room,pid,sim,p,text,{allowedEffect:'Survey the current location using nearby people, recent events, evidence and the investigator specialty. Return useful activity, a mundane observation, an inconsistency, or no actionable finding.'});
   return notice(room,pid,'Investigator abilities: FORENSICS, TRACK, RECON.');
  }
  return notice(room,pid,'NPCs do not have human role abilities.');
 };
 sim.killerDecision=function(pid){return sim.roleAction(pid,'kill');};
 sim.__nocturneRolesInstalled=typeof sim.roleAction==='function';
 if(!sim.__nocturneRolesInstalled)return;
 sim.event('ROLES','The investigation team has been assigned. Missing human roles are represented by autonomous NPC specialists.');sim.emit();
}
function installRoomStart(GameRoom){if(GameRoom.prototype.__nocturneRoleStartPatched)return;GameRoom.prototype.__nocturneRoleStartPatched=true;const originalStart=GameRoom.prototype.start;GameRoom.prototype.start=async function(...args){const result=await originalStart.apply(this,args);install(this);return result;};}
module.exports={install,installRoomStart};
