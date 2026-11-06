/* عجلة الحظ: أداة اختيار عشوائي. قوائم محفوظة (خارج الجلسة)، أوزان، ألوان، إخفاء مؤقت، سجل نتائج، احتفال. */
(function () {
  'use strict';
  const PG = window.PG, { h, shuffle, uid, textOn } = PG.util;
  const TAU = Math.PI * 2, POINTER = -Math.PI / 2; // المؤشر في الأعلى

  const THEMES = {
    vivid: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16', '#6366f1'],
    pastel: ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#67e8f9', '#93c5fd', '#c4b5fd', '#f9a8d4', '#5eead4', '#fda4af', '#bef264', '#a5b4fc'],
    night: ['#1e3a8a', '#7c3aed', '#be185d', '#0f766e', '#b45309', '#334155', '#4338ca', '#9d174d', '#065f46', '#92400e'],
    sunset: ['#7c2d12', '#c2410c', '#f97316', '#fbbf24', '#fde68a', '#f59e0b', '#ea580c', '#9a3412'],
    sea: ['#0c4a6e', '#0369a1', '#0ea5e9', '#7dd3fc', '#14b8a6', '#0f766e', '#22d3ee', '#155e75'],
  };
  const THEME_OPTS = [{ value: 'vivid', label: 'زاهي' }, { value: 'pastel', label: 'باستيل' }, { value: 'night', label: 'ليلي' }, { value: 'sunset', label: 'غروب' }, { value: 'sea', label: 'بحر' }];

  const item = (t, w = 1) => ({ id: uid('w'), t, c: null, w, off: false });
  const list = (name, arr) => ({ id: uid('l'), name, items: arr.map((t) => item(t)) });
  const data = () => {
    const g = PG.store.game('wheel');
    if (!g.data) g.data = { lists: [list('قائمتي', ['أحمد', 'سارة', 'خالد', 'نورة', 'فهد', 'ريم'])], cur: null, hist: [] };
    if (!g.data.lists.length) g.data.lists.push(list('قائمتي', []));
    if (!g.data.lists.some((l) => l.id === g.data.cur)) g.data.cur = g.data.lists[0].id;
    return g.data;
  };

  /* قصاصات احتفال */
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = h('canvas', { class: 'wh-confetti' }); document.body.append(cv);
    const dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const cols = THEMES.vivid, P = Array.from({ length: 160 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 120, y: H * 0.45, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
      r: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.4, s: 6 + Math.random() * 7, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    (function f(t) {
      const k = (t - t0) / 2600; x.clearRect(0, 0, W, H);
      P.forEach((p) => { p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        x.save(); x.globalAlpha = Math.max(0, 1 - k); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (k < 1) requestAnimationFrame(f); else cv.remove();
    })(t0);
  }

  PG.games.register({
    id: 'wheel', title: 'عجلة الحظ', category: 'tools', icon: 'spark', color: '#f59e0b', mode: 'أداة',
    desc: 'لفّ العجلة واختر عشوائياً: أسماء، عقوبات، مطاعم، أي شيء.', ready: true, teams: null,
    settings: [
      { key: 'dur', label: 'مدة الدوران (ثانية)', hint: 'كل ما زادت المدة زاد التشويق', type: 'number', min: 2, max: 20, step: 1, default: 6 },
      { key: 'autoHide', label: 'إخفاء الفائز تلقائياً', hint: 'يختفي من العجلة بعد ما يطلع (تقدر ترجعه من القائمة)', type: 'toggle', default: false },
      { key: 'confetti', label: 'احتفال عند الفوز', hint: 'قصاصات ملونة وصوت', type: 'toggle', default: true },
      { key: 'pct', label: 'إظهار النسبة على العجلة', hint: 'فرصة كل خانة بالنسبة المئوية', type: 'toggle', default: false },
      { key: 'theme', label: 'ألوان العجلة', hint: 'الخانات اللي لها لون خاص تبقى على لونها', type: 'select', default: 'vivid', options: THEME_OPTS },
    ],
    newSession() { return { rot: 0 }; },

    mount(root, ctx) {
      const s = ctx.session, D = data(), save = () => PG.store.save();
      const L = () => D.lists.find((l) => l.id === D.cur);
      const theme = THEMES[ctx.setting('theme')] || THEMES.vivid;
      const live = () => L().items.filter((i) => !i.off && i.t.trim());
      const colorOf = (it) => it.c || theme[L().items.indexOf(it) % theme.length];
      let spinning = false, raf = 0;
      ctx.onCleanup(() => cancelAnimationFrame(raf));

      /* ---------- الرسم ---------- */
      const cv = h('canvas', { class: 'wh-canvas', 'aria-label': 'العجلة، اضغط للدوران', role: 'button', tabindex: '0' });
      const pointer = h('div', { class: 'wh-pointer' });
      const g = cv.getContext('2d');
      let size = 0;
      const slices = () => {
        const its = live(), tot = its.reduce((a, i) => a + (+i.w || 1), 0);
        let a = 0;
        return its.map((it) => { const span = ((+it.w || 1) / tot) * TAU, sl = { it, a0: a, a1: a + span, pct: Math.round(((+it.w || 1) / tot) * 100) }; a += span; return sl; });
      };
      function draw() {
        const R = size / 2, sl = slices();
        g.setTransform(devicePixelRatio || 1, 0, 0, devicePixelRatio || 1, 0, 0);
        g.clearRect(0, 0, size, size);
        g.save(); g.translate(R, R);
        // الإطار
        g.beginPath(); g.arc(0, 0, R - 2, 0, TAU); g.fillStyle = '#0b0f1e'; g.fill();
        const r = R - 12;
        if (!sl.length) {
          g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = '#1f2540'; g.fill();
          g.fillStyle = '#9aa0c3'; g.font = `700 ${Math.round(R * 0.08)}px Tajawal, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('أضف خانات للعجلة', 0, 0); g.restore(); return;
        }
        g.rotate(s.rot);
        sl.forEach(({ it, a0, a1, pct }) => {
          const col = colorOf(it);
          g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, a0, a1); g.closePath(); g.fillStyle = col; g.fill();
          g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.stroke();
          // النص
          const mid = (a0 + a1) / 2, span = a1 - a0;
          const fs = Math.max(10, Math.min(R * 0.085, r * span * 0.42, 30));
          g.save(); g.rotate(mid);
          const world = (((mid + s.rot) % TAU) + TAU) % TAU, flip = world > Math.PI / 2 && world < Math.PI * 1.5;
          g.fillStyle = textOn(col); g.font = `800 ${fs}px Tajawal, system-ui, sans-serif`; g.textBaseline = 'middle';
          let label = it.t.trim() + (ctx.setting('pct') ? ` ${pct}%` : '');
          const maxW = r * 0.78;
          if (g.measureText(label).width > maxW) { while (label.length > 1 && g.measureText(label + '…').width > maxW) label = label.slice(0, -1); label += '…'; }
          if (flip) { g.rotate(Math.PI); g.textAlign = 'left'; g.fillText(label, -(r - fs * 0.6), 0); }
          else { g.textAlign = 'right'; g.fillText(label, r - fs * 0.6, 0); }
          g.restore();
        });
        // الأوتاد
        sl.forEach(({ a0 }) => { g.beginPath(); g.arc(Math.cos(a0) * (r + 4), Math.sin(a0) * (r + 4), Math.max(3, R * 0.018), 0, TAU); g.fillStyle = '#fde68a'; g.fill(); });
        g.restore();
        // المحور
        g.save(); g.translate(R, R);
        const hub = R * 0.13;
        const grd = g.createRadialGradient(-hub * 0.3, -hub * 0.3, hub * 0.1, 0, 0, hub);
        grd.addColorStop(0, '#fff7d6'); grd.addColorStop(1, '#f59e0b');
        g.beginPath(); g.arc(0, 0, hub, 0, TAU); g.fillStyle = grd; g.fill();
        g.lineWidth = 3; g.strokeStyle = '#0b0f1e'; g.stroke();
        g.restore();
      }
      const fit = () => {
        const box = cv.parentElement; if (!box) return;
        size = Math.max(220, Math.min(box.clientWidth, 620));
        const dpr = devicePixelRatio || 1;
        cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
        draw();
      };
      const ro = new ResizeObserver(fit); ctx.onCleanup(() => ro.disconnect());

      /* ---------- الدوران ---------- */
      const atPointer = (rot) => {
        const a = (((POINTER - rot) % TAU) + TAU) % TAU;
        return slices().find((x) => a >= x.a0 && a < x.a1);
      };
      function spin() {
        if (spinning) return;
        const sl = slices();
        if (sl.length < 2) return PG.ui.toast('أضف خانتين على الأقل');
        // اختيار الفائز حسب الوزن ثم زاوية داخل خانته
        const tot = sl.reduce((a, x) => a + (x.a1 - x.a0), 0); let r = Math.random() * tot, win = sl[0];
        for (const x of sl) { r -= x.a1 - x.a0; if (r <= 0) { win = x; break; } }
        const inside = win.a0 + (win.a1 - win.a0) * (0.15 + Math.random() * 0.7);
        const cur = ((s.rot % TAU) + TAU) % TAU;
        let target = POINTER - inside; target = ((target % TAU) + TAU) % TAU;
        const dur = ctx.setting('dur') * 1000, turns = Math.max(4, Math.round(dur / 1000 * 1.6));
        const from = s.rot, to = s.rot - cur + target + TAU * turns;
        spinning = true; root.classList.add('wh-spinning');
        let last = atPointer(from), t0 = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 4);
        (function frame(t) {
          const k = Math.min(1, (t - t0) / dur);
          s.rot = from + (to - from) * ease(k);
          const now = atPointer(s.rot);
          if (now && last && now.it !== last.it) { PG.audio.play('tick'); pointer.classList.remove('hit'); void pointer.offsetWidth; pointer.classList.add('hit'); }
          last = now; draw();
          if (k < 1) raf = requestAnimationFrame(frame);
          else { spinning = false; root.classList.remove('wh-spinning'); s.rot = to % TAU; ctx.save(); done(win.it); }
        })(t0);
        PG.audio.play('whoosh');
      }
      function done(it) {
        D.hist.unshift({ t: it.t, at: Date.now(), list: L().name }); D.hist.length = Math.min(D.hist.length, 30);
        if (ctx.setting('confetti')) { PG.audio.play('win'); confetti(); } else PG.audio.play('correct');
        const col = colorOf(it);
        if (ctx.setting('autoHide')) { it.off = true; }
        save();
        const m = PG.ui.modal({ title: 'الفائز', size: 'sm', cls: 'wh-win',
          body: h('div', { class: 'wh-winner', style: { '--wc': col, '--wt': textOn(col) } }, h('div', { class: 'wh-wname' }, it.t),
            ctx.setting('autoHide') ? h('p', { class: 'muted small' }, 'انخفى من العجلة تلقائياً') : null),
          actions: [
            ctx.setting('autoHide') ? null : { label: 'احذفه', icon: 'eye', onClick: () => { it.off = true; save(); } },
            { label: 'لفّ ثانية', icon: 'reset', cls: 'primary', onClick: () => { s.again = true; } },
            { label: 'إغلاق', cls: 'ghost' },
          ].filter(Boolean),
          onClose: () => ctx.rerender() });
      }
      cv.addEventListener('click', spin);
      cv.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spin(); } });
      const onKey = (e) => {
        if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName || '') || document.querySelector('.modal-backdrop')) return;
        e.preventDefault(); spin();
      };
      document.addEventListener('keydown', onKey); ctx.onCleanup(() => document.removeEventListener('keydown', onKey));

      /* ---------- المحرر ---------- */
      const rr = () => { save(); ctx.rerender(); };
      const redraw = () => { save(); draw(); counts.textContent = countTxt(); };
      const countTxt = () => `${live().length} ظاهرة من ${L().items.length}`;
      const counts = h('span', { class: 'muted small' }, countTxt());
      const addInp = h('input', { class: 'input', placeholder: 'أضف خانة واضغط Enter', maxlength: 40, onkeydown: (e) => { if (e.key === 'Enter') addOne(); } });
      const addOne = () => {
        const v = addInp.value.trim(); if (!v) return;
        L().items.push(item(v)); addInp.value = ''; rr();
        setTimeout(() => root.querySelector('.wh-add .input')?.focus(), 0);
      };
      const row = (it) => h('div', { class: 'wh-row' + (it.off ? ' off' : '') },
        h('label', { class: 'wh-sw', style: { background: colorOf(it) }, title: 'لون الخانة' },
          h('input', { type: 'color', value: colorOf(it), 'aria-label': 'لون الخانة', oninput: (e) => { it.c = e.target.value; e.target.parentElement.style.background = it.c; redraw(); } })),
        h('input', { class: 'input wh-name', value: it.t, maxlength: 40, 'aria-label': 'اسم الخانة', oninput: (e) => { it.t = e.target.value; redraw(); } }),
        h('select', { class: 'input wh-w', title: 'الوزن: كم مرة فرصتها', 'aria-label': 'الوزن', onchange: (e) => { it.w = +e.target.value; redraw(); } },
          [1, 2, 3, 4, 5].map((n) => h('option', { value: n, selected: (+it.w || 1) === n }, n === 1 ? 'عادي' : '×' + n))),
        h('button', { type: 'button', class: 'btn icon sm ghost', title: it.off ? 'إظهار' : 'إخفاء مؤقت', 'aria-label': it.off ? 'إظهار' : 'إخفاء', html: PG.icon('eye'), onclick: () => { it.off = !it.off; rr(); } }),
        h('button', { type: 'button', class: 'btn icon sm ghost', title: 'حذف', 'aria-label': 'حذف', html: PG.icon('trash'), onclick: () => { L().items = L().items.filter((x) => x !== it); rr(); } }));

      const bulk = () => {
        const ta = h('textarea', { class: 'input wh-bulk', rows: 10, placeholder: 'كل سطر خانة\nمثال:\nكبسة\nبرغر\nشاورما' });
        PG.ui.modal({ title: 'لصق قائمة', body: h('div', { class: 'wh-bulkbox' }, ta,
          h('p', { class: 'muted small' }, 'كل سطر يصير خانة. تقدر تكتب ×2 بعد الاسم عشان تكبر فرصته (مثال: كبسة ×2).')),
          actions: [
            { label: 'إضافة للقائمة', cls: 'primary', icon: 'plus', onClick: () => { parse(ta.value).forEach((x) => L().items.push(x)); rr(); } },
            { label: 'استبدال القائمة', cls: 'ghost', onClick: () => { L().items = parse(ta.value); rr(); } },
          ] });
        setTimeout(() => ta.focus(), 50);
      };
      const parse = (txt) => txt.split(/\n|،|,/).map((l) => l.trim()).filter(Boolean).map((l) => {
        const m = l.match(/^(.*?)\s*[x×]\s*([1-5])$/i); return m ? item(m[1].trim(), +m[2]) : item(l);
      });
      const preset = (kind) => {
        const teams = PG.teams.list();
        let arr = [];
        if (kind === 'players') arr = teams.flatMap((t) => t.players.map((p) => p.name));
        if (kind === 'teams') arr = teams.map((t) => t.name);
        if (kind === 'yesno') arr = ['نعم', 'لا'];
        if (kind === 'nums') { const n = PG.util.clamp(parseInt(numInp.value, 10) || 10, 2, 100); arr = Array.from({ length: n }, (_, i) => String(i + 1)); }
        if (!arr.length) return PG.ui.toast(kind === 'players' ? 'ما فيه لاعبين في الفرق' : 'ما فيه شيء');
        L().items = arr.map((t) => item(t));
        if (kind === 'teams') L().items.forEach((it, i) => { it.c = teams[i].color; });
        rr();
      };
      const numInp = h('input', { class: 'input wh-num', type: 'number', min: 2, max: 100, value: 10, 'aria-label': 'عدد الأرقام' });

      const listBar = h('div', { class: 'wh-lists' },
        h('select', { class: 'input', 'aria-label': 'القائمة', onchange: (e) => { D.cur = e.target.value; s.rot = 0; rr(); } },
          D.lists.map((l) => h('option', { value: l.id, selected: l.id === D.cur }, l.name))),
        h('button', { type: 'button', class: 'btn icon sm ghost', title: 'قائمة جديدة', 'aria-label': 'قائمة جديدة', html: PG.icon('plus'), onclick: () => {
          const n = D.lists.length + 1, l = { id: uid('l'), name: 'قائمة ' + n, items: [] }; D.lists.push(l); D.cur = l.id; rr();
          setTimeout(() => root.querySelector('.wh-lname')?.select(), 0);
        } }),
        h('button', { type: 'button', class: 'btn icon sm ghost', title: 'حذف القائمة', 'aria-label': 'حذف القائمة', html: PG.icon('trash'), onclick: async () => {
          if (!(await PG.ui.confirm(`حذف قائمة «${L().name}» بكل خاناتها؟`, { danger: true, ok: 'حذف' }))) return;
          D.lists = D.lists.filter((l) => l.id !== D.cur); data(); rr();
        } }));
      const nameInp = h('input', { class: 'input wh-lname', value: L().name, maxlength: 30, 'aria-label': 'اسم القائمة',
        onchange: (e) => { L().name = e.target.value.trim() || 'قائمة'; rr(); } });

      const items = L().items;
      const editor = h('div', { class: 'wh-ed glass' },
        h('div', { class: 'wh-edh' }, h('b', null, 'الخانات'), counts),
        listBar, nameInp,
        h('div', { class: 'row wh-add' }, addInp, PG.ui.btn('إضافة', { icon: 'plus', onClick: addOne })),
        h('div', { class: 'wh-rows' }, items.length ? items.map(row) : h('p', { class: 'empty' }, 'القائمة فاضية. أضف خانات أو استخدم الأزرار تحت.')),
        h('div', { class: 'wh-tools' },
          PG.ui.btn('لصق قائمة', { cls: 'ghost sm', onClick: bulk }),
          PG.ui.btn('خلط', { icon: 'shuffle', cls: 'ghost sm', onClick: () => { L().items = shuffle(L().items); rr(); } }),
          PG.ui.btn('ترتيب أبجدي', { cls: 'ghost sm', onClick: () => { L().items.sort((a, b) => a.t.localeCompare(b.t, 'ar')); rr(); } }),
          items.some((i) => i.off) ? PG.ui.btn('إظهار الكل', { icon: 'eye', cls: 'ghost sm', onClick: () => { L().items.forEach((i) => { i.off = false; }); rr(); } }) : null,
          items.some((i) => i.c) ? PG.ui.btn('ألوان الثيم', { cls: 'ghost sm', onClick: () => { L().items.forEach((i) => { i.c = null; }); rr(); } }) : null,
          items.length ? PG.ui.btn('مسح الكل', { icon: 'trash', cls: 'ghost sm', onClick: async () => { if (await PG.ui.confirm('مسح كل خانات هذي القائمة؟', { danger: true, ok: 'مسح' })) { L().items = []; rr(); } } }) : null),
        h('div', { class: 'wh-presets' }, h('span', { class: 'muted small' }, 'تعبئة سريعة:'),
          PG.ui.btn('لاعبي الفرق', { icon: 'users', cls: 'ghost sm', onClick: () => preset('players') }),
          PG.ui.btn('أسماء الفرق', { cls: 'ghost sm', onClick: () => preset('teams') }),
          PG.ui.btn('نعم / لا', { cls: 'ghost sm', onClick: () => preset('yesno') }),
          h('span', { class: 'wh-numrow' }, PG.ui.btn('أرقام من 1 إلى', { cls: 'ghost sm', onClick: () => preset('nums') }), numInp)));

      const hist = D.hist.length ? h('details', { class: 'wh-hist glass', open: true }, h('summary', null, 'آخر النتائج'),
        h('div', { class: 'wh-hl' }, D.hist.map((x, i) => h('span', { class: 'tag' + (i === 0 ? ' gold' : '') }, x.t))),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { D.hist = []; rr(); } }, 'مسح السجل')) : null;

      const stage = h('div', { class: 'wh-stage' },
        h('div', { class: 'wh-wheel' }, pointer, cv),
        PG.ui.btn('لفّ العجلة', { icon: 'play', cls: 'primary wh-spin', onClick: spin }),
        h('p', { class: 'muted small wh-tip' }, 'اضغط على العجلة أو زر المسافة'));
      root.append(...[h('div', { class: 'wh-layout' }, stage, h('div', { class: 'wh-side' }, editor, hist))].filter(Boolean));
      requestAnimationFrame(() => { ro.observe(cv.parentElement); fit(); if (s.again) { s.again = false; ctx.save(); setTimeout(spin, 200); } });
    },
  });
})();
