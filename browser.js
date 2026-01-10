// Safari Mobile Browser for zenuxOS

function buildSafariContent() {
  return `
    <div class="safari-root">
      <div class="safari-urlbar">
        <input class="safari-url" id="sf-url" placeholder="Search or enter website">
      </div>

      <div class="safari-view">
        <iframe class="safari-iframe" id="sf-iframe"></iframe>
      </div>

      <div class="safari-toolbar">
        <button class="safari-btn" id="sf-back">←</button>
        <button class="safari-btn" id="sf-forward">→</button>
        <button class="safari-btn" id="sf-open">↗</button>
      </div>
    </div>
  `;
}

function initSafariWindow(win) {
  const iframe = win.querySelector("#sf-iframe");
  const urlInput = win.querySelector("#sf-url");
  const backBtn = win.querySelector("#sf-back");
  const forwardBtn = win.querySelector("#sf-forward");
  const openBtn = win.querySelector("#sf-open");

  [backBtn, forwardBtn, openBtn].forEach(enableHandCursorOn);

  let history = [];
  let index = -1;

  function toUrl(raw) {
    let url = raw.trim();
    if (!url) return "";

    if (!/^https?:\/\//i.test(url)) {
      if (url.includes(" ")) {
        url = "https://duckduckgo.com/?q=" + encodeURIComponent(url);
      } else {
        url = "https://" + url;
      }
    }
    return url;
  }

  function navigate(raw) {
    const url = toUrl(raw);
    if (!url) return;

    iframe.src = url;

    history = history.slice(0, index + 1);
    history.push(url);
    index = history.length - 1;

    urlInput.value = url;
  }

  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") navigate(urlInput.value);
  });

  backBtn.addEventListener("click", () => {
    if (index > 0) {
      index--;
      iframe.src = history[index];
      urlInput.value = history[index];
    }
  });

  forwardBtn.addEventListener("click", () => {
    if (index < history.length - 1) {
      index++;
      iframe.src = history[index];
      urlInput.value = history[index];
    }
  });

  openBtn.addEventListener("click", () => {
    if (!urlInput.value.trim()) return;
    window.open(toUrl(urlInput.value), "_blank");
  });

  iframe.addEventListener("load", () => {
    try {
      // will throw if site blocks iframe
      const _test = iframe.contentWindow.location.href;
    } catch {
      iframe.srcdoc = `
        <body style="font-family:-apple-system;padding:20px;background:#f2f2f7;color:#111;">
          <h2>Website blocked</h2>
          <p>This site does not allow loading inside Safari iframe.</p>
          <p>Use the ↗ button to open it in a new tab.</p>
        </body>
      `;
    }
  });

  navigate("https://example.com");
}
