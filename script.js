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
    pcStart: makeSound('fx/pc-start.wav', { loop: false, volume: 0.8 }),
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

function setDesktopPaused(paused) {
  const isPaused = !!paused;
  if (document.body) {
    document.body.classList.toggle('desktop-paused', isPaused);
  }
  if (desktopScreen) {
    desktopScreen.classList.toggle('desktop-screen--paused', isPaused);
  }
}

setDesktopPaused(true);

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
  setDesktopPaused(true);
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
  setDesktopPaused(true);
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
    setDesktopPaused(false);
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

function clampWindowRange(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getViewportMetrics() {
  const vw = Math.max(360, window?.innerWidth || document.documentElement?.clientWidth || 1280);
  const vh = Math.max(320, window?.innerHeight || document.documentElement?.clientHeight || 720);
  return { vw, vh };
}

function computeResponsiveWindowSize(baseWidth, baseHeight) {
  if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight)) return null;
  const { vw, vh } = getViewportMetrics();
  const scale = clampWindowRange(Math.min(vw / 1920, vh / 1080), 0.6, 1.15);
  const scaledWidth = clampWindowRange(baseWidth * scale, 320, vw - 80);
  const scaledHeight = clampWindowRange(baseHeight * scale, 240, vh - 120);
  return {
    width: `${Math.round(scaledWidth)}px`,
    height: `${Math.round(scaledHeight)}px`,
  };
}

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
  const responsive = computeResponsiveWindowSize(resolved?.width, resolved?.height);
  if (responsive) return responsive;
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
      <div style="background-color: #ffffff; color: #333; font-family: Arial, sans-serif; padding: 0;">
    <div style="background-color: #800000; color: white; padding: 15px; text-align: center;">
        <h1 style="margin: 0; font-size: 1.5em;">ORGANIC SOLUTIONS &reg;</h1>
        <p style="font-size: 0.8em; margin: 0;">Rychle. Čerstvě. Kompatibilně.</p>
    </div>

    <div style="padding: 20px; max-width: 900px; margin: 0 auto;">
        <h2>Katalog: Ledviny & Játra (Sklad EU)</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="border: 1px solid #ddd; padding: 15px; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);">
                <h3 style="color: #800000;">Ledvina (Levá) - Typ O+</h3>
                <p><strong>Dárce:</strong> Muž, 24 let, nekuřák, atlet.</p>
                <p><strong>Stav:</strong> Sklizeno před 4 hodinami. V chladícím boxu.</p>
                <p style="font-size: 1.2em; font-weight: bold;">Cena: 15.0 BTC</p>
                <button style="background: #333; color: white; border: none; padding: 5px 10px;">Přidat do košíku</button>
            </div>

            <div style="border: 1px solid #ddd; padding: 15px; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);">
                <h3 style="color: #800000;">Rohovky (Pár) - Modré</h3>
                <p><strong>Dárce:</strong> Dítě, 8 let. (Premium Quality)</p>
                <p><strong>Stav:</strong> Na vyžádání (Odběr do 24h).</p>
                <p style="font-size: 1.2em; font-weight: bold;">Cena: 45.0 BTC</p>
                <button style="background: #333; color: white; border: none; padding: 5px 10px;">Přidat do košíku</button>
            </div>
        </div>

        <div style="background-color: #ffcccc; border: 1px solid red; padding: 10px; margin-top: 20px; font-size: 0.8em;">
            <strong>VAROVÁNÍ:</strong> Nepřijímáme vrácené zboží po uplynutí 12 hodin od doručení. Rozmrazené zboží je nevratné.
        </div>
    </div>
</div
    `,
  },
  {
    id: 'relay-eta',
    address: 'relay-eta84g.onion/stack',
    title: 'Relay Eta',
    html: `
     <div style="background-color: #000000; color: #ffffff; font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.8; max-width: 700px; margin: 0 auto;">
    <h1 style="border-bottom: 1px solid white; padding-bottom: 10px;">Pokud toto čtete, selhal jsem.</h1>
    
    <p>
        Jmenuji se Alex. Nevěřil jsem příběhům o "Čističích", dokud jsem nenašel ten soubor na serveru <em>Black_Rock</em>. Měl jsem to smazat. Místo toho jsem se díval.
    </p>
    <p>
        Sledují mě přes elektrickou síť. Slyším bzučení v zásuvkách, které se mění v morseovku. Říkají mi, kolik času mi zbývá.
    </p>
    <p>
        Ukryl jsem zálohu dat. Není to na cloudu. Je to na starém FTP serveru.
    </p>
    
    <div style="border: 1px dashed white; padding: 15px; margin: 20px 0;">
        <strong>IP:</strong> 192.168.X.X (Lokální smyčka)<br>
        <strong>USER:</strong> GHOST_IN_SHELL<br>
        <strong>PASS:</strong> [Poslední slova mé matky]
    </div>
    
    <p>
        Nehledají mě. Hledají to, co mám v hlavě. Sbohem.
    </p>
    <p style="text-align: right; font-style: italic;">
        - A.
    </p>
</div>
    `,
  },
  {
    id: 'relay-theta',
    address: 'relay-theta71s.onion/grid',
    title: 'Relay Theta',
    html: `
      <div style="background-color: #f4f4f4; color: #000; font-family: 'Courier New', Courier, monospace; text-align: center; padding: 50px;">
    <img src="fx/cicada.jpg" alt="[ZDE VLOŽ OBRÁZEK MOTÝLA NEBO OKA]" style="width: 100px; height: 100px; background: #000;">
    
    <h2>HLEDÁME INTELIGENCI</h2>
    
    <p style="margin-top: 30px;">
        Cesta nezačíná zde. Cesta zde končí.
    </p>

    <div style="background-color: #ddd; padding: 20px; margin: 30px auto; width: 50%; letter-spacing: 3px; font-weight: bold;">
        77 68 61 74 &nbsp; 69 73 &nbsp; 79 6F 75 72 &nbsp; 73 69 6E ?
    </div>

    <p style="font-size: 0.8em; color: #666;">
        Klíč je v knize, kterou nikdo nečte. Strana 33. Řádek 4.
    </p>
    
    <div style="color: #f4f4f4; margin-top: 50px;">
        Heslo je: MORPHEUS
    </div>
</div>
    `,
  },
  {
    id: 'relay-iota',
    address: 'relay-iota20x.onion/trace',
    title: 'Relay Iota',
    html: `
      <style>
        .relay-iota-radio {
          background-color: #001a00;
          color: #00ff00;
          font-family: "Courier New", monospace;
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          gap: 20px;
        }
        .relay-iota-radio__display {
          font-size: 4rem;
          border: 2px solid #004400;
          background: #000;
          padding: 20px;
          width: min(480px, 90%);
          text-shadow: 0 0 10px #00ff00;
          margin: 0 auto;
        }
        .relay-iota-radio__signal {
          height: 20px;
          background-color: #003300;
          width: min(540px, 90%);
          margin: 0 auto;
          position: relative;
          overflow: hidden;
        }
        .relay-iota-radio__fill {
          height: 100%;
          background-color: #00ff00;
          width: 5%;
          transition: width 0.1s ease;
          box-shadow: 0 0 15px #00ff00;
        }
        .relay-iota-radio__slider {
          width: min(540px, 90%);
          margin: 20px auto 0;
        }
        .relay-iota-radio__noise {
          color: #004400;
          min-height: 24px;
        }
        .relay-iota-radio__horror {
          display: none;
          color: red;
          font-weight: bold;
          font-size: 1.5rem;
          animation: relay-iota-flash 0.2s linear infinite;
        }
        .relay-iota-radio__horror.is-visible {
          display: block;
        }
        @keyframes relay-iota-flash {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
      </style>
      <section class="relay-iota-radio" data-relay-iota>
        <h1>SHORTWAVE RECEIVER v4.0</h1>
        <p>Ladění frekvence (MHz)</p>
        <div class="relay-iota-radio__display" data-iota-display>88.0 MHz</div>
        <div class="relay-iota-radio__signal">
          <div class="relay-iota-radio__fill" data-iota-signal></div>
        </div>
        <input type="range" min="880" max="1080" value="880" class="relay-iota-radio__slider" data-iota-tuner aria-label="Ladění frekvence">
        <div class="relay-iota-radio__noise" data-iota-noise>[ŠUM...]</div>
        <div class="relay-iota-radio__horror" data-iota-horror>
          NĚKDO KLEPE NA TVOJE OKNO.<br>
          NĚKDO KLEPE NA TVOJE OKNO.<br>
          NĚKDO KLEPE NA TVOJE OKNO.
        </div>
      </section>
    `,
  },
  {
    id: 'relay-kappa',
    address: 'relay-kappa67b.onion/cache',
    title: 'Relay Kappa',
    html: `
      <div style="background-color: #fff; color: #000; font-family: 'Courier New', Courier, monospace; padding: 30px; border: 1px solid #000; max-width: 800px; margin: 0 auto;">
    
    <h1 style="text-align: center; text-decoration: underline;">DENÍK POCHYBNOSTÍ</h1>
    
    <div style="margin-top: 30px;">
        <h3>ZÁZNAM: 3. LISTOPADU</h3>
        <p>
            Zase to udělala. Ráno u snídaně. Nalila si horkou kávu přímo do krku. Vařící. Viděl jsem páru. Ani nemrkla. Když si všimla, že se dívám, usmála se a řekla: "Je to lahodné, drahý."
        </p>
        <p>
            Slovo "lahodné" nikdy nepoužívala.
        </p>
        <hr>

        <h3>ZÁZNAM: 12. LISTOPADU</h3>
        <p>
            Našel jsem ve sklepě její vlasy. Chomáč vlasů ucpaný v odtoku. Ale když jsem je vytáhl, nebyly to vlasy. Byly to... tenké dráty? Nebo nějaký černý silon? Hýbalo se to, když jsem na to posvítil baterkou.
        </p>
        <p>
            Když přišla domů, zeptal jsem se jí na to. Podívala se na mě tím svým novým, širokým pohledem (mrká moc málo, počítal jsem to, mrkne jednou za 4 minuty) a řekla: "Jsi unavený, Marku. Měl bys jít spát. Spánek je pro lidi důležitý."
        </p>
        <p>
            Pro <strong>lidi</strong>. Ne "pro nás". Pro lidi.
        </p>
        <hr>

        <h3>ZÁZNAM: DNES</h3>
        <p>
            Píšu to z koupelny. Zamkl jsem se. Ona stojí za dveřmi. Neslyším ji dýchat. Jen tam stojí. Vidím stín jejích nohou pod dveřmi. Nehýbe se už dvě hodiny.
        </p>
        <p>
            Před chvílí zaklepala. Ale nebylo to zaklepání klouby. Znělo to, jako by do dřeva uhodila čelem. Tupá, tvrdá rána.
        </p>
        <p style="background-color: #000; color: #fff; padding: 5px;">
            "Marku? Otevři. Kůže mě svědí. Potřebuji, abys mi pomohl rozepnout záda. Zip se zasekl."
        </p>
        <p>
            Moje žena nemá na zádech žádný zip.
            Bože, ona se snaží dostat dovnitř. Slyším škrábání. To nejsou nehty. To je kov.
        </p>
    </div>

    <div style="margin-top: 50px; text-align: center; font-size: 0.8em; color: #cc0000;">
        [PŘIPOJENÍ PŘERUŠENO ZDROJEM]
    </div>
</div>
    `,
  },
  {
    id: 'relay-lambda',
    address: 'relay-lambda58t.onion/shell',
    title: 'Relay Lambda',
    html: `
      <div style="background-color: #1a1a1a; color: #b0b0b0; font-family: 'Verdana', sans-serif; padding: 40px; border: 1px solid #333; line-height: 1.6;">
    
    <div style="border-bottom: 1px solid #2d5a2d; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="color: #4a8a4a; margin: 0;">NOČNÍ CHODEC</h1>
        <p style="font-size: 0.8em; color: #666;">Blog o turistice, samotě a tichu.</p>
    </div>

    <div style="background-color: #222; padding: 20px; margin-bottom: 30px;">
        <h2 style="color: #ccc; margin-top: 0;">Příspěvek: Už tam nikdy nepůjdu</h2>
        <p style="font-size: 0.8em; color: #555;">Zveřejněno: 14. října 2025 | Autor: DaveWalker</p>
        
        <p>
            Víte, že miluji Šumavu. Chodím tam už deset let, většinou v noci, abych se vyhnul turistům. Miluji ten zvuk, kdy vám křupe sníh nebo jehličí pod nohama a kolem je absolutní tma. Ale včera se něco stalo.
        </p>
        <p>
            Byl jsem asi 5 kilometrů od nejbližší silnice. Zastavil jsem se, abych se napil. A v tom tichu, asi dvacet metrů za mnou, jsem slyšel... <em>cvaknutí</em>. Znělo to přesně jako karabina na mém batohu.
        </p>
        <p>
            Řekl jsem: "Je tam někdo?"
        </p>
        <p>
            Ticho. A pak, z koruny stromu přímo nade mnou, se ozval hlas. Nebyl to lidský hlas. Bylo to, jako by někdo nahrál můj hlas na starý diktafon a pustil ho pozpátku a zrychleně.
        </p>
        <p style="color: #a83232; font-style: italic;">
            "J-Je t-tam ně-kdo?"
        </p>
        <p>
            Nebylo to echo. Byla to imitace. Rozsvítil jsem baterku nahoru. Nic tam nebylo. Žádná sova, žádná veverka. Jen holé větve. Začal jsem couvat. A pak jsem to uslyšel znovu, tentokrát zleva, z hustého křoví. Můj vlastní hlas, smějící se mým smíchem, ale bez emocí.
        </p>
        <p>
            Utíkal jsem. Celou cestu k autu jsem slyšel kroky. Ne jedny. Desítky. Jako by mě doprovázelo stádo, které ale našlapuje přesně do rytmu mých kroků, aby nebylo slyšet.
        </p>
        <p>
            Když jsem nasedl do auta a zamkl, něco narazilo do zadního skla. Nebyl to kámen. Byla to dlaň. Otiskl jsem to ráno vyfotil.
        </p>
        <p>
            Ty prsty jsou příliš dlouhé. Lidská ruka nemá šest článků na prstu.
        </p>
        
        <div style="border-top: 1px dashed #444; margin-top: 20px; padding-top: 10px;">
            <p style="color: #4a8a4a;">Komentáře (2):</p>
            <p style="font-size: 0.9em;"><strong>[ForestRanger]:</strong> Smaž to. Hned. Oni nemají rádi, když se o nich mluví.</p>
            <p style="font-size: 0.9em;"><strong>[User44]:</strong> Slyšel jsi to taky? To cvakání? Říkají tomu "Mimi". Neohlížej se, když jsi doma.</p>
        </div>
    </div>
</div>
    `,
  },
  {
    id: 'relay-mu',
    address: 'relay-mu93q.onion/archive',
    title: 'Relay Mu',
    html: `
      <div style="background-color: #202124; color: #bdc1c6; font-family: Arial, sans-serif; height: 100vh; padding: 50px; box-sizing: border-box;">
    <div style="font-size: 5em; margin-bottom: 20px; color: #9aa0a6;">:(</div>
    
    <h1 style="font-size: 2em; margin: 0 0 20px 0;">Tato stránka neexistuje. A vy také ne.</h1>
    
    <p style="font-size: 1.1em;">Prohlížeč nemůže nalézt realitu, kterou hledáte.</p>
    
    <p style="margin-top: 30px;">Možné příčiny:</p>
    <ul style="line-height: 1.8;">
        <li>Vaše připojení k existenci bylo přerušeno.</li>
        <li>Ten, kdo vás sleduje přes webkameru, právě vstoupil do místnosti.</li>
        <li>Už dávno spíte. Prosím, probuďte se.</li>
    </ul>

    <p style="margin-top: 40px; font-size: 0.9em; color: #ff4c4c;">
        ERR_REALITY_NOT_FOUND_RUN_NOW
    </p>
    
    <button style="background-color: #8ab4f8; color: #202124; border: none; padding: 10px 25px; border-radius: 5px; font-weight: bold; margin-top: 30px; cursor: not-allowed;">
        Zkusit znovu (Nefunguje)
    </button>
</div>
    `,
  },
  {
    id: 'relay-nu',
    address: 'relay-nu39d.onion/hub',
    title: 'Relay Nu',
    html: `
    <div style="background-color: #000; color: #333; font-family: Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
    <h1 style="color: #555;">Odpočet do Singularity</h1>
    
    <div style="font-size: 10em; color: red; font-family: 'Courier New', monospace; font-weight: bold; text-shadow: 0 0 20px red;">
        00:00:05
    </div>
    
    <p style="font-size: 1.5em; margin-top: 30px; color: #aaa;">
        <span style="animation: blinker 0.5s linear infinite;">VAROVÁNÍ: Bariéra reality je narušena.</span>
    </p>
    <p style="color: #555; font-size: 0.9em;">
        Až to dosáhne nuly, světla zhasnou. Nejen tady. Všude. Nedýchej, možná si tě nevšimnou.
    </p>
    
    <style>
        @keyframes blinker { 50% { opacity: 0; } }
    </style>
</div>
    `,
  },
  {
    id: 'relay-xi',
    address: 'relay-xi18m.onion/ops',
    title: 'Relay Xi',
    html: `
      <style>
        .relay-xi-target {
          background-color: #050505;
          color: #cc0000;
          font-family: "Courier New", monospace;
          min-height: 80vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
        }
        .relay-xi-target__panel {
          border: 2px solid #cc0000;
          padding: 30px;
          width: min(640px, 100%);
          background-color: #0a0000;
          box-shadow: 0 0 30px rgba(200, 0, 0, 0.3);
        }
        .relay-xi-target__panel h1 {
          text-align: center;
          border-bottom: 1px dashed #cc0000;
          padding-bottom: 15px;
          margin-top: 0;
          font-size: 2rem;
          text-shadow: 0 0 10px #cc0000;
        }
        .relay-xi-target__row {
          display: flex;
          justify-content: space-between;
          margin: 12px 0;
          font-size: 1.1rem;
        }
        .relay-xi-target__label {
          color: #666;
        }
        .relay-xi-target__value {
          color: #fff;
          font-weight: bold;
          text-shadow: 0 0 5px #fff;
        }
        .relay-xi-target__message {
          margin-top: 30px;
          text-align: center;
          color: #ff3333;
          font-style: italic;
          opacity: 0;
          transition: opacity 2s ease;
        }
      </style>
      <section class="relay-xi-target" data-relay-xi>
        <div class="relay-xi-target__panel">
          <h1>CÍL LOKALIZOVÁN</h1>
          <div>
            <p class="relay-xi-target__row"><span class="relay-xi-target__label">VEŘEJNÁ IP:</span><span class="relay-xi-target__value" data-xi-ip>SKENOVÁNÍ...</span></p>
            <p class="relay-xi-target__row"><span class="relay-xi-target__label">POSKYTOVATEL:</span><span class="relay-xi-target__value" data-xi-isp>---</span></p>
            <p class="relay-xi-target__row"><span class="relay-xi-target__label">MĚSTO:</span><span class="relay-xi-target__value" data-xi-city>---</span></p>
            <p class="relay-xi-target__row"><span class="relay-xi-target__label">STÁT:</span><span class="relay-xi-target__value" data-xi-country>---</span></p>
            <p class="relay-xi-target__row"><span class="relay-xi-target__label">OPERAČNÍ SYSTÉM:</span><span class="relay-xi-target__value" data-xi-os>---</span></p>
            <p class="relay-xi-target__row"><span class="relay-xi-target__label">STAV BATERIE:</span><span class="relay-xi-target__value" data-xi-battery>Neznámý</span></p>
          </div>
          <p class="relay-xi-target__message" data-xi-message>
            "Vím, že jsi v <span data-xi-scare-city>městě</span>. Vím, že používáš <span data-xi-scare-os>PC</span>.<br>Už nemáš kam utéct."
          </p>
        </div>
      </section>
    `,
  },
  {
    id: 'relay-omicron',
    address: 'relay-omicron24j.onion/failsafe',
    title: 'Relay Omicron',
    html: `
      <style>
        @keyframes relay-omicron-shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-3px, -2px) rotate(-1deg); }
          20% { transform: translate(-5px, 0px) rotate(2deg); }
          30% { transform: translate(5px, 4px) rotate(0deg); }
          40% { transform: translate(3px, -3px) rotate(1deg); }
          50% { transform: translate(-3px, 4px) rotate(-2deg); }
          60% { transform: translate(-5px, 1px) rotate(0deg); }
          70% { transform: translate(5px, 1px) rotate(-1deg); }
          80% { transform: translate(-3px, -3px) rotate(2deg); }
          90% { transform: translate(3px, 4px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        @keyframes relay-omicron-strobe {
          0% { background-color: #000; color: #f00; }
          50% { background-color: #f00; color: #000; }
          100% { background-color: #fff; color: #000; }
        }
        @keyframes relay-omicron-appear { to { opacity: 1; } }
        .relay-omicron-jumpscare {
          background-color: #000;
          color: #f00;
          font-family: "Courier New", monospace;
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          overflow: hidden;
          padding: 40px 20px;
          animation: relay-omicron-strobe 0.1s steps(2, jump-start) infinite 2s,
            relay-omicron-shake 0.5s linear infinite 2s;
        }
        .relay-omicron-hidden {
          font-size: clamp(2rem, 6vw, 4rem);
          font-weight: bold;
          opacity: 0;
          animation: relay-omicron-appear 0.1s linear forwards 2s;
        }
      </style>
      <section class="relay-omicron-jumpscare">
        <h1 style="font-size: clamp(2rem, 5vw, 3.5rem);">CRITICAL_PROCESS_DIED</h1>
        <p>Systém narazil na neodstranitelnou chybu. Probíhá výpis paměti...</p>
        <p>STOP CODE: 0x0000DEAD</p>
        <div class="relay-omicron-hidden">
          NEDÍVEJ SE ZA SEBE<br>
          NEDÍVEJ SE ZA SEBE<br>
          UŽ JE TADY
        </div>
      </section>
    `,
  },
  {
    id: 'relay-pi',
    address: 'relay-pi10f.onion/safehouse',
    title: 'Relay Pi',
    html: `
      <style>
        .relay-pi-sigma {
          background-color: #222;
          color: #fff;
          font-family: Arial, sans-serif;
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          gap: 20px;
          transition: background-color 0.5s, color 0.5s;
        }
        .relay-pi-sigma.panic-mode {
          background-color: #500000;
          color: #000;
        }
        .relay-pi-sigma__status {
          font-size: clamp(1.25rem, 2vw, 1.75rem);
          letter-spacing: 0.05em;
        }
        .relay-pi-sigma__timer {
          font-size: clamp(3rem, 12vw, 8rem);
          font-weight: bold;
          font-family: "Courier New", monospace;
        }
        .relay-pi-sigma__button {
          padding: 20px 40px;
          font-size: 1.5rem;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          background-color: #007bff;
          color: #fff;
          transition: transform 0.2s ease, background-color 0.2s ease;
          will-change: transform;
        }
        .relay-pi-sigma__button:active {
          background-color: #0056b3;
        }
        .relay-pi-sigma__terminated {
          background-color: #000;
          color: #f33;
        }
        .relay-pi-sigma__terminated-screen {
          width: 100%;
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
          padding: 20px;
        }
        .relay-pi-sigma__jumpscare {
          width: 100%;
          min-height: 100vh;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #010101;
          animation: relay-pi-jumpscare-flash 0.18s linear infinite;
        }
        .relay-pi-sigma__jumpscare img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        @keyframes relay-pi-jumpscare-flash {
          0% { filter: brightness(0.7); }
          40% { filter: brightness(1.3); }
          80% { filter: brightness(0.9); }
          100% { filter: brightness(0.7); }
        }
      </style>
      <section class="relay-pi-sigma" data-relay-pi-sigma>
        <h2 class="relay-pi-sigma__status" data-sigma-status>POTVRĎTE PŘÍTOMNOST OPERÁTORA</h2>
        <div class="relay-pi-sigma__timer" data-sigma-timer>10.00</div>
        <button class="relay-pi-sigma__button" data-sigma-button>JSEM ZDE</button>
      </section>
    `,
  },
  {
    id: 'relay-rho',
    address: 'relay-rho77y.onion/ledger',
    title: 'Relay Rho',
    html: `
      <style>
        .relay-rho-feed {
          background-color: #000;
          color: #0f0;
          font-family: "Courier New", monospace;
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .relay-rho-feed__viewport {
          position: relative;
          width: min(960px, 95vw);
          height: min(540px, 70vh);
          border: 2px solid #333;
          box-shadow: 0 0 20px rgba(255, 0, 0, 0.2);
          overflow: hidden;
        }
        .relay-rho-feed__video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(100%) contrast(150%) brightness(0.8) sepia(30%);
          transform: scaleX(-1);
          background: #050505;
        }
        .relay-rho-feed__scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 2px,
            rgba(0, 0, 0, 0.5) 3px,
            rgba(0, 0, 0, 0.5) 4px
          );
          pointer-events: none;
        }
        .relay-rho-feed__overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          padding: 20px;
          color: #fff;
          box-sizing: border-box;
        }
        .relay-rho-feed__rec {
          color: red;
          font-weight: bold;
          font-size: 1.25rem;
          animation: relay-rho-blink 1s steps(2, jump-start) infinite;
        }
        .relay-rho-feed__target {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 280px;
          height: 280px;
          border: 2px dashed red;
          transform: translate(-50%, -50%);
          opacity: 0.6;
        }
        .relay-rho-feed__target label {
          position: absolute;
          top: -28px;
          left: 0;
          background: red;
          color: #000;
          font-size: 0.8rem;
          padding: 2px 6px;
        }
        .relay-rho-feed__status {
          position: absolute;
          bottom: 20px;
          left: 20px;
          color: #00ff00;
          font-size: 1rem;
          text-shadow: 0 0 5px #00ff00;
        }
        .relay-rho-feed__error {
          position: absolute;
          bottom: 20px;
          right: 20px;
          color: #ff5555;
          font-size: 0.95rem;
          text-align: right;
          max-width: 240px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .relay-rho-feed__error.is-visible {
          opacity: 1;
        }
        @keyframes relay-rho-blink {
          0% { opacity: 1; }
          50% { opacity: 0.1; }
          100% { opacity: 1; }
        }
      </style>
      <section class="relay-rho-feed" data-relay-rho>
        <div class="relay-rho-feed__viewport">
          <video class="relay-rho-feed__video" data-rho-video autoplay playsinline muted></video>
          <div class="relay-rho-feed__scanlines"></div>
          <div class="relay-rho-feed__overlay">
            <div class="relay-rho-feed__rec">● REC [LIVE FEED]</div>
            <div style="position: absolute; top: 20px; right: 20px; text-align: right;">
              CAM_ID: 88_USER_LOCAL<br>
              IP: 127.0.0.1 (FOUND)
            </div>
            <div class="relay-rho-feed__target">
              <label>SUBJECT DETECTED</label>
            </div>
            <div class="relay-rho-feed__status">
              &gt; ANALYZING FEAR RESPONSE...<br>
              &gt; UPLOADING BIOMETRICS TO NODE 4...
            </div>
            <div class="relay-rho-feed__error" data-rho-error></div>
          </div>
        </div>
      </section>
    `,
  },
  {
    id: 'relay-sigma',
    address: 'relay-sigma04c.onion/cortex',
    title: 'Relay Sigma',
    html: `
      <div class="sigma-file" style="background:#2c2c2c; padding:30px; font-family:'Courier New', Courier, monospace; color:#111;">
        <style>
          .sigma-file__container {
            background-color: #e8e4d9;
            max-width: 850px;
            margin: 0 auto;
            padding: 40px;
            border: 2px solid #444;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
            position: relative;
            color: #111;
          }
          .sigma-file__header {
            border-bottom: 3px double #000;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            gap: 20px;
          }
          .sigma-file__stamp {
            border: 3px solid #cc0000;
            color: #cc0000;
            font-weight: bold;
            padding: 10px 20px;
            font-size: 1.1rem;
            transform: rotate(-5deg);
            display: inline-block;
            position: absolute;
            top: 20px;
            right: 20px;
            opacity: 0.85;
          }
          .sigma-file__section {
            background-color: #ccc;
            padding: 5px;
            font-weight: bold;
            margin-top: 25px;
            border-bottom: 2px solid #000;
          }
          .sigma-file__grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 10px;
            margin-top: 10px;
            max-width: 60%;
          }
          .sigma-file__label {
            font-weight: bold;
            text-transform: uppercase;
          }
          .sigma-file__photo {
            width: 200px;
            border: 1px solid #000;
            margin: 20px 0;
            float: right;
            margin-left: 20px;
            background: url('fx/police.png') center 60%/cover no-repeat #ccc;
          }
          .sigma-file__redacted {
            background-color: #000;
            color: #000;
            padding: 0 5px;
            user-select: none;
          }
          .sigma-file__redacted:hover {
            color: #333;
          }
          @media (max-width: 700px) {
            .sigma-file__grid {
              grid-template-columns: 1fr;
              max-width: 100%;
            }
            .sigma-file__photo {
              float: none;
              margin-left: 0;
              margin-right: auto;
            }
          }
        </style>
        <div class="sigma-file__container">
          <span class="sigma-file__stamp">UZAVŘENO / NEAKTIVNÍ</span>
          <div class="sigma-file__header">
            <div>
              MĚSTSKÉ POLICEJNÍ ODDĚLENÍ<br>
              SEKCE POHŘEŠOVANÝCH OSOB
            </div>
            <div style="text-align:right;">
              ČÍSLO SPISU: 4991-B<br>
              DATUM: 14.10.2025
            </div>
          </div>
          <div class="sigma-file__photo" aria-label="Police evidence photo"></div>
          <div class="sigma-file__section">I. ÚDAJE O SUBJEKTU</div>
          <div class="sigma-file__grid">
            <span class="sigma-file__label">Jméno:</span><span>Maya PETROVA</span>
            <span class="sigma-file__label">Věk:</span><span>19</span>
            <span class="sigma-file__label">Výška/Váha:</span><span>165 cm / 55 kg</span>
            <span class="sigma-file__label">Zvláštní znamení:</span><span>Tetování na levém zápěstí (hudební motiv).</span>
            <span class="sigma-file__label">Status:</span><span>POHŘEŠOVANÁ ➜ PŘEKLASIFIKOVÁNO: ÚTĚK</span>
          </div>
          <div style="clear:both;"></div>
          <div class="sigma-file__section">II. SHRNUTÍ INCIDENTU</div>
          <p>
            Matka nahlásila zmizení dcery dne 13.10. v 08:30. Dcera zmizela v noci ze svého pokoje.
            Na místě činu <span class="sigma-file__redacted">nebyly nalezeny</span> žádné stopy násilného vniknutí. Okno v přízemí bylo otevřené.
            Osobní věci (telefon, peněženka) zůstaly na místě.
          </p>
          <div class="sigma-file__section">III. POZNÁMKY VYŠETŘOVATELE (Det. Miller)</div>
          <p>
            Matka trvá na verzi únosu a zmiňuje online stalking uživatelem "Watcher_99". Účet nebyl nalezen – pravděpodobně smazán.
            Nejpravděpodobnější scénář: dobrovolný odchod.
          </p>
          <div class="sigma-file__section">IV. ZÁVĚR A DOPORUČENÍ</div>
          <p>
            Případ odložen ad acta. Doporučeno <span class="sigma-file__redacted">ukončit aktivní pátrání</span> a ponechat v databázi
            pohřešovaných pro případné budoucí ztotožnění.
            <br><br>
            <em>Podpis: <span style="font-family:cursive;">Det. R. Miller</span></em>
          </p>
        </div>
      </div>
    `,
  },
  {
    id: 'relay-tau',
    address: 'relay-tau63l.onion/keys',
    title: 'Relay Tau',
    html: `
      <div class="tau-journal" style="background-color:#f0f8ff; color:#444; font-family:'Verdana',sans-serif; padding:20px; line-height:1.6;">
        <style>
          .tau-journal__container {
            width: min(600px, 100%);
            margin: 0 auto;
            background-color: #fff;
            padding: 40px;
            border: 1px solid #d1d1e0;
            box-shadow: 5px 5px 15px rgba(0,0,0,0.05);
          }
          .tau-journal__title {
            color: #6a5acd;
            text-align: center;
            font-family: 'Georgia', serif;
            font-style: italic;
          }
          .tau-journal__post {
            margin-bottom: 40px;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 20px;
            position: relative;
          }
          .tau-journal__date {
            font-size: 0.85rem;
            color: #888;
            display: block;
            margin-bottom: 10px;
          }
          .tau-journal__sticker {
            position: absolute;
            top: 0;
            right: 0;
            font-size: 2rem;
            opacity: 0.7;
          }
          @media (max-width: 640px) {
            .tau-journal__container {
              padding: 28px;
            }
            .tau-journal__sticker {
              position: static;
              display: block;
              margin-bottom: 10px;
              text-align: right;
            }
          }
        </style>
        <div class="tau-journal__container">
          <h1 class="tau-journal__title">Maya's Notes 🎵</h1>
          <p style="text-align:center; color:#888; font-size:0.9rem;">Hudba, život a všechno mezi tím.</p>
          <hr style="border:0; border-top:2px solid #6a5acd; margin-bottom:30px;">

          <article class="tau-journal__post">
            <span class="tau-journal__sticker">🎸</span>
            <span class="tau-journal__date">15. Srpna</span>
            <h3>Nové tetování!</h3>
            <p>
              Konečně jsem to udělala! Máma sice nebyla nadšená ("Mayo, to ti zůstane navždy!"), ale já to miluju.
              Mám na levém zápěstí malou notovou osnovu. Je to připomínka, že i když je ticho, hudba tam pořád někde je.
              Teď už jen musím dopsat tu skladbu, co mi zní v hlavě.
            </p>
          </article>

          <article class="tau-journal__post">
            <span class="tau-journal__sticker">😕</span>
            <span class="tau-journal__date">2. Září</span>
            <h3>Divný pocit</h3>
            <p>
              Vracela jsem se dneska z lekce kytary a měla jsem pocit, že za mnou někdo jde.
              Když jsem se otočila, byla tam jen prázdná ulice. Ale víte, jak to je – takové to mravenčení v zádech.
              Asi jsem jen paranoidní z těch hororů, na které jsme koukali s Jess. Pro jistotu zítra pojedu domů autobusem.
            </p>
          </article>

          <article class="tau-journal__post">
            <span class="tau-journal__sticker">📷</span>
            <span class="tau-journal__date">12. Října (Poslední záznam)</span>
            <h3>Kdo je "Watcher"?</h3>
            <p>
              Někdo mi neustále komentuje fotky na Instagramu. Účet bez fotky, jméno "Watcher_99".
              Píše věci jako "Krásné vlasy" nebo "Dneska ti to v tom modrém kabátu slušelo".
              Ten kabát jsem měla poprvé a nikam jsem nedávala fotku.
            </p>
            <p>
              Bojím se. Dneska v noci slyším venku pod oknem kroky. Pes štěká jako blázen.
              Jdu se podívat ven. Určitě to nic není. Jen se ujistím, že je branka zavřená.
              Hned se vrátím.
            </p>
          </article>
        </div>
      </div>
    `,
  },
  {
    id: 'relay-upsilon',
    address: 'relay-upsilon82w.onion/omega',
    title: 'Relay Upsilon',
    html: `
      <div class="upsilon-investigation" style="background-color:#333; color:#ddd; font-family:'Arial',sans-serif; padding:20px;">
        <style>
          .upsilon-investigation__wrap {
            max-width: 800px;
            margin: 0 auto;
            background-color: #222;
            padding: 40px;
            border: 1px solid #444;
            box-shadow: 0 0 30px rgba(0,0,0,0.4);
          }
          .upsilon-investigation__title {
            border-bottom: 2px solid #cc0000;
            padding-bottom: 10px;
            margin-bottom: 30px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .upsilon-entry {
            background-color: #1a1a1a;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #555;
          }
          .upsilon-entry--important {
            border-left-color: #cc0000;
            background-color: #2a0000;
          }
          .upsilon-entry__meta {
            color: #888;
            font-size: 0.85rem;
            margin-bottom: 10px;
            display: block;
          }
          @media (max-width: 720px) {
            .upsilon-investigation__wrap {
              padding: 28px;
            }
          }
        </style>
        <div class="upsilon-investigation__wrap">
          <h1 class="upsilon-investigation__title">Deník Vyšetřování: Případ 4991 (Maya)</h1>
          <p style="font-style:italic; color:#aaa;">"Policie to vzdala. Já ne."</p>
          <div class="upsilon-entry">
            <span class="upsilon-entry__meta">DEN 4: POLICIE</span>
            <p>
              Detektiv Miller mi řekl, abych šla domů. Že "teenagerky utíkají pořád".
              V jejím pokoji zůstalo všechno. Peněženka, mobil, klíče. Kdo utíká bez bot?
              Její oblíbené tenisky jsou pořád v předsíni. Vzali ji. Vím to.
            </p>
          </div>
          <div class="upsilon-entry">
            <span class="upsilon-entry__meta">DEN 22: DARK WEB</span>
            <p>
              Student z IT mi ukázal, jak se dostat hlouběji. Tor. Tma a špína.
              Procházím fóra, kde se prodávají zbraně a informace. Hledám jen jedno jméno. Nebo fotku.
            </p>
          </div>
          <div class="upsilon-entry upsilon-entry--important">
            <span class="upsilon-entry__meta">DEN 45: KONTAKT</span>
            <p>
              Někdo mě kontaktoval. Podepisuje se jako <strong>[UNKNOWN]</strong>.
              "Vím, kde je. Systém ji drží. Potřebujeme Hráče, který se právě připojil do sítě."
            </p>
            <p>
              Poslal IP adresu a instrukce. Tvrdí, že ten Hráč je naše jediná šance. Navede ho k bráně.
              Nevěřím mu, ale je to jediná stopa. Pokud to čteš – její jméno je Maya. Miluje kytaru. Prosím, přiveď ji domů.
            </p>
          </div>
        </div>
      </div>
    `,
  },
   {
    id: 'redroom',
    address: 'relay-upsilon82w.onion/omega',
    title: 'Relay Upsilon',
    html: `
      redroom placeholder
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
              <div class="custom-link-page__inner" data-custom-relay="${pageId}">
                ${page.html}
              </div>
            </div>
          `;
          initializeCustomNodeScripts(pageId, view);
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
  openApp('links');
}

function installResMarket() {
  if (gameState.resMarketInstalled) {
    ensureAppDefinition('resmarket');
    ensureDesktopIcon('resmarket', 'Ⓡ', 'ResMarket');
    alert('ResMarket už je nainstalovaný. Spusť ho z plochy nebo Start menu.');
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
    alert('Crypto Miner už je nainstalovaný. Najdeš ho na ploše.');
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
    { title: 'Hotovo', body: 'Miner je připravený. Najdeš ho na ploše i ve Start menu.', primary: 'Zavřít', done: true }
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

function setupRelayPiSigma(root) {
  if (!root || root.dataset.sigmaReady === '1') return;
  if (gameState.relayPiLocked) {
    root.innerHTML = '<div class="custom-page__locked"><h2>Přístup zamknut</h2><p>Relay Pi se už neznovuotevře.</p></div>';
    return;
  }
  root.dataset.sigmaReady = '1';

  const timerEl = root.querySelector('[data-sigma-timer]');
  const statusEl = root.querySelector('[data-sigma-status]');
  const buttonEl = root.querySelector('[data-sigma-button]');
  const windowEl = root.closest('.window');
  if (!timerEl || !statusEl || !buttonEl) return;

  let timeLeft = 10;
  let clicks = 0;
  let timerInterval = null;
  let jumpscareTimeout = null;
  let tickingAudio = null;
  let heartbeatAudio = null;
  let heavyBreathAudio = null;
  let jumpscareAudio = null;

  const createAudio = (src, { loop = false, volume = 1 } = {}) => {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = volume;
    return audio;
  };

  const playAudio = (audio) => {
    if (!audio) return;
    audio.play().catch(() => {});
  };

  const getTickAudio = () => {
    if (!tickingAudio) {
      tickingAudio = createAudio('fx/ticking.mp3', { loop: true, volume: 0.7 });
    }
    return tickingAudio;
  };

  const getHeartbeatAudio = () => {
    if (!heartbeatAudio) {
      heartbeatAudio = createAudio('fx/heartbeat.mp3', { loop: false, volume: 1 });
    }
    return heartbeatAudio;
  };

  const getHeavyBreathAudio = () => {
    if (!heavyBreathAudio) {
      heavyBreathAudio = createAudio('fx/heavybreath.wav', { loop: false, volume: 0.8 });
    }
    return heavyBreathAudio;
  };

  const getJumpscareAudio = () => {
    if (!jumpscareAudio) {
      jumpscareAudio = createAudio('fx/fnafjumpscare.mp3', { volume: 1 });
    }
    return jumpscareAudio;
  };

  const stopAndReset = (audio) => {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  };

  const startTickAudio = () => {
    const audio = getTickAudio();
    playAudio(audio);
  };

  const stopTickAudio = () => {
    stopAndReset(tickingAudio);
  };

  const stopJumpscareAudio = () => {
    stopAndReset(jumpscareAudio);
  };

  const clearJumpscareTrigger = () => {
    if (jumpscareTimeout) {
      clearTimeout(jumpscareTimeout);
      jumpscareTimeout = null;
    }
  };

  const showJumpscare = () => {
    if (windowEl) {
      windowEl.classList.add('window--relay-pi-jumpscare');
    }
    root.innerHTML = `
      <div class="relay-pi-sigma__jumpscare">
        <img src="fx/woman-scary.jpg" alt="Unknown subject" loading="lazy">
      </div>
    `;
    const scream = getJumpscareAudio();
    scream.currentTime = 0;
    playAudio(scream);
    const heartbeat = getHeartbeatAudio();
    heartbeat.currentTime = 0;
    playAudio(heartbeat);
    const heavyBreath = getHeavyBreathAudio();
    heavyBreath.currentTime = 0;
    playAudio(heavyBreath);
    setTimeout(() => {
      closeRelayPiForever();
    }, 3000);
  };

  const scheduleJumpscare = () => {
    clearJumpscareTrigger();
    jumpscareTimeout = setTimeout(() => {
      showJumpscare();
    }, 2000);
  };

  const closeRelayPiForever = () => {
    gameState.relayPiLocked = true;
    persistState();
    cleanup();
    closeRelayWindow();
  };

  const closeRelayWindow = () => {
    const targetWindow = windowEl || root.closest('.window');
    if (!targetWindow) return;
    const windowId = targetWindow.dataset.windowId;
    if (windowId && openWindows.has(windowId)) {
      closeWindow(windowId);
    } else {
      targetWindow.remove();
    }
  };

  const cleanup = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    clearJumpscareTrigger();
    stopTickAudio();
    stopJumpscareAudio();
    windowEl?.classList.remove('window--relay-pi-jumpscare');
  };

  const updateTimer = () => {
    timerEl.textContent = timeLeft.toFixed(2);
    timerEl.style.color = timeLeft < 3 ? '#ff4c4c' : '#ffffff';
  };

  const deathSequence = () => {
    if (root.dataset.piDead === '1') return;
    root.dataset.piDead = '1';
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    stopTickAudio();
    clearJumpscareTrigger();
    root.classList.remove('panic-mode');
    root.classList.add('relay-pi-sigma__terminated');
    root.innerHTML = `
      <div class="relay-pi-sigma__terminated-screen">
        <h1 style="font-size:3rem;">SPOJENÍ ZTRACENO</h1>
        <p style="color:#ccc;">Operátor nereaguje. Uvolňuji zámek dveří...</p>
      </div>
    `;
    scheduleJumpscare();
  };

  const startTimer = () => {
    if (timerInterval) return;
    startTickAudio();
    timerInterval = setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 0.01);
      updateTimer();
      if (timeLeft <= 0) {
        deathSequence();
      }
    }, 10);
  };

  const applyRandomOffset = () => {
    const x = (Math.random() - 0.5) * 300;
    const y = (Math.random() - 0.5) * 300;
    buttonEl.style.transform = `translate(${x}px, ${y}px)`;
  };

  const applyShrink = () => {
    const scaleFactor = Math.max(0.2, 1 - (clicks - 10) * 0.1);
    buttonEl.style.transform = `scale(${scaleFactor})`;
  };

  const resetTimer = () => {
    if (root.dataset.piDead === '1') return;
    clearJumpscareTrigger();
    stopJumpscareAudio();
    startTickAudio();
    timeLeft = 10;
    clicks += 1;

    if (clicks > 2 && clicks <= 10) {
      applyRandomOffset();
    } else if (clicks <= 2) {
      buttonEl.style.transform = 'none';
    }

    if (clicks === 5) {
      statusEl.textContent = 'ONI PŘICHÁZEJÍ. KLIKEJ RYCHLEJI.';
      root.classList.add('panic-mode');
    }

    if (clicks === 8) {
      buttonEl.textContent = 'NECHCI ZEMŘÍT';
      buttonEl.style.backgroundColor = '#c00000';
      timeLeft = 5;
    }

    if (clicks > 10) {
      applyShrink();
    }
  };

  buttonEl.addEventListener('click', (event) => {
    event.preventDefault();
    resetTimer();
  });

  updateTimer();
  startTimer();

  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      cleanup();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function setupRelayIotaSigma(root) {
  if (!root || root.dataset.iotaReady === '1') return;
  root.dataset.iotaReady = '1';

  const slider = root.querySelector('[data-iota-tuner]');
  const display = root.querySelector('[data-iota-display]');
  const signal = root.querySelector('[data-iota-signal]');
  const noise = root.querySelector('[data-iota-noise]');
  const horror = root.querySelector('[data-iota-horror]');
  if (!slider || !display || !signal || !noise || !horror) return;

  const TARGET = 1045;
  const BASE_BG = '#001a00';
  const ALERT_BG = '#1a0000';

  const updateUI = () => {
    const current = Number(slider.value);
    const freq = (current / 10).toFixed(1);
    display.textContent = `${freq} MHz`;

    const diff = Math.abs(current - TARGET);
    if (diff < 5) {
      const width = Math.max(5, 100 - diff * 10);
      signal.style.width = `${width}%`;
      signal.style.backgroundColor = '#ff3b3b';
      noise.textContent = 'PŘÍJEM SIGNÁLU: DETEKOVÁN HLAS';
      noise.style.color = '#ff3b3b';
      if (diff === 0) {
        horror.classList.add('is-visible');
        root.style.backgroundColor = ALERT_BG;
      } else {
        horror.classList.remove('is-visible');
        root.style.backgroundColor = BASE_BG;
      }
    } else {
      const randomWidth = Math.round(Math.random() * 10) + 5;
      signal.style.width = `${randomWidth}%`;
      signal.style.backgroundColor = '#00ff00';
      noise.textContent = '[ŠUM...]';
      noise.style.color = '#004400';
      horror.classList.remove('is-visible');
      root.style.backgroundColor = BASE_BG;
    }
  };

  slider.addEventListener('input', updateUI);
  updateUI();
}

function setupRelayXiSigma(root) {
  if (!root || root.dataset.xiReady === '1') return;
  root.dataset.xiReady = '1';

  const ipEl = root.querySelector('[data-xi-ip]');
  const ispEl = root.querySelector('[data-xi-isp]');
  const cityEl = root.querySelector('[data-xi-city]');
  const countryEl = root.querySelector('[data-xi-country]');
  const osEl = root.querySelector('[data-xi-os]');
  const batteryEl = root.querySelector('[data-xi-battery]');
  const scareCityEl = root.querySelector('[data-xi-scare-city]');
  const scareOsEl = root.querySelector('[data-xi-scare-os]');
  const messageEl = root.querySelector('[data-xi-message]');
  if (!ipEl || !ispEl || !cityEl || !countryEl || !osEl || !batteryEl || !scareCityEl || !scareOsEl || !messageEl) {
    return;
  }

  const platform = navigator.platform || 'Unknown system';
  osEl.textContent = platform;
  scareOsEl.textContent = platform;

  if (navigator.getBattery) {
    navigator.getBattery().then((battery) => {
      const level = Math.round(battery.level * 100);
      const charging = battery.charging ? ' (Nabíjí se)' : '';
      batteryEl.textContent = `${level}%${charging}`;
    }).catch(() => {
      batteryEl.textContent = 'Skryto';
    });
  }

  fetch('https://ipapi.co/json/')
    .then((response) => response.json())
    .then((data) => {
      ipEl.textContent = data.ip || 'MASKOVÁNO';
      ispEl.textContent = data.org || '---';
      cityEl.textContent = data.city || 'UNKNOWN';
      countryEl.textContent = data.country_name || '---';
      scareCityEl.textContent = data.city || 'městě';
      messageEl.style.opacity = 1;
    })
    .catch(() => {
      ipEl.textContent = 'CONNECTION MASKED';
      cityEl.textContent = 'UNKNOWN';
    });
}

function setupRelayRhoSigma(root) {
  if (!root || root.dataset.rhoReady === '1') return;
  root.dataset.rhoReady = '1';

  const videoEl = root.querySelector('[data-rho-video]');
  const errorEl = root.querySelector('[data-rho-error]');
  if (!videoEl) return;

  const showError = (message) => {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('is-visible');
    }
  };

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showError('Camera interface unsupported in this browser.');
    return;
  }

  let activeStream = null;

  const cleanup = () => {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      activeStream = null;
    }
  };

  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      activeStream = stream;
      videoEl.srcObject = stream;
    })
    .catch((err) => {
      console.error('Camera access denied for Relay Rho', err);
      showError('Camera access denied or unavailable.');
    });

  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      cleanup();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function initializeCustomNodeScripts(pageId, container) {
  if (!container) return;
  if (pageId === 'relay-pi10f.onion/safehouse') {
    const root = container.querySelector('[data-relay-pi-sigma]');
    setupRelayPiSigma(root);
  }
  if (pageId === 'relay-iota20x.onion/trace') {
    const root = container.querySelector('[data-relay-iota]');
    setupRelayIotaSigma(root);
  }
  if (pageId === 'relay-xi18m.onion/ops') {
    const root = container.querySelector('[data-relay-xi]');
    setupRelayXiSigma(root);
  }
  if (pageId === 'relay-rho77y.onion/ledger') {
    const root = container.querySelector('[data-relay-rho]');
    setupRelayRhoSigma(root);
  }
}

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
  setDesktopPaused(true);
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
    setDesktopPaused(true);
    
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
        btn.textContent = step.action === 'showLinksPdf' ? "Otevírám..." : "Instaluji...";
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
