"use strict";

const tabs = [document.getElementById("chatTab"), document.getElementById("workTab"), document.getElementById("jarvisTab")];
const views = [document.getElementById("chatView"), document.getElementById("workView"), document.getElementById("jarvisView")];
const input = document.getElementById("chatInput");
const messageList = document.getElementById("conversationMessages");
const taskList = document.getElementById("taskList");
const storageNote = document.getElementById("storageNote");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const cancelButton = document.getElementById("cancelButton");
const taskStatus = document.getElementById("taskStatus");
const controlNote = document.getElementById("controlNote");
const timeline = document.getElementById("timeline");
const progressBar = document.querySelector(".progress-track");
const jarvisCanvas = document.getElementById("jarvisCanvas");
const jarvisContext = jarvisCanvas.getContext("2d", { alpha: false });
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let jarvisFrame = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let canvasScale = 1;
let lastJarvisDraw = 0;

const energyPointCount = 300;
const energyPoints = Array.from({ length: energyPointCount }, (_, index) => {
  const y = 1 - (index / (energyPointCount - 1)) * 2;
  const ring = Math.sqrt(1 - y * y);
  const angle = Math.PI * (3 - Math.sqrt(5)) * index;
  return { x: Math.cos(angle) * ring, y, z: Math.sin(angle) * ring };
});
const energyEdges = [];
energyPoints.forEach((point, index) => {
  const nearest = energyPoints.map((other, otherIndex) => {
    const dx = point.x - other.x;
    const dy = point.y - other.y;
    const dz = point.z - other.z;
    return { otherIndex, distance: dx * dx + dy * dy + dz * dz };
  }).filter((item) => item.otherIndex !== index).sort((a, b) => a.distance - b.distance).slice(0, 5);
  nearest.forEach(({ otherIndex }) => {
    if (otherIndex > index) energyEdges.push([index, otherIndex]);
  });
});
const energySparks = Array.from({ length: 1700 }, () => {
  const y = Math.random() * 2 - 1;
  const angle = Math.random() * Math.PI * 2;
  const ring = Math.sqrt(1 - y * y);
  return {
    x: Math.cos(angle) * ring,
    y,
    z: Math.sin(angle) * ring,
    radius: 0.92 + Math.random() * 0.34,
    size: 0.45 + Math.random() * 1.75,
    phase: Math.random() * Math.PI * 2,
  };
});

const loaded = window.JarvisWorkspaceStore.load();
const workspace = loaded.workspace;
const simulation = { timer: null };
let persistentStorage = loaded.persistent;

// A refresh pauses a running visual simulation. Nothing runs in the background.
workspace.plans.forEach((plan) => {
  if (plan.status === "running") {
    plan.status = "paused";
    plan.note = "Paused when this page was closed or refreshed.";
  }
});
saveWorkspace();

function saveWorkspace() {
  persistentStorage = window.JarvisWorkspaceStore.save(workspace);
  storageNote.textContent = persistentStorage
    ? "Saved in this browser only. Plans are not uploaded or synced."
    : "Browser storage is unavailable. Plans will stay only until you close this page.";
  return persistentStorage;
}

function selectTab(index, focus = false, updateHash = true) {
  tabs.forEach((tab, i) => {
    const active = i === index;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    views[i].hidden = !active;
    views[i].classList.toggle("active", active);
  });
  const inJarvis = index === 2;
  document.body.classList.toggle("jarvis-open", inJarvis);
  if (updateHash) {
    const hash = inJarvis ? "#jarvisView" : "";
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    }
  }
  if (inJarvis) startJarvisAnimation();
  else stopJarvisAnimation();
  if (focus) tabs[index].focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(index));
  tab.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(next, true);
  });
});

document.addEventListener("keydown", (event) => {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const shortcutIndex = { "1": 0, "2": 1, "3": 2 }[event.key];
  if (shortcutIndex === undefined) return;
  event.preventDefault();
  selectTab(shortcutIndex, shortcutIndex !== 2);
});

function resizeJarvisCanvas() {
  canvasScale = Math.min(window.devicePixelRatio || 1, 1.25);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  jarvisCanvas.width = Math.round(canvasWidth * canvasScale);
  jarvisCanvas.height = Math.round(canvasHeight * canvasScale);
  jarvisContext.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
}

function drawJarvisCore(time = 0) {
  const ctx = jarvisContext;
  const width = canvasWidth;
  const height = canvasHeight;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.45;
  const spin = time * 0.00016;
  const tilt = 0.42 + Math.sin(time * 0.00021) * 0.08;
  const sinY = Math.sin(spin);
  const cosY = Math.cos(spin);
  const sinX = Math.sin(tilt);
  const cosX = Math.cos(tilt);
  const projected = new Array(energyPoints.length);

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";

  const atmosphere = ctx.createRadialGradient(cx, cy, radius * 0.04, cx, cy, radius * 1.25);
  atmosphere.addColorStop(0, "rgba(255,151,21,0.12)");
  atmosphere.addColorStop(0.48, "rgba(150,61,5,0.07)");
  atmosphere.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = atmosphere;
  ctx.fillRect(cx - radius * 1.3, cy - radius * 1.3, radius * 2.6, radius * 2.6);

  for (let ray = 0; ray < 64; ray += 1) {
    const angle = (ray / 64) * Math.PI * 2 + Math.sin(time * 0.00028 + ray) * 0.025;
    const reach = radius * (0.88 + 0.52 * (0.5 + 0.5 * Math.sin(ray * 9.17)));
    const gradient = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
    gradient.addColorStop(0, "rgba(255,250,198,1)");
    gradient.addColorStop(0.22, "rgba(255,177,52,0.78)");
    gradient.addColorStop(1, "rgba(224,100,14,0)");
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * radius * 0.12, cy + Math.sin(angle) * radius * 0.12);
    ctx.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = ray % 8 === 0 ? 3.2 : ray % 3 === 0 ? 1.8 : 0.85;
    ctx.stroke();
  }

  // Broad tilted energy bands create the interwoven, fast-moving orbital form
  // in the user's reference instead of a tidy wireframe-only globe.
  const bands = [
    { tilt: -0.9, bank: 0.34, rx: 1.08, ry: 0.72, speed: 0.82, color: [255, 214, 104], width: 5.2 },
    { tilt: 0.82, bank: -0.52, rx: 1.02, ry: 0.66, speed: -0.68, color: [255, 154, 43], width: 3.8 },
    { tilt: 0.32, bank: 0.92, rx: 0.94, ry: 0.78, speed: 1.05, color: [255, 229, 129], width: 2.8 },
    { tilt: -0.42, bank: -1.24, rx: 0.86, ry: 0.61, speed: -0.92, color: [255, 123, 30], width: 2.1 },
    { tilt: 1.08, bank: 1.5, rx: 0.72, ry: 0.73, speed: 0.58, color: [255, 190, 68], width: 1.6 },
  ];
  bands.forEach((band, bandIndex) => {
    const rotation = spin * band.speed + band.bank;
    const segments = 220;
    const points = [];
    for (let i = 0; i <= segments; i += 1) {
      const a = (i / segments) * Math.PI * 2;
      const wobble = 1 + 0.025 * Math.sin(a * 7 + time * 0.0012 + bandIndex);
      const x = Math.cos(a) * radius * band.rx * wobble;
      const y = Math.sin(a) * radius * band.ry * wobble;
      const zTilt = y * Math.sin(band.tilt);
      const yTilt = y * Math.cos(band.tilt);
      const xBank = x * Math.cos(rotation) - zTilt * Math.sin(rotation);
      const zBank = x * Math.sin(rotation) + zTilt * Math.cos(rotation);
      const yBank = yTilt * Math.cos(band.tilt * 0.35) - zBank * Math.sin(band.tilt * 0.35);
      const zFinal = yTilt * Math.sin(band.tilt * 0.35) + zBank * Math.cos(band.tilt * 0.35);
      const depth = 0.9 + zFinal / (radius * 4.5);
      points.push({ x: cx + xBank * depth, y: cy + yBank * depth, z: zFinal });
    }
    // Draw a soft molten underglow, then a bright narrow filament.
    for (const pass of [{ width: band.width * 3.5, alpha: 0.13 }, { width: band.width, alpha: 0.78 }]) {
      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.strokeStyle = `rgba(${band.color[0]},${band.color[1]},${band.color[2]},${pass.alpha})`;
      ctx.lineWidth = pass.width;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    // Interrupted hot segments add a sparkling, turbulent edge to each band.
    for (let i = bandIndex * 13; i < segments; i += 9) {
      const p = points[i];
      const q = points[Math.min(i + 3, segments)];
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      ctx.strokeStyle = `rgba(255,248,184,${0.28 + 0.28 * Math.sin(i + time * 0.004)})`;
      ctx.lineWidth = band.width * 0.9; ctx.stroke();
    }
  });

  // Woven spherical filaments make the center feel like a tangled energy
  // sphere rather than a set of flat planetary rings.
  const wraps = [
    { waves: 2, phase: 0.2, amplitude: 0.76, color: "rgba(255,226,129,0.68)", width: 2.2 },
    { waves: 3, phase: 1.4, amplitude: 0.69, color: "rgba(255,158,48,0.62)", width: 1.8 },
    { waves: 4, phase: 2.7, amplitude: 0.61, color: "rgba(255,205,91,0.56)", width: 1.5 },
    { waves: 5, phase: 4.1, amplitude: 0.53, color: "rgba(255,123,31,0.52)", width: 1.2 },
    { waves: 3, phase: 5.2, amplitude: 0.83, color: "rgba(255,242,177,0.44)", width: 1.1 },
  ];
  wraps.forEach((wrap, wi) => {
    ctx.beginPath();
    const steps = 360;
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * Math.PI * 2;
      const latitude = wrap.amplitude * Math.sin(wrap.waves * t + wrap.phase + spin * (wi % 2 ? -0.7 : 0.6));
      const cosLat = Math.cos(latitude);
      const x = cosLat * Math.cos(t + spin * (0.55 + wi * 0.07));
      const y = Math.sin(latitude);
      const z = cosLat * Math.sin(t + spin * (0.55 + wi * 0.07));
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      const perspective = 0.9 + z2 * 0.11;
      const px = cx + x1 * radius * 0.94 * perspective;
      const py = cy + y2 * radius * 0.94 * perspective;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = wrap.color;
    ctx.lineWidth = wrap.width;
    ctx.stroke();
  });

  energyPoints.forEach((point, index) => {
    const x1 = point.x * cosY + point.z * sinY;
    const z1 = -point.x * sinY + point.z * cosY;
    const y2 = point.y * cosX - z1 * sinX;
    const z2 = point.y * sinX + z1 * cosX;
    const perspective = 0.94 + z2 * 0.08;
    projected[index] = { x: cx + x1 * radius * perspective, y: cy + y2 * radius * perspective, z: z2 };
  });

  energyEdges.forEach(([a, b]) => {
    const p = projected[a];
    const q = projected[b];
    const depth = Math.max(0, (p.z + q.z + 2) / 4);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = `rgba(255,${Math.round(125 + depth * 80)},${Math.round(28 + depth * 24)},${0.06 + depth * 0.2})`;
    ctx.lineWidth = 0.3 + depth * 0.24;
    ctx.stroke();
  });

  energySparks.forEach((spark) => {
    const x1 = spark.x * cosY + spark.z * sinY;
    const z1 = -spark.x * sinY + spark.z * cosY;
    const y2 = spark.y * cosX - z1 * sinX;
    const z2 = spark.y * sinX + z1 * cosX;
    const flicker = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(time * 0.003 + spark.phase));
    const depthFade = 0.35 + (z2 + 1) * 0.32;
    const distance = radius * spark.radius;
    const px = cx + x1 * distance;
    const py = cy + y2 * distance;
    if (flicker > 0.78 && spark.size > 0.8) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - Math.sin(time * 0.001 + spark.phase) * spark.size * 4, py - spark.size * 5);
      ctx.strokeStyle = `rgba(255,185,62,${0.25 * depthFade})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(px, py, spark.size * (0.65 + flicker * 0.7), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,${Math.round(166 + flicker * 89)},${Math.round(42 + flicker * 45)},${flicker * depthFade})`;
    ctx.fill();
  });

  const coreRadius = radius * (0.145 + Math.sin(time * 0.0015) * 0.012);
  const glow = ctx.createRadialGradient(cx, cy, coreRadius * 0.05, cx, cy, radius * 0.58);
  glow.addColorStop(0, "rgba(255,255,219,0.98)");
  glow.addColorStop(0.09, "rgba(255,239,130,0.95)");
  glow.addColorStop(0.19, "rgba(255,184,47,0.72)");
  glow.addColorStop(0.38, "rgba(255,111,14,0.32)");
  glow.addColorStop(1, "rgba(255,88,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.58, 0, Math.PI * 2);
  ctx.fill();

  for (let ray = 0; ray < 32; ray += 1) {
    const angle = (ray / 32) * Math.PI * 2 - spin * 0.25;
    const end = coreRadius * (1.25 + (ray % 5) * 0.18);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * coreRadius * 0.7, cy + Math.sin(angle) * coreRadius * 0.7);
    ctx.lineTo(cx + Math.cos(angle) * end, cy + Math.sin(angle) * end);
    ctx.strokeStyle = "rgba(255,246,175,0.82)";
    ctx.lineWidth = ray % 3 === 0 ? 1.3 : 0.7;
    ctx.stroke();
  }

  const sun = ctx.createRadialGradient(cx - coreRadius * 0.25, cy - coreRadius * 0.28, coreRadius * 0.02, cx, cy, coreRadius);
  sun.addColorStop(0, "#fffde5");
  sun.addColorStop(0.28, "#fff2a0");
  sun.addColorStop(0.63, "#ffc63e");
  sun.addColorStop(1, "#ef8016");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function animateJarvis(time) {
  if (!document.body.classList.contains("jarvis-open") || document.hidden) {
    jarvisFrame = 0;
    return;
  }
  if (!reduceMotion.matches && time - lastJarvisDraw < 1000 / 30) {
    jarvisFrame = window.requestAnimationFrame(animateJarvis);
    return;
  }
  lastJarvisDraw = time;
  drawJarvisCore(time);
  if (!reduceMotion.matches) jarvisFrame = window.requestAnimationFrame(animateJarvis);
}

function startJarvisAnimation() {
  resizeJarvisCanvas();
  if (jarvisFrame) return;
  jarvisFrame = window.requestAnimationFrame(animateJarvis);
}

function stopJarvisAnimation() {
  if (jarvisFrame) window.cancelAnimationFrame(jarvisFrame);
  jarvisFrame = 0;
}

window.addEventListener("resize", () => {
  if (document.body.classList.contains("jarvis-open")) resizeJarvisCanvas();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopJarvisAnimation();
  else if (document.body.classList.contains("jarvis-open")) startJarvisAnimation();
});
reduceMotion.addEventListener("change", () => {
  if (document.body.classList.contains("jarvis-open")) {
    stopJarvisAnimation();
    startJarvisAnimation();
  }
});

function currentPlan() {
  return workspace.plans.find((plan) => plan.id === workspace.activeId) || null;
}

function setStatus(status) {
  taskStatus.replaceChildren();
  const dot = document.createElement("i");
  taskStatus.append(dot, document.createTextNode(status));
  taskStatus.classList.toggle("paused", status === "Paused demo");
  taskStatus.classList.toggle("stopped", status === "Stopped demo");
  taskStatus.classList.toggle("complete", status === "Demo complete");
}

function setProgress(value, label = `${value}%`) {
  document.getElementById("progressLabel").textContent = label;
  document.getElementById("progressFill").style.width = `${value}%`;
  progressBar.setAttribute("aria-valuenow", String(value));
}

function addMessage(role, textContent, shouldScroll = true) {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.style.marginTop = "18px";
  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user-avatar" : ""}`;
  avatar.textContent = role === "user" ? "Y" : "M";
  const content = document.createElement("div");
  const title = document.createElement("div");
  title.className = "speaker";
  title.textContent = role === "user" ? "YOU · LOCAL DEMO" : "JARVIS · PROTOTYPE";
  const text = document.createElement("p");
  text.textContent = textContent;
  content.append(title, text);
  article.append(avatar, content);
  messageList.append(article);
  if (shouldScroll) article.scrollIntoView({ block: "nearest", behavior: "smooth" });
  return article;
}

function makePlan(idea) {
  const siteLike = /website|web page|landing page|launch page|site\b/i.test(idea);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    idea,
    title: idea.length > 76 ? `${idea.slice(0, 73).trimEnd()}…` : idea,
    steps: siteLike
      ? ["Map the page story and key sections", "Shape a visual direction for the first screen", "Review the concept and next steps"]
      : ["Clarify the idea and its main goal", "Create a visual direction for the concept", "Review the concept and next steps"],
    createdAt: new Date().toISOString(),
    approved: false,
    status: "draft",
    stage: 0,
    progress: 0,
    note: "",
  };
}

function renderPlanCard(plan) {
  const card = document.createElement("article");
  card.className = "proposal-card";
  const heading = document.createElement("div");
  heading.className = "proposal-heading";
  const kicker = document.createElement("span");
  kicker.className = "proposal-kicker";
  kicker.textContent = "PLAN PREVIEW · LOCAL DEMO";
  const stamp = document.createElement("span");
  stamp.className = `proposal-stamp${plan.approved ? " approved" : ""}`;
  stamp.textContent = plan.approved ? "SAVED · DEMO" : "REVIEW FIRST";
  heading.append(kicker, stamp);

  const title = document.createElement("h3");
  title.textContent = plan.title;
  const intro = document.createElement("p");
  intro.className = "proposal-intro";
  intro.textContent = "A starter plan template based on your message. It was not generated by an AI.";
  const list = document.createElement("ol");
  list.className = "proposal-steps";
  plan.steps.forEach((step, index) => {
    const item = document.createElement("li");
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("b");
    label.textContent = step;
    item.append(number, label);
    list.append(item);
  });

  const actionRow = document.createElement("div");
  actionRow.className = "proposal-actions";
  const note = document.createElement("span");
  note.textContent = plan.approved ? "Saved to this browser’s Work list." : "Review the template before adding it to Work.";
  const action = document.createElement("button");
  action.className = plan.approved ? "approve-plan secondary-action" : "approve-plan";
  action.type = "button";
  action.textContent = plan.approved ? "Open in Work" : "Save plan to Work";
  action.addEventListener("click", () => {
    if (!plan.approved) {
      plan.approved = true;
      plan.status = "ready";
      plan.note = "";
    }
    workspace.activeId = plan.id;
    saveWorkspace();
    renderWorkspace();
    selectTab(1);
  });
  actionRow.append(note, action);
  card.append(heading, title, intro, list, actionRow);
  messageList.append(card);
}

function renderChat() {
  messageList.replaceChildren();
  workspace.plans.forEach((plan) => {
    addMessage("user", plan.idea, false);
    renderPlanCard(plan);
  });
}

function submitIdea(value) {
  pauseRunningPlan("Paused while you added another plan.");
  const plan = makePlan(value);
  workspace.plans.push(plan);
  workspace.activeId = plan.id;
  saveWorkspace();
  renderChat();
  input.value = "";
  const lastCard = messageList.lastElementChild;
  if (lastCard) lastCard.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

document.getElementById("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (value) submitIdea(value);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    document.getElementById("chatForm").requestSubmit();
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt;
    input.focus();
  });
});

function statusLabel(plan) {
  return {
    draft: "Needs review",
    ready: "Ready",
    running: "In progress · demo",
    paused: "Paused",
    stopped: "Stopped",
    complete: "Complete",
  }[plan.status] || "Saved";
}

function renderTaskList() {
  taskList.replaceChildren();
  const clearButton = document.getElementById("clearDataButton");
  clearButton.hidden = workspace.plans.length === 0;

  if (!workspace.plans.length) {
    const empty = document.createElement("div");
    empty.className = "task-list-empty";
    empty.textContent = "Your saved plans will appear here. Start one from Chat.";
    taskList.append(empty);
    return;
  }

  [...workspace.plans].reverse().forEach((plan) => {
    const row = document.createElement("div");
    row.className = `task-list-row${plan.id === workspace.activeId ? " selected" : ""}`;
    const select = document.createElement("button");
    select.type = "button";
    select.className = "task-select";
    select.setAttribute("aria-current", String(plan.id === workspace.activeId));
    const title = document.createElement("b");
    title.textContent = plan.title;
    const detail = document.createElement("span");
    detail.textContent = `${statusLabel(plan)} · ${new Date(plan.createdAt).toLocaleDateString()}`;
    select.append(title, detail);
    select.addEventListener("click", () => selectPlan(plan.id));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "task-remove";
    remove.setAttribute("aria-label", `Remove plan: ${plan.title}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => removePlan(plan.id));
    row.append(select, remove);
    taskList.append(row);
  });
}

function renderTimeline(currentStep, completed = false, stopped = false) {
  timeline.replaceChildren();
  const plan = currentPlan();
  if (!plan) return;
  const steps = [
    { title: "Plan saved", detail: "Your starter plan is stored in this browser." },
    ...plan.steps.map((title) => ({ title, detail: "A simulated activity step for this idea." })),
  ];
  steps.forEach((step, index) => {
    const isCurrent = index === currentStep;
    const state = completed || index < currentStep ? "done" : isCurrent ? (stopped ? "stopped" : "current") : "future";
    const item = document.createElement("li");
    item.className = state;
    const icon = document.createElement("span");
    icon.className = "timeline-icon";
    if (state === "done") icon.textContent = "✓";
    else if (state === "current") icon.append(document.createElement("i"));
    else if (state === "stopped") icon.textContent = "Ⅱ";
    else icon.textContent = String(index + 1);
    const body = document.createElement("div");
    const title = document.createElement("b");
    title.textContent = step.title;
    const detail = document.createElement("p");
    detail.textContent = step.detail;
    const time = document.createElement("small");
    time.textContent = state === "done" ? "DONE · DEMO" : state === "current" ? "IN PROGRESS · DEMO" : state === "stopped" ? "STOPPED · DEMO" : "UP NEXT";
    body.append(title, detail, time);
    item.append(icon, body);
    timeline.append(item);
  });
}

function renderActiveTask() {
  const plan = currentPlan();
  simulation.planId = plan?.id || null;

  if (!plan) {
    document.getElementById("taskTitle").textContent = "Waiting for a plan";
    document.getElementById("taskDescription").textContent = "Create a plan in Chat and save it to see it here.";
    setStatus("Awaiting plan");
    setProgress(0);
    startButton.disabled = true;
    pauseButton.disabled = true;
    cancelButton.disabled = true;
    controlNote.textContent = "Create a plan in Chat to begin.";
    timeline.replaceChildren();
    document.getElementById("nextTitle").textContent = "Create a plan in Chat";
    document.getElementById("nextDescription").textContent = "Your selected plan’s next step will appear here.";
    document.getElementById("nextStep").textContent = "WAITING FOR PLAN";
    document.getElementById("previewCaption").textContent = "Illustrative preview · not generated";
    return;
  }

  document.getElementById("taskTitle").textContent = plan.title;
  document.getElementById("taskDescription").textContent = plan.approved
    ? "Saved in this browser. Start the demo to watch its activity and preview change."
    : "Review this starter plan in Chat and save it to Work before starting a demo.";
  document.getElementById("previewBrand").childNodes[0].textContent = plan.title.toUpperCase();
  document.getElementById("previewEyebrow").textContent = "A FIRST DIRECTION · DEMO";
  const previewTitle = plan.title.length > 30 ? `${plan.title.slice(0, 27).trimEnd()}…` : plan.title;
  document.getElementById("previewHeadline").textContent = `A concept for\n${previewTitle}`;
  document.getElementById("previewSubhead").textContent = "Illustrative layout based on your request.";
  document.getElementById("previewAction").textContent = "ILLUSTRATIVE MOCKUP";
  document.getElementById("previewCaption").textContent = "Static illustration · label and copy updated for this plan";
  document.getElementById("nextTitle").textContent = plan.steps[Math.min(plan.stage, plan.steps.length - 1)];
  document.getElementById("nextDescription").textContent = "The next timeline step will appear here as the demo progresses.";
  document.getElementById("nextProgress").style.width = `${plan.progress}%`;
  document.getElementById("nextStep").textContent = plan.status === "complete" ? "DEMO COMPLETE" : plan.approved ? "READY · DEMO" : "PLAN NEEDS REVIEW";
  setProgress(plan.progress, plan.status === "stopped" ? "Stopped" : `${plan.progress}%`);

  if (!plan.approved) {
    setStatus("Awaiting plan");
    startButton.disabled = true;
    startButton.textContent = "Approve in Chat";
    pauseButton.disabled = true;
    cancelButton.disabled = true;
    controlNote.textContent = "Review and save this plan from Chat first.";
    renderTimeline(0);
    return;
  }

  const currentStep = Math.min(plan.stage, plan.steps.length);
  renderTimeline(plan.status === "ready" ? 1 : currentStep, plan.status === "complete", plan.status === "stopped");
  if (plan.status === "ready") {
    setStatus("Ready for demo");
    startButton.disabled = false;
    startButton.textContent = "▶  Start demo";
    pauseButton.disabled = true;
    pauseButton.textContent = "Ⅱ  Pause demo";
    cancelButton.disabled = true;
    controlNote.textContent = "This browser-only demo has not started.";
  } else if (plan.status === "running") {
    setStatus("In progress · demo");
    startButton.disabled = true;
    startButton.textContent = "Demo running…";
    pauseButton.disabled = false;
    pauseButton.textContent = "Ⅱ  Pause demo";
    cancelButton.disabled = false;
    controlNote.textContent = "Progress is simulated locally in this page.";
  } else if (plan.status === "paused") {
    setStatus("Paused demo");
    startButton.disabled = false;
    startButton.textContent = "▶  Resume demo";
    pauseButton.disabled = true;
    pauseButton.textContent = "▶  Resume demo";
    cancelButton.disabled = false;
    controlNote.textContent = plan.note || "The local progress simulation is paused.";
  } else if (plan.status === "stopped") {
    setStatus("Stopped demo");
    startButton.disabled = false;
    startButton.textContent = "↻  Restart demo";
    pauseButton.disabled = true;
    pauseButton.textContent = "Ⅱ  Pause demo";
    cancelButton.disabled = true;
    controlNote.textContent = "The simulation stopped. Nothing was executed.";
  } else {
    setStatus("Demo complete");
    startButton.disabled = false;
    startButton.textContent = "↻  Replay demo";
    pauseButton.disabled = true;
    pauseButton.textContent = "Ⅱ  Pause demo";
    cancelButton.disabled = true;
    controlNote.textContent = "Simulation complete. Replay it or return to Chat.";
  }
}

function renderWorkspace() {
  renderTaskList();
  renderActiveTask();
}

function selectPlan(id) {
  if (workspace.activeId !== id) pauseRunningPlan("Paused while you viewed another plan.");
  workspace.activeId = id;
  saveWorkspace();
  renderWorkspace();
}

function pauseRunningPlan(reason) {
  const active = currentPlan();
  if (!active || active.status !== "running") return;
  window.clearInterval(simulation.timer);
  simulation.timer = null;
  active.status = "paused";
  active.note = reason;
}

function removePlan(id) {
  const plan = workspace.plans.find((item) => item.id === id);
  if (!plan || !window.confirm(`Remove “${plan.title}” from this browser?`)) return;
  pauseRunningPlan("Paused while you removed a plan.");
  workspace.plans = workspace.plans.filter((item) => item.id !== id);
  if (workspace.activeId === id) workspace.activeId = workspace.plans.at(-1)?.id || null;
  saveWorkspace();
  renderChat();
  renderWorkspace();
}

document.getElementById("newPlanButton").addEventListener("click", () => {
  selectTab(0);
  input.focus();
});

document.getElementById("clearDataButton").addEventListener("click", () => {
  if (!window.confirm("Clear every saved plan from this browser? This cannot be undone.")) return;
  window.clearInterval(simulation.timer);
  simulation.timer = null;
  workspace.plans = [];
  workspace.activeId = null;
  window.JarvisWorkspaceStore.clear();
  saveWorkspace();
  renderChat();
  renderWorkspace();
  selectTab(0);
  input.focus();
});

function advanceDemo() {
  const plan = currentPlan();
  if (!plan || plan.status !== "running") return;
  plan.stage = Math.min(plan.stage + 1, 4);
  plan.progress = [0, 18, 54, 84, 100][plan.stage];
  if (plan.stage >= 4) {
    plan.status = "complete";
    plan.note = "";
    window.clearInterval(simulation.timer);
    simulation.timer = null;
  }
  saveWorkspace();
  renderWorkspace();
}

startButton.addEventListener("click", () => {
  const plan = currentPlan();
  if (!plan?.approved) return;
  if (plan.status === "ready" || plan.status === "stopped" || plan.status === "complete") {
    plan.stage = 0;
    plan.progress = 0;
  }
  plan.status = "running";
  plan.note = "";
  saveWorkspace();
  renderWorkspace();
  if (plan.stage === 0) advanceDemo();
  if (plan.status === "running") {
    simulation.timer = window.setInterval(advanceDemo, 1400);
  }
});

pauseButton.addEventListener("click", () => {
  const plan = currentPlan();
  if (!plan || plan.status !== "running") return;
  window.clearInterval(simulation.timer);
  simulation.timer = null;
  plan.status = "paused";
  plan.note = "The local progress simulation is paused.";
  saveWorkspace();
  renderWorkspace();
});

cancelButton.addEventListener("click", () => {
  const plan = currentPlan();
  if (!plan || !["running", "paused"].includes(plan.status)) return;
  window.clearInterval(simulation.timer);
  simulation.timer = null;
  plan.status = "stopped";
  plan.note = "The simulation stopped. Nothing was executed.";
  saveWorkspace();
  renderWorkspace();
});

if (!workspace.plans.some((plan) => plan.id === workspace.activeId)) {
  workspace.activeId = workspace.plans.at(-1)?.id || null;
}
renderChat();
renderWorkspace();
selectTab(window.location.hash === "#jarvisView" ? 2 : 0, false, false);
