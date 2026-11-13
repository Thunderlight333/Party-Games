/* التطبيق: التوجيه، الصفحة الرئيسية، غلاف اللعبة، الاستئناف والتأكيدات، الإعدادات */
(function () {
  'use strict';
  const PG = window.PG, { h } = PG.util, S = PG.store;
  let viewCleanups = [], gameCleanups = [];
  const run = (arr) => { arr.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); arr.length = 0; };

  function setView(node) {
    run(gameCleanups); run(viewCleanups);
    const v = document.getElementById('view');
    v.innerHTML = ''; node.classList.add('view'); v.append(node);
    window.scrollTo(0, 0);
  }

  /* ---------- الرئيسية ---------- */
  function soundBtn() {
    const b = PG.ui.btn('', { cls: 'icon ghost', title: 'الصوت' });
    const paint = () => (b.innerHTML = PG.icon(S.state.prefs.sound ? 'sound' : 'mute'));
    b.onclick = () => { S.state.prefs.sound = !S.state.prefs.sound; S.save(); paint(); PG.audio.play('pop'); };
    paint(); return b;
  }

  function card(g) {
    const live = S.state.active === g.id;
    return h('button', { type: 'button', class: `game-card glass${g.ready ? '' : ' soon'}${live ? ' is-active' : ''}`, style: { '--gc': g.color }, onclick: () => openGame(g.id) },
      h('div', { class: 'gc-icon', html: PG.icon(g.icon) }),
      h('div', { class: 'gc-body' }, h('h3', null, g.title), h('p', null, g.desc)),
      h('div', { class: 'gc-foot' },
        !g.ready ? h('span', { class: 'tag soon' }, 'قريباً') : live ? h('span', { class: 'tag live' }, h('i', { class: 'live-dot' }), 'قيد اللعب') : g.mode ? h('span', { class: 'tag' }, g.mode) : h('span'),
        g.ready ? h('span', { class: 'gc-go', html: PG.icon('chevL') }) : null));
  }

  const TAB_NAMES = { teams: 'فرق', deduction: 'استنتاج', extra: 'إضافية', tools: 'أدوات' };
  function home() {
    const st = S.state, active = st.active && PG.games.get(st.active);
    const cats = PG.games.CATEGORIES.filter((c) => PG.games.list.some((g) => g.category === c.id));
    let tab = st.prefs.tab && (st.prefs.tab === 'all' || cats.some((c) => c.id === st.prefs.tab)) ? st.prefs.tab : 'all';
    const node = h('section', { class: 'home' }), sentinel = h('div', { class: 'top-sentinel' });
    const bar = h('header', { class: 'topbar' },
      h('div', { class: 'brand-mark', html: PG.icon('logo') }),
      h('div', { class: 'hero-text' }, h('h1', null, 'مجلس الألعاب'), h('p', { class: 'muted' }, 'ألعاب جماعية للجمعات والمجالس — تعمل بدون إنترنت')),
      h('div', { class: 'hero-actions' },
        PG.ui.btn('', { icon: 'users', cls: 'icon ghost', title: 'الفرق', onClick: () => PG.teams.openManager() }),
        soundBtn(),
        PG.ui.btn('', { icon: 'sliders', cls: 'icon ghost', title: 'الإعدادات', onClick: globalSettings })));
    node.append(sentinel, bar);
    if (active) node.append(h('div', { class: 'resume glass', style: { '--gc': active.color } },
      h('div', { class: 'resume-icon', html: PG.icon(active.icon) }),
      h('div', { class: 'resume-text' }, h('small', null, 'لعبة قيد اللعب'), h('b', null, active.title)),
      h('div', { class: 'resume-actions' },
        PG.ui.btn('رجوع للعبة', { icon: 'play', cls: 'primary', onClick: () => go(active.id) }),
        PG.ui.btn('إنهاء', { icon: 'power', cls: 'ghost danger-text', onClick: () => endGame(active.id) }))));
    const list = h('div', { class: 'home-list' });
    let q = '';
    const norm = (s) => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[\u064B-\u0652ـ]/g, '');
    const ind = h('span', { class: 'tab-ind', 'aria-hidden': 'true' });
    const moveInd = () => {
      const b = tabs.querySelector('.tab.on');
      if (!b || q) { ind.style.opacity = '0'; return; }
      ind.style.opacity = '1'; ind.style.width = b.offsetWidth + 'px'; ind.style.transform = `translateX(${b.offsetLeft}px)`;
    };
    const paint = () => {
      list.innerHTML = '';
      tabs.classList.toggle('dim', !!q);
      tabs.querySelectorAll('.tab').forEach((b) => { const on = b.dataset.t === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      moveInd();
      if (q) {
        const k = norm(q), found = PG.games.list.filter((g) => [g.title, g.desc, g.mode].some((x) => norm(x).includes(k)));
        list.append(h('h2', { class: 'cat-title' }, `نتائج البحث (${found.length})`),
          found.length ? h('div', { class: 'game-grid' }, found.map(card)) : h('div', { class: 'empty-state' }, h('div', { html: PG.icon('search') }), h('p', null, 'لا توجد لعبة بهذا الاسم')));
      } else if (tab === 'all') cats.forEach((c) => list.append(h('h2', { class: 'cat-title' }, c.title), h('div', { class: 'game-grid' }, PG.games.list.filter((g) => g.category === c.id).map(card))));
      else list.append(h('div', { class: 'game-grid tab-grid' }, PG.games.list.filter((g) => g.category === tab).map(card)));
    };
    const tabBtn = (id, label, n) => h('button', { type: 'button', class: 'tab', role: 'tab', dataset: { t: id }, onclick: (e) => {
      tab = id; st.prefs.tab = id; S.save(); PG.audio.play('click');
      if (q) { q = ''; search.value = ''; sbox.classList.remove('has'); }
      paint(); e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    } }, label, n != null ? h('span', null, n) : null);
    const tabs = h('nav', { class: 'tabs', role: 'tablist', 'aria-label': 'الأقسام' }, ind, tabBtn('all', 'الكل'),
      cats.map((c) => tabBtn(c.id, TAB_NAMES[c.id] || c.title, PG.games.list.filter((g) => g.category === c.id).length)));
    const search = h('input', { class: 'input', type: 'search', placeholder: 'ابحث عن لعبة…', 'aria-label': 'بحث', oninput: () => { q = search.value.trim(); sbox.classList.toggle('has', !!search.value); paint(); } });
    const sbox = h('div', { class: 'search' }, h('span', { class: 's-ic', html: PG.icon('search') }), search,
      h('button', { type: 'button', class: 's-clear', 'aria-label': 'مسح', html: PG.icon('x'), onclick: () => { search.value = ''; q = ''; sbox.classList.remove('has'); paint(); search.focus(); } }));
    node.append(h('div', { class: 'toolbar' }, tabs, sbox), list, h('footer', { class: 'foot muted' }, 'كل شيء يُحفظ تلقائياً على هذا الجهاز · يعمل بدون إنترنت'));
    paint();
    setView(node);
    requestAnimationFrame(() => { moveInd(); requestAnimationFrame(() => tabs.classList.add('anim')); });
    const onR = () => moveInd(); addEventListener('resize', onR); viewCleanups.push(() => removeEventListener('resize', onR));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => bar.classList.toggle('stuck', !e.isIntersecting));
      io.observe(sentinel); viewCleanups.push(() => io.disconnect());
    }
  }

  /* ---------- دورة حياة اللعبة ---------- */
  async function openGame(id) {
    const g = PG.games.get(id); if (!g) return;
    if (!g.ready) return PG.ui.toast(`«${g.title}» قادمة قريباً`);
    const st = S.state;
    if (st.active && st.active !== id) {
      const a = PG.games.get(st.active);
      const ok = await PG.ui.confirm(`لديك لعبة «${a ? a.title : ''}» قيد اللعب. فتح «${g.title}» سينهيها وتضيع نتيجتها. هل تريد المتابعة؟`,
        { title: 'لعبة قيد اللعب', ok: 'إنهاء وفتح الجديدة', danger: true });
      if (!ok) return;
      finish(st.active);
    }
    st.active = id; S.save(); go(id);
  }
  function finish(id) { S.game(id).session = null; if (S.state.active === id) S.state.active = null; S.save(); }
  async function endGame(id) {
    const g = PG.games.get(id);
    const ok = await PG.ui.confirm(`هل تريد إنهاء «${g ? g.title : ''}»؟ ستُحذف النتيجة الحالية.`, { title: 'إنهاء اللعبة', ok: 'إنهاء', danger: true });
    if (!ok) return;
    finish(id); PG.audio.play('whoosh');
    location.hash === '#/' ? home() : (location.hash = '#/');
  }
  function go(id) { const t = '#/game/' + id; location.hash === t ? route() : (location.hash = t); }

  function makeCtx(id, root) {
    const ctx = {
      id, root, def: PG.games.get(id),
      get session() { return S.game(id).session; },
      set session(v) { S.game(id).session = v; },
      save: () => S.save(),
      setting: (k) => S.setting(id, k),
      onCleanup: (f) => gameCleanups.push(f),
      rerender: () => mountGame(ctx),
    };
    return ctx;
  }

  function mountGame(ctx) {
    run(gameCleanups);
    const g = ctx.def, root = ctx.root;
    root.innerHTML = '';
    if (g.teams && g.teams.min && PG.teams.list().length < g.teams.min) {
      root.append(h('div', { class: 'notice glass' }, h('p', null, `تحتاج هذه اللعبة ${g.teams.min} فرق على الأقل.`),
        PG.ui.btn('إعداد الفرق', { icon: 'users', cls: 'primary', onClick: () => PG.teams.openManager(g.teams) })));
      return;
    }
    if (!ctx.session) { ctx.session = g.newSession(ctx); S.save(); }
    try { g.mount(root, ctx); }
    catch (e) {
      console.error(e);
      root.innerHTML = '';
      root.append(h('div', { class: 'notice glass' }, h('p', null, 'حدث خطأ أثناء تحميل اللعبة.'),
        PG.ui.btn('بدء اللعبة من جديد', { icon: 'reset', cls: 'primary', onClick: () => { ctx.session = g.newSession(ctx); S.save(); mountGame(ctx); } })));
    }
  }

  function showGame(id) {
    const g = PG.games.get(id), root = h('div', { class: 'game-root' });
    let ctx;
    const bar = h('div', { class: 'game-bar glass', style: { '--gc': g.color } },
      PG.ui.btn('', { icon: 'arrowR', cls: 'icon ghost', title: 'الرئيسية (اللعبة تبقى محفوظة)', onClick: () => (location.hash = '#/') }),
      h('div', { class: 'gb-title' }, h('span', { class: 'gb-icon', html: PG.icon(g.icon) }), h('b', null, g.title)),
      h('div', { class: 'gb-actions' },
        g.teams ? PG.ui.btn('الفرق', { icon: 'users', cls: 'ghost', title: 'الفرق', onClick: () => PG.teams.openManager(g.teams) }) : null,
        PG.ui.btn('', { icon: 'sliders', cls: 'icon ghost', title: 'إعدادات اللعبة', onClick: () => gameSettings(ctx) }),
        PG.ui.btn('', { icon: 'expand', cls: 'icon ghost', title: 'ملء الشاشة', onClick: () => PG.ui.toggleFullscreen() }),
        h('span', { class: 'gb-sep' }),
        PG.ui.btn('إنهاء', { icon: 'power', cls: 'ghost danger-text', title: 'إنهاء اللعبة', onClick: () => endGame(id) })));
    setView(h('section', { class: 'game-view' }, bar, root));
    ctx = makeCtx(id, root);
    viewCleanups.push(PG.bus.on('teams', () => mountGame(ctx)));
    mountGame(ctx);
  }

  /* ---------- الإعدادات ---------- */
  function gameSettings(ctx) {
    const g = ctx.def, body = h('div', { class: 'settings' }), grp = h('div', { class: 'set-group' });
    let dirty = false, m;
    (g.settings || []).forEach((f) => grp.append(PG.ui.field(f, ctx.setting(f.key), (v) => {
      S.setSetting(ctx.id, f.key, v); g.onSetting && ctx.session && g.onSetting(ctx, f.key, v); S.save(); dirty = true;
    })));
    if (grp.children.length) body.append(h('div', { class: 'set-title' }, 'اللعبة'), grp);
    body.append(h('div', { class: 'set-title' }, 'عام'), h('div', { class: 'set-group' }, PG.ui.field({ label: 'المؤثرات الصوتية', type: 'toggle' }, S.state.prefs.sound, (v) => { S.state.prefs.sound = v; S.save(); })));
    body.append(h('div', { class: 'set-title' }, 'إعادة اللعب'), h('div', { class: 'set-group' }, PG.ui.actionRow('إعادة اللعب وتوزيع عشوائي', 'تصفير اللعبة الحالية وخلط كل العناصر عشوائياً.',
      PG.ui.btn('إعادة وخلط', { icon: 'shuffle', cls: 'danger sm', onClick: async () => {
        const ok = await PG.ui.confirm('سيتم تصفير النقاط والتقدم وإعادة توزيع كل شيء عشوائياً. لا يمكن التراجع. متابعة؟', { title: 'إعادة اللعب', ok: 'نعم، أعد التوزيع', danger: true });
        if (!ok) return;
        g.reset ? g.reset(ctx) : (ctx.session = g.newSession(ctx));
        S.save(); dirty = false; m.close(); PG.audio.play('whoosh'); mountGame(ctx); PG.ui.toast('تمت إعادة اللعبة وخلطها');
      } }), true)));
    m = PG.ui.modal({ title: 'إعدادات ' + g.title, body, actions: [{ label: 'تم', cls: 'primary', icon: 'check' }], onClose: () => { if (dirty) mountGame(ctx); } });
  }

  function globalSettings() {
    const p = S.state.prefs;
    const body = h('div', { class: 'settings' },
      h('div', { class: 'set-title' }, 'الصوت'),
      h('div', { class: 'set-group' },
        PG.ui.field({ label: 'المؤثرات الصوتية', type: 'toggle' }, p.sound, (v) => { p.sound = v; S.save(); home(); }),
        PG.ui.field({ label: 'مستوى الصوت', type: 'range', min: 0, max: 1, step: 0.05 }, p.volume, (v) => { p.volume = v; S.save(); }),
        PG.ui.actionRow('تجربة الصوت', null, PG.ui.btn('تشغيل', { icon: 'sound', cls: 'ghost sm', onClick: () => PG.audio.play('win') }))),
      h('div', { class: 'set-title' }, 'البيانات'),
      h('div', { class: 'set-group' }, PG.ui.actionRow('تصفير سجل الأسئلة', 'الأسئلة التي ظهرت سابقاً تعود للظهور من جديد. لا يمسّ الفرق ولا الإعدادات ولا بنك الأسئلة.',
        PG.ui.btn('تصفير', { icon: 'shuffle', cls: 'ghost sm', onClick: async () => {
          if (!(await PG.ui.confirm('تصفير سجل الأسئلة المستخدمة في كل الألعاب؟', { ok: 'تصفير' }))) return;
          S.state.banks = {}; S.save(); PG.ui.toast('تم تصفير سجل الأسئلة');
        } })),
        PG.ui.actionRow('إعادة ضبط الجهاز', 'حذف الفرق والإعدادات والألعاب المحفوظة وسجل الأسئلة من هذا الجهاز. بنك الأسئلة نفسه لا يُحذف.',
        PG.ui.btn('إعادة ضبط', { icon: 'trash', cls: 'danger sm', onClick: async () => {
          if (!(await PG.ui.confirm('سيتم حذف كل البيانات المحفوظة على هذا الجهاز نهائياً. متابعة؟', { ok: 'إعادة ضبط', danger: true }))) return;
          S.wipe(); m.close(); location.hash = '#/'; home(); PG.ui.toast('تمت إعادة الضبط');
        } }), true)));
    const m = PG.ui.modal({ title: 'الإعدادات العامة', body, actions: [{ label: 'تم', cls: 'primary', icon: 'check' }] });
  }

  /* ---------- التوجيه ---------- */
  function route() {
    const mm = location.hash.match(/^#\/game\/([\w-]+)/);
    if (mm) {
      const id = mm[1], g = PG.games.get(id);
      if (S.state.active === id && g && g.ready) return showGame(id);
      if (g && g.ready && !S.state.active) { S.state.active = id; S.save(); return showGame(id); }
      history.replaceState(null, '', '#/');
    }
    home();
  }

  PG.app = { openGame, endGame, route, home };
  S.load();
  addEventListener('hashchange', route);
  route();

  /* العمل بدون إنترنت (PWA): يعمل فقط عند فتح الموقع من رابط http/https */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e)));
  }
})();
