/* بدون كلام: الشارح يشرح الكلمة لفريقه بدون الكلمات الممنوعة قبل نهاية الوقت.
   عدد أدوار محدد لكل فريق، والفوز لأعلى نقاط (التعادل = جولة حاسمة للمتعادلين). */
(function () {
  'use strict';
  const PG = window.PG, { h } = PG.util;
  const DATA = (window.PG_DATA && window.PG_DATA.taboo) || [];
  const BANK = 'taboo';
  const RES = { ok: { t: 'صح', d: 1 }, skip: { t: 'تخطي', d: 0 }, foul: { t: 'ممنوع', d: -1 } };

  PG.games.register({
    id: 'taboo', ready: true,
    teams: { min: 2, recommended: 2 },
    settings: [
      { key: 'diff', label: 'الصعوبة', hint: 'سهل = 3 كلمات ممنوعة، صعب = 5', type: 'select', default: 'easy',
        options: [{ value: 'easy', label: 'سهل (3 ممنوعات)' }, { value: 'hard', label: 'صعب (5 ممنوعات)' }] },
      { key: 'rounds', label: 'عدد الأدوار لكل فريق', hint: 'بعدها يفوز صاحب أعلى نقاط، والتعادل يضيف جولة حاسمة', type: 'number', min: 1, max: 10, step: 1, default: 3 },
      { key: 'time', label: 'مدة الدور (ثانية)', hint: 'الوقت اللي يشرح فيه الشارح أكبر عدد من البطاقات', type: 'number', min: 20, max: 180, step: 10, default: 60 },
      { key: 'skipPenalty', label: 'التخطي ينقص نقطة', hint: 'عند الإيقاف يكون التخطي مجاني', type: 'toggle', default: false },
      { key: 'skipLimit', label: 'حد التخطي في الدور', hint: '0 = بلا حد', type: 'number', min: 0, max: 10, step: 1, default: 0 },
    ],
    newSession(ctx) {
      return { phase: 'ready', order: PG.teams.list().map((t) => t.id), ti: 0, round: 1, tie: null, scores: {}, picks: {},
        card: null, hist: [], timer: PG.Timer.create(ctx.setting('time')) };
    },
    onSetting(ctx, key, val) {
      const s = ctx.session; if (!s) return;
      if (key === 'time' && s.phase !== 'play') { s.timer.duration = val; s.timer.remaining = val; s.timer.running = false; }
    },

    mount(root, ctx) {
      const s = ctx.session, save = () => ctx.save(), rr = () => { save(); ctx.rerender(); };
      const add = (...n) => root.append(...n.filter(Boolean));
      const team = (id) => PG.teams.get(id);
      s.order = s.order.filter((id) => team(id));
      PG.teams.list().forEach((t) => { if (!s.order.includes(t.id)) s.order.push(t.id); });
      const queue = () => s.tie || s.order;
      if (s.ti >= queue().length) s.ti = 0;
      const cur = team(queue()[s.ti]);
      const nF = ctx.setting('diff') === 'hard' ? 5 : 3;
      const rounds = ctx.setting('rounds');
      const skipPen = ctx.setting('skipPenalty'), skipLim = ctx.setting('skipLimit');
      const pts = (r) => (r === 'skip' ? (skipPen ? -1 : 0) : RES[r].d);
      const turnPts = () => s.hist.reduce((a, x) => a + pts(x.r), 0);
      const skipsUsed = () => s.hist.filter((x) => x.r === 'skip').length;
      const explainer = (t) => {
        if (!t.players.length) return null;
        const i = (s.picks[t.id] || 0) % t.players.length;
        return t.players[i].name;
      };
      const draw = () => { s.card = PG.bank.next(BANK, DATA.length); };
      const sb = () => PG.teams.scoreboard(s.scores, { teams: s.order.map(team), active: cur && cur.id,
        onChange: (id, d) => { s.scores[id] = (s.scores[id] || 0) + d; rr(); } });
      const restart = async () => {
        if (s.phase !== 'over' && !(await PG.ui.confirm('سيتم تصفير النقاط والبدء من جديد. متابعة؟', { title: 'لعبة جديدة', ok: 'متابعة', danger: true }))) return;
        Object.assign(s, { phase: 'ready', ti: 0, round: 1, tie: null, scores: {}, picks: {}, card: null, hist: [] });
        s.timer.duration = s.timer.remaining = ctx.setting('time'); s.timer.running = false;
        PG.audio.play('whoosh'); rr();
      };
      const head = (title, sub) => h('div', { class: 'tb-head glass' },
        h('div', null, h('b', null, title), sub ? h('p', { class: 'muted small' }, sub) : null),
        h('div', { class: 'row wrap' }, PG.ui.btn(s.phase === 'over' ? 'لعبة جديدة' : 'من جديد', { icon: 'shuffle', cls: s.phase === 'over' ? 'primary' : 'ghost', onClick: restart })));
      const roundLabel = () => s.tie ? 'جولة حاسمة' : `الدور ${s.round} من ${rounds}`;

      /* ---------- انتهاء الدور وتحديد التالي ---------- */
      const endTurn = () => {
        s.timer.running = false; s.phase = 'end'; PG.audio.play('buzzer'); rr();
      };
      const nextTurn = () => {
        s.scores[cur.id] = (s.scores[cur.id] || 0) + turnPts();
        s.picks[cur.id] = (s.picks[cur.id] || 0) + 1;
        s.hist = []; s.card = null;
        s.ti++;
        if (s.ti >= queue().length) {
          s.ti = 0;
          if (!s.tie && s.round < rounds) s.round++;
          else {
            const ids = s.tie || s.order, top = Math.max(...ids.map((id) => s.scores[id] || 0));
            const best = ids.filter((id) => (s.scores[id] || 0) === top);
            if (best.length > 1) { s.tie = best; PG.ui.toast('تعادل! جولة حاسمة'); }
            else { s.tie = null; s.phase = 'over'; s.winner = best[0]; PG.audio.play('win'); rr(); return; }
          }
        }
        s.timer.duration = s.timer.remaining = ctx.setting('time'); s.timer.running = false;
        s.phase = 'ready'; PG.audio.play('whoosh'); rr();
      };

      /* ---------- 1) قبل الدور ---------- */
      if (s.phase === 'ready') {
        const ex = explainer(cur);
        add(head('بدون كلام', roundLabel()),
          h('div', { class: 'tb-ready glass', style: { '--tc': cur.color } },
            h('p', { class: 'muted' }, 'الدور على فريق'),
            h('h2', { class: 'tb-team' }, cur.name),
            ex ? h('p', null, 'الشارح: ', h('b', null, ex)) : h('p', { class: 'muted small' }, 'اختاروا شارحاً من الفريق'),
            h('p', { class: 'muted small' }, `عندك ${ctx.setting('time')} ثانية. اشرح بدون الكلمة وبدون ${nF} كلمات ممنوعة.`),
            PG.ui.btn('ابدأ الدور', { icon: 'play', cls: 'primary', onClick: () => {
              draw(); s.hist = []; s.phase = 'play'; s.timer.remaining = s.timer.duration = ctx.setting('time'); s.timer.running = false; save();
              ctx.rerender();
              setTimeout(() => root.querySelector('.tb-play .timer .btn')?.click(), 0);
            } })),
          sb());
        return;
      }

      /* ---------- 2) الشرح ---------- */
      if (s.phase === 'play') {
        if (s.timer.remaining <= 0 && !s.timer.running) { setTimeout(endTurn, 0); return; }
        const [word, forb] = DATA[s.card] || ['—', []];
        const tm = new PG.Timer(s.timer, { save, warnAt: 10, onEnd: () => endTurn() });
        ctx.onCleanup(() => tm.destroy());
        const mark = (r) => {
          if (r === 'skip' && skipLim && skipsUsed() >= skipLim) return PG.ui.toast('خلصت مرات التخطي في هذا الدور');
          s.hist.push({ c: s.card, r }); draw();
          PG.audio.play(r === 'ok' ? 'correct' : r === 'foul' ? 'buzzer' : 'flip');
          save(); ctx.rerender();
        };
        const tp = turnPts();
        add(h('div', { class: 'tb-play' },
          h('div', { class: 'tb-bar' },
            h('span', { class: 'tb-chip', style: { '--tc': cur.color } }, cur.name + (explainer(cur) ? ' — ' + explainer(cur) : '')),
            tm.el,
            h('span', { class: 'tb-pts' + (tp < 0 ? ' neg' : '') }, (tp > 0 ? '+' : '') + tp)),
          h('div', { class: 'tb-card glass' },
            h('div', { class: 'tb-word' }, word),
            h('div', { class: 'tb-sep' }, 'ممنوع'),
            h('ul', { class: 'tb-forb' }, forb.slice(0, nF).map((f) => h('li', null, f)))),
          h('div', { class: 'tb-acts' },
            h('button', { type: 'button', class: 'btn tb-foul', onclick: () => mark('foul') }, h('span', { html: PG.icon('x') }), 'ممنوع'),
            h('button', { type: 'button', class: 'btn tb-skip', onclick: () => mark('skip') }, 'تخطي' + (skipLim ? ` (${skipLim - skipsUsed()})` : '')),
            h('button', { type: 'button', class: 'btn tb-ok', onclick: () => mark('ok') }, h('span', { html: PG.icon('check') }), 'صح')),
          h('div', { class: 'tb-foot' }, `${roundLabel()} · صح ${s.hist.filter((x) => x.r === 'ok').length} · ممنوع ${s.hist.filter((x) => x.r === 'foul').length}`,
            h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { tm.pause(); if (await PG.ui.confirm('إنهاء الدور الآن؟', { ok: 'إنهاء' })) endTurn(); } }, 'إنهاء الدور'))));
        return;
      }

      /* ---------- 3) ملخص الدور ---------- */
      if (s.phase === 'end') {
        const order = ['ok', 'skip', 'foul'];
        add(head('خلص الوقت ⏰', `فريق «${cur.name}» — ${roundLabel()}`),
          h('div', { class: 'tb-sum glass', style: { '--tc': cur.color } },
            h('div', { class: 'tb-big' + (turnPts() < 0 ? ' neg' : '') }, (turnPts() > 0 ? '+' : '') + turnPts()),
            s.hist.length ? h('p', { class: 'muted small' }, 'اضغط على أي بطاقة لتعديل نتيجتها إذا فيه خطأ') : h('p', { class: 'muted' }, 'ما فيه بطاقات في هذا الدور'),
            h('div', { class: 'tb-list' }, s.hist.map((x) => h('button', { type: 'button', class: 'tb-it ' + x.r, onclick: () => {
              x.r = order[(order.indexOf(x.r) + 1) % 3]; PG.audio.play('click'); rr();
            } }, h('span', null, (DATA[x.c] || ['—'])[0]), h('small', null, RES[x.r].t)))),
            PG.ui.btn('اعتماد والدور التالي', { icon: 'check', cls: 'primary', onClick: nextTurn })),
          sb());
        return;
      }

      /* ---------- 4) النهاية ---------- */
      const w = team(s.winner);
      add(head('🏆 فاز فريق «' + (w ? w.name : '') + '»', 'أعلى نقاط بعد ' + rounds + ' أدوار'),
        h('div', { class: 'tb-ready glass', style: { '--tc': w ? w.color : '#888' } }, h('div', { class: 'tb-trophy', html: PG.icon('trophy') }), h('h2', { class: 'tb-team' }, w ? w.name : '')),
        PG.teams.scoreboard(s.scores, { teams: s.order.map(team) }));
    },
  });
})();
