/* حروف: شبكة خلايا سداسية، لكل حرف سؤال، تلوين الخلية بلون الفريق. احتساب الفوز يدوي. */
(function () {
  'use strict';
  const PG = window.PG, { h, shuffle, textOn } = PG.util;
  const DATA = (window.PG_DATA && window.PG_DATA.huroof) || {};
  const LETTERS = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];
  const KEEP = '__keep';
  const show = (l) => (l === 'ه' ? 'هـ' : l);
  const qs = (l) => DATA[l] || [];
  const bankId = (l) => 'huroof:' + l;
  const layout = (ctx) => (String(ctx.setting('size')) === '28' ? { n: 28, cols: 7 } : { n: 25, cols: 5 });
  const deal = (ctx) => { const L = layout(ctx); return { cols: L.cols, cells: shuffle(LETTERS).slice(0, L.n).map((l) => ({ l, owner: null, q: -1 })) }; };

  PG.games.register({
    id: 'huroof', ready: true,
    teams: { min: 2, recommended: 2 },
    settings: [
      { key: 'timer', label: 'مدة الإجابة (ثانية)', type: 'number', min: 5, max: 300, step: 5, default: 30 },
      { key: 'autoTimer', label: 'تشغيل المؤقت تلقائياً عند فتح السؤال', type: 'toggle', default: true },
      { key: 'size', label: 'حجم الشبكة', type: 'select', default: '25', hint: 'يُطبَّق عند إعادة التوزيع',
        options: [{ value: '25', label: '25 حرفاً (5×5)' }, { value: '28', label: 'كل الحروف (28)' }] },
    ],
    newSession(ctx) { return Object.assign(deal(ctx), { open: null, round: 1, wins: {}, timer: PG.Timer.create(ctx.setting('timer')) }); },
    onSetting(ctx, key, val) {
      const t = ctx.session && ctx.session.timer;
      if (key === 'timer' && t) { t.duration = val; if (!t.running) t.remaining = val; }
    },

    mount(root, ctx) {
      const s = ctx.session, teams = PG.teams.list(), team = (id) => PG.teams.get(id);
      const rows = Math.ceil(s.cells.length / s.cols), two = teams.length === 2;
      const counts = {};
      s.cells.forEach((c) => { if (c.owner && team(c.owner)) counts[c.owner] = (counts[c.owner] || 0) + 1; });

      const save = () => ctx.save();
      const redeal = (nextRound) => {
        Object.assign(s, deal(ctx), { open: null });
        if (nextRound) s.round++;
        save(); PG.audio.play('whoosh'); ctx.rerender();
      };

      /* ---------- نافذة السؤال ---------- */
      function openCell(i, resumed) {
        const c = s.cells[i]; if (!c) return;
        const size = qs(c.l).length;
        if (size && (c.q < 0 || c.q >= size)) c.q = PG.bank.next(bankId(c.l), size);
        s.open = i;
        let revealed = false;
        const timer = new PG.Timer(s.timer, { compact: true, save });
        if (!resumed) { timer.reset(ctx.setting('timer')); if (ctx.setting('autoTimer')) timer.start(); }
        save(); PG.audio.play('flip');

        const m = PG.ui.modal({ title: 'حرف «' + show(c.l) + '»', cls: 'hx-modal', body: h('div'),
          onClose: (v) => { timer.destroy(); if (v !== KEEP) { s.open = null; save(); } } });
        ctx.onCleanup(() => m.close(KEEP));

        const change = () => {
          if (size < 2) return PG.ui.toast('لا يوجد سؤال آخر لهذا الحرف');
          c.q = PG.bank.next(bankId(c.l), size, { avoid: [c.q] }); revealed = false;
          timer.reset(ctx.setting('timer')); if (ctx.setting('autoTimer')) timer.start();
          save(); PG.audio.play('flip'); draw();
        };
        const assign = (id) => { c.owner = id; save(); PG.audio.play('correct'); m.close(); ctx.rerender(); };
        const clear = () => { c.owner = null; save(); PG.audio.play('pop'); draw(); };

        function draw() {
          const q = qs(c.l)[c.q], ow = c.owner && team(c.owner);
          m.setBody(h('div', { class: 'hx-q' },
            h('div', { class: 'hx-big', style: ow ? { '--fill': ow.color, '--fg': textOn(ow.color) } : null }, show(c.l)),
            h('p', { class: 'hx-qtext' }, q ? q[0] : 'لا توجد أسئلة لهذا الحرف بعد.'),
            q ? h('div', { class: 'hx-ans' }, revealed
              ? h('div', null, h('small', { class: 'muted' }, 'الإجابة'), h('b', null, q[1]))
              : PG.ui.btn('إظهار الإجابة', { icon: 'eye', cls: 'ghost', onClick: () => { revealed = true; PG.audio.play('reveal'); draw(); } })) : null,
            h('p', { class: 'muted small' }, 'الإجابة تبدأ بحرف «' + show(c.l) + '» (دون «ال» التعريف).'),
            h('div', { class: 'row wrap hx-tools' }, timer.el,
              PG.ui.btn('تغيير السؤال', { icon: 'shuffle', onClick: change }),
              ow ? PG.ui.btn('مسح اللون', { icon: 'trash', cls: 'ghost', onClick: clear }) : null),
            h('div', { class: 'hx-pick' }, h('div', { class: 'muted small' }, 'لوّن الخلية بلون الفريق الذي أجاب:'),
              h('div', { class: 'hx-teams' }, teams.map((t) => h('button', { type: 'button', class: 'btn hx-team' + (c.owner === t.id ? ' on' : ''),
                style: { background: t.color, color: textOn(t.color) }, onclick: () => assign(t.id) }, t.name))))));
        }
        draw();
      }

      /* ---------- إعلان فائز الجولة (يدوي) ---------- */
      function declare() {
        const m = PG.ui.modal({ title: 'فائز الجولة ' + s.round, size: 'sm',
          body: h('div', { class: 'hx-teams col' }, teams.map((t) => h('button', { type: 'button', class: 'btn hx-team',
            style: { background: t.color, color: textOn(t.color) },
            onclick: async () => {
              m.close(); s.wins[t.id] = (s.wins[t.id] || 0) + 1; save(); PG.audio.play('win');
              PG.ui.toast('🏆 فاز «' + t.name + '» بالجولة ' + s.round);
              if (await PG.ui.confirm('بدء جولة جديدة بتوزيع جديد للحروف والأسئلة؟', { ok: 'جولة جديدة' })) redeal(true); else ctx.rerender();
            } }, t.name))) });
      }

      /* ---------- الواجهة ---------- */
      const board = h('div', { class: 'hx-board glass' + (two ? ' two' : ''),
        style: Object.assign({ '--cols': s.cols, '--vf': (1 + 0.75 * (rows - 1)) * 1.1547 }, two ? { '--t1': teams[0].color, '--t2': teams[1].color } : {}) });
      for (let r = 0; r < rows; r++) {
        const row = h('div', { class: 'hx-row' + (r % 2 ? ' odd' : '') });
        s.cells.slice(r * s.cols, (r + 1) * s.cols).forEach((c, k) => {
          const i = r * s.cols + k, ow = c.owner && team(c.owner);
          row.append(h('button', { type: 'button', class: 'hx' + (ow ? ' owned' : ''), 'aria-label': 'حرف ' + show(c.l) + (ow ? ' — ' + ow.name : ''),
            style: ow ? { '--fill': ow.color, '--fg': textOn(ow.color) } : null, onclick: () => openCell(i) }, h('span', null, show(c.l))));
        });
        board.append(row);
      }

      root.append(
        h('div', { class: 'hx-top glass' },
          h('div', { class: 'hx-counts' }, h('span', { class: 'muted' }, 'الجولة ' + s.round),
            teams.map((t) => h('span', { class: 'hx-chip', style: { '--tc': t.color } }, h('i'), t.name + ': ' + (counts[t.id] || 0)))),
          h('div', { class: 'row wrap' },
            PG.ui.btn('إعلان الفائز', { icon: 'trophy', cls: 'primary', onClick: declare }),
            PG.ui.btn('إعادة التوزيع', { icon: 'shuffle', cls: 'ghost', onClick: async () => {
              if (await PG.ui.confirm('سيتم خلط أماكن الحروف والأسئلة ومسح جميع الألوان في هذه الجولة. متابعة؟', { danger: true, ok: 'إعادة التوزيع' })) redeal(false);
            } }))),
        two ? h('p', { class: 'muted small hx-guide' }, `«${teams[0].name}» يصل بين الأعلى والأسفل، و«${teams[1].name}» بين اليمين واليسار.`) : null,
        h('div', { class: 'hx-wrap' }, board),
        h('h3', { class: 'hx-sub' }, 'الجولات الفائزة'),
        PG.teams.scoreboard(s.wins, { onChange: (id, d) => { s.wins[id] = Math.max(0, (s.wins[id] || 0) + d); save(); ctx.rerender(); } }));

      if (s.open != null && s.cells[s.open]) openCell(s.open, true);
    },
  });
})();
