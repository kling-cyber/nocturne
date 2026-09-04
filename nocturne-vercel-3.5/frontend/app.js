const SOCKET_URL=(window.NOCTURNE_SERVER_URL||"").trim().replace(/\/$/,"");
const sock=io(SOCKET_URL||undefined,{transports:["websocket","polling"],withCredentials:false});

let S=null,me=null,setupMode="create",activeTab="act",busy=false,incomingQ=null;

const $=id=>document.getElementById(id);

function openAbout(){
  $('aboutModal')?.classList.remove('hide');
  document.body.classList.add('aboutOpen');
}

function closeAbout(){
  $('aboutModal')?.classList.add('hide');
  document.body.classList.remove('aboutOpen');
}

const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
}[c]));

const js=x=>String(x??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");

function show(id){
  ["landing","lobby","singleSetup","game"].forEach(x=>{
    $(x)?.classList.toggle("hide",x!==id);
  });
  window.scrollTo(0,0);
}

function toast(t){
  if(!$('toast'))return;
  $('toast').innerHTML=`<div class="toast">${esc(t)}</div>`;
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>$('toast').innerHTML="",2800);
}

function setBusy(on,text="Working…"){
  busy=on;
  $('busyText').textContent=text;
  $('busy').classList.toggle('hide',!on);
}


/* =========================================================
   SETUP
   ========================================================= */

function openSetup(mode){

  setupMode=mode;

  if(mode==='single'){
    show('singleSetup');

    setTimeout(()=>{
      $('singleNameInput')?.focus();
    },50);

    return;
  }

  $('modalTitle').textContent=
    mode==='create'
      ?'Create a new case'
      :'Join a case';

  $('modalText').textContent=
    mode==='create'
      ?'Create a private room, then share its four-character code with your players.'
      :'Enter the room code shared by the host.';

  $('codeLabel').classList.toggle('hide',mode!=='join');

  $('modalGo').textContent=
    mode==='create'
      ?'CREATE ROOM'
      :'JOIN ROOM';

  $('modal').classList.remove('hide');

  setTimeout(()=>{
    $('nameInput').focus();
  },50);
}


function closeModal(){
  $('modal').classList.add('hide');
}


function startSinglePlayer(){

  const name=
    $('singleNameInput')?.value.trim()||'Player';

  if(name.length>24){
    return toast('Name must be 24 characters or fewer.');
  }

  const investigatorRole=
    $('singleRoleInput')?.value||
    'Lead Detective';

  const difficulty=
    $('difficultyInput')?.value||
    'DETECTIVE';

  window.NOCTURNE_NAME=name;
  window.NOCTURNE_MODE='SINGLE_PLAYER';
  window.NOCTURNE_DIFFICULTY=difficulty;
  window.NOCTURNE_INVESTIGATOR_ROLE=investigatorRole;

  setBusy(
    true,
    'Generating your case, cast, secrets and hidden truth…'
  );

  sock.emit('createSinglePlayer',{
    name,
    investigatorRole,
    difficulty
  });
}


function submitSetup(){

  const name=
    $('nameInput').value.trim()||'Player';

  if(name.length>24){
    return toast('Name must be 24 characters or fewer.');
  }

  window.NOCTURNE_NAME=name;

  if(setupMode==='create'){

    window.NOCTURNE_MODE='MULTIPLAYER';

    sock.emit('createRoom',{name});

  }else{

    const code=
      $('codeInput').value.trim().toUpperCase();

    if(!/^[A-Z2-9]{4}$/.test(code)){
      return toast('Enter the 4-character room code.');
    }

    window.NOCTURNE_MODE='MULTIPLAYER';

    sock.emit('joinRoom',{
      code,
      name
    });
  }

  closeModal();

  setBusy(
    true,
    'Connecting to case room…'
  );
}


/* =========================================================
   LOBBY
   ========================================================= */

function copyCode(){

  const v=$('code').textContent;

  if(navigator.clipboard?.writeText){

    navigator.clipboard
      .writeText(v)
      .then(()=>toast('Room code copied.'))
      .catch(()=>toast('Room code: '+v));

  }else{

    toast('Room code: '+v);
  }
}


function launchCase(){

  setBusy(
    true,
    'Generating the world, cast, secrets and timeline…'
  );

  sock.emit('launchCase');
}


/* =========================================================
   GAME HELPERS
   ========================================================= */

function toggleSide(){
  $('leftSide').classList.toggle('open');
}

function scrollFeed(){
  $('events').scrollTop=0;
}

function currentPlayerId(){

  return me?.playerId||
    S?.people?.find(
      p=>p.isPlayer&&p.name===window.NOCTURNE_NAME
    )?.id||
    null;
}


/* =========================================================
   SOCKET CONNECTION
   ========================================================= */

sock.on('connect',()=>{

  $('conn').textContent='ONLINE';

  $('connection').classList.add('online');

  $('conn').style.color='var(--ok)';
});


sock.on('disconnect',()=>{

  $('conn').textContent='OFFLINE';

  $('connection').classList.remove('online');

  $('conn').style.color='var(--danger)';

  setBusy(false);

  toast('Connection lost. Trying to reconnect…');
});


/* =========================================================
   ROOM EVENTS
   ========================================================= */

sock.on('roomJoined',d=>{

  setBusy(false);

  show('lobby');

  $('code').textContent=d.code;

  window.NOCTURNE_HOST=!!d.host;

  window.NOCTURNE_MODE='MULTIPLAYER';
});


sock.on('lobby',d=>{

  const n=d.players.length;

  $('code').textContent=d.code;

  $('playerCount').textContent=`${n} / 8`;

  $('players').innerHTML=d.players.map(p=>`
    <div class="person">
      <span>${p.host?'CASE HOST':'PLAYER'}</span>
      <b>${esc(p.name)}</b>
    </div>
  `).join('');

  const b=$('launch');

  b.style.display=
    window.NOCTURNE_HOST
      ?'block'
      :'none';

  b.disabled=n<2;

  $('launchHint').textContent=
    n<2
      ?'At least 2 players are required.'
      :'Everyone is in. The host can begin.';
});


sock.on('errorMessage',x=>{

  setBusy(false);

  toast(x);
});


/* =========================================================
   CASE START
   ========================================================= */

sock.on('caseStarted',d=>{

  S=d.public;

  setBusy(false);

  show('game');

  render();
});


sock.on('privateRole',d=>{

  me=d;

  renderPrivate();
});


sock.on('privateState',d=>{

  me=d;

  renderPrivate();
});


sock.on('stateUpdate',d=>{

  S=d;

  render();
});


/* =========================================================
   CHAT
   ========================================================= */

sock.on('chat',d=>{

  addChat(
    d.name,
    d.text
  );
});


/* =========================================================
   VISUAL EVIDENCE
   ========================================================= */

sock.on('visualReady',d=>{

  setBusy(false);

  showVisual(d);
});


/* =========================================================
   QUESTIONS
   ========================================================= */

sock.on('incomingQuestion',d=>{

  incomingQ=d;

  $('qFrom').textContent=
    `${d.from} asks:`;

  $('qText').textContent=
    d.question;

  $('answerInput').value='';

  $('questionModal')
    .classList
    .remove('hide');

  setTimeout(()=>{
    $('answerInput').focus();
  },50);
});


sock.on('questionPending',d=>{

  setBusy(false);

  toast(
    `Question sent to ${d.target}. Waiting for their answer.`
  );
});


sock.on('questionAnswer',d=>{

  setBusy(false);

  toast(
    `Statement received from ${d.target}.`
  );

  tab('evidence');
});


/* =========================================================
   PRIVATE ROLE / MEMORY
   ========================================================= */

function renderPrivate(){

  if(!me)return;

  $('role').textContent=
    me.role;

  $('roleMini').textContent=
    `ROLE: ${me.role}${
      me.investigatorRole
        ?' · '+me.investigatorRole
        :''
    }`;

  $('objective').textContent=
    me.objective||'';


  $('memory').innerHTML=
    me.memory?.length
      ?`
        <div class="memory">

          <b>PERSONAL MEMORY</b>

          ${
            me.memory
              .slice(-5)
              .reverse()
              .map(x=>`
                <p>
                  <span>
                    ${esc(x.type)}
                    ·
                    ${x.confidence}% confidence
                  </span>

                  ${esc(x.text)}
                </p>
              `)
              .join('')
          }

        </div>
      `
      :'';


  /*
     Multiplayer:
     Human Killer gets the critical decision button.

     Single player:
     The Killer is an NPC, so the human investigator
     never receives this control.
  */

  if(
    me.role==='KILLER' &&
    S?.phase==='CRIME' &&
    window.NOCTURNE_MODE!=='SINGLE_PLAYER'
  ){

    $('killerControl').innerHTML=`
      <button
        class="killerBtn"
        onclick="killerDecision()"
      >
        COMMIT TO THE CRITICAL DECISION
      </button>
    `;

  }else{

    $('killerControl').innerHTML='';
  }
}


function killerDecision(){

  setBusy(
    true,
    'Resolving the critical window…'
  );

  sock.emit('killerDecision');
}


/* =========================================================
   MAIN RENDER
   ========================================================= */

function render(){

  if(!S)return;

  const free=
    $('free')?.value||'';

  const oldInvest=
    $('investTarget')?.value||'';

  const oldQuestion=
    $('qInput')?.value||'';

  const oldQTarget=
    $('qTarget')?.value||'';


  $('case').textContent=
    '#'+S.caseId+' · LIVE SIMULATION';

  $('world').textContent=
    S.world.name;

  $('clock').textContent=
    S.clock;

  $('phase').textContent=
    S.phase;


  const modeName=
    S.mode==='SINGLE_PLAYER'
      ?'SINGLE PLAYER'
      :'MULTIPLAYER';

  if($('mode')){
    $('mode').textContent=modeName;
  }


  $('phaseHelp').textContent=
    ({
      "PRE-CRIME":
        S.mode==='SINGLE_PLAYER'
          ?'The world is moving. Learn the people, routines and relationships before the critical window.'
          :'People are moving freely. Build relationships and observations before the critical window.',

      "CRIME":
        S.mode==='SINGLE_PLAYER'
          ?'The critical window is active. The Killer is an autonomous NPC making decisions inside the simulation.'
          :'The critical window is open. The human Killer controls the turning point.',

      "POST-CRIME":
        'A death has been discovered. Secure observations and compare accounts.',

      "INVESTIGATION":
        'Reconstruct the timeline, test contradictions and build a defensible case.',

      "ENDED":
        'The case has reached a verdict.'

    }[S.phase]||
      'The case is live. Your choices advance time.'
    );


  $('aliveCount').textContent=
    `${S.people.filter(p=>p.alive).length} ALIVE`;


  /* PEOPLE */

  $('people').innerHTML=
    S.people.map(p=>`

      <div
        class="person ${p.alive?'':'dead'}"
        onclick="${
          p.alive
            ?`prefill('Talk to ${js(p.name)}')`
            :''
        }"
      >

        <span>
          ${p.isPlayer?'PLAYER':'NPC'}
          ·
          ${esc(
            p.investigatorRole||
            p.job||
            'GUEST'
          )}
        </span>

        <b>
          ${esc(p.name)}

          ${
            p.alive
              ?`<i class="susp">
                  ${p.suspicion}%
                </i>`
              :' · DECEASED'
          }

        </b>

        <span>
          ${
            p.alive
              ?esc(p.location)
              :'Last known: '+esc(p.location)
          }
        </span>

      </div>

    `).join('');


  /* LOCATIONS */

  $('locations').innerHTML=
    S.world.areas.map(x=>`

      <div
        class="loc"
        onclick="prefill('Move to ${js(x)}')"
      >

        <b>${esc(x)}</b>

        <span>
          ${
            S.people.filter(
              p=>p.alive&&p.location===x
            ).length
          }
          currently present
        </span>

      </div>

    `).join('');


  /* EVENTS */

  $('events').innerHTML=
    S.events
      .slice()
      .reverse()
      .map(e=>`

        <div class="event ${esc(e.type)}">

          <small>
            ${esc(e.time)}
            ·
            ${esc(e.type)}
          </small>

          <p>
            ${esc(e.text)}
          </p>

        </div>

      `).join('');


  $('eventCount').textContent=
    `${S.events.length} EVENTS`;

  $('evCount').textContent=
    S.evidence.length
      ?`(${S.evidence.length})`
      :'';


  renderPrivate();


  /* ACTIONS */

  $('act').innerHTML=`

    <div class="action-grid">

      ${
        [
          ['Talk','Talk to someone nearby'],
          ['Move','Move somewhere'],
          ['Search','Search the current area'],
          ['Follow','Follow a person'],
          ['Observe','Wait and observe'],
          ['Recall','Review what I know']
        ]
        .map(x=>`

          <div
            class="card"
            onclick="prefill('${js(x[1])}')"
          >

            <b>${x[0]}</b>

            <p>${x[1]}</p>

          </div>

        `)
        .join('')
      }

    </div>


    <div class="composer">

      <input
        id="free"
        maxlength="600"
        placeholder="Describe exactly what your character tries to do…"
        value="${esc(free)}"
      >

      <button
        class="primary"
        onclick="send()"
      >
        DO ACTION
      </button>

    </div>
  `;


  /* INVESTIGATION */

  $('invest').innerHTML=`

    <div class="investBox">

      <label>
        WHAT DO YOU WANT TO INVESTIGATE?

        <input
          id="investTarget"
          maxlength="180"
          placeholder="Person, place, object or detail"
        >
      </label>


      <div class="investBtns">

        <button
          class="primary"
          onclick="investPrompt('observe')"
        >
          INSPECT / SEARCH
        </button>

        <button
          class="secondary"
          onclick="investPrompt('question')"
        >
          QUESTION PERSON
        </button>

      </div>

    </div>
  `;


  /* EVIDENCE */

  $('evidence').innerHTML=
    S.evidence.length
      ?`

        <div class="egrid">

          ${
            S.evidence
              .slice()
              .reverse()
              .map(e=>`

                <div class="ev">

                  ${
                    e.image
                      ?`
                        <img
                          src="${e.image}"
                          alt="Case evidence image"
                        >
                      `
                      :''
                  }

                  <div>

                    <b>
                      ${esc(e.title)}
                    </b>

                    <p>
                      ${esc(e.description)}
                    </p>

                    <span class="tag">
                      ${esc(e.type).toUpperCase()}
                      ·
                      RELIABILITY
                      ${Math.round(e.reliability)}%
                      ${
                        e.source
                          ?' · '+esc(e.source)
                          :''
                      }
                    </span>

                  </div>

                </div>

              `)
              .join('')
          }

        </div>

      `
      :`

        <div class="empty">
          No evidence logged yet.
          Observe, question and search.
        </div>
      `;


  /* VISUAL */

  $('visual').innerHTML=`

    <div class="visual">

      <div
        class="visualbox"
        id="visualbox"
      >

        <div class="overlay">
          CASE EVIDENCE NETWORK<br>
          ${esc(S.world.name)}<br>
          ${S.clock}
        </div>

        <div class="scan"></div>

      </div>


      <p>
        Visuals are imperfect observations tied to
        the current case time. Corroborate them with
        independent evidence.
      </p>


      <div class="visualBtns">

        <button
          class="primary"
          onclick="visual('cctv')"
        >
          REQUEST CCTV STILL
        </button>

        <button
          class="secondary"
          onclick="visual('photo')"
        >
          REQUEST SCENE PHOTO
        </button>

      </div>

    </div>
  `;


  /* QUESTIONS */

  const targets=
    S.people.filter(
      p=>p.alive&&p.id!==currentPlayerId()
    );


  $('question').innerHTML=`

    <div class="investBox">

      <label>
        WHO DO YOU WANT TO QUESTION?

        <select id="qTarget">

          ${
            targets.map(p=>`

              <option value="${esc(p.id)}">

                ${esc(p.name)}
                ·
                ${esc(
                  p.investigatorRole||
                  p.job||
                  'NPC'
                )}
                ·
                ${esc(p.location)}

              </option>

            `).join('')
          }

        </select>

      </label>


      <label>
        QUESTION

        <textarea
          id="qInput"
          maxlength="400"
          rows="4"
          placeholder="Ask something specific. You control the question."
        ></textarea>

      </label>


      <div class="investBtns">

        <button
          class="primary"
          onclick="askSelected()"
        >
          CALL &amp; ASK
        </button>

        <button
          class="secondary"
          onclick="askPreset('where')"
        >
          WHERE WERE YOU?
        </button>

        <button
          class="secondary"
          onclick="askPreset('seen')"
        >
          WHAT DID YOU SEE?
        </button>

      </div>


      <p class="modalHint">
        NPCs answer from their own memories, stress,
        goals and secrets. Human players receive the
        question privately and write their own answer.
      </p>

    </div>
  `;


  if($('investTarget')){
    $('investTarget').value=
      oldInvest;
  }

  if($('qInput')){
    $('qInput').value=
      oldQuestion;
  }

  if(
    $('qTarget')&&
    oldQTarget&&
    [...$('qTarget').options]
      .some(o=>o.value===oldQTarget)
  ){

    $('qTarget').value=
      oldQTarget;
  }


  /* ACCUSATION */

  const suspects=
    S.people.filter(
      p=>p.alive&&p.id!==currentPlayerId()
    );


  $('accuse').innerHTML=`

    <div class="empty">
      An accusation is public.
      Use corroborated evidence and contradictions,
      not the suspicion percentage alone.
    </div>


    <div class="action-grid">

      ${
        suspects.map(p=>`

          <div
            class="card danger"
            onclick="accuse(
              '${js(p.id)}',
              '${js(p.name)}'
            )"
          >

            <b>
              ${esc(p.name)}
            </b>

            <p>
              Public suspicion
              ${p.suspicion}%
              · accuse this person
            </p>

          </div>

        `).join('')
      }

    </div>
  `;


  tab(
    activeTab,
    false
  );
}


/* =========================================================
   TABS
   ========================================================= */

function tab(x,scroll=true){

  activeTab=x;

  [
    'act',
    'invest',
    'question',
    'evidence',
    'visual',
    'accuse'
  ].forEach(y=>{

    $(y).classList.toggle(
      'hide',
      y!==x
    );

  });


  document
    .querySelectorAll('#tabs button')
    .forEach(b=>{

      b.classList.toggle(
        'active',
        b.dataset.tab===x
      );

    });


  if(
    scroll&&
    innerWidth<720
  ){

    $('tabs').scrollIntoView({
      behavior:'smooth',
      block:'start'
    });
  }
}


/* =========================================================
   ACTIONS
   ========================================================= */

function prefill(x){

  activeTab='act';

  tab('act');

  setTimeout(()=>{

    if($('free')){

      $('free').value=x;

      $('free').focus();
    }

  },0);
}


function send(){

  const x=
    $('free')?.value.trim();

  if(!x){
    return toast(
      'Describe an action first.'
    );
  }

  $('free').value='';

  setBusy(
    true,
    'Resolving action and NPC reactions…'
  );

  sock.emit(
    'playerAction',
    {
      action:x
    }
  );
}


/* =========================================================
   QUESTIONS
   ========================================================= */

function askSelected(){

  const target=
    $('qTarget')?.value;

  const q=
    $('qInput')?.value.trim();

  if(!target||!q){

    return toast(
      'Choose a person and write a question.'
    );
  }

  setBusy(
    true,
    'Waiting for the answer…'
  );

  sock.emit(
    'askQuestion',
    {
      targetId:target,
      question:q
    }
  );
}


function askPreset(kind){

  const el=
    $('qInput');

  if(el){

    el.value=
      kind==='where'
        ?'Where were you during the critical period?'
        :'What did you personally see, hear, or notice near the critical period?';

    el.focus();
  }
}


function answerQuestion(){

  if(!incomingQ)return;

  const a=
    $('answerInput')
      .value
      .trim();

  if(!a){

    return toast(
      'Write an answer first.'
    );
  }

  sock.emit(
    'answerQuestion',
    {
      questionId:
        incomingQ.questionId,

      answer:a
    }
  );

  closeQuestion();

  toast(
    'Answer sent.'
  );
}


function closeQuestion(){

  $('questionModal')
    .classList
    .add('hide');

  incomingQ=null;
}


/* =========================================================
   INVESTIGATION
   ========================================================= */

function investPrompt(mode){

  const target=
    $('investTarget')
      ?.value
      .trim();

  if(!target){

    return toast(
      'Enter something to investigate.'
    );
  }


  if(mode==='question'){

    tab('question');

    const match=
      [...$('qTarget').options]
        .find(
          o=>o.textContent
            .toLowerCase()
            .startsWith(
              target.toLowerCase()
            )
        );

    if(match){
      $('qTarget').value=
        match.value;
    }

    $('qInput').value=
      `What do you remember about ${target}?`;

    $('qInput').focus();

    return;
  }


  setBusy(
    true,
    'Recording investigation…'
  );

  sock.emit(
    'investigate',
    {
      target,
      mode
    }
  );
}


/* =========================================================
   ACCUSATION
   ========================================================= */

function accuse(id,name){

  if(
    confirm(
      `Accuse ${name}? This is public and cannot be taken lightly.`
    )
  ){

    setBusy(
      true,
      'Recording accusation…'
    );

    sock.emit(
      'accuse',
      {
        targetId:id
      }
    );
  }
}


/* =========================================================
   VISUAL EVIDENCE
   ========================================================= */

function visual(type){

  setBusy(
    true,
    type==='cctv'
      ?'Retrieving CCTV evidence…'
      :'Developing scene photograph…'
  );

  sock.emit(
    'requestVisual',
    {
      type,
      cameraId:
        type==='cctv'
          ?'CAM-01'
          :'EVIDENCE-PHOTO'
    }
  );


  setTimeout(()=>{

    if(busy){
      setBusy(false);
    }

  },30000);
}


function showVisual(d){

  const box=
    $('visualbox');

  if(box){

    box.innerHTML=`

      <img
        src="${d.image}"
        alt="${esc(d.title)}"
      >

      <div class="overlay">
        ${esc(d.title)}<br>
        ${esc(d.description)}
      </div>

      <div class="scan"></div>
    `;
  }

  tab('visual');
}


/* =========================================================
   CHAT
   ========================================================= */

function addChat(name,text){

  const d=
    document.createElement('div');

  d.className='msg';

  d.innerHTML=`
    <b>${esc(name)}</b>
    <p>${esc(text)}</p>
  `;

  $('chat')
    .appendChild(d);

  $('chat').scrollTop=
    $('chat').scrollHeight;
}


function sendChat(e){

  e.preventDefault();

  const x=
    $('chatin')
      .value
      .trim();

  if(x){

    sock.emit(
      'chat',
      {
        text:x
      }
    );

    $('chatin').value='';
  }
}


/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener(
  'keydown',
  e=>{

    if(e.key==='Escape'){

      closeModal();
      closeQuestion();
      closeAbout();

      if(!$('singleSetup')?.classList.contains('hide')){
        show('landing');
      }
    }


    if(
      e.key==='Enter'&&
      !e.shiftKey&&
      !$('modal').classList.contains('hide')&&
      document.activeElement?.id!=='chatin'
    ){

      e.preventDefault();

      submitSetup();
    }

  }
);


/* =========================================================
   START
   ========================================================= */

show('landing');
