/* تحدي المئة: بطاقات مقلوبة بالنقاط، أخطاء ❌، سرقة النقاط، مضاعفة الجولات. المقدّم يتحكم بكل شيء. */
(function () {
  'use strict';
  const PG = window.PG, { h, textOn } = PG.util;
  const DATA = (window.PG_DATA && window.PG_DATA.feud) || [];
  const BANK = 'feud';

  const mult = (ctx, round) => (!ctx.setting('multi') ? 1 : round >= 6 ? 3 : round >= 4 ? 2 : 1);
  const fresh = (ctx, extra = {}) => Object.assign({
    q: PG.bank.next(BANK, DATA.length), shown: [], strikes: 0, phase: 'play', pool: 0, winner: null,
  }, extra);

  PG.games.register({
    id: 'feud', ready: true,
    teams: { min: 2, recommended: 2 },
    settings: [
      { key: 'strikes', label: 'عدد الأخطاء المسموحة', hint: 'بعدها تنتقل فرصة السرقة للفريق الآخر', type: 'number', min: 1, max: 5, step: 1, default: 3 },
      { key: 'multi', label: 'مضاعفة النقاط في الجولات الأخيرة', hint: 'الجولة 4 ×2، والجولة 6 فأكثر ×3', type: 'toggle', default: true },
      { key: 'useTimer', label: 'مؤقت الإجابة', hint: 'يظهر تحت البطاقات، ويشغّله المقدّم', type: 'toggle', default: false },
      { key: 'timer', label: 'مدة المؤقت (ثانية)', hint: 'تعمل فقط عند تفعيل مؤقت الإجابة', type: 'number', min: 5, max: 120, step: 5, default: 20 },
    ],
    newSession(ctx) {
      const t = PG.teams.list();
      return fresh(ctx, { round: 1, scores: {}, turn: t[0] && t[0].id, timer: PG.Timer.create(ctx.setting('timer')) });
    },
    onSetting(ctx, key, val) {
      const t = ctx.session && ctx.session.timer;
      if (key === 'timer' && t) { t.duration = val; if (!t.running) t.remaining = val; }
    },

    mount(root, ctx) {
      const s = ctx.session, teams = PG.teams.list(), team = (id) => PG.teams.get(id);
      if (!team(s.turn)) s.turn = teams[0].id;
      const save = () => ctx.save();
      const item = DATA[s.q];
      if (!item) { root.append(h('div', { class: 'notice glass' }, h('p', null, 'لا توجد أسئلة.'))); return; }
      const [question, answers] = item, M = mult(ctx, s.round), maxS = ctx.setting('strikes');
      const others = teams.filter((t) => t.id !== s.turn);

      const award = (id, how) => {
        s.winner = id; s.phase = 'done';
        if (id) { s.scores[id] = (s.scores[id] || 0) + s.pool; PG.audio.play('win'); PG.ui.toast(`🏆 «${team(id).name}» ${how} ${s.pool} نقطة`); }
        else PG.audio.play('wrong');
        save(); ctx.rerender();
      };
      const reveal = (i) => {
        if (s.shown.includes(i)) return;
        s.shown.push(i);
        if (s.phase !== 'done') {
          s.pool += answers[i][1] * M; PG.audio.play('correct');
          if (s.phase === 'steal') { save(); return award(stealer(), 'سرق'); }
          if (s.shown.length === answers.length) { save(); return award(s.turn, 'كسب'); }
        } else PG.audio.play('flip');
        save(); ctx.rerender();
      };
      const stealer = () => (others.length === 1 ? others[0].id : s.stealBy || others[0].id);
      const strike = () => {
        if (s.phase !== 'play') return;
        s.strikes++; PG.audio.play('buzzer'); bigX(s.strikes);
        if (s.strikes >= maxS) { s.phase = 'steal'; s.stealBy = others[0].id; PG.ui.toast('فرصة السرقة!'); }
        save(); const to = setTimeout(() => ctx.rerender(), 650); ctx.onCleanup(() => clearTimeout(to));
      };
      const bigX = (n) => {
        const o = h('div', { class: 'fd-bigx' }, '❌'.repeat(Math.min(n, 5)));
        document.body.append(o); setTimeout(() => o.remove(), 1100);
      };
      const next = (sameRound) => {
        Object.assign(s, fresh(ctx), sameRound ? {} : { round: s.round + 1 });
        if (!sameRound) { const i = teams.findIndex((t) => t.id === s.turn); s.turn = teams[(i + 1) % teams.length].id; }
        save(); PG.audio.play('whoosh'); ctx.rerender();
      };

      /* ---------- البطاقات ---------- */
      const host = !!s.host;
      const board = h('div', { class: 'fd-board' + (answers.length > 5 ? ' cols2' : ''), style: { '--rows': Math.ceil(answers.length / 2) } }, answers.map((a, i) => {
        const open = s.shown.includes(i);
        return h('button', { type: 'button', class: 'fd-card' + (open ? ' open' : ''), onclick: () => reveal(i), 'aria-label': open ? a[0] : 'بطاقة ' + (i + 1) },
          h('div', { class: 'fd-in' },
            h('div', { class: 'fd-front' }, h('span', { class: 'fd-n' }, i + 1), host ? h('span', { class: 'fd-peek' }, a[0] + ' · ' + a[1]) : null),
            h('div', { class: 'fd-back' }, h('span', null, a[0]), h('b', null, a[1] * M))));
      }));

      const playing = team(s.turn);
      const strikesEl = h('div', { class: 'fd-strikes' }, Array.from({ length: maxS }, (_, k) => h('span', { class: k < s.strikes ? 'on' : '' }, '✕')));

      let controls;
      if (s.phase === 'play') {
        controls = h('div', { class: 'row wrap fd-ctrl' },
          PG.ui.btn('خطأ', { icon: 'x', cls: 'danger', onClick: strike }),
          PG.ui.btn('منح النقاط الآن', { icon: 'check', cls: 'ghost', onClick: () => award(s.turn, 'كسب') }));
      } else if (s.phase === 'steal') {
        controls = h('div', { class: 'fd-steal glass' },
          h('b', null, 'فرصة السرقة! إجابة واحدة فقط.'),
          others.length > 1 ? h('div', { class: 'fd-teams' }, others.map((t) => h('button', { type: 'button', class: 'btn fd-team' + (stealer() === t.id ? ' on' : ''),
            style: { background: t.color, color: textOn(t.color) }, onclick: () => { s.stealBy = t.id; save(); ctx.rerender(); } }, t.name))) : null,
          h('p', { class: 'muted small' }, `إذا أجاب «${team(stealer()).name}» صحّ: اقلب البطاقة الصحيحة أو اضغط «نجحت السرقة».`),
          h('div', { class: 'row wrap' },
            PG.ui.btn('نجحت السرقة', { icon: 'check', cls: 'primary', onClick: () => award(stealer(), 'سرق') }),
            PG.ui.btn('فشلت السرقة', { icon: 'x', cls: 'ghost', onClick: () => award(s.turn, 'كسب') })));
      } else {
        const w = s.winner && team(s.winner);
        controls = h('div', { class: 'fd-steal glass' },
          h('b', null, w ? `فاز «${w.name}» بـ ${s.pool} نقطة` : 'انتهت الجولة'),
          h('p', { class: 'muted small' }, 'يمكنك قلب باقي البطاقات لعرض الإجابات (بدون نقاط).'),
          h('div', { class: 'row wrap' },
            PG.ui.btn('كشف الكل', { icon: 'eye', cls: 'ghost', onClick: () => { answers.forEach((_, i) => { if (!s.shown.includes(i)) s.shown.push(i); }); PG.audio.play('reveal'); save(); ctx.rerender(); } }),
            PG.ui.btn('الجولة التالية', { icon: 'play', cls: 'primary', onClick: () => next(false) })));
      }

      let timerEl = null;
      if (ctx.setting('useTimer')) { const tm = new PG.Timer(s.timer, { compact: true, save }); ctx.onCleanup(() => tm.destroy()); timerEl = tm.el; }

      root.append(
        h('div', { class: 'fd-top glass' },
          h('div', { class: 'row wrap' },
            h('span', { class: 'muted' }, 'الجولة ' + s.round), M > 1 ? h('span', { class: 'fd-mult' }, '×' + M) : null,
            h('span', { class: 'fd-pool' }, 'نقاط الجولة: ', h('b', null, s.pool))),
          h('div', { class: 'row wrap' },
            PG.ui.btn(host ? 'وضع المقدّم: مفعّل' : 'وضع المقدّم', { icon: 'eye', cls: host ? 'primary' : 'ghost', title: 'إظهار الإجابات بشكل خافت للمقدّم', onClick: () => { s.host = !host; save(); PG.audio.play('click'); ctx.rerender(); } }),
            PG.ui.btn('تغيير السؤال', { icon: 'shuffle', cls: 'ghost', onClick: async () => {
              const msg = s.shown.length && s.phase !== 'done' ? 'سيتم إلغاء نقاط هذه الجولة والأخطاء وتغيير السؤال. متابعة؟' : 'تغيير السؤال الحالي بسؤال جديد؟';
              if (!(await PG.ui.confirm(msg, { title: 'تغيير السؤال', ok: 'تغيير', danger: true }))) return;
              next(true);
            } }))),
        h('div', { class: 'fd-turn' },
          h('span', { class: 'muted small' }, 'الدور على:'),
          h('div', { class: 'fd-teams' }, teams.map((t) => h('button', { type: 'button', class: 'btn fd-team' + (t.id === s.turn ? ' on' : ''),
            style: { background: t.color, color: textOn(t.color) }, disabled: s.phase !== 'play' && t.id !== s.turn ? true : null,
            onclick: () => { if (s.phase !== 'play') return; s.turn = t.id; save(); ctx.rerender(); } }, t.name))),
          strikesEl),
        h('div', { class: 'fd-q glass', style: { '--tc': playing.color } }, h('p', null, question)),
        board,
        h('div', { class: 'fd-tools' }, controls, timerEl),
        h('h3', { class: 'fd-sub' }, 'النقاط'),
        PG.teams.scoreboard(s.scores, { active: s.turn, step: 5, onChange: (id, d) => { s.scores[id] = Math.max(0, (s.scores[id] || 0) + d); save(); ctx.rerender(); } }));
    },
  });
})();
