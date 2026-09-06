// NOCTURNE frontend runtime configuration.
window.NOCTURNE_SERVER_URL = "https://nocturne-8tko.onrender.com";

(function(){
  function loadExtras(){
    if(window.__nocturneExtrasLoaded)return;
    window.__nocturneExtrasLoaded=true;

    const role=document.createElement("script");
    role.src="/role-ui.js?v=4.2.0";
    role.onload=()=>console.log("[NOCTURNE] role-ui.js loaded");
    role.onerror=()=>console.error("[NOCTURNE] role-ui.js FAILED TO LOAD");
    document.head.appendChild(role);

    const evidence=document.createElement("script");
    evidence.src="/evidence-ui.js?v=4.2.0";
    evidence.onload=()=>console.log("[NOCTURNE] evidence-ui.js loaded");
    evidence.onerror=()=>console.error("[NOCTURNE] evidence-ui.js FAILED TO LOAD");
    document.head.appendChild(evidence);

    const layout=document.createElement("link");
    layout.rel="stylesheet";
    layout.href="/evidence-layout.css?v=4.2.0";
    document.head.appendChild(layout);

    const stability=document.createElement("script");
    stability.src="/stability-fixes.js?v=4.2.0";
    stability.onload=()=>console.log("[NOCTURNE] stability-fixes.js loaded");
    stability.onerror=()=>console.error("[NOCTURNE] stability-fixes.js FAILED TO LOAD");
    document.head.appendChild(stability);
  }

  if(document.readyState==='loading')setTimeout(loadExtras,0);
  else loadExtras();
})();
