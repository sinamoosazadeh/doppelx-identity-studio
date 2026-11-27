/* ==========================================================================
   DOPPEL X — screens.js   Home · Profiles · Viewer · Create wizard
   ========================================================================== */
'use strict';

const Screens = (() => {
  const main = () => H.qs('#main');

  /* ------------------------------------------------------------------ HOME */
  function home() {
    const ps = Store.profiles;
    const avg = ps.length ? Math.round(ps.reduce((a, p) => a + (p.consistency ? p.consistency.score : 0), 0) / ps.length) : 0;
    const aGrade = ps.filter((p) => p.consistency && p.consistency.grade === 'A').length;
    const mobile = ps.filter((p) => p.os.platform === 'android' || p.os.platform === 'ios').length;
    main().innerHTML = `<div class="view">
      <section class="hero">
        <span class="pill acc"><span class="dot"></span>ENGINE ${DX.VERSION}</span>
        <h2>Coherent identities,<br>built in one tap.</h2>
        <p>${ANDROID_EXT_COUNT()} device archetypes · ${Object.keys(GEO).length} countries · ${TZ_DB.length} timezones · ${Object.keys(chrome_version_country()).length} locale sets. Every profile passes a ${CHECK_COUNT()}point audit before it leaves the engine.</p>
        <div class="kpis">
          <div class="kpi"><b>${ps.length}</b><span>Profiles</span></div>
          <div class="kpi"><b>${avg || '—'}</b><span>Avg score</span></div>
          <div class="kpi"><b>${aGrade}</b><span>A-grade</span></div>
        </div>
      </section>

      <div class="grid2">
        <button class="btn primary block" data-act="quick-mobile">${Icon.phone} Random mobile</button>
        <button class="btn cyan block" data-act="quick-desktop">${Icon.layers} Random desktop</button>
      </div>
      <div class="grid2 mt-s">
        <button class="btn block" data-act="create">${Icon.sparkle} Custom build</button>
        <button class="btn block" id="btn-audit">${Icon.shield} Smart audit</button>
      </div>

      <div class="lbl">Golden presets</div>
      <div class="plist" id="golden"></div>

      <div class="lbl">Recent</div>
      <div class="plist" id="recent"></div>

      ${ps.length === 0 ? `<div class="note mt">New here? Start with <b>Random mobile</b> — it generates a fully coherent Android profile (real device catalog, matching GPU, city, timezone, locale, carrier) in under a millisecond, then audits it.</div>` : ''}

      <div class="lbl">Why DOPPEL X</div>
      <div class="card tight">
        <div class="check"><div class="ic pass">✓</div><div><div class="l">Anchor-first generation</div><div class="d">Everything derives from country + device + browser, so timezone, locale, GPU, DPR and UA-CH can never disagree.</div></div></div>
        <div class="check"><div class="ic pass">✓</div><div><div class="l">${CHECK_COUNT()}-check audit + auto-repair</div><div class="d">Every profile ships with a pass/fail report and a one-tap repair that re-derives dependent fields.</div></div></div>
        <div class="check"><div class="ic pass">✓</div><div><div class="l">14 executable exports</div><div class="d">Userscript, Termux Playwright, v2rayNG, Super Proxy, MV3 extension, Playwright, Puppeteer, Selenium, ADB bundle, WebView, verifier, JSON, CSV, feed.</div></div></div>
        <div class="check"><div class="ic pass">✓</div><div><div class="l">Honest surface map</div><div class="d">Every profile lists which signals are spoofable without root — and which can only be fixed at the device or network layer.</div></div></div>
      </div>
    </div>`;

    /* golden presets */
    const gold = [
      { k: 'US · iPhone shopper', d: 'iOS 18 · Safari · New York · strict privacy', o: { country: 'US', platform: 'ios', privacy: 'strict' } },
      { k: 'DE · Pixel researcher', d: 'Android 15 · Chrome · Berlin · residential exit', o: { country: 'DE', platform: 'android', privacy: 'standard' } },
      { k: 'TR · Windows gamer', d: 'Windows 11 · Chrome · Istanbul · RTX class', o: { country: 'TR', platform: 'windows', privacy: 'standard' } },
      { k: 'SG · MacBook analyst', d: 'macOS · Safari · Singapore · low entropy', o: { country: 'SG', platform: 'macos', privacy: 'standard' } },
    ];
    H.qs('#golden').innerHTML = gold.map((g, i) => `
      <div class="pcard" data-gold="${i}">
        <div class="pav">${g.k.slice(0, 2).toUpperCase()}</div>
        <div class="grow"><div class="pname">${H.esc(g.k)}</div><div class="pmeta">${H.esc(g.d)}</div></div>
        <div class="pside"><span class="pill acc">1-tap</span></div>
      </div>`).join('');
    H.qsa('[data-gold]').forEach((el) => el.addEventListener('click', () => {
      H.haptic(10);
      const g = gold[+el.dataset.gold];
      const p = DX.generateClean(Object.assign({ group: 'f_default' }, g.o));
      Store.addProfile(p); Store.log('generate', `Golden preset → ${p.name}`);
      UI.toast(`Created ${p.name} · grade ${p.consistency.grade}`, 'ok');
      App.go('viewer', { id: p.id });
    }));

    /* recents */
    const rec = [...ps].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3);
    H.qs('#recent').innerHTML = rec.length ? rec.map(pcardHtml).join('') : UI.empty('◇', 'No profiles yet', 'Generate your first identity above.');
    H.qsa('#recent [data-id]').forEach((el) => el.addEventListener('click', () => App.go('viewer', { id: el.dataset.id })));

    H.qs('[data-act="quick-mobile"]').onclick = () => quick({ platform: 'android' });
    H.qs('[data-act="quick-desktop"]').onclick = () => quick({ platform: 'windows' });
    H.qs('[data-act="create"]').onclick = () => App.go('create');
    H.qs('#btn-audit').onclick = () => auditSheet();
  }

  function quick(opts) {
    H.haptic(12);
    const p = DX.generateClean(opts);
    Store.addProfile(p); Store.log('generate', `Random → ${p.name}`);
    UI.toast(`Created ${p.name} · ${p.consistency.score}/100 · ${p.consistency.grade}`, 'ok');
    App.go('viewer', { id: p.id });
  }

  function pcardHtml(p) {
    const cc = p.geo.country;
    return `<div class="pcard" data-id="${p.id}">
      ${UI.avatar(p)}
      <div class="grow">
        <div class="pname ellipsis">${H.esc(p.name)}</div>
        <div class="pmeta ellipsis">${H.flagOf(cc)} ${H.esc(p.os.osName)} ${H.esc(p.os.osVersion)} · ${H.esc(p.browser.name.split(' ')[0])} ${p.browser.major} · ${H.esc(p.geo.city.split(',')[0])}</div>
      </div>
      <div class="pside">
        <div>${UI.gradeBadge(p)}</div>
        <div class="pmeta">${p.consistency ? p.consistency.score : '—'}/100</div>
      </div>
    </div>`;
  }

  function ANDROID_EXT_COUNT() { return DEVICE_MODELS.android.length + IOS_DEVICES.length + DEVICE_MODELS.windows.length + DEVICE_MODELS.macos.length + DEVICE_MODELS.linux.length; }
  function chrome_version_country() { return LOCALES; }
  function CHECK_COUNT() { const p = DX.generate({ country: 'US', platform: 'windows' }); return p.consistency.checks.length; }

  /* -------------------------------------------------------------- PROFILES */
  const P = { q: '', filter: 'all', sort: 'recent', sel: new Set() };
  function profiles() {
    main().innerHTML = `<div class="view">
      <div class="row between">
        <h2 style="margin:4px 0 10px;font-size:19px">Profiles <span class="mut small">(${Store.profiles.length})</span></h2>
        <button class="btn sm ghost" id="pv-batch">Batch</button>
      </div>
      <div class="srch">${Icon.search}<input id="pv-q" placeholder="Search name, city, OS, browser…" value="${H.esc(P.q)}"></div>
      <div class="chips mt-s" id="pv-filters">
        ${[['all', 'All'], ['mobile', 'Mobile'], ['desktop', 'Desktop'], ['strict', 'Strict'], ['warn', 'Needs fix']].map(([k, l]) => `<button class="chip ${P.filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}
        ${Store.folders.map((f) => `<button class="chip ${P.filter === 'fold:' + f.id ? 'on' : ''}" data-f="fold:${f.id}">${H.esc(f.name)}</button>`).join('')}
      </div>
      <div class="row between mt-s">
        <div class="small mut">${P.sel.size ? `${P.sel.size} selected` : 'Tap to open · long-press to select'}</div>
        <select id="pv-sort" class="pill" style="border-radius:10px;padding:6px 8px">
          <option value="recent" ${P.sort === 'recent' ? 'selected' : ''}>Recent</option>
          <option value="grade" ${P.sort === 'grade' ? 'selected' : ''}>Score</option>
          <option value="name" ${P.sort === 'name' ? 'selected' : ''}>Name</option>
          <option value="platform" ${P.sort === 'platform' ? 'selected' : ''}>Platform</option>
        </select>
      </div>
      <div class="plist mt-s list-pad" id="pv-list"></div>
      ${P.sel.size ? `<div class="card tight mt" id="pv-actions" style="position:sticky;bottom:calc(var(--tab-h)+12px);z-index:20"></div>` : ''}
      <button class="fab" id="pv-fab" title="Generate">${Icon.plus}</button>
    </div>`;

    renderList();
    H.qs('#pv-q').oninput = (e) => { P.q = e.target.value; renderList(); };
    H.qsa('#pv-filters .chip').forEach((c) => c.onclick = () => { P.filter = c.dataset.f; profiles(); });
    H.qs('#pv-sort').onchange = (e) => { P.sort = e.target.value; renderList(); };
    H.qs('#pv-fab').onclick = () => quick({});
    H.qs('#pv-batch').onclick = () => batchSheet();
    if (P.sel.size) renderActions();
  }

  function filtered() {
    let list = Store.profiles.slice();
    const q = P.q.toLowerCase().trim();
    if (q) list = list.filter((p) => [p.name, p.geo.city, p.geo.countryName, p.os.osName, p.browser.name, p.locale.locale, p.hardware.gpu.device].join(' ').toLowerCase().includes(q));
    if (P.filter === 'mobile') list = list.filter((p) => p.os.platform === 'android' || p.os.platform === 'ios');
    else if (P.filter === 'desktop') list = list.filter((p) => !(p.os.platform === 'android' || p.os.platform === 'ios'));
    else if (P.filter === 'strict') list = list.filter((p) => p.privacy && p.privacy.mode === 'strict');
    else if (P.filter === 'warn') list = list.filter((p) => p.consistency && (p.consistency.warnings.length || p.consistency.errors.length));
    else if (P.filter.startsWith('fold:')) list = list.filter((p) => p.group === P.filter.slice(5));
    const rank = { A: 4, B: 3, C: 2, D: 1, E: 0 };
    if (P.sort === 'grade') list.sort((a, b) => (b.consistency ? b.consistency.score : 0) - (a.consistency ? a.consistency.score : 0));
    else if (P.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (P.sort === 'platform') list.sort((a, b) => a.os.platform.localeCompare(b.os.platform));
    else list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return list;
  }

  function renderList() {
    const list = filtered();
    const box = H.qs('#pv-list');
    if (!box) return;
    if (!list.length) { box.innerHTML = UI.empty('◇', 'Nothing matches', 'Try another filter, or generate a new profile.'); return; }
    box.innerHTML = list.map((p) => `
      <div class="pcard ${P.sel.has(p.id) ? 'sel' : ''}" data-id="${p.id}">
        <div class="checkbox ${P.sel.has(p.id) ? 'on' : ''}" data-check="${p.id}">${P.sel.has(p.id) ? '✓' : ''}</div>
        ${UI.avatar(p)}
        <div class="grow">
          <div class="pname ellipsis">${H.esc(p.name)}</div>
          <div class="pmeta ellipsis">${H.flagOf(p.geo.country)} ${H.esc(p.os.osName)} ${H.esc(p.os.osVersion)} · ${H.esc(p.browser.name)} ${p.browser.major} · ${H.esc(p.geo.city.split(',')[0])} · ${H.esc(p.locale.locale)}</div>
        </div>
        <div class="pside">${UI.gradeBadge(p)}<div class="pmeta">${p.consistency ? p.consistency.score : '—'}</div></div>
      </div>`).join('');
    H.qsa('#pv-list .pcard').forEach((el) => {
      const id = el.dataset.id;
      let timer = null;
      el.addEventListener('pointerdown', () => { timer = setTimeout(() => { H.haptic(14); toggleSel(id); }, 450); });
      el.addEventListener('pointerup', () => clearTimeout(timer));
      el.addEventListener('pointerleave', () => clearTimeout(timer));
      el.addEventListener('click', () => {
        if (timer === null) return;
        clearTimeout(timer); timer = null;
        if (P.sel.size) toggleSel(id); else App.go('viewer', { id });
      });
    });
    H.qsa('#pv-list [data-check]').forEach((c) => c.addEventListener('click', (e) => { e.stopPropagation(); toggleSel(c.dataset.check); }));
  }

  function toggleSel(id) {
    if (P.sel.has(id)) P.sel.delete(id); else P.sel.add(id);
    profiles();
  }

  function renderActions() {
    const box = H.qs('#pv-actions');
    if (!box) return;
    box.innerHTML = `<div class="row wrap">
      <button class="btn sm" data-a="repair">${Icon.shield} Repair</button>
      <button class="btn sm" data-a="csv">CSV</button>
      <button class="btn sm" data-a="feed">Feed</button>
      <button class="btn sm" data-a="folder">${Icon.folder} Folder</button>
      <button class="btn sm danger" data-a="del">${Icon.trash} Delete</button>
    </div>`;
    box.querySelector('[data-a="repair"]').onclick = () => {
      let fixed = 0;
      Store.profiles.filter((p) => P.sel.has(p.id)).forEach((p) => {
        const q = DX.repair(p);
        Store.replaceProfile(q);
        if (q.consistency.errors.length === 0) fixed++;
      });
      Store.log('repair', `Batch repair on ${P.sel.size} profiles`);
      UI.toast(`Repaired ${P.sel.size} profiles · ${fixed} now error-free`, 'ok');
      profiles();
    };
    box.querySelector('[data-a="csv"]').onclick = () => {
      H.download('doppelx-selected.csv', EX.csv(Store.profiles.filter((p) => P.sel.has(p.id))), 'text/csv');
    };
    box.querySelector('[data-a="feed"]').onclick = () => {
      H.download('profiles-feed.json', EX.feed(Store.profiles.filter((p) => P.sel.has(p.id))), 'application/json');
    };
    box.querySelector('[data-a="folder"]').onclick = async () => {
      const name = await UI.prompt('New folder', 'Folder name', '', 'e.g. Facebook farm');
      if (!name) return;
      const f = Store.addFolder(name);
      Store.profiles.filter((p) => P.sel.has(p.id)).forEach((p) => Store.updateProfile(p.id, { group: f.id }));
      UI.toast(`Moved ${P.sel.size} to ${name}`, 'ok');
      profiles();
    };
    box.querySelector('[data-a="del"]').onclick = async () => {
      if (!(await UI.confirm('Delete profiles?', `${P.sel.size} profiles will be removed permanently.`, 'Delete', 'danger'))) return;
      Store.removeMany([...P.sel]);
      Store.log('delete', `Deleted ${P.sel.size} profiles`);
      P.sel.clear();
      UI.toast('Deleted', 'ok');
      profiles();
    };
  }

  function batchSheet() {
    const sh = UI.sheet(`
      <h3>Batch forge</h3>
      <p class="mut small">Generate a coherent fleet in one pass. Mixed mode randomises country, platform, browser and device per profile.</p>
      <div class="field mt"><label>How many</label><input class="input" id="bs-n" type="number" min="1" max="200" value="10"></div>
      <div class="field"><label>Strategy</label>
        <div class="seg" id="bs-s">
          <button data-s="mixed" class="on">Mixed</button>
          <button data-s="mobile">Mobile only</button>
          <button data-s="desktop">Desktop only</button>
        </div></div>
      <div class="field"><label>Country</label><select class="input" id="bs-cc"><option value="">Random</option>${GEO_NAMES.map((c) => `<option value="${c}">${H.flagOf(c)} ${H.esc(GEO_META[c].name)}</option>`).join('')}</select></div>
      <button class="btn primary block" data-do>${Icon.bolt} Generate</button>`);
    let strategy = 'mixed';
    sh.el.querySelectorAll('#bs-s button').forEach((b) => b.onclick = () => {
      sh.el.querySelectorAll('#bs-s button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on'); strategy = b.dataset.s;
    });
    sh.el.querySelector('[data-do]').onclick = () => {
      const n = Math.max(1, Math.min(200, +sh.el.querySelector('#bs-n').value || 10));
      const cc = sh.el.querySelector('#bs-cc').value;
      const base = {};
      if (cc) base.country = cc;
      if (strategy === 'mobile') base.platformWeights = { android: 78, ios: 22, windows: 0, macos: 0, linux: 0 };
      if (strategy === 'desktop') base.platformWeights = { android: 0, ios: 0, windows: 70, macos: 22, linux: 8 };
      const list = DX.generateBatch(n, base, Store.profiles);
      list.forEach((p) => Store.addProfile(p));
      Store.log('generate', `Batch forge ×${list.length} (${strategy}${cc ? ', ' + cc : ''})`);
      sh.close();
      UI.toast(`Forged ${list.length} profiles`, 'ok');
      App.go('profiles');
    };
  }

  const GEO_NAMES = Object.keys(GEO).filter((c) => GEO[c].length).sort();

  /* ---------------------------------------------------------------- VIEWER */
  const V = { id: null, tab: 'overview' };
  function viewer(id) {
    const p = Store.profiles.find((x) => x.id === id);
    if (!p) { App.go('profiles'); return; }
    V.id = id;
    const c = p.consistency || { score: 0, grade: '?', errors: [], warnings: [], checks: [] };
    const r = p.risk || { score: 0, grade: '?', factors: [] };
    main().innerHTML = `<div class="view">
      <button class="btn sm ghost" id="vw-back" style="margin-bottom:8px">← All profiles</button>
      <div class="card">
        <div class="row">
          ${UI.avatar(p)}
          <div class="grow">
            <div class="pname" style="font-size:16px">${H.esc(p.name)}</div>
            <div class="pmeta">${H.flagOf(p.geo.country)} ${H.esc(p.geo.city)} · ${H.esc(p.os.osName)} ${H.esc(p.os.osVersion)} · ${H.esc(p.browser.name)} ${p.browser.major}</div>
            <div class="row mt-s" style="gap:6px;flex-wrap:wrap">
              <span class="pill ${c.score >= 90 ? 'ok' : c.score >= 75 ? 'acc' : 'warn'}">Audit ${c.score}</span>
              <span class="pill ${r.score >= 80 ? 'ok' : r.score >= 65 ? 'acc' : 'warn'}">Risk ${r.grade}</span>
              <span class="pill">${p.network.mode === 'proxy' ? (p.network.proxy ? p.network.proxy.type : 'proxy') : 'direct'}</span>
            </div>
          </div>
          <div class="pside"><button class="iconbtn" id="vw-menu">⋯</button></div>
        </div>
      </div>
      <div class="tabs" id="vw-tabs">
        ${[['overview', 'Overview'], ['identity', 'Identity'], ['network', 'Network'], ['behavior', 'Behavior'], ['audit', `Audit ${c.errors.length ? '·' + c.errors.length : ''}`], ['export', 'Export']].map(([k, l]) => `<button class="tab ${V.tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}
      </div>
      <div id="vw-body"></div>
    </div>`;
    H.qs('#vw-back').onclick = () => App.go('profiles');
    H.qsa('#vw-tabs .tab').forEach((t) => t.onclick = () => { V.tab = t.dataset.t; viewer(id); });
    H.qs('#vw-menu').onclick = () => menuSheet(p);
    const body = H.qs('#vw-body');
    if (V.tab === 'overview') body.innerHTML = tabOverview(p, c, r);
    else if (V.tab === 'identity') body.innerHTML = tabIdentity(p);
    else if (V.tab === 'network') body.innerHTML = tabNetwork(p);
    else if (V.tab === 'behavior') body.innerHTML = tabBehavior(p);
    else if (V.tab === 'audit') body.innerHTML = tabAudit(p, c);
    else body.innerHTML = tabExport(p);
    wireTab(p);
  }

  function kv(k, v) { return `<div class="kv"><span class="k">${H.esc(k)}</span><span class="v">${H.esc(v == null ? '—' : String(v))}</span></div>`; }

  function tabOverview(p, c, r) {
    const tzNow = (() => { try { return new Date().toLocaleString('en-US', { timeZone: p.geo.tz, hour: '2-digit', minute: '2-digit', hour12: p.locale.hour12 }); } catch (e) { return '—'; } })();
    return `
      <div class="card">
        <div class="row" style="gap:14px">
          ${UI.ring(c.score, 'AUDIT')}
          ${UI.ring(r.score, 'TRUST')}
          <div class="grow small mut">The audit runs ${c.checks ? c.checks.length : 0} coherence checks. Trust is the weighted chance this identity blends in on a high-scrutiny platform.</div>
        </div>
      </div>
      <div class="card">
        <h3>Story</h3>
        <p class="sub" style="line-height:1.65">${H.esc(DX.story(p))}</p>
      </div>
      <div class="card">
        <h3>Persona</h3>
        <div class="row between mt-s">
          <div class="avatar-lg">${H.esc((p.persona.firstName || '?')[0] + (p.persona.lastName || '')[0])}</div>
          <div class="grow" style="margin-left:12px">
            <div class="pname">${H.esc(p.persona.firstName)} ${H.esc(p.persona.lastName)}</div>
            <div class="pmeta">Age ${p.persona.age} · born ${H.esc(p.persona.birthdate)} · ${H.esc(p.persona.tone)} tone</div>
          </div>
        </div>
        <div class="mt">${kv('Username', p.persona.username)}${kv('Password', p.persona.password)}${kv('Local clock', tzNow + ' · ' + p.geo.tzAbbr)}</div>
        <div class="row mt-s"><button class="btn sm ghost" data-copy="pw">${Icon.copy} Copy password</button><button class="btn sm ghost" data-copy="usr">Copy username</button></div>
      </div>
      <div class="card">
        <h3>Surface map <span class="mut small">— what pages will read</span></h3>
        <div class="small mut">${p.surface.filter((s) => s.spoofable === 'no').length} signals cannot be faked without root or a matching network path and are flagged below.</div>
        <div style="overflow-x:auto" class="mt"><table class="tbl"><tr><th>surface</th><th>value</th><th>via</th></tr>
          ${p.surface.map((s) => `<tr><td class="mono">${H.esc(s.key)}</td><td class="mono">${H.esc(s.value)}</td><td><span class="pill ${s.spoofable === 'yes' ? 'ok' : s.spoofable === 'no' ? 'bad' : s.spoofable === 'proxy' ? 'acc' : 'warn'}">${H.esc(s.spoofable)}</span></td></tr>`).join('')}
        </table></div>
      </div>
      <div class="card">
        <h3>Trust factors</h3>
        ${r.factors.map((f) => `<div class="bar-row"><div class="n">${H.esc(f.label)}</div><div class="bar-track"><div class="bar-fill ${f.w / 18 > 0.66 ? '' : f.w / 18 > 0.4 ? 'warn' : 'bad'}" style="width:${Math.min(100, (f.w / 18) * 100)}%"></div></div><div class="v">${Math.round(f.w)}</div></div>`).join('')}
        <div class="small mut mt-s">Highest-leverage fix first: ${H.esc([...r.factors].sort((a, b) => a.w - b.w)[0].label)} — ${H.esc([...r.factors].sort((a, b) => a.w - b.w)[0].why)}</div>
      </div>
      <div class="card">
        <h3>Warm-up plan <span class="mut small">· ${p.warmup.days} days</span></h3>
        <div class="small mut">${H.esc(p.warmup.note)}</div>
        ${p.warmup.plan.map((d) => `<div class="mt-s"><b class="small">Day ${d.day} · ${d.minutes} min</b>${d.actions.map((a) => `<div class="small mut">— ${H.esc(a.site)}: ${H.esc(a.task)}</div>`).join('')}</div>`).join('')}
      </div>`;
  }

  function tabIdentity(p) {
    const n = p.navigator, ch = p.clientHints, d = p.display, gpu = p.hardware.gpu;
    return `
      <div class="card"><h3>Operating system</h3>${kv('Platform', p.os.platform)}${kv('Name', p.os.osName)}${kv('Version', p.os.osVersion)}${p.os.device ? kv('Device', p.os.device.name) : kv('Model', p.os.archetype)}${p.os.device ? kv('Chipset', p.os.device.chip) : ''}${kv('Architecture', p.os.arch)}${kv('Cores', p.os.cores)}${kv('RAM', p.os.ramGB + ' GB')}</div>
      <div class="card"><h3>Browser</h3>${kv('Engine', p.browser.engine)}${kv('Name', p.browser.name)}${kv('Full version', p.browser.fullVersion)}${kv('Vendor', n.vendor || '—')}${kv('UA', n.userAgent)}${kv('platform', n.platform)}${kv('languages', (p.locale.languages || []).join(', '))}</div>
      ${ch ? `<div class="card"><h3>Client Hints <span class="mut small">(userAgentData)</span></h3>${kv('Platform', ch.platform)}${kv('Mobile', String(ch.mobile))}${kv('Model', ch.model || '—')}${kv('platformVersion', ch.platformVersion)}${kv('architecture / bitness', `${ch.architecture || '—'} / ${ch.bitness || '—'}`)}${kv('fullVersionList', ch.fullVersionList.map((b) => `${b.brand} ${b.version}`).join(' · '))}</div>` : `<div class="card"><h3>Client Hints</h3><div class="sub">Absent — correct for ${H.esc(p.browser.name)}.</div></div>`}
      <div class="card"><h3>Display</h3>${kv('screen', `${p.screen.width} × ${p.screen.height}`)}${kv('DPR', String(p.screen.dpr))}${kv('avail', `${d.availWidth} × ${d.availHeight}`)}${kv('viewport', `${d.innerWidth} × ${d.innerHeight}`)}${kv('colorDepth', String(d.colorDepth))}${kv('orientation', d.orientation)}${kv('color-scheme', d.prefersColorScheme)}</div>
      <div class="card"><h3>GPU</h3>${kv('Device', gpu.device)}${kv('vendor', gpu.vendor)}${kv('unmasked renderer', gpu.unmaskedRenderer)}${kv('WebGPU adapter', p.hardware.webgpuAdapter || 'absent')}</div>
      <div class="card"><h3>Fonts <span class="mut small">(${p.fingerprint.fonts.length})</span></h3><div class="small mono" style="line-height:1.7;color:var(--dim)">${p.fingerprint.fonts.map(H.esc).join(' · ')}</div></div>
      <div class="card"><h3>Plugins &amp; extensions</h3>${p.fingerprint.plugins.length ? p.fingerprint.plugins.map((x) => `<div class="kv"><span class="k">plugin</span><span class="v">${H.esc(x.name)}</span></div>`).join('') : '<div class="sub">Empty plugin array (correct for Firefox).</div>'}<div class="hr"></div>${p.extensions.length ? p.extensions.map((e) => `<div class="kv"><span class="k">extension</span><span class="v">${H.esc(e.name)} v${H.esc(e.version)}</span></div>`).join('') : '<div class="sub">No extensions — correct for this platform.</div>'}</div>
      <div class="card"><h3>Media &amp; voices</h3>${kv('Cameras', String(p.hardware.cameraCount))}${kv('Microphones', String(p.hardware.microphoneCount))}${kv('Speakers', String(p.hardware.speakerCount))}${kv('Speech voices', String((p.speech || []).length))}${kv('Storage quota', H.bytes((p.storage.quotaMB || 0) * 1e6))}</div>`;
  }

  function tabNetwork(p) {
    const pr = p.network.proxy;
    const rawProxyVal = pr && !pr.isDemo ? `${pr.protocol || 'socks5'}://${pr.host}:${pr.port}` : '';
    return `
      <div class="card"><h3>Geo</h3>${kv('Country', `${p.geo.countryName} (${p.geo.country})`)}${kv('City', p.geo.city)}${kv('Coordinates', `${p.geo.lat}, ${p.geo.lon}`)}${kv('Accuracy', p.geo.accuracy + ' m')}${kv('Timezone', `${p.geo.tz} · UTC${(p.geo.tzOffset / 60 >= 0 ? '+' : '') + p.geo.tzOffset / 60}`)}${kv('ISP', p.geo.isp)}${kv('ASN', 'AS' + p.geo.asn)}${p.geo.exitIp ? kv('Exit IP', p.geo.exitIp) : ''}</div>
      <div class="card"><h3>Exit ${pr && pr.isDemo ? '<span class="pill warn">demo placeholder</span>' : pr ? '<span class="pill ok">bound</span>' : ''}</h3>${pr ? `${kv('Mode', p.network.mode)}${kv('Protocol', pr.protocol)}${kv('Host', pr.host)}${kv('Port', String(pr.port))}${kv('Relay mode', pr.viaRelay ? `127.0.0.1:${pr.localRelayPort || 18080} (Fail-Closed)` : 'Direct endpoint')}${kv('Type', pr.type)}${kv('Exit country', pr.country)}${kv('Auth', pr.username || 'none')}${pr.exitIp ? kv('Verified IP', pr.exitIp + (pr.fraudScore != null ? ' · risk ' + pr.fraudScore + '/100' : '')) : ''}` : `<div class="sub">Direct connection. The real IP is exposed — attach a proxy for high-scrutiny work.</div>`}</div>
      <div class="card">
        <h3>Attach endpoint metadata <span class="mut small">no connection is made</span></h3>
        <div class="small mut">Paste <code>socks5://host:port</code>, <code>http://host:port</code>, or <code>host:port</code>. Do not include credentials. This offline app records model metadata only and does not start or test a proxy.</div>
        <div class="field mt-s"><label>Endpoint</label><input class="input mono" id="net-raw" value="${H.esc(rawProxyVal)}" placeholder="socks5://proxy.example:1080"></div>
        <div class="field"><label>Observed exit IP (optional, user supplied)</label><input class="input mono" id="net-exit" value="${H.esc((pr && pr.exitIp) || '')}" placeholder="e.g. 198.51.100.42"></div>
        <div class="row between mt-s"><span class="small mut">Credentials and relay setup are deliberately out of scope.</span><button class="btn sm primary" id="net-bind">${Icon.check} Save metadata</button></div>
      </div>
      <div class="card"><h3>Leak control</h3>${kv('WebRTC', p.network.webrtc)}${kv('localIp', p.network.localIp)}${kv('IPv6', p.network.ipv6 ? 'enabled' : 'disabled')}${kv('Latency / jitter', `${p.network.latencyMs} ms / ${p.network.jitterMs} ms`)}${kv('Fail rate', p.network.failRate + '%')}${kv('Connection', `${p.network.connection.type} · ${p.network.connection.effectiveType} · ${p.network.connection.downlink} Mbps · ${p.network.connection.rtt} ms`)}</div>
      <div class="note">Network fields are profile-model metadata only. This public app does not launch a relay, store endpoint credentials, or verify any network route.</div>`;
  }

  function tabBehavior(p) {
    const b = p.behavior, pr = p.privacy;
    return `
      <div class="card"><h3>Human input model</h3>${kv('Typing speed', b.typingWpm + ' WPM')}${kv('Click jitter', b.clickJitter + ' px')}${kv('Mouse curve', b.mouseCurve)}${kv('Scroll', b.scrollSpeed)}${kv('Dwell', `${b.dwellMin}–${b.dwellMax} min`)}${kv('Gaussian noise', b.gaussianNoise ? 'on' : 'off')}${kv('Session cap', b.sessionCapMin + ' min')}${kv('Warm-up', b.warmupDays + ' days')}</div>
      <div class="card"><h3>Privacy posture</h3>${kv('Mode', pr.mode)}${kv('Do Not Track', String(pr.doNotTrack))}${kv('GPC', String(pr.globalPrivacyControl))}${kv('Tracker blocking', pr.trackers)}${kv('Cookies', pr.cookies)}${kv('Ad-block extension', String(pr.blockAds))}</div>
      <div class="card"><h3>Fingerprint controls</h3>${kv('Canvas', p.fingerprint.canvas + ' · seed ' + p.fingerprint.canvasNoiseSeed)}${kv('Audio', p.fingerprint.audio)}${kv('ClientRects noise', String(p.fingerprint.clientRectsNoise))}${kv('Battery', p.fingerprint.spoofBattery ? `${Math.round(p.fingerprint.battery.level * 100)}% ${p.fingerprint.battery.charging ? 'charging' : 'discharging'}` : 'native')}${kv('WebGPU', p.fingerprint.webgpu)}${kv('Timezone spoof', String(p.fingerprint.spoofTimezone))}${kv('Locale spoof', String(p.fingerprint.spoofLocale))}${kv('Screen spoof', String(p.fingerprint.spoofScreen))}</div>`;
  }

  function tabAudit(p, c) {
    const groups = { error: c.errors, warn: c.warnings, pass: c.checks.filter((x) => x.ok) };
    return `
      <div class="card">
        <div class="row between"><h3>Audit result</h3><span class="pill ${c.errors.length ? 'bad' : c.warnings.length ? 'warn' : 'ok'}">${c.errors.length} errors · ${c.warnings.length} warnings · ${groups.pass.length} pass</span></div>
        <div class="row mt-s"><button class="btn sm" id="au-repair">${Icon.shield} Auto-repair</button><button class="btn sm ghost" id="au-revalidate">Re-run</button></div>
      </div>
      ${c.errors.length ? `<div class="card"><h3 style="color:var(--bad)">Errors — must fix</h3>${c.errors.map((e) => `<div class="check"><div class="ic error">!</div><div><div class="l">${H.esc(e.label)}</div><div class="d">${H.esc(e.detail)}</div></div></div>`).join('')}</div>` : ''}
      ${c.warnings.length ? `<div class="card"><h3 style="color:var(--warn)">Warnings — realism notes</h3>${c.warnings.map((e) => `<div class="check"><div class="ic warn">~</div><div><div class="l">${H.esc(e.label)}</div><div class="d">${H.esc(e.detail)}</div></div></div>`).join('')}</div>` : ''}
      <div class="card"><h3>Passed checks <span class="mut small">(${groups.pass.length})</span></h3>${groups.pass.map((e) => `<div class="check"><div class="ic pass">✓</div><div><div class="l">${H.esc(e.label)}</div></div></div>`).join('')}</div>`;
  }

  function tabExport(p) {
    return `<div class="card"><h3>Executable exports</h3><div class="small mut">Every file is generated on-device; nothing is uploaded.</div></div>
      <div class="plist">${EX.EXPORTS.map((e) => `
        <div class="pcard" data-exp="${e.id}">
          <div class="pav" style="background:linear-gradient(135deg,var(--panel3),var(--line2));color:var(--text);font-size:11px">${H.esc(e.icon)}</div>
          <div class="grow"><div class="pname">${H.esc(e.label)} <span class="mut" style="font-weight:400">${H.esc(e.ext)}</span></div><div class="pmeta">${H.esc(e.note)}</div></div>
          <div class="pside">${Icon.download}</div>
        </div>`).join('')}
      </div>
      <div class="card mt"><h3>Extension bundle</h3><div class="sub">Download a ready-to-load MV3 folder as one ZIP: manifest, worker, content script and runtime.</div>
      <button class="btn primary block mt" id="ex-zip">${Icon.download} Download extension .zip</button></div>`;
  }

  function wireTab(p) {
    const body = H.qs('#vw-body');
    if (!body) return;
    const cp = body.querySelector('[data-copy="pw"]');
    if (cp) cp.onclick = () => H.copy(p.persona.password).then(() => UI.toast('Password copied', 'ok'));
    const cu = body.querySelector('[data-copy="usr"]');
    if (cu) cu.onclick = () => H.copy(p.persona.username).then(() => UI.toast('Username copied', 'ok'));
    const ar = body.querySelector('#au-repair');
    if (ar) ar.onclick = () => {
      const q = DX.repair(p);
      Store.replaceProfile(q);
      Store.log('repair', `Repaired ${q.name} · ${q.consistency.score}/100`);
      UI.toast(`Repaired · ${q.consistency.errors.length} errors left`, q.consistency.errors.length ? 'err' : 'ok');
      viewer(p.id);
    };
    const rv = body.querySelector('#au-revalidate');
    if (rv) rv.onclick = () => {
      const q = Object.assign({}, p, { consistency: DX.validate(p) });
      Store.replaceProfile(q); UI.toast('Re-validated · ' + q.consistency.score + '/100', 'ok'); viewer(p.id);
    };
    H.qsa('[data-exp]', body).forEach((el) => el.addEventListener('click', () => {
      const meta = EX.EXPORTS.find((x) => x.id === el.dataset.exp);
      showExport(p, meta);
    }));
    const z = body.querySelector('#ex-zip');
    if (z) z.onclick = () => downloadExtensionZip(p);
    const nb = body.querySelector('#net-bind');
    if (nb) nb.onclick = () => {
      const raw = (body.querySelector('#net-raw').value || '').trim();
      const exitIp = (body.querySelector('#net-exit').value || '').trim();
      if (raw.includes('@')) { UI.toast('Credentials are not stored in this public release', 'err'); return; }
      let parsed = null;
      const mUrl = /^(socks5|socks4|http|https):\/\/([^:/\s]+):(\d+)$/i.exec(raw);
      const mHostPort = /^([^:\s]+):(\d+)$/.exec(raw);
      if (mUrl) parsed = { protocol: mUrl[1].toLowerCase(), host: mUrl[2], port: +mUrl[3] };
      else if (mHostPort) parsed = { protocol: 'socks5', host: mHostPort[1], port: +mHostPort[2] };
      if (!parsed || !parsed.host || !parsed.port) { UI.toast('Use scheme://host:port or host:port', 'err'); return; }
      const q = DX.U.clone(p);
      q.network.mode = 'proxy';
      q.network.webrtc = 'disabled';
      q.network.proxy = Object.assign({}, q.network.proxy || {}, parsed, {
        isDemo: false, viaRelay: false, localRelayPort: 0, username: '', password: '', country: q.geo.country, city: q.geo.city,
        exitIp: exitIp || (q.network.proxy && q.network.proxy.exitIp) || '',
        subnet24: exitIp ? DX.subnet24(exitIp) : '',
      });
      if (exitIp) q.geo.exitIp = exitIp;
      const fixed = DX.repair(q);
      Store.replaceProfile(fixed);
      Store.log('network', `Saved endpoint metadata ${parsed.protocol}://${parsed.host}:${parsed.port} → ${fixed.name}`);
      UI.toast('Endpoint metadata saved · Audit ' + fixed.consistency.score + '/100', 'ok');
      viewer(p.id);
    };
  }

  function showExport(p, meta) {
    const code = meta.build(p);
    const sh = UI.sheet(`
      <div class="row between"><h3>${H.esc(meta.label)}</h3><span class="pill">${H.esc(meta.ext)}</span></div>
      <p class="mut small">${H.esc(meta.note)}</p>
      <div class="code mt-s"><pre id="ex-code">${H.esc(code)}</pre></div>
      <div class="grid2 mt">
        <button class="btn" id="ex-copy">${Icon.copy} Copy</button>
        <button class="btn primary" id="ex-dl">${Icon.download} Download</button>
      </div>`);
    sh.el.querySelector('#ex-copy').onclick = () => H.copy(code).then(() => UI.toast('Copied', 'ok'));
    sh.el.querySelector('#ex-dl').onclick = () => H.download(safeName(p, meta), code, 'text/plain');
  }
  function safeName(p, meta) {
    const base = (p.persona.firstName + '-' + p.persona.lastName + '-' + p.geo.country).toLowerCase().replace(/[^a-z0-9-]/g, '');
    return 'doppelx-' + base + '-' + meta.id + meta.ext;
  }

  function downloadExtensionZip(p) {
    const files = {
      'manifest.json': EX.extensionManifest(p),
      'background.js': EX.extensionBackground(p),
      'config.js': EX.extensionConfig(p),
      'popup.html': EX.extensionPopupHtml(p),
      'popup.js': EX.extensionPopupJs(p),
      'spoof.js': (window.__SPOOF_SRC__ || (typeof DOC_SPOOF === 'string' ? DOC_SPOOF : '')),
      'README.txt': 'DOPPEL X v3.2.1 extension bundle (world: MAIN)\n\n1. chrome://extensions → Developer mode → Load unpacked / Load from .zip\n2. Pick this ZIP or unzipped folder (Quetta / Kiwi / Desktop Chromium)\n3. Open extension popup → tap "Check Exit IP" before visiting target sites.\n\nProfile: ' + p.name + ' (' + p.id + ')',
    };
    H.download('doppelx-extension-' + p.geo.country.toLowerCase() + '.zip', Zip.build(files), 'application/zip');
  }

  function menuSheet(p) {
    const sh = UI.sheet(`
      <h3>${H.esc(p.name)}</h3>
      <p class="mut small">${H.esc(p.id)} · updated ${H.ago(p.updatedAt)}</p>
      <div class="plist mt">
        <button class="btn block" data-m="edit">${Icon.edit} Edit anchors</button>
        <button class="btn block" data-m="dup">${Icon.copy} Duplicate with new identity</button>
        <button class="btn block" data-m="repair">${Icon.shield} Auto-repair</button>
        <button class="btn block" data-m="tpl">${Icon.file} Save as template</button>
        <button class="btn block" data-m="share">${Icon.share} Share / copy JSON</button>
        <button class="btn danger block" data-m="del">${Icon.trash} Delete profile</button>
      </div>`);
    sh.el.querySelector('[data-m="edit"]').onclick = () => { sh.close(); App.go('create', { edit: p.id }); };
    sh.el.querySelector('[data-m="dup"]').onclick = () => {
      const q = DX.generateClean({ country: p.geo.country, platform: p.os.platform, osVariant: p.os.archId, browser: p.browser.family, privacy: p.privacy.mode, network: p.network.mode });
      Store.addProfile(q); Store.log('duplicate', `Duplicated ${p.name} → ${q.name}`);
      sh.close(); UI.toast('Duplicated with fresh identifiers', 'ok'); App.go('viewer', { id: q.id });
    };
    sh.el.querySelector('[data-m="repair"]').onclick = () => {
      const q = DX.repair(p); Store.replaceProfile(q); sh.close(); UI.toast('Repaired · ' + q.consistency.score + '/100', 'ok'); viewer(p.id);
    };
    sh.el.querySelector('[data-m="tpl"]').onclick = () => {
      Store.addTemplate({ id: 't_' + Date.now().toString(36), name: `${p.geo.countryName} · ${p.os.platform}`, at: new Date().toISOString(), anchors: { country: p.geo.country, city: p.geo.city, platform: p.os.platform, osVariant: p.os.archId, browser: p.browser.family, privacy: p.privacy.mode, network: p.network.mode } });
      Store.log('template', `Saved template from ${p.name}`); sh.close(); UI.toast('Template saved', 'ok');
    };
    sh.el.querySelector('[data-m="share"]').onclick = () => {
      const json = EX.profileJson(p);
      if (navigator.share) { navigator.share({ title: p.name, text: json }).catch(() => {}); sh.close(); }
      else H.copy(json).then(() => { UI.toast('JSON copied', 'ok'); sh.close(); });
    };
    sh.el.querySelector('[data-m="del"]').onclick = async () => {
      if (!(await UI.confirm('Delete profile?', p.name + ' will be removed.', 'Delete', 'danger'))) return;
      Store.removeProfile(p.id); sh.close(); App.go('profiles');
    };
  }

  /* ---------------------------------------------------------------- CREATE */
  const C = { step: 1, edit: null, draft: null };
  function create(opts) {
    const editId = opts && opts.edit;
    const src = editId ? Store.profiles.find((x) => x.id === editId) : null;
    if (!C.draft || C.edit !== editId) {
      C.edit = editId || null;
      C.step = 1;
      C.draft = src ? {
        country: src.geo.country, city: src.geo.city, platform: src.os.platform, osVariant: src.os.archId,
        browser: src.browser.family, privacy: src.privacy.mode, network: src.network.mode, locale: src.locale.locale,
        name: src.name, group: src.group, seed: src.seed, deviceModel: src.os.device ? src.os.device.model : '',
      } : {
        country: '', city: '', platform: 'auto', osVariant: '', browser: '', privacy: Store.settings.defaultPrivacy,
        network: Store.settings.defaultNetwork, locale: '', name: '', group: '', seed: '', deviceModel: '',
      };
    }
    if (opts && opts.reset) { C.draft = null; C.edit = null; }
    renderCreate();
  }

  function renderCreate() {
    const d = C.draft;
    const countries = Object.keys(GEO).filter((c) => GEO[c].length).sort((a, b) => GEO_META[a].name.localeCompare(GEO_META[b].name));
    const cities = d.country ? GEO[d.country].map((g) => g[0]) : [];
    const devices = DEVICE_MODELS.android.map((x) => ({ v: x.model, l: `${x.name} · ${x.screen[0]}×${x.screen[1]} @${x.dpr}` }));
    main().innerHTML = `<div class="view">
      <div class="row between"><h2 style="font-size:19px;margin:4px 0 10px">${C.edit ? 'Edit anchors' : 'Custom build'}</h2><span class="pill">Step ${C.step}/3</span></div>
      <div class="seg"><button class="${C.step === 1 ? 'on' : ''}" data-s="1">Basics</button><button class="${C.step === 2 ? 'on' : ''}" data-s="2">Advanced</button><button class="${C.step === 3 ? 'on' : ''}" data-s="3">Preview</button></div>
      <div id="c-body" class="mt"></div>
      <div class="grid2 mt">
        <button class="btn ghost" id="c-prev" ${C.step === 1 ? 'disabled' : ''}>Back</button>
        ${C.step < 3 ? '<button class="btn primary" id="c-next">Next →</button>' : `<button class="btn primary" id="c-save">${Icon.check} ${C.edit ? 'Save changes' : 'Create profile'}</button>`}
      </div>
    </div>`;

    const body = H.qs('#c-body');
    if (C.step === 1) {
      body.innerHTML = `
        <div class="card">
          <div class="lbl" style="margin-top:0">Target platform</div>
          <div class="grid3">${[['auto', 'Auto', '⤨'], ['android', 'Android', '🤖'], ['ios', 'iPhone', '🍎'], ['windows', 'Windows', '🪟'], ['macos', 'macOS', '💻'], ['linux', 'Linux', '🐧']].map(([k, l, e]) => `<button class="btn ${d.platform === k ? '' : 'ghost'}" data-p="${k}" style="${d.platform === k ? 'border-color:var(--accent);box-shadow:0 0 0 2px rgba(79,140,255,.25)' : ''}"><span style="font-size:17px">${e}</span> ${l}</button>`).join('')}</div>
          <div class="field mt"><label>Country</label><select class="input" id="c-cc"><option value="">Random (weighted by traffic)</option>${countries.map((c) => `<option value="${c}" ${d.country === c ? 'selected' : ''}>${H.flagOf(c)} ${H.esc(GEO_META[c].name)}</option>`).join('')}</select></div>
          ${d.country ? `<div class="field"><label>City</label><select class="input" id="c-city"><option value="">Random in ${H.esc(GEO_META[d.country].name)}</option>${cities.map((c) => `<option ${d.city === c ? 'selected' : ''}>${H.esc(c)}</option>`).join('')}</select></div>` : ''}
          <div class="field"><label>Browser</label><select class="input" id="c-br"><option value="">Auto (realistic per platform)</option>${Object.keys(BROWSERS).map((k) => `<option value="${k}" ${d.browser === k ? 'selected' : ''}>${H.esc(BROWSERS[k].name)}</option>`).join('')}</select></div>
          <div class="field"><label>Network</label><div class="seg" id="c-net"><button data-n="proxy" class="${d.network === 'proxy' ? 'on' : ''}">Proxy exit</button><button data-n="direct" class="${d.network === 'direct' ? 'on' : ''}">Direct IP</button></div></div>
          <div class="field" style="margin-bottom:0"><label>Privacy</label><div class="seg" id="c-priv">${['standard', 'strict', 'off'].map((m) => `<button data-v="${m}" class="${d.privacy === m ? 'on' : ''}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div></div>
        </div>`;
      H.qsa('[data-p]').forEach((b) => b.onclick = () => { d.platform = b.dataset.p; d.osVariant = ''; d.deviceModel = ''; renderCreate(); });
      const cc = H.qs('#c-cc'); if (cc) cc.onchange = (e) => { d.country = e.target.value; d.city = ''; renderCreate(); };
      const city = H.qs('#c-city'); if (city) city.onchange = (e) => { d.city = e.target.value; };
      const br = H.qs('#c-br'); if (br) br.onchange = (e) => { d.browser = e.target.value; };
      H.qsa('#c-net button').forEach((b) => b.onclick = () => { d.network = b.dataset.n; renderCreate(); });
      H.qsa('#c-priv button').forEach((b) => b.onclick = () => { d.privacy = b.dataset.v; renderCreate(); });
    } else if (C.step === 2) {
      body.innerHTML = `
        <div class="card">
          ${d.platform === 'android' ? `<div class="field"><label>Device</label><select class="input" id="c-dev"><option value="">Random from catalog</option>${devices.map((x) => `<option value="${H.esc(x.v)}" ${d.deviceModel === x.v ? 'selected' : ''}>${H.esc(x.l)}</option>`).join('')}</select></div>` : ''}
          ${d.platform === 'ios' ? `<div class="field"><label>iPhone</label><select class="input" id="c-dev"><option value="">Random</option>${IOS_DEVICES.map((x) => `<option value="${x.model}" ${d.deviceModel === x.model ? 'selected' : ''}>${H.esc(x.name)} · ${x.ios.join(' / ')}</option>`).join('')}</select></div>` : ''}
          ${d.platform === 'windows' ? `<div class="field"><label>Windows build</label><div class="seg" id="c-os"><button data-v="win11" class="${d.osVariant === 'win11' ? 'on' : ''}">Windows 11</button><button data-v="win10" class="${d.osVariant === 'win10' ? 'on' : ''}">Windows 10</button></div></div>` : ''}
          ${d.platform === 'macos' ? `<div class="field"><label>Mac model</label><select class="input" id="c-os-s"><option value="">Random</option>${Object.keys(MAC_ARCH).map((k) => `<option value="${k}" ${d.osVariant === k ? 'selected' : ''}>${H.esc(MAC_ARCH[k].label)}</option>`).join('')}</select></div>` : ''}
          ${d.platform === 'linux' ? `<div class="field"><label>Distribution</label><div class="seg" id="c-os"><button data-v="ubuntu" class="${d.osVariant === 'ubuntu' ? 'on' : ''}">Ubuntu</button><button data-v="fedora" class="${d.osVariant === 'fedora' ? 'on' : ''}">Fedora</button></div></div>` : ''}
          ${d.country ? `<div class="field"><label>Locale</label><select class="input" id="c-loc"><option value="">Auto for ${H.esc(d.country)}</option>${(LOCALES[d.country] || []).map((l) => `<option value="${l}" ${d.locale === l ? 'selected' : ''}>${H.esc(LOCALE_META[l][0])}</option>`).join('')}</select></div>` : ''}
          <div class="field"><label>Name (optional)</label><input class="input" id="c-name" value="${H.esc(d.name)}" placeholder="Auto: first last · city"></div>
          <div class="field"><label>Folder</label><select class="input" id="c-group">${Store.folders.map((f) => `<option value="${f.id}" ${d.group === f.id ? 'selected' : ''}>${H.esc(f.name)}</option>`).join('')}</select></div>
          <div class="field" style="margin-bottom:0"><label>Seed (deterministic)</label><input class="input mono" id="c-seed" value="${H.esc(d.seed)}" placeholder="leave empty for fresh randomness"></div>
        </div>
        <div class="note">Same seed + same anchors = byte-identical profile. Useful for teams and CI snapshots.</div>`;
      const dev = H.qs('#c-dev'); if (dev) dev.onchange = (e) => { d.deviceModel = e.target.value; };
      const oss = H.qs('#c-os-s'); if (oss) oss.onchange = (e) => { d.osVariant = e.target.value; };
      H.qsa('#c-os button').forEach((b) => b.onclick = () => { d.osVariant = b.dataset.v; renderCreate(); });
      const lc = H.qs('#c-loc'); if (lc) lc.onchange = (e) => { d.locale = e.target.value; };
      const nm = H.qs('#c-name'); if (nm) nm.oninput = (e) => { d.name = e.target.value; };
      const gr = H.qs('#c-group'); if (gr) gr.onchange = (e) => { d.group = e.target.value; };
      const sd = H.qs('#c-seed'); if (sd) sd.oninput = (e) => { d.seed = e.target.value; };
    } else {
      const opts = buildOpts();
      const p = C.edit ? DX.repair(Object.assign({}, Store.profiles.find((x) => x.id === C.edit), anchorsOf(p0(C.edit), opts))) : DX.generateClean(opts);
      C.preview = p;
      body.innerHTML = `<div class="card">${pcardHtml(p)}</div>
        <div class="card"><h3>Preview</h3>${kv('Country', p.geo.city + ', ' + p.geo.countryName)}${kv('OS', p.os.osName + ' ' + p.os.osVersion + (p.os.device ? ' · ' + p.os.device.name : ''))}${kv('Browser', p.browser.name + ' ' + p.browser.fullVersion)}${kv('Locale', p.locale.locale + ' · ' + p.locale.languages.join(','))}${kv('Timezone', p.geo.tz)}${kv('Exit', p.network.proxy ? p.network.proxy.host : 'direct')}</div>
        <div class="card"><h3>Audit</h3><div class="row">${UI.ring(p.consistency.score, 'SCORE')}<div class="small mut" style="margin-left:12px">${p.consistency.checks.length} checks · ${p.consistency.errors.length} errors · ${p.consistency.warnings.length} warnings</div></div></div>
        ${p.consistency.errors.length ? `<div class="note bad">${p.consistency.errors.map((e) => H.esc(e.label)).join(' · ')}</div>` : ''}`;
    }
    const pv = H.qs('#c-prev'); if (pv) pv.onclick = () => { C.step = Math.max(1, C.step - 1); renderCreate(); };
    const nx = H.qs('#c-next'); if (nx) nx.onclick = () => { C.step = Math.min(3, C.step + 1); renderCreate(); };
    const sv = H.qs('#c-save');
    if (sv) sv.onclick = () => {
      const p = C.preview;
      if (C.edit) {
        p.id = C.edit; p.createdAt = (Store.profiles.find((x) => x.id === C.edit) || {}).createdAt || p.createdAt;
        Store.replaceProfile(p); Store.log('edit', `Saved anchors → ${p.name}`);
        UI.toast('Saved · ' + p.consistency.score + '/100', 'ok');
        App.go('viewer', { id: p.id });
      } else {
        Store.addProfile(p); Store.log('generate', `Custom build → ${p.name}`);
        UI.toast('Created · ' + p.consistency.score + '/100', 'ok');
        App.go('viewer', { id: p.id });
      }
      C.draft = null; C.edit = null;
    };
  }

  function p0(id) { return Store.profiles.find((x) => x.id === id); }
  function anchorsOf(src, opts) {
    // re-apply manual anchors onto a repaired copy
    return { geo: { country: opts.country || src.geo.country, city: opts.city || src.geo.city }, os: { platform: opts.platform || src.os.platform, archId: opts.osVariant || src.os.archId, device: opts.deviceModel ? { model: opts.deviceModel } : src.os.device }, browser: { family: opts.browser || src.browser.family }, network: { mode: opts.network }, privacy: { mode: opts.privacy }, locale: { locale: opts.locale || src.locale.locale }, name: opts.name || src.name };
  }
  function buildOpts() {
    const d = C.draft;
    const o = { network: d.network, privacy: d.privacy };
    if (d.country) o.country = d.country;
    if (d.city) o.city = d.city;
    if (d.platform !== 'auto') o.platform = d.platform;
    if (d.osVariant) o.osVariant = d.osVariant;
    if (d.browser) o.browser = d.browser;
    if (d.deviceModel) o.deviceModel = d.deviceModel;
    if (d.locale) o.locale = d.locale;
    if (d.name) o.name = d.name;
    if (d.group) o.group = d.group;
    if (d.seed) o.seed = d.seed;
    return o;
  }

  /* -------------------------------------------------------------- AUDIT ALL */
  function auditSheet() {
    const ps = Store.profiles;
    if (!ps.length) { UI.toast('Generate a profile first', 'err'); return; }
    let errs = 0, warns = 0, repaired = 0;
    const rows = ps.map((p) => {
      const fresh = Object.assign({}, p, { consistency: DX.validate(p) });
      errs += fresh.consistency.errors.length; warns += fresh.consistency.warnings.length;
      let state = fresh.consistency.errors.length ? 'error' : fresh.consistency.warnings.length ? 'warn' : 'pass';
      if (state === 'error' && Store.settings.autoRepair) {
        const q = DX.repair(fresh); Store.replaceProfile(q); repaired++;
        state = q.consistency.errors.length ? 'error' : q.consistency.warnings.length ? 'warn' : 'pass';
        return { p: q, state, score: q.consistency.score };
      }
      return { p: fresh, state, score: fresh.consistency.score };
    });
    Store.log('audit', `Smart audit: ${ps.length} profiles, ${errs} errors, ${warns} warnings, ${repaired} repaired`);
    const sh = UI.sheet(`
      <h3>Smart audit</h3>
      <p class="mut small">${ps.length} profiles · ${errs} errors · ${warns} warnings · ${repaired} auto-repaired</p>
      <div class="plist mt">${rows.map((r) => `<div class="pcard" style="padding:10px"><div class="grow"><div class="pname" style="font-size:13px">${H.esc(r.p.name)}</div><div class="pmeta">${H.esc(r.p.os.osName)} · ${H.esc(r.p.geo.city.split(',')[0])} · ${r.score}/100</div></div><span class="pill ${r.state === 'pass' ? 'ok' : r.state === 'warn' ? 'warn' : 'bad'}">${r.state}</span></div>`).join('')}</div>
      <button class="btn primary block mt" data-close>Done</button>`);
    App.go('profiles');
  }

  return { home, profiles, viewer, create, quick, pcardHtml, showExport, auditSheet, safeName, GEO_NAMES, downloadExtensionZip };
})();
