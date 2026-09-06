require("dotenv").config();
const path=require("path");
const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const {GameRoom}=require("./game");
const visualBatch=require("./visual-batch");
const roleSystem=require("./role-system");

if(!GameRoom.prototype.__nocturneRoleBootstrapPatched){
  GameRoom.prototype.__nocturneRoleBootstrapPatched=true;
  const originalStart=GameRoom.prototype.start;
  GameRoom.prototype.start=async function(...args){
    let current=this.sim;
    const hadOwn=Object.prototype.hasOwnProperty.call(this,"sim");
    const previousDescriptor=Object.getOwnPropertyDescriptor(this,"sim");
    Object.defineProperty(this,"sim",{configurable:true,enumerable:previousDescriptor?.enumerable??true,get(){return current;},set(value){current=value;if(value&&!value.singlePlayer){try{roleSystem.install(this);}catch(error){console.error("[NOCTURNE] Role bootstrap error:",error);}}}});
    try{return await originalStart.apply(this,args);}finally{const finalSim=current;delete this.sim;if(hadOwn&&previousDescriptor)Object.defineProperty(this,"sim",{...previousDescriptor,value:finalSim});else Object.defineProperty(this,"sim",{configurable:true,enumerable:true,writable:true,value:finalSim});}
  };
}

const app=express();
const server=http.createServer(app);
const allowedOrigins=(process.env.FRONTEND_URL||"").split(",").map(x=>x.trim()).filter(Boolean);
const io=new Server(server,{cors:{origin:(origin,cb)=>{if(!origin||allowedOrigins.length===0||allowedOrigins.includes(origin))return cb(null,true);cb(new Error("Origin not allowed"));},credentials:false},maxHttpBufferSize:5e6});
const PORT=Number(process.env.PORT||3000);
const rooms=new Map();
const ROOM_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const clean=(v,n)=>String(v??"").replace(/[\u0000-\u001F\u007F]/g,"").trim().slice(0,n);
const validName=name=>/^[^<>]{1,24}$/.test(name);
const validRoomCode=code=>/^[A-Z2-9]{4}$/.test(code);
function fail(socket,message){socket.emit("errorMessage",message);}
app.disable("x-powered-by");
app.use(express.static(path.join(__dirname,"..","public"),{etag:true,maxAge:process.env.NODE_ENV==="production"?"1h":0}));
app.get("/health",(req,res)=>res.json({ok:true,service:"nocturne",version:"4.1.4",rooms:rooms.size}));
function roomCode(){let code;do{code=Array.from({length:4},()=>ROOM_ALPHABET[Math.floor(Math.random()*ROOM_ALPHABET.length)]).join("");}while(rooms.has(code));return code;}
function findRoom(socket){for(const room of rooms.values())if(room.players.has(socket.id))return room;return null;}

io.on("connection",socket=>{
  console.log("[NOCTURNE] socket connected",socket.id);
  socket.on("createRoom",payload=>{const name=clean(payload?.name,24);if(!validName(name))return fail(socket,"Choose a name between 1 and 24 characters.");const code=roomCode();const room=new GameRoom(code,io);rooms.set(code,room);room.addPlayer(socket,name);});
  socket.on("joinRoom",payload=>{const code=clean(payload?.code,4).toUpperCase();const name=clean(payload?.name,24);if(!validRoomCode(code))return fail(socket,"Enter a valid 4-character room code.");if(!validName(name))return fail(socket,"Choose a name between 1 and 24 characters.");const room=rooms.get(code);if(!room)return fail(socket,"Room not found.");if(room.started)return fail(socket,"Case already started.");if(room.players.size>=8)return fail(socket,"Room full.");room.addPlayer(socket,name);});
  socket.on("launchCase",async()=>{const room=findRoom(socket);if(!room)return fail(socket,"You are not in a case room.");if(room.mode==="SINGLE_PLAYER")return fail(socket,"Single-player cases start automatically.");if(room.hostId!==socket.id)return fail(socket,"Only the case host can start the case.");if(room.players.size<2)return fail(socket,"At least 2 human players are required for Multiplayer. Use Single Player for solo play.");try{await room.start();if(typeof room.sim?.roleAction!=="function")roleSystem.install(room);if(typeof room.sim?.roleAction!=="function")throw new Error("Role action handler was not installed after multiplayer start");console.log("[NOCTURNE] multiplayer role system ready",room.code);}catch(error){console.error("[NOCTURNE] Multiplayer start error:",error);fail(socket,"Unable to start the multiplayer case.");}});
  socket.on("createSinglePlayer",async payload=>{const name=clean(payload?.name,24);if(!validName(name))return fail(socket,"Choose a name between 1 and 24 characters.");const investigatorRole=clean(payload?.investigatorRole,60);const difficulty=clean(payload?.difficulty,30).toUpperCase();const code=roomCode();const room=new GameRoom(code,io);room.mode="SINGLE_PLAYER";room.singlePlayer=true;rooms.set(code,room);try{if(typeof room.startSinglePlayer!=="function"){rooms.delete(code);return fail(socket,"Single-player mode is not available in this server build yet.");}await room.startSinglePlayer(socket,{name,requestedInvestigatorRole:investigatorRole,difficulty});}catch(error){console.error("[NOCTURNE] Single-player start error:",error);rooms.delete(code);fail(socket,"Unable to start the single-player case.");}});
  socket.on("playerAction",async payload=>{const room=findRoom(socket);if(room)await room.action(socket.id,clean(payload?.action,600));else fail(socket,"You are not in a case room.");});
  socket.on("killerDecision",()=>{const room=findRoom(socket);if(room)room.killerDecision(socket.id);});

  socket.on("roleAction",payload=>{
    const room=findRoom(socket);
    const action=clean(payload?.action,300);
    console.log("[NOCTURNE] roleAction received",socket.id,JSON.stringify(action),room?.code||"NO_ROOM");
    if(!room?.sim)return fail(socket,"Your case session is no longer active. Please reconnect to the room.");
    if(!action)return fail(socket,"Choose a role ability first.");
    try{
      if(room.mode==="SINGLE_PLAYER")return fail(socket,"Human role abilities are available in multiplayer cases.");
      if(typeof room.sim.roleAction!=="function"){
        room.sim.__nocturneRolesInstalled=false;
        roleSystem.install(room);
      }
      if(typeof room.sim.roleAction!=="function"){
        console.error("[NOCTURNE] roleAction missing after install",room.code,room.sim?.phase,room.sim?.people?.length);
        return fail(socket,"Role abilities are unavailable in this case. The server could not install the role controller.");
      }
      const actor=room.sim.get(socket.id);
      if(!actor)return fail(socket,"Your player character could not be found in this case.");
      if(!actor.alive)return fail(socket,"Your character is no longer active.");
      const beforeEvidence=room.sim.evidence.length;
      const beforeEvents=room.sim.events.length;
      const result=room.sim.roleAction(socket.id,action);
      if(!result||typeof result!="object"){
        console.error("[NOCTURNE] roleAction returned no result",room.code,actor.name,action);
        socket.emit("roleActionResult",{ok:false,action,message:"The role ability did not return a result from the case engine."});
        return;
      }
      if(result.ok){
        const newEvidence=room.sim.evidence.slice(beforeEvidence);
        const newEvents=room.sim.events.slice(beforeEvents);
        if(newEvidence.length===0&&newEvents.length===0){
          room.sim.add({type:"role-action",title:result.title||"Role ability completed",description:result.description||`${actor.name} completed ${action}.`,reliability:70,source:actor.name,visibility:"public"});
          room.sim.event("ROLE",`${actor.name} used ${action}.`);
        }
        if(typeof room.sim.emit==="function")room.sim.emit();
        socket.emit("roleActionResult",{...result,action,evidenceCreated:room.sim.evidence.length>beforeEvidence,eventCreated:room.sim.events.length>beforeEvents,evidence:room.sim.evidence.slice(beforeEvidence).slice(-3),events:room.sim.events.slice(beforeEvents).slice(-3)});
        console.log("[NOCTURNE] roleAction success",room.code,actor.name,action,"evidence",room.sim.evidence.length-beforeEvidence,"events",room.sim.events.length-beforeEvents);
      }else{
        socket.emit("roleActionResult",{...result,ok:false,action});
      }
    }catch(error){
      console.error("[NOCTURNE] Role action error:",error);
      socket.emit("roleActionResult",{ok:false,action,message:"The role ability could not be resolved: "+clean(error?.message||error,220)});
      fail(socket,"The role ability could not be resolved. Please try again.");
    }
  });

  socket.on("investigate",payload=>{const room=findRoom(socket);if(room)room.investigate(socket.id,{target:clean(payload?.target,180),mode:payload?.mode,question:clean(payload?.question,400)});});
  socket.on("askQuestion",payload=>{const room=findRoom(socket);if(room)room.ask(socket.id,{targetId:clean(payload?.targetId,100),question:clean(payload?.question,400)});});
  socket.on("answerQuestion",payload=>{const room=findRoom(socket);if(room)room.answer(socket.id,{questionId:clean(payload?.questionId,100),answer:clean(payload?.answer,700)});});
  socket.on("accuse",payload=>{const room=findRoom(socket);if(room)room.accuse(socket.id,clean(payload?.targetId,100));});
  socket.on("requestVisual",async payload=>{const room=findRoom(socket);if(!room||!room.sim)return;const actor=room.sim.get(socket.id);if(!actor||!actor.alive||room.sim.caseClosed)return;const result=await visualBatch.directRequest(room.sim,socket.id,{type:payload?.type,cameraId:clean(payload?.cameraId,30)});if(result?.error)return fail(socket,result.error);const asset=result.asset;const title=asset.cameraId+' // '+asset.kind.toUpperCase()+' // '+asset.clock;const description=asset.kind==='cctv'?`Directly generated CCTV evidence from ${asset.area} at ${asset.clock}. The frame captures ordinary movement, occupancy, spatial relationships and environmental detail from a fixed security-camera viewpoint. Treat visible people as observations of presence and movement only, not proof of identity or intent. Compare entrances, exits, timing, occlusion and repeated appearances against testimony and access records. Limitations include camera blind spots, compression, lighting, reflections and partial views.`:`Directly generated investigative scene photograph from ${asset.area} at ${asset.clock}. The photograph records physical layout, environmental condition and a subtle observation selected for cross-reference. Separate what is visibly present from what you infer about it, then compare the scene with timeline, movement and testimony evidence. Limitations include angle, lighting, prior disturbance and the possibility of innocent explanations.`;room.sim.add({type:'visual',title,description,reliability:asset.kind==='cctv'?75:65,source:asset.cameraId,visualAssetId:asset.id,image:asset.image,area:asset.area,captureClock:asset.clock});room.sim.event('VISUAL',actor.name+' generated '+asset.kind.toUpperCase()+' evidence from '+asset.cameraId+'.');socket.emit('visualReady',{title,description,reliability:asset.kind==='cctv'?75:65,image:asset.image});room.sim.emit();});
  socket.on("chat",payload=>{const room=findRoom(socket);if(room)room.chat(socket.id,clean(payload?.text,800));});
  socket.on("disconnect",()=>{console.log("[NOCTURNE] socket disconnected",socket.id);const room=findRoom(socket);if(!room)return;room.remove(socket.id);if(room.players.size===0)rooms.delete(room.code);});
});
server.listen(PORT,()=>console.log(`NOCTURNE 4.1.4 online server listening on port ${PORT}`));
