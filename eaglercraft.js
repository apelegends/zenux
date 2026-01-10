// Eaglercraft launcher for ZenuxOS (iframe version)

const EAGLER_URL = "https://eaglercraft.com/";

function buildEaglerContent() {
  if (!hasWebGL()) {
    return `
      <div class="eagler-root">
        <div style="color:#fca5a5;font-family:system-ui;padding:16px;">
          <h3>WebGL not available</h3>
          <p>Your browser/device does not support WebGL. Eaglercraft cannot run.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="eagler-root">
      <iframe class="eagler-iframe" id="eagler-frame" src="${EAGLER_URL}"></iframe>
    </div>
  `;
}

function initEaglerWindow(win) {
  if (!hasWebGL()) return;

  const frame = win.querySelector("#eagler-frame");

  frame.addEventListener("error", () => {
    frame.srcdoc = `
      <body style="background:#111;color:#eee;font-family:sans-serif;padding:20px;">
        <h2>Eaglercraft failed to load</h2>
        <p>Check if <b>${EAGLER_URL}</b> is online.</p>
      </body>
    `;
  });
}
