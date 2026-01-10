// DEB Inspector for zenuxOS – emulated, honest

function buildDebInspectorContent() {
  return `
    <div class="deb-root">
      <div class="deb-toolbar">
        <button class="deb-btn" id="deb-load">Load .deb</button>
        <button class="deb-btn" id="deb-install">Install to ZenuxOS</button>
      </div>
      <div class="deb-section-title">Package metadata</div>
      <div class="deb-meta" id="deb-meta">
No package loaded.
      </div>
      <div class="deb-section-title" style="margin-top:6px;">Detected languages</div>
      <div class="deb-langs" id="deb-langs">
-
      </div>
      <div class="deb-section-title" style="margin-top:6px;">File overview</div>
      <div class="deb-files" id="deb-files">
-
      </div>
      <div class="deb-section-title" style="margin-top:6px;">Installation log</div>
      <div class="deb-log" id="deb-log">
Ready. Use "Load .deb" or imagine 'sudo dpkg -i file.deb' in Terminal (emulated only).
      </div>
    </div>
  `;
}

function initDebInspectorWindow(win) {
  const loadBtn = win.querySelector("#deb-load");
  const installBtn = win.querySelector("#deb-install");
  const metaEl = win.querySelector("#deb-meta");
  const langsEl = win.querySelector("#deb-langs");
  const filesEl = win.querySelector("#deb-files");
  const logEl = win.querySelector("#deb-log");

  enableHandCursorOn(loadBtn);
  enableHandCursorOn(installBtn);

  let lastPackage = null;

  function log(line) {
    logEl.textContent += "\n" + line;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function resetViews() {
    metaEl.textContent = "No package loaded.";
    langsEl.textContent = "-";
    filesEl.textContent = "-";
  }

  function fakeLanguageDetection(fileList) {
    const langs = new Set();
    fileList.forEach((name) => {
      if (name.endsWith(".js") || name.endsWith(".html")) langs.add("HTML/JS (browser runnable)");
      else if (name.endsWith(".py")) langs.add("Python (not runnable in browser)");
      else if (name.endsWith(".sh")) langs.add("Shell script (not runnable in browser)");
      else if (name.endsWith(".so") || !name.includes(".")) langs.add("Native binary (not runnable in browser)");
      else if (name.endsWith(".cpp") || name.endsWith(".hpp")) langs.add("C++ source");
      else if (name.endsWith(".rb")) langs.add("Ruby");
      else if (name.endsWith(".php")) langs.add("PHP");
      else if (name.endsWith(".go")) langs.add("Go");
      else if (name.endsWith(".rs")) langs.add("Rust");
    });
    if (langs.size === 0) langs.add("Unknown / data only");
    return Array.from(langs);
  }

  async function handleLoadDeb() {
    if (!supportsFS()) {
      log("FS API not supported in this browser. Only virtual inspection is available.");
      return;
    }
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: "Debian package",
          accept: { "application/vnd.debian.binary-package": [".deb"], "*/*": [".deb"] }
        }]
      });
      const file = await fileHandle.getFile();
      const sizeMB = file.size / (1024 * 1024);

      log(`Loaded .deb: ${file.name} (${sizeMB.toFixed(2)} MB)`);
      log("[DEB EMU] Reading package metadata (simulated)…");

      const pkgNameGuess = file.name.replace(/\.deb$/i, "") || "unknown-package";
      const meta = {
        name: pkgNameGuess,
        version: "1.0.0-emulated",
        arch: "amd64 (virtual)",
        maintainer: "unknown@zenux.local",
        description: "Emulated Debian package inside zenuxOS. No real binaries will be executed."
      };
      lastPackage = { file, meta };

      metaEl.textContent =
        `Package: ${meta.name}\n` +
        `Version: ${meta.version}\n` +
        `Architecture: ${meta.arch}\n` +
        `Maintainer: ${meta.maintainer}\n\n` +
        `${meta.description}`;

      const fakeFiles = [
        "usr/bin/" + meta.name,
        "usr/share/doc/" + meta.name + "/README",
        "usr/share/" + meta.name + "/index.html",
        "usr/share/" + meta.name + "/app.js",
        "usr/share/" + meta.name + "/style.css"
      ];

      filesEl.textContent = fakeFiles.join("\n");
      const detected = fakeLanguageDetection(fakeFiles);
      langsEl.textContent = detected.join("\n");

      log("[DEB EMU] Detected languages:");
      detected.forEach((l) => log("  - " + l));
      log("[DEB EMU] Ready to install (virtual only).");
    } catch (e) {
      log("No .deb loaded.");
      resetViews();
    }
  }

  async function handleInstall() {
    if (!lastPackage) {
      log("No package loaded. Load a .deb first.");
      return;
    }

    if (!zenuxRootHandle) {
      log("Zenux root not mounted. Installation simulated only, nothing written to disk.");
      log("[DEB EMU] Installation complete (virtual only).");
      return;
    }

    const { meta } = lastPackage;
    log(`[DEB EMU] Installing ${meta.name} into Zenux/apps/deb-installs/${meta.name} …`);

    try {
      const appsDir = await zenuxRootHandle.getDirectoryHandle("apps", { create: true });
      const debDirRoot = await appsDir.getDirectoryHandle("deb-installs", { create: true });
      const pkgDir = await debDirRoot.getDirectoryHandle(meta.name, { create: true });

      const readmeHandle = await pkgDir.getFileHandle("README.emu.txt", { create: true });
      const writable = await readmeHandle.createWritable();
      await writable.write(
        "This is a virtual installation of " + meta.name + "\n" +
        "Installed by zenuxOS DEB Inspector.\n" +
        "No real system files were changed.\n"
      );
      await writable.close();

      log("[DEB EMU] Created virtual package folder and README.emu.txt");
      log("[DEB EMU] Installation complete (emulated).");
    } catch (e) {
      console.error(e);
      log("[DEB EMU] Installation failed (virtual filesystem error).");
    }
  }

  loadBtn.addEventListener("click", handleLoadDeb);
  installBtn.addEventListener("click", handleInstall);
}
