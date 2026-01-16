// ===== SIMPLE CURSOR HELPER =====
function enableHandCursorOn(el) {
  if (!el) return;
  el.addEventListener("mouseenter", () => {
    el.style.cursor = "pointer";
  });
  el.addEventListener("mouseleave", () => {
    el.style.cursor = "default";
  });
}

// ===== ELEMENTS =====
const bootMonitor = document.getElementById("boot-monitor");
const bootMonitorLog = document.getElementById("boot-monitor-log");
const bootSelectBtn = document.getElementById("boot-select-folder");

const desktop = document.getElementById("desktop");
const taskbar = document.getElementById("taskbar");
const taskApps = document.getElementById("task-apps");
const timeBox = document.getElementById("task-time");
const tempBox = document.getElementById("task-temp");
const webglBox = document.getElementById("task-webgl");

const aboutButton = document.getElementById("about-button");
const startLogo = document.getElementById("start-logo");
const startMenu = document.getElementById("start-menu");

// Login / trial
const loginOverlay = document.getElementById("login-overlay");
const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const loginError = document.getElementById("login-error");
const loginSubmit = document.getElementById("login-submit");
const loginContinue = document.getElementById("login-continue");

const trialOverlay = document.getElementById("trial-overlay");
const trialDevUnlock = document.getElementById("trial-dev-unlock");

// FS + state
let zenuxRootHandle = null;
let configDirHandle = null;
let windowIdCounter = 0;
const windowsById = new Map();

// Temperature
let currentTemp = 35;
let tempInterval = null;

// Trial / login
const TRIAL_DURATION_MS = 30 * 60 * 1000;
let trialStartTime = Date.now();
let trialInterval = null;
let trialUnlocked = false;
let isAdmin = false;

// ===== ZENUX CORE WASM =====
let coreReady = false;
let core = {
  init: null,
  getUptimeMs: null,
  getMajor: null,
  getMinor: null,
  getPatch: null,
  getCpuMhz: null,
  getRamMb: null,
};

function initZenuxCore() {
  if (typeof Module === "undefined") {
    console.warn("zenux_core Module not found");
    return;
  }

  Module.onRuntimeInitialized = () => {
    core.init = Module.cwrap("zenux_init", null, ["number"]);
    core.getUptimeMs = Module.cwrap("zenux_get_uptime_ms", "number", ["number"]);
    core.getMajor = Module.cwrap("zenux_get_major_version", "number", []);
    core.getMinor = Module.cwrap("zenux_get_minor_version", "number", []);
    core.getPatch = Module.cwrap("zenux_get_patch_version", "number", []);
    core.getCpuMhz = Module.cwrap("zenux_get_fake_cpu_mhz", "number", []);
    core.getRamMb = Module.cwrap("zenux_get_fake_ram_mb", "number", []);

    core.init(Date.now());
    coreReady = true;
    console.log("Zenux Core WASM initialized");
  };
}
initZenuxCore();

// ===== WEBGL & WEBASSEMBLY DETECTION =====
function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function hasWasm() {
  try {
    return typeof WebAssembly === "object" &&
           typeof WebAssembly.instantiate === "function";
  } catch {
    return false;
  }
}

// ===== BOOT LOG =====
function logBoot(line) {
  bootMonitorLog.textContent += line + "\n";
  bootMonitorLog.scrollTop = bootMonitorLog.scrollHeight;
}

logBoot("[REAL] zenuxOS 1.2.0 bootloader started");
logBoot("[FAKE] Mounting /dev/html0 ...");
logBoot("[FAKE] Checking virtual sectors ... OK");

logBoot(
  hasWebGL()
    ? "[REAL] WebGL detected."
    : "[WARN] WebGL NOT available."
);

logBoot(
  hasWasm()
    ? "[REAL] WebAssembly detected."
    : "[WARN] WebAssembly NOT available."
);

logBoot(
  hasWebGL() && hasWasm()
    ? "[REAL] Environment supports WebGL/WASM clients."
    : "[WARN] Environment may NOT support WebGL/WASM clients."
);

logBoot("[REAL] Waiting for storage folder selection…");

function supportsFS() {
  return !!window.showDirectoryPicker;
}

async function selectZenuxFolder() {
  if (!supportsFS()) {
    logBoot("[REAL] File System Access API not supported.");
    logBoot("[FAKE] Running zenuxOS in virtual mode (no real disk).");
    startZenuxWithoutFolder();
    return;
  }

  try {
    logBoot("[REAL] Opening folder picker…");
    const rootHandle = await window.showDirectoryPicker();
    const perm = await rootHandle.requestPermission({ mode: "readwrite" });

    if (perm !== "granted") {
      logBoot("[REAL] Permission denied for selected folder.");
      return;
    }

    logBoot("[REAL] Permission granted.");
    logBoot("[FAKE] Spinning up HTML kernel modules…");
    const zenuxDir = await rootHandle.getDirectoryHandle("Zenux", { create: true });
    await zenuxDir.getDirectoryHandle("system", { create: true });
    await zenuxDir.getDirectoryHandle("apps", { create: true });
    await zenuxDir.getDirectoryHandle("user", { create: true });
    await zenuxDir.getDirectoryHandle("logs", { create: true });
    await zenuxDir.getDirectoryHandle("Downloads", { create: true });
    configDirHandle = await zenuxDir.getDirectoryHandle("config", { create: true });

    zenuxRootHandle = zenuxDir;

    logBoot("[REAL] Zenux structure ready.");
    logBoot("[FAKE] Injecting zenuxOS desktop compositor…");
    logBoot("[REAL] Launching desktop.");

    startZenuxDesktop();
  } catch (err) {
    console.error(err);
    logBoot("[REAL] Error during folder selection / structure creation.");
  }
}

bootSelectBtn.addEventListener("click", selectZenuxFolder);
enableHandCursorOn(bootSelectBtn);

function startZenuxDesktop() {
  setTimeout(() => {
    bootMonitor.classList.add("hidden");
    desktop.classList.remove("hidden");
    taskbar.classList.remove("hidden");
    requestAnimationFrame(() => {
      desktop.classList.add("visible");
    });
    startSystem();
    showSystemMessagePopup();
    setTimeout(showLoginOverlay, 700);
  }, 500);
}

function startZenuxWithoutFolder() {
  zenuxRootHandle = null;
  startZenuxDesktop();
}

// ===== SYSTEM START =====
function startSystem() {
  if (!tempInterval) tempInterval = setInterval(updateTemp, 1500);
  updateTime();
  updateWebGLStatus();

  if (!trialInterval) {
    trialStartTime = Date.now();
    trialInterval = setInterval(checkTrial, 1000);
  }
}

function updateTime() {
  const d = new Date();
  timeBox.textContent = d.toLocaleTimeString();
}
setInterval(updateTime, 1000);

function updateTemp() {
  const delta = (Math.random() - 0.4) * 2;
  currentTemp = Math.max(30, Math.min(currentTemp + delta, 55));
  tempBox.textContent = `Temp: ${currentTemp.toFixed(1)}°C`;
}

function updateWebGLStatus() {
  const gl = hasWebGL();
  const wasm = hasWasm();
  if (gl && wasm) {
    webglBox.textContent = "WebGL/WASM: OK";
  } else if (gl && !wasm) {
    webglBox.textContent = "WebGL: OK, WASM: NO";
  } else if (!gl && wasm) {
    webglBox.textContent = "WebGL: NO, WASM: OK";
  } else {
    webglBox.textContent = "WebGL/WASM: NOT AVAILABLE";
  }
}

// ===== TRIAL TIMER =====
function pauseZenuxForTrial() {
  desktop.classList.add("hidden");
  taskbar.classList.add("hidden");
  trialOverlay.classList.remove("hidden");
}

function checkTrial() {
  if (trialUnlocked) return;
  const elapsed = Date.now() - trialStartTime;
  if (elapsed >= TRIAL_DURATION_MS) {
    pauseZenuxForTrial();
    clearInterval(trialInterval);
    trialInterval = null;
  }
}

trialDevUnlock.addEventListener("click", () => {
  trialUnlocked = true;
  trialOverlay.classList.add("hidden");
  desktop.classList.remove("hidden");
  taskbar.classList.remove("hidden");
});

// ===== LOGIN OVERLAY LOGIC =====
const ADMIN_USER = "apexlegends";
const ADMIN_PASS_HASH = "22032014aA@".split("").reverse().join("");

function checkAdminPassword(input) {
  return input.split("").reverse().join("") === ADMIN_PASS_HASH;
}

function showLoginOverlay() {
  loginOverlay.classList.remove("hidden");
  loginUser.value = "";
  loginPass.value = "";
  loginError.textContent = "";
  loginUser.focus();
}

loginSubmit.addEventListener("click", () => {
  const user = loginUser.value.trim();
  const pass = loginPass.value;
  if (user !== ADMIN_USER || !checkAdminPassword(pass)) {
    loginError.textContent = "Invalid admin credentials.";
    return;
  }
  isAdmin = true;
  loginOverlay.classList.add("hidden");
});

loginContinue.addEventListener("click", () => {
  isAdmin = false;
  loginOverlay.classList.add("hidden");
});

// ===== WINDOW SYSTEM =====
function createWindow(appId, title, contentHTML) {
  const id = "win-" + ++windowIdCounter;

  const win = document.createElement("div");
  win.className = "zenux-window";
  win.dataset.appId = appId;
  win.dataset.winId = id;
  win.style.left = 120 + windowIdCounter * 20 + "px";
  win.style.top = 80 + windowIdCounter * 20 + "px";

  win.innerHTML = `
    <div class="window-titlebar">
      <div class="window-title">${title}</div>
      <div class="window-controls">
        <button class="win-btn win-min" title="Minimize"><span>─</span></button>
        <button class="win-btn win-full" title="Maximize"><span>□</span></button>
        <button class="win-btn win-close" title="Close"><span>✕</span></button>
      </div>
    </div>
    <div class="window-content">${contentHTML}</div>
  `;

  desktop.appendChild(win);

  const taskBtn = document.createElement("button");
  taskBtn.className = "task-btn";
  taskBtn.textContent = title;
  taskBtn.dataset.winId = id;
  taskBtn.addEventListener("click", () => {
    win.style.display = "flex";
    win.style.zIndex = String(Date.now());
  });
  enableHandCursorOn(taskBtn);
  taskApps.appendChild(taskBtn);

  windowsById.set(id, { win, taskBtn });

  const titlebar = win.querySelector(".window-titlebar");
  const btnClose = win.querySelector(".win-close");
  const btnMin = win.querySelector(".win-min");
  const btnFull = win.querySelector(".win-full");
  [btnClose, btnMin, btnFull].forEach(enableHandCursorOn);

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  titlebar.addEventListener("mousedown", (e) => {
    dragging = true;
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;
    win.style.zIndex = String(Date.now());
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });

  document.addEventListener("mousemove", (e) => {
    if (dragging) {
      win.style.left = e.clientX - offsetX + "px";
      win.style.top = e.clientY - offsetY + "px";
    }
  });

  btnClose.addEventListener("click", () => {
    desktop.removeChild(win);
    taskApps.removeChild(taskBtn);
    windowsById.delete(id);
  });

  btnMin.addEventListener("click", () => {
    win.style.display = "none";
  });

  let isFull = false;
  const originalBounds = {
    left: win.style.left,
    top: win.style.top,
    width: "",
    height: "",
  };

  btnFull.addEventListener("click", () => {
    if (!isFull) {
      originalBounds.left = win.style.left;
      originalBounds.top = win.style.top;
      originalBounds.width = win.style.width;
      originalBounds.height = win.style.height;
      win.style.left = "0px";
      win.style.top = "0px";
      win.style.width = window.innerWidth + "px";
      win.style.height = window.innerHeight - 38 + "px";
      isFull = true;
    } else {
      win.style.left = originalBounds.left;
      win.style.top = originalBounds.top;
      win.style.width = originalBounds.width || "540px";
      win.style.height = originalBounds.height || "340px";
      isFull = false;
    }
  });

  return win;
}

function openOrFocusApp(appId, title, contentBuilder, initFn) {
  for (const { win } of windowsById.values()) {
    if (win.dataset.appId === appId) {
      win.style.display = "flex";
      win.style.zIndex = String(Date.now());
      return win;
    }
  }
  const html = contentBuilder();
  const win = createWindow(appId, title, html);
  if (typeof initFn === "function") initFn(win);
  return win;
}

// ===== SYSTEM MESSAGE =====
function showSystemMessagePopup() {
  const content = `
    <div class="system-message">
      <div class="system-message-title">ZenuxOS System Message</div>
      <div>
        made by apex: alex nguyen<br>
        2026<br>
        version 1.2.0
      </div>
    </div>
  `;
  openOrFocusApp("sysmsg", "ZenuxOS Info", () => content);
}

// ===== EXPLORER =====
function buildExplorerContent() {
  return `
    <div class="explorer-list" id="explorer-list">
Loading Zenux filesystem…
    </div>
  `;
}

async function initExplorerWindow(win) {
  const listEl = win.querySelector("#explorer-list");
  if (!zenuxRootHandle) {
    listEl.textContent = "Zenux root not available (virtual mode).";
    return;
  }

  let out = "Zenux FS (real folder)\n\n";

  async function listDir(handle, indent) {
    for await (const [name, entry] of handle.entries()) {
      out += indent + (entry.kind === "directory" ? "📁 " : "📄 ") + name + "\n";
    }
  }

  await listDir(zenuxRootHandle, "");
  listEl.textContent = out;
}

// ===== TERMINAL =====
function buildTerminalContent() {
  return `
    <div class="terminal">
      <div class="terminal-output" id="term-out"></div>
      <div class="terminal-input-row">
        <span class="terminal-prompt">zenux@os:~$</span>
        <input class="terminal-input" id="term-in" autocomplete="off" />
      </div>
    </div>
  `;
}

function initTerminalWindow(win) {
  const out = win.querySelector("#term-out");
  const input = win.querySelector("#term-in");

  function println(text = "") {
    out.textContent += text + "\n";
    out.scrollTop = out.scrollHeight;
  }

  async function handleCommand(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [cmd, ...args] = trimmed.split(/\s+/);

    if (cmd === "help") {
      println("Commands: help, ls, clear, echo");
    } else if (cmd === "ls") {
      if (!zenuxRootHandle) {
        println("Zenux root not mounted (virtual mode).");
        return;
      }
      for await (const [name, entry] of zenuxRootHandle.entries()) {
        println((entry.kind === "directory" ? "d " : "f ") + name);
      }
    } else if (cmd === "clear") {
      out.textContent = "";
    } else if (cmd === "echo") {
      println(args.join(" "));
    } else {
      println(`${cmd}: command not found`);
    }
  }

  println("zenuxOS terminal");
  println("Type 'help' for commands.");
  println("");

  input.focus();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const line = input.value;
      println(`zenux@os:~$ ${line}`);
      handleCommand(line);
      input.value = "";
    }
  });

  win.addEventListener("mousedown", () => input.focus());
}

// ===== ABOUT =====
function buildAboutContent() {
  return `
    <div class="about-root">
      <h3 style="margin-top:0;margin-bottom:4px;">About zenuxOS</h3>
      <p style="margin-top:0;margin-bottom:6px;">
        zenuxOS 1.2.0 — browser-based OS simulation with Safari, DEB Inspector, Eaglercraft and a C++ WebAssembly core.
      </p>
      <p style="margin-top:0;margin-bottom:6px;">
        made by alex nguyen/apexlegends
      </p>
      <p style="margin-top:0;">
        WebGL games (like Eaglercraft) run for real if your browser supports WebGL.
      </p>
    </div>
  `;
}

// ===== ZENUX CORE APP =====
function buildCoreContent() {
  return `
    <div class="about-root" id="core-root">
      <h3 style="margin-top:0;margin-bottom:4px;">ZenuxOS Core 1.2.0</h3>
      <p id="core-version">Loading core version…</p>
      <p id="core-uptime">Uptime: -</p>
      <p id="core-hw">CPU/RAM: -</p>
    </div>
  `;
}

function initCoreWindow(win) {
  const verEl = win.querySelector("#core-version");
  const upEl = win.querySelector("#core-uptime");
  const hwEl = win.querySelector("#core-hw");

  function refresh() {
    if (!coreReady) {
      verEl.textContent = "Core not ready (WASM still loading)…";
      return;
    }
    const now = Date.now();
    const upMs = core.getUptimeMs(now);
    const sec = Math.floor(upMs / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;

    const v = `${core.getMajor()}.${core.getMinor()}.${core.getPatch()}`;
    verEl.textContent = `Core version: ${v}`;
    upEl.textContent = `Uptime: ${min}m ${s}s`;
    hwEl.textContent = `CPU: ${core.getCpuMhz()} MHz (fake) · RAM: ${core.getRamMb()} MB (fake)`;
  }

  refresh();
  const interval = setInterval(refresh, 1000);
  win.addEventListener("DOMNodeRemoved", () => clearInterval(interval));
}

// ===== DESKTOP ICONS + START MENU =====
const desktopIconsContainer = document.getElementById("desktop-icons");
desktopIconsContainer.querySelectorAll(".desktop-icon").forEach((btn) => {
  enableHandCursorOn(btn);
  btn.addEventListener("click", () => {
    const app = btn.getAttribute("data-app");
    launchAppById(app);
  });
});

enableHandCursorOn(startLogo);
startLogo.addEventListener("click", () => {
  startMenu.classList.toggle("hidden");
});

startMenu.querySelectorAll(".start-menu-item").forEach((btn) => {
  enableHandCursorOn(btn);
  btn.addEventListener("click", () => {
    const app = btn.getAttribute("data-app");
    startMenu.classList.add("hidden");
    launchAppById(app);
  });
});

enableHandCursorOn(aboutButton);
aboutButton.addEventListener("click", () => {
  launchAppById("about");
});

function launchAppById(app) {
  if (app === "explorer") {
    openOrFocusApp("explorer", "Zenux Explorer", buildExplorerContent, initExplorerWindow);
  } else if (app === "browser") {
    openOrFocusApp("browser", "Safari", buildSafariContent, initSafariWindow);
  } else if (app === "terminal") {
    openOrFocusApp("terminal", "Zenux Terminal", buildTerminalContent, initTerminalWindow);
  } else if (app === "debinspector") {
    openOrFocusApp("debinspector", "DEB Inspector", buildDebInspectorContent, initDebInspectorWindow);
  } else if (app === "eaglercraft") {
    openOrFocusApp("eaglercraft", "Eaglercraft", buildEaglerContent, initEaglerWindow);
  } else if (app === "core") {
    openOrFocusApp("core", "Zenux Core", buildCoreContent, initCoreWindow);
  } else if (app === "about") {
    openOrFocusApp("about", "About zenuxOS", buildAboutContent);
  }
}
