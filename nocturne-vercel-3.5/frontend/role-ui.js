(function(){
  const wait=(fn,n=0)=>{if(fn())return;if(n<120)setTimeout(()=>wait(fn,n+1),100);};

  function install(){
    if(window.__nocturneRoleUIInstalled)return true;
    if(typeof window.render!=='function')return false;
    if(typeof window.sock==='undefined'&&typeof sock==='undefined')return false;

    window.__nocturneRoleUIInstalled=true;
    const baseRender=window.render;
    const basePrivate=window.renderPrivate;
    let roleTimer=null;

    const socket=()=>{
      try{return window.sock||sock||null;}catch(e){return window.sock||null;}
    };

    const finish=(message)=>{
      if(roleTimer){clearTimeout(roleTimer);roleTimer=null;}
      if(typeof setBusy==='function')setBusy(false);
      if(message&&typeof toast==='function')toast(message);
    };

    const showOutput=result=>{
      const box=document.getElementById('roleOutput');
      if(!box||!result)return;
      const safeEsc=typeof esc==='function'?esc:x=>String(x??'');
      box.innerHTML='<div class="role-output-title">'+safeEsc(result.title||'ROLE ABILITY')+'</div><div class="role-output-text">'+safeEsc(result.description||'Role ability resolved.')+'</div>';
      box.classList.add('active');
    };

    const roleAction=raw=>{
      const action=String(raw||'').trim();
      if(!action)return;
      const s=socket();
      console.log('[NOCTURNE] ROLE BUTTON:',action,'socket=',!!s,'connected=',!!s?.connected);
      if(!s||!s.connected){finish('The case connection is not available.');return;}
      if(typeof setBusy==='function')setBusy(true,'Resolving role ability…');
      s.emit('roleAction',{action});
      if(roleTimer)clearTimeout(roleTimer);
      roleTimer=setTimeout(()=>finish('The role ability did not receive a server response. Please try again.'),10000);
    };

    window.nocturneRoleAction=roleAction;
    window.nocturneNamedRoleAction=kind=>{const name=prompt(kind+' · enter the exact character name:');if(name?.trim())roleAction(kind+' '+name.trim());};
    window.nocturneKillerAction=()=>{const name=prompt('ELIMINATE · enter the exact living target name:');if(name?.trim())roleAction('KILL '+name.trim());};

    function renderRolePanel(){
      const box=document.getElementById('act');
      if(!box||typeof me==='undefined'||!me)return;
      const role=String(me.role||'INVESTIGATOR').toUpperCase();
      const free=document.getElementById('free')?.value||'';
      let special='';
      if(role==='KILLER')special='<div class="rolePanel killerPanel"><h3>KILLER ABILITIES</h3><div class="action-grid"><div class="card danger" data-role-action="KILL"><b>ELIMINATE</b><p>Choose a living target during the critical window.</p></div><div class="card danger" data-role-action="CONCEAL SCENE"><b>CONCEAL SCENE</b><p>Disturb the scene after the crime. This can create evidence.</p></div></div></div>';
      else if(role==='DETECTIVE')special='<div class="rolePanel detectivePanel"><h3>DETECTIVE ABILITIES</h3><div class="action-grid"><div class="card" data-role-action="ANALYZE CASE"><b>ANALYZE CASE</b><p>Cross-reference recent evidence.</p></div><div class="card" data-role-named="INTERROGATE"><b>INTERROGATE</b><p>Formally question a person.</p></div><div class="card" data-role-named="MARK SUSPECT"><b>MARK SUSPECT</b><p>Flag a person of interest for the team.</p></div></div></div>';
      else special='<div class="rolePanel investigatorPanel"><h3>INVESTIGATOR ABILITIES</h3><div class="action-grid"><div class="card" data-role-action="FORENSICS"><b>FORENSICS</b><p>Perform a focused trace and object search.</p></div><div class="card" data-role-named="TRACK"><b>TRACK</b><p>Follow a person\'s movement trail.</p></div><div class="card" data-role-action="RECON"><b>RECON</b><p>Survey the current area for nearby activity.</p></div></div></div>';
      const common='<div class="rolePanel commonPanel"><h3>COMMON ACTIONS</h3><div class="action-grid"><div class="card" onclick="prefill(\'Talk to someone nearby\')"><b>Talk</b><p>Talk to someone nearby</p></div><div class="card" onclick="prefill(\'Move somewhere\')"><b>Move</b><p>Move somewhere</p></div><div class="card" onclick="prefill(\'Search the current area\')"><b>Search</b><p>Search the current area</p></div><div class="card" onclick="prefill(\'Follow a person\')"><b>Follow</b><p>Follow a person</p></div><div class="card" onclick="prefill(\'Wait and observe\')"><b>Observe</b><p>Wait and observe</p></div><div class="card" onclick="prefill(\'Review what I know\')"><b>Recall</b><p>Review what I know</p></div></div></div>';
      box.innerHTML=special+'<div id="roleOutput" class="role-output"><div class="role-output-title">ROLE OUTPUT</div><div class="role-output-text">Use a role ability to receive a case-specific result here.</div></div>'+common+'<div class="composer"><input id="free" maxlength="600" placeholder="Describe exactly what your character tries to do…" value="'+(typeof esc==='function'?esc(free):'')+'"><button class="primary" onclick="send()">DO ACTION</button></div>';

      box.querySelectorAll('[data-role-action]').forEach(el=>el.addEventListener('click',()=>roleAction(el.dataset.roleAction)));
      box.querySelectorAll('[data-role-named]').forEach(el=>el.addEventListener('click',()=>{const kind=el.dataset.roleNamed;const name=prompt(kind+' · enter the exact character name:');if(name?.trim())roleAction(kind+' '+name.trim());}));
    }

    window.render=function(){baseRender();renderRolePanel();};
    window.renderPrivate=function(){basePrivate();};
    window.__nocturneRenderRolePanel=renderRolePanel;

    const s=socket();
    if(s){
      s.on('stateUpdate',()=>finish());
      s.on('errorMessage',message=>finish(message));
      s.on('disconnect',()=>finish('Connection to the case server was lost.'));
      s.on('roleActionResult',result=>{finish(result?.ok?'Role ability resolved.':(result?.message||'The role ability failed.'));if(result?.ok)showOutput(result);});
      s.on('roleActionOutput',result=>{finish();showOutput(result);});
    }

    if(typeof S!=='undefined'&&S)window.render();
    console.log('[NOCTURNE] Role UI installed and role button listeners bound.');
    return true;
  }

  wait(install);
})();
