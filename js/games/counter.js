/* عدّاد المجلس: لوحة نقاط + مؤقت + أدوار لأي لعبة خارج التطبيق. (مثال مرجعي لبناء الألعاب) */
(function () {
  'use strict';
  const PG = window.PG, { h } = PG.util;

  PG.games.register({
    id: 'counter', title: 'عدّاد المجلس', category: 'tools', icon: 'trophy', color: '#f59e0b', mode: 'فرق', ready: true,
    desc: 'لوحة نقاط ومؤقت وأدوار لأي لعبة تلعبونها خارج التطبيق.',
    teams: { min: 1 },
    settings: [
      { key: 'timer', label: 'مدة الدور (ثانية)', type: 'number', min: 5, max: 900, step: 5, default: 60 },
      { key: 'step', label: 'قيمة النقطة الواحدة', type: 'number', min: 1, max: 100, step: 1, default: 1 },
      { key: 'autoNext', label: 'الانتقال للفريق التالي عند انتهاء الوقت', type: 'toggle', default: true },
    ],
    newSession(ctx) {
      return { scores: {}, round: 1, turn: 0, order: PG.teams.list().map((t) => t.id), timer: PG.Timer.create(ctx.setting('timer')) };
    },
    reset(ctx) { const s = this.newSession(ctx); s.order = PG.util.shuffle(s.order); ctx.session = s; },
    onSetting(ctx, key, val) {
      const t = ctx.session && ctx.session.timer;
      if (key === 'timer' && t) { t.duration = val; if (!t.running) t.remaining = val; }
    },
    mount(root, ctx) {
      const s = ctx.session, ids = PG.teams.list().map((t) => t.id);
      s.order = s.order.filter((id) => ids.includes(id)).concat(ids.filter((id) => !s.order.includes(id)));
      if (s.turn >= s.order.length) s.turn = 0;
      const teams = s.order.map(PG.teams.get), cur = teams[s.turn];

      const timer = new PG.Timer(s.timer, { onEnd: () => { if (ctx.setting('autoNext')) next(); } });
      ctx.onCleanup(() => timer.destroy());

      function next() {
        s.turn++; if (s.turn >= s.order.length) { s.turn = 0; s.round++; }
        timer.reset(ctx.setting('timer')); ctx.save(); PG.audio.play('whoosh'); ctx.rerender();
      }
      const change = (id, d) => { s.scores[id] = (s.scores[id] || 0) + d; PG.audio.play(d > 0 ? 'correct' : 'wrong'); ctx.save(); ctx.rerender(); };

      root.append(
        h('div', { class: 'counter-top glass' },
          h('div', { class: 'turn-info' },
            h('span', { class: 'muted' }, 'الجولة ' + s.round),
            h('div', { class: 'turn-team', style: { '--tc': cur.color } }, 'الدور على: ', h('b', null, cur.name))),
          timer.el,
          PG.ui.btn('الدور التالي', { icon: 'arrowL', cls: 'primary', onClick: next })),
        PG.teams.scoreboard(s.scores, { teams, active: cur.id, step: ctx.setting('step'), onChange: change }));
    },
  });
})();
