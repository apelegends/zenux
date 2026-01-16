// Eaglercraft launcher for ZenuxOS (iframe version)

const EAGLER_URL = "https://eaglercraft.com/";

function buildEaglerContent() {
  const gl = hasWebGL();
  const wasm = hasWasm();

  if (!gl || !wasm) {
    return `
      <div class="eagler-root">
        <div style="color:#fca5a5;font-family:system-ui;padding:16px;">
          <h3>Eaglercraft cannot run</h3>
          <p>Reason:</p>
          <ul>
            ${!gl ? "<li>WebGL is not available.</li>" : ""}
            ${!wasm ? "<li>WebAssembly is not available.</li>" : ""}
          </ul>
          <p>Use a modern Chromium-based browser (Chrome / Edge / Brave) with hardware acceleration enabled.</p>
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
  const gl = hasWebGL();
  const wasm = hasWasm();
  if (!gl || !wasm) return;

  const frame = win.querySelector("#eagler-frame");

  frame.addEventListener("load", () => {
    try {
      const _href = frame.contentWindow.location.href;
    } catch (e) {
      frame.srcdoc = `
        <body style="background:#111;color:#eee;font-family:sans-serif;padding:20px;">
          <h2>Eaglercraft could not display inside ZenuxOS</h2>
          <p>The website might block embedding in an iframe.</p>
          <p>Try opening it directly in your browser: <b>${EAGLER_URL}</b></p>
        </body>
      `;
    }
  });

  frame.addEventListener("error", () => {
    frame.srcdoc = `
      <body style="background:#111;color:#eee;font-family:sans-serif;padding:20px;">
        <h2>Eaglercraft failed to load</h2>
        <p>Check if <b>${EAGLER_URL}</b> is online.</p>
      </body>
    `;
  });
}
