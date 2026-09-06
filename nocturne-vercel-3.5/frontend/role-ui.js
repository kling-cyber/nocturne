(function(){
  function socket(){
    try{return window.sock||sock||null;}catch(e){return null;}
  }

  function boot(attempt=0){
    if(window.__nocturneRoleUIInstalled)return;
    if(typeof window.render!=='function'||!socket()){
      if(attempt<100)setTimeout(()=>boot(attempt+1),100);
      else console.error('[NOCTURNE] Role UI could not find app.js/socket.io.');
      return;
    }
    window.__nocturneRoleUIInstalled=true;
    const baseRender=window.render;
    const basePrivate=window.renderPrivate;
    let timer=null;
    let lastRoleOutput=null;

    function finish(message){
      if(timer){clearTimeout(timer);timer=null;}
      if(typeof setBusy==='function')setBusy(false);
      if(message&&typeof toast==='function')toast(message);
    }

    function send(action){
      const text=String(action||'').trim();
      const s=socket();
      console.log('[NOCTURNE] ROLE SEND',text,'connected=',!!s?.connected);
      if(!text)return;
      if(!s||!s.connected){finish('The case server is not connected.');return;}
      if(typeof setBusy==='function')setBusy(true,'Resolving '+text+'…');
      s.emit('roleAction',{action:text});
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>finish('No role response arrived from the case server.'),10000);
    }

    function named(kind){
      const name=prompt(kind+' · enter the exact character name:');
      if(name&&name.trim())send(kind+' '+name.trim());
    }

    window.nocturneRoleAction=send;
    window.nocturneNamedRoleAction=named;
    window.nocturneKillerAction=()=>named('KILL');

    function renderRolePanel(){
      const box=document.getElementById('act');
      if(!box||typeof me==='undefined'||!me)return;
      const role=String(me.role||'INVESTIGATOR').toUpperCase();
      const free=document.getElementById('free')?.value||'';
      const button=(label,action,desc,extra='')=>`<button type="button" class="card roleActionButton ${extra}" data-role-action="${esc(action)}"><b>${esc(label)}</b><p>${esc(desc)}</p></button>`;
      const namedButton=(label,action,desc)=>`<button type="button" class="card roleActionButton" data-role-named="${esc(action)}"><b>${esc(label)}</b><p>${esc(desc)}</p></button>`;
      let special='';
      if(role==='KILLER'){
        special='<div class="rolePanel killerPanel"><h3>KILLER ABILITIES</h3><div class="action-grid">'+namedButton('ELIMINATE','KILL','Choose a living target during the critical window.')+button('CONCEAL SCENE','CONCEAL SCENE','Disturb the scene after the crime. This can create evidence.','danger')+'</div></div>';
      }else if(role==='DETECTIVE'){
        special='<div class="rolePanel detectivePanel"><h3>DETECTIVE ABILITIES</h3><div class="action-grid">'+button('ANALYZE CASE','ANALYZE CASE','Cross-reference recent evidence.')+namedButton('INTERROGATE','INTERROGATE','Formally question a person.')+namedButton('MARK SUSPECT','MARK SUSPECT','Flag a person of interest for the team.')+'</div></div>';
      }else{
        special='<div class="rolePanel investigatorPanel"><h3>INVESTIGATOR ABILITIES</h3><div class="action-grid">'+button('FORENSICS','FORENSICS','Perform a focused trace and object search.')+namedButton('TRACK','TRACK','Follow a person\'s movement trail.')+button('RECON','RECON','Survey the current area for nearby activity.')+'</div></div>';
      }
      const common='<div class="rolePanel commonPanel"><h3>COMMON ACTIONS</h3><div class="action-grid"><button type="button" class="card" onclick="prefill(\'Talk to someone nearby\')"><b>Talk</b><p>Talk to someone nearby</p></button><button type="button" class="card" onclick="prefill(\'Move somewhere\')"><b>Move</b><p>Move somewhere</p></button><button type="button" class="card" onclick="prefill(\'Search the current area\')"><b>Search</b><p>Search the current area</p></button><button type="button" class="card" onclick="prefill(\'Follow a person\')"><b>Follow</b><p>Follow a person</p></button><button type="button" class="card" onclick="prefill(\'Wait and observe\')"><b>Observe</b><p>Wait and observe</p></button><button type="button" class="card" onclick="prefill(\'Review what I know\')"><b>Recall</b><p>Review what I know</p></button></div></div>';
      box.innerHTML=special+'<div id="roleOutput" class="role-output"><div class="role-output-title">ROLE OUTPUT</div><div class="role-output-text">Use a role ability to receive a case-specific result here.</div></div>'+common+'<div class="composer"><input id="free" maxlength="600" placeholder="Describe exactly what your character tries to do…" value="'+esc(free)+'"><button class="primary" type="button" onclick="send()">DO ACTION</button></div>';
      box.querySelectorAll('[data-role-action]').forEach(el=>el.onclick=()=>send(el.dataset.roleAction));
      box.querySelectorAll('[data-role-named]').forEach(el=>el.onclick=()=>named(el.dataset.roleNamed));
      if(lastRoleOutput)showOutput(lastRoleOutput);
    }

    function showOutput(result){
      if(!result)return;
      lastRoleOutput={title:String(result.title||'ROLE ABILITY'),description:String(result.description||'Role ability resolved.')};
      const box=document.getElementById('roleOutput');
      if(!box)return;
      box.innerHTML='<div class="role-output-title">'+esc(lastRoleOutput.title)+'</div><div class="role-output-text">'+esc(lastRoleOutput.description)+'</div>';
      box.classList.add('active');
    }

    window.render=function(){baseRender();renderRolePanel();};
    window.renderPrivate=function(){basePrivate();renderRolePanel();};
    window.__nocturneRoleDiagnostics=()=>({installed:true,connected:!!socket()?.connected,role:me?.role||null,render:typeof window.render});

    const s=socket();
    s.on('stateUpdate',()=>finish());
    s.on('errorMessage',message=>finish(message));
    s.on('disconnect',()=>finish('Connection to the case server was lost.'));
    s.on('roleActionResult',result=>{console.log('[NOCTURNE] ROLE RESULT',result);finish(result?.ok?'Role ability resolved.':(result?.message||'Role ability failed.'));if(result?.ok)showOutput(result);});
    s.on('roleActionOutput',result=>{console.log('[NOCTURNE] ROLE OUTPUT',result);finish();showOutput(result);});

    if(typeof S!=='undefined'&&S)window.render();
    console.log('[NOCTURNE] ROLE SYSTEM READY',window.__nocturneRoleDiagnostics());
  }
  boot();
})();
