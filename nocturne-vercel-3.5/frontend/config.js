// Set this to the public URL of the NOCTURNE game server.
// Example: https://nocturne-api.example.com
window.NOCTURNE_SERVER_URL = "https://nocturne-8tko.onrender.com";

// Load optional UI layers after app.js is available. This works whether
// config.js executes before or after the browser load event.
(function(){
  function loadExtras(){
    if(window.__nocturneExtrasLoaded)return;
    window.__nocturneExtrasLoaded=true;

    const role=document.createElement("script");
    role.src="/role-ui.js?v=4.1.5";
    document.head.appendChild(role);

    const evidence=document.createElement("script");
    evidence.src="/evidence-ui.js?v=4.1.0";
    document.head.appendChild(evidence);

    const layout=document.createElement("link");
    layout.rel="stylesheet";
    layout.href="/evidence-layout.css?v=4.1.1";
    document.head.appendChild(layout);
  }

  if(document.readyState==='complete')loadExtras();
  else window.addEventListener('load',loadExtras,{once:true});
})();
