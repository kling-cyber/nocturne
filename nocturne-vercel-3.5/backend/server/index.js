require("dotenv").config();

const path=require("path");
const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const {GameRoom}=require("./game");
const visualBatch=require("./visual-batch");
const roleSystem=require("./role-system");
roleSystem.installRoomStart(GameRoom);

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
app.get("/health",(req,res)=>res.json({ok:true,service:"nocturne",version:"4.0.2",rooms:rooms.size}));

function roomCode(){let code;do{code=Array.from({length:4},()=>ROOM_ALPHABET[Math.floor(Math.random()*ROOM_ALPHABET.length)]).join("");}while(rooms.has(code));return code;}
function findRoom(socket){for(const room of rooms.values())if(room.players.has(socket.id))return room;return null;}

io.on("connection",socket=>{
  socket.on("createRoom",payload=>{const name=clean(payload?.name,24);if(!validName(name))return fail(socket,"Choose a name between 1 and 24 characters.");const code=roomCode();const room=new GameRoom(code,io);rooms.set(code,room);room.addPlayer(socket,name);});
  socket.on("joinRoom",payload=>{const code=clean(payload?.code,4).toUpperCase();const name=clean(payload?.name,24);if(!validRoomCode(code))return fail(socket,"Enter a valid 4-character room code.");if(!validName(name))return fail(socket,"Choose a name between 1 and 24 characters.");const room=rooms.get(code);if(!room)return fail(socket,"Room not found.");if(room.started)return fail(socket,"Case already started.");if(room.players.size>=8)return fail(socket,"Room full.");room.addPlayer(socket,name);});
  socket.on("launchCase",async()=>{const room=findRoom(socket);if(!room)return fail(socket,"You are not in a case room.");if(room.mode==="SINGLE_PLAYER")return fail(socket,"Single-player cases start automatically.");if(room.hostId!==socket.id)return fail(socket,"Only the case host can start the case.");if(room.players.size<2)return fail(socket,"At least 2 players are required.");try{await room.start();}catch(error){console.error("[NOCTURNE] Multiplayer start error:",error);fail(socket,"Unable to start the multiplayer case.");}});
  socket.on("createSinglePlayer",async payload=>{const name=clean(payload?.name,24);if(!validName(name))return fail(socket,"Choose a name between 1 and 24 characters.");const investigatorRole=clean(payload?.investigatorRole,60);const difficulty=clean(payload?.difficulty,30).toUpperCase();const code=roomCode();const room=new GameRoom(code,io);room.mode="SINGLE_PLAYER";room.singlePlayer=true;rooms.set(code,room);try{if(typeof room.startSinglePlayer!=="function"){rooms.delete(code);return fail(socket,"Single-player mode is not available in this server build yet.");}await room.startSinglePlayer(socket,{name,requestedInvestigatorRole:investigatorRole,difficulty});}catch(error){console.error("[NOCTURNE] Single-player start error:",error);rooms.delete(code);fail(socket,"Unable to start the single-player case.");}});
  socket.on("playerAction",async payload=>{const room=findRoom(socket);if(room)await room.action(socket.id,clean(payload?.action,600));else fail(socket,"You are not in a case room.");});
  socket.on("killerDecision",()=>{const room=findRoom(socket);if(room)room.killerDecision(socket.id);});
  socket.on("roleAction",payload=>{const room=findRoom(socket);if(room?.sim)room.sim.roleAction(socket.id,clean(payload?.action,300));});
  socket.on("investigate",payload=>{const room=findRoom(socket);if(room)room.investigate(socket.id,{target:clean(payload?.target,180),mode:payload?.mode,question:clean(payload?.question,400)});});
  socket.on("askQuestion",payload=>{const room=findRoom(socket);if(room)room.ask(socket.id,{targetId:clean(payload?.targetId,100),question:clean(payload?.question,400)});});
  socket.on("answerQuestion",payload=>{const room=findRoom(socket);if(room)room.answer(socket.id,{questionId:clean(payload?.questionId,100),answer:clean(payload?.answer,700)});});
  socket.on("accuse",payload=>{const room=findRoom(socket);if(room)room.accuse(socket.id,clean(payload?.targetId,100));});

  socket.on("requestVisual",async payload=>{
    const room=findRoom(socket);if(!room||!room.sim)return;
    const actor=room.sim.get(socket.id);if(!actor||!actor.alive||room.sim.caseClosed)return;
    const result=await visualBatch.directRequest(room.sim,socket.id,{type:payload?.type,cameraId:clean(payload?.cameraId,30)});
    if(result?.error)return fail(socket,result.error);
    const asset=result.asset;
    const title=asset.cameraId+' // '+asset.kind.toUpperCase()+' // '+asset.clock;
    const description=asset.kind==='cctv'?'Directly generated CCTV evidence from '+asset.area+'. The image was generated on demand by the local GPU.':'Directly generated investigative scene photograph from '+asset.area+'. It is an observation, not automatic truth.';
    room.sim.add({type:'visual',title,description,reliability:asset.kind==='cctv'?75:65,source:asset.cameraId,visualAssetId:asset.id,image:asset.image});
    room.sim.event('VISUAL',actor.name+' generated '+asset.kind.toUpperCase()+' evidence from '+asset.cameraId+'.');
    socket.emit('visualReady',{title,description,reliability:asset.kind==='cctv'?75:65,image:asset.image});
    room.sim.emit();
  });

  socket.on("chat",payload=>{const room=findRoom(socket);if(room)room.chat(socket.id,clean(payload?.text,800));});
  socket.on("disconnect",()=>{const room=findRoom(socket);if(!room)return;room.remove(socket.id);if(room.players.size===0)rooms.delete(room.code);});
});

server.listen(PORT,()=>console.log(`NOCTURNE 4.0.2 online server listening on port ${PORT}`));