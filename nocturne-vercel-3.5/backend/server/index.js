require("dotenv").config();

const path=require("path");
const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const {GameRoom}=require("./game");

const app=express();
const server=http.createServer(app);

const allowedOrigins=(process.env.FRONTEND_URL||"")
  .split(",")
  .map(x=>x.trim())
  .filter(Boolean);

const io=new Server(server,{
  cors:{
    origin:(origin,cb)=>{
      if(
        !origin ||
        allowedOrigins.length===0 ||
        allowedOrigins.includes(origin)
      ){
        return cb(null,true);
      }

      cb(new Error("Origin not allowed"));
    },

    credentials:false
  },

  maxHttpBufferSize:1e6
});

const PORT=Number(
  process.env.PORT||3000
);

const rooms=new Map();

const ROOM_ALPHABET=
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


/* =========================================================
   HELPERS
   ========================================================= */

const clean=(v,n)=>
  String(v??"")
    .replace(/[\u0000-\u001F\u007F]/g,"")
    .trim()
    .slice(0,n);

const validName=name=>
  /^[^<>]{1,24}$/.test(name);

const validRoomCode=code=>
  /^[A-Z2-9]{4}$/.test(code);

function fail(socket,message){
  socket.emit(
    "errorMessage",
    message
  );
}


/* =========================================================
   EXPRESS
   ========================================================= */

app.disable("x-powered-by");

app.use(
  express.static(
    path.join(
      __dirname,
      "..",
      "public"
    ),
    {
      etag:true,

      maxAge:
        process.env.NODE_ENV==="production"
          ?"1h"
          :0
    }
  )
);


app.get(
  "/health",
  (req,res)=>{
    res.json({
      ok:true,
      service:"nocturne",
      version:"4.0.1",
      rooms:rooms.size
    });
  }
);


/* =========================================================
   ROOM CODE
   ========================================================= */

function roomCode(){

  let code;

  do{

    code=Array.from(
      {length:4},
      ()=>{
        return ROOM_ALPHABET[
          Math.floor(
            Math.random()*
            ROOM_ALPHABET.length
          )
        ];
      }
    ).join("");

  }while(
    rooms.has(code)
  );

  return code;
}


/* =========================================================
   FIND ROOM
   ========================================================= */

function findRoom(socket){

  for(
    const room of rooms.values()
  ){

    if(
      room.players.has(
        socket.id
      )
    ){
      return room;
    }
  }

  return null;
}


/* =========================================================
   SOCKET CONNECTION
   ========================================================= */

io.on(
  "connection",
  socket=>{


    /* =====================================================
       MULTIPLAYER
       ===================================================== */


    socket.on(
      "createRoom",
      payload=>{

        const name=clean(
          payload?.name,
          24
        );

        if(
          !validName(name)
        ){
          return fail(
            socket,
            "Choose a name between 1 and 24 characters."
          );
        }

        const code=roomCode();

        const room=
          new GameRoom(
            code,
            io
          );

        rooms.set(
          code,
          room
        );

        room.addPlayer(
          socket,
          name
        );
      }
    );


    socket.on(
      "joinRoom",
      payload=>{

        const code=
          clean(
            payload?.code,
            4
          ).toUpperCase();

        const name=
          clean(
            payload?.name,
            24
          );


        if(
          !validRoomCode(code)
        ){
          return fail(
            socket,
            "Enter a valid 4-character room code."
          );
        }


        if(
          !validName(name)
        ){
          return fail(
            socket,
            "Choose a name between 1 and 24 characters."
          );
        }


        const room=
          rooms.get(code);


        if(!room){
          return fail(
            socket,
            "Room not found."
          );
        }


        if(room.started){
          return fail(
            socket,
            "Case already started."
          );
        }


        if(
          room.players.size>=8
        ){
          return fail(
            socket,
            "Room full."
          );
        }


        room.addPlayer(
          socket,
          name
        );
      }
    );


    socket.on(
      "launchCase",
      async()=>{
      
        const room=
          findRoom(socket);


        if(!room){
          return fail(
            socket,
            "You are not in a case room."
          );
        }


        if(
          room.mode==="SINGLE_PLAYER"
        ){
          return fail(
            socket,
            "Single-player cases start automatically."
          );
        }


        if(
          room.hostId!==socket.id
        ){
          return fail(
            socket,
            "Only the case host can start the case."
          );
        }


        if(
          room.players.size<2
        ){
          return fail(
            socket,
            "At least 2 players are required."
          );
        }


        try{

          await room.start();

        }catch(error){

          console.error(
            "[NOCTURNE] Multiplayer start error:",
            error
          );

          fail(
            socket,
            "Unable to start the multiplayer case."
          );
        }
      }
    );


    /* =====================================================
       SINGLE PLAYER
       =====================================================

       IMPORTANT:

       GameRoom.startSinglePlayer()
       expects:

       startSinglePlayer(
         socket,
         {
           name,
           requestedInvestigatorRole,
           difficulty
         }
       )

       The old code incorrectly called:

       startSinglePlayer({
         investigatorRole,
         difficulty
       })

       which caused the server to treat the options
       object as the socket.

       This is the corrected call.
       ===================================================== */


    socket.on(
      "createSinglePlayer",
      async payload=>{

        const name=
          clean(
            payload?.name,
            24
          );


        if(
          !validName(name)
        ){
          return fail(
            socket,
            "Choose a name between 1 and 24 characters."
          );
        }


        const investigatorRole=
          clean(
            payload?.investigatorRole,
            60
          );


        const difficulty=
          clean(
            payload?.difficulty,
            30
          ).toUpperCase();


        /*
         * Create a dedicated room for this
         * single-player case.
         */

        const code=
          roomCode();


        const room=
          new GameRoom(
            code,
            io
          );


        /*
         * Mark this room as single-player.
         */

        room.mode=
          "SINGLE_PLAYER";

        room.singlePlayer=
          true;


        rooms.set(
          code,
          room
        );


        try{

          /*
           * IMPORTANT:
           *
           * Do NOT call addPlayer() here.
           *
           * startSinglePlayer() already:
           *
           * 1. Creates the human player
           * 2. Adds the player to the room
           * 3. Sets the host
           * 4. Joins the Socket.IO room
           * 5. Creates the simulation
           * 6. Starts the case
           */

          if(
            typeof room.startSinglePlayer
            !==
            "function"
          ){

            rooms.delete(
              code
            );

            return fail(
              socket,
              "Single-player mode is not available in this server build yet."
            );
          }


          /*
           * CORRECT CALL
           */

          await room.startSinglePlayer(
            socket,
            {
              name:name,

              requestedInvestigatorRole:
                investigatorRole,

              difficulty:
                difficulty
            }
          );


        }catch(error){

          console.error(
            "[NOCTURNE] Single-player start error:",
            error
          );


          rooms.delete(
            code
          );


          fail(
            socket,
            "Unable to start the single-player case."
          );
        }
      }
    );


    /* =====================================================
       PLAYER ACTION
       ===================================================== */

    socket.on(
      "playerAction",
      async payload=>{

        const room=
          findRoom(socket);


        if(room){

          await room.action(
            socket.id,

            clean(
              payload?.action,
              600
            )
          );

        }else{

          fail(
            socket,
            "You are not in a case room."
          );
        }
      }
    );


    /* =====================================================
       KILLER DECISION
       ===================================================== */

    socket.on(
      "killerDecision",
      ()=>{

        const room=
          findRoom(socket);


        if(room){

          room.killerDecision(
            socket.id
          );
        }
      }
    );


    /* =====================================================
       INVESTIGATION
       ===================================================== */

    socket.on(
      "investigate",
      payload=>{

        const room=
          findRoom(socket);


        if(room){

          room.investigate(
            socket.id,
            {
              target:
                clean(
                  payload?.target,
                  180
                ),

              mode:
                payload?.mode,

              question:
                clean(
                  payload?.question,
                  400
                )
            }
          );
        }
      }
    );


    /* =====================================================
       ASK QUESTION
       ===================================================== */

    socket.on(
      "askQuestion",
      payload=>{

        const room=
          findRoom(socket);


        if(room){

          room.ask(
            socket.id,
            {
              targetId:
                clean(
                  payload?.targetId,
                  100
                ),

              question:
                clean(
                  payload?.question,
                  400
                )
            }
          );
        }
      }
    );


    /* =====================================================
       ANSWER QUESTION
       ===================================================== */

    socket.on(
      "answerQuestion",
      payload=>{

        const room=
          findRoom(socket);


        if(room){

          room.answer(
            socket.id,
            {
              questionId:
                clean(
                  payload?.questionId,
                  100
                ),

              answer:
                clean(
                  payload?.answer,
                  700
                )
            }
          );
        }
      }
    );


    /* =====================================================
       ACCUSE
       ===================================================== */

    socket.on(
      "accuse",
      payload=>{

        const room=
          findRoom(socket);


        if(room){

          room.accuse(
            socket.id,

            clean(
              payload?.targetId,
              100
            )
          );
        }
      }
    );


    /* =====================================================
       VISUAL EVIDENCE
       ===================================================== */

    socket.on(
      "requestVisual",
      async payload=>{

        const room=
          findRoom(socket);


        if(room){

          await room.visual(
            socket.id,
            {
              type:
                payload?.type,

              cameraId:
                clean(
                  payload?.cameraId,
                  30
                )
            }
          );
        }
      }
    );


    /* =====================================================
       CHAT
       ===================================================== */

    socket.on(
      "chat",
      payload=>{

        const room=
          findRoom(socket);


        if(room){

          room.chat(
            socket.id,

            clean(
              payload?.text,
              800
            )
          );
        }
      }
    );


    /* =====================================================
       DISCONNECT
       ===================================================== */

    socket.on(
      "disconnect",
      ()=>{

        const room=
          findRoom(socket);


        if(!room){
          return;
        }


        room.remove(
          socket.id
        );


        /*
         * Delete empty rooms.
         */

        if(
          room.players.size===0
        ){

          rooms.delete(
            room.code
          );
        }
      }
    );

  }
);


/* =========================================================
   SERVER
   ========================================================= */

server.listen(
  PORT,
  ()=>{
    console.log(
      `NOCTURNE 4.0.1 online server listening on port ${PORT}`
    );
  }
);
