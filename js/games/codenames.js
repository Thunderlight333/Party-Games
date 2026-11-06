/* العميل السري: شبكة 5×5، مفتاح ألوان للقادة، تلميح كلمة + رقم، الفريق يكشف بطاقاته ويتجنب القاتل. */
(function () {
  'use strict';
  const PG = window.PG, { h, shuffle, textOn } = PG.util;
  const WORDS = (window.PG_DATA && window.PG_DATA.codenames) || [];
  const BANK = 'codenames';
  const NEUTRAL = '#a8a29e', ASSASSIN = '#0b0b0f';

  /* يوزّع 25 كلمة: الفريق البادئ 9، الآخر 8، 7 محايدة، 1 قاتلة */
  function deal(ctx) {
    const idx = PG.bank.take(BANK, WORDS.length, 25);
    const first = Math.random() < 0.5 ? 0 : 1;
    const key = shuffle([].concat(Array(9).fill(first), Array(8).fill(1 - first), Array(7).fill('n'), ['a']));
    return { words: idx.map((i) => WORDS[i]), key, open: Array(25).fill(false), first, turn: first, clue: null, guesses: 0, winner: null, pick: -1, log: [] };
  }

  PG.games.register({
    id: 'codenames', ready: true,
    teams: { min: 2, recommended: 2 },
    settings: [
      { key: 'confirmTap', label: 'التأكيد بضغطتين', hint: 'الضغطة الأولى تحدّد البطاقة والثانية تكشفها، لتجنّب الكشف بالخطأ', type: 'toggle', default: true },
      { key: 'limit', label: 'تحديد عدد التخمينات', hint: 'رقم التلميح + 1، ثم ينتهي الدور تلقائياً', type: 'toggle', default: true },
      { key: 'useTimer', label: 'مؤقت الدور', hint: 'يظهر بجانب التلميح، ويشغّله المقدّم', type: 'toggle', default: false },
      { key: 'timer', label: 'مدة المؤقت (ثانية)', hint: 'تعمل فقط عند تفعيل مؤقت الدور', type: 'number', min: 15, max: 300, step: 15, default: 90 },
    ],
    newSession(ctx) { return Object.assign(deal(ctx), { wins: {}, timer: PG.Timer.create(ctx.setting('timer')) }); },
    onSetting(ctx, key, val) {
      const t = ctx.session && ctx.session.timer;
      if (key === 'timer' && t) { t.duration = val; if (!t.running) t.remaining = val; }
    },

    mount(root, ctx) {
      const s = ctx.session, T = PG.teams.list().slice(0, 2), save = () => ctx.save();
      const color = (k) => (k === 'n' ? NEUTRAL : k === 'a' ? ASSASSIN : T[k].color);
      const left = (t) => s.key.reduce((n, k, i) => n + (k === t && !s.open[i] ? 1 : 0), 0);
      const total = (t) => (t === s.first ? 9 : 8);
      const name = (t) => T[t].name;
      const log = (m) => { s.log.unshift(m); s.log.length = Math.min(s.log.length, 40); };

      const endTurn = (why) => {
        s.turn = 1 - s.turn; s.clue = null; s.guesses = 0; s.pick = -1;
        if (why) PG.ui.toast(why);
        save(); ctx.rerender();
      };
      const win = (t, why) => {
        s.winner = t; s.wins[T[t].id] = (s.wins[T[t].id] || 0) + 1; s.pick = -1;
        log(`🏆 فاز «${name(t)}» — ${why}`); PG.audio.play('win'); save(); ctx.rerender();
        PG.ui.modal({ title: '🏆 فاز «' + name(t) + '»', size: 'sm', body: h('p', { class: 'confirm-msg' }, why),
          actions: [{ label: 'لعبة جديدة', cls: 'primary', icon: 'shuffle', onClick: () => redeal() }, { label: 'إغلاق' }] });
      };
      const redeal = () => { Object.assign(s, deal(ctx)); save(); PG.audio.play('whoosh'); ctx.rerender(); };

      const reveal = (i) => {
        if (s.winner != null || s.open[i]) return;
        if (ctx.setting('confirmTap') && s.pick !== i) { s.pick = i; PG.audio.play('click'); save(); return ctx.rerender(); }
        s.open[i] = true; s.pick = -1; s.guesses++;
        const k = s.key[i], me = s.turn, w = s.words[i];
        if (k === 'a') { log(`☠️ «${name(me)}» كشف القاتل «${w}»`); PG.audio.play('buzzer'); return win(1 - me, `«${name(me)}» كشف البطاقة القاتلة «${w}».`); }
        if (k === 'n') log(`«${name(me)}» كشف «${w}» (محايدة)`);
        else log(`«${name(me)}» كشف «${w}» (${name(k)})`);
        if (k !== 'n' && left(k) === 0) return win(k, `كشف «${name(k)}» كل عملائه.`);
        if (k === me) {
          PG.audio.play('correct');
          if (ctx.setting('limit') && s.clue && s.guesses >= s.clue.n + 1) return endTurn('انتهت التخمينات المسموحة');
          save(); return ctx.rerender();
        }
        PG.audio.play('wrong');
        endTurn(k === 'n' ? 'بطاقة محايدة — انتهى الدور' : `بطاقة «${name(k)}» — انتهى الدور`);
      };

      /* ---------- المفتاح (للقادة فقط) ---------- */
      async function showKey() {
        if (!(await PG.ui.confirm('المفتاح للقادة فقط! تأكد أن باقي اللاعبين لا يرون الشاشة.', { title: 'مفتاح القادة', ok: 'عرض المفتاح' }))) return;
        PG.ui.modal({ title: 'مفتاح القادة', cls: 'cn-keymodal',
          body: h('div', null,
            h('div', { class: 'cn-key' }, s.key.map((k, i) => h('div', { class: 'cn-kc' + (s.open[i] ? ' done' : ''), style: { background: color(k), color: textOn(color(k)) } }, k === 'a' ? '☠️ ' + s.words[i] : s.words[i]))),
            h('p', { class: 'muted small cn-legend' }, `يبدأ «${name(s.first)}» (9 بطاقات) — «${name(1 - s.first)}» 8 — محايدة 7 — قاتلة 1`)),
          actions: [{ label: 'إخفاء', cls: 'primary', icon: 'eye' }] });
      }

      /* ---------- التلميح ---------- */
      const clueBox = () => {
        if (s.winner != null) return null;
        if (s.clue) return h('div', { class: 'cn-clue glass', style: { '--tc': T[s.turn].color } },
          h('span', { class: 'muted small' }, 'التلميح'), h('b', null, s.clue.w + ' ' + s.clue.n),
          ctx.setting('limit') ? h('span', { class: 'muted small' }, 'التخمينات: ' + s.guesses + ' / ' + (s.clue.n + 1)) : null);
        let n = 1;
        const inp = h('input', { class: 'input', placeholder: 'كلمة التلميح (اختياري)', maxlength: 24 });
        const num = h('b', { class: 'cn-num' }, '1');
        const step = (d) => { n = Math.max(0, Math.min(9, n + d)); num.textContent = n; };
        return h('div', { class: 'cn-clue-in glass' },
          h('span', { class: 'muted small' }, `قائد «${name(s.turn)}» يعطي التلميح:`),
          h('div', { class: 'row' }, inp,
            h('button', { type: 'button', class: 'btn icon sm', 'aria-label': 'إنقاص', html: PG.icon('minus'), onclick: () => step(-1) }), num,
            h('button', { type: 'button', class: 'btn icon sm', 'aria-label': 'زيادة', html: PG.icon('plus'), onclick: () => step(1) }),
            PG.ui.btn('إعلان', { icon: 'check', cls: 'primary', onClick: () => { s.clue = { w: inp.value.trim() || '—', n }; s.guesses = 0; log(`💬 «${name(s.turn)}»: ${s.clue.w} ${n}`); PG.audio.play('pop'); save(); ctx.rerender(); } })));
      };

      /* ---------- الواجهة ---------- */
      const over = s.winner != null;
      const grid = h('div', { class: 'cn-grid' + (over ? ' over' : '') }, s.words.map((w, i) => {
        const k = s.key[i], open = s.open[i], show = open || over;
        return h('button', { type: 'button', class: 'cn-card' + (open ? ' open' : '') + (over && !open ? ' ghost' : '') + (s.pick === i ? ' pick' : '') + (k === 'a' && show ? ' killer' : ''),
          style: show ? { '--cc': color(k), '--ct': textOn(color(k)) } : null, onclick: () => reveal(i) },
          h('span', null, k === 'a' && show ? '☠️ ' + w : w));
      }));

      let timerEl = null;
      if (ctx.setting('useTimer') && !over) { const tm = new PG.Timer(s.timer, { compact: true, save }); ctx.onCleanup(() => tm.destroy()); timerEl = tm.el; }

      root.append(...[
        h('div', { class: 'cn-top glass' },
          h('div', { class: 'row wrap' }, [0, 1].map((t) => h('span', { class: 'cn-chip' + (s.turn === t && !over ? ' on' : ''), style: { '--tc': T[t].color } },
            h('i'), name(t), h('b', null, left(t)), h('small', null, '/ ' + total(t))))),
          h('div', { class: 'row wrap' },
            PG.ui.btn('المفتاح', { icon: 'eye', cls: 'primary', onClick: showKey }),
            !over ? PG.ui.btn('إنهاء الدور', { icon: 'swap', cls: 'ghost', onClick: () => endTurn('انتقل الدور إلى «' + name(1 - s.turn) + '»') }) : null,
            PG.ui.btn('لعبة جديدة', { icon: 'shuffle', cls: 'ghost', onClick: async () => {
              if (over || await PG.ui.confirm('سيتم توزيع كلمات ومفتاح جديد وإلغاء اللعبة الحالية. متابعة؟', { title: 'لعبة جديدة', ok: 'توزيع جديد', danger: true })) redeal();
            } }))),
        over ? h('p', { class: 'cn-turn' }, '🏆 فاز «' + name(s.winner) + '»') :
          h('p', { class: 'cn-turn', style: { '--tc': T[s.turn].color } }, 'الدور على ', h('b', null, '«' + name(s.turn) + '»')),
        h('div', { class: 'cn-bar' }, clueBox(), timerEl),
        PG.teams.list().length > 2 ? h('p', { class: 'muted small cn-note' }, 'تُلعب بفريقين فقط: أول فريقين في القائمة.') : null,
        grid,
        ctx.setting('confirmTap') && !over ? h('p', { class: 'muted small cn-note' }, 'اضغط البطاقة مرة لتحديدها، ومرة ثانية لكشفها.') : null,
        h('h3', { class: 'cn-sub' }, 'الانتصارات'),
        PG.teams.scoreboard(s.wins, { teams: T, onChange: (id, d) => { s.wins[id] = Math.max(0, (s.wins[id] || 0) + d); save(); ctx.rerender(); } }),
        s.log.length ? h('details', { class: 'cn-log glass' }, h('summary', null, 'سجل اللعبة'), h('ol', null, s.log.map((m) => h('li', null, m)))) : null].filter(Boolean));
    },
  });
})();
