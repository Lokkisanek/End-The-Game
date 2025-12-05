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
      shouldSave = false;
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
    if (gameState.chatStep === 0 && gameState.chatHistory.length === 0) {
      setTimeout(showNotification, 2000); // Show notification only if story hasn't started
    }
  }, 500);
}

const state = {
  zIndex: 10,
  windows: new Map(),
};

const apps = {
  chat: {
    title: "Secure Messenger",
    icon: "💬",
    render: (container) => {
      container.innerHTML = `
        <div class="chat-app">
          <div class="chat-messages" id="chat-history"></div>
          <div class="chat-input-area">
            <input type="text" id="chat-input" placeholder="Type a message..." disabled>
            <button id="chat-send">➤</button>
          </div>
        </div>
      `;
      startStory(container.querySelector('#chat-history'), container.querySelector('#chat-input'), container.querySelector('#chat-send'));
    }
  },
  notes: {
    title: "Notes",
    icon: "✎",
    render: (container) => {
      const storageKey = "etg-notes";
      const saved = localStorage.getItem(storageKey) ?? "";
      container.innerHTML = `
        <section class="notes-area">
          <textarea placeholder="Zaznamenávej stopy...">${saved}</textarea>
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
    icon: "🎨",
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

const hiddenApps = {
  browser: {
    title: "Deep Web Browser",
    icon: "⬤",
    render: (container) => {
      container.innerHTML = `
        <section class="browser-shell">
          <div class="browser-chrome">
            <div class="chrome-tabs">
              <div class="chrome-tab active">
                <span class="tab-icon">🧅</span>
                <span class="tab-title">New Tab</span>
                <span class="tab-close">×</span>
              </div>
              <div class="chrome-tab-add">+</div>
            </div>
            <div class="chrome-toolbar">
              <div class="chrome-nav-controls">
                <button class="chrome-btn" id="nav-back" aria-label="Zpět">←</button>
                <button class="chrome-btn" id="nav-forward" aria-label="Vpřed">→</button>
                <button class="chrome-btn" id="nav-refresh" aria-label="Obnovit">⟳</button>
              </div>
              <div class="chrome-address-bar">
                <span class="onion-icon">🧅</span>
                <input id="address-bar" type="text" value="about:tor" spellcheck="false" aria-label="Adresa" />
                <button class="chrome-btn" id="nav-go">➤</button>
              </div>
              <div class="chrome-menu-btn">≡</div>
            </div>
          </div>
          <div class="browser-main" id="browser-main"></div>
        </section>
      `;

      const view = container.querySelector('#browser-main');
      const addressBar = container.querySelector('#address-bar');
      const backBtn = container.querySelector('#nav-back');
      const fwdBtn = container.querySelector('#nav-forward');
      const refreshBtn = container.querySelector('#nav-refresh');
      const goBtn = container.querySelector('#nav-go');
      const tabTitle = container.querySelector('.tab-title');

      const browserState = {
        history: [],
        index: -1,
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
        
        // Update tab title
        const page = deepSearchPages[resolved];
        if (page) {
            tabTitle.textContent = page.title || "New Tab";
        } else if (resolved === 'about:tor') {
            tabTitle.textContent = "Connect to Tor";
        } else {
            tabTitle.textContent = resolved;
        }
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
        // Check Tor connection first
        if (!gameState.torRunning) {
             view.innerHTML = renderTorConnect();
             const connectBtn = view.querySelector('#tor-connect-btn');
             if (connectBtn) {
                 connectBtn.addEventListener('click', () => {
                     connectBtn.disabled = true;
                     connectBtn.textContent = "Connecting...";
                     setTimeout(() => {
                         gameState.torRunning = true;
                         incrementAlerts('Tor Connected');
                         goTo('about:tor');
                     }, 2000);
                 });
             }
             return;
        }

        const page = deepSearchPages[pageId];
        
        if (!page) {
          view.innerHTML = `<div class="article"><h2>404</h2><p>Stránka nenalezena.</p></div>`;
          return;
        }

        if (pageId === 'about:tor') {
            view.innerHTML = renderTorHome();
            const searchInput = view.querySelector('.tor-search-input');
            const searchBtn = view.querySelector('.tor-search-btn');
            
            const doSearch = () => {
                const val = searchInput.value.toLowerCase();
                if (val === 'deeppedia' || val === 'wiki' || val === 'links') {
                    goTo('deeppedia://');
                } else {
                    alert("DuckDuckGo onion search: No results found for '" + val + "'");
                }
            };
            
            searchBtn.addEventListener('click', doSearch);
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') doSearch();
            });
            return;
        }

        if (page.type === 'directory') {
          view.innerHTML = `
            <div class="directory">
              <header>
                <div class="directory-logo">🧅 Deeppedia</div>
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

      const renderTorConnect = () => {
          return `
            <div class="tor-connect-screen">
                <div class="tor-logo-large">🧅</div>
                <h2>Connect to Tor</h2>
                <p>Tor Browser routes your traffic over the Tor Network, run by thousands of volunteers around the world.</p>
                <button id="tor-connect-btn" class="tor-primary-btn">Connect</button>
                <div class="tor-checkbox">
                    <input type="checkbox" checked disabled> <span>Always connect automatically</span>
                </div>
            </div>
          `;
      };

      const renderTorHome = () => {
          return `
            <div class="tor-home-screen">
                <div class="tor-home-logo">
                    <span style="color: #7D4698; font-size: 4rem;">🧅</span>
                    <h1>Tor Browser</h1>
                </div>
                <div class="tor-search-box">
                    <input type="text" class="tor-search-input" placeholder="Search with DuckDuckGo or enter address">
                    <button class="tor-search-btn">🔍</button>
                </div>
                <div class="tor-info-cards">
                    <div class="tor-info-card">
                        <h3>Welcome</h3>
                        <p>You are now ready to browse the Internet privately.</p>
                    </div>
                    <div class="tor-info-card">
                        <h3>Security</h3>
                        <p>Security Level: Standard</p>
                    </div>
                </div>
            </div>
          `;
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

      // initial render
      goTo('about:tor');
    },
  },
  tor: {
    title: "Tor Client",
    icon: "🧅",
    render: (container) => {
      // Redirect to browser if Tor is "running" (simplified for game flow)
      // Or keep it as a settings panel. Let's keep it simple as a status panel.
      container.innerHTML = `
        <section class="tor-settings">
          <h2>Tor Network Settings</h2>
          <div class="tor-status-panel">
             <div class="status-row">
                <span>Status:</span>
                <span style="color: ${gameState.torRunning ? '#0f0' : '#f00'}">${gameState.torRunning ? 'Connected' : 'Disconnected'}</span>
             </div>
             <div class="status-row">
                <span>Circuit:</span>
                <span>${gameState.torRunning ? 'Relay (France) -> Relay (Germany) -> Relay (Unknown)' : 'None'}</span>
             </div>
             <div class="status-row">
                <span>Bridge:</span>
                <span>obfs4 (recommended)</span>
             </div>
          </div>
          <p style="margin-top: 20px; font-size: 0.9rem; color: #aaa;">
            Tor protects your privacy by routing your traffic through a network of relays.
          </p>
        </section>
      `;
    },
  },
};

function installTor() {
  const overlay = document.getElementById('popupLayer');
  const box = document.createElement('div');
  box.className = 'door-popup';
  box.innerHTML = `
    <div>
      <strong>Instalace Tor Client</strong>
      <p>Probíhá instalace...</p>
      <div style="height:10px;background:#222;border-radius:8px;margin-top:8px;">
        <div id="install-fill" style="height:10px;background:lime;width:0%;border-radius:8px;"></div>
      </div>
    </div>
  `;
  overlay.appendChild(box);
  overlay.style.pointerEvents = 'auto';

  const fill = box.querySelector('#install-fill');
  let progress = 0;
  const iv = setInterval(() => {
    progress += Math.random() * 15 + 5;
    if (progress > 100) progress = 100;
    fill.style.width = `${progress}%`;
    
    if (progress >= 100) {
      clearInterval(iv);
      setTimeout(() => {
        box.remove();
        overlay.style.pointerEvents = 'none';
        
        // Enable apps
        apps.tor = hiddenApps.tor;
        apps.browser = hiddenApps.browser;
        gameState.torInstalled = true;
        
        // Render Start Menu
        renderStartMenu();
        
        // Add Desktop Icon
        const desktop = document.getElementById("desktop");
        const iconGrid = desktop.querySelector(".icon-grid");
        
        const torBtn = document.createElement("button");
        torBtn.className = "desktop-icon";
        torBtn.dataset.app = "tor";
        torBtn.innerHTML = `
          <span class="icon-symbol">🧅</span>
          <span class="icon-label">Tor Client</span>
        `;
        torBtn.addEventListener("dblclick", () => openApp("tor"));
        torBtn.addEventListener("keydown", (e) => {
          if (e.key === "Enter") openApp("tor");
        });
        iconGrid.appendChild(torBtn);
        
        showNotification("System", "Tor Client byl úspěšně nainstalován.");
      }, 500);
    }
  }, 300);
}

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
const defaultGameState = {
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
  chatStep: 0,
  chatHistory: [],
  openApps: [], // Array of { key, minimized, x, y, zIndex }
};

function loadSavedData() {
  try {
    const saved = localStorage.getItem("etg-save-v1");
    if (saved) return JSON.parse(saved);
  } catch (e) { console.error(e); }
  return null;
}

const savedData = loadSavedData();
let gameState = savedData ? { ...defaultGameState, ...savedData.gameState } : { ...defaultGameState };

let shouldSave = true;

function saveGame() {
  if (!shouldSave) return;
  const data = {
    gameState,
    threatLevel
  };
  localStorage.setItem("etg-save-v1", JSON.stringify(data));
}

setInterval(saveGame, 1000);
window.addEventListener("beforeunload", saveGame);

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
let threatLevel = savedData ? (savedData.threatLevel || 0) : 0; // 0..100

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

function openApp(key, restoredState = null) {
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
  windowEl.style.zIndex = restoredState ? restoredState.zIndex : state.zIndex++;

  if (restoredState) {
    windowEl.style.top = restoredState.y;
    windowEl.style.left = restoredState.x;
    if (restoredState.width) windowEl.style.width = restoredState.width;
    if (restoredState.height) windowEl.style.height = restoredState.height;
  } else {
    const offset = (state.windows.size % 4) * 26;
    windowEl.style.top = `${120 + offset}px`;
    windowEl.style.left = `${220 + offset}px`;
    windowEl.style.width = "480px";
    windowEl.style.height = "360px";
  }

  const content = windowEl.querySelector(".window__content");
  apps[key].render(content);

  desktop.appendChild(windowEl);
  registerWindow(windowEl, key);
  makeDraggable(windowEl);
  addTaskbarButton(key);

  if (restoredState && restoredState.minimized) {
    minimizeWindow(key);
  } else {
    updateOpenAppsState(key, windowEl, false);
  }
}

function updateOpenAppsState(key, windowEl, minimized) {
  const idx = gameState.openApps.findIndex(a => a.key === key);
  const appState = {
    key,
    minimized,
    x: windowEl.style.left,
    y: windowEl.style.top,
    width: windowEl.style.width,
    height: windowEl.style.height,
    zIndex: windowEl.style.zIndex
  };
  
  if (idx >= 0) {
    gameState.openApps[idx] = appState;
  } else {
    gameState.openApps.push(appState);
  }
}

function registerWindow(windowEl, key) {
  const closeBtn = windowEl.querySelector(".window__btn--close");
  const minBtn = windowEl.querySelector(".window__btn--min");
  const maxBtn = windowEl.querySelector(".window__btn--max");

  closeBtn.addEventListener("click", () => closeWindow(key));
  minBtn.addEventListener("click", () => minimizeWindow(key));
  if (maxBtn) {
    maxBtn.addEventListener("click", () => toggleMaximize(windowEl));
  }
  
  // Double click header to maximize
  const header = windowEl.querySelector(".window__header");
  header.addEventListener("dblclick", () => toggleMaximize(windowEl));

  windowEl.addEventListener("mousedown", () => focusWindow(windowEl));

  state.windows.set(key, {
    element: windowEl,
    minimized: false,
  });

  // Track resize
  const resizeObserver = new ResizeObserver(() => {
    updateOpenAppsState(key, windowEl, false);
  });
  resizeObserver.observe(windowEl);
}

function toggleMaximize(windowEl) {
  windowEl.classList.toggle("maximized");
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
  updateOpenAppsState(key, data.element, true);
}

function showWindow(windowData) {
  windowData.element.classList.remove("window--hidden");
  windowData.element.removeAttribute("aria-hidden");
  windowData.minimized = false;
  updateTaskbarState(windowData.element.dataset.app, true);
  updateOpenAppsState(windowData.element.dataset.app, windowData.element, false);
}

function closeWindow(key) {
  const data = state.windows.get(key);
  if (!data) return;
  data.element.remove();
  state.windows.delete(key);
  removeTaskbarButton(key);
  gameState.openApps = gameState.openApps.filter(a => a.key !== key);
}

function addTaskbarButton(key) {
  const button = document.createElement("button");
  button.textContent = apps[key].icon || apps[key].title.substring(0, 2);
  button.title = apps[key].title;
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
    const windowRect = windowEl.getBoundingClientRect();
    
    // Calculate desired global position
    let globalX = event.clientX - offsetX;
    let globalY = event.clientY - offsetY;
    
    // Convert to relative position (relative to desktop container)
    let relativeX = globalX - desktopRect.left;
    let relativeY = globalY - desktopRect.top;
    
    // Clamp within desktop bounds (with some padding)
    // Allow window to go slightly off-screen but keep header visible
    const minX = 0;
    const maxX = desktopRect.width - windowRect.width;
    const minY = 0;
    const maxY = desktopRect.height - 40; // Keep at least 40px of header visible
    
    relativeX = clamp(relativeX, -windowRect.width + 50, desktopRect.width - 50);
    relativeY = clamp(relativeY, 0, desktopRect.height - 40);

    windowEl.style.left = `${relativeX}px`;
    windowEl.style.top = `${relativeY}px`;
  };

  const onPointerUp = (event) => {
    dragging = false;
    if (windowEl.hasPointerCapture?.(event.pointerId)) {
      windowEl.releasePointerCapture(event.pointerId);
    }
    updateOpenAppsState(windowEl.dataset.app, windowEl, false);
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
  
  searchResults.innerHTML = "";

  if (filtered.length === 0) {
    searchResults.innerHTML = `<div style="padding:10px; color:#aaa">No results for "${query}"</div>`;
    return;
  }

  filtered.forEach(app => {
    const item = document.createElement("div");
    item.className = "search-result-item";
    item.innerHTML = `
      <span class="app-icon-small">${app.icon}</span>
      <span>${app.title}</span>
    `;
    item.addEventListener("click", () => {
      openApp(app.key);
      searchPopup.style.display = "none";
    });
    searchResults.appendChild(item);
  });
}

function renderStartMenu() {
  const startMenuList = document.getElementById("start-menu-list");
  if (!startMenuList) return;

  startMenuList.innerHTML = ""; // Clear existing

  Object.keys(apps).forEach(key => {
    const app = apps[key];
    const btn = document.createElement("button");
    // Use the same class as before or a new one? 
    // The CSS might expect specific classes. 
    // Looking at previous HTML (which I deleted), it was just <button data-app="...">...
    // But let's check styles.css for .start-menu__apps button
    btn.dataset.app = key;
    btn.innerHTML = `
      <span class="app-icon">${app.icon}</span>
      <span class="app-name">${app.title}</span>
    `;
    
    btn.addEventListener("click", () => {
      openApp(key);
      toggleStartMenu();
    });

    startMenuList.appendChild(btn);
  });
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

// --- Notification & Story Logic ---
const notificationToast = document.getElementById("notification-toast");
const notificationClose = document.querySelector(".notification-close");

function showNotification() {
  if (notificationToast) {
    notificationToast.style.display = "block";
    // Play sound if available
  }
}

if (notificationToast) {
  notificationToast.addEventListener("click", (e) => {
    if (e.target.closest(".notification-close")) {
      notificationToast.style.display = "none";
      return;
    }
    notificationToast.style.display = "none";
    openApp("chat");
  });
}

let storyStarted = false;
async function startStory(chatContainer, inputEl, sendBtn) {
  // Restore history
  gameState.chatHistory.forEach(msg => {
    addMessage(chatContainer, msg.text, msg.type, false);
  });

  const script = [
    { type: 'received', text: "Jsi tam? Poslouchej pozorně. Nemáme moc času.", delay: 500 },
    { type: 'player', text: "Kdo jsi? A o co jde?" },
    { type: 'received', text: "Byl jsi vybrán. Tvůj systém je nyní připojen k síti Red Room.", delay: 1500 },
    { type: 'player', text: "Red Room? To zní jako nějaká legenda." },
    { type: 'received', text: "Kéž by. Je to místo, kde se dějí věci, které by nikdo neměl vidět.", delay: 2000 },
    { type: 'received', text: "Dnes večer plánují živé vysílání popravy. Máš 2 hodiny.", delay: 3000 },
    { type: 'player', text: "Co s tím mám dělat já?" },
    { type: 'received', text: "Musíš získat administrátorský přístup. Hledej kódy 'RR-XXXX'.", delay: 2000 },
    { type: 'received', text: "Pro přístup budeš potřebovat tohle. Stáhni to a nainstaluj.", delay: 2000 },
    { type: 'file', fileName: "tor-installer.exe", action: "installTor" },
    { type: 'received', text: "Tady je první kód: <span class='code-snippet'>RR-START-84</span>", delay: 2000 },
    { type: 'player', text: "Dobře, zapíšu si to." },
    { type: 'received', text: "Otevři Poznámkový blok. Ozvu se.", delay: 2000 }
  ];

  const processStep = async () => {
    if (gameState.chatStep >= script.length) return;
    const step = script[gameState.chatStep];

    if (step.type === 'received') {
      inputEl.disabled = true;
      inputEl.placeholder = "Čekání na odpověď...";
      await new Promise(r => setTimeout(r, step.delay));
      addMessage(chatContainer, step.text, 'received');
      gameState.chatStep++;
      processStep();
    } else if (step.type === 'file') {
      inputEl.disabled = true;
      inputEl.placeholder = "Stáhni soubor...";
      
      const msgDiv = document.createElement("div");
      msgDiv.className = "message received file-message";
      msgDiv.innerHTML = `
        <span class="sender">Unknown</span>
        <div class="file-attachment">
          <span class="file-icon">📦</span>
          <span class="file-name">${step.fileName}</span>
          <button class="file-download-btn">Stáhnout</button>
        </div>
      `;
      chatContainer.appendChild(msgDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      gameState.chatHistory.push({ text: `[File: ${step.fileName}]`, type: 'received' });
      
      const btn = msgDiv.querySelector('.file-download-btn');
      btn.addEventListener('click', () => {
        btn.disabled = true;
        btn.textContent = "Instaluji...";
        if (step.action === 'installTor') {
            installTor();
        }
        gameState.chatStep++;
        processStep();
      });
      
    } else if (step.type === 'player') {
      inputEl.disabled = false;
      inputEl.placeholder = "Piš cokoliv pro odpověď...";
      inputEl.focus();
      
      let currentTyped = "";
      const targetText = step.text;
      
      // Remove old listeners to prevent duplicates if re-rendered
      const newInput = inputEl.cloneNode(true);
      inputEl.parentNode.replaceChild(newInput, inputEl);
      inputEl = newInput;
      
      const newBtn = sendBtn.cloneNode(true);
      sendBtn.parentNode.replaceChild(newBtn, sendBtn);
      sendBtn = newBtn;

      const onKeyDown = (e) => {
        if (e.key === "Enter") {
            if (currentTyped.length >= targetText.length) {
                finishTyping();
            }
            return;
        }
        
        // Ignore non-character keys
        if (e.key.length > 1 && e.key !== "Backspace") return;
        
        e.preventDefault();
        
        if (currentTyped.length < targetText.length) {
            currentTyped += targetText[currentTyped.length];
            inputEl.value = currentTyped;
        }
      };
      
      const finishTyping = () => {
        addMessage(chatContainer, targetText, 'sent');
        inputEl.value = "";
        gameState.chatStep++;
        processStep();
      };

      inputEl.addEventListener('keydown', onKeyDown);
      
      sendBtn.onclick = () => {
         if (currentTyped.length >= targetText.length) {
            finishTyping();
         }
      };
    }
  };

  processStep();
}

function addMessage(container, text, type, save = true) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${type}`;
  msgDiv.innerHTML = `
    <span class="sender">${type === 'received' ? 'Unknown' : 'You'}</span>
    ${text}
  `;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  
  if (save) {
    gameState.chatHistory.push({ text, type });
  }
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
// Render Start Menu dynamically
renderStartMenu();

updateClock();
setInterval(updateClock, 15_000);
// updateStatusBar(); // Removed as status bar is gone

function initializeDesktop() {
  // Restore installed apps
  if (gameState.torInstalled) {
    apps.tor = hiddenApps.tor;
    apps.browser = hiddenApps.browser;
    renderStartMenu();
    
    // Add Desktop Icon
    const desktop = document.getElementById("desktop");
    const iconGrid = desktop.querySelector(".icon-grid");
    
    if (iconGrid && !iconGrid.querySelector('[data-app="tor"]')) {
        const torBtn = document.createElement("button");
        torBtn.className = "desktop-icon";
        torBtn.dataset.app = "tor";
        torBtn.innerHTML = `
          <span class="icon-symbol">🧅</span>
          <span class="icon-label">Tor Client</span>
        `;
        torBtn.addEventListener("dblclick", () => openApp("tor"));
        torBtn.addEventListener("keydown", (e) => {
          if (e.key === "Enter") openApp("tor");
        });
        iconGrid.appendChild(torBtn);
    }
  }

  // Restore open apps
  if (gameState.openApps && gameState.openApps.length > 0) {
    gameState.openApps.forEach(appState => {
      openApp(appState.key, appState);
    });
  }
}

initializeDesktop();
