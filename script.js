const desktop = document.getElementById("desktop");
const iconButtons = document.querySelectorAll(".desktop-icon");
const startButton = document.querySelector(".start-button");
const startMenu = document.getElementById("startMenu");
const startMenuButtons = startMenu.querySelectorAll("[data-app]");
const taskbarApps = document.getElementById("taskbarApps");
const clock = document.getElementById("taskbarClock");
const windowTemplate = document.getElementById("window-template");
const wifiStatusEl = document.getElementById("wifiStatus");
const alertStatusEl = document.getElementById("alertStatus");

// --- Power & Login Logic ---
const powerScreen = document.getElementById("power-screen");
const powerBtn = document.getElementById("power-btn");
const loginScreen = document.getElementById("login-screen");
const loginPassword = document.getElementById("login-password");
const desktopScreen = document.getElementById("desktop-screen");
const loginStatus = document.getElementById("login-status");

const loginSubmitBtn = document.getElementById("login-submit-btn");
const togglePasswordBtn = document.getElementById("toggle-password");

const TARGET_PASSWORD = "EndTheGame"; // The password that will be auto-typed
let passwordIndex = 0;

if (togglePasswordBtn && loginPassword) {
  togglePasswordBtn.addEventListener("click", () => {
    const type = loginPassword.getAttribute("type") === "password" ? "text" : "password";
    loginPassword.setAttribute("type", type);
    togglePasswordBtn.textContent = type === "password" ? "👁️" : "🔒";
  });
}

if (powerBtn) {
  powerBtn.addEventListener("click", () => {
    // Show login screen immediately behind power screen
    loginScreen.style.display = "flex";
    loginScreen.style.opacity = "1"; // Ensure it's visible
    
    // Fade out power screen
    powerScreen.style.opacity = "0";
    
    setTimeout(() => {
      powerScreen.style.display = "none";
      loginPassword.focus();
    }, 500);
  });
}

// Developer Reset Button
const devResetBtn = document.getElementById("dev-reset-btn");
if (devResetBtn) {
  devResetBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent triggering power button if nested (though it's not)
    if (confirm("Reset LocalStorage and reload?")) {
      localStorage.clear();
      location.reload();
    }
  });
}

function attemptLogin() {
  if (passwordIndex === TARGET_PASSWORD.length) {
    loginStatus.textContent = "Authenticating...";
    setTimeout(() => {
      loginStatus.textContent = "Access Granted";
      loginStatus.style.color = "#0f0";
      setTimeout(enterDesktop, 800);
    }, 600);
  } else {
    loginStatus.textContent = "Access Denied";
    loginStatus.style.color = "#f00";
    setTimeout(() => {
      loginStatus.textContent = "";
    }, 1000);
  }
}

if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener("click", attemptLogin);
}

if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => {
    // Allow Enter to login
    if (e.key === "Enter") {
      attemptLogin();
      return;
    }

    // Allow backspace to delete
    if (e.key === "Backspace") {
      e.preventDefault();
      if (passwordIndex > 0) {
        passwordIndex--;
        loginPassword.value = loginPassword.value.slice(0, -1);
      }
      return;
    }
    
    // Ignore non-character keys (like Shift, Ctrl, etc.)
    if (e.key.length > 1) return;

    e.preventDefault();
    
    if (passwordIndex < TARGET_PASSWORD.length) {
      // Add the correct character regardless of what was typed
      const charToAdd = TARGET_PASSWORD[passwordIndex];
      loginPassword.value += charToAdd;
      passwordIndex++;
    }
  });
}

function enterDesktop() {
  loginScreen.style.opacity = "0";
  setTimeout(() => {
    loginScreen.style.display = "none";
    desktopScreen.style.display = "block";
    // Initialize any desktop stuff if needed
  }, 500);
}

const state = {
  zIndex: 10,
  windows: new Map(),
};

const apps = {
  browser: {
    title: "Deep Web Browser",
    render: (container) => {
      container.innerHTML = `
        <section class="browser-shell">
          <div class="browser-chrome">
            <div class="chrome-left">
              <button class="chrome-btn" id="nav-back" aria-label="Zpět">←</button>
              <button class="chrome-btn" id="nav-forward" aria-label="Vpřed">→</button>
              <button class="chrome-btn" id="nav-refresh" aria-label="Obnovit">⟳</button>
              <span class="status-light" id="tor-status" data-state="offline">Tor: Offline</span>
            </div>
            <div class="chrome-address">
              <span class="padlock">🟣</span>
              <input id="address-bar" type="text" value="about:tor" spellcheck="false" aria-label="Adresa" />
              <button class="chrome-btn" id="nav-go">Go</button>
            </div>
            <div class="chrome-right">
              <button class="chrome-btn" id="nav-deepsearch">DeepSearch</button>
            </div>
          </div>
          <div class="browser-main" id="browser-main"></div>
        </section>
      `;

      const view = container.querySelector('#browser-main');
      const addressBar = container.querySelector('#address-bar');
      const torStatus = container.querySelector('#tor-status');
      const backBtn = container.querySelector('#nav-back');
      const fwdBtn = container.querySelector('#nav-forward');
      const refreshBtn = container.querySelector('#nav-refresh');
      const goBtn = container.querySelector('#nav-go');
      const deepBtn = container.querySelector('#nav-deepsearch');

      const browserState = {
        history: [],
        index: -1,
      };

      const setTorStatus = (stateLabel, text) => {
        torStatus.dataset.state = stateLabel;
        torStatus.textContent = text;
      };

      const pushHistory = (pageId) => {
        if (browserState.index < browserState.history.length - 1) {
          browserState.history = browserState.history.slice(0, browserState.index + 1);
        }
        browserState.history.push(pageId);
        browserState.index = browserState.history.length - 1;
        updateNavButtons();
      };

      const updateNavButtons = () => {
        backBtn.disabled = browserState.index <= 0;
        fwdBtn.disabled = browserState.index >= browserState.history.length - 1;
      };

      const goTo = (pageId, push = true) => {
        const resolved = resolvePage(pageId);
        renderPage(resolved);
        if (push) pushHistory(resolved);
        addressBar.value = resolved;
        gameState.currentPage = resolved;
        checkThreats();
      };

      const resolvePage = (input) => {
        if (!input) return 'about:tor';
        const cleaned = input.trim();
        if (cleaned.startsWith('deeppedia')) return cleaned;
        if (cleaned === 'deepsearch' || cleaned === 'home') return 'deeppedia://';
        if (cleaned.startsWith('http')) return 'about:tor';
        return cleaned;
      };

      const renderPage = (pageId) => {
        const page = deepSearchPages[pageId];
        if (!gameState.torInstalled && page?.requiresTor) {
          view.innerHTML = renderTorInstallCard();
          wireTorButtons();
          addressBar.value = 'about:tor';
          return;
        }
        if (!gameState.torRunning && page?.requiresTor) {
          view.innerHTML = renderTorInstallCard(true);
          wireTorButtons();
          addressBar.value = 'about:tor';
          return;
        }

        if (!page) {
          view.innerHTML = `<div class="article"><h2>404</h2><p>Stránka nenalezena.</p></div>`;
          return;
        }

        if (page.type === 'tor-install') {
          view.innerHTML = renderTorInstallCard();
          wireTorButtons();
          return;
        }

        if (page.type === 'directory') {
          view.innerHTML = `
            <div class="directory">
              <header>
                <p class="eyebrow">${page.label}</p>
                <h2>${page.title}</h2>
                <p class="muted">${page.description}</p>
              </header>
              <div class="deep-grid">
                ${page.links.map(link => `
                  <article class="deep-card" data-target="${link.id}">
                    <div class="card-top">
                      <span class="chip">${link.chip}</span>
                      <span class="mini-url">${link.url}</span>
                    </div>
                    <h3>${link.title}</h3>
                    <p>${link.description}</p>
                  </article>
                `).join('')}
              </div>
            </div>
          `;
          view.querySelectorAll('.deep-card').forEach((card) => {
            card.addEventListener('click', () => goTo(card.dataset.target));
          });
          return;
        }

        if (page.type === 'article') {
          view.innerHTML = `
            <article class="article">
              <p class="eyebrow">${page.label}</p>
              <h2>${page.title}</h2>
              ${page.body.map((p) => `<p>${p}</p>`).join('')}
              ${page.fragments ? `<div class="fragments" id="fragment-wrap">${page.fragments.map((f, idx) => `<span class="fragment" data-fragment="${idx}">${f}</span>`).join('')}</div><button class="chrome-btn prominent" id="assemble-key">Sestavit klíč</button><div id="key-status" class="muted"></div>` : ''}
            </article>
          `;
          if (page.fragments) {
            const btn = view.querySelector('#assemble-key');
            const status = view.querySelector('#key-status');
            btn.addEventListener('click', () => {
              const code = page.fragments.join('');
              status.textContent = `Číselný klíč: ${code}`;
              status.classList.add('found');
              if (!gameState.numericKeyFound) {
                gameState.numericKeyFound = true;
                gameState.keysFound += 1;
                incrementAlerts('Numeric key');
              }
            });
          }
          return;
        }
      };

      const renderTorInstallCard = (installedButOffline = false) => {
        const stateText = gameState.torInstalled ? 'Staženo' : 'Není staženo';
        const connectText = gameState.torRunning ? 'Connected' : installedButOffline ? 'Připoj Tor' : 'Neaktivní';
        return `
          <div class="tor-card">
            <div>
              <p class="eyebrow">Tor Client</p>
              <h2>Stáhni Tor pro DeepSearch</h2>
              <p class="muted">Simulovaný download pro odemknutí deep web prohlížeče. Po stažení spusť klient a vstup do Deeppedia.</p>
              <div class="tor-status-line">
                <span>Balík: ${stateText}</span>
                <span>Stav: ${connectText}</span>
              </div>
              <div class="tor-actions">
                <button class="chrome-btn prominent" id="tor-download">Stáhnout</button>
                <button class="chrome-btn" id="tor-launch" ${gameState.torInstalled ? '' : 'disabled'}>Spustit DeepSearch</button>
              </div>
            </div>
            <div class="tor-side">
              <div class="tor-meter" aria-label="download-progress"><span id="tor-meter-fill" style="width: ${gameState.torInstalled ? '100%' : '8%'}"></span></div>
              <small class="muted">SHA256 ověřeno · onion route ready</small>
            </div>
          </div>
        `;
      };

      const wireTorButtons = () => {
        const downloadBtn = view.querySelector('#tor-download');
        const launchBtn = view.querySelector('#tor-launch');
        const meter = view.querySelector('#tor-meter-fill');
        if (downloadBtn) {
          downloadBtn.addEventListener('click', () => {
            downloadBtn.disabled = true;
            downloadBtn.textContent = 'Stahuji...';
            let progress = gameState.torInstalled ? 100 : 10;
            const iv = setInterval(() => {
              progress = Math.min(100, progress + Math.random() * 18 + 8);
              if (meter) meter.style.width = `${progress}%`;
              if (progress >= 100) {
                clearInterval(iv);
                gameState.torInstalled = true;
                downloadBtn.textContent = 'Staženo';
                if (launchBtn) launchBtn.disabled = false;
                setTorStatus('installed', 'Tor: Staženo');
                incrementAlerts('Tor připraven');
              }
            }, 220);
          });
        }
        if (launchBtn) {
          launchBtn.addEventListener('click', () => {
            if (!gameState.torInstalled) return;
            gameState.torRunning = true;
            setTorStatus('online', 'Tor: Online');
            incrementAlerts('Tor spuštěn');
            goTo('deeppedia://');
          });
        }
      };

      backBtn.addEventListener('click', () => {
        if (browserState.index <= 0) return;
        browserState.index -= 1;
        const target = browserState.history[browserState.index];
        renderPage(target);
        addressBar.value = target;
        updateNavButtons();
      });

      fwdBtn.addEventListener('click', () => {
        if (browserState.index >= browserState.history.length - 1) return;
        browserState.index += 1;
        const target = browserState.history[browserState.index];
        renderPage(target);
        addressBar.value = target;
        updateNavButtons();
      });

      refreshBtn.addEventListener('click', () => {
        if (browserState.index < 0) return;
        const target = browserState.history[browserState.index];
        renderPage(target);
      });

      goBtn.addEventListener('click', () => goTo(addressBar.value));
      addressBar.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') goTo(addressBar.value);
      });
      deepBtn.addEventListener('click', () => goTo('deeppedia://'));

      // initial render
      setTorStatus(gameState.torRunning ? 'online' : gameState.torInstalled ? 'installed' : 'offline', gameState.torRunning ? 'Tor: Online' : gameState.torInstalled ? 'Tor: Staženo' : 'Tor: Offline');
      goTo('about:tor');
    },
  },
  tor: {
    title: "Tor Client",
    render: (container) => {
      container.innerHTML = `
        <section class="tor-installer">
          <h2>Tor Client</h2>
          <p>Stáhni a spusť klient, aby DeepSearch fungoval.</p>
          <div class="tor-installer__actions">
            <button id="tor-install-btn">${gameState.torInstalled ? 'Přeinstalovat' : 'Stáhnout'}</button>
            <button id="tor-run-btn" ${gameState.torInstalled ? '' : 'disabled'}>${gameState.torRunning ? 'Restart' : 'Spustit'}</button>
          </div>
          <div class="tor-installer__status" id="tor-installer-status">${gameState.torRunning ? 'Tor běží' : gameState.torInstalled ? 'Tor stažen' : 'Tor není nainstalován'}</div>
        </section>
      `;
      const installBtn = container.querySelector('#tor-install-btn');
      const runBtn = container.querySelector('#tor-run-btn');
      const status = container.querySelector('#tor-installer-status');

      installBtn.addEventListener('click', () => {
        installBtn.disabled = true;
        installBtn.textContent = 'Stahuji...';
        let progress = 0;
        const iv = setInterval(() => {
          progress += Math.random() * 25 + 10;
          if (progress >= 100) {
            clearInterval(iv);
            gameState.torInstalled = true;
            installBtn.textContent = 'Přeinstalovat';
            runBtn.disabled = false;
            status.textContent = 'Tor stažen';
            incrementAlerts('Tor stažen');
          }
        }, 260);
      });

      runBtn.addEventListener('click', () => {
        if (!gameState.torInstalled) return;
        gameState.torRunning = true;
        status.textContent = 'Tor běží';
        incrementAlerts('Tor spuštěn');
      });
    },
  },
  files: {
    title: "Archive",
    render: (container) => {
      const files = [
        { name: "case-notes.pdf", status: "encrypted" },
        { name: "audio_log_07.wav", status: "needs decode" },
        { name: "door_codes.txt", status: "outdated" },
        { name: "cipher-wheel.ai", status: "trusted" },
      ];

      container.innerHTML = `
        <section class="file-list">
          ${files
            .map(
              (file) => `
                <div class="file-item">
                  <span>${file.name}</span>
                  <small>${file.status}</small>
                </div>
              `
            )
            .join("")}
        </section>
      `;
    },
  },
  notes: {
    title: "Notes",
    render: (container) => {
      const storageKey = "etg-notes";
      const saved = localStorage.getItem(storageKey) ?? "";
      container.innerHTML = `
        <section class="notes-area">
          <textarea placeholder="Zaznamenávej stopy...">${saved}</textarea>
          <small>Ukládá se automaticky</small>
        </section>
      `;

      const textarea = container.querySelector("textarea");
      textarea.addEventListener("input", (event) => {
        localStorage.setItem(storageKey, event.target.value);
      });
    },
  },
  paint: {
    title: "Studio",
    render: (container) => {
      container.innerHTML = `
        <section class="paint">
          <div class="paint-controls">
            <input type="color" value="#8ef2ff" aria-label="Barva štětce" />
            <input type="range" min="2" max="20" value="6" aria-label="Velikost štětce" />
            <button type="button" class="paint-clear">Clear</button>
          </div>
          <canvas class="paint-canvas" width="420" height="240"></canvas>
        </section>
      `;

      const colorPicker = container.querySelector("input[type=color]");
      const sizeSlider = container.querySelector("input[type=range]");
      const clearButton = container.querySelector(".paint-clear");
      const canvas = container.querySelector("canvas");
      const ctx = canvas.getContext("2d");

      const resizeCanvas = () => {
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.clearRect(0, 0, rect.width, rect.height);
      };

      const handleResize = debounce(resizeCanvas, 200);
      resizeCanvas();
      window.addEventListener("resize", handleResize);

      let drawing = false;
      let lastPoint = null;

      const startDrawing = (event) => {
        event.preventDefault();
        drawing = true;
        lastPoint = getCanvasPos(event, canvas);
      };

      const draw = (event) => {
        if (!drawing) return;
        const point = getCanvasPos(event, canvas);
        ctx.strokeStyle = colorPicker.value;
        ctx.lineWidth = Number(sizeSlider.value);
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        lastPoint = point;
      };

      const stopDrawing = () => {
        drawing = false;
      };

      canvas.addEventListener("pointerdown", startDrawing);
      canvas.addEventListener("pointermove", draw);
      window.addEventListener("pointerup", stopDrawing);
      canvas.addEventListener("pointerleave", stopDrawing);

      clearButton.addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    },
  },
  
};

function getCanvasPos(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y };
}

function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

/* Game state and DeepWeb data */
let gameState = {
  isKidnapperActive: false,
  isBreatherActive: false,
  keysFound: 0,
  dosCoin: 100,
  currentIP: "192.168.1.1",
  currentPage: "about:tor",
  torInstalled: false,
  torRunning: false,
  numericKeyFound: false,
  alerts: 0,
};

const deepSearchPages = {
  "about:tor": {
    type: "tor-install",
    requiresTor: false,
  },
  "deeppedia://": {
    type: "directory",
    requiresTor: true,
    label: "DeepSearch",
    title: "Deeppedia (LinkList)",
    description: "Jediný kurátorovaný rozcestník. Zde začneš hledání číselného klíče.",
    links: [
      {
        id: "deeppedia://linklist",
        title: "LinkList",
        description: "Seznam ověřených .onion záznamů (omezený výpis)",
        chip: "onion",
        url: "deeppedia.onion/linklist",
      },
      {
        id: "deeppedia://protocol",
        title: "Routing Protocol",
        description: "Jak deeppedia šifruje metadata (čti před vstupem)",
        chip: "guide",
        url: "deeppedia.onion/protocol",
      },
    ],
  },
  "deeppedia://linklist": {
    type: "directory",
    requiresTor: true,
    label: "LinkList",
    title: "Omezené uzly",
    description: "Vyfiltrované adresy. Některé nesou útržky čísel.",
    links: [
      {
        id: "deeppedia://signal-log",
        title: "Signal Log",
        description: "Poslední telemetrie z darknet relay",
        chip: "log",
        url: "deeppedia.onion/signal-log",
      },
      {
        id: "deeppedia://dead-drop",
        title: "Dead Drop",
        description: "Zahashovaný balík, vyžaduje offline dekódování",
        chip: "bin",
        url: "deeppedia.onion/dead-drop",
      },
      {
        id: "deeppedia://dossiers",
        title: "Dossiers",
        description: "Shrnutí subjektů a jejich zranitelností",
        chip: "ref",
        url: "deeppedia.onion/dossiers",
      },
    ],
  },
  "deeppedia://protocol": {
    type: "article",
    requiresTor: true,
    label: "Deeppedia",
    title: "Provozní protokol",
    body: [
      "DeepSearch tuneluje přes vrstvené uzly. Všechny odkazy začínají deeppedia.onion a jsou podepsané.",
      "Při ztrátě spojení restartuj Tor klient v horním pruhu. Klíče se zobrazují jen při aktivním tunelu.",
    ],
  },
  "deeppedia://signal-log": {
    type: "article",
    requiresTor: true,
    label: "LinkList › Signal",
    title: "Signal Log",
    body: [
      "Synchronizované otisky relays. Každá relace nese číslici, poskládej je.",
      "Vyžadováno: běžící Tor, otevřený DeepSearch."
    ],
    fragments: ["2", "7", "4", "9"],
  },
  "deeppedia://dead-drop": {
    type: "article",
    requiresTor: true,
    label: "LinkList › Drop",
    title: "Dead Drop",
    body: [
      "SHA256: 1f9a..e7. Balík je šifrován. Nápověda: použij klíč z Logu.",
      "Bez správného klíče hrozí zvýšení hrozby (neimplementováno).",
    ],
  },
  "deeppedia://dossiers": {
    type: "article",
    requiresTor: true,
    label: "LinkList › Dossiers",
    title: "Dossiers",
    body: [
      "Subjekty: Breather, Kidnapper. Vstupy pouze pro čtení.",
      "Poznámka: Práce s čísly probíhá v Signal Log.",
    ],
  },
};

function incrementAlerts(message) {
  gameState.alerts += 1;
  updateStatusBar(message);
}

function updateStatusBar(message = '') {
  if (wifiStatusEl) {
    const bars = threatLevel > 70 ? '▂▄__' : threatLevel > 40 ? '▂▄▆_' : '▂▄▆█';
    wifiStatusEl.textContent = `Wi‑Fi ${bars}`;
  }
  if (alertStatusEl) {
    alertStatusEl.textContent = `Alerts: ${gameState.alerts}` + (message ? ` (${message})` : '');
  }
}

function initOrderPuzzle(container, statusEl) {
  const correct = ['🔑', '📡', '☢️'];
  let current = shuffleArray([...correct]);

  const render = () => {
    container.innerHTML = '';
    current.forEach((icon, idx) => {
      const btn = document.createElement('button');
      btn.textContent = icon;
      btn.addEventListener('click', () => {
        // rotate this and next
        const next = (idx + 1) % current.length;
        [current[idx], current[next]] = [current[next], current[idx]];
        render();
        check();
      });
      container.appendChild(btn);
    });
  };

  const check = () => {
    if (current.join('') === correct.join('')) {
      statusEl.textContent = 'Puzzle vyřešeno! Klíč přidán.';
      gameState.keysFound += 1;
      incrementAlerts('Puzzle');
    } else {
      statusEl.textContent = 'Pořadí musí být: 🔑 📡 ☢️';
    }
  };

  render();
  check();
}

function startSequenceHack() {
  const overlay = document.getElementById('popupLayer');
  const box = document.createElement('div');
  box.className = 'door-popup';
  const colors = ['R', 'G', 'B', 'Y'];
  const seqLength = 5;
  const sequence = Array.from({ length: seqLength }, () => colors[Math.floor(Math.random() * colors.length)]);
  let step = 0;
  box.innerHTML = `<div><strong>Memory Hack</strong><p>Opakuj sekvenci barev (R,G,B,Y)</p><div id="seq-display"></div><div id="seq-buttons"></div></div>`;
  overlay.appendChild(box);
  overlay.style.pointerEvents = 'auto';

  const display = box.querySelector('#seq-display');
  const btns = box.querySelector('#seq-buttons');
  colors.forEach((c) => {
    const b = document.createElement('button');
    b.textContent = c;
    b.style.margin = '0 4px';
    b.addEventListener('click', () => {
      if (sequence[step] === c) {
        step += 1;
        if (step === sequence.length) {
          finish(true);
        }
      } else {
        finish(false);
      }
    });
    btns.appendChild(b);
  });

  let idx = 0;
  const showInterval = setInterval(() => {
    display.textContent = sequence.slice(0, idx + 1).join(' ');
    idx += 1;
    if (idx >= sequence.length) {
      clearInterval(showInterval);
      setTimeout(() => (display.textContent = 'Tvůj tah...'), 600);
    }
  }, 600);

  function finish(success) {
    overlay.style.pointerEvents = 'none';
    box.remove();
    if (success) {
      threatLevel = Math.max(0, threatLevel - 25);
      gameState.dosCoin += 5;
      incrementAlerts('Hack úspěšný');
    } else {
      threatLevel = Math.min(100, threatLevel + 10);
      incrementAlerts('Hack selhal');
    }
    checkThreats();
    updateStatusBar();
  }
}

function startNumberHack() {
  const overlay = document.getElementById('popupLayer');
  const box = document.createElement('div');
  box.className = 'door-popup';
  const numbers = shuffleArray([1, 2, 3, 4, 5]);
  let target = 1;
  box.innerHTML = `<div><strong>Rychlý hack</strong><p>Klikej čísla 1-5 ve správném pořadí</p><div id="nums"></div><div id="hack-bar" style="height:10px;background:#222;border-radius:8px;margin-top:8px;"><div id="hack-fill" style="height:10px;background:#8ef2ff;width:0%;border-radius:8px;"></div></div></div>`;
  overlay.appendChild(box);
  overlay.style.pointerEvents = 'auto';
  const nums = box.querySelector('#nums');
  const fill = box.querySelector('#hack-fill');
  const render = () => {
    nums.innerHTML = '';
    numbers.forEach((n, idx) => {
      const b = document.createElement('button');
      b.textContent = n;
      b.style.margin = '0 6px';
      b.addEventListener('click', () => {
        if (n === target) {
          target += 1;
          fill.style.width = `${(target - 1) * 20}%`;
          if (target > 5) success();
        } else {
          failure();
        }
      });
      nums.appendChild(b);
    });
  };
  render();

  const timer = setTimeout(() => failure(), 6000);

  function success() {
    clearTimeout(timer);
    overlay.style.pointerEvents = 'none';
    box.remove();
    threatLevel = Math.max(0, threatLevel - 15);
    gameState.dosCoin += 10;
    incrementAlerts('Hack bonus');
    checkThreats();
    updateStatusBar();
  }

  function failure() {
    clearTimeout(timer);
    overlay.style.pointerEvents = 'none';
    box.remove();
    threatLevel = Math.min(100, threatLevel + 12);
    checkThreats();
    updateStatusBar();
  }
}

/* Threat system */
let threatInterval = null;
let threatLevel = 0; // 0..100

function startThreatSystem() {
  if (threatInterval) return;
  threatInterval = setInterval(() => {
    // if browser open (we consider it's open when currentPage exists), increase threat
    if (gameState.currentPage && gameState.torRunning) {
      threatLevel = Math.min(100, threatLevel + Math.floor(Math.random() * 8) + 2);
      // Random chance to spawn events based on level
      const rnd = Math.random() * 100;
      if (rnd < threatLevel * 0.02) triggerBreather();
      if (rnd < threatLevel * 0.01) triggerKidnapper();
    }
    updateStatusBar();
  }, 3500);
}

function checkThreats() {
  // visual feedback: if threatLevel high, show overlay
  const overlay = document.getElementById('threatOverlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  if (threatLevel > 40) {
    const flash = document.createElement('div');
    flash.className = 'threat-flash';
    overlay.appendChild(flash);
  }
  if (threatLevel > 70) {
    const noise = document.createElement('div');
    noise.className = 'noise';
    overlay.appendChild(noise);
  }
  updateStatusBar();
}

function triggerKidnapper() {
  if (gameState.isKidnapperActive) return;
  gameState.isKidnapperActive = true;
  // show kidnapper edge visual
  const overlay = document.getElementById('popupLayer');
  const node = document.createElement('div');
  node.className = 'kidnapper-edge';
  node.innerHTML = `<div><strong>Kidnapper</strong><p>Stojí u dveří...</p><button id="hide-lights">Zhasnout (S)</button></div>`;
  overlay.appendChild(node);
  overlay.style.pointerEvents = 'auto';

  // start timer: player must press S to hide
  const timeout = setTimeout(() => {
    // if still active => game over
    if (gameState.isKidnapperActive) gameOver('Kidnapper: nebyl jsi dost rychlý');
  }, 9000);

  // attach listener
  function onHide() {
    gameState.isKidnapperActive = false;
    node.remove();
    overlay.style.pointerEvents = 'none';
    document.removeEventListener('keydown', onKey);
    clearTimeout(timeout);
  }

  function onKey(e) {
    if (e.key.toLowerCase() === 's') onHide();
  }
  document.addEventListener('keydown', onKey);
}

function triggerBreather() {
  if (gameState.isBreatherActive) return;
  gameState.isBreatherActive = true;
  let doorStrength = 100;
  const overlay = document.getElementById('popupLayer');
  const box = document.createElement('div');
  box.className = 'door-popup';
  box.innerHTML = `<div><strong>Someone at the door</strong><p>Drž klik, aby udržel dýchače venku</p><button id="hold-btn">Hold</button><div id="door-bar" style="height:10px;background:#222;border-radius:8px;margin-top:8px;"><div id="door-fill" style="height:10px;background:lime;width:100%;border-radius:8px;"></div></div></div>`;
  overlay.appendChild(box);
  overlay.style.pointerEvents = 'auto';
  const holdBtn = box.querySelector('#hold-btn');
  const fill = box.querySelector('#door-fill');
  let holding = false;
  let holdInterval = null;

  holdBtn.addEventListener('pointerdown', () => { holding = true; });
  window.addEventListener('pointerup', () => { holding = false; });

  holdInterval = setInterval(() => {
    if (holding) {
      doorStrength = Math.min(100, doorStrength + 6);
    } else {
      doorStrength = Math.max(0, doorStrength - 8);
    }
    fill.style.width = doorStrength + '%';
    if (doorStrength <= 0) {
      clearInterval(holdInterval);
      gameState.isBreatherActive = false;
      box.remove();
      overlay.style.pointerEvents = 'none';
      gameOver('Breather se dostal dovnitř');
    }
    if (doorStrength >= 100) {
      // success, repel breather
      clearInterval(holdInterval);
      gameState.isBreatherActive = false;
      box.remove();
      overlay.style.pointerEvents = 'none';
      // lower threat level a bit
      threatLevel = Math.max(0, threatLevel - 30);
      checkThreats();
    }
  }, 120);
}

function startMiniGame() {
  // simple quick-click minigame: click 5 times within 3s
  const overlay = document.getElementById('popupLayer');
  const box = document.createElement('div');
  box.className = 'door-popup';
  box.innerHTML = `<div><strong>MiniGame</strong><p>Klikej 5× během 3 sekund</p><button id="mg-btn">Click me</button><div id="mg-count">0/5</div></div>`;
  overlay.appendChild(box);
  overlay.style.pointerEvents = 'auto';
  const btn = box.querySelector('#mg-btn');
  const count = box.querySelector('#mg-count');
  let clicks = 0;
  const deadline = Date.now() + 3000;
  const iv = setInterval(() => {
    if (Date.now() > deadline) {
      clearInterval(iv);
      box.remove();
      overlay.style.pointerEvents = 'none';
    }
  }, 200);
  btn.addEventListener('click', () => {
    clicks += 1;
    count.textContent = `${clicks}/5`;
    if (clicks >= 5) {
      clearInterval(iv);
      box.remove();
      overlay.style.pointerEvents = 'none';
      // reward: reduce threat
      threatLevel = Math.max(0, threatLevel - 20);
      checkThreats();
    }
  });
}

function gameOver(reason) {
  // show game over screen
  const go = document.createElement('div');
  go.className = 'game-over-screen';
  go.innerHTML = `<div><h2>GAME OVER</h2><p>${reason}</p><button id="go-restart">Restart</button></div>`;
  document.body.appendChild(go);
  document.getElementById('popupLayer').style.pointerEvents = 'none';
  // stop threat system
  clearInterval(threatInterval);
  threatInterval = null;
  document.getElementById('go-restart').addEventListener('click', () => {
    go.remove();
    // reset game state
    threatLevel = 0;
    gameState = {
      isKidnapperActive: false,
      isBreatherActive: false,
      keysFound: 0,
      dosCoin: 100,
      currentIP: "192.168.1.1",
      currentPage: "about:tor",
      torInstalled: false,
      torRunning: false,
      numericKeyFound: false,
      alerts: 0,
    };
    checkThreats();
    updateStatusBar();
    startThreatSystem();
  });
}

// start threat system on load
startThreatSystem();

function openApp(key) {
  if (!apps[key]) return;

  // Browser now opens as a standalone surface, not inside a window frame.
  if (key === 'browser') {
    return openStandaloneBrowser();
  }

  const activeWindow = state.windows.get(key);
  if (activeWindow) {
    showWindow(activeWindow);
    focusWindow(activeWindow.element);
    return;
  }

  const windowFragment = windowTemplate.content.firstElementChild.cloneNode(true);
  const windowEl = windowFragment;
  windowEl.dataset.app = key;
  windowEl.querySelector(".window__title").textContent = apps[key].title;
  windowEl.style.zIndex = state.zIndex++;

  const offset = (state.windows.size % 4) * 26;
  windowEl.style.top = `${120 + offset}px`;
  windowEl.style.left = `${220 + offset}px`;

  const content = windowEl.querySelector(".window__content");
  apps[key].render(content);

  desktop.appendChild(windowEl);
  registerWindow(windowEl, key);
  makeDraggable(windowEl);
  addTaskbarButton(key);
}

function registerWindow(windowEl, key) {
  const closeBtn = windowEl.querySelector(".window__btn--close");
  const minBtn = windowEl.querySelector(".window__btn--min");

  closeBtn.addEventListener("click", () => closeWindow(key));
  minBtn.addEventListener("click", () => minimizeWindow(key));
  windowEl.addEventListener("mousedown", () => focusWindow(windowEl));

  state.windows.set(key, {
    element: windowEl,
    minimized: false,
  });
}

function openStandaloneBrowser() {
  let surface = document.getElementById('standalone-browser');
  if (!surface) {
    surface = document.createElement('div');
    surface.id = 'standalone-browser';
    surface.innerHTML = `
      <div class="standalone-header">
        <span>Deep Web Browser</span>
        <button id="standalone-close" aria-label="Zavřít">✕</button>
      </div>
      <div class="standalone-body"></div>
    `;
    document.body.appendChild(surface);
    const body = surface.querySelector('.standalone-body');
    apps.browser.render(body);
    surface.querySelector('#standalone-close').addEventListener('click', () => {
      surface.style.display = 'none';
    });
  }
  surface.style.display = 'flex';
  surface.focus();
}

function focusWindow(windowEl) {
  windowEl.style.zIndex = state.zIndex++;
}

function minimizeWindow(key) {
  const data = state.windows.get(key);
  if (!data) return;
  if (data.minimized) return;
  data.minimized = true;
  data.element.classList.add("window--hidden");
  data.element.setAttribute("aria-hidden", "true");
  updateTaskbarState(key, false);
}

function showWindow(windowData) {
  windowData.element.classList.remove("window--hidden");
  windowData.element.removeAttribute("aria-hidden");
  windowData.minimized = false;
  updateTaskbarState(windowData.element.dataset.app, true);
}

function closeWindow(key) {
  const data = state.windows.get(key);
  if (!data) return;
  data.element.remove();
  state.windows.delete(key);
  removeTaskbarButton(key);
}

function addTaskbarButton(key) {
  const button = document.createElement("button");
  button.textContent = apps[key].title;
  button.dataset.app = key;
  button.addEventListener("click", () => toggleFromTaskbar(key));
  taskbarApps.appendChild(button);
  updateTaskbarState(key, true);
}

function removeTaskbarButton(key) {
  const button = taskbarApps.querySelector(`button[data-app="${key}"]`);
  if (button) button.remove();
}

function updateTaskbarState(key, isActive) {
  const button = taskbarApps.querySelector(`button[data-app="${key}"]`);
  if (!button) return;
  button.classList.toggle("active", isActive);
}

function toggleFromTaskbar(key) {
  const data = state.windows.get(key);
  if (!data) return;
  if (data.minimized) {
    showWindow(data);
    focusWindow(data.element);
  } else {
    minimizeWindow(key);
  }
}

function makeDraggable(windowEl) {
  const header = windowEl.querySelector(".window__header");
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  const onPointerDown = (event) => {
    if (event.target.closest('button')) return;
    dragging = true;
    const rect = windowEl.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    windowEl.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!dragging) return;
    const desktopRect = desktop.getBoundingClientRect();
    const { width, height } = windowEl.getBoundingClientRect();
    const minX = desktopRect.left + 20;
    const maxX = Math.max(minX, desktopRect.right - width - 20);
    const minY = desktopRect.top + 40;
    const maxY = Math.max(minY, desktopRect.bottom - height - 60);
    const nextX = clamp(event.clientX - offsetX, minX, maxX);
    const nextY = clamp(event.clientY - offsetY, minY, maxY);
    windowEl.style.left = `${nextX}px`;
    windowEl.style.top = `${nextY}px`;
  };

  const onPointerUp = (event) => {
    dragging = false;
    if (windowEl.hasPointerCapture?.(event.pointerId)) {
      windowEl.releasePointerCapture(event.pointerId);
    }
  };

  header.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toggleStartMenu() {
  const visible = startMenu.classList.toggle("visible");
  startMenu.setAttribute("aria-hidden", (!visible).toString());
  // Close other popups
  if (visible) {
    wifiPopup.style.display = "none";
    searchPopup.style.display = "none";
  }
}

// --- Wi-Fi Logic ---
const wifiIcon = document.getElementById("wifi-icon");
const wifiPopup = document.getElementById("wifi-popup");
const wifiList = document.getElementById("wifi-list");

const networks = [
  { ssid: "FBI Surveillance Van #4", secured: true },
  { ssid: "Skynet Global", secured: true },
  { ssid: "Free Wi-Fi", secured: false, isTarget: true }, // The target one
  { ssid: "Virus Distribution Center", secured: true },
  { ssid: "Mom's Internet", secured: true }
];

function renderWifiList() {
  wifiList.innerHTML = networks.map(net => `
    <div class="wifi-item" onclick="selectWifi(this, '${net.ssid}')">
      <div class="wifi-row">
        <span class="wifi-signal">📶</span>
        <span class="wifi-name">${net.ssid}</span>
        ${net.secured ? '🔒' : ''}
      </div>
      <div class="wifi-details">
        ${net.secured ? '<input type="password" class="wifi-password-input" placeholder="Enter network security key">' : ''}
        <button class="wifi-connect-btn" onclick="connectWifi('${net.ssid}')">Connect</button>
      </div>
    </div>
  `).join('');
}

window.selectWifi = (el, ssid) => {
  // Deselect all
  document.querySelectorAll('.wifi-item').forEach(item => item.classList.remove('selected'));
  // Select clicked
  el.classList.add('selected');
};

window.connectWifi = (ssid) => {
  // Mock connection logic
  const net = networks.find(n => n.ssid === ssid);
  if (net) {
    alert(`Connecting to ${ssid}...`);
    // Here you would add real connection logic
  }
};

// --- Volume Logic ---
const volumeIcon = document.getElementById("volume-icon");
const volumePopup = document.getElementById("volume-popup");
const volumeSlider = document.getElementById("volume-slider");
const volumeValue = document.getElementById("volume-value");

if (volumeIcon) {
  volumeIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = volumePopup.style.display === "flex";
    volumePopup.style.display = isVisible ? "none" : "flex";
    if (!isVisible) {
      // Close other popups
      startMenu.classList.remove("visible");
      wifiPopup.style.display = "none";
      searchPopup.style.display = "none";
    }
  });
}

if (volumeSlider) {
  volumeSlider.addEventListener("input", (e) => {
    const val = e.target.value;
    volumeValue.textContent = val;
    // Global volume control (mock)
    // If you have audio elements, set their volume here:
    // document.querySelectorAll('audio, video').forEach(el => el.volume = val / 100);
  });
}

if (wifiIcon) {
  wifiIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = wifiPopup.style.display === "flex";
    wifiPopup.style.display = isVisible ? "none" : "flex";
    if (!isVisible) {
      renderWifiList();
      startMenu.classList.remove("visible");
      searchPopup.style.display = "none";
    }
  });
}

// --- Search Logic ---
const searchInput = document.getElementById("taskbar-search-input");
const searchPopup = document.getElementById("search-popup");
const searchResults = document.getElementById("search-results");

if (searchInput) {
  searchInput.addEventListener("focus", () => {
    searchPopup.style.display = "flex";
    startMenu.classList.remove("visible");
    wifiPopup.style.display = "none";
    renderSearchResults("");
  });

  searchInput.addEventListener("input", (e) => {
    renderSearchResults(e.target.value);
  });
}

function renderSearchResults(query) {
  const q = query.toLowerCase();
  const allApps = Object.keys(apps).map(key => ({
    key,
    ...apps[key]
  }));
  
  const filtered = allApps.filter(app => app.title.toLowerCase().includes(q));
  
  searchResults.innerHTML = filtered.map(app => `
    <div class="search-result-item" onclick="openApp('${app.key}'); searchPopup.style.display='none'">
      <span class="app-icon-small">📱</span>
      <span>${app.title}</span>
    </div>
  `).join('');
  
  if (filtered.length === 0) {
    searchResults.innerHTML = `<div style="padding:10px; color:#aaa">No results for "${query}"</div>`;
  }
}

// --- Power Menu Logic ---
const powerMenuBtn = document.getElementById("power-menu-btn");
const powerMenu = document.getElementById("power-menu");
const btnShutdown = document.getElementById("btn-shutdown");
const btnLogout = document.getElementById("btn-logout");
const btnSleep = document.getElementById("btn-sleep");
const btnRestart = document.getElementById("btn-restart");

if (powerMenuBtn) {
  powerMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = powerMenu.style.display === "flex";
    powerMenu.style.display = isVisible ? "none" : "flex";
  });
}

const goToPowerScreen = () => {
  desktopScreen.style.display = "none";
  loginScreen.style.display = "none";
  powerScreen.style.display = "flex";
  // Force reflow to ensure transition works if needed, or just set opacity
  powerScreen.offsetHeight; 
  powerScreen.style.opacity = "1";
  
  // Reset login state
  loginPassword.value = "";
  passwordIndex = 0;
  loginStatus.textContent = "";
  
  toggleStartMenu();
};

if (btnShutdown) btnShutdown.addEventListener("click", goToPowerScreen);
if (btnSleep) btnSleep.addEventListener("click", goToPowerScreen);
if (btnRestart) btnRestart.addEventListener("click", goToPowerScreen);

if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    // Logout logic: Go to Login Screen
    desktopScreen.style.display = "none";
    loginScreen.style.display = "flex";
    
    // Fade in login screen
    setTimeout(() => {
      loginScreen.style.opacity = "1";
    }, 10);

    loginPassword.value = "";
    passwordIndex = 0;
    loginStatus.textContent = "";
    toggleStartMenu(); // Close start menu
  });
}

function handleGlobalClick(event) {
  // Close Start Menu
  if (!startMenu.contains(event.target) && !startButton.contains(event.target)) {
    startMenu.classList.remove("visible");
    startMenu.setAttribute("aria-hidden", "true");
    if (powerMenu) powerMenu.style.display = "none";
  }
  
  // Close Wi-Fi Popup
  if (wifiPopup && !wifiPopup.contains(event.target) && !wifiIcon.contains(event.target)) {
    wifiPopup.style.display = "none";
  }
  
  // Close Search Popup
  if (searchPopup && !searchPopup.contains(event.target) && !searchInput.contains(event.target)) {
    searchPopup.style.display = "none";
  }
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  
  const clockEl = document.getElementById("taskbarClock");
  if (clockEl) {
    clockEl.innerHTML = `
      <div class="time">${time}</div>
      <div class="date">${date}</div>
    `;
  }
}

startButton.addEventListener("click", toggleStartMenu);
window.addEventListener("click", handleGlobalClick);
iconButtons.forEach((button) =>
  button.addEventListener("dblclick", () => openApp(button.dataset.app))
);
iconButtons.forEach((button) =>
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      openApp(button.dataset.app);
    }
  })
);
// Update start menu buttons selector since structure changed
const newStartMenuButtons = document.querySelectorAll(".start-menu__apps button");
newStartMenuButtons.forEach((button) =>
  button.addEventListener("click", () => {
    openApp(button.dataset.app);
    toggleStartMenu();
  })
);

updateClock();
setInterval(updateClock, 15_000);
// updateStatusBar(); // Removed as status bar is gone

function initializeDesktop() {
  // Launch one window to make the scene feel alive.
  // openApp("browser");
}

initializeDesktop();
