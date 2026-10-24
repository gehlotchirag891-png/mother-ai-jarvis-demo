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

function selectTab(index, focus = false) {
  tabs.forEach((tab, i) => {
    const active = i === index;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    views[i].hidden = !active;
    views[i].classList.toggle("active", active);
  });
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

function updateJarvisSummary() {
  const plan = currentPlan();
  document.getElementById("jarvisCurrentTask").textContent = plan ? plan.title : "No active plan";
  document.getElementById("jarvisCurrentStatus").textContent = plan
    ? `${statusLabel(plan)} · progress appears in Work`
    : "Create a request to add a plan to Work.";
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
  updateJarvisSummary();
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

function addJarvisMessage(kind, text) {
  const bubble = document.createElement("p");
  bubble.className = kind === "user" ? "jarvis-user-message" : "jarvis-reply";
  bubble.textContent = text;
  document.getElementById("jarvisConversation").append(bubble);
  bubble.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

document.getElementById("jarvisForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const jarvisInput = document.getElementById("jarvisInput");
  const request = jarvisInput.value.trim();
  if (!request) return;

  pauseRunningPlan("Paused while you added a JARVIS request.");
  addJarvisMessage("user", request);
  jarvisInput.value = "";
  jarvisInput.disabled = true;
  const send = document.querySelector("#jarvisForm button[type=submit]");
  send.disabled = true;
  document.getElementById("jarvisStatus").textContent = "THINKING · LOCAL SIMULATION";
  document.getElementById("coreSystem").dataset.state = "thinking";
  document.getElementById("jarvisCurrentStatus").textContent = "Preparing a local starter plan…";

  window.setTimeout(() => {
    const plan = makePlan(request);
    plan.approved = true;
    plan.status = "ready";
    workspace.plans.push(plan);
    workspace.activeId = plan.id;
    saveWorkspace();
    renderChat();
    renderWorkspace();
    addJarvisMessage("assistant", `I made a local starter plan for “${plan.title}”. Open Work to review its steps and watch a simulated walkthrough. I’m not connected to an AI or computer controls in this prototype.`);
    document.getElementById("jarvisStatus").textContent = "CORE STANDBY · PROTOTYPE";
    document.getElementById("coreSystem").dataset.state = "idle";
    jarvisInput.disabled = false;
    send.disabled = false;
    jarvisInput.focus();
  }, 650);
});

document.getElementById("jarvisInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    document.getElementById("jarvisForm").requestSubmit();
  }
});

document.getElementById("openWorkButton").addEventListener("click", () => selectTab(1));

let coreZoom = 1;
function applyCoreZoom() {
  document.getElementById("coreSystem").style.setProperty("--core-zoom", coreZoom.toFixed(2));
  document.getElementById("zoomLevel").value = `${Math.round(coreZoom * 100)}%`;
}
document.getElementById("zoomIn").addEventListener("click", () => {
  coreZoom = Math.min(1.6, Math.round((coreZoom + 0.1) * 10) / 10);
  applyCoreZoom();
});
document.getElementById("zoomOut").addEventListener("click", () => {
  coreZoom = Math.max(0.6, Math.round((coreZoom - 0.1) * 10) / 10);
  applyCoreZoom();
});
document.getElementById("zoomReset").addEventListener("click", () => {
  coreZoom = 1;
  applyCoreZoom();
});

if (!workspace.plans.some((plan) => plan.id === workspace.activeId)) {
  workspace.activeId = workspace.plans.at(-1)?.id || null;
}
renderChat();
renderWorkspace();
selectTab(0);

