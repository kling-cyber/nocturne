const crypto=require("crypto");
let OpenAI=null;
try{OpenAI=require("openai")}catch(e){}

const ai=OpenAI&&process.env.OPENAI_API_KEY
  ?new OpenAI({apiKey:process.env.OPENAI_API_KEY})
  :null;

const MODEL=process.env.OPENAI_TEXT_MODEL||"gpt-5.6-luna";
const IMG=process.env.OPENAI_IMAGE_MODEL||"gpt-image-2";

const WORLDS=[
 ["Blackwood Hotel",["Grand Lobby","Ballroom","Kitchen","Library","Service Corridor","Suite 204","Rooftop","Garden","Parking"]],
 ["Ashcroft Estate",["Entrance Hall","Library","Study","Conservatory","Kitchen","Cellar","Garden","Guest Wing","Garage"]],
 ["Marrowgate Museum",["Grand Gallery","Archive","Restoration Lab","Security Office","Loading Dock","Atrium","Roof Access","Staff Room"]],
 ["Velvet Room Theatre",["Lobby","Auditorium","Backstage","Dressing Rooms","Props Room","Green Room","Catwalk","Bar"]],
 ["Northstar Research Campus",["Reception","Lab A","Lab B","Conference Room","Server Room","Cafeteria","Parking","Service Hall","Roof"]],
 ["The Meridian",["Grand Lounge","Dining Deck","Galley","Cabin Hall","Observation Lounge","Service Corridor","Engine Access","Pool Deck","Bridge"]],
 ["Ravenscar Island Retreat",["Main Lodge","Boathouse","Cliff Path","Spa","Dining Hall","Cottages","Generator Room","Greenhouse","Helipad"]],
 ["Starlight Film Studio",["Soundstage A","Soundstage B","Production Office","Wardrobe","Editing Suite","Prop Warehouse","Backlot","Screening Room","Canteen"]],
 ["Grand Prix Paddock",["Team Garage","Pit Lane","Hospitality Suite","Control Room","Media Centre","Workshop","Transport Yard","VIP Terrace","Track Tunnel"]],
 ["Old City University",["Senate Hall","Rare Books Room","Laboratory","Faculty Lounge","Archives","Courtyard","Theatre","Dormitory","Boiler Room"]]
];

const FIRST=["Mara","Julian","Elena","Theo","Nadia","Victor","Iris","Marcus","Sofia","Adrian","Leah","Damian","Rhea","Noah","Celeste","Arman","Clara","Milo","Priya","Owen","Lena","Jonah","Maeve","Ravi","Diana","Silas"];
const LAST=["Vale","Mercer","Rowan","Sterling","Hart","Voss","Kane","Bishop","Hale","Cross","Marlow","Reed","Quinn","Frost","Sinclair","Dane","Sloane","West","Carter","Ellis"];
const JOBS=["director","curator","chef","security officer","producer","engineer","researcher","lawyer","journalist","doctor","professor","photographer","accountant","actor","architect","technician","pilot","archivist"];
const TRAITS=["observant but guarded","warm and persuasive","ambitious and impatient","anxious and detail-focused","charismatic but secretive","skeptical and blunt","empathetic but conflict-averse","competitive and proud","quietly manipulative","curious and impulsive","calm under pressure","socially confident but vain"];
const GOALS=["protect reputation","discover the truth","protect another person","recover something valuable","leave unnoticed","settle a personal conflict","keep a damaging secret","prove competence","find who is lying","avoid becoming a suspect","protect their career"];
const SECRETS=["owes a large debt","has hidden a relationship","altered an important document","has been stealing small items","knows a damaging family secret","plans to leave their job","was secretly meeting the victim","has a financial conflict with another guest","has lied about their whereabouts","possesses information they fear will ruin their reputation","is protecting a colleague","has a private grievance against the victim"];
const MOTIVES=["a threatened secret","a personal betrayal","a financial conflict","fear of exposure","revenge for an old wrong","a collapsed relationship","a damaging disclosure","a conflict over control or status","fear of losing everything"];
const PRESSURES=["the victim planned to expose something","a confrontation was approaching","someone discovered a secret","a private dispute was escalating","the victim had scheduled a damaging meeting"];

const ROLES=[
 ["Lead Detective","Build the master timeline and challenge contradictions.",["timeline","testimony"]],
 ["Forensic Analyst","Interpret traces, objects and environmental inconsistencies.",["trace","object","environmental"]],
 ["Behavioral Analyst","Read stress, motives, alliances and suspicious changes.",["behavioral","testimony"]],
 ["Digital Investigator","Follow access logs, messages, cameras and device evidence.",["digital","visual"]],
 ["Field Investigator","Move through the world, locate witnesses and verify scenes.",["observation","testimony"]],
 ["Investigative Journalist","Interview people, compare stories and surface hidden relationships.",["testimony","document"]],
 ["Security Specialist","Map movement, access and blind spots.",["digital","timeline","visual"]],
 ["Medical Consultant","Interpret the non-graphic timing and condition clues.",["timeline","environmental"]]
];

const MEMORY_TYPES=["episodic","observation","conversation","rumor","belief","secret","routine"];

const pick=a=>a[Math.floor(Math.random()*a.length)];
const uid=()=>crypto.randomBytes(6).toString("hex");
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clean=(s,n=600)=>String(s??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").slice(0,n);

class Sim{

 constructor(players,room,options={}){
  this.room=room;
  this.mode=options.mode||"MULTIPLAYER";
  this.singlePlayer=this.mode==="SINGLE_PLAYER";
  this.difficulty=options.difficulty||"DETECTIVE";
  this.requestedInvestigatorRole=options.investigatorRole||"";
  this.seed=crypto.randomBytes(12).toString("hex");
  this.world=pick(WORLDS);
  this.people=[];
  this.events=[];
  this.evidence=[];
  this.questions=new Map();
  this.t=0;
  this.phase="SETUP";
  this.truth={};
  this.caseClosed=false;
  this.aiKillerTimer=null;
  this.make(players);
 }

 person(id,name,isPlayer,killer=false){
  return{
   id,
   name,
   isPlayer,
   role:killer?"KILLER":"INVESTIGATOR",
   investigatorRole:null,
   job:isPlayer?"investigator":pick(JOBS),
   trait:pick(TRAITS),
   goal:pick(GOALS),
   secret:pick(SECRETS),
   location:pick(this.world[1]),
   alive:true,
   suspicion:Math.floor(Math.random()*12),
   stress:Math.floor(Math.random()*20),
   memory:[],
   beliefs:[],
   relationships:{},
   lastAction:null,
   memoryVersion:2
  };
 }

 remember(p,type,text,opts={}){
  if(!p)return null;

  const m={
   id:uid(),
   t:this.t,
   type:type||"episodic",
   text:clean(text,500),
   confidence:clamp(Math.round(opts.confidence??75),15,100),
   source:opts.source||"personal",
   importance:clamp(Math.round(opts.importance??50),0,100),
   distorted:false
  };

  p.memory.push(m);

  if(p.memory.length>42)this.forgetOrCompress(p);

  return m;
 }

 forgetOrCompress(p){
  p.memory.sort(
   (a,b)=>
    (b.importance+b.confidence*.35)-
    (a.importance+a.confidence*.35)
  );

  const keep=p.memory.slice(0,34);

  for(const m of keep){
   if(m.type==="routine"&&Math.random()<.28)
    m.confidence=clamp(m.confidence-10,15,100);

   if(m.type!=="secret"&&Math.random()<.1)
    m.confidence=clamp(m.confidence-6,15,100);
  }

  p.memory=keep.sort((a,b)=>a.t-b.t);
 }

 recall(p,topic){
  const q=String(topic||"").toLowerCase();

  return p.memory
   .filter(m=>!q||m.text.toLowerCase().includes(q))
   .sort(
    (a,b)=>
     (b.importance+b.confidence*.3)-
     (a.importance+a.confidence*.3)
   )
   .slice(0,8);
 }

 make(players){

  /*
   * ============================================================
   * SINGLE PLAYER SETUP
   * ============================================================
   */

  if(this.singlePlayer){

   const human=players[0];

   const investigator=this.person(
    human.id,
    human.name,
    true,
    false
   );

   const requested=ROLES.find(
    r=>r[0].toLowerCase()===
       this.requestedInvestigatorRole.toLowerCase()
   );

   investigator.investigatorRole=
    requested?.[0]||pick(ROLES)[0];

   this.people.push(investigator);

   const npcCount=
    this.difficulty==="NOCTURNE" ? 12 :
    this.difficulty==="EXPERT" ? 11 :
    this.difficulty==="CASUAL" ? 8 :
    10;

   for(let i=0;i<npcCount;i++){

    let name;

    do{
     name=pick(FIRST)+" "+pick(LAST);
    }while(this.people.some(p=>p.name===name));

    this.people.push(
     this.person(
      "npc-"+uid(),
      name,
      false,
      false
     )
    );
   }

   const candidates=this.people.filter(
    p=>!p.isPlayer&&p.alive
   );

   const killer=pick(candidates);

   const victimPool=candidates.filter(
    p=>p.id!==killer.id
   );

   const victim=pick(victimPool);

   /*
    * The AI Killer is an NPC.
    */
   killer.role="KILLER";

   const accompliceChance=
    this.difficulty==="NOCTURNE" ? .35 :
    this.difficulty==="EXPERT" ? .30 :
    .20;

   const accomplice=
    Math.random()<accompliceChance
     ?pick(victimPool.filter(p=>p.id!==killer.id))
     :null;

   this.truth={
    killerId:killer.id,
    victimId:victim.id,
    motive:pick(MOTIVES),
    pressure:pick(PRESSURES),
    accompliceId:accomplice?.id||null,
    crimeStart:18+Math.floor(Math.random()*9),
    crimeMinute:null,
    scene:null,
    witnessIds:[],
    crimeCommitted:false
   };

   /*
    * The human investigator knows their own role.
    * The Killer and victim remain hidden from public state.
    */
   this.initializeMemories();

   this.event(
    "WORLD",
    `The ${this.world[0]} simulation opens. ${this.people.length} people have independent routines, relationships and private concerns.`
   );

   this.add({
    type:"environmental",
    title:"Opening environment",
    description:`${this.world[1].length} active areas create movement routes, blind spots and opportunities for conflicting observations.`,
    reliability:90,
    source:"venue"
   });

   this.event(
    "WORLD",
    `Single-player investigation initialized at ${this.difficulty} difficulty.`
   );

   this.phase="PRE-CRIME";

   return;
  }


  /*
   * ============================================================
   * MULTIPLAYER SETUP
   * ============================================================
   */

  const shuffled=[...players].sort(()=>Math.random()-.5);
  const killerId=shuffled[0]?.id;
  const rolePool=[...ROLES].sort(()=>Math.random()-.5);

  players.forEach((p,i)=>{
   const x=this.person(
    p.id,
    p.name,
    true,
    p.id===killerId
   );

   if(x.role!=="KILLER")
    x.investigatorRole=rolePool[i%rolePool.length][0];

   this.people.push(x);
  });

  const npcCount=Math.max(8,12-players.length);

  for(let i=0;i<npcCount;i++){
   this.people.push(
    this.person(
     "npc-"+uid(),
     pick(FIRST)+" "+pick(LAST),
     false,
     false
    )
   );
  }

  const victim=pick(
   this.people.filter(p=>!p.isPlayer)
  );

  const accomplice=
   Math.random()<.25
    ?pick(
      this.people.filter(
       p=>!p.isPlayer&&p.id!==victim.id
      )
     )
    :null;

  this.truth={
   killerId,
   victimId:victim.id,
   motive:pick(MOTIVES),
   pressure:pick(PRESSURES),
   accompliceId:accomplice?.id||null,
   crimeStart:18+Math.floor(Math.random()*9),
   crimeMinute:null,
   scene:null,
   witnessIds:[],
   crimeCommitted:false
  };

  this.initializeMemories();

  this.event(
   "WORLD",
   `The ${this.world[0]} simulation opens. ${this.people.length} people have independent routines, relationships and private concerns.`
  );

  this.add({
   type:"environmental",
   title:"Opening environment",
   description:`${this.world[1].length} active areas create movement routes, blind spots and opportunities for conflicting observations.`,
   reliability:90,
   source:"venue"
  });

  this.phase="PRE-CRIME";
 }


 initializeMemories(){

  for(const p of this.people){

   this.remember(
    p,
    "routine",
    `I arrived at ${p.location}.`,
    {
     confidence:96,
     importance:38,
     source:"self"
    }
   );

   for(let i=0;i<5;i++){

    const other=pick(
     this.people.filter(x=>x.id!==p.id)
    );

    const texts=[
     `I spoke briefly with ${other.name}.`,
     `I noticed ${other.name} nearby.`,
     `I kept to my own schedule in ${p.location}.`,
     `I heard people moving through the area.`,
     `I checked something on my schedule.`
    ];

    this.remember(
     p,
     pick([
      "episodic",
      "observation",
      "conversation",
      "routine"
     ]),
     pick(texts),
     {
      confidence:52+Math.random()*38,
      importance:28+Math.random()*38
     }
    );
   }

   this.remember(
    p,
    "secret",
    `Private concern: ${p.secret}.`,
    {
     confidence:100,
     importance:98,
     source:"self"
    }
   );
  }

  /*
   * Give the AI Killer private knowledge about the motive.
   * This is never placed in public state().
   */
  const killer=this.get(this.truth.killerId);

  if(killer){

   this.remember(
    killer,
    "secret",
    `Private motive: ${this.truth.motive}.`,
    {
     confidence:100,
     importance:100,
     source:"self"
    }
   );

   this.remember(
    killer,
    "secret",
    `Private pressure: ${this.truth.pressure}.`,
    {
     confidence:100,
     importance:100,
     source:"self"
    }
   );

   this.remember(
    killer,
    "belief",
    `I must avoid becoming the center of suspicion after the critical event.`,
    {
     confidence:100,
     importance:96,
     source:"self"
    }
   );
  }
 }


 get(id){
  return this.people.find(p=>p.id===id);
 }

 clock(){
  const x=19*60+this.t;

  return String(
   Math.floor(x/60)%24
  ).padStart(2,"0")
  +":"+
  String(x%60).padStart(2,"0");
 }

 event(type,text,privateTo){
  this.events.push({
   id:uid(),
   time:this.clock(),
   type,
   text:clean(text,900),
   privateTo:privateTo||null
  });
 }

 add(e){
  this.evidence.push({
   id:uid(),
   createdAt:this.clock(),
   reliability:clamp(
    Math.round(e.reliability??60),
    0,
    100
   ),
   visibility:e.visibility||"public",
   ...e
  });
 }


 tick(n){

  if(this.caseClosed)return;

  this.t+=clamp(
   Number(n)||1,
   1,
   8
  );

  for(
   const p of this.people.filter(
    x=>!x.isPlayer&&x.alive
   )
  ){

   /*
    * The AI Killer gets more purposeful movement.
    * Other NPCs retain ordinary autonomous movement.
    */
   if(
    p.id===this.truth.killerId &&
    this.phase==="PRE-CRIME"
   ){
    this.aiKillerRoutine(p);
    continue;
   }

   if(Math.random()<.5){

    const old=p.location;
    const newLoc=pick(this.world[1]);

    if(newLoc!==old){

     p.location=newLoc;

     this.remember(
      p,
      "observation",
      `I moved from ${old} to ${newLoc}.`,
      {
       confidence:98,
       importance:36,
       source:"self"
      }
     );
    }
   }

   if(Math.random()<.28){

    const nearby=this.people.filter(
     x=>
      x.id!==p.id&&
      x.alive&&
      x.location===p.location
    );

    if(nearby.length){

     const q=pick(nearby);

     this.remember(
      p,
      "observation",
      `I noticed ${q.name} in ${p.location}.`,
      {
       confidence:62+Math.random()*28,
       importance:45,
       source:"self"
      }
     );

     this.relationshipsFor(p,q);
    }
   }

   if(Math.random()<.18){

    this.remember(
     p,
     "routine",
     pick([
      "I checked the time.",
      "I reviewed my schedule.",
      "I kept a private matter to myself.",
      "I tried to avoid unnecessary attention."
     ]),
     {
      confidence:88,
      importance:24,
      source:"self"
     }
    );
   }

   if(p.memory.length>42)
    this.forgetOrCompress(p);
  }

  if(
   this.t>=this.truth.crimeStart&&
   this.phase==="PRE-CRIME"
  ){
   this.openCrimeWindow();
  }
 }


 aiKillerRoutine(killer){

  if(!killer||killer.id!==this.truth.killerId)
   return;

  /*
   * Before the crime, the AI Killer behaves like a normal NPC.
   * As the critical window approaches, it begins favoring
   * locations and movement that can create an opportunity.
   */

  const victim=this.get(this.truth.victimId);

  if(!victim||!victim.alive)
   return;

  const remaining=this.truth.crimeStart-this.t;

  if(remaining<=4){

   /*
    * Move toward the victim's current location when possible.
    * This creates a causal trail that investigators can later
    * reconstruct.
    */
   if(killer.location!==victim.location){

    const old=killer.location;
    killer.location=victim.location;

    this.remember(
     killer,
     "observation",
     `I moved from ${old} to ${victim.location}.`,
     {
      confidence:100,
      importance:70,
      source:"self"
     }
    );
   }

   if(
    killer.location===victim.location&&
    Math.random()<.35
   ){
    this.remember(
     killer,
     "observation",
     `I was near ${victim.name} shortly before the critical period.`,
     {
      confidence:96,
      importance:88,
      source:"self"
     }
    );
   }

  }else if(Math.random()<.45){

   const old=killer.location;
   const newLoc=pick(this.world[1]);

   if(newLoc!==old){
    killer.location=newLoc;

    this.remember(
     killer,
     "routine",
     `I moved from ${old} to ${newLoc}.`,
     {
      confidence:98,
      importance:35,
      source:"self"
     }
    );
   }
  }
 }


 openCrimeWindow(){

  this.phase="CRIME";

  const k=this.get(this.truth.killerId);

  this.event(
   "WORLD",
   "A critical private opportunity has opened. The venue's routine is temporarily unstable."
  );

  if(k){

   this.remember(
    k,
    "episodic",
    this.singlePlayer
     ?"The critical window is open. I must decide how to handle the situation."
     :"The critical window is open. I decide what my character does next.",
    {
     confidence:100,
     importance:100,
     source:"self"
    }
   );

   if(this.singlePlayer){

    /*
     * In Single Player the Killer is autonomous.
     * The server resolves their decision without requiring
     * the human investigator to trigger anything.
     */
    this.event(
     "WORLD",
     "Somewhere in the venue, a private decision is being made."
    );

    const delay=
     this.difficulty==="NOCTURNE" ? 1200 :
     this.difficulty==="EXPERT" ? 1600 :
     2200;

    clearTimeout(this.aiKillerTimer);

    this.aiKillerTimer=setTimeout(
     ()=>{
      if(
       !this.caseClosed&&
       this.phase==="CRIME"
      ){
       this.aiKillerDecision();
      }
     },
     delay
    );

   }else{

    this.event(
     "PRIVATE",
     "The critical window is open. Your decision is yours alone. Commit only when you choose.",
     k.id
    );
   }
  }
 }


 aiKillerDecision(){

  const killer=this.get(this.truth.killerId);
  const victim=this.get(this.truth.victimId);

  if(
   !killer||
   !victim||
   !killer.alive||
   !victim.alive||
   this.phase!=="CRIME"||
   this.caseClosed
  ){
   return;
  }

  /*
   * AI Killer decision:
   *
   * 1. Move toward the victim if necessary.
   * 2. Commit to the hidden causal event.
   * 3. Generate only server-authoritative consequences.
   */
  if(killer.location!==victim.location){

   const old=killer.location;

   killer.location=victim.location;

   this.remember(
    killer,
    "episodic",
    `I moved from ${old} to ${victim.location} during the critical window.`,
    {
     confidence:100,
     importance:92,
     source:"self"
    }
   );
  }

  this.remember(
   killer,
   "episodic",
   `I committed to the critical decision involving ${victim.name}.`,
   {
    confidence:100,
    importance:100,
    source:"self"
   }
  );

  this.event(
   "WORLD",
   "The critical window closes and the venue's routine changes."
  );

  this.crime();
 }


 killerDecision(pid){

  const p=this.get(pid);

  if(
   !p||
   p.id!==this.truth.killerId||
   this.phase!=="CRIME"
  ){
   return;
  }

  /*
   * This path is only for the multiplayer human Killer.
   */
  this.remember(
   p,
   "episodic",
   "I committed to the critical decision. The hidden case event now resolves.",
   {
    confidence:100,
    importance:100,
    source:"self"
   }
  );

  this.event(
   "PRIVATE",
   "You committed to the critical decision. The case has moved past the critical window.",
   pid
  );

  this.crime();
 }


 crime(){

  const v=this.get(this.truth.victimId);
  const k=this.get(this.truth.killerId);

  if(
   !v||
   !v.alive||
   !k||
   this.truth.crimeCommitted
  ){
   return;
  }

  const scene=k.location;

  const witnesses=this.people.filter(
   p=>
    p.alive&&
    p.id!==k.id&&
    p.id!==v.id&&
    p.location===scene
  );

  v.alive=false;
  v.location=scene;

  this.truth.crimeCommitted=true;
  this.truth.crimeMinute=this.t;
  this.truth.scene=scene;
  this.truth.witnessIds=witnesses.map(x=>x.id);

  this.phase="POST-CRIME";

  this.event(
   "CRIME",
   `A death is discovered in ${scene}. The exact sequence is not revealed to the players.`
  );

  for(const w of witnesses){

   this.remember(
    w,
    "episodic",
    `I was in ${scene} when the venue's routine abruptly changed. I may not remember every detail.`,
    {
     confidence:70+Math.random()*20,
     importance:78,
     source:"self"
    }
   );
  }

  /*
   * The human investigator gets useful but incomplete evidence.
   */
  const difficultyPenalty=
   this.difficulty==="NOCTURNE" ? 10 :
   this.difficulty==="EXPERT" ? 6 :
   this.difficulty==="CASUAL" ? -4 :
   0;

  this.add({
   type:"timeline",
   title:"Estimated critical window",
   description:`Independent observations place the death around ${this.clock()}, but the exact minute remains uncertain.`,
   reliability:clamp(62-difficultyPenalty,35,90),
   source:"initial assessment"
  });

  this.add({
   type:"trace",
   title:`Scene disturbance: ${scene}`,
   description:"Recent environmental disruption is consistent with several possible explanations. It identifies a place, not a culprit.",
   reliability:68,
   source:"scene"
  });

  if(witnesses.length){

   this.add({
    type:"testimony",
    title:"Nearby witness lead",
    description:`${witnesses.length} simulated person(s) were near the scene. Each has a different memory and may be uncertain or self-protective.`,
    reliability:58,
    source:witnesses.map(x=>x.name).join(", ")
   });
  }

  this.add({
   type:"digital",
   title:"Partial access record",
   description:`A system record shows activity associated with ${scene} near the critical window. It is incomplete and should be corroborated.`,
   reliability:72,
   source:"system log"
  });

  this.add({
   type:"environmental",
   title:"Environmental inconsistency",
   description:`Something about the ${scene} environment does not perfectly match the ordinary routine. It is a lead, not proof.`,
   reliability:61,
   source:"scene"
  });

  this.event(
   "WORLD",
   "The venue enters investigation mode. People can be questioned, followed, compared and challenged."
  );

  this.phase="INVESTIGATION";

  /*
   * Give the AI Killer an immediate post-crime self-preservation
   * state without revealing the identity publicly.
   */
  if(k.role==="KILLER"){

   k.stress=clamp(
    k.stress+
    (this.difficulty==="NOCTURNE"?18:12),
    0,
    100
   );

   this.remember(
    k,
    "belief",
    "I need to keep my public behavior consistent and avoid drawing unnecessary attention.",
    {
     confidence:100,
     importance:94,
     source:"self"
    }
   );
  }

  this.emit();
 }


 parseAction(p,raw){

  const lower=raw.toLowerCase();
  let result=null;

  const move=/(?:move|go|walk|head|travel|return)\s+(?:to\s+)?(.+)/i.exec(raw);

  if(move){

   const target=move[1]
    .replace(/[.!?]+$/g,"")
    .trim();

   const area=
    this.world[1].find(
     x=>x.toLowerCase()===target.toLowerCase()
    )||
    this.world[1].find(
     x=>
      x.toLowerCase().includes(target.toLowerCase())||
      target.toLowerCase().includes(x.toLowerCase())
    );

   if(area){

    const old=p.location;

    p.location=area;

    result=
     `${p.name} moved from ${old} to ${area}.`;

    this.remember(
     p,
     "episodic",
     `I moved from ${old} to ${area}.`,
     {
      confidence:100,
      importance:68,
      source:"self"
     }
    );
   }
  }

  if(
   !result&&
   /(?:follow|tail)\s+/i.test(lower)
  ){

   const target=this.people.find(
    x=>
     x.alive&&
     x.id!==p.id&&
     lower.includes(x.name.toLowerCase())
   );

   if(target){

    const old=p.location;

    p.location=target.location;

    result=
     `${p.name} followed ${target.name} toward ${target.location}.`;

    this.remember(
     p,
     "observation",
     `I followed ${target.name} to ${target.location}.`,
     {
      confidence:100,
      importance:72,
      source:"self"
     }
    );
   }
  }

  if(
   !result&&
   /(?:search|inspect|examine|look through|check)\b/i.test(lower)
  ){

   result=
    `${p.name} carefully inspected ${p.location}.`;

   this.add({
    type:"observation",
    title:`Inspection: ${p.location}`,
    description:`${p.investigatorRole||"Investigator"} inspected the area. The resulting lead must be corroborated with independent evidence.`,
    reliability:58+Math.random()*27,
    source:p.name
   });
  }

  if(
   !result&&
   /(?:talk|speak|ask)\s+(?:to\s+)?/i.test(lower)
  ){

   const target=this.people.find(
    x=>
     x.alive&&
     x.id!==p.id&&
     lower.includes(x.name.toLowerCase())
   );

   if(target){

    result=
     `${p.name} approached ${target.name} in ${target.location}.`;

    this.remember(
     p,
     "conversation",
     `I spoke with ${target.name} in ${target.location}.`,
     {
      confidence:95,
      importance:55,
      source:"self"
     }
    );

    this.remember(
     target,
     "conversation",
     `${p.name} approached me in ${target.location}.`,
     {
      confidence:95,
      importance:55,
      source:"self"
     }
    );
   }
  }

  return result;
 }


 async action(pid,raw){

  const p=this.get(pid);

  if(
   !p||
   !p.alive||
   this.caseClosed
  ){
   return;
  }

  raw=clean(raw,600).trim();

  if(!raw)return;

  this.tick(
   2+Math.floor(Math.random()*3)
  );

  p.lastAction=raw;

  this.remember(
   p,
   "episodic",
   `I chose to: ${raw}`,
   {
    confidence:100,
    importance:72,
    source:"self"
   }
  );

  const parsed=this.parseAction(p,raw);

  this.event(
   "PLAYER",
   parsed||`${p.name}: ${raw}`
  );

  if(
   p.role==="KILLER"&&
   !this.singlePlayer&&
   this.phase==="CRIME"
  ){

   this.add({
    type:"behavioral",
    title:"Critical-period behavior",
    description:"A human player's choice during the critical period can later be compared with movement, testimony and other evidence.",
    reliability:35+Math.random()*35,
    source:"simulation"
   });
  }

  await this.narrate(p,raw);

  this.npcs();

  /*
   * A single-player case can let the autonomous world react
   * after each investigator action.
   */
  if(this.singlePlayer)
   this.singlePlayerNpcReactions(p);

  this.emit();
 }


 singlePlayerNpcReactions(actor){

  if(!actor)return;

  const nearby=this.people.filter(
   p=>
    !p.isPlayer&&
    p.alive&&
    p.id!==actor.id&&
    p.location===actor.location
  );

  if(!nearby.length)return;

  const reactionChance=
   this.difficulty==="NOCTURNE" ? .38 :
   this.difficulty==="EXPERT" ? .30 :
   .22;

  if(Math.random()>reactionChance)return;

  const npc=pick(nearby);

  npc.stress=clamp(
   npc.stress+
   (this.difficulty==="NOCTURNE"?7:4),
   0,
   100
  );

  this.remember(
   npc,
   "observation",
   `I noticed ${actor.name} investigating near me.`,
   {
    confidence:82,
    importance:58,
    source:"self"
   }
  );

  if(
   npc.id===this.truth.killerId
  ){

   this.remember(
    npc,
    "belief",
    `The investigator may be getting closer to information I need to protect.`,
    {
     confidence:65+Math.random()*20,
     importance:88,
     source:"inference"
    }
   );

   npc.suspicion=clamp(
    npc.suspicion+
    (Math.random()<.55?2:-1),
    0,
    100
   );
  }

  if(
   npc.stress>70&&
   Math.random()<.18
  ){

   this.add({
    type:"behavioral",
    title:"Noticeable reaction",
    description:`${npc.name} appears guarded after seeing the investigation activity. Stress can have many causes and does not prove guilt.`,
    reliability:48,
    source:npc.name
   });
  }
 }


 async narrate(p,raw){

  if(!ai){

   this.event(
    "GM",
    `${p.name} acts in ${p.location}. The local simulation records the choice and lets the world react.`
   );

   return;
  }

  try{

   const response=await ai.responses.create({
    model:MODEL,
    input:[
     {
      role:"system",
      content:
       "You are the narrative GM for a fictional, non-graphic multiplayer or single-player murder mystery. The server is authoritative. Never reveal hidden case truth, never identify the hidden Killer, never control a human player's choices or speech, and never provide real-world instructions for violence. Return only the requested structured fields. Narration should describe plausible consequences without inventing authoritative facts."
     },
     {
      role:"user",
      content:
       `Mode: ${this.mode}
Actor: ${p.name}
Public role: ${p.role}
Investigator specialty: ${p.investigatorRole||"none"}
Location: ${p.location}
Phase: ${this.phase}
Clock: ${this.clock()}
Difficulty: ${this.difficulty}
Player action: ${raw}
Nearby people: ${this.people.filter(x=>x.alive&&x.location===p.location&&x.id!==p.id).map(x=>x.name).join(", ")}`
     }
    ],
    text:{
     format:{
      type:"json_schema",
      name:"nocturne_gm",
      strict:true,
      schema:{
       type:"object",
       properties:{
        narration:{type:"string"},
        evidence:{
         anyOf:[
          {
           type:"object",
           properties:{
            type:{type:"string"},
            title:{type:"string"},
            description:{type:"string"},
            reliability:{type:"number"}
           },
           required:[
            "type",
            "title",
            "description",
            "reliability"
           ],
           additionalProperties:false
          },
          {type:"null"}
         ]
        },
        npcReaction:{
         anyOf:[
          {type:"string"},
          {type:"null"}
         ]
        }
       },
       required:[
        "narration",
        "evidence",
        "npcReaction"
       ],
       additionalProperties:false
      }
     }
    }
   });

   const x=JSON.parse(
    response.output_text||"{}"
   );

   if(x.narration)
    this.event(
     "GM",
     clean(x.narration,900)
    );

   if(x.evidence)
    this.add({
     type:
      clean(x.evidence.type,40)||
      "observation",
     title:clean(x.evidence.title,120),
     description:clean(
      x.evidence.description,
      500
     ),
     reliability:
      Number(x.evidence.reliability)||60,
     source:"GM"
    });

   if(x.npcReaction)
    this.event(
     "NPC",
     clean(x.npcReaction,500)
    );

  }catch(e){

   this.event(
    "GM",
    `${p.name}'s action changes the situation. The local simulation remains authoritative.`
   );
  }
 }


 npcs(){

  for(
   const p of this.people.filter(
    x=>!x.isPlayer&&x.alive
   )
  ){

   if(
    p.id===this.truth.killerId&&
    this.singlePlayer
   ){
    continue;
   }

   if(Math.random()<.2){

    const q=pick(
     this.people.filter(
      x=>x.id!==p.id&&x.alive
     )
    );

    if(q)
     this.relationshipsFor(p,q);
   }

   if(
    p.stress>65&&
    Math.random()<.1
   ){

    this.add({
     type:"behavioral",
     title:"Nervous behavior",
     description:`${p.name} appears increasingly guarded. Stress can distort recollection and does not prove guilt.`,
     reliability:45+Math.random()*30,
     source:p.name
    });
   }
  }
 }


 relationshipsFor(p,q){

  if(!p.relationships[q.id]){

   p.relationships[q.id]={
    trust:Math.floor(40+Math.random()*35),
    familiarity:Math.floor(20+Math.random()*60)
   };
  }

  if(Math.random()<.2){

   const belief=
    `${q.name} may know more than they admit.`;

   if(!p.beliefs.includes(belief))
    p.beliefs.push(belief);

   this.remember(
    p,
    "belief",
    belief,
    {
     confidence:35+Math.random()*35,
     importance:55,
     source:"inference"
    }
   );

   p.suspicion=clamp(
    p.suspicion+
    (Math.random()<.5?3:-1),
    0,
    100
   );
  }
 }


 ask(askerId,targetId,question){

  const a=this.get(askerId);
  const t=this.get(targetId);

  if(
   !a||
   !t||
   !a.alive||
   !t.alive||
   a.id===t.id||
   this.caseClosed
  ){
   return;
  }

  const qText=clean(
   question,
   400
  ).trim();

  if(!qText)return;

  this.tick(1);

  const id=uid();

  this.questions.set(
   id,
   {
    askerId,
    targetId,
    target:qText,
    createdAt:this.t
   }
  );

  if(t.isPlayer){

   this.event(
    "QUESTION",
    `${a.name} requested an answer from ${t.name}.`
   );

   this.room.io
    .to(t.id)
    .emit(
     "incomingQuestion",
     {
      questionId:id,
      from:a.name,
      question:qText
     }
    );

   this.room.io
    .to(a.id)
    .emit(
     "questionPending",
     {
      questionId:id,
      target:t.name
     }
    );

   this.emit();

   return;
  }

  this.npcAnswer(id);
 }


 npcAnswer(qid){

  const q=this.questions.get(qid);

  if(!q)return;

  const npc=this.get(q.targetId);
  const asker=this.get(q.askerId);

  if(!npc||!asker)return;

  const query=q.target.toLowerCase();

  /*
   * The Killer gets stronger self-preservation behavior in
   * higher difficulty single-player cases.
   */
  const killerGuard=
   npc.id===this.truth.killerId&&
   this.singlePlayer;

  const memories=this.recall(
   npc,
   ""
  )
  .filter(m=>m.type!=="secret")
  .slice(0,7);

  const matching=memories.filter(
   m=>
    query
     .split(/\s+/)
     .some(
      w=>
       w.length>3&&
       m.text.toLowerCase().includes(w)
     )
  );

  let text;
  let conf=58;

  if(
   npc.id===this.truth.accompliceId&&
   Math.random()<.75
  ){

   text=
    `${npc.name} becomes guarded. “I remember parts of that period, but I am not comfortable discussing everything I know.”`;

   conf=61;

  }else if(
   killerGuard&&
   Math.random()<
    (
     this.difficulty==="NOCTURNE"?0.68:
     this.difficulty==="EXPERT"?0.58:
     0.46
    )
  ){

   const responses=[
    `I do not think that detail is as important as you believe.`,
    `I remember the general period, but not every exact detail.`,
    `I would rather not speculate about something I cannot verify.`,
    `I was dealing with my own concerns at the time.`,
    `I don't see how my personal business answers that question.`
   ];

   text=
    `${npc.name} responds carefully: “${pick(responses)}”`;

   conf=
    this.difficulty==="NOCTURNE"?42:
    this.difficulty==="EXPERT"?47:
    53;

   npc.stress=clamp(
    npc.stress+8,
    0,
    100
   );

  }else if(matching.length){

   const m=pick(matching);

   const hedge=
    m.confidence<65
     ?"I think "
     :"";

   text=
    `${npc.name} recalls: “${hedge}${m.text.replace(/^I /,"I ")}${m.confidence<72?" I may be wrong about the exact timing.":""}”`;

   conf=m.confidence;

  }else if(
   /where|location|located|during|time|when/.test(query)
  ){

   text=
    `${npc.name} says they were in ${npc.location}, but cannot account for every minute.`;

   conf=55;

  }else if(Math.random()<.42){

   text=
    `${npc.name} deflects. “I would rather keep some personal matters private.” Their reluctance may concern a separate secret.`;

   conf=45;

  }else{

   text=
    `${npc.name} says they did not directly witness the event and can only describe what they personally remember.`;

   conf=50;
  }

  const reliability=clamp(
   conf-
   npc.stress/5+
   Math.random()*10,
   30,
   92
  );

  this.add({
   type:"testimony",
   title:`Statement from ${npc.name}`,
   description:text,
   reliability,
   source:npc.name
  });

  npc.stress=clamp(
   npc.stress+5,
   0,
   100
  );

  this.remember(
   npc,
   "conversation",
   `I was questioned by ${asker.name}: ${q.target}`,
   {
    confidence:100,
    importance:62,
    source:"interview"
   }
  );

  this.event(
   "INVESTIGATION",
   `${asker.name} questioned ${npc.name}.`
  );

  this.room.io
   .to(q.askerId)
   .emit(
    "questionAnswer",
    {
     questionId:qid,
     target:npc.name,
     answer:text,
     source:npc.name
    }
   );

  this.questions.delete(qid);

  this.emit();
 }


 answer(pid,qid,answer){

  const q=this.questions.get(qid);

  if(
   !q||
   q.targetId!==pid
  ){
   return;
  }

  const p=this.get(pid);
  const a=this.get(q.askerId);

  if(
   !p||
   !a||
   !p.alive
  ){
   return;
  }

  const text=clean(
   answer,
   700
  ).trim();

  if(!text)return;

  this.add({
   type:"testimony",
   title:`Statement from ${p.name}`,
   description:text,
   reliability:78,
   source:p.name
  });

  this.remember(
   p,
   "conversation",
   `I answered ${a.name}: ${text}`,
   {
    confidence:100,
    importance:72,
    source:"self"
   }
  );

  this.event(
   "INVESTIGATION",
   `${p.name} answered a direct question from ${a.name}.`
  );

  this.room.io
   .to(a.id)
   .emit(
    "questionAnswer",
    {
     questionId:qid,
     target:p.name,
     answer:text,
     source:p.name
    }
   );

  this.questions.delete(qid);

  this.emit();
 }


 investigate(pid,payload){

  const a=this.get(pid);

  if(
   !a||
   !a.alive||
   this.caseClosed
  ){
   return;
  }

  const target=clean(
   payload.target,
   180
  ).trim();

  if(payload.mode==="question"){

   const m=this.people.filter(
    x=>
     x.alive&&
     x.id!==a.id&&
     (
      x.name
       .toLowerCase()
       .includes(target.toLowerCase())||
      x.location
       .toLowerCase()
       .includes(target.toLowerCase())
     )
   );

   if(m.length){

    this.ask(
     pid,
     m[0].id,
     payload.question||
     `What do you remember about ${target}?`
    );

    return;
   }
  }

  this.tick(1);

  const area=this.world[1].find(
   x=>
    x.toLowerCase()===
    target.toLowerCase()
  );

  const desc=area
   ?`You inspected ${area}. Movement, environmental and witness details can be cross-checked against the rest of the case.`
   :`You investigated ${target||a.location}. The result is a lead, not automatic proof.`;

  this.add({
   type:
    a.investigatorRole==="Forensic Analyst"
     ?"trace"
     :"observation",
   title:
    `Investigation: ${target||a.location}`,
   description:desc,
   reliability:60+Math.random()*27,
   source:a.name
  });

  this.event(
   "INVESTIGATION",
   `${a.name} investigated ${target||a.location}.`
  );

  this.emit();
 }


 accuse(pid,target){

  const a=this.get(pid);
  const x=this.get(target);

  if(
   !a||
   !x||
   !a.alive||
   this.caseClosed
  ){
   return;
  }

  this.event(
   "ACCUSATION",
   `${a.name} publicly accuses ${x.name}.`
  );

  if(x.id===this.truth.killerId){

   this.phase="ENDED";
   this.caseClosed=true;

   this.event(
    "VERDICT",
    `Correct. ${x.name} was the Killer.`
   );

   /*
    * In single-player, provide a little more resolution
    * after the correct accusation.
    */
   if(this.singlePlayer){

    this.event(
     "VERDICT",
     `The investigation reconstructed the hidden causal chain and identified the responsible character.`
    );
   }

  }else{

   this.add({
    type:"consequence",
    title:"False accusation",
    description:
     `The accusation did not match the hidden case truth. The investigation now carries a public contradiction.`,
    reliability:90,
    source:a.name
   });

   this.event(
    "VERDICT",
    "Incorrect. The real Killer remains hidden."
   );

   this.phase="INVESTIGATION";
  }

  this.emit();
 }


 async visual(pid,payload){

  const actor=this.get(pid);

  if(
   !actor||
   !actor.alive||
   this.caseClosed
  ){
   return;
  }

  const type=
   payload.type==="photo"
    ?"photo"
    :"cctv";

  const title=
   `${clean(payload.cameraId||"CAM-01",30)} // ${type.toUpperCase()} // ${this.clock()}`;

  if(ai){

   try{

    const r=await ai.images.generate({
     model:IMG,
     prompt:
      `Fictional non-graphic evidence image for a multiplayer or single-player mystery. Type: ${type==="photo"?"investigative scene photograph":"security camera still"}. Setting: ${this.world[0]}. Area: ${actor.location}. Time: ${this.clock()}. Realistic documentary evidence, imperfect lighting, subtle sensor noise, ambiguous details, no gore, no corpse, no real-person likeness, no logos, no readable real-world credentials. The image should look like imperfect evidence, not a cinematic poster.`,
     size:"1536x1024",
     quality:"medium"
    });

    const b=r.data?.[0]?.b64_json;

    if(b){

     const out={
      title,
      description:
       "Visual evidence generated from the live case state. It is an observation, not automatic truth.",
      reliability:
       type==="cctv"?75:65,
      image:
       `data:image/png;base64,${b}`
     };

     this.add({
      type:"visual",
      title,
      description:out.description,
      reliability:out.reliability,
      image:out.image,
      source:payload.cameraId||"CAM-01"
     });

     this.room.io
      .to(pid)
      .emit(
       "visualReady",
       out
      );

     this.emit();

     return;
    }

   }catch(e){}
  }

  const svg=
   `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">`+
   `<rect width="100%" height="100%" fill="#11151a"/>`+
   `<rect x="45" y="55" width="1110" height="590" fill="#20262d" stroke="#77808c"/>`+
   `<path d="M80 520L360 250L600 480L820 210L1120 500" fill="none" stroke="#58616c" stroke-width="9"/>`+
   `<circle cx="910" cy="340" r="36" fill="#68727e"/>`+
   `<text x="70" y="105" fill="#d9ff62" font-family="monospace" font-size="26">${clean(title,100).replace(/&/g,"&amp;").replace(/</g,"&lt;")}</text>`+
   `<text x="70" y="605" fill="#c0c6cf" font-family="monospace" font-size="19">FICTIONAL VISUAL EVIDENCE FALLBACK</text>`+
   `</svg>`;

  const out={
   title,
   description:
    "Visual evidence fallback. Live image generation is unavailable.",
   reliability:50,
   image:
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
  };

  this.add({
   type:"visual",
   title,
   description:out.description,
   reliability:50,
   image:out.image,
   source:payload.cameraId||"fallback"
  });

  this.room.io
   .to(pid)
   .emit(
    "visualReady",
    out
   );

  this.emit();
 }


 state(){

  return{
   caseId:this.seed.slice(0,10).toUpperCase(),

   world:{
    name:this.world[0],
    areas:this.world[1]
   },

   mode:this.mode,

   difficulty:this.difficulty,

   phase:this.phase,

   time:this.t,

   clock:this.clock(),

   people:this.people.map(
    p=>({
     id:p.id,
     name:p.name,
     isPlayer:p.isPlayer,
     job:p.job,
     investigatorRole:p.investigatorRole,
     location:p.location,
     alive:p.alive,
     suspicion:p.suspicion
    })
   ),

   evidence:this.evidence.filter(
    e=>e.visibility!=="hidden"
   ),

   events:this.events
    .filter(e=>!e.privateTo)
    .slice(-100)
  };
 }


 private(pid){

  const p=this.get(pid);

  if(!p)return{};

  const base={
   playerId:p.id,
   role:p.role,
   investigatorRole:p.investigatorRole,
   job:p.job,
   trait:p.trait,
   goal:p.goal,
   memory:p.memory.slice(-20),
   beliefs:p.beliefs.slice(-12),
   privateEvents:
    this.events
     .filter(e=>e.privateTo===pid)
     .slice(-10)
  };

  /*
   * Single-player investigator must never receive the
   * Killer's identity or hidden truth.
   */
  if(
   p.role==="KILLER"&&
   !this.singlePlayer
  ){

   return{
    ...base,
    objective:
     `You are the human Killer. Your motive pressure is ${this.truth.motive}. The AI never controls your speech or decisions. Commit the critical decision only when you choose.`
   };
  }

  if(
   p.role==="KILLER"&&
   this.singlePlayer
  ){

   /*
    * This should never be sent to the human because the AI
    * Killer is not the human player. It exists only for
    * internal safety if the method is called accidentally.
    */
   return{
    ...base,
    objective:
     "This character is an autonomous AI-controlled character."
   };
  }

  const r=ROLES.find(
   x=>x[0]===p.investigatorRole
  );

  return{
   ...base,
   objective:
    r
     ?`${r[1]} You can question NPCs and other human players. Their answers are their own.`
     :"Build a defensible case from evidence and contradictions.",
   specialties:r?r[2]:[],
   mode:this.mode,
   difficulty:this.difficulty
  };
 }


 emit(){

  this.room.io
   .to(this.room.code)
   .emit(
    "stateUpdate",
    this.state()
   );

  for(
   const p of this.room.players.values()
  ){

   /*
    * Only actual connected players receive private state.
    */
   this.room.io
    .to(p.id)
    .emit(
     "privateState",
     this.private(p.id)
    );
  }
 }
}


class GameRoom{

 constructor(code,io){
  this.code=code;
  this.io=io;
  this.players=new Map();
  this.hostId=null;
  this.started=false;
  this.sim=null;
  this.mode="MULTIPLAYER";
  this.singlePlayer=false;
 }


 addPlayer(s,name){

  const safe=
   clean(name,24).trim()||
   "Player";

  this.players.set(
   s.id,
   {
    id:s.id,
    name:safe
   }
  );

  if(!this.hostId)
   this.hostId=s.id;

  s.join(this.code);

  s.emit(
   "roomJoined",
   {
    code:this.code,
    host:this.hostId===s.id,
    mode:this.mode
   }
  );

  this.lobby();
 }


 lobby(){

  this.io
   .to(this.code)
   .emit(
    "lobby",
    {
     code:this.code,
     hostId:this.hostId,
     mode:this.mode,
     players:[
      ...this.players.values()
     ].map(
      p=>({
       name:p.name,
       host:p.id===this.hostId
      })
     )
    }
   );
 }


 async start(){

  if(
   this.started||
   this.players.size<2
  ){
   return;
  }

  this.started=true;

  this.mode="MULTIPLAYER";
  this.singlePlayer=false;

  this.sim=new Sim(
   [...this.players.values()],
   this,
   {
    mode:"MULTIPLAYER"
   }
  );

  this.io
   .to(this.code)
   .emit(
    "caseStarted",
    {
     public:this.sim.state()
    }
   );

  this.sim.emit();
 }


 async startSinglePlayer(options={}){

  if(
   this.started||
   this.players.size!==1
  ){
   return;
  }

  this.started=true;

  this.mode="SINGLE_PLAYER";
  this.singlePlayer=true;

  this.sim=new Sim(
   [...this.players.values()],
   this,
   {
    mode:"SINGLE_PLAYER",
    investigatorRole:
     options.investigatorRole||"",
    difficulty:
     options.difficulty||"DETECTIVE"
   }
  );

  const playerId=
   this.players.keys().next().value;

  this.io
   .to(this.code)
   .emit(
    "caseStarted",
    {
     public:this.sim.state()
    }
   );

  this.io
   .to(playerId)
   .emit(
    "privateRole",
    this.sim.private(playerId)
   );

  this.sim.emit();
 }


 async action(id,a){

  if(this.sim)
   await this.sim.action(id,a);
 }


 killerDecision(id){

  if(this.sim)
   this.sim.killerDecision(id);
 }


 investigate(id,p){

  if(this.sim)
   this.sim.investigate(
    id,
    p||{}
   );
 }


 ask(id,p){

  if(this.sim)
   this.sim.ask(
    id,
    p?.targetId,
    p?.question
   );
 }


 answer(id,p){

  if(this.sim)
   this.sim.answer(
    id,
    p?.questionId,
    p?.answer
   );
 }


 accuse(id,t){

  if(this.sim)
   this.sim.accuse(id,t);
 }


 visual(id,p){

  if(this.sim)
   this.sim.visual(
    id,
    p||{}
   );
 }


 chat(id,t){

  const p=this.players.get(id);

  if(
   p&&
   String(t||"").trim()
  ){

   this.io
    .to(this.code)
    .emit(
     "chat",
     {
      name:p.name,
      text:clean(t,800)
     }
    );
  }
 }


 remove(id){

  this.players.delete(id);

  if(this.hostId===id){

   this.hostId=
    this.players
     .keys()
     .next()
     .value||null;
  }

  if(!this.started)
   this.lobby();
 }
}


module.exports={GameRoom};
