// Set this to the public URL of the NOCTURNE game server.
// Example: https://nocturne-api.example.com
window.NOCTURNE_SERVER_URL = "https://nocturne-8tko.onrender.com";

(function(){
  function loadExtras(){
    if(window.__nocturneExtrasLoaded)return;
    window.__nocturneExtrasLoaded=true;

    const role=document.createElement("script");
    role.src="/role-ui.js?v=4.1.6";
    role.onload=()=>console.log("[NOCTURNE] role-ui.js loaded");
    role.onerror=()=>console.error("[NOCTURNE] role-ui.js FAILED TO LOAD");
    document.head.appendChild(role);

    const evidence=document.createElement("script");
    evidence.src="/evidence-ui.js?v=4.1.0";
    document.head.appendChild(evidence);

    const layout=document.createElement("link");
    layout.rel="stylesheet";
    layout.href="/evidence-layout.css?v=4.1.1";
    document.head.appendChild(layout);
  }

  // config.js is parsed before app.js in index.html. A zero-delay task lets
  // app.js finish first, then loads the role controller without depending on
  // the window load event.
  if(document.readyState==='loading')setTimeout(loadExtras,0);
  else loadExtras();
})();
