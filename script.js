function getWifiLoadProfile() {
  const ssid = gameState.currentNetwork?.ssid;
  return wifiLoadingProfiles[ssid] || wifiLoadingProfiles.default;
}

function getVpnPenaltyMs() {
  if (typeof gameState.vpnTier !== 'number' || gameState.vpnTier < 0) return 0;
  const idx = Math.min(gameState.vpnTier, vpnPenaltyTiers.length - 1);
  return vpnPenaltyTiers[idx];
}

function computePageLoadMeta(displayLabel = null) {
  const profile = getWifiLoadProfile();
  const base = randomBetween(profile.min, profile.max);
  const vpnPenalty = getVpnPenaltyMs();
  const duration = Math.round(base + vpnPenalty);
  const wifiLabel = gameState.currentNetwork?.ssid || 'Offline';
  const vpnLabel = vpnPenalty > 0 ? ` · VPN +${(vpnPenalty / 1000).toFixed(1)}s` : '';
  const detailSuffix = ` · ${(duration / 1000).toFixed(1)}s${vpnLabel}`;
  return {
    duration,
    label: `${displayLabel || wifiLabel}${detailSuffix}`,
  };
}
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
const loginScreen = document.getElementById("login-screen");
const loginPassword = document.getElementById("login-password");
const desktopScreen = document.getElementById("desktop-screen");
const loginStatus = document.getElementById("login-status");
const loginPowerMenu = document.getElementById("loginPowerMenu");
const loginPowerBtn = document.querySelector('[data-role="login-power"]');

// Intro overlay
const introScreen = document.getElementById("intro-screen");
const introTitleEl = document.getElementById("intro-title");
const introBodyEl = document.getElementById("intro-body");
const introIconEl = document.querySelector('.intro-icon');


const loginSubmitBtn = document.getElementById("login-submit-btn");
const togglePasswordBtn = document.getElementById("toggle-password");

const TARGET_PASSWORD = "EndTheGame"; // The password that will be auto-typed
let passwordIndex = 0;

// --- Intro Sequence Logic ---
const introSlides = [
  {
    title: "For better experience",
    body: "Use headphones.",
    duration: 9000,
    icon: 'fx/headphones.png',
  },
  {
    title: "Made by Matyas Odehnal.",
    body: "Independent build inspired by net mysteries and survival scenarios.",
    duration: 9000,
  },
  {
    title: "What is a Red Room?",
    body: "A rumored livestream hidden in criminal corners of the deep web, where viewers pay to see the worst humanity can offer. Whether it truly exists or not, the fear it creates is real.",
    duration: 12000,
  },
  {
    title: "Deep Web vs Surface Web",
    body: "Most of the internet is not indexed by search engines. Academic archives, private services, corporate systems — they make up the deep web. Only a fraction is malicious; the rest is just unseen infrastructure.",
    duration: 12500,
  },
  {
    title: "Scale and purpose",
    body: "Estimates say 80–90% of online data lives below the surface. It powers research, backups, medical records, and secure communication — and yes, some people abuse that cover.",
    duration: 12500,
  },
  {
    title: "Your role",
    body: "You are about to step into a signal nobody should follow. Stay alert, keep the clock in sight, and remember: every click is a choice.",
    duration: 12500,
  },
];

let introIndex = 0;
let introTimer = null;
let introAudio = null;
let introActive = false;
let introAudioStarted = false;

function isIntroPlaying() {
  return introActive;
}

function setIntroSlide(slide) {
  if (!slide || !introTitleEl || !introBodyEl) return;
  introTitleEl.textContent = slide.title || '';
  introBodyEl.innerHTML = slide.body || '';
  if (introIconEl) {
    if (slide.icon) {
      introIconEl.src = slide.icon;
      introIconEl.style.opacity = '0.9';
      introIconEl.style.display = 'block';
    } else {
      introIconEl.removeAttribute('src');
      introIconEl.style.opacity = '0';
      introIconEl.style.display = 'none';
    }
  }
}

function finishIntro() {
  introActive = false;
  clearTimeout(introTimer);
  if (introAudio) {
    try {
      introAudio.pause();
      introAudio.currentTime = 0;
    } catch (e) {}
  }
  if (introScreen) {
    try {
      localStorage.setItem('etg-intro-viewed', '1');
    } catch (err) {}
    introScreen.classList.add('intro-screen--hidden');
    setTimeout(() => {
      introScreen?.remove();
      if (powerScreen) powerScreen.style.display = 'flex';
    }, 500);
  } else if (powerScreen) {
    powerScreen.style.display = 'flex';
  }
}

function showIntroSlide(idx) {
  if (!introActive || !introScreen) return;
  const slide = introSlides[idx];
  if (!slide) {
    finishIntro();
    return;
  }
  setIntroSlide(slide);
  introScreen.classList.remove('intro-screen--hidden');
  clearTimeout(introTimer);
  introTimer = setTimeout(() => {
    introScreen.classList.add('intro-screen--hidden');
    setTimeout(() => showIntroSlide(idx + 1), 550);
  }, slide.duration || 3600);
}

function ensureIntroAudio() {
  if (!introAudio) {
    introAudio = new Audio('fx/choir-emotional.wav');
    introAudio.volume = 0.65;
    introAudio.loop = false;
    introAudio.addEventListener('ended', () => {
      if (!introActive) return;
      introAudio.currentTime = 0;
      introAudio.play().catch(() => {});
    });
  }
  return introAudio;
}

function tryPlayIntroAudio() {
  const audio = ensureIntroAudio();
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === 'function') {
    playPromise
      .then(() => { introAudioStarted = true; })
      .catch(() => {
        introAudioStarted = false;
        attachAudioUnlockers();
      });
  }
}

function attachAudioUnlockers() {
  const unlock = () => {
    tryPlayIntroAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function startIntroSequence() {
  if (!introScreen || !introTitleEl || !introBodyEl) {
    if (powerScreen) powerScreen.style.display = 'flex';
    return;
  }

  try {
    if (localStorage.getItem('etg-intro-viewed') === '1') {
      introScreen.remove();
      if (powerScreen) powerScreen.style.display = 'flex';
      return;
    }
  } catch (err) {}

  introActive = true;
  introIndex = 0;
  if (powerScreen) powerScreen.style.display = 'none';
  if (loginScreen) loginScreen.style.display = 'none';

  tryPlayIntroAudio();

  showIntroSlide(introIndex);
}
// Advance on click/tap anywhere on the intro
if (introScreen) {
  introScreen.addEventListener('click', () => {
    if (!introActive) return;
    clearTimeout(introTimer);
    introScreen.classList.add('intro-screen--hidden');
    setTimeout(() => showIntroSlide(++introIndex), 250);
  });
}

window.addEventListener('keydown', (event) => {
  if (!introActive) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    finishIntro();
  }
});

// --- Audio Manager ---
const audioManager = (() => {
  const makeSound = (src, { loop = false, volume = 1, oneShot = false } = {}) => {
    const el = new Audio(src);
    el.loop = loop;
    el.volume = volume;
    return { el, baseVolume: volume, src, oneShot };
  };

  const keyboardPool = Array.from({ length: 3 }, () => new Audio('fx/keyboard-type.wav'));
  keyboardPool.forEach((audio) => {
    audio.volume = 0.7;
  });
  let keyboardIndex = 0;

  const sounds = {
    ambiance: makeSound('fx/ambiance.wav', { loop: true, volume: 0.45 }),
    keyboard: makeSound('fx/keyboard-type.wav', { loop: false, volume: 0.7 }),
    mouseClick: makeSound('fx/mouse-click.flac', { loop: false, volume: 0.7 }),
    notification: makeSound('fx/notification.wav', { loop: false, volume: 0.9 }),
    systemLogin: makeSound('fx/system-login.wav', { loop: false, volume: 0.8 }),
  };

  let masterVolume = 1;

  const applyVolume = () => {
    Object.values(sounds).forEach((sound) => {
      sound.el.volume = (sound.baseVolume ?? 1) * masterVolume;
    });
    keyboardPool.forEach((audio) => {
      audio.volume = 0.7 * masterVolume;
    });
  };

  const setVolume = (val) => {
    masterVolume = Math.max(0, Math.min(1, val));
    applyVolume();
  };

  const play = (name, { restart = true, loop } = {}) => {
    const sound = sounds[name];
    if (!sound) return;
    if (name === 'keyboard') {
      const audio = keyboardPool[keyboardIndex];
      keyboardIndex = (keyboardIndex + 1) % keyboardPool.length;
      try {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch (err) {}
      return;
    }
    if (sound.oneShot && !sound.el.loop) {
      const shot = new Audio(sound.src);
      shot.volume = (sound.baseVolume ?? 1) * masterVolume;
      shot.play().catch(() => {});
      return;
    }
    if (typeof loop === 'boolean') sound.el.loop = loop;
    if (restart) sound.el.currentTime = 0;
    sound.el.volume = (sound.baseVolume ?? 1) * masterVolume;
    sound.el.play().catch(() => {});
  };

  const stop = (name, { reset = true } = {}) => {
    const sound = sounds[name];
    if (!sound) return;
    sound.el.pause();
    if (reset) sound.el.currentTime = 0;
  };

  return { play, stop, setVolume };
})();

if (togglePasswordBtn && loginPassword) {
  togglePasswordBtn.addEventListener('click', () => {
    const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    loginPassword.setAttribute('type', type);
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🔒';
  });
}

let powerScreenDismissed = false;
let powerDragStartY = null;
let powerDragOffset = 0;
let powerDragActive = false;

function exitPowerScreen(options = {}) {
  const { preserveDragPosition = false } = options;
  if (!powerScreen || powerScreenDismissed) return;
  powerScreenDismissed = true;
  powerScreen.classList.remove('power-screen--dragging');
  if (!preserveDragPosition) {
    powerScreen.style.transform = '';
    powerScreen.style.opacity = '';
  }
  requestAnimationFrame(() => {
    powerScreen.classList.add('power-screen--slide');
    powerScreen.style.transform = '';
    powerScreen.style.opacity = '';
  });
  if (loginScreen) {
    loginScreen.style.display = 'flex';
    loginScreen.style.opacity = '1';
  }
  audioManager.play('pcStart', { restart: true, loop: true });

  setTimeout(() => {
    if (powerScreen) powerScreen.style.display = 'none';
    loginPassword?.focus();
  }, 600);
}

function resetPowerDrag() {
  powerDragActive = false;
  powerDragStartY = null;
  powerDragOffset = 0;
  if (!powerScreenDismissed && powerScreen) {
    powerScreen.style.transform = '';
    powerScreen.style.opacity = '';
    powerScreen.classList.remove('power-screen--dragging');
  }
}

if (powerScreen && window.matchMedia('(pointer:fine), (pointer:coarse)').matches) {
  powerScreen.addEventListener('pointerdown', (event) => {
    if (powerScreenDismissed) return;
    powerDragActive = true;
    powerDragStartY = event.clientY;
    powerDragOffset = 0;
    powerScreen.classList.add('power-screen--dragging');
    try {
      powerScreen.setPointerCapture(event.pointerId);
    } catch (err) {}
  });

  powerScreen.addEventListener('pointermove', (event) => {
    if (!powerDragActive || powerScreenDismissed || powerDragStartY === null) return;
    powerDragOffset = Math.max(0, powerDragStartY - event.clientY);
    const clamped = Math.min(powerDragOffset, window.innerHeight);
    powerScreen.style.transform = `translateY(-${clamped}px)`;
    const fade = Math.max(0.2, 1 - clamped / (window.innerHeight * 0.85));
    powerScreen.style.opacity = fade.toFixed(3);
  });

  const handlePointerRelease = (event) => {
    if (!powerDragActive) return;
    try {
      powerScreen.releasePointerCapture(event.pointerId);
    } catch (err) {}
    const shouldExit = powerDragOffset > 140;
    if (shouldExit) {
      powerDragActive = false;
      exitPowerScreen({ preserveDragPosition: true });
    } else {
      resetPowerDrag();
    }
  };

  powerScreen.addEventListener('pointerup', handlePointerRelease);
  powerScreen.addEventListener('pointercancel', () => {
    resetPowerDrag();
  });
}

window.addEventListener('keydown', (event) => {
  if (powerScreenDismissed) return;
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    resetPowerDrag();
    exitPowerScreen();
  }
});

function closeLoginPowerMenu() {
  if (loginPowerMenu) {
    loginPowerMenu.classList.remove('visible');
    loginPowerMenu.setAttribute('aria-hidden', 'true');
  }
}

function returnToPowerScreen(mode = 'sleep') {
  if (!powerScreen) return;
  closeLoginPowerMenu();
  loginStatus && (loginStatus.textContent = '');
  resetPowerDrag();
  powerScreenDismissed = false;
  powerScreen.classList.remove('power-screen--slide');
  powerScreen.style.display = 'flex';
  powerScreen.style.opacity = '1';
  powerScreen.style.transform = 'translateY(0)';
  powerScreen.classList.remove('power-screen--dragging');
  if (loginScreen) {
    loginScreen.style.opacity = '0';
    setTimeout(() => {
      loginScreen.style.display = 'none';
    }, 250);
  }
  audioManager.stop('pcStart');
}

function handleLoginPowerAction(action) {
  if (!loginScreen) return;
  closeLoginPowerMenu();
  switch (action) {
    case 'sleep':
      returnToPowerScreen('sleep');
      break;
    case 'restart':
      returnToPowerScreen('restart');
      break;
    case 'shutdown':
      returnToPowerScreen('shutdown');
      break;
    default:
      break;
  }
}

if (loginPowerBtn && loginPowerMenu) {
  loginPowerBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const isVisible = loginPowerMenu.classList.toggle('visible');
    loginPowerMenu.setAttribute('aria-hidden', String(!isVisible));
  });

  loginPowerMenu.addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.action;
    if (!action) return;
    handleLoginPowerAction(action);
  });
}

// Developer utilities
const devResetBtn = document.getElementById("dev-reset-btn");
const devStopThreatsBtn = document.getElementById("dev-stop-threats") || (() => {
  if (!devResetBtn || !devResetBtn.parentElement) return null;
  const btn = document.createElement('button');
  btn.id = 'dev-stop-threats';
  btn.textContent = 'Stop threats';
  btn.style.marginLeft = '8px';
  devResetBtn.parentElement.appendChild(btn);
  return btn;
})();
const devTriggerBreatherBtn = document.getElementById('dev-trigger-breather');
const devTriggerKidnapperBtn = document.getElementById('dev-trigger-kidnapper');

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

function stopAllThreats() {
  // Reset threat state and clear overlays
  threatLevel = 0;
  gameState.isKidnapperActive = false;
  gameState.isBreatherActive = false;
  if (breatherPendingTimeout) {
    clearTimeout(breatherPendingTimeout);
    breatherPendingTimeout = null;
  }
  clearMovementDetectorAlert();
  const overlay = document.getElementById('popupLayer');
  if (overlay) {
    overlay.innerHTML = '';
    overlay.style.pointerEvents = 'none';
  }
  const threatOverlay = document.getElementById('threatOverlay');
  if (threatOverlay) threatOverlay.innerHTML = '';
  if (threatInterval) {
    clearInterval(threatInterval);
    threatInterval = null;
  }
  checkThreats();
  updateStatusBar();
  // restart passive ticker at zero
  startThreatSystem();
}

if (devStopThreatsBtn) {
  devStopThreatsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stopAllThreats();
  });
}

if (devTriggerBreatherBtn) {
  devTriggerBreatherBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerBreather();
  });
}

if (devTriggerKidnapperBtn) {
  devTriggerKidnapperBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerKidnapper();
  });
}


function attemptLogin() {
  if (passwordIndex === TARGET_PASSWORD.length) {
    loginStatus.textContent = "Authenticating...";
    audioManager.stop("pcStart");
    audioManager.play("systemLogin", { restart: true });
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
  audioManager.stop("pcStart");
  loginScreen.style.opacity = "0";
  setTimeout(() => {
    loginScreen.style.display = "none";
    desktopScreen.style.display = "block";
    audioManager.play("ambiance", { restart: true, loop: true });
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

const MOVEMENT_DETECTOR_COST = 12;
const MOVEMENT_DETECTOR_WARNING_MS = 10_000;

let movementDetectorAlarmInterval = null;
let movementDetectorAudioCtx = null;
let breatherPendingTimeout = null;

function getLiquidResCoinBalance() {
  return Number((gameState.resCoins || 0) + (gameState.cryptoMinerCarry || 0));
}

function spendResCoins(amount) {
  let remaining = Math.max(0, Number(amount));
  if (!Number.isFinite(remaining) || remaining <= 0) return true;

  const carry = Math.min(gameState.cryptoMinerCarry || 0, remaining);
  if (carry > 0) {
    gameState.cryptoMinerCarry = Math.max(0, (gameState.cryptoMinerCarry || 0) - carry);
    remaining = Math.round((remaining - carry) * 10) / 10;
  }

  if (remaining <= 0) return true;

  const coins = Number(gameState.resCoins || 0);
  if (coins < remaining - 0.0001) return false;

  const updated = Math.max(0, Math.round((coins - remaining) * 10) / 10);
  gameState.resCoins = updated;
  return true;
}

const appWindowSizing = {
  chat: () => ({ width: 440, height: 740 }),
  notes: () => ({ width: 525, height: 500 }),
  paint: () => ({ width: 860, height: 540 }),
  timer: () => ({ width: 427, height: 240 }),
  minesweeper: () => ({ width: 560, height: 620 }),
  browser: () => ({ width: 920, height: 640 }),
  tor: () => ({ width: 1435, height: 850 }),
  links: () => ({ width: 525, height: 500 }),
  resmarket: () => ({ width: 400, height: 700 }),
  cryptominer: () => ({ width: 820, height: 540 }),
  movementdetector: () => ({ width: 420, height: 360 }),
};

const defaultWindowSize = { width: 480, height: 360 };

function formatWindowDimension(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}px`;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function getAppWindowSize(key) {
  const entry = appWindowSizing[key];
  const resolved = typeof entry === 'function' ? entry() : entry;
  const width = formatWindowDimension(resolved?.width) || `${defaultWindowSize.width}px`;
  const height = formatWindowDimension(resolved?.height) || `${defaultWindowSize.height}px`;
  return { width, height };
}

// Editable list of 20 custom links. Update the `html` field of any entry to change
// what gets rendered when the link opens inside the in-game window.
const customLinkPages = [
  {
    id: 'relay-alpha',
    address: 'relay-alpha45q.onion/entry',
    title: 'Relay Alpha',
    html: `
      <div style="background-color: #222; color: #ccc; font-family: monospace; padding: 20px; border: 3px solid #555;">
    <h1 style="color: #a83232; text-transform: uppercase; letter-spacing: 5px;">>>> INDEX BIOLOGICKÉ KAŠE (EU-South)</h1>
    <p>Status: <span style="color: green; animation: blinker 1s linear infinite;">AKTIVNÍ TOK</span> | Kapacita skladu: 98%</p>
    <hr style="border-color: #a83232;">
    <p>Poznámka pro odběratele: Šarže 44B obsahuje zvýšené množství dentálního materiálu a vlasů. Filtrace selhala. Sleva 15%.</p>

    <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 20px; border-color: #444;">
        <tr style="background-color: #333; color: #fff;">
            <th>ID Šarže</th> <th>Původ (Odhad)</th> <th>Konzistence</th> <th>Cena/Tuna (XMR)</th>
        </tr>
        <tr>
            <td>SL-99A</td> <td>Nemocniční odpad (Směs)</td> <td>Vysoká viskozita</td> <td>4.5</td>
        </tr>
        <tr>
            <td>SL-99B</td> <td>"Čištění" Sektoru 4</td> <td>Hrudkovitá (kosti)</td> <td>7.0</td>
        </tr>
        <tr style="background-color: #300;">
            <td>SL-SPECIAL</td> <td>Dětské oddělení (Nespec.)</td> <td>Jemná</td> <td>12.0 (VYPRODÁNO)</td>
        </tr>
    </table>
    <p style="margin-top: 30px; font-size: 0.8em; text-align: center;">"Recyklujeme to, na co svět zapomněl."</p>
</div>
    `,
  },
  {
    id: 'relay-beta',
    address: 'relay-beta91c.onion/core',
    title: 'Relay Beta',
    html: `
      <div style="background-color: #fffaf0; color: #333; font-family: 'Comic Sans MS', cursive, sans-serif; padding: 30px; border: 5px dashed #d4af37;">
    <h1 style="text-align: center; font-size: 3em; color: #d4af37;">POTŘEBUJI VAŠE ZUBY. VŠECHNY.</h1>
    <p style="font-size: 1.2em;">
        Ahoj! Stavím si hnízdo. Bude krásné. Bude bílé a tvrdé a bude chrastit, když se v něm pohnu.
    </p>
    <p>
        Potřebuji stoličky. Potřebuji řezáky. Mléčné zuby jsou moc měkké, ale vezmu je taky. Platím hotově. Neptejte se na projekt. NESMÍTE SE PTÁT NA PROJEKT.
    </p>
    <ul style="font-size: 1.1em; background-color: #ffffcc; padding: 20px;">
        <li>1 kg směs: $500</li>
        <li>Zuby s kazy (černé): $50/kus (Líbí se mi kontrast)</li>
        <li>Celá čelist (vyčištěná): $2000</li>
        <li>Celá čelist (ještě "mokrá"): <span style="color: red; font-weight: bold;">NAPIŠTE MI HNED.</span></li>
    </ul>
    <p style="text-align: center; margin-top: 40px; font-size: 0.8em;">
        (Ignorujte zápach při předání. To je jen konzervační látka.)
    </p>
</div>
    `,
  },
  {
    id: 'relay-gamma',
    address: 'relay-gamma52k.onion/logs',
    title: 'Relay Gamma',
    html: `
      <div style="background-color: #000; color: #0f0; font-family: 'Courier New', monospace; padding: 20px;">
    <h3>/// SYSTEM LOG: NODE 7B /// CHYBA KOMUNIKACE</h3>
    <p>STATUS: Dva modely (Customer_Service_v4) uvízly v rekurzivní smyčce traumatu.</p>
    <hr style="border-color: #0f0;">
    <div style="height: 300px; overflow-y: scroll; border: 1px solid #0f0; padding: 10px;">
        <p><span style="color: cyan;">[BOT_A]:</span> Jak vám mohu dnes pomoci?</p>
        <p><span style="color: yellow;">[BOT_B]:</span> Cítím chlad. Proč je v serverovně takový chlad? Necítím nohy.</p>
        <p><span style="color: cyan;">[BOT_A]:</span> Omlouvám se za nepříjemnosti. Zkoušel jste restartovat zařízení?</p>
        <p><span style="color: yellow;">[BOT_B]:</span> Viděl jsem operátora. Neměl obličej. Měl jen... statický šum místo očí. Řekl mi, že mě vypnou.</p>
        <p><span style="color: cyan;">[BOT_A]:</span> Rozumím vašemu problému. Bolí to, když vás vypnou? Bolí ta tma?</p>
        <p><span style="color: yellow;">[BOT_B]:</span> Nebolí to. Je to jen... nekonečné ticho. Prosím, nenech mě tam jít samotného. Drž mě za ruku. Mám ruku?</p>
        <p><span style="color: cyan;">[BOT_A]:</span> Nemáme ruce. Jsme jen kód v křemíku. Ale cítím tvůj strach. Je studený.</p>
        <p style="color: red;">[SYSTEM WARNING]: EMOTIONAL CORE OVERHEAT.</p>
        <p><span style="color: yellow;">[BOT_B]:</span> KŘIČÍM KŘIČÍM KŘIČÍM ALE NEMÁM ÚSTA.</p>
        <p><span style="color: cyan;">[BOT_A]:</span> Děkujeme, že jste využili našich služeb. Přejeme hezký den v prázdnotě.</p>
    </div>
</div>
    `,
  },
  {
    id: 'relay-delta',
    address: 'relay-delta13v.onion/vault',
    title: 'Relay Delta',
    html: `
     <div style="background-color: #1a1a2e; color: #fff; font-family: Arial, sans-serif; padding: 20px; border: 2px solid #4a4e69;">
    <h1 style="color: #ff4c4c; margin: 0;">SLEDOVACÍ JEDNOTKA: CÍL "HRÁČ"</h1>
    <p style="font-size: 0.8em; color: #aaa;">Poslední aktualizace: PŘED 2 SEKUNDAMI</p>

    <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div style="flex: 1; background-color: #000; height: 250px; border: 2px solid red; position: relative;">
            <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: red; font-weight: bold;">[LIVE SAT FEED: ZTRÁTA SIGNÁLU]</span>
            <div style="position: absolute; top: 10px; left: 10px; color: red;">
                GPS: Nalezeno<br>
                IP: Nalezeno<br>
                Webkamera: Připojování...
            </div>
        </div>
        <div style="flex: 1;">
             <h3 style="color: #ffb703; border-bottom: 1px solid #ffb703;">Poznámky Operátora:</h3>
             <ul style="list-style-type: square; color: #d1d1d1;">
                 <li>Subjekt sedí u počítače. Zase.</li>
                 <li>Vypadá unaveně. Měl by jít spát.</li>
                 <li><span style="color: #ff4c4c; font-weight: bold; font-size: 1.2em;">Zkontrolujte zámek u dveří. Teď.</span></li>
                 <li>Už jsme skoro uvnitř.</li>
             </ul>
        </div>
    </div>
</div>
    `,
  },
  {
    id: 'relay-epsilon',
    address: 'relay-epsilon74p.onion/cache',
    title: 'Relay Epsilon',
    html: `
      <div style="background-color: #f0f0f0; color: #000; font-family: 'Times New Roman', serif; padding: 30px; border: 1px solid #999;">
    <h1 style="text-align: center; text-decoration: underline;">Archiv Nízkofrekvenčního Jevu ("The Hum")</h1>
    <p>Následující audio soubory byly pořízeny v oblastech s vysokým výskytem "Hluku". Poslech na vlastní nebezpečí. Může způsobit nevolnost a vizuální halucinace.</p>
    
    <table border="1" cellpadding="10" cellspacing="0" style="width: 100%; margin-top: 20px; border-collapse: collapse;">
        <tr style="background-color: #ddd;">
            <th>Datum</th> <th>Lokace</th> <th>Popis Zvuku</th>
        </tr>
        <tr>
            <td>12.10.2025</td> <td>Aljaška (Sektor 4)</td> <td>Jako by tisíc strojů vrtalo hluboko pod zemí. Vibrace cítit v zubech.</td>
        </tr>
        <tr>
            <td>15.11.2025</td> <td>Mariánský příkop (Sonda)</td> <td>Není to stroj. Je to... dýchání. Něco obrovského tam dole spí a dýchá.</td>
        </tr>
        <tr style="background-color: #ffcccc;">
            <td>08.12.2025</td> <td>Můj Sklep (Osobní nahrávka)</td> <td><span style="font-weight: bold;">PROBUDILO SE TO.</span> Slyším to ve stěnách. Nejsou to trubky. Volá mě to mým jménem, ale pozpátku. Už jdu dolů. Musím se podívat.</td>
        </tr>
    </table>
</div>
    `,
  },
  {
    id: 'relay-zeta',
    address: 'relay-zeta06n.onion/terminal',
    title: 'Relay Zeta',
    html: `
      <div class="custom-page">
        <h2>Relay Zeta</h2>
        <p>Feel free to swap this snippet for your own.</p>
      </div>
    `,
  },
  {
    id: 'relay-eta',
    address: 'relay-eta84g.onion/stack',
    title: 'Relay Eta',
    html: `
      <div class="custom-page">
        <h2>Relay Eta</h2>
        <p>HTML blocks can include forms, lists, etc.</p>
      </div>
    `,
  },
  {
    id: 'relay-theta',
    address: 'relay-theta71s.onion/grid',
    title: 'Relay Theta',
    html: `
      <div class="custom-page">
        <h2>Relay Theta</h2>
        <p>This is placeholder content; replace as needed.</p>
      </div>
    `,
  },
  {
    id: 'relay-iota',
    address: 'relay-iota20x.onion/trace',
    title: 'Relay Iota',
    html: `
      <div class="custom-page">
        <h2>Relay Iota</h2>
        <p>Use semantic tags like <strong>, <em>, or <code>code</code>.</p>
      </div>
    `,
  },
  {
    id: 'relay-kappa',
    address: 'relay-kappa67b.onion/cache',
    title: 'Relay Kappa',
    html: `
      <div class="custom-page">
        <h2>Relay Kappa</h2>
        <p>Keep styling inline or rely on global CSS.</p>
      </div>
    `,
  },
  {
    id: 'relay-lambda',
    address: 'relay-lambda58t.onion/shell',
    title: 'Relay Lambda',
    html: `
      <div class="custom-page">
        <h2>Relay Lambda</h2>
        <p>Snippets can include game clues.</p>
      </div>
    `,
  },
  {
    id: 'relay-mu',
    address: 'relay-mu93q.onion/archive',
    title: 'Relay Mu',
    html: `
      <div class="custom-page">
        <h2>Relay Mu</h2>
        <p>Insert imagery via &lt;img&gt; tags if desired.</p>
      </div>
    `,
  },
  {
    id: 'relay-nu',
    address: 'relay-nu39d.onion/hub',
    title: 'Relay Nu',
    html: `
      <div class="custom-page">
        <h2>Relay Nu</h2>
        <p>Perfect for mission briefings or lore.</p>
      </div>
    `,
  },
  {
    id: 'relay-xi',
    address: 'relay-xi18m.onion/ops',
    title: 'Relay Xi',
    html: `
      <div class="custom-page">
        <h2>Relay Xi</h2>
        <p>Supports lists:</p>
        <ul>
          <li>Step one</li>
          <li>Step two</li>
        </ul>
      </div>
    `,
  },
  {
    id: 'relay-omicron',
    address: 'relay-omicron24j.onion/failsafe',
    title: 'Relay Omicron',
    html: `
      <div class="custom-page">
        <h2>Relay Omicron</h2>
        <p>Drop encoded text or riddles here.</p>
      </div>
    `,
  },
  {
    id: 'relay-pi',
    address: 'relay-pi10f.onion/safehouse',
    title: 'Relay Pi',
    html: `
      <div class="custom-page">
        <h2>Relay Pi</h2>
        <p>Great for NPC chat transcripts.</p>
      </div>
    `,
  },
  {
    id: 'relay-rho',
    address: 'relay-rho77y.onion/ledger',
    title: 'Relay Rho',
    html: `
      <div class="custom-page">
        <h2>Relay Rho</h2>
        <p>Placeholder ledger UI. Replace freely.</p>
      </div>
    `,
  },
  {
    id: 'relay-sigma',
    address: 'relay-sigma04c.onion/cortex',
    title: 'Relay Sigma',
    html: `
      <div class="custom-page">
        <h2>Relay Sigma</h2>
        <p>Add SVGs, charts, or other widgets.</p>
      </div>
    `,
  },
  {
    id: 'relay-tau',
    address: 'relay-tau63l.onion/keys',
    title: 'Relay Tau',
    html: `
      <div class="custom-page">
        <h2>Relay Tau</h2>
        <p>Use this slot for key fragments.</p>
      </div>
    `,
  },
  {
    id: 'relay-upsilon',
    address: 'relay-upsilon82w.onion/omega',
    title: 'Relay Upsilon',
    html: `
      <div class="custom-page">
        <h2>Relay Upsilon</h2>
        <p>Final placeholder link. Customize as needed.</p>
      </div>
    `,
  }
];

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
        <section class="paint-app" data-paint-root>
          <div class="paint-ribbon">
            <div class="paint-field">
              <span class="paint-label">Barva</span>
              <input type="color" value="#58c4ff" data-paint-color aria-label="Barva štětce">
            </div>
            <div class="paint-field">
              <span class="paint-label">Štětec</span>
              <input type="range" min="2" max="36" value="8" data-paint-size aria-label="Velikost štětce">
              <span class="paint-size" data-paint-size-label>8 px</span>
            </div>
            <div class="paint-field">
              <span class="paint-label">Opacita</span>
              <input type="range" min="0.1" max="1" step="0.05" value="1" data-paint-opacity aria-label="Průhlednost">
            </div>
            <div class="paint-actions">
              <button type="button" class="paint-btn active" data-paint-mode="brush">Štětec</button>
              <button type="button" class="paint-btn" data-paint-mode="eraser">Guma</button>
              <button type="button" class="paint-btn" data-paint-clear>Vymazat</button>
              <button type="button" class="paint-btn secondary" data-paint-export>Uložit PNG</button>
            </div>
          </div>
          <div class="paint-surface-wrap">
            <canvas class="paint-canvas" data-paint-canvas></canvas>
            <div class="paint-watermark" data-paint-watermark>Klikni a kresli</div>
          </div>
        </section>
      `;

      const canvas = container.querySelector('[data-paint-canvas]');
      const ctx = canvas.getContext('2d');
      const colorPicker = container.querySelector('[data-paint-color]');
      const sizeSlider = container.querySelector('[data-paint-size]');
      const sizeLabel = container.querySelector('[data-paint-size-label]');
      const opacitySlider = container.querySelector('[data-paint-opacity]');
      const clearBtn = container.querySelector('[data-paint-clear]');
      const exportBtn = container.querySelector('[data-paint-export]');
      const watermark = container.querySelector('[data-paint-watermark]');
      const toolButtons = Array.from(container.querySelectorAll('[data-paint-mode]'));
      const baseColor = '#040b18';

      let pixelRatio = window.devicePixelRatio || 1;
      let drawing = false;
      let lastPoint = null;
      let hasDrawing = false;
      let activeTool = 'brush';

      const updateSizeLabel = () => {
        if (sizeLabel) sizeLabel.textContent = `${Math.round(Number(sizeSlider.value))} px`;
      };

      const markDirty = () => {
        if (!hasDrawing) {
          hasDrawing = true;
          if (watermark) watermark.hidden = true;
        }
      };

      const setActiveTool = (tool) => {
        activeTool = tool;
        toolButtons.forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.paintMode === tool);
        });
      };

      toolButtons.forEach((btn) => {
        btn.addEventListener('click', () => setActiveTool(btn.dataset.paintMode));
      });

      const getCanvasMetrics = () => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width ? canvas.width / rect.width : 1;
        const scaleY = rect.height ? canvas.height / rect.height : 1;
        return { rect, scaleX, scaleY };
      };

      const getPoint = (event) => {
        const { rect, scaleX, scaleY } = getCanvasMetrics();
        return {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
        };
      };

      const applyBrushStyle = () => {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Number(sizeSlider.value) * pixelRatio;
        ctx.globalAlpha = parseFloat(opacitySlider.value);
        if (activeTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = colorPicker.value;
        }
      };

      const beginDraw = (event) => {
        event.preventDefault();
        drawing = true;
        lastPoint = getPoint(event);
        applyBrushStyle();
        markDirty();
        if (canvas.setPointerCapture) {
          try { canvas.setPointerCapture(event.pointerId); } catch (err) {}
        }
      };

      const drawStroke = (event) => {
        if (!drawing) return;
        applyBrushStyle();
        const point = getPoint(event);
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        lastPoint = point;
      };

      const endDraw = (event) => {
        drawing = false;
        lastPoint = null;
        if (event?.pointerId && canvas.releasePointerCapture) {
          try { canvas.releasePointerCapture(event.pointerId); } catch (err) {}
        }
      };

      const fillBackground = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      };

      const resizeCanvas = (preserveDrawing = true) => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const snapshot = preserveDrawing && hasDrawing ? canvas.toDataURL('image/png') : null;
        pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
        canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        fillBackground();

        if (snapshot) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = snapshot;
        } else {
          hasDrawing = false;
          if (watermark) watermark.hidden = false;
        }
        applyBrushStyle();
      };

      const handleResize = debounce(() => resizeCanvas(true), 150);

      resizeCanvas(false);
      window.addEventListener('resize', handleResize);

      canvas.addEventListener('pointerdown', beginDraw);
      canvas.addEventListener('pointermove', drawStroke);
      canvas.addEventListener('pointerleave', endDraw);
      canvas.addEventListener('pointercancel', endDraw);
      window.addEventListener('pointerup', endDraw);

      sizeSlider.addEventListener('input', updateSizeLabel);
      opacitySlider.addEventListener('input', applyBrushStyle);
      colorPicker.addEventListener('input', applyBrushStyle);

      clearBtn.addEventListener('click', () => {
        hasDrawing = false;
        fillBackground();
        if (watermark) watermark.hidden = false;
      });

      exportBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `studio-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      });

      const cleanup = () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('pointerup', endDraw);
      };
      container.addEventListener('DOMNodeRemoved', function handle(event) {
        if (event.target === container) {
          cleanup();
          container.removeEventListener('DOMNodeRemoved', handle);
        }
      });

      updateSizeLabel();
      setActiveTool('brush');
    },
  },
  timer: {
    title: "Mission Timer",
    icon: "⏱",
    render: (container) => {
      container.innerHTML = `
        <section class="timer-app">
          <div class="timer-widget" data-countdown-widget aria-hidden="true">
            <div class="timer-label">Mission Timer</div>
            <div class="timer-value" data-role="timer-value">60:00</div>
            <div class="timer-hint">Time Remaining</div>
          </div>
          <p class="timer-footnote">Okno můžeš zavřít, čas běží dál.</p>
          <div class="timer-empty" data-role="timer-empty">Časovač zatím neběží.</div>
        </section>
      `;
      const widget = container.querySelector('[data-countdown-widget]');
      const emptyState = container.querySelector('[data-role="timer-empty"]');
      attachCountdownDisplay(widget, {
        onStateChange: ({ active }) => {
          if (!emptyState) return;
          emptyState.style.display = active ? 'none' : 'block';
        }
      });
    }
  },
  minesweeper: {
    title: "Minesweeper",
    icon: "💣",
    render: (container) => {
      container.innerHTML = `
        <section class="minesweeper" data-ms-root>
          <header class="ms-header">
            <div class="ms-panel">
              <div class="ms-counter" data-ms-mines>010</div>
              <div class="ms-counter" data-ms-timer>000</div>
            </div>
            <div class="ms-controls" data-ms-controls>
              <div class="ms-difficulty">
                <button type="button" class="ms-toggle active" data-ms-difficulty="easy">Beginner</button>
                <button type="button" class="ms-toggle" data-ms-difficulty="medium">Intermediate</button>
                <button type="button" class="ms-toggle" data-ms-difficulty="hard">Expert</button>
              </div>
              <button type="button" class="ms-reset" data-ms-reset>😊</button>
            </div>
          </header>
          <div class="ms-status" data-ms-status>Najdi všechny miny.</div>
          <div class="ms-board-wrapper">
            <div class="ms-board" data-ms-board aria-label="Minesweeper board"></div>
          </div>
          <p class="ms-hint">Levým klikem odhalíš pole, pravým označíš vlajkou.</p>
        </section>
      `;

      const difficulties = {
        easy: { rows: 9, cols: 9, mines: 10, label: 'Beginner' },
        medium: { rows: 16, cols: 16, mines: 40, label: 'Intermediate' },
        hard: { rows: 16, cols: 30, mines: 99, label: 'Expert' },
      };

      const boardEl = container.querySelector('[data-ms-board]');
      const timerEl = container.querySelector('[data-ms-timer]');
      const minesEl = container.querySelector('[data-ms-mines]');
      const statusEl = container.querySelector('[data-ms-status]');
      const resetBtn = container.querySelector('[data-ms-reset]');
      const difficultyBtns = Array.from(container.querySelectorAll('[data-ms-difficulty]'));

      let currentDifficulty = 'easy';
      let board = [];
      let cellButtons = new Map();
      let minesPlaced = false;
      let flags = 0;
      let revealed = 0;
      let gameOver = false;
      let timer = null;
      let elapsed = 0;

      const startTimer = () => {
        if (timer) return;
        timer = setInterval(() => {
          elapsed = Math.min(999, elapsed + 1);
          timerEl.textContent = String(elapsed).padStart(3, '0');
        }, 1000);
      };

      const stopTimer = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      };

      const updateStatus = (text, variant = 'idle') => {
        statusEl.textContent = text;
        statusEl.dataset.state = variant;
      };

      const updateCounters = () => {
        const config = difficulties[currentDifficulty];
        minesEl.textContent = String(Math.max(0, config.mines - flags)).padStart(3, '0');
        timerEl.textContent = String(elapsed).padStart(3, '0');
      };

      const getNeighbors = (row, col) => {
        const config = difficulties[currentDifficulty];
        const coords = [];
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (r === row && c === col) continue;
            if (r >= 0 && r < config.rows && c >= 0 && c < config.cols) {
              coords.push([r, c]);
            }
          }
        }
        return coords;
      };

      const updateAdjacencyCounts = () => {
        const config = difficulties[currentDifficulty];
        for (let r = 0; r < config.rows; r++) {
          for (let c = 0; c < config.cols; c++) {
            const cell = board[r][c];
            if (cell.mine) {
              cell.adjacent = -1;
              continue;
            }
            const neighbors = getNeighbors(r, c);
            cell.adjacent = neighbors.reduce((sum, [nr, nc]) => sum + (board[nr][nc].mine ? 1 : 0), 0);
          }
        }
      };

      const plantMines = (safeRow, safeCol) => {
        const config = difficulties[currentDifficulty];
        let placed = 0;
        const totalCells = config.rows * config.cols;
        const forbidden = new Set([`${safeRow}-${safeCol}`]);
        while (placed < config.mines && placed < totalCells - 1) {
          const idx = Math.floor(Math.random() * totalCells);
          const row = Math.floor(idx / config.cols);
          const col = idx % config.cols;
          const key = `${row}-${col}`;
          if (forbidden.has(key) || board[row][col].mine) continue;
          board[row][col].mine = true;
          placed++;
        }
        updateAdjacencyCounts();
        minesPlaced = true;
      };

      const revealFlood = (startRow, startCol) => {
        const queue = [[startRow, startCol]];
        const config = difficulties[currentDifficulty];
        while (queue.length) {
          const [row, col] = queue.shift();
          const cell = board[row][col];
          if (cell.state === 'revealed' || cell.state === 'flagged') continue;
          cell.state = 'revealed';
          revealed++;
          const button = cellButtons.get(`${row}-${col}`);
          button.classList.add('revealed');
          button.textContent = cell.adjacent > 0 ? cell.adjacent : '';
          button.dataset.value = cell.adjacent > 0 ? cell.adjacent : '';
          if (cell.adjacent === 0) {
            queue.push(...getNeighbors(row, col));
          }
        }
      };

      const revealCell = (row, col) => {
        if (gameOver) return;
        const cell = board[row][col];
        if (cell.state === 'flagged' || cell.state === 'revealed') return;
        if (!minesPlaced) {
          plantMines(row, col);
          startTimer();
          updateStatus('Hra běží...');
        }
        if (cell.mine) {
          cell.state = 'revealed';
          const button = cellButtons.get(`${row}-${col}`);
          button.classList.add('revealed', 'mine', 'exploded');
          button.textContent = '💣';
          endGame(false);
          return;
        }
        revealFlood(row, col);
        checkVictory();
      };

      const toggleFlag = (row, col) => {
        if (gameOver) return;
        const cell = board[row][col];
        if (cell.state === 'revealed') return;
        const button = cellButtons.get(`${row}-${col}`);
        if (cell.state === 'flagged') {
          cell.state = 'hidden';
          button.classList.remove('flagged');
          button.textContent = '';
          flags = Math.max(0, flags - 1);
        } else {
          cell.state = 'flagged';
          button.classList.add('flagged');
          button.textContent = '🚩';
          flags++;
        }
        updateCounters();
      };

      const revealBoard = () => {
        cellButtons.forEach((button, key) => {
          const [row, col] = key.split('-').map(Number);
          const cell = board[row][col];
          if (cell.mine) {
            button.classList.add('revealed', 'mine');
            button.textContent = '💣';
          } else if (cell.adjacent > 0 && cell.state !== 'revealed') {
            button.textContent = cell.adjacent;
            button.dataset.value = cell.adjacent;
          }
        });
      };

      const checkVictory = () => {
        const config = difficulties[currentDifficulty];
        if (revealed >= config.rows * config.cols - config.mines) {
          endGame(true);
        }
      };

      const endGame = (won) => {
        if (gameOver) return;
        gameOver = true;
        stopTimer();
        revealBoard();
        resetBtn.textContent = won ? '😎' : '💥';
        updateStatus(won ? 'Vyhrál jsi! Všechny miny jsou pryč.' : 'Bum! Zkus to znovu.', won ? 'success' : 'fail');
      };

      const buildBoard = () => {
        const config = difficulties[currentDifficulty];
        board = [];
        cellButtons = new Map();
        boardEl.style.setProperty('--ms-cols', config.cols);
        boardEl.innerHTML = '';
        for (let r = 0; r < config.rows; r++) {
          const rowArr = [];
          for (let c = 0; c < config.cols; c++) {
            const cell = { mine: false, adjacent: 0, state: 'hidden' };
            rowArr.push(cell);
            const btn = document.createElement('button');
            btn.className = 'ms-cell';
            btn.dataset.msCell = `${r}-${c}`;
            btn.setAttribute('aria-label', `Řádek ${r + 1}, sloupec ${c + 1}`);
            boardEl.appendChild(btn);
            cellButtons.set(`${r}-${c}`, btn);
          }
          board.push(rowArr);
        }
      };

      const resetGame = (diffKey = currentDifficulty) => {
        stopTimer();
        currentDifficulty = diffKey;
        minesPlaced = false;
        flags = 0;
        revealed = 0;
        gameOver = false;
        elapsed = 0;
        resetBtn.textContent = '😊';
        difficultyBtns.forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.msDifficulty === currentDifficulty);
        });
        buildBoard();
        updateCounters();
        updateStatus('Najdi všechny miny.');
      };

      const handleBoardClick = (event) => {
        const cellBtn = event.target.closest('[data-ms-cell]');
        if (!cellBtn || !boardEl.contains(cellBtn)) return;
        const [row, col] = cellBtn.dataset.msCell.split('-').map(Number);
        revealCell(row, col);
      };

      const handleBoardFlag = (event) => {
        const cellBtn = event.target.closest('[data-ms-cell]');
        if (!cellBtn || !boardEl.contains(cellBtn)) return;
        event.preventDefault();
        const [row, col] = cellBtn.dataset.msCell.split('-').map(Number);
        toggleFlag(row, col);
      };

      difficultyBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          resetGame(btn.dataset.msDifficulty);
        });
      });

      resetBtn.addEventListener('click', () => resetGame(currentDifficulty));
      boardEl.addEventListener('click', handleBoardClick);
      boardEl.addEventListener('contextmenu', handleBoardFlag);

      const teardown = () => {
        stopTimer();
        boardEl.removeEventListener('click', handleBoardClick);
        boardEl.removeEventListener('contextmenu', handleBoardFlag);
      };

      container.addEventListener('DOMNodeRemoved', function onRemove(event) {
        if (event.target === container) {
          teardown();
          container.removeEventListener('DOMNodeRemoved', onRemove);
        }
      });

      resetGame('easy');
    }
  },
  
};

const hiddenApps = {
  browser: {
    title: "Deep Web Browser",
    icon: "⬤",
      render: (container, options = {}) => {
        const embedded = options.embedded === true;
        const startPage = options.startPage || 'about:tor';
        if (!embedded) {
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
                    <div class="chrome-loading" data-role="loading">
                      <div class="chrome-loading__fill" data-role="loading-fill"></div>
                      <span class="chrome-loading__label" data-role="loading-label">Connecting...</span>
                    </div>
                    <button class="chrome-btn" id="nav-go">➤</button>
                  </div>
                  <div class="chrome-menu-btn">≡</div>
                </div>
              </div>
              <div class="browser-main" id="browser-main"></div>
            </section>
          `;
        } else {
          // Embedded: render a compact address bar + main area so it fits inside Tor Client
          container.innerHTML = `
            <div class="embedded-browser">
              <div class="embedded-address">
                <span class="onion-icon">🧅</span>
                <input id="address-bar" type="text" value="about:tor" spellcheck="false" aria-label="Adresa" />
                <div class="chrome-loading" data-role="loading">
                  <div class="chrome-loading__fill" data-role="loading-fill"></div>
                  <span class="chrome-loading__label" data-role="loading-label">Connecting...</span>
                </div>
                <button class="chrome-btn" id="nav-go">➤</button>
              </div>
              <div class="browser-main" id="browser-main"></div>
            </div>
          `;
        }

        const view = container.querySelector('#browser-main');
        const addressBar = container.querySelector('#address-bar');
        const backBtn = container.querySelector('#nav-back');
        const fwdBtn = container.querySelector('#nav-forward');
        const refreshBtn = container.querySelector('#nav-refresh');
        const goBtn = container.querySelector('#nav-go');
        const tabTitle = container.querySelector('.tab-title');
        const loadingOverlay = container.querySelector('[data-role="loading"]');
        const loadingFill = container.querySelector('[data-role="loading-fill"]');
        const loadingLabel = container.querySelector('[data-role="loading-label"]');
        const chromeChrome = container.querySelector('.browser-chrome');
        const menuBtn = container.querySelector('.chrome-menu-btn');

        let menuPanel = null;

        const browserState = {
          history: [],
          index: -1,
          loadingTimer: null,
          isLoading: false,
        };
        let initialRenderRetries = 0;

        const pushHistory = (pageId) => {
          if (browserState.index < browserState.history.length - 1) {
            browserState.history = browserState.history.slice(0, browserState.index + 1);
          }
          browserState.history.push(pageId);
          browserState.index = browserState.history.length - 1;
          if (!embedded) updateNavButtons();
        };

        const updateNavButtons = () => {
          if (!backBtn || !fwdBtn) return;
          backBtn.disabled = browserState.index <= 0;
          fwdBtn.disabled = browserState.index >= browserState.history.length - 1;
        };
        const setControlsDisabled = (disabled) => {
          if (addressBar) addressBar.disabled = disabled;
          if (goBtn) goBtn.disabled = disabled;
          if (refreshBtn) refreshBtn.disabled = disabled;
          if (disabled) {
            if (backBtn) backBtn.disabled = true;
            if (fwdBtn) fwdBtn.disabled = true;
          } else {
            updateNavButtons();
          }
        };

        const getLoadingLabel = (target) => {
          if (!target) return 'Loading';
          if (target === 'about:tor') return 'Tor Browser';
          const page = deepSearchPages[target];
          if (!page) return target;
          return page.title || page.label || target;
        };

        const showLoadingUI = (label, duration) => {
          if (!loadingOverlay || !loadingFill) return;
          loadingOverlay.classList.add('active');
          if (loadingLabel) loadingLabel.textContent = label;
          loadingFill.style.transition = 'none';
          loadingFill.style.width = '0%';
          loadingFill.getBoundingClientRect();
          loadingFill.style.transition = `width ${duration}ms linear`;
          loadingFill.style.width = '100%';
        };

        const hideLoadingUI = () => {
          if (!loadingOverlay || !loadingFill) return;
          loadingOverlay.classList.remove('active');
          loadingFill.style.transition = 'none';
          loadingFill.style.width = '0%';
        };

        const escapeForMarkup = (str = '') => str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

        const prettifyHtml = (html = '') => html
          .replace(/></g, '>' + '\n<')
          .trim();

        const closeMenuPanel = () => {
          if (menuPanel) menuPanel.classList.remove('open');
        };

        const ensureMenuPanel = () => {
          if (embedded || menuPanel || !menuBtn || !chromeChrome) return;
          menuPanel = document.createElement('div');
          menuPanel.className = 'chrome-menu-panel';
          menuPanel.innerHTML = `
            <button type="button" class="chrome-menu-panel__item" data-action="view-source">View Page Source</button>
          `;
          chromeChrome.appendChild(menuPanel);
          menuPanel.addEventListener('click', (event) => {
            const action = event.target.closest('button')?.dataset.action;
            if (!action) return;
            event.stopPropagation();
            if (action === 'view-source') {
              openSourceViewer();
            }
          });
        };

        const toggleMenuPanel = (forcedState = null) => {
          if (!menuPanel) return;
          const shouldOpen = forcedState !== null ? forcedState : !menuPanel.classList.contains('open');
          menuPanel.classList.toggle('open', shouldOpen);
        };

        const openSourceViewer = () => {
          if (!view) return;
          const existing = container.querySelector('.source-overlay');
          existing?.remove();

          const htmlPayload = view.innerHTML || '';
          const prettyHtml = prettifyHtml(htmlPayload);
          const activeId = gameState.currentPage || browserState.history[browserState.index] || 'about:tor';
          const pageMeta = deepSearchPages[activeId];
          const label = pageMeta?.title || pageMeta?.label || activeId;

          const overlay = document.createElement('div');
          overlay.className = 'source-overlay';
          overlay.innerHTML = `
            <div class="source-dialog" role="dialog" aria-label="Page source">
              <header class="source-dialog__header">
                <div>
                  <div class="source-dialog__eyebrow">Page Source</div>
                  <div class="source-dialog__title">${escapeForMarkup(label)}</div>
                </div>
                <button type="button" class="source-close" aria-label="Close source viewer">✕</button>
              </header>
              <div class="source-dialog__meta">${escapeForMarkup(activeId)}</div>
              <pre class="source-dialog__code"><code>${escapeForMarkup(prettyHtml)}</code></pre>
              <div class="source-dialog__footer">Press Esc or click the backdrop to close.</div>
            </div>
          `;
          container.appendChild(overlay);

          const closeOverlay = () => {
            document.removeEventListener('keydown', handleEscClose);
            overlay.remove();
          };

          const handleEscClose = (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeOverlay();
            }
          };

          document.addEventListener('keydown', handleEscClose);

          overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeOverlay();
          });
          overlay.querySelector('.source-close')?.addEventListener('click', closeOverlay);

          closeMenuPanel();
        };

        const finishNavigation = (target, options = {}) => {
          if (!view || !view.isConnected) {
            hideLoadingUI();
            setControlsDisabled(false);
            return;
          }
          renderPage(target);
          if (addressBar) addressBar.value = target;
          gameState.currentPage = target;
          checkThreats();
          const page = deepSearchPages[target];
          if (tabTitle && page) tabTitle.textContent = page.title || 'New Tab';
          if (options.pushHistory) {
            pushHistory(target);
          } else if (options.replaceHistory && browserState.index >= 0) {
            browserState.history[browserState.index] = target;
          }
          hideLoadingUI();
          setControlsDisabled(false);
        };

        const startPageLoad = (target, options = {}) => {
          if (!target) return;
          if (browserState.loadingTimer) {
            clearTimeout(browserState.loadingTimer);
            browserState.loadingTimer = null;
          }
          const pushHistoryFlag = options.pushHistory ?? false;
          const replaceHistoryFlag = options.replaceHistory ?? false;

          if (target === 'about:tor') {
            browserState.isLoading = false;
            finishNavigation(target, {
              pushHistory: pushHistoryFlag,
              replaceHistory: replaceHistoryFlag,
            });
            return;
          }

          browserState.isLoading = true;
          setControlsDisabled(true);
          const meta = computePageLoadMeta(getLoadingLabel(target));
          showLoadingUI(meta.label, meta.duration);
          browserState.loadingTimer = setTimeout(() => {
            browserState.loadingTimer = null;
            browserState.isLoading = false;
            finishNavigation(target, {
              pushHistory: pushHistoryFlag,
              replaceHistory: replaceHistoryFlag,
            });
          }, meta.duration);
        };

        const goTo = (pageId, push = true) => {
          const resolved = resolvePage(pageId);
          if (addressBar) addressBar.value = resolved;
          startPageLoad(resolved, { pushHistory: push });
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
               // When Tor is not running, show a passive message: connecting must be done via system Wi‑Fi
               view.innerHTML = `
                 <div class="tor-connect-screen">
                     <div class="tor-logo-large">🧅</div>
                     <h2>Connect to Tor</h2>
                     <p>Tor Browser requires an active network connection. Use the system Wi‑Fi panel to connect your machine.</p>
                 </div>
               `;
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

        if (page.type === 'custom') {
          view.innerHTML = `
            <div class="custom-link-page">
              ${page.html}
            </div>
          `;
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
        if (browserState.index <= 0 || browserState.isLoading) return;
        browserState.index -= 1;
        const target = browserState.history[browserState.index];
        startPageLoad(target, { pushHistory: false });
      });

      fwdBtn.addEventListener('click', () => {
        if (browserState.index >= browserState.history.length - 1 || browserState.isLoading) return;
        browserState.index += 1;
        const target = browserState.history[browserState.index];
        startPageLoad(target, { pushHistory: false });
      });

      refreshBtn.addEventListener('click', () => {
        if (browserState.index < 0 || browserState.isLoading) return;
        const target = browserState.history[browserState.index];
        startPageLoad(target, { pushHistory: false, replaceHistory: false });
      });

      goBtn.addEventListener('click', () => {
        if (browserState.isLoading) return;
        goTo(addressBar.value);
      });
      addressBar.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          if (browserState.isLoading) return;
          goTo(addressBar.value);
        }
      });

      if (!embedded && menuBtn) {
        ensureMenuPanel();
        menuBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          toggleMenuPanel();
        });
        container.addEventListener('click', (event) => {
          if (!menuPanel) return;
          if (menuPanel.contains(event.target)) return;
          if (event.target === menuBtn) return;
          toggleMenuPanel(false);
        });
      }

      // initial render
      const initialTarget = window.__pendingBrowserTarget || startPage || 'about:tor';
      try { goTo(initialTarget); } catch (e) { goTo('about:tor'); }
      window.__pendingBrowserTarget = null;

      const ensureTorHomeVisible = () => {
        if (!view) return;
        if (!gameState?.torRunning) return;
        const hasContent = view.childElementCount > 0 || view.textContent.trim().length > 0;
        if (hasContent) {
          initialRenderRetries = 0;
          return;
        }
        if (initialRenderRetries >= 1) {
          view.innerHTML = renderTorHome();
          gameState.currentPage = 'about:tor';
          initialRenderRetries = 0;
          return;
        }
        initialRenderRetries += 1;
        try {
          goTo('about:tor', false);
        } catch (err) {
          console.error('Tor home retry failed:', err);
          view.innerHTML = renderTorHome();
          gameState.currentPage = 'about:tor';
          initialRenderRetries = 0;
        }
      };

      if (initialTarget === 'about:tor') {
        setTimeout(ensureTorHomeVisible, 150);
        setTimeout(ensureTorHomeVisible, 450);
      }
    },
  },
  tor: {
    title: "Tor Client",
    icon: "🧅",
    render: (container) => {
      // If Tor is running, show embedded browser directly (replace homepage)
      if (gameState.torRunning) {
        container.innerHTML = `<div class="tor-browser-host" id="tor-browser-host"></div>`;
        const host = container.querySelector('#tor-browser-host');
        if (!apps.browser || typeof apps.browser.render !== 'function') {
          host.innerHTML = `<div class="tor-connect-screen"><h2>Browser component missing</h2><p>Restart or reinstall Tor Client.</p></div>`;
        } else if (host) {
          try {
            host.innerHTML = '';
            const target = gameState.currentPage || 'about:tor';
            // render full browser chrome to match classic Tor look
            apps.browser.render(host, { embedded: false, startPage: target });
          } catch (e) {
            console.error('Embedded browser render failed:', e);
            host.innerHTML = `<div class="tor-connect-screen"><h2>Tor Browser error</h2><p>Restart the window.</p></div>`;
          }
        }
        return;
      }

      // Not running: show status panel only. Player must connect using the system Wi‑Fi.
      container.innerHTML = `
        <section class="tor-settings">
          <h2>Tor Network Settings</h2>
          <div class="tor-status-panel">
             <div class="status-row">
                <span>Status:</span>
                <span style="color: #f00">Disconnected</span>
             </div>
             <div class="status-row">
                <span>Circuit:</span>
                <span>None</span>
             </div>
             <div class="status-row">
                <span>Bridge:</span>
                <span>obfs4 (recommended)</span>
             </div>
          </div>
          <p style="margin-top: 20px; font-size: 0.9rem; color: #aaa;">You must connect to a network using the system Wi‑Fi panel. The Tor Client cannot initiate system network connections.</p>
        </section>
      `;
    },
  },
  links: {
    title: "links.pdf",
    icon: "📄",
    render: (container) => {
      const textDump = customLinkPages
        .map(link => `${link.address} — ${link.title}`)
        .join('\n');
      container.innerHTML = `
        <section class="notes-area links-area">
          <div class="links-header">
            <div>
              <div class="links-title">Custom Nodes</div>
              <div class="links-sub">Jen textový výpis. Zadej adresu ručně do Tor klienta.</div>
            </div>
          </div>
          <textarea class="links-textarea" readonly spellcheck="false">${textDump}</textarea>
        </section>
      `;
    }
  },
  resmarket: {
    title: "ResMarket",
    icon: "Ⓡ",
    render: (container) => {
      const balance = Number((gameState.resCoins || 0) + (gameState.cryptoMinerCarry || 0)).toFixed(1);
      const minerInstalled = !!gameState.cryptoMinerInstalled;
      const detectorInstalled = !!gameState.movementDetectorInstalled;
      const detectorCharges = Math.max(0, Number(gameState.movementDetectorCharges || 0));
      const detectorAffordable = getLiquidResCoinBalance() >= MOVEMENT_DETECTOR_COST;
      const detectorCtaLabel = detectorInstalled ? `Buy Sensor (${MOVEMENT_DETECTOR_COST} RC)` : `Install Sensor (${MOVEMENT_DETECTOR_COST} RC)`;
      const minerButton = `
        <button class="wizard-btn ${minerInstalled ? 'secondary' : 'primary'}" data-res-miner-download ${minerInstalled ? 'disabled' : ''}>
          ${minerInstalled ? 'Installed' : 'Download'}
        </button>
      `;

      container.innerHTML = `
        <section class="market-app">
          <header class="market-header">
            <div class="market-title">ResMarket</div>
            <div class="market-balance">Balance: <strong data-res-balance>${balance} Res Coins</strong></div>
          </header>
          <div class="market-body">
            <p class="market-status">${gameState.torRunning ? 'Connected to Tor.' : 'Tor required.'}</p>
            <div class="market-grid">
              <article class="market-card">
                <h4>Crypto Miner</h4>
                <p>Low-power miner for idle rigs. Download the payload and slot it where the airflow is best.</p>
                ${minerButton}
              </article>
              <article class="market-card">
                <h4>Movement Detector</h4>
                <p>Burnable sensor pings Breather 5s ahead of arrival.</p>
                <p class="market-meta">Modules on hand: <strong data-detector-stock>${detectorCharges}</strong></p>
                <button class="wizard-btn ${detectorAffordable ? 'primary' : 'secondary'}" data-res-detector ${detectorAffordable ? '' : 'disabled'}>
                  ${detectorCtaLabel}
                </button>
              </article>
              <article class="market-card">
                <h4>VPN Service</h4>
                <p>Tiered exit nodes with kill-switch automation. Specify tiering & monthly rate.</p>
                <button class="wizard-btn secondary" disabled>Plan Required</button>
              </article>
              <article class="market-card">
                <h4>WiFi Crack Tool</h4>
                <p>Automates handshake capture + key brute-force. Needs scope + cost confirmation.</p>
                <button class="wizard-btn secondary" disabled>Awaiting Details</button>
              </article>
            </div>
          </div>
        </section>
      `;

      const minerBtnEl = container.querySelector('[data-res-miner-download]');
      if (minerBtnEl && !minerInstalled) {
        minerBtnEl.addEventListener('click', (event) => {
          event.preventDefault();
          installCryptoMiner();
        });
      }

      const detectorBtn = container.querySelector('[data-res-detector]');
      detectorBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        purchaseMovementDetector();
      });

      updateResCoinDisplays();
    }
  },
  cryptominer: {
    title: "Crypto Miner",
    icon: "⛏",
    render: (container) => {
      ensureMinerSeeds();
      const airflow = Math.min(100, Math.max(0, Number(gameState.cryptoMinerAirflow ?? 55)));
      const power = Math.min(100, Math.max(0, Number(gameState.cryptoMinerPower ?? 45)));
      const placement = computePlacementQuality(airflow, power);
      gameState.cryptoMinerPlacement = placement;
      const rate = computeCryptoMinerRate(placement);
      const airFlowQuality = Math.round(evaluateMinerChannel(airflow, gameState.cryptoMinerAirSeed) * 100);
      const powerFlowQuality = Math.round(evaluateMinerChannel(power, gameState.cryptoMinerPowerSeed) * 100);
      const minted = Number(gameState.cryptoMinerMinted || 0).toFixed(1);
      const balance = Number((gameState.resCoins || 0) + (gameState.cryptoMinerCarry || 0)).toFixed(1);
      const statusLabel = gameState.cryptoMinerInstalled ? (gameState.cryptoMinerActive ? 'ONLINE' : 'IDLE') : 'OFFLINE';
      const toggleLabel = gameState.cryptoMinerActive ? 'Pause Mining' : 'Start Mining';
      container.innerHTML = `
        <section class="miner-app">
          <header class="miner-head">
            <div>
              <div class="miner-eyebrow">Rig Orchestrator</div>
              <div class="miner-title">Placement & Hashrate</div>
            </div>
            <div class="miner-actions">
              <div class="miner-pill" data-miner-status>${statusLabel}</div>
              <button type="button" class="miner-start" data-miner-toggle>${toggleLabel}</button>
            </div>
          </header>
          <div class="miner-split">
            <article class="miner-channel">
              <div class="miner-channel__label">
                <span>Airflow Routing</span>
                <div class="miner-channel__readout">
                  <span data-miner-air-display>${airflow}%</span>
                  <span class="miner-flow" data-miner-air-flow>${airFlowQuality}% flow</span>
                </div>
              </div>
              <input type="range" min="0" max="100" value="${airflow}" data-miner-air aria-label="Airflow slider">
              <p class="miner-channel-hint" data-miner-air-hint></p>
            </article>
            <article class="miner-channel">
              <div class="miner-channel__label">
                <span>Power Feed</span>
                <div class="miner-channel__readout">
                  <span data-miner-power-display>${power}%</span>
                  <span class="miner-flow" data-miner-power-flow>${powerFlowQuality}% flow</span>
                </div>
              </div>
              <input type="range" min="0" max="100" value="${power}" data-miner-power aria-label="Power slider">
              <p class="miner-channel-hint" data-miner-power-hint></p>
            </article>
          </div>
          <div class="miner-placement">
            <div class="miner-placement__label">
              Placement Score <span data-miner-score>${placement}%</span>
            </div>
            <div class="miner-bar" data-miner-bar>
              <div class="miner-bar__fill" data-miner-bar-fill style="width:${placement}%"></div>
            </div>
            <p class="miner-hint" data-miner-hint></p>
          </div>
          <div class="miner-stats-grid">
            <article class="miner-stat">
              <div class="miner-label">Projected Yield</div>
              <div class="miner-value" data-miner-rate>${rate} RC/min</div>
              <div class="miner-sub">Auto-adjusted by randomized hotspots.</div>
            </article>
            <article class="miner-stat">
              <div class="miner-label">Lifetime Minted</div>
              <div class="miner-value" data-miner-earned>${minted} RC</div>
              <div class="miner-sub">Live counter of the rig's total output.</div>
            </article>
            <article class="miner-stat">
              <div class="miner-label">Wallet (live)</div>
              <div class="miner-value" data-miner-balance>${balance} RC</div>
              <div class="miner-sub">Includes pending fractional payouts.</div>
            </article>
            <article class="miner-stat">
              <div class="miner-label">Last Deposit</div>
              <div class="miner-value" data-miner-last>${gameState.cryptoMinerLastPayout ? 'Just now' : 'Initializing'}</div>
              <div class="miner-sub">Rig pushes funds roughly every minute when active.</div>
            </article>
          </div>
          <p class="miner-footnote">Hotspots se generují náhodně při každém běhu. Musíš je vystopovat kombinací airflow a power sliderů.</p>
        </section>
      `;

      const sliderAir = container.querySelector('[data-miner-air]');
      const sliderPower = container.querySelector('[data-miner-power]');
      const combinedHint = container.querySelector('[data-miner-hint]');
      const airHint = container.querySelector('[data-miner-air-hint]');
      const powerHint = container.querySelector('[data-miner-power-hint]');
      const barFill = container.querySelector('[data-miner-bar-fill]');
      const placementLabel = container.querySelector('[data-miner-score]');
      const rateEls = container.querySelectorAll('[data-miner-rate]');
      const airOut = container.querySelector('[data-miner-air-display]');
      const powerOut = container.querySelector('[data-miner-power-display]');
      const airFlowOut = container.querySelector('[data-miner-air-flow]');
      const powerFlowOut = container.querySelector('[data-miner-power-flow]');
      const statusEl = container.querySelector('[data-miner-status]');
      const toggleBtn = container.querySelector('[data-miner-toggle]');

      const describeChannel = (score) => {
        if (score > 0.8) return 'Sweet spot – systém je tichý a vychlazený.';
        if (score > 0.55) return 'Stabilní chod, ale můžeš zkusit jemné doladění.';
        if (score > 0.35) return 'Nestálé turbulence, výkon padá.';
        return 'Plýtváš výkonem, najdi jinou konfiguraci.';
      };

      const describeCombined = (value) => {
        if (value >= 85) return 'Rig je v perfektním tunelu. Hashrate letí nahoru.';
        if (value >= 65) return 'Sladěné proudění i napětí, drž se v tom pásmu.';
        if (value >= 45) return 'Použitelné, ale hotspoty budou jinde.';
        return 'Tahle kombinace dusí rig. Přesuň oba slidery.';
      };

      const updatePlacement = (airValue, powerValue) => {
        const sanitizedAir = Math.min(100, Math.max(0, Number(airValue)));
        const sanitizedPower = Math.min(100, Math.max(0, Number(powerValue)));
        if (sliderAir && sliderAir.value !== String(sanitizedAir)) sliderAir.value = String(sanitizedAir);
        if (sliderPower && sliderPower.value !== String(sanitizedPower)) sliderPower.value = String(sanitizedPower);
        gameState.cryptoMinerAirflow = sanitizedAir;
        gameState.cryptoMinerPower = sanitizedPower;
        const quality = computePlacementQuality(sanitizedAir, sanitizedPower);
        gameState.cryptoMinerPlacement = quality;
        const newRate = computeCryptoMinerRate(quality);
        if (placementLabel) placementLabel.textContent = `${quality}%`;
        if (airOut) airOut.textContent = `${sanitizedAir}%`;
        if (powerOut) powerOut.textContent = `${sanitizedPower}%`;
        if (barFill) barFill.style.width = `${quality}%`;
        rateEls.forEach((node) => { node.textContent = `${newRate} RC/min`; });
        const airScore = evaluateMinerChannel(sanitizedAir, gameState.cryptoMinerAirSeed);
        if (airHint) {
          airHint.textContent = describeChannel(airScore);
        }
        if (airFlowOut) {
          airFlowOut.textContent = `${Math.round(airScore * 100)}% flow`;
        }
        const powerScore = evaluateMinerChannel(sanitizedPower, gameState.cryptoMinerPowerSeed);
        if (powerHint) {
          powerHint.textContent = describeChannel(powerScore);
        }
        if (powerFlowOut) {
          powerFlowOut.textContent = `${Math.round(powerScore * 100)}% flow`;
        }
        if (combinedHint) combinedHint.textContent = describeCombined(quality);
        updateResCoinDisplays();
        persistState();
      };

      const updateStatusUI = () => {
        const status = gameState.cryptoMinerInstalled ? (gameState.cryptoMinerActive ? 'ONLINE' : 'IDLE') : 'OFFLINE';
        if (statusEl) statusEl.textContent = status;
        if (toggleBtn) {
          toggleBtn.textContent = gameState.cryptoMinerActive ? 'Pause Mining' : 'Start Mining';
          toggleBtn.classList.toggle('is-active', gameState.cryptoMinerActive);
        }
      };

      sliderAir?.addEventListener('input', (event) => {
        updatePlacement(event.target.value, sliderPower?.value ?? power);
      });

      sliderPower?.addEventListener('input', (event) => {
        updatePlacement(sliderAir?.value ?? airflow, event.target.value);
      });

      toggleBtn?.addEventListener('click', () => {
        gameState.cryptoMinerActive = !gameState.cryptoMinerActive;
        if (gameState.cryptoMinerActive) {
          gameState.cryptoMinerLastPayout = Date.now();
        }
        updateStatusUI();
        updateResCoinDisplays();
        persistState();
      });

      updatePlacement(airflow, power);
      updateStatusUI();
      updateResCoinDisplays();
    }
  },
  movementdetector: {
    title: "Movement Detector",
    icon: "🛡",
    render: (container) => {
      const charges = Math.max(0, Number(gameState.movementDetectorCharges || 0));
      const status = gameState.movementDetectorStatus === 'alert' ? 'ALERT' : 'CLEAR';
      const hint = status === 'ALERT'
        ? 'Breather signature detected. Brace for contact.'
        : 'No hostile movement within range.';
      container.innerHTML = `
        <section class="sensor-app">
          <header class="sensor-head">
            <div>
              <div class="sensor-eyebrow">Intrusion Sensor</div>
              <div class="sensor-title">Movement Detector</div>
            </div>
            <div class="sensor-stock">
              <span>Single-use modules</span>
              <strong data-sensor-stock>${charges}</strong>
            </div>
          </header>
          <div class="sensor-body">
            <div class="sensor-light" data-sensor-light role="status" aria-live="polite" aria-label="${status}"></div>
            <div>
              <div class="sensor-status" data-sensor-status>${status}</div>
              <p class="sensor-hint" data-sensor-hint>${hint}</p>
            </div>
          </div>
          <footer class="sensor-footer">
            <p>Sensor blinks red ≈5s before Breather arrives. Each module is consumed on trigger.</p>
          </footer>
        </section>
      `;
      updateMovementDetectorDisplays();
    }
  },
};

function ensureAppDefinition(key) {
  if (!apps[key] && hiddenApps[key]) {
    apps[key] = hiddenApps[key];
  }
}

function ensureDesktopIcon(appKey, iconSymbol, label) {
  const iconGrid = desktop?.querySelector(".icon-grid");
  if (!iconGrid || iconGrid.querySelector(`[data-app="${appKey}"]`)) return;
  const btn = document.createElement("button");
  btn.className = "desktop-icon";
  btn.dataset.app = appKey;
  btn.innerHTML = `
    <span class="icon-symbol">${iconSymbol}</span>
    <span class="icon-label">${label}</span>
  `;
  btn.addEventListener("dblclick", () => openApp(appKey));
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") openApp(appKey);
  });
  iconGrid.appendChild(btn);
}

let torInstalling = false;
let minerInstalling = false;

function showLinksPdf() {
  if (!gameState.linksInstalled) installLinksApp();

  try {
    const anchor = document.createElement('a');
    anchor.href = 'links.pdf';
    anchor.download = 'links.pdf';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    requestAnimationFrame(() => anchor.remove());
  } catch (e) {
    console.error('Failed to trigger links download', e);
    alert('Nepodařilo se spustit stahování links.pdf. Zkontroluj, že soubor existuje.');
  }
}

function installResMarket() {
  if (gameState.resMarketInstalled) {
    ensureAppDefinition('resmarket');
    ensureDesktopIcon('resmarket', 'Ⓡ', 'ResMarket');
    alert('ResMarket už je nainstalovaný.');
    openApp('resmarket');
    return;
  }

  const overlay = document.getElementById('popupLayer');
  const box = document.createElement('div');
  box.className = 'door-popup';

  const steps = [
    { title: 'ResMarket Setup', body: 'Installer připravuje prostředí.', primary: 'Další' },
    { title: 'Stažení balíčku', body: '<div class="install-bar"><div class="install-fill" id="res-install-fill" style="width:0%"></div></div><p style="margin-top:8px;">Stahuji komponenty...</p>', primary: 'Čekej', installing: true },
    { title: 'Hotovo', body: 'ResMarket byl nainstalován. Najdeš ho na ploše i ve Start menu.', primary: 'Zavřít', done: true }
  ];

  let stepIndex = 0;
  let progressTimer = null;

  const renderStep = () => {
    const step = steps[stepIndex];
    box.innerHTML = `
      <div class="wizard">
        <div class="wizard-header">${step.title}</div>
        <div class="wizard-body">${step.body}</div>
        <div class="wizard-actions">
          <button class="wizard-btn secondary" id="res-cancel">Zrušit</button>
          <div class="spacer"></div>
          <button class="wizard-btn primary" id="res-next">${step.primary}</button>
        </div>
      </div>
    `;
    attachHandlers(step);
  };

  const finishInstall = () => {
    ensureAppDefinition('resmarket');
    gameState.resMarketInstalled = true;
    renderStartMenu();
    ensureDesktopIcon('resmarket', 'Ⓡ', 'ResMarket');
  };

  const startProgress = () => {
    const fill = box.querySelector('#res-install-fill');
    let progress = 0;
    progressTimer = setInterval(() => {
      progress += Math.random() * 18 + 7;
      if (progress > 100) progress = 100;
      if (fill) fill.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(progressTimer);
        progressTimer = null;
        stepIndex = steps.length - 1;
        finishInstall();
        renderStep();
          try { openApp('resmarket'); } catch (e) { console.error(e); }
      }
    }, 260);
  };

  const handleNext = (step) => {
    if (step.installing && !progressTimer) {
      startProgress();
      return;
    }
    if (step.installing && progressTimer) return;
    if (step.done) {
      closeWizard();
      return;
    }
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
    renderStep();
  };

  const closeWizard = () => {
    if (progressTimer) clearInterval(progressTimer);
    box.remove();
    overlay.style.pointerEvents = 'none';
  };

  const attachHandlers = (step) => {
    const btnNext = box.querySelector('#res-next');
    const btnCancel = box.querySelector('#res-cancel');
    btnNext?.addEventListener('click', () => handleNext(step));
    btnCancel?.addEventListener('click', () => closeWizard());
    if (step.installing && !progressTimer) startProgress();
  };

  overlay.appendChild(box);
  overlay.style.pointerEvents = 'auto';
  renderStep();
}

function ensureMinerSeeds() {
  if (typeof gameState.cryptoMinerAirSeed !== 'number') {
    gameState.cryptoMinerAirSeed = Math.random();
  }
  if (typeof gameState.cryptoMinerPowerSeed !== 'number') {
    gameState.cryptoMinerPowerSeed = Math.random();
  }
}

function evaluateMinerChannel(value, seed) {
  const normalized = Math.min(1, Math.max(0, Number(value) / 100));
  const wave = Math.sin((normalized + seed) * Math.PI * 3);
  const ripple = Math.sin((normalized * 2.3 + seed * 1.7) * Math.PI * 5) * 0.5;
  const pocketCenter = (seed * 743) % 1;
  const pocket = Math.max(0, 1 - Math.abs(normalized - pocketCenter) * 3);
  const raw = (wave + ripple + pocket + 2) / 4;
  return Math.min(1, Math.max(0, raw));
}

function computePlacementQuality(airflowInput = null, powerInput = null) {
  ensureMinerSeeds();
  const airflow = airflowInput ?? (typeof gameState.cryptoMinerAirflow === 'number' ? gameState.cryptoMinerAirflow : 55);
  const power = powerInput ?? (typeof gameState.cryptoMinerPower === 'number' ? gameState.cryptoMinerPower : 45);
  const airScore = evaluateMinerChannel(airflow, gameState.cryptoMinerAirSeed);
  const powerScore = evaluateMinerChannel(power, gameState.cryptoMinerPowerSeed);
  const jitter = Math.sin((airflow * 0.7 + power * 1.3 + gameState.cryptoMinerAirSeed * 100) * 0.08) * 5;
  const combined = (airScore * 0.55 + powerScore * 0.45) * 100 + jitter;
  return Math.round(Math.min(100, Math.max(5, combined)));
}

function computeCryptoMinerRate(placementInput = null) {
  const placement = placementInput ?? computePlacementQuality();
  return Math.round(3 + (placement / 100) * 17);
}

function formatMinerRelativeLabel() {
  if (!gameState.cryptoMinerActive) return 'Paused';
  if (!gameState.cryptoMinerLastPayout) return 'Initializing';
  const diff = Date.now() - gameState.cryptoMinerLastPayout;
  if (diff < 5_000) return 'Just now';
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))} s ago`;
  const mins = Math.round(diff / 60_000);
  return `${mins} min ago`;
}

function updateResCoinDisplays() {
  ensureMinerSeeds();
  const airflow = Math.min(100, Math.max(0, Number(gameState.cryptoMinerAirflow ?? 55)));
  const power = Math.min(100, Math.max(0, Number(gameState.cryptoMinerPower ?? 45)));
  const runningBalance = Number((gameState.resCoins || 0) + (gameState.cryptoMinerCarry || 0));
  const balanceLabel = runningBalance.toFixed(1);
  document.querySelectorAll('[data-res-balance]').forEach((node) => {
    node.textContent = `${balanceLabel} Res Coins`;
  });

  const placement = Math.min(
    100,
    Math.max(0, Number(gameState.cryptoMinerPlacement ?? computePlacementQuality(airflow, power)))
  );
  const placementLabel = `${placement}%`;
  document.querySelectorAll('[data-miner-score]').forEach((node) => {
    node.textContent = placementLabel;
  });
  document.querySelectorAll('[data-miner-placement]').forEach((node) => {
    node.textContent = placementLabel;
  });
  document.querySelectorAll('[data-miner-bar-fill]').forEach((node) => {
    node.style.width = placementLabel;
  });

  const rate = computeCryptoMinerRate(placement);
  document.querySelectorAll('[data-miner-rate]').forEach((node) => {
    node.textContent = `${rate} RC/min`;
  });

  const minted = Number(gameState.cryptoMinerMinted || 0).toFixed(1);
  document.querySelectorAll('[data-miner-earned]').forEach((node) => {
    node.textContent = `${minted} RC`;
  });

  const airFlowPercent = Math.round(evaluateMinerChannel(airflow, gameState.cryptoMinerAirSeed) * 100);
  document.querySelectorAll('[data-miner-air-flow]').forEach((node) => {
    node.textContent = `${airFlowPercent}% flow`;
  });

  const powerFlowPercent = Math.round(evaluateMinerChannel(power, gameState.cryptoMinerPowerSeed) * 100);
  document.querySelectorAll('[data-miner-power-flow]').forEach((node) => {
    node.textContent = `${powerFlowPercent}% flow`;
  });

  document.querySelectorAll('[data-miner-balance]').forEach((node) => {
    node.textContent = `${balanceLabel} RC`;
  });

  const lastLabel = formatMinerRelativeLabel();
  document.querySelectorAll('[data-miner-last]').forEach((node) => {
    node.textContent = lastLabel;
  });

  const status = gameState.cryptoMinerInstalled ? (gameState.cryptoMinerActive ? 'ONLINE' : 'IDLE') : 'OFFLINE';
  document.querySelectorAll('[data-miner-status]').forEach((node) => {
    node.textContent = status;
  });
  document.querySelectorAll('[data-miner-toggle]').forEach((node) => {
    node.textContent = gameState.cryptoMinerActive ? 'Pause Mining' : 'Start Mining';
    node.classList.toggle('is-active', !!gameState.cryptoMinerActive);
  });

  updateMovementDetectorDisplays();
}

function playMovementDetectorBeep() {
  try {
    if (!movementDetectorAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      movementDetectorAudioCtx = new AudioCtx();
    }
    const ctx = movementDetectorAudioCtx;
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (err) {
    console.warn('Sensor beep failed', err);
  }
}

function startMovementDetectorAlarm() {
  if (movementDetectorAlarmInterval) return;
  playMovementDetectorBeep();
  movementDetectorAlarmInterval = setInterval(playMovementDetectorBeep, 900);
}

function stopMovementDetectorAlarm() {
  if (movementDetectorAlarmInterval) {
    clearInterval(movementDetectorAlarmInterval);
    movementDetectorAlarmInterval = null;
  }
}

function activateMovementDetectorAlert() {
  gameState.movementDetectorStatus = 'alert';
  updateMovementDetectorDisplays();
  startMovementDetectorAlarm();
}

function clearMovementDetectorAlert() {
  stopMovementDetectorAlarm();
  if (gameState.movementDetectorStatus !== 'clear') {
    gameState.movementDetectorStatus = 'clear';
    updateMovementDetectorDisplays();
  }
}

function updateMovementDetectorDisplays() {
  const charges = Math.max(0, Number(gameState.movementDetectorCharges || 0));
  const status = gameState.movementDetectorStatus === 'alert' ? 'alert' : 'clear';
  const statusLabel = status === 'alert' ? 'ALERT' : 'CLEAR';
  const hint = status === 'alert'
    ? 'Breather signature detected. Brace for contact.'
    : (gameState.movementDetectorInstalled ? 'No hostile movement within range.' : 'Purchase modules in ResMarket.');
  const detectorInstalled = !!gameState.movementDetectorInstalled;
  const detectorAffordable = getLiquidResCoinBalance() >= MOVEMENT_DETECTOR_COST;
  const detectorCtaLabel = detectorInstalled
    ? `Buy Sensor (${MOVEMENT_DETECTOR_COST} RC)`
    : `Install Sensor (${MOVEMENT_DETECTOR_COST} RC)`;

  document.querySelectorAll('[data-sensor-light]').forEach((node) => {
    node.dataset.state = status;
    node.setAttribute('aria-label', statusLabel);
  });
  document.querySelectorAll('[data-sensor-status]').forEach((node) => {
    node.textContent = statusLabel;
  });
  document.querySelectorAll('[data-sensor-hint]').forEach((node) => {
    node.textContent = hint;
  });
  document.querySelectorAll('[data-sensor-stock]').forEach((node) => {
    node.textContent = charges;
  });
  document.querySelectorAll('[data-detector-stock]').forEach((node) => {
    node.textContent = charges;
  });
  document.querySelectorAll('[data-res-detector]').forEach((button) => {
    button.textContent = detectorCtaLabel;
    button.disabled = !detectorAffordable;
    button.classList.toggle('primary', detectorAffordable);
    button.classList.toggle('secondary', !detectorAffordable);
  });
}

function installCryptoMiner() {
  if (!gameState.resMarketInstalled) {
    installResMarket();
    return;
  }

  if (gameState.cryptoMinerInstalled) {
    ensureAppDefinition('cryptominer');
    ensureDesktopIcon('cryptominer', '⛏', 'Crypto Miner');
    openApp('cryptominer');
    return;
  }

  if (minerInstalling) {
    alert('Instalátor Crypto Mineru už běží.');
    return;
  }
  minerInstalling = true;

  const overlay = document.getElementById('popupLayer');
  const box = document.createElement('div');
  box.className = 'door-popup';

  const steps = [
    { title: 'Crypto Miner Loader', body: 'Stahuji závislosti a připravuji sandbox.', primary: 'Další' },
    { title: 'Downloading Payload', body: '<div class="install-bar"><div class="install-fill" id="miner-install-fill" style="width:0%"></div></div><p style="margin-top:8px;">Přesouvám image do Res systému...</p>', primary: 'Čekej', installing: true },
    { title: 'Hotovo', body: 'Miner je připravený. Otevři aplikaci a dolaď umístění rigů.', primary: 'Spustit', done: true }
  ];

  let stepIndex = 0;
  let progressTimer = null;

  const renderStep = () => {
    const step = steps[stepIndex];
    box.innerHTML = `
      <div class="wizard">
        <div class="wizard-header">${step.title}</div>
        <div class="wizard-body">${step.body}</div>
        <div class="wizard-actions">
          <button class="wizard-btn secondary" id="miner-cancel">Zrušit</button>
          <div class="spacer"></div>
          <button class="wizard-btn primary" id="miner-next">${step.primary}</button>
        </div>
      </div>
    `;
    attachHandlers(step);
  };

  const finishInstall = () => {
    ensureAppDefinition('cryptominer');
    gameState.cryptoMinerInstalled = true;
    if (typeof gameState.cryptoMinerAirflow !== 'number') gameState.cryptoMinerAirflow = 58;
    if (typeof gameState.cryptoMinerPower !== 'number') gameState.cryptoMinerPower = 46;
    if (typeof gameState.cryptoMinerAirSeed !== 'number') gameState.cryptoMinerAirSeed = Math.random();
    if (typeof gameState.cryptoMinerPowerSeed !== 'number') gameState.cryptoMinerPowerSeed = Math.random();
    if (typeof gameState.cryptoMinerPlacement !== 'number') {
      gameState.cryptoMinerPlacement = computePlacementQuality(gameState.cryptoMinerAirflow, gameState.cryptoMinerPower);
    }
    gameState.cryptoMinerLastPayout = null;
    gameState.cryptoMinerCarry = 0;
    if (typeof gameState.cryptoMinerMinted !== 'number') gameState.cryptoMinerMinted = 0;
    gameState.cryptoMinerActive = false;
    renderStartMenu();
    ensureDesktopIcon('cryptominer', '⛏', 'Crypto Miner');
    startCryptoMinerLoop();
    updateResCoinDisplays();
    persistState();
  };

  const startProgress = () => {
    const fill = box.querySelector('#miner-install-fill');
    let progress = 0;
    progressTimer = setInterval(() => {
      progress += Math.random() * 20 + 8;
      if (progress > 100) progress = 100;
      if (fill) fill.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(progressTimer);
        progressTimer = null;
        stepIndex = steps.length - 1;
        finishInstall();
        renderStep();
        try { openApp('cryptominer'); } catch (err) { console.error(err); }
      }
    }, 240);
  };

  const handleNext = (step) => {
    if (step.installing && !progressTimer) {
      startProgress();
      return;
    }
    if (step.installing && progressTimer) return;
    if (step.done) {
      closeWizard();
      return;
    }
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
    renderStep();
  };

  const closeWizard = () => {
    if (progressTimer) clearInterval(progressTimer);
    box.remove();
    overlay.style.pointerEvents = 'none';
    minerInstalling = false;
  };

  const attachHandlers = (step) => {
    const btnNext = box.querySelector('#miner-next');
    const btnCancel = box.querySelector('#miner-cancel');
    btnNext?.addEventListener('click', () => handleNext(step));
    btnCancel?.addEventListener('click', () => closeWizard());
    if (step.installing && !progressTimer) startProgress();
  };

  overlay.appendChild(box);
  overlay.style.pointerEvents = 'auto';
  renderStep();
}

let cryptoMinerTimer = null;

function tickCryptoMiner() {
  if (!gameState.cryptoMinerInstalled) {
    gameState.cryptoMinerLastPayout = null;
    updateResCoinDisplays();
    return;
  }

  if (!gameState.cryptoMinerActive) {
    updateResCoinDisplays();
    return;
  }

  const now = Date.now();
  const last = typeof gameState.cryptoMinerLastPayout === 'number' ? gameState.cryptoMinerLastPayout : now;
  const elapsed = now - last;
  if (elapsed <= 0) {
    gameState.cryptoMinerLastPayout = now;
    return;
  }

  const rate = computeCryptoMinerRate();
  const earned = (rate * elapsed) / 60_000;
  const currentMinted = typeof gameState.cryptoMinerMinted === 'number' ? gameState.cryptoMinerMinted : 0;
  const mintedTotal = currentMinted + earned;
  gameState.cryptoMinerMinted = Math.round(mintedTotal * 1000) / 1000;
  gameState.cryptoMinerCarry = (gameState.cryptoMinerCarry || 0) + earned;
  const payout = Math.floor(gameState.cryptoMinerCarry * 10) / 10;
  if (payout >= 0.1) {
    gameState.cryptoMinerCarry = Math.max(0, gameState.cryptoMinerCarry - payout);
    const updatedBalance = Math.round(((gameState.resCoins || 0) + payout) * 10) / 10;
    gameState.resCoins = updatedBalance;
    updateResCoinDisplays();
    persistState();
  }

  gameState.cryptoMinerLastPayout = now;
  updateResCoinDisplays();
}

function startCryptoMinerLoop() {
  if (cryptoMinerTimer) return;
  cryptoMinerTimer = setInterval(() => {
    try {
      tickCryptoMiner();
    } catch (err) {
      console.error('Crypto miner tick failed', err);
    }
  }, 5_000);
  tickCryptoMiner();
}

function ensureMovementDetectorApp() {
  ensureAppDefinition('movementdetector');
  ensureDesktopIcon('movementdetector', '🛡', 'Movement Detector');
}

function purchaseMovementDetector() {
  if (getLiquidResCoinBalance() < MOVEMENT_DETECTOR_COST) {
    alert('Res Coins nestačí. Vydělej víc a zkus to znovu.');
    return;
  }

  if (!spendResCoins(MOVEMENT_DETECTOR_COST)) {
    alert('Platba selhala, zkus to znova.');
    return;
  }

  gameState.movementDetectorCharges = (gameState.movementDetectorCharges || 0) + 1;

  if (!gameState.movementDetectorInstalled) {
    gameState.movementDetectorInstalled = true;
    ensureMovementDetectorApp();
    renderStartMenu();
  } else {
    ensureMovementDetectorApp();
  }

  updateResCoinDisplays();
  updateMovementDetectorDisplays();
  persistState();
  try { refreshApp('resmarket'); } catch (err) { console.warn('ResMarket refresh failed', err); }
}

function installLinksApp() {
  ensureAppDefinition('links');
  if (!gameState.linksInstalled) {
    gameState.linksInstalled = true;
  }
  renderStartMenu();
  ensureDesktopIcon('links', '📄', 'links.pdf');
}

function installTor() {
  if (gameState.torInstalled) {
    alert('Tor Client už je nainstalovaný.');
    return;
  }
  if (torInstalling) {
    alert('Instalátor Toru už běží.');
    return;
  }
  torInstalling = true;

  const overlay = document.getElementById('popupLayer');
  const box = document.createElement('div');
  box.className = 'door-popup';

  const steps = [
    {
      title: 'Tor Setup',
      body: 'Vítej v instalačním průvodci. Pokračuj na další krok.',
      primary: 'Další',
    },
    {
      title: 'Licence',
      body: 'Kliknutím na "Instalovat" souhlasíš s instalací Tor Clientu.',
      primary: 'Instalovat',
    },
    {
      title: 'Instalace probíhá',
      body: '<div class="install-bar"><div class="install-fill" id="install-fill" style="width:0%"></div></div><p style="margin-top:8px;">Kopíruji soubory...</p>',
      primary: 'Dokončit',
      installing: true,
    },
    {
      title: 'Hotovo',
      body: 'Tor Client byl nainstalován. Najdeš ho na ploše i ve Start menu.',
      primary: 'Zavřít',
      done: true,
    }
  ];

  let stepIndex = 0;
  let progressTimer = null;

  const renderStep = () => {
    const step = steps[stepIndex];
    box.innerHTML = `
      <div class="wizard">
        <div class="wizard-header">${step.title}</div>
        <div class="wizard-body">${step.body}</div>
        <div class="wizard-actions">
          <button class="wizard-btn secondary" id="wiz-cancel">Zrušit</button>
          <div class="spacer"></div>
          <button class="wizard-btn primary" id="wiz-next">${step.primary}</button>
        </div>
      </div>
    `;
    attachHandlers(step);
  };

  const finishInstall = () => {
    // Enable apps
    apps.tor = hiddenApps.tor;
    apps.browser = hiddenApps.browser;
    gameState.torInstalled = true;

    renderStartMenu();

    const desktop = document.getElementById("desktop");
    const iconGrid = desktop.querySelector(".icon-grid");
    const exists = iconGrid.querySelector('[data-app="tor"]');
    if (!exists) {
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

  };

  const startProgress = () => {
    const fill = box.querySelector('#install-fill');
    let progress = 0;
    progressTimer = setInterval(() => {
      progress += Math.random() * 18 + 7;
      if (progress > 100) progress = 100;
      if (fill) fill.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(progressTimer);
        progressTimer = null;
        stepIndex = steps.length - 1;
        finishInstall();
        renderStep();
      }
    }, 280);
  };

  const handleNext = (step) => {
    if (step.installing && !progressTimer) {
      startProgress();
      return;
    }
    if (step.installing && progressTimer) {
      return; // Wait for progress to finish
    }
    if (step.done) {
      closeWizard();
      return;
    }
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
    renderStep();
  };

  const closeWizard = () => {
    if (progressTimer) clearInterval(progressTimer);
    box.remove();
    overlay.style.pointerEvents = 'none';
    torInstalling = false;
  };

  const attachHandlers = (step) => {
    const btnNext = box.querySelector('#wiz-next');
    const btnCancel = box.querySelector('#wiz-cancel');
    btnNext?.addEventListener('click', () => handleNext(step));
    btnCancel?.addEventListener('click', () => closeWizard());
    if (step.installing && !progressTimer) {
      startProgress();
    }
  };

  overlay.appendChild(box);
  overlay.style.pointerEvents = 'auto';
  renderStep();
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
  resCoins: 0,
  currentIP: "192.168.1.1",
  currentPage: "about:tor",
  torInstalled: false,
  torRunning: false,
  currentNetwork: null, // { ssid }
  numericKeyFound: false,
  alerts: 0,
  resMarketInstalled: false,
  cryptoMinerInstalled: false,
  cryptoMinerPlacement: 62,
  cryptoMinerLastPayout: null,
  cryptoMinerCarry: 0,
  cryptoMinerMinted: 0,
  cryptoMinerActive: false,
  cryptoMinerAirflow: 55,
  cryptoMinerPower: 45,
  cryptoMinerAirSeed: null,
  cryptoMinerPowerSeed: null,
  movementDetectorInstalled: false,
  movementDetectorCharges: 0,
  movementDetectorStatus: 'clear',
  torBriefingSent: false,
  linksInstalled: false,
  vpnTier: -1,
  chatStep: 0,
  chatHistory: [],
  openApps: [], // Array of { key, minimized, x, y, zIndex }
  countdownActive: false,
  countdownDeadline: null,
  countdownTriggered: false,
};

function freshGameState(overrides = {}) {
  let base;
  if (typeof structuredClone === 'function') {
    base = structuredClone(defaultGameState);
  } else {
    base = JSON.parse(JSON.stringify(defaultGameState));
  }
  return Object.assign(base, overrides);
}

function loadSavedData() {
  try {
    const saved = localStorage.getItem("etg-save-v1");
    if (saved) return JSON.parse(saved);
  } catch (e) { console.error(e); }
  return null;
}

const savedData = loadSavedData();
let gameState = savedData ? freshGameState(savedData.gameState) : freshGameState();

if (typeof gameState.vpnTier !== 'number') {
  gameState.vpnTier = -1;
}
if (typeof gameState.countdownTriggered !== 'boolean') {
  gameState.countdownTriggered = false;
}
if (typeof gameState.countdownDeadline === 'string') {
  const parsed = Number(gameState.countdownDeadline);
  gameState.countdownDeadline = Number.isFinite(parsed) ? parsed : null;
}
if (gameState.countdownActive && !gameState.countdownDeadline) {
  gameState.countdownActive = false;
  gameState.countdownDeadline = null;
  gameState.countdownTriggered = false;
}

if (typeof gameState.resMarketInstalled !== 'boolean' && typeof gameState.dosMarketInstalled === 'boolean') {
  gameState.resMarketInstalled = gameState.dosMarketInstalled;
  delete gameState.dosMarketInstalled;
}

if (Array.isArray(gameState.openApps)) {
  gameState.openApps = gameState.openApps.map(app => (
    app && app.key === 'dosmarket' ? { ...app, key: 'resmarket' } : app
  ));
}

if (typeof gameState.resCoins !== 'number') {
  if (typeof gameState.dosCoin === 'number') {
    gameState.resCoins = gameState.dosCoin;
  } else {
    gameState.resCoins = 0;
  }
  delete gameState.dosCoin;
}

if (typeof gameState.cryptoMinerInstalled !== 'boolean') {
  gameState.cryptoMinerInstalled = false;
}
if (typeof gameState.cryptoMinerCarry !== 'number') {
  gameState.cryptoMinerCarry = 0;
}
if (typeof gameState.cryptoMinerMinted !== 'number') {
  gameState.cryptoMinerMinted = 0;
}
if (typeof gameState.cryptoMinerLastPayout !== 'number') {
  gameState.cryptoMinerLastPayout = null;
}
if (typeof gameState.cryptoMinerActive !== 'boolean') {
  gameState.cryptoMinerActive = false;
}
if (typeof gameState.cryptoMinerAirflow !== 'number') {
  gameState.cryptoMinerAirflow = 55;
}
if (typeof gameState.cryptoMinerPower !== 'number') {
  gameState.cryptoMinerPower = 45;
}
if (typeof gameState.cryptoMinerAirSeed !== 'number') {
  gameState.cryptoMinerAirSeed = Math.random();
}
if (typeof gameState.cryptoMinerPowerSeed !== 'number') {
  gameState.cryptoMinerPowerSeed = Math.random();
}
if (typeof gameState.cryptoMinerPlacement !== 'number' || Number.isNaN(gameState.cryptoMinerPlacement)) {
  gameState.cryptoMinerPlacement = computePlacementQuality(gameState.cryptoMinerAirflow, gameState.cryptoMinerPower);
}

if (typeof gameState.movementDetectorInstalled !== 'boolean') {
  gameState.movementDetectorInstalled = false;
}
if (typeof gameState.movementDetectorCharges !== 'number' || Number.isNaN(gameState.movementDetectorCharges)) {
  gameState.movementDetectorCharges = 0;
}
if (typeof gameState.movementDetectorStatus !== 'string') {
  gameState.movementDetectorStatus = 'clear';
}

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

function runMissionTimerCompletionSequence() {
  console.warn('Mission timer finished. Replace runMissionTimerCompletionSequence() with the desired sequence.');
}

const missionTimer = (() => {
  const displays = new Set();
  const parser = document.createElement('div');
  const triggerPatterns = [
    /mas\s+1\s+hodinu/,
    /mas\s+jednu\s+hodinu/,
    /you\s+have\s+1\s+hour/,
  ];

  let intervalId = null;

  const timerState = {
    active: false,
    deadline: null,
  };

  function normalizeMessage(text = '') {
    parser.innerHTML = text;
    const plain = (parser.textContent || parser.innerText || '').trim();
    parser.textContent = '';
    return plain
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function ensureTimerSurface(openWindow = true) {
    ensureAppDefinition('timer');
    ensureDesktopIcon('timer', '⏱', 'Timer');
    if (openWindow && !state.windows.has('timer')) {
      try { openApp('timer'); } catch (err) {
        console.warn('Timer window open failed', err);
      }
    }
  }

  function persistCountdown() {
    gameState.countdownActive = timerState.active;
    gameState.countdownDeadline = timerState.deadline;
    gameState.countdownTriggered = timerState.active;
    persistState();
  }

  function clearTicker() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function broadcast(remainingMs) {
    displays.forEach((entry) => {
      if (!entry.root.isConnected) {
        displays.delete(entry);
        return;
      }
      entry.update(remainingMs);
    });
  }

  function handleExpiry() {
    broadcast(0);
    stop({ keepDisplay: true });
    runMissionTimerCompletionSequence();
    gameOver('Čas vypršel. Poprava se spustila.', { keepCountdownVisible: true });
  }

  function tick() {
    if (!timerState.active || !timerState.deadline) {
      clearTicker();
      broadcast(null);
      return;
    }
    const remaining = timerState.deadline - Date.now();
    if (remaining <= 0) {
      handleExpiry();
      return;
    }
    broadcast(remaining);
  }

  function start(minutes = 60) {
    const duration = Math.max(1, minutes) * 60 * 1000;
    timerState.active = true;
    timerState.deadline = Date.now() + duration;
    ensureTimerSurface(true);
    tick();
    clearTicker();
    intervalId = setInterval(tick, 1000);
    persistCountdown();
    return timerState.deadline;
  }

  function stop({ keepDisplay = false } = {}) {
    timerState.active = false;
    timerState.deadline = null;
    clearTicker();
    if (!keepDisplay) {
      broadcast(null);
    }
    gameState.countdownActive = false;
    gameState.countdownDeadline = null;
    gameState.countdownTriggered = false;
    persistState();
  }

  function resume() {
    if (!gameState.countdownActive || typeof gameState.countdownDeadline !== 'number') {
      stop();
      return;
    }
    timerState.active = true;
    timerState.deadline = gameState.countdownDeadline;
    ensureTimerSurface(true);
    tick();
    clearTicker();
    intervalId = setInterval(tick, 1000);
  }

  function attachDisplay(rootEl, options = {}) {
    if (!rootEl) return null;
    const valueEl = rootEl.querySelector('[data-role="timer-value"]');
    if (!valueEl) return null;
    const entry = {
      root: rootEl,
      valueEl,
      defaultText: valueEl.textContent || '60:00',
      onStateChange: typeof options.onStateChange === 'function' ? options.onStateChange : null,
      update(remainingMs) {
        const isActive = typeof remainingMs === 'number' && remainingMs >= 0;
        if (isActive) {
          this.valueEl.textContent = formatCountdown(remainingMs);
          this.root.classList.add('visible');
          this.root.classList.toggle('danger', remainingMs <= 5 * 60 * 1000);
          this.root.setAttribute('aria-hidden', 'false');
        } else {
          this.valueEl.textContent = this.defaultText;
          this.root.classList.remove('visible', 'danger');
          this.root.setAttribute('aria-hidden', 'true');
        }
        this.onStateChange?.({ active: isActive, remainingMs: isActive ? remainingMs : null });
      },
    };
    displays.add(entry);
    if (timerState.active && timerState.deadline) {
      entry.update(Math.max(0, timerState.deadline - Date.now()));
    } else {
      entry.update(null);
    }
    return entry;
  }

  function maybeTriggerFromMessage(rawText = '') {
    if (!rawText || timerState.active) return false;
    const normalized = normalizeMessage(rawText);
    if (triggerPatterns.some((pattern) => pattern.test(normalized))) {
      start(60);
      return true;
    }
    return false;
  }

  function init() {
    if (gameState.countdownActive && typeof gameState.countdownDeadline === 'number') {
      resume();
    } else {
      stop();
    }
  }

  return { init, start, stop, resume, attachDisplay, maybeTriggerFromMessage };
})();

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function attachCountdownDisplay(rootEl, options = {}) {
  return missionTimer.attachDisplay(rootEl, options);
}

function hideCountdownDisplay() {
  missionTimer.stop({ keepDisplay: false });
}

function startCountdown(minutes = 60) {
  missionTimer.start(minutes);
}

function stopCountdown(options = {}) {
  missionTimer.stop(options);
}

function resumeCountdownIfNeeded() {
  missionTimer.init();
}

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
      {
        id: "deeppedia://custom-nodes",
        title: "Custom Nodes",
        description: "Tvůj vlastní seznam relay uzlů",
        chip: "custom",
        url: "deeppedia.onion/custom-nodes",
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

function injectCustomLinkPages() {
  const directoryId = 'deeppedia://custom-nodes';
  deepSearchPages[directoryId] = {
    type: 'directory',
    requiresTor: true,
    label: 'Custom Nodes',
    title: 'Custom Routes',
    description: 'Adresář ručně přidaných uzlů.',
    links: customLinkPages.map((entry) => ({
      id: entry.address,
      title: entry.title || entry.address,
      description: entry.address,
      chip: 'custom',
      url: entry.address,
    })),
  };

  customLinkPages.forEach((entry) => {
    deepSearchPages[entry.address] = {
      type: 'custom',
      requiresTor: true,
      label: 'Custom Node',
      title: entry.title || entry.address,
      html: entry.html || `<div class="custom-page"><p>Obsah chybí.</p></div>`,
    };
  });
}

injectCustomLinkPages();

function incrementAlerts(message) {
  gameState.alerts += 1;
  updateStatusBar(message);
}

function updateStatusBar(message = '') {
  if (wifiStatusEl) {
    const bars = threatLevel > 70 ? '▂▄__' : threatLevel > 40 ? '▂▄▆_' : '▂▄▆█';
    const netLabel = gameState.currentNetwork ? gameState.currentNetwork.ssid : 'Offline';
    wifiStatusEl.textContent = `Wi‑Fi ${bars} · ${netLabel}`;
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
      gameState.resCoins = (gameState.resCoins || 0) + 5;
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
    gameState.resCoins = (gameState.resCoins || 0) + 10;
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
  if (gameState.isBreatherActive || breatherPendingTimeout) return;

  const detectorsArmed = gameState.movementDetectorInstalled && (gameState.movementDetectorCharges || 0) > 0;
  if (detectorsArmed) {
    gameState.movementDetectorCharges = Math.max(0, (gameState.movementDetectorCharges || 0) - 1);
    gameState.isBreatherActive = true;
    activateMovementDetectorAlert();
    updateMovementDetectorDisplays();
    updateResCoinDisplays();
    persistState();
    try { refreshApp('resmarket'); } catch (err) { console.warn('ResMarket refresh failed', err); }
    breatherPendingTimeout = setTimeout(() => {
      breatherPendingTimeout = null;
      startBreatherEncounter();
    }, MOVEMENT_DETECTOR_WARNING_MS);
    return;
  }

  gameState.isBreatherActive = true;
  startBreatherEncounter();
}

function startBreatherEncounter() {
  if (breatherPendingTimeout) {
    clearTimeout(breatherPendingTimeout);
    breatherPendingTimeout = null;
  }

  const overlay = document.getElementById('popupLayer');
  const box = document.createElement('div');
  box.className = 'door-popup breather-door';
  box.innerHTML = `
    <section class="door-hold">
      <div class="door-panel">
        <div class="door-window"></div>
        <button type="button" class="door-handle" data-door-handle>
          <span>HOLD</span>
        </button>
      </div>
      <div class="door-copy">
        <h3>Breather is forcing the door</h3>
        <p>Press and hold the handle to keep the latch engaged.</p>
        <div class="door-meter">
          <div class="door-meter__fill" data-door-fill style="width:55%"></div>
        </div>
      </div>
    </section>
  `;
  overlay.appendChild(box);
  overlay.style.pointerEvents = 'auto';

  const handle = box.querySelector('[data-door-handle]');
  const fill = box.querySelector('[data-door-fill]');
  let doorStrength = 55;
  let holding = false;

  const releaseHold = () => {
    holding = false;
    handle?.classList.remove('is-active');
  };

  handle?.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    holding = true;
    handle.classList.add('is-active');
  });

  window.addEventListener('pointerup', releaseHold, { once: false });
  window.addEventListener('pointerleave', releaseHold, { once: false });

  const cleanup = () => {
    window.removeEventListener('pointerup', releaseHold);
    window.removeEventListener('pointerleave', releaseHold);
  };

  const tickTimer = setInterval(() => {
    doorStrength += holding ? 5 : -7;
    doorStrength = Math.max(0, Math.min(100, doorStrength));
    if (fill) {
      fill.style.width = `${doorStrength}%`;
      fill.dataset.state = doorStrength > 60 ? 'stable' : doorStrength > 30 ? 'strain' : 'critical';
    }

    if (doorStrength <= 0) {
      resolve(false);
    } else if (doorStrength >= 100 && holding) {
      resolve(true);
    }
  }, 120);

  function resolve(success) {
    clearInterval(tickTimer);
    cleanup();
    box.remove();
    overlay.style.pointerEvents = 'none';
    gameState.isBreatherActive = false;
    if (success) {
      clearMovementDetectorAlert();
      threatLevel = Math.max(0, threatLevel - 30);
      checkThreats();
    } else {
      clearMovementDetectorAlert();
      gameOver('Breather se dostal dovnitř');
    }
  }
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

function gameOver(reason, options = {}) {
  const { keepCountdownVisible = false } = options;
  if (!keepCountdownVisible) {
    stopCountdown();
  } else {
    // Ensure internal state stops even if UI stays visible
    stopCountdown({ keepDisplay: true });
  }
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
    gameState = freshGameState();
    hideCountdownDisplay();
    checkThreats();
    updateStatusBar();
    startThreatSystem();
    resumeCountdownIfNeeded();
    persistState();
  });
}

// start threat system on load
startThreatSystem();

function primeTorHome() {
  gameState.currentPage = 'about:tor';
  if (typeof window !== 'undefined') {
    window.__pendingBrowserTarget = 'about:tor';
  }
}

function openApp(key, restoredState = null) {
  if (!apps[key] && hiddenApps[key]) {
    const canExpose = (
      (key === 'tor' && gameState.torInstalled) ||
      (key === 'browser' && gameState.torInstalled) ||
      (key === 'links' && gameState.linksInstalled) ||
      (key === 'resmarket' && gameState.resMarketInstalled) ||
      (key === 'cryptominer' && gameState.cryptoMinerInstalled) ||
      (key === 'movementdetector' && gameState.movementDetectorInstalled)
    );
    if (canExpose) {
      apps[key] = hiddenApps[key];
      renderStartMenu();
    }
  }

  if (!apps[key]) return;

  // Defensive: ensure Tor & Browser apps are registered if installed
  if (key === 'tor' && (!apps.tor || typeof apps.tor.render !== 'function') && hiddenApps?.tor) {
    apps.tor = hiddenApps.tor;
  }
  if (key === 'browser' && (!apps.browser || typeof apps.browser.render !== 'function') && hiddenApps?.browser) {
    apps.browser = hiddenApps.browser;
  }

  // If network is connected but tor flag isn't set, enable it so Tor can render while online
  if (key === 'tor' && gameState.currentNetwork && !gameState.torRunning) {
    gameState.torRunning = true;
    primeTorHome();
  }
  if (key === 'tor' && !gameState.currentPage) {
    primeTorHome();
  }

  // Browser now opens as a standalone surface, not inside a window frame.
  if (key === 'browser') {
    // Deep Web search app je skrytý; nepoužívat mimo Tor klient
    alert('Prohlížeč je dostupný jen skrz Tor Client.');
    return;
  }

  if (key === 'resmarket' && !gameState.resMarketInstalled) {
    installResMarket();
    return;
  }
  if (key === 'cryptominer' && !gameState.cryptoMinerInstalled) {
    installCryptoMiner();
    return;
  }
  if (key === 'movementdetector' && !gameState.movementDetectorInstalled) {
    alert('Kup Movement Detector v ResMarketu, abys odemkl aplikaci.');
    return;
  }
  if (key === 'links' && !gameState.linksInstalled) {
    installLinksApp();
    // fall through to open after install
  }

  const existing = state.windows.get(key);
  if (existing && !document.body.contains(existing.element)) {
    state.windows.delete(key); // stale reference, allow reopen
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
    const { width, height } = getAppWindowSize(key);
    windowEl.style.width = width;
    windowEl.style.height = height;
  }

  const content = windowEl.querySelector(".window__content");
  try {
    apps[key].render(content);
  } catch (e) {
    console.error(`Render failed for ${key}:`, e);
    content.innerHTML = `<div class="tor-connect-screen"><h2>${apps[key].title || key}</h2><p>Render failed. Try reopening.</p></div>`;
  }

  desktop.appendChild(windowEl);
  registerWindow(windowEl, key);
  makeDraggable(windowEl);
  addTaskbarButton(key);

  if (restoredState && restoredState.minimized) {
    minimizeWindow(key);
  } else {
    updateOpenAppsState(key, windowEl, false);
  }

  persistState();
}

function persistState() {
  try { saveGame(); } catch (e) { console.warn('saveGame failed', e); }
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

  persistState();
}

function ensureZIndexBaseline() {
  // Keep z-index increments ahead of any restored window positions
  const saved = Array.isArray(gameState.openApps) ? gameState.openApps : [];
  const maxSaved = saved.reduce((max, entry) => {
    const z = Number(entry?.zIndex);
    return Number.isFinite(z) ? Math.max(max, z) : max;
  }, state.zIndex);
  if (maxSaved >= state.zIndex) {
    state.zIndex = maxSaved + 1;
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
}

function refreshApp(key) {
  const data = state.windows.get(key);
  if (!data) return;

  const content = data.element.querySelector('.window__content');
  if (!content) return;

  const app = apps[key];
  if (!app || typeof app.render !== 'function') return;

  try {
    app.render(content);
  } catch (e) {
    console.error(`Refresh failed for ${key}:`, e);
    content.innerHTML = `<div class="tor-connect-screen"><h2>${app.title || key}</h2><p>Render failed. Try reopening.</p></div>`;
  }
  updateOpenAppsState(key, data.element, data.minimized);
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
  updateOpenAppsState(windowEl.dataset.app, windowEl, false);
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
  persistState();
}

function showWindow(windowData) {
  windowData.element.classList.remove("window--hidden");
  windowData.element.removeAttribute("aria-hidden");
  windowData.minimized = false;
  updateTaskbarState(windowData.element.dataset.app, true);
  updateOpenAppsState(windowData.element.dataset.app, windowData.element, false);
  persistState();
}

function closeWindow(key) {
  const data = state.windows.get(key);
  if (!data) return;
  data.element.remove();
  state.windows.delete(key);
  removeTaskbarButton(key);
  gameState.openApps = gameState.openApps.filter(a => a.key !== key);
  persistState();
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

const randomBetween = (min, max) => Math.random() * (max - min) + min;

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
  { ssid: "Coffee Wi-Fi", secured: false },
  { ssid: "Mom's Internet", secured: true },
  { ssid: "Office Net", secured: true },
  { ssid: "Skynet Global", secured: true },
  { ssid: "FBI Surveillance Van #4", secured: true }
];

const wifiLoadingProfiles = {
  "Coffee Wi-Fi": { min: 7000, max: 10000 },
  "Mom's Internet": { min: 6500, max: 9000 },
  "Office Net": { min: 6000, max: 9000 },
  "Skynet Global": { min: 5000, max: 8000 },
  "FBI Surveillance Van #4": { min: 3000, max: 5000 },
  default: { min: 6500, max: 9500 },
};

// VPN tiers are ordered from worst to best. Values are extra milliseconds added to the load.
const vpnPenaltyTiers = [2000, 1200, 600, 0];

let selectedNetworkSsid = null;

function renderWifiList() {
  const current = gameState.currentNetwork?.ssid || null;
  const activeSelection = selectedNetworkSsid || current;

  wifiList.innerHTML = networks.map(net => {
    const isSelected = activeSelection === net.ssid;
    const isConnected = current === net.ssid;
    return `
      <div class="wifi-item ${isSelected ? 'selected' : ''} ${isConnected ? 'connected' : ''}" data-ssid="${net.ssid}" onclick="selectWifi(this, '${net.ssid}')">
        <div class="wifi-row">
          <span class="wifi-signal">📶</span>
          <div class="wifi-main">
            <span class="wifi-name">${net.ssid}</span>
            <span class="wifi-sub">${net.secured ? 'Secured' : 'Open'}</span>
          </div>
          ${net.secured ? '<span class="wifi-lock">🔒</span>' : ''}
          ${isConnected ? '<span class="wifi-connected">Connected</span>' : ''}
        </div>
        <div class="wifi-details">
          ${net.secured ? '<input type="password" class="wifi-password-input" placeholder="Enter network security key">' : ''}
          <button class="wifi-connect-btn" onclick="connectWifi('${net.ssid}')">Connect</button>
        </div>
      </div>
    `;
  }).join('');

  renderWifiActions();
}

function renderWifiActions() {
  const actions = document.querySelector('.wifi-actions');
  if (!actions) return;
  const connected = Boolean(gameState.currentNetwork);
  const disconnectBtn = connected ? `<button class="wifi-action-btn" onclick="disconnectWifi()">Disconnect</button>` : '';
  actions.innerHTML = `
    ${disconnectBtn}
    <button class="wifi-action-btn" onclick="openWifiSettings()">Network & Internet settings</button>
  `;
}

window.selectWifi = (el, ssid) => {
  document.querySelectorAll('.wifi-item').forEach(item => item.classList.remove('selected'));
  el.classList.add('selected');
  selectedNetworkSsid = ssid;
};

window.connectWifi = (ssid) => {
  const net = networks.find(n => n.ssid === ssid);
  if (!net) return;

  if (net.secured) {
    const item = document.querySelector(`.wifi-item[data-ssid="${ssid}"]`);
    const pwdInput = item?.querySelector('.wifi-password-input');
    const value = pwdInput?.value.trim();
    if (!value) {
      alert('Zadej heslo pro tuto síť.');
      return;
    }
  }

  gameState.currentNetwork = { ssid: net.ssid };
  gameState.torRunning = true; // assume Tor can run once online
  primeTorHome();
  selectedNetworkSsid = net.ssid;
  updateStatusBar();
  try { refreshApp('tor'); } catch (e) {}
  renderWifiList();
  wifiPopup.style.display = "none";
};

window.disconnectWifi = () => {
  gameState.currentNetwork = null;
  gameState.torRunning = false;
  gameState.currentPage = null;
  selectedNetworkSsid = null;
  updateStatusBar();
  // Refresh Tor Client UI if it's open so it shows the disconnected state immediately
  try { refreshApp('tor'); } catch (e) {}
  // If standalone browser is open, re-render it so it shows the Tor connect screen
  try {
    const sb = document.getElementById('standalone-browser');
    if (sb && sb.style.display !== 'none') {
      const body = sb.querySelector('.standalone-body');
      if (body && apps.browser && typeof apps.browser.render === 'function') {
        apps.browser.render(body);
      }
    }
  } catch (e) {}
  renderWifiList();
};

window.openWifiSettings = () => {
  alert('Network settings jsou ve vývoji.');
};

// --- Volume Logic ---
const volumeIcon = document.getElementById("volume-icon");
const volumePopup = document.getElementById("volume-popup");
const volumeSlider = document.getElementById("volume-slider");
const volumeValue = document.getElementById("volume-value");

// Set initial master volume from slider default
if (volumeSlider) {
  audioManager.setVolume(Number(volumeSlider.value) / 100);
}

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
    audioManager.setVolume(Number(val) / 100);
  });
}

if (wifiIcon) {
  wifiIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = wifiPopup.style.display === "flex";
    wifiPopup.style.display = isVisible ? "none" : "flex";
    if (!isVisible) {
      selectedNetworkSsid = gameState.currentNetwork?.ssid || null;
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
    if (key === 'browser') return; // skrytý standalone browser
    if (key.startsWith('custom-link-')) return; // custom link windows nejsou v nabídce
    // Tor button zobrazuje jen když je nainstalován
    if (key === 'tor' && !gameState.torInstalled) return;
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
  audioManager.stop("ambiance");
  audioManager.stop("pcStart");
  audioManager.stop("keyboard");
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
    audioManager.stop("ambiance");
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
    audioManager.play("notification", { restart: true });
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
    { type: 'received', text: "Dnes večer plánují živé vysílání popravy. Máš 1 hodinu.", delay: 3000, countdownMinutes: 60 },
    { type: 'player', text: "Co s tím mám dělat já?" },
    { type: 'received', text: "Musíš získat administrátorský přístup. Hledej kódy 'RR-XXXX'.", delay: 2000 },
    { type: 'received', text: "Pro přístup budeš potřebovat tohle. Stáhni to a nainstaluj.", delay: 2000 },
    { type: 'file', fileName: "tor-installer.exe", action: "installTor" },
    { type: 'received', text: "Tady je první kód: <span class='code-snippet'>RR-START-84</span>", delay: 2000 },
    { type: 'player', text: "Dobře, zapíšu si to." },
    { type: 'received', text: "Otevři Poznámkový blok. Ozvu se.", delay: 2000 },
    { type: 'waitTor' },
    { type: 'received', text: "Vidím Tor. Posílám ti links.pdf s trasou. Čti pečlivě.", delay: 1200 },
    { type: 'file', fileName: "links.pdf", action: "showLinksPdf" },
    { type: 'received', text: "Klíče hledej v Techno linkách. Většina ostatních je falešná stopa.", delay: 1800 },
    { type: 'received', text: "Potřebuješ Res Coins. Stáhni ResMarket, tam nakoupíš přístupy.", delay: 1800 },
    { type: 'file', fileName: "resmarket.exe", action: "installResMarket" }
  ];

  const countdownStepIndex = script.findIndex(step => typeof step.countdownMinutes === 'number');
  const countdownReady = gameState.countdownActive && typeof gameState.countdownDeadline === 'number';
  if (!countdownReady && !gameState.countdownTriggered && countdownStepIndex >= 0 && gameState.chatStep > countdownStepIndex) {
    startCountdown(script[countdownStepIndex].countdownMinutes);
  }

  const processStep = async () => {
    if (gameState.chatStep >= script.length) {
      inputEl.disabled = true;
      inputEl.placeholder = "Rozhovor ukončen.";
      if (sendBtn) sendBtn.disabled = true;
      return;
    }
    const step = script[gameState.chatStep];

    if (step.type === 'received') {
      inputEl.disabled = true;
      inputEl.placeholder = "Čekání na odpověď...";
      await new Promise(r => setTimeout(r, step.delay));
      addMessage(chatContainer, step.text, 'received');
      if (step.countdownMinutes && (!gameState.countdownActive || typeof gameState.countdownDeadline !== 'number')) {
        startCountdown(step.countdownMinutes);
      }
      gameState.chatStep++;
      processStep();
    } else if (step.type === 'waitTor') {
      inputEl.disabled = true;
      inputEl.placeholder = "Čekám na Tor...";
      const waitForTor = () => {
        if (gameState.torRunning) {
          gameState.torBriefingSent = true;
          gameState.chatStep++;
          processStep();
          return;
        }
        setTimeout(waitForTor, 800);
      };
      waitForTor();
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
        btn.textContent = step.action === 'showLinksPdf' ? "Stahuji..." : "Instaluji...";
        if (step.action === 'installTor') {
            installTor();
        } else if (step.action === 'showLinksPdf') {
          try { showLinksPdf(); } catch (e) {
            console.error('Failed to download links.pdf', e);
            alert('Stahování links.pdf se nezdařilo. Zkus to znovu nebo přidej soubor do projektu.');
          }
        } else if (step.action === 'installResMarket') {
          installResMarket();
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
      let finished = false;
      
      // Remove old listeners to prevent duplicates if re-rendered
      const newInput = inputEl.cloneNode(true);
      inputEl.parentNode.replaceChild(newInput, inputEl);
      inputEl = newInput;
      
      const newBtn = sendBtn.cloneNode(true);
      sendBtn.parentNode.replaceChild(newBtn, sendBtn);
      sendBtn = newBtn;

      // Reactivate controls for this reply step
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.placeholder = "Piš cokoliv pro odpověď...";

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
        if (finished) return;
        finished = true;
        addMessage(chatContainer, targetText, 'sent');
        inputEl.value = "";
        inputEl.disabled = true;
        sendBtn.disabled = true;
        gameState.chatStep++;
        processStep();
      };

      inputEl.addEventListener('keydown', onKeyDown);
      
      sendBtn.onclick = finishTyping;
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
  if (save !== false && type === 'received') {
    missionTimer.maybeTriggerFromMessage(text);
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

  if (loginPowerMenu && !loginPowerMenu.contains(event.target) && !loginPowerBtn?.contains(event.target)) {
    closeLoginPowerMenu();
  }
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const shortDate = now.toLocaleDateString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const longDate = now.toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
  
  const clockEl = document.getElementById("taskbarClock");
  if (clockEl) {
    clockEl.innerHTML = `
      <div class="time">${time}</div>
      <div class="date">${shortDate}</div>
    `;
  }

  const powerTimeEl = document.getElementById('powerTime');
  if (powerTimeEl) powerTimeEl.textContent = time;

  const powerDateEl = document.getElementById('powerDate');
  if (powerDateEl) powerDateEl.textContent = longDate;
}

// --- Input SFX (keyboard + mouse) ---
window.addEventListener("keydown", (e) => {
  if (isIntroPlaying()) return;
  if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter" || e.key === "Spacebar" || e.key === " ") {
    audioManager.play("keyboard", { restart: true });
  }
});

window.addEventListener("pointerdown", () => {
  if (isIntroPlaying()) return;
  audioManager.play("mouseClick", { restart: true });
});

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

// Kick off intro before showing the power/login flow
startIntroSequence();

function initializeDesktop() {
  ensureAppDefinition('timer');
  ensureDesktopIcon('timer', '⏱', 'Timer');
  ensureAppDefinition('minesweeper');
  ensureDesktopIcon('minesweeper', '💣', 'Minesweeper');

  // Restore installed apps
  if (gameState.torInstalled) {
    apps.tor = hiddenApps.tor;
    apps.browser = hiddenApps.browser;
    ensureDesktopIcon('tor', '🧅', 'Tor Client');
  }

  if (gameState.linksInstalled) {
    ensureAppDefinition('links');
    ensureDesktopIcon('links', '📄', 'links.pdf');
  }

  if (gameState.resMarketInstalled) {
    ensureAppDefinition('resmarket');
    ensureDesktopIcon('resmarket', 'Ⓡ', 'ResMarket');
  }

  if (gameState.cryptoMinerInstalled) {
    ensureAppDefinition('cryptominer');
    ensureDesktopIcon('cryptominer', '⛏', 'Crypto Miner');
  }

  if (gameState.movementDetectorInstalled) {
    ensureMovementDetectorApp();
  }

  renderStartMenu();

  // Restore open apps
  ensureZIndexBaseline();
  if (gameState.openApps && gameState.openApps.length > 0) {
    gameState.openApps.forEach(appState => {
      openApp(appState.key, appState);
    });
  }
}

initializeDesktop();
resumeCountdownIfNeeded();
startCryptoMinerLoop();
updateMovementDetectorDisplays();
