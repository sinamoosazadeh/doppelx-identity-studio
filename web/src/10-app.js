/* ==========================================================================
   DOPPEL — 10-app.js   bootstrap + global keyboard shortcuts
   ========================================================================== */
'use strict';

/* expose the engine on window for power users & automated tests */
window.DOPPEL = { version: DOPPEL_VERSION, FP, AGENT, Store, UI, Live, Playground, Editor, Guide, Settings, GEO, GEO_META, TZ_DB, TZ_BY_ID, LOCALE_META, U, makeRng };

(function boot() {
  const root = document.getElementById('root');
  if (!root) return;

  UI.init(root).then(() => {
    /* deep-link: #editor/<id> | #live | #settings */
    const h = location.hash.replace('#', '');
    if (h.startsWith('editor/')) {
      const id = h.split('/')[1];
      if (Store.db.profiles.some((p) => p.id === id)) UI.go('editor', id);
    } else if (h && ['dashboard', 'playground', 'guide', 'settings', 'live'].includes(h)) {
      UI.go(h);
    }
    window.addEventListener('hashchange', () => {
      const hh = location.hash.replace('#', '');
      if (hh.startsWith('editor/')) UI.go('editor', hh.split('/')[1]);
      else if (hh) UI.go(hh);
    });
  });

  /* keyboard */
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) {
      if (e.key === 'Escape') { e.target.blur(); UI.S.modal = null; UI.render(); }
      return;
    }
    if (e.key === 'Escape') { UI.S.modal = null; UI.render(); }
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey) { UI.S.modal = 'gen'; UI.render(); }
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey) { UI.go('dashboard'); }
    if (e.key === 'l' && !e.metaKey && !e.ctrlKey) { UI.go('live'); }
    if (e.key === '?' ) { UI.go('guide'); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); const q = document.getElementById('q'); if (q) q.focus(); }
  });

  /* first-run: seed one demo profile so the UI is never empty.
     NOTE: inside sandboxed iframes (opaque origin) touching localStorage throws — guard everything. */
  setTimeout(async () => {
    try {
      let seeded = false;
      try { seeded = !!localStorage.getItem('doppel.seeded'); } catch (e) { seeded = false; }
      if (Store.db.profiles.length === 0 && !seeded) {
        try { localStorage.setItem('doppel.seeded', '1'); } catch (e) {}
        const p = FP.repair(FP.generate({}));
        await Store.add(p);
        UI.render();
      }
    } catch (err) { console.warn('seed skipped', err); }
  }, 300);
})();
