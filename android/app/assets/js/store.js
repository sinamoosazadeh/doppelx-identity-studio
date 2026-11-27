/* ==========================================================================
   DOPPEL X — store.js
   Persistence, settings, folders, projects, templates, activity log.
   Works in WebView (native bridge), browsers (localStorage) and test runners.
   ========================================================================== */
'use strict';

const Store = (() => {
  const KEYS = {
    profiles: 'dx.profiles.v4', settings: 'dx.settings.v4', folders: 'dx.folders.v4',
    projects: 'dx.projects.v4', templates: 'dx.templates.v4', activity: 'dx.activity.v4', session: 'dx.session.v4',
  };
  const DEFAULTS = {
    theme: 'dark', haptics: true, animations: true, autoRepair: true, showWarnings: true,
    defaultPlatform: 'auto', defaultNetwork: 'proxy', defaultPrivacy: 'standard', defaultCountry: 'auto',
    proxyMode: 'per-profile', maxProfiles: 5000, lang: 'en', onboarding: false,
  };

  /* native bridge (Android) → JSON file store; fallback localStorage; fallback memory */
  const bridge = (typeof window !== 'undefined' && window.DXBridge) || null;
  const mem = {};
  function readRaw(k) {
    try {
      if (bridge && bridge.get) { const v = bridge.get(k); if (v != null) return v; }
      if (typeof localStorage !== 'undefined') return localStorage.getItem(k);
    } catch (e) {}
    return mem[k] == null ? null : mem[k];
  }
  function writeRaw(k, v) {
    try {
      if (bridge && bridge.set) { bridge.set(k, v); return; }
      if (typeof localStorage !== 'undefined') { localStorage.setItem(k, v); return; }
    } catch (e) {}
    mem[k] = v;
  }
  function read(k, fallback) {
    try { const raw = readRaw(k); return raw == null ? fallback : JSON.parse(raw); } catch (e) { return fallback; }
  }
  function write(k, v) {
    try { writeRaw(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }

  let profiles = read(KEYS.profiles, []);
  let settings = Object.assign({}, DEFAULTS, read(KEYS.settings, {}));
  let folders = read(KEYS.folders, [{ id: 'f_default', name: 'Default', color: '#4f8cff' }]);
  let projects = read(KEYS.projects, []);
  let templates = read(KEYS.templates, []);
  let activity = read(KEYS.activity, []);
  const session = read(KEYS.session, { runs: [], shares: [] });

  const save = {
    profiles: () => write(KEYS.profiles, profiles),
    settings: () => write(KEYS.settings, settings),
    folders: () => write(KEYS.folders, folders),
    projects: () => write(KEYS.projects, projects),
    templates: () => write(KEYS.templates, templates),
    activity: () => write(KEYS.activity, activity.slice(-300)),
    session: () => write(KEYS.session, session),
  };

  function log(kind, text, meta) {
    activity.push({ at: new Date().toISOString(), kind, text, meta: meta || null });
    save.activity();
  }

  return {
    KEYS, DEFAULTS,
    get settings() { return settings; },
    setSettings(patch) { settings = Object.assign({}, settings, patch); save.settings(); return settings; },
    get profiles() { return profiles; },
    setProfiles(list) { profiles = list; save.profiles(); },
    addProfile(p) { profiles.unshift(p); save.profiles(); return p; },
    updateProfile(id, patch) {
      const i = profiles.findIndex((x) => x.id === id);
      if (i < 0) return null;
      profiles[i] = Object.assign({}, profiles[i], patch, { updatedAt: new Date().toISOString() });
      save.profiles();
      return profiles[i];
    },
    replaceProfile(p) {
      const i = profiles.findIndex((x) => x.id === p.id);
      if (i < 0) profiles.unshift(p); else profiles[i] = p;
      save.profiles();
      return p;
    },
    removeProfile(id) { profiles = profiles.filter((x) => x.id !== id); save.profiles(); },
    removeMany(ids) { const s = new Set(ids); profiles = profiles.filter((x) => !s.has(x.id)); save.profiles(); },
    get folders() { return folders; },
    addFolder(name, color) { const f = { id: 'f_' + Date.now().toString(36), name, color: color || '#4f8cff' }; folders.push(f); save.folders(); return f; },
    removeFolder(id) { folders = folders.filter((f) => f.id !== id); profiles.forEach((p) => { if (p.group === id) p.group = ''; }); save.folders(); save.profiles(); },
    get projects() { return projects; },
    addProject(pr) { projects.push(pr); save.projects(); return pr; },
    updateProject(id, patch) { const i = projects.findIndex((x) => x.id === id); if (i >= 0) projects[i] = Object.assign(projects[i], patch); save.projects(); },
    removeProject(id) { projects = projects.filter((x) => x.id !== id); save.projects(); },
    get templates() { return templates; },
    addTemplate(t) { templates.push(t); save.templates(); return t; },
    removeTemplate(id) { templates = templates.filter((t) => t.id !== id); save.templates(); },
    get activity() { return activity; },
    get session() { return session; },
    log,
    wipe() {
      profiles = []; activity = []; projects = []; templates = [];
      settings = Object.assign({}, DEFAULTS);
      Object.values(KEYS).forEach((k) => { try { if (bridge && bridge.remove) bridge.remove(k); if (typeof localStorage !== 'undefined') localStorage.removeItem(k); } catch (e) {} });
      save.profiles(); save.settings(); save.activity(); save.projects(); save.templates(); save.folders();
    },
    exportAll() {
      return JSON.stringify({ app: 'DOPPEL X', version: '3.2.1', exportedAt: new Date().toISOString(), profiles, settings, folders, projects, templates, activity: activity.slice(-100) }, null, 2);
    },
    importAll(text) {
      const d = JSON.parse(text);
      if (!d || !Array.isArray(d.profiles)) throw new Error('Not a DOPPEL X backup (profiles[] missing).');
      profiles = d.profiles.concat(profiles.filter((p) => !d.profiles.some((x) => x.id === p.id)));
      if (d.settings) settings = Object.assign({}, DEFAULTS, d.settings);
      if (Array.isArray(d.folders) && d.folders.length) folders = d.folders;
      if (Array.isArray(d.projects)) projects = d.projects;
      if (Array.isArray(d.templates)) templates = d.templates;
      save.profiles(); save.settings(); save.folders(); save.projects(); save.templates();
      return profiles.length;
    },
    storageInfo() {
      const bytes = profiles.reduce((a, p) => a + JSON.stringify(p).length, 0);
      return { profiles: profiles.length, bytes, folders: folders.length, projects: projects.length, templates: templates.length, activity: activity.length };
    },
  };
})();
