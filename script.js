const desktop = document.getElementById("desktop");
const iconButtons = document.querySelectorAll(".desktop-icon");
const startButton = document.querySelector(".start-button");
const startMenu = document.getElementById("startMenu");
const startMenuButtons = startMenu.querySelectorAll("[data-app]");
const taskbarApps = document.getElementById("taskbarApps");
const clock = document.getElementById("taskbarClock");
const windowTemplate = document.getElementById("window-template");

const state = {
  zIndex: 10,
  windows: new Map(),
};

const apps = {
  browser: {
    title: "Nebula Search",
    render: (container) => {
      container.innerHTML = `
        <section class="browser-search">
          <form>
            <input type="text" name="query" placeholder="Hledat signál..." aria-label="Search" required />
            <button type="submit">Scan</button>
          </form>
          <div class="search-results" aria-live="polite"></div>
        </section>
      `;

      const form = container.querySelector("form");
      const results = container.querySelector(".search-results");

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = new FormData(form).get("query").toString();
        if (!value.trim()) return;

        const snippets = createSearchResults(value);
        results.innerHTML = snippets
          .map(
            (item) => `
              <article>
                <h4>${item.title}</h4>
                <p>${item.snippet}</p>
                <small>${item.meta}</small>
              </article>
            `
          )
          .join("");
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

function createSearchResults(query) {
  const hints = [
    "Signal fragment nalezen",
    "Protokol porušen",
    "Sledování aktivováno",
    "Kanál dekódován",
  ];

  return Array.from({ length: 3 }).map((_, index) => ({
    title: `${query} › ${hints[index % hints.length]}`,
    snippet:
      "Neoficiální zdroj potvrzuje, že portál je stále aktivní. Přístup pouze pro operátory Tier-3.",
    meta: `secure://channel-${Math.floor(Math.random() * 9 + 1)}`,
  }));
}

function readProgressStore() {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Progress load failed", error);
    return {};
  }
}

function writeProgressStore(store) {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store));
}

function cacheProgressEntry(entry) {
  const store = readProgressStore();
  store[entry.code] = entry;
  writeProgressStore(store);
}



function openApp(key) {
  if (!apps[key]) return;

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

function toggleStartMenu() {
  const visible = startMenu.classList.toggle("visible");
  startMenu.setAttribute("aria-hidden", (!visible).toString());
}

function handleGlobalClick(event) {
  if (startMenu.contains(event.target) || startButton.contains(event.target)) {
    return;
  }
  startMenu.classList.remove("visible");
  startMenu.setAttribute("aria-hidden", "true");
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
  });
  clock.textContent = `${time} · ${date}`;
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
startMenuButtons.forEach((button) =>
  button.addEventListener("click", () => {
    openApp(button.dataset.app);
    toggleStartMenu();
  })
);

updateClock();
setInterval(updateClock, 15_000);

function initializeDesktop() {
  // Launch one window to make the scene feel alive.
  openApp("browser");
}

initializeDesktop();
