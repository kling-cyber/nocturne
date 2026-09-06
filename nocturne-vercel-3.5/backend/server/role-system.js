// NOCTURNE multiplayer role authority.
// Installed by index.js without changing the core simulation architecture.
const CORE={killer:'KILLER',detective:'DETECTIVE',investigator:'INVESTIGATOR',npc:'NPC'};
const SPECIALTIES=['Forensic Analyst','Behavioral Analyst','Digital Investigator','Field Investigator','Investigative Journalist','Security Specialist','Medical Consultant'];
const clean=(s,n=300)=>String(s??'').replace(/[\u0000-\u001F\u007F]/g,'').trim().slice(0,n);
function notice(room,pid,text){room.io.to(pid).emit('errorMessage',text);return {ok:false,message:text};}
function output(room,pid,sim,result){
 const out={ok:true,roleAction:true,title:clean(result?.title||'Role ability resolved.',140),description:clean(result?.description||'The role ability completed successfully.',900),action:clean(result?.action||'',120)};
 room.io.to(pid).emit('roleActionOutput',out);
 return out;
}
function install(room){
 const sim=room?.sim;if(!sim||sim.singlePlayer)return;
 if(sim.__nocturneRolesInstalled&&typeof sim.roleAction==='function')return;
 const humans=sim.people.filter(p=>p.isPlayer),killer=sim.get(sim.truth.killerId);
 if(!killer){sim.__nocturneRolesInstalled=false;return;}
 for(const p of humans){p.role=p.id===killer.id?CORE.killer:CORE.investigator;p.investigatorRole=null;}
 const detective=humans.find(p=>p.id!==killer.id);if(detective){detective.role=CORE.detective;detective.investigatorRole='Lead Detective';}
 let si=0;for(const p of humans){if(p.id===killer.id||p.id===detective?.id)continue;p.role=CORE.investigator;p.investigatorRole=SPECIALTIES[si%SPECIALTIES.length];si++;}
 const npcs=sim.people.filter(p=>!p.isPlayer&&p.alive);let ni=0;
 if(!sim.people.some(p=>p.role===CORE.detective)&&npcs[ni]){npcs[ni].role=CORE.detective;npcs[ni].investigatorRole='Lead Detective';npcs[ni].aiRole=true;ni++;}
 if(!sim.people.some(p=>p.role===CORE.investigator)&&npcs[ni]){npcs[ni].role=CORE.investigator;npcs[ni].investigatorRole='Field Investigator';npcs[ni].aiRole=true;ni++;}
 for(;ni<npcs.length;ni++){npcs[ni].role=CORE.npc;npcs[ni].investigatorRole=null;npcs[ni].aiRole=true;}
 if(typeof sim.__nocturneOriginalPrivate!=='function')sim.__nocturneOriginalPrivate=sim.private.bind(sim);
 const originalPrivate=sim.__nocturneOriginalPrivate;
 sim.private=function(pid){const out=originalPrivate(pid)||{},p=sim.get(pid),abilities=p?.role===CORE.killer?['ELIMINATE','CONCEAL SCENE']:p?.role===CORE.detective?['ANALYZE CASE','INTERROGATE','MARK SUSPECT']:p?.role===CORE.investigator?['FORENSICS','TRACK','RECON']:[];return {...out,role:p?.role||out.role||CORE.npc,investigatorRole:p?.investigatorRole||out.investigatorRole||null,abilities};};
 sim.roleAction=function(pid,raw){
  const p=sim.get(pid);if(!p||!p.alive||sim.caseClosed)return notice(room,pid,'Your role ability is unavailable because your character is no longer active.');
  const text=clean(raw),lower=text.toLowerCase();
  if(p.role===CORE.killer){
   if(sim.phase!=='CRIME')return notice(room,pid,'KILLER abilities are only available during the critical window.');
   if(lower.startsWith('kill ')){const targetName=text.slice(5).trim().toLowerCase(),target=sim.people.find(x=>x.alive&&x.id!==p.id&&x.name.toLowerCase()===targetName);if(!target)return notice(room,pid,'Choose a living target by exact name.');sim.truth.victimId=target.id;sim.remember(p,'episodic',`I selected ${target.name} as my target during the critical window.`,{confidence:100,importance:100,source:'self'});sim.event('PRIVATE','You selected your target. The crime now resolves.',pid);sim.crime();sim.emit();return output(room,pid,sim,{action:text,title:`Target selected: ${target.name}`,description:`${target.name} was selected as the target and the critical event was resolved. The rest of the case now reflects the resulting crime state.`});}
   if(lower==='conceal scene'){if(!sim.truth.crimeCommitted)return notice(room,pid,'There is no crime scene to conceal yet.');sim.add({type:'environmental',title:'Possible scene interference',description:'The crime scene shows signs of limited post-event disturbance. Investigators should corroborate the scene carefully.',reliability:52,source:'scene'});sim.event('PRIVATE','You attempted to conceal or disturb part of the scene. This may create additional evidence.',pid);sim.tick(1);sim.emit();return output(room,pid,sim,{action:text,title:'Scene concealment attempted',description:'You disturbed part of the crime scene. The resulting environmental evidence has been added to the case record.'});}
   return notice(room,pid,'Killer abilities: ELIMINATE during the critical window, CONCEAL SCENE after the crime.');
  }
  if(p.role===CORE.detective){
   if(lower==='analyze case'){const recent=sim.evidence.slice(-12),avg=recent.length?Math.round(recent.reduce((a,e)=>a+Number(e.reliability||0),0)/recent.length):0;sim.add({type:'analysis',title:'Detective case analysis',description:`The Detective cross-referenced ${recent.length} recent evidence records. Average reported reliability is ${avg}%. This is an analytical lead, not automatic proof.`,reliability:Math.min(95,avg+10),source:p.name});sim.event('INVESTIGATION',`${p.name} performed a case-level evidence analysis.`);sim.emit();return output(room,pid,sim,{action:text,title:'Case analysis complete',description:`${p.name} cross-referenced ${recent.length} recent evidence records. Average reported reliability: ${avg}%. The analysis is now available in Evidence for further corroboration.`});}
   if(lower.startsWith('interrogate ')){const targetName=text.slice(12).trim().toLowerCase(),target=sim.people.find(x=>x.alive&&x.id!==p.id&&x.name.toLowerCase()===targetName);if(!target)return notice(room,pid,'Choose a living person by exact name.');sim.ask(pid,target.id,'Formal interrogation: account for your movements and what you personally remember during the critical period.');sim.add({type:'testimony',title:`Interrogation initiated: ${target.name}`,description:`${p.name} formally questioned ${target.name} about movements and personal memory during the critical period. The response should be evaluated against independent evidence and the subject's known location.`,reliability:65,source:p.name});sim.event('INVESTIGATION',`${p.name} formally interrogated ${target.name}.`);sim.emit();return output(room,pid,{},{action:text,title:`Interrogation opened: ${target.name}`,description:`A formal question has been sent to ${target.name}. The interrogation record is now visible in Evidence; compare the eventual answer with the case timeline and independent records.`});}
   if(lower.startsWith('mark suspect ')){const targetName=text.slice(13).trim().toLowerCase(),target=sim.people.find(x=>x.alive&&x.name.toLowerCase()===targetName);if(!target)return notice(room,pid,'Choose a living person by exact name.');target.suspicion=Math.max(0,Math.min(100,Number(target.suspicion||0)+12));sim.add({type:'behavioral',title:`Person of interest: ${target.name}`,description:`The Detective marked ${target.name} for focused review. This is an investigative designation, not a verdict.`,reliability:70,source:p.name});sim.event('INVESTIGATION',`${p.name} marked ${target.name} as a person of interest.`);sim.emit();return output(room,pid,{},{action:text,title:`${target.name} marked for review`,description:`${target.name}'s suspicion level was increased and a person-of-interest record was added to Evidence. This is not a finding of guilt.`});}
   return notice(room,pid,'Detective abilities: ANALYZE CASE, INTERROGATE, MARK SUSPECT.');
  }
  if(p.role===CORE.investigator){
   if(lower==='forensics'){sim.add({type:'trace',title:`Forensic search: ${p.location}`,description:`${p.name} performed a focused field-forensics search for traces, objects and environmental inconsistencies. Findings require corroboration.`,reliability:76,source:p.name});sim.event('INVESTIGATION',`${p.name} performed focused forensic work in ${p.location}.`);sim.emit();return output(room,pid,{},{action:text,title:`Forensics complete: ${p.location}`,description:`A focused forensic search was completed in ${p.location}. The resulting trace record is now available in Evidence for corroboration.`});}
   if(lower.startsWith('track ')){const targetName=text.slice(6).trim().toLowerCase(),target=sim.people.find(x=>x.alive&&x.id!==p.id&&x.name.toLowerCase()===targetName);if(!target)return notice(room,pid,'Choose a living person by exact name.');const old=p.location;p.location=target.location;sim.remember(p,'observation',`I tracked ${target.name} to ${target.location}.`,{confidence:86,importance:78,source:'self'});sim.add({type:'observation',title:`Movement trace: ${target.name}`,description:`${p.name} followed the movement trail of ${target.name} toward ${target.location}.`,reliability:72,source:p.name});sim.event('INVESTIGATION',`${p.name} tracked ${target.name} from ${old} toward ${target.location}.`);sim.emit();return output(room,pid,{},{action:text,title:`Tracking complete: ${target.name}`,description:`You followed ${target.name} toward ${target.location}. A movement-trace record has been added to Evidence.`});}
   if(lower==='recon'){const nearby=sim.people.filter(x=>x.alive&&x.location===p.location&&x.id!==p.id).map(x=>x.name);sim.add({type:'observation',title:`Recon: ${p.location}`,description:`Field reconnaissance found ${nearby.length?nearby.join(', '):'no other visible people'} in the area at the time of inspection.`,reliability:68,source:p.name});sim.event('INVESTIGATION',`${p.name} performed reconnaissance in ${p.location}.`);sim.emit();return output(room,pid,{},{action:text,title:`Recon complete: ${p.location}`,description:`Reconnaissance found ${nearby.length?nearby.join(', '):'no other visible people'} in the area. The observation has been added to Evidence.`});}
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
