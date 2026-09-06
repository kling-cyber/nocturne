/* NOCTURNE evidence presentation layer. Keeps the core renderer intact. */
(function(){
  if(window.__nocturneEvidenceUIInstalled)return;
  window.__nocturneEvidenceUIInstalled=true;

  function decorate(){
    document.querySelectorAll('#evidence .ev p').forEach(p=>{
      if(p.dataset.nocturneDecorated)return;
      const text=p.textContent||'';
      const parts=text.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
      if(parts.length<2)return;
      p.dataset.nocturneDecorated='1';
      const main=document.createElement('div');
      main.className='evidenceSummary';
      main.textContent=parts[0];
      const details=document.createElement('details');
      details.className='evidenceNotes';
      const summary=document.createElement('summary');
      summary.textContent='FORENSIC NOTES / LIMITATIONS';
      details.appendChild(summary);
      parts.slice(1).forEach(part=>{
        const block=document.createElement('p');
        block.textContent=part;
        details.appendChild(block);
      });
      p.replaceWith(main,details);
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    #evidence .evidenceSummary{margin:0 0 8px;line-height:1.55}
    #evidence .evidenceNotes{margin-top:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:7px}
    #evidence .evidenceNotes summary{cursor:pointer;font-size:.72rem;letter-spacing:.08em;color:var(--muted,#8b949e);font-weight:700}
    #evidence .evidenceNotes p{margin:8px 0 0;line-height:1.5;white-space:normal}
  `;
  document.head.appendChild(style);

  const observer=new MutationObserver(decorate);
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});
  else decorate();
})();
