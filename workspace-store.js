"use strict";

(() => {
  const STORAGE_KEY = "mother-ai-jarvis-workspace-v1";
  let memoryFallback = null;
  let persistenceAvailable = true;

  function emptyWorkspace() {
    return { version: 1, activeId: null, plans: [] };
  }

  function normalizeWorkspace(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.plans)) {
      return emptyWorkspace();
    }
    const plans = value.plans.filter((plan) =>
      plan &&
      typeof plan.id === "string" &&
      typeof plan.idea === "string" &&
      typeof plan.title === "string" &&
      Array.isArray(plan.steps)
    );
    return {
      version: 1,
      activeId: plans.some((plan) => plan.id === value.activeId) ? value.activeId : plans.at(-1)?.id ?? null,
      plans,
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      memoryFallback = saved ? normalizeWorkspace(JSON.parse(saved)) : emptyWorkspace();
      persistenceAvailable = true;
      return { workspace: clone(memoryFallback), persistent: true };
    } catch {
      persistenceAvailable = false;
      memoryFallback = memoryFallback || emptyWorkspace();
      return { workspace: clone(memoryFallback), persistent: false };
    }
  }

  function save(workspace) {
    memoryFallback = normalizeWorkspace(workspace);
    if (!persistenceAvailable) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryFallback));
      return true;
    } catch {
      persistenceAvailable = false;
      return false;
    }
  }

  function clear() {
    memoryFallback = emptyWorkspace();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      persistenceAvailable = true;
      return true;
    } catch {
      persistenceAvailable = false;
      return false;
    }
  }

  window.JarvisWorkspaceStore = { load, save, clear };
})();

