(() => {
  const STYLE_ID = 'nocturne-cctv-overlay-style';
  const OVERLAY_CLASS = 'nocturne-cctv-overlay';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .visualbox.nocturne-cctv-ready {
        position: relative !important;
        overflow: hidden !important;
        background: #050608;
      }

      .visualbox.nocturne-cctv-ready > img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .visualbox.nocturne-cctv-ready > .overlay {
        display: none !important;
      }

      .${OVERLAY_CLASS} {
        position: absolute;
        inset: 0;
        z-index: 5;
        pointer-events: none;
        color: rgba(238, 255, 238, .9);
        font-family: "IBM Plex Mono", "Courier New", monospace;
        font-size: clamp(8px, 1.35vw, 12px);
        font-weight: 500;
        letter-spacing: .045em;
        text-shadow: 0 1px 2px rgba(0,0,0,.9), 0 0 3px rgba(0,0,0,.75);
      }

      .${OVERLAY_CLASS} .cam {
        position: absolute;
        top: 3.5%;
        left: 3.5%;
        white-space: nowrap;
      }

      .${OVERLAY_CLASS} .rec {
        position: absolute;
        top: 3.5%;
        right: 3.5%;
        white-space: nowrap;
      }

      .${OVERLAY_CLASS} .rec-dot {
        display: inline-block;
        width: .62em;
        height: .62em;
        margin-right: .38em;
        border-radius: 50%;
        background: #ff4242;
        box-shadow: 0 0 5px rgba(255,66,66,.8);
        vertical-align: -.03em;
      }

      .${OVERLAY_CLASS} .time {
        position: absolute;
        right: 3.5%;
        bottom: 4%;
        font-size: clamp(10px, 1.7vw, 15px);
        letter-spacing: .06em;
        white-space: nowrap;
      }

      .${OVERLAY_CLASS} .date {
        position: absolute;
        left: 3.5%;
        bottom: 4%;
        opacity: .82;
        white-space: nowrap;
      }

      .${OVERLAY_CLASS} .scanline {
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          to bottom,
          rgba(255,255,255,.018) 0,
          rgba(255,255,255,.018) 1px,
          transparent 1px,
          transparent 4px
        );
        opacity: .22;
        mix-blend-mode: screen;
      }

      .${OVERLAY_CLASS} .vignette {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,.3) 100%);
      }
    `;
    document.head.appendChild(style);
  }

  function parseCctvMetadata(box) {
    const original = box.querySelector('.overlay');
    const text = original?.textContent?.replace(/\s+/g, ' ').trim() || '';

    if (!/\bCCTV\b/i.test(text)) return null;

    const camera = text.match(/\bCAM-[A-Z0-9-]+\b/i)?.[0] || 'CAM-01';
    const time = text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)?.[0] || '';

    return { camera: camera.toUpperCase(), time };
  }

  function apply(box) {
    if (!box || box.classList.contains('nocturne-cctv-ready')) return;

    const metadata = parseCctvMetadata(box);
    if (!metadata) return;

    installStyles();

    const image = box.querySelector('img');
    if (!image) return;

    box.classList.add('nocturne-cctv-ready');

    const overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    overlay.innerHTML = `
      <div class="cam">${metadata.camera}</div>
      <div class="rec"><span class="rec-dot"></span>REC</div>
      <div class="date">NOCTURNE SECURITY SYSTEM</div>
      <div class="time">${metadata.time || '--:--:--'}</div>
      <div class="scanline"></div>
      <div class="vignette"></div>
    `;

    box.appendChild(overlay);
  }

  function scan(root = document) {
    root.querySelectorAll?.('.visualbox').forEach(apply);
  }

  function boot() {
    installStyles();
    scan();

    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
