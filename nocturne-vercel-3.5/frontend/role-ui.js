(function(){
  function install(){
    if(window.__nocturneRoleUIInstalled||typeof window.render!=='function')return;
    window.__nocturneRoleUIInstalled=true;
    const baseRender=window.render,basePrivate=window.renderPrivate;
    const roleAction=action=>{if(typeof setBusy==='function')setBusy(true,'Resolving role ability…');sock.emit('roleAction',{action});};
    window.nocturneRoleAction=roleAction;
    window.nocturneNamedRoleAction=kind=>{const name=prompt(kind+' · enter the exact character name:');if(name)roleAction(kind+' '+name.trim());};
    window.nocturneKillerAction=()=>{const name=prompt('ELIMINATE · enter the exact living target name:');if(name)roleAction('KILL '+name.trim());};
    function renderRolePanel(){
      const box=$('act');if(!box||!me)return;
      const role=me.role||'INVESTIGATOR',free=$('free')?.value||'';
      const common=`<div class="rolePanel commonPanel"><h3>COMMON ACTIONS</h3><div class="action-grid"><div class="card" onclick="prefill('Talk to someone nearby')"><b>Talk</b><p>Talk to someone nearby</p></div><div class="card" onclick="prefill('Move somewhere')"><b>Move</b><p>Move somewhere</p></div><div class="card" onclick="prefill('Search the current area')"><b>Search</b><p>Search the current area</p></div><div class="card" onclick="prefill('Follow a person')"><b>Follow</b><p>Follow a person</p></div><div class="card" onclick="prefill('Wait and observe')"><b>Observe</b><p>Wait and observe</p></div><div class="card" onclick="prefill('Review what I know')"><b>Recall</b><p>Review what I know</p></div></div></div>`;
      let special='';
      if(role==='KILLER')special=`<div class="rolePanel killerPanel"><h3>KILLER ABILITIES</h3><div class="action-grid"><div class="card danger" onclick="nocturneKillerAction()"><b>ELIMINATE</b><p>Choose a living target during the critical window.</p></div><div class="card danger" onclick="nocturneRoleAction('CONCEAL SCENE')"><b>CONCEAL SCENE</b><p>Disturb the scene after the crime. This can create evidence.</p></div></div></div>`;
      else if(role==='DETECTIVE')special=`<div class="rolePanel detectivePanel"><h3>DETECTIVE ABILITIES</h3><div class="action-grid"><div class="card" onclick="nocturneRoleAction('ANALYZE CASE')"><b>ANALYZE CASE</b><p>Cross-reference recent evidence.</p></div><div class="card" onclick="nocturneNamedRoleAction('INTERROGATE')"><b>INTERROGATE</b><p>Formally question a person.</p></div><div class="card" onclick="nocturneNamedRoleAction('MARK SUSPECT')"><b>MARK SUSPECT</b><p>Flag a person of interest for the team.</p></div></div></div>`;
      else if(role==='INVESTIGATOR')special=`<div class="rolePanel investigatorPanel"><h3>INVESTIGATOR ABILITIES</h3><div class="action-grid"><div class="card" onclick="nocturneRoleAction('FORENSICS')"><b>FORENSICS</b><p>Perform a focused trace and object search.</p></div><div class="card" onclick="nocturneNamedRoleAction('TRACK')"><b>TRACK</b><p>Follow a person's movement trail.</p></div><div class="card" onclick="nocturneRoleAction('RECON')"><b>RECON</b><p>Survey the current area for nearby activity.</p></div></div></div>`;
      box.innerHTML=special+common+`<div class="composer"><input id="free" maxlength="600" placeholder="Describe exactly what your character tries to do…" value="${esc(free)}"><button class="primary" onclick="send()">DO ACTION</button></div>`;
      const killerControl=$('killerControl');if(killerControl)killerControl.innerHTML='';
    }
    window.render=function(){baseRender();renderRolePanel();};
    window.renderPrivate=function(){basePrivate();const killerControl=$('killerControl');if(killerControl)killerControl.innerHTML='';};
    if(typeof S!=='undefined'&&S)window.render();
  }
  if(document.readyState==='complete')install();else window.addEventListener('load',install,{once:true});
})();
