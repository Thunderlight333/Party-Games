/* المزايدة: سؤال تعداد، الفرق تتزايد على عدد الإجابات، والخصم إما يزيد أو يقول «عدّدها».
   صاحب آخر رهان يعدّد قبل نهاية الوقت: ينجح = النقاط له، يفشل = النقاط لمن تحدّاه. */
(function () {
  'use strict';
  const PG = window.PG, { h } = PG.util;
  const DATA = (window.PG_DATA && window.PG_DATA.bid) || [];
  const BANK = 'bid';

  PG.games.register({
    id: 'bid', title: 'المزايدة', category: 'teams', icon: 'trophy', color: '#14b8a6', mode: 'فرق',
    desc: 'سؤال تعداد: كم إجابة تقدر تقول؟ زايد على خصمك أو قل له «عدّدها».', ready: true,
    teams: { min: 2, recommended: 2 },
    settings: [
      { key: 'points', label: 'نقاط الجولة', hint: 'نقطة واحدة لكل جولة، أو نقاط بعدد الرهان (رهان 7 = 7 نقاط)', type: 'select', default: 'one',
        options: [{ value: 'one', label: 'نقطة واحدة' }, { value: 'bid', label: 'بعدد الرهان' }] },
      { key: 'rounds', label: 'عدد الجولات', hint: 'بعدها يفوز صاحب أعلى نقاط، والتعادل يضيف جولة حاسمة', type: 'number', min: 1, max: 30, step: 1, default: 6 },
      { key: 'timerMode', label: 'وقت التعداد', hint: 'لكل إجابة: الوقت يكبر مع الرهان. ثابت: نفس المدة دائماً', type: 'select', default: 'per',
        options: [{ value: 'per', label: 'ثواني لكل إجابة' }, { value: 'fixed', label: 'مدة ثابتة' }] },
      { key: 'perSec', label: 'ثواني لكل إجابة', hint: 'مثلاً 3 ثواني × رهان 8 = 24 ثانية', type: 'number', min: 1, max: 10, step: 1, default: 3 },
      { key: 'fixed', label: 'المدة الثابتة (ثانية)', hint: 'تعمل فقط عند اختيار «مدة ثابتة»', type: 'number', min: 10, max: 180, step: 5, default: 45 },
      { key: 'minRaise', label: 'أقل زيادة', hint: 'كم لازم يزيد الخصم على آخر رهان', type: 'number', min: 1, max: 5, step: 1, default: 1 },
      { key: 'hints', label: 'أمثلة إجابات للمقدّم', hint: 'تظهر أثناء التعداد عشان المقدّم يتأكد (مو كل الإجابات)', type: 'toggle', default: true },
    ],
    newSession(ctx) {
      const t = PG.teams.list();
      return { phase: 'bid', q: PG.bank.next(BANK, DATA.length), round: 1, starter: 0, turn: t[0] && t[0].id, bids: [], by: null, need: 0, got: 0,
        scores: {}, tie: false, winner: null, res: null, log: [], timer: PG.Timer.create(30) };
    },

    mount(root, ctx) {
      const s = ctx.session, save = () => ctx.save(), rr = () => { save(); ctx.rerender(); };
      const add = (...n) => root.append(...n.filter(Boolean));
      const teams = PG.teams.list(), team = (id) => PG.teams.get(id);
      if (!team(s.turn)) s.turn = teams[0].id;
      const item = DATA[s.q] || ['—', []];
      const rounds = ctx.setting('rounds'), minR = ctx.setting('minRaise');
      const last = s.bids[s.bids.length - 1];
      const top = last ? last.n : 0;
      const nextTeam = (id) => teams[(teams.findIndex((t) => t.id === id) + 1) % teams.length].id;
      const log = (m) => { s.log.unshift(m); s.log.length = Math.min(s.log.length, 60); };
      const sb = () => PG.teams.scoreboard(s.scores, { active: s.phase === 'count' ? s.by : s.turn,
        onChange: (id, d) => { s.scores[id] = (s.scores[id] || 0) + d; rr(); } });
      const roundLabel = () => (s.tie ? 'جولة حاسمة' : `الجولة ${s.round} من ${rounds}`);
      const restart = async () => {
        if (s.phase !== 'over' && !(await PG.ui.confirm('سيتم تصفير النقاط والبدء من جديد. متابعة؟', { title: 'لعبة جديدة', ok: 'متابعة', danger: true }))) return;
        Object.assign(s, { phase: 'bid', q: PG.bank.next(BANK, DATA.length), round: 1, starter: 0, turn: teams[0].id, bids: [], by: null, need: 0, got: 0, scores: {}, tie: false, winner: null, res: null, log: [] });
        PG.audio.play('whoosh'); rr();
      };
      const head = (title, sub) => h('div', { class: 'bd-head glass' },
        h('div', null, h('b', null, title), sub ? h('p', { class: 'muted small' }, sub) : null),
        h('div', { class: 'row wrap' }, PG.ui.btn(s.phase === 'over' ? 'لعبة جديدة' : 'من جديد', { icon: 'shuffle', cls: s.phase === 'over' ? 'primary' : 'ghost', onClick: restart })));
      const qCard = () => h('div', { class: 'bd-q glass' }, h('small', null, roundLabel()), h('h2', null, item[0]));

      /* ---------- 1) المزايدة ---------- */
      if (s.phase === 'bid') {
        const cur = team(s.turn);
        const min = top ? top + minR : 1;
        if (!s.pick || s.pick < min) s.pick = Math.max(min, top ? min : 3);
        const val = h('span', { class: 'bd-val' }, String(s.pick));
        const setPick = (n) => { s.pick = Math.max(min, Math.min(99, n)); val.textContent = String(s.pick); save(); };
        const challenge = () => {
          s.by = last.team; s.need = last.n; s.got = 0; s.challenger = s.turn; s.phase = 'count';
          const sec = ctx.setting('timerMode') === 'fixed' ? ctx.setting('fixed') : ctx.setting('perSec') * s.need;
          s.timer.duration = s.timer.remaining = sec; s.timer.running = false;
          log(`⚔️ «${cur.name}» قال لـ«${team(s.by).name}»: عدّدها! (${s.need})`);
          PG.audio.play('reveal'); save(); ctx.rerender();
          setTimeout(() => root.querySelector('.bd-count .timer .btn')?.click(), 0);
        };
        add(head('المزايدة', 'زايد على عدد الإجابات، أو تحدّى صاحب آخر رهان.'),
          qCard(),
          h('div', { class: 'bd-turn', style: { '--tc': cur.color } }, 'الدور على ', h('b', null, cur.name)),
          top ? h('div', { class: 'bd-top' }, 'آخر رهان: ', h('b', null, String(top)), ` من «${team(last.team).name}»`) : h('div', { class: 'bd-top muted' }, 'ابدأ الرهان: كم إجابة تقدر تعدّد؟'),
          h('div', { class: 'bd-pick glass' },
            h('div', { class: 'bd-step' },
              h('button', { type: 'button', class: 'btn icon', 'aria-label': 'إنقاص', html: PG.icon('minus'), onclick: () => setPick(s.pick - 1) }),
              val,
              h('button', { type: 'button', class: 'btn icon', 'aria-label': 'زيادة', html: PG.icon('plus'), onclick: () => setPick(s.pick + 1) })),
            h('div', { class: 'row wrap bd-quick' }, [1, 2, 5].map((d) => h('button', { type: 'button', class: 'btn sm ghost', dir: 'ltr', onclick: () => setPick(s.pick + d) }, '+' + d))),
            h('div', { class: 'row wrap bd-acts' },
              PG.ui.btn('أراهن', { icon: 'check', cls: 'primary', onClick: () => {
                s.bids.push({ team: s.turn, n: s.pick }); log(`💬 «${cur.name}» راهن بـ ${s.pick}`);
                s.turn = nextTeam(s.turn); s.pick = 0; PG.audio.play('pop'); rr();
              } }),
              top ? h('button', { type: 'button', class: 'btn bd-call', onclick: challenge }, 'عدّدها!') : null)),
          s.bids.length ? h('div', { class: 'bd-hist' }, s.bids.map((b) => h('span', { class: 'bd-chip', style: { '--tc': team(b.team)?.color } }, team(b.team)?.name + ': ' + b.n))) : null,
          h('div', { class: 'bd-go row wrap' }, PG.ui.btn('تغيير السؤال', { icon: 'shuffle', cls: 'ghost', onClick: async () => {
            if (s.bids.length && !(await PG.ui.confirm('بدأت المزايدة على هذا السؤال. تغيّره؟', { ok: 'تغيير' }))) return;
            s.q = PG.bank.next(BANK, DATA.length); s.bids = []; s.pick = 0; s.turn = teams[s.starter % teams.length].id; PG.audio.play('flip'); rr();
          } })),
          sb());
        return;
      }

      /* ---------- 2) التعداد ---------- */
      const finish = (ok) => {
        s.timer.running = false;
        const win = ok ? s.by : s.challenger;
        const p = ctx.setting('points') === 'bid' ? s.need : 1;
        s.scores[win] = (s.scores[win] || 0) + p;
        s.res = { ok, win, p };
        log(ok ? `✅ «${team(s.by).name}» عدّد ${s.need} (+${p})` : `❌ «${team(s.by).name}» وقف عند ${s.got} من ${s.need} — النقاط لـ«${team(win).name}» (+${p})`);
        s.phase = 'done'; PG.audio.play(ok ? 'win' : 'wrong'); rr();
      };
      if (s.phase === 'count') {
        const by = team(s.by);
        const tm = new PG.Timer(s.timer, { save, warnAt: 5, onEnd: () => finish(false) });
        ctx.onCleanup(() => tm.destroy());
        const ex = item[1];
        add(head('عدّدها!', `«${by.name}» لازم يعدّد ${s.need} إجابات قبل ما يخلص الوقت`),
          h('div', { class: 'bd-count' },
            qCard(),
            h('div', { class: 'bd-bar' }, h('span', { class: 'bd-chip big', style: { '--tc': by.color } }, by.name), tm.el),
            h('div', { class: 'bd-meter glass' },
              h('div', { class: 'bd-num' }, h('b', null, String(s.got)), h('span', null, ' / ' + s.need)),
              h('div', { class: 'bd-dots' }, Array.from({ length: s.need }, (_, i) => h('i', { class: i < s.got ? 'on' : '' }))),
              h('div', { class: 'row wrap bd-acts' },
                h('button', { type: 'button', class: 'btn icon', 'aria-label': 'تراجع', html: PG.icon('minus'), onclick: () => { if (s.got > 0) { s.got--; rr(); } } }),
                h('button', { type: 'button', class: 'btn bd-plus', onclick: () => {
                  s.got++; PG.audio.play('correct');
                  if (s.got >= s.need) return finish(true);
                  rr();
                } }, h('span', { html: PG.icon('plus') }), 'إجابة صحيحة')),
              h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { tm.pause(); if (await PG.ui.confirm('إعلان الفشل وإعطاء النقاط للخصم؟', { ok: 'فشل', danger: true })) finish(false); } }, 'فشل / استسلم')),
            ctx.setting('hints') && ex.length ? h('details', { class: 'bd-ex glass' }, h('summary', null, 'أمثلة للمقدّم'), h('div', { class: 'bd-exl' }, ex.map((x) => h('span', null, x)))) : null),
          sb());
        return;
      }

      /* ---------- 3) نتيجة الجولة ---------- */
      if (s.phase === 'done') {
        const r = s.res || {}, w = team(r.win);
        const next = () => {
          const ids = teams.map((t) => t.id);
          if (s.tie || s.round >= rounds) {
            const mx = Math.max(...ids.map((id) => s.scores[id] || 0)), best = ids.filter((id) => (s.scores[id] || 0) === mx);
            if (best.length === 1) { s.phase = 'over'; s.winner = best[0]; s.tie = false; PG.audio.play('win'); rr(); return; }
            s.tie = true; PG.ui.toast('تعادل! جولة حاسمة');
          } else s.round++;
          s.starter++; s.turn = teams[s.starter % teams.length].id;
          Object.assign(s, { phase: 'bid', q: PG.bank.next(BANK, DATA.length), bids: [], by: null, need: 0, got: 0, res: null, pick: 0 });
          PG.audio.play('whoosh'); rr();
        };
        add(head(r.ok ? '✅ عدّدها!' : '❌ ما قدر', roundLabel()),
          h('div', { class: 'bd-res glass', style: { '--tc': w ? w.color : '#888' } },
            h('p', { class: 'muted' }, item[0]),
            h('p', null, `«${team(s.by).name}» راهن بـ ${s.need} وعدّد ${s.got}`),
            h('h2', null, '+' + r.p + ' لـ«' + (w ? w.name : '') + '»'),
            PG.ui.btn(s.tie || s.round >= rounds ? 'النتيجة' : 'الجولة التالية', { icon: 'play', cls: 'primary', onClick: next })),
          sb(),
          s.log.length ? h('details', { class: 'bd-log glass' }, h('summary', null, 'سجل اللعبة'), h('ol', null, s.log.map((m) => h('li', null, m)))) : null);
        return;
      }

      /* ---------- 4) النهاية ---------- */
      const w = team(s.winner);
      add(head('🏆 فاز فريق «' + (w ? w.name : '') + '»', 'أعلى نقاط بعد ' + rounds + ' جولات'),
        h('div', { class: 'bd-res glass', style: { '--tc': w ? w.color : '#888' } }, h('div', { class: 'bd-trophy', html: PG.icon('trophy') }), h('h2', null, w ? w.name : '')),
        PG.teams.scoreboard(s.scores),
        s.log.length ? h('details', { class: 'bd-log glass' }, h('summary', null, 'سجل اللعبة'), h('ol', null, s.log.map((m) => h('li', null, m)))) : null);
    },
  });
})();
