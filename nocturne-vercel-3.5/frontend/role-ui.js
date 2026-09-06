(function(){
  function socket(){try{return window.sock||sock||null;}catch(e){return null;}}
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
    function finish(message){if(timer){clearTimeout(timer);timer=null;}if(typeof setBusy==='function')setBusy(false);if(message&&typeof toast==='function')toast(message);}
    function send(action){
      const text=String(action||'').trim(),s=socket();
      console.log('[NOCTURNE] ROLE SEND',text,'connected=',!!s?.connected);
      if(!text)return;
      if(!s||!s.connected){finish('The case server is not connected.');return;}
      if(typeof setBusy==='function')setBusy(true,'Resolving '+text+'…');
      s.emit('roleAction',{action:text});
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>finish('No role response arrived from the case server.'),10000);
    }
    function named(kind){const name=prompt(kind+' · enter the exact character name:');if(name&&name.trim())send(kind+' '+name.trim());}
    window.nocturneRoleAction=send;
    window.nocturneNamedRoleAction=named;
    window.nocturneKillerAction=()=>named('KILL');
    window.nocturneRoleSend=send;

    function renderRolePanel(){
      const box=document.getElementById('act');
      if(!box||typeof me==='undefined'||!me)return;
      const role=String(me.role||'INVESTIGATOR').toUpperCase();
      const free=document.getElementById('free')?.value||'';
      const button=(label,action,desc,extra='')=>`<button type="button" class="card roleActionButton ${extra}" data-role-action="${esc(action)}"><b>${esc(label)}</b><p>${esc(desc)}</p></button>`;
      const namedButton=(label,action,desc)=>`<button type="button" class="card roleActionButton" data-role-named="${esc(action)}"><b>${esc(label)}</b><p>${esc(desc)}</p></button>`;
      let special='';
      if(role==='KILLER')special='<div class="rolePanel killerPanel"><h3>KILLER ABILITIES</h3><div class="action-grid">'+namedButton('ELIMINATE','KILL','Choose a living target during the critical window.')+button('CONCEAL SCENE','CONCEAL SCENE','Disturb the scene after the crime. This can create evidence.','danger')+'</div></div>';
      else if(role==='DETECTIVE')special='<div class="rolePanel detectivePanel"><h3>DETECTIVE ABILITIES</h3><div class="action-grid">'+button('ANALYZE CASE','ANALYZE CASE','Cross-reference recent evidence and build a defensible lead.')+namedButton('INTERROGATE','INTERROGATE','Formally question a person and compare their account with the record.')+namedButton('MARK SUSPECT','MARK SUSPECT','Flag a person of interest. This is not a verdict.')+'</div></div>';
      else special='<div class="rolePanel investigatorPanel"><h3>INVESTIGATOR ABILITIES</h3><div class="action-grid">'+button('FORENSICS','FORENSICS','Search for physical traces, objects and environmental inconsistencies.')+namedButton('TRACK','TRACK','Follow a person’s movement trail and compare locations.')+button('RECON','RECON','Survey the current area for nearby activity and people.')+'</div></div>';
      const common='<div class="rolePanel commonPanel"><h3>COMMON ACTIONS</h3><div class="action-grid"><button type="button" class="card" onclick="prefill(\'Talk to someone nearby\')"><b>Talk</b><p>Talk to someone nearby</p></button><button type="button" class="card" onclick="prefill(\'Move somewhere\')"><b>Move</b><p>Move somewhere</p></button><button type="button" class="card" onclick="prefill(\'Search the current area\')"><b>Search</b><p>Search the current area</p></button><button type="button" class="card" onclick="prefill(\'Follow a person\')"><b>Follow</b><p>Follow a person</p></button><button type="button" class="card" onclick="prefill(\'Wait and observe\')"><b>Observe</b><p>Wait and observe</p></button><button type="button" class="card" onclick="prefill(\'Review what I know\')"><b>Recall</b><p>Review what I know</p></button></div></div>';
      box.innerHTML=special+'<div id="roleOutput" class="role-output"><div class="role-output-title">ROLE OUTPUT</div><div class="role-output-text">Use a role ability to receive a case-specific result here.</div></div>'+common+'<div class="composer"><input id="free" maxlength="600" placeholder="Describe exactly what your character tries to do…" value="'+esc(free)+'"><button class="primary" type="button" onclick="window.nocturneRoleSend(document.getElementById(\'free\')?.value)">DO ACTION</button></div>';
      box.querySelectorAll('[data-role-action]').forEach(el=>el.onclick=()=>send(el.dataset.roleAction));
      box.querySelectorAll('[data-role-named]').forEach(el=>el.onclick=()=>named(el.dataset.roleNamed));
    }

    function mergeCaseRecord(){
      const feed=document.querySelector('#game .feed'),events=document.getElementById('events');
      if(!feed||!events||!S)return;
      const role=String(me?.role||'INVESTIGATOR').toUpperCase();
      const title=feed.querySelector('.panelTitle h3');
      if(title)title.textContent=role==='KILLER'?'CASE RECORD · KILLER VIEW':'CASE RECORD · INVESTIGATION';
      const evidence=Array.isArray(S.evidence)?S.evidence.slice().reverse():[];
      const existingEvents=Array.isArray(S.events)?S.events.slice().reverse():[];
      const eventHtml=existingEvents.map(e=>`<div class="event ${esc(e.type||'EVENT')}"><small>${esc(e.time||'')} · ${esc(e.type||'EVENT')}</small><p>${esc(e.text||'')}</p></div>`).join('');
      const seen=new Set();
      const evidenceHtml=evidence.filter(e=>{const k=[e.type||'',e.title||'',e.source||'',e.description||''].join('::');if(seen.has(k))return false;seen.add(k);return true;}).map(e=>`<div class="event evidenceRecord"><small>${esc(e.createdAt||S.clock||'')} · EVIDENCE · ${esc(e.type||'')}</small><p><b>${esc(e.title||'Evidence')}</b><br>${esc(e.description||'')}</p><span class="tag">RELIABILITY ${Math.round(Number(e.reliability||0))}%${e.source?' · '+esc(e.source):''}</span></div>`).join('');
      events.innerHTML=eventHtml+evidenceHtml;
      const count=document.getElementById('eventCount');
      if(count)count.textContent=`${existingEvents.length+evidence.length} RECORDS`;
      const evidenceTab=document.querySelector('[data-tab="evidence"]');
      if(evidenceTab)evidenceTab.closest('button')?.classList.add('hide');
      const evidencePane=document.getElementById('evidence');
      if(evidencePane)evidencePane.classList.add('hide');
    }

    function showOutput(result){const box=document.getElementById('roleOutput');if(!box||!result)return;box.innerHTML='<div class="role-output-title">'+esc(result.title||'ROLE ABILITY')+'</div><div class="role-output-text">'+esc(result.description||'Role ability resolved.')+'</div>';box.classList.add('active');}
    window.render=function(){baseRender();renderRolePanel();mergeCaseRecord();};
    window.renderPrivate=function(){basePrivate();renderRolePanel();mergeCaseRecord();};
    window.__nocturneRoleDiagnostics=()=>({installed:true,connected:!!socket()?.connected,role:me?.role||null,render:typeof window.render,caseRecord:true});
    const s=socket();
    s.on('stateUpdate',()=>finish());
    s.on('errorMessage',message=>finish(message));
    s.on('disconnect',()=>finish('Connection to the case server was lost.'));
    s.on('roleActionResult',result=>{console.log('[NOCTURNE] ROLE RESULT',result);finish(result?.ok?'Role ability resolved.':(result?.message||'Role ability failed.'));if(result?.ok)showOutput(result);});
    s.on('roleActionOutput',result=>{console.log('[NOCTURNE] ROLE OUTPUT',result);finish();showOutput(result);});
    document.addEventListener('click',event=>{const el=event.target.closest?.('[data-role-action],[data-role-named]');if(!el)return;event.preventDefault();event.stopPropagation();if(el.dataset.roleAction)send(el.dataset.roleAction);else if(el.dataset.roleNamed)named(el.dataset.roleNamed);},true);
    if(typeof S!=='undefined'&&S)window.render();
    console.log('[NOCTURNE] ROLE SYSTEM READY',window.__nocturneRoleDiagnostics());
  }
  boot();
})();
