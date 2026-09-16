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

    const threeCss=document.createElement("link");
    threeCss.rel="stylesheet";
    threeCss.href="/nocturne-3d.css?v=4.3.0";
    threeCss.onload=()=>console.log("[NOCTURNE] nocturne-3d.css loaded");
    threeCss.onerror=()=>console.error("[NOCTURNE] nocturne-3d.css FAILED TO LOAD");
    document.head.appendChild(threeCss);

    const three=document.createElement("script");
    three.src="/nocturne-3d-runtime.js?v=4.3.0";
    three.onload=()=>console.log("[NOCTURNE] nocturne-3d-runtime.js loaded");
    three.onerror=()=>console.error("[NOCTURNE] nocturne-3d-runtime.js FAILED TO LOAD");
    document.head.appendChild(three);
  }

  if(document.readyState==='loading')setTimeout(loadExtras,0);
  else loadExtras();
})();
