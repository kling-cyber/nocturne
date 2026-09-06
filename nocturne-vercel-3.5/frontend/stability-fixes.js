/* NOCTURNE runtime guards. Functional fixes only, no styling changes. */
(function(){
  function boot(){
    if(window.__nocturneStabilityFixesInstalled)return;
    if(typeof window.sock==='undefined' && typeof sock==='undefined'){
      setTimeout(boot,100);
      return;
    }
    window.__nocturneStabilityFixesInstalled=true;

    const getSocket=()=>{
      try{return window.sock||sock||null;}catch(e){return null;}
    };

    // The visual engine is direct/on-demand. Never impose the old 30-second UI cooldown.
    window.visual=function(type){
      const s=getSocket();
      if(!s?.connected){
        if(typeof toast==='function')toast('The case server is not connected.');
        return;
      }
      if(typeof setBusy==='function')setBusy(true,type==='cctv'?'Generating CCTV still…':'Generating scene photograph…');
      if(type==='cctv'){
        const buttons=document.querySelectorAll('[data-camera-id]');
        if(!buttons.length){
          if(typeof setBusy==='function')setBusy(false);
          if(typeof toast==='function')toast('No case cameras are available yet.');
          return;
        }
        const selected=document.querySelector('[data-camera-id].selected');
        s.emit('requestVisual',{type:'cctv',cameraId:selected?.dataset.cameraId||buttons[0].dataset.cameraId});
      }else{
        s.emit('requestVisual',{type:'photo',cameraId:'EVIDENCE-PHOTO'});
      }
    };

    // The legacy critical-window button remains functional by routing it through the real role action.
    window.killerDecision=function(){
      if(typeof window.nocturneKillerAction==='function'){
        window.nocturneKillerAction();
        return;
      }
      if(typeof toast==='function')toast('The role controls are still loading.');
    };

    console.log('[NOCTURNE] runtime stability guards installed');
  }
  boot();
})();
