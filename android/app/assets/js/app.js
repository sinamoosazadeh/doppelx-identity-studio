/* ==========================================================================
   DOPPEL X — app.js   router, theme, boot, global hooks
   ========================================================================== */
'use strict';

const App = (() => {
  const ROUTES = {
    home: () => Screens.home(),
    profiles: () => Screens.profiles(),
    viewer: (p) => Screens.viewer(p && p.id),
    create: (p) => Screens.create(p || {}),
    lab: () => Screens2.lab(),
    api: () => Screens2.api(),
    vault: () => Screens2.vault(),
  };
  let current = 'home';

  function go(route, params) {
    if (!ROUTES[route]) route = 'home';
    current = route;
    H.qsa('.tabbtn').forEach((b) => b.classList.toggle('on', b.dataset.nav === route || (route === 'viewer' && b.dataset.nav === 'profiles') || (route === 'create' && b.dataset.nav === 'profiles')));
    ROUTES[route](params || {});
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    H.haptic(6);
    try { history.replaceState(null, '', '#' + route); } catch (e) {}
  }

  function setTheme(t) {
    Store.setSettings({ theme: t });
    document.body.classList.toggle('light', t === 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f3f6fc' : '#070a12');
  }

  function boot() {
    setTheme(Store.settings.theme || 'dark');
    H.qsa('.tabbtn').forEach((b) => b.addEventListener('click', () => go(b.dataset.nav)));
    const st = H.qs('#btn-settings');
    if (st) st.onclick = () => go('vault');
    const th = H.qs('#btn-theme');
    if (th) th.onclick = () => setTheme(Store.settings.theme === 'light' ? 'dark' : 'light');

    /* Android back button → previous logical screen */
    window.addEventListener('popstate', () => { if (current !== 'home') go('home'); });
    if (window.DXBridge) {
      try {
        window.DXBridge.ready && window.DXBridge.ready();
        window.__dxBack = () => { if (current === 'viewer' || current === 'create') { go('profiles'); return true; } if (current !== 'home') { go('home'); return true; } return false; };
      } catch (e) {}
    }
    const h = (location.hash || '').replace('#', '');
    go(ROUTES[h] ? h : 'home');
    /* first-run seed: one showcase profile so the app never opens empty */
    if (!Store.profiles.length && !Store.settings.onboarding) {
      const p = DX.generateClean({ platform: 'android', country: 'US', privacy: 'standard' });
      Store.addProfile(p);
      Store.setSettings({ onboarding: true });
      Store.log('boot', 'Seeded showcase profile');
      go('home');
    }
    if (window.DXBridge && window.DXBridge.set) { try { window.DXBridge.set('dx.lastBoot', new Date().toISOString()); } catch (e) {} }
  }

  return { go, setTheme, boot, get current() { return current; } };
})();

document.addEventListener('DOMContentLoaded', () => {
  try { App.boot(); } catch (e) {
    document.getElementById('main').innerHTML = '<div class="card"><h3>Boot error</h3><pre class="mono">' + (e && e.message) + '</pre></div>';
    if (window.console) console.error(e);
  }
});
window.DXApp = App;
