const PATTERN = {
  emojis: ["🎉", "🍕", "🍾", "🦖", "🦕", "🍣"],
  // Aggiungi qui altre foto della trama: stessa cartella, stesso trattamento.
  images: ["assets/scroll/shrek.png"],
};

const HEX_RATIO = Math.sqrt(3) / 2;

function buildTokens() {
  const tokens = [];
  const { emojis, images } = PATTERN;

  emojis.forEach((emoji, index) => {
    tokens.push({ type: "emoji", value: emoji });
    if (images.length && index % 2 === 1) {
      tokens.push({
        type: "img",
        src: images[Math.floor(index / 2) % images.length],
      });
    }
  });

  if (images.length && !tokens.some((token) => token.type === "img")) {
    tokens.push({ type: "img", src: images[0] });
  }

  return tokens;
}

function stampNode(token) {
  const stamp = document.createElement("span");
  stamp.className = "stamp";

  if (token.type === "img") {
    stamp.classList.add("stamp--img");
    const img = document.createElement("img");
    img.src = token.src;
    img.alt = "";
    img.draggable = false;
    stamp.appendChild(img);
    return stamp;
  }

  stamp.classList.add("stamp--emoji");
  stamp.textContent = token.value;
  return stamp;
}

function tokenSize(name) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const probe = document.createElement("div");
  probe.style.width = raw.trim();
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}

function makeSheet(tokens, cols, rows) {
  const sheet = document.createElement("div");
  sheet.className = "pattern-sheet";

  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    const line = document.createElement("div");
    line.className = row % 2 ? "hex-row hex-row--shift" : "hex-row";
    for (let col = 0; col < cols; col += 1) {
      line.appendChild(stampNode(tokens[index % tokens.length]));
      index += 1;
    }
    sheet.appendChild(line);
  }

  return sheet;
}

function mountPatterns() {
  const tokens = buildTokens();
  const stamp = tokenSize("--stamp");
  const gap = tokenSize("--stamp-gap");
  const stepX = stamp + gap;
  const stepY = stepX * HEX_RATIO;
  const cols = Math.ceil(window.innerWidth / stepX) + 3;
  const rowsNeeded = Math.ceil(window.innerHeight / stepY) + 2;
  const rows = rowsNeeded % 2 === 0 ? rowsNeeded : rowsNeeded + 1;

  document.querySelectorAll("[data-pattern]").forEach((root) => {
    root.replaceChildren();
    const track = document.createElement("div");
    track.className = "pattern-track";
    track.style.setProperty("--hex-y", `${stepY}px`);
    track.style.setProperty("--hex-cols", String(cols));

    const sheet = makeSheet(tokens, cols, rows);
    for (let i = 0; i < 4; i += 1) {
      track.appendChild(i === 0 ? sheet : sheet.cloneNode(true));
    }
    root.appendChild(track);
  });

  clipPattern();
}

function clipPattern() {
  const band = document.querySelector(".band");
  const pattern = document.querySelector("[data-pattern]");
  if (!band || !pattern) return;

  const rect = band.getBoundingClientRect();
  const top = Math.max(0, rect.top);
  const bottom = Math.max(0, window.innerHeight - rect.bottom);
  pattern.style.clipPath = `inset(${top}px 0 ${bottom}px 0)`;
}

function setupParallax() {
  const photo = document.querySelector(".hero-photo");
  if (!photo) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ticking = false;

  const update = () => {
    ticking = false;
    if (reduceMotion.matches) {
      photo.style.transform = "translate3d(0, 0, 0) scale(1.12)";
      return;
    }

    const y = window.scrollY * 0.22;
    photo.style.transform = `translate3d(0, ${y}px, 0) scale(1.12)`;
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  reduceMotion.addEventListener("change", update);
}

function setupPatternRefresh() {
  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(mountPatterns, 150);
  });
  window.addEventListener("scroll", clipPattern, { passive: true });
}

function themeItemNode(item) {
  const li = document.createElement("li");
  const wrap = document.createElement("div");
  wrap.className = "theme-item";

  const name = document.createElement("span");
  name.className = "theme-name";
  name.textContent = item.name;
  wrap.appendChild(name);

  if (item.note) {
    const note = document.createElement("span");
    note.className = "theme-note";
    note.textContent = item.note;
    wrap.appendChild(note);
  }

  li.appendChild(wrap);
  return li;
}

function renderThemes(data) {
  const kicker = document.querySelector("[data-theme-kicker]");
  const title = document.querySelector("[data-theme-title]");
  const lead = document.querySelector("[data-theme-lead]");
  const list = document.querySelector("[data-theme-list]");
  if (!list) return;

  if (kicker && data.kicker) kicker.textContent = data.kicker;
  if (title && data.title) title.textContent = data.title;
  if (lead && data.lead) lead.textContent = data.lead;

  list.replaceChildren();
  data.items.forEach((item) => {
    list.appendChild(themeItemNode(item));
  });
}

async function mountThemes() {
  try {
    const response = await fetch("data/temi.json", { cache: "no-store" });
    if (!response.ok) throw new Error("temi.json non trovato");
    const data = await response.json();
    renderThemes(data);
    clipPattern();
  } catch (error) {
    console.error(error);
  }
}

function setupMapsSfx() {
  const link = document.querySelector(".poster-link");
  if (!link) return;

  const mapsUrl = link.href;
  const sfx = document.querySelector("#maps-sfx") || new Audio("assets/audio/fah-echo.mp3");
  sfx.preload = "auto";
  let busy = false;

  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;

    let launched = false;
    const go = () => {
      if (launched) return;
      launched = true;
      busy = false;
      window.clearTimeout(timeout);
      const opened = window.open(mapsUrl, "_blank");
      if (!opened) window.location.assign(mapsUrl);
    };

    const timeout = window.setTimeout(go, 1500);

    sfx.pause();
    sfx.currentTime = 0;

    const playing = sfx.play();
    if (playing && typeof playing.catch === "function") {
      playing.catch(() => {});
    }
  });
}

mountPatterns();
mountThemes();
setupParallax();
setupPatternRefresh();
setupMapsSfx();
