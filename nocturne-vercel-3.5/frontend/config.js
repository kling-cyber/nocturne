// Set this to the public URL of the NOCTURNE game server.
// Example: https://nocturne-api.example.com
window.NOCTURNE_SERVER_URL = "https://nocturne-8tko.onrender.com";

// Load role-specific multiplayer controls after app.js has initialized.
window.addEventListener("load",()=>{
  const s=document.createElement("script");
  s.src="/role-ui.js?v=4.0.4";
  document.head.appendChild(s);
},{once:true});
