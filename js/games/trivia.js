/* كيو إي (QA): فريقان، كل فريق يختار تصنيفات، لوحة 200/400/600 (كل قيمة مرتين)، فرصة ثانية للخصم، ووسائل مساعدة. */
(function () {
  'use strict';
  const PG = window.PG, { h, shuffle } = PG.util;
  const DATA = (window.PG_DATA && window.PG_DATA.trivia) || {};
  const CATS = Object.keys(DATA);
  const PTS = [200, 400, 600];
  const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#3b82f6', '#14b8a6', '#f97316', '#a855f7', '#84cc16', '#e11d48'];
  const catColor = (c) => COLORS[CATS.indexOf(c) % COLORS.length];
  const EMO = { 'دين': '🕌', 'تاريخ': '🏛️', 'جغرافيا': '🗺️', 'عواصم وأعلام': '🚩', 'رياضة': '⚽', 'علوم': '🔬', 'أكل': '🍽️', 'كرتون': '📺', 'أفلام ومسلسلات': '🎬', 'لغة عربية': '✍️', 'تقنية': '💻', 'عام': '💡' };
  const catEmo = (c) => EMO[c] || '❓';
  const HELPS = [
    { id: 'call', icon: 'users', name: 'اتصل بصديق', hint: '+30 ثانية للاستعانة بشخص من خارج الفريق' },
    { id: 'two', icon: 'swap', name: 'محاولتين', hint: 'يحق للفريق إجابتان بدل وحدة' },
    { id: 'dbl', icon: 'spark', name: 'ضربة مزدوجة', hint: 'إذا جاوب صح: ياخذ النقاط وتنخصم من الخصم' },
  ];

  PG.games.register({
    id: 'trivia', title: 'كيو إي (QA)', category: 'teams', icon: 'quiz', color: '#6366f1', mode: 'فريقين',
    desc: 'كل فريق يختار تصنيفاته، ثم لوحة أسئلة بالنقاط ووسائل مساعدة.', ready: true,
    teams: { min: 2, recommended: 2 },
    settings: [
      { key: 'perTeam', label: 'تصنيفات لكل فريق', hint: 'عدد التصنيفات التي يختارها كل فريق (اللوحة = ضعفها). يُطبَّق في اللعبة الجديدة', type: 'select', default: '3',
        options: [{ value: '2', label: '2' }, { value: '3', label: '3' }] },
      { key: 'time', label: 'وقت الإجابة (ثانية)', hint: 'للفريق صاحب الدور', type: 'number', min: 10, max: 180, step: 5, default: 60 },
      { key: 'steal', label: 'فرصة الخصم', hint: 'إذا ما عرف الفريق، الخصم يجاوب بوقت أقصر وياخذ النقاط', type: 'toggle', default: true },
      { key: 'stealTime', label: 'وقت فرصة الخصم (ثانية)', hint: 'يعمل عند تفعيل فرصة الخصم', type: 'number', min: 5, max: 60, step: 5, default: 20 },
      { key: 'helps', label: 'الوسائل المساعدة', hint: 'لكل فريق: اتصل بصديق، محاولتين، ضربة مزدوجة — كل وحدة مرة في اللعبة', type: 'toggle', default: true },
      { key: 'penalty', label: 'خصم عند الخطأ', hint: 'إذا ما جاوب أحد صح تنخصم قيمة السؤال من صاحب الدور', type: 'toggle', default: false },
    ],
    newSession() {
      return { phase: 'pick', picks: [[], []], cells: [], cats: [], turn: 0, scores: {}, used: [{}, {}], open: null, log: [], wins: {}, timer: PG.Timer.create(60) };
    },

    mount(root, ctx) {
      const s = ctx.session, save = () => ctx.save(), rr = () => { save(); ctx.rerender(); };
      const add = (...n) => root.append(...n.filter(Boolean));
      const T = PG.teams.list().slice(0, 2), other = (i) => 1 - i;
      const per = +ctx.setting('perTeam') || 3;
      const log = (m) => { s.log.unshift(m); s.log.length = Math.min(s.log.length, 60); };
      const score = (i, d) => { s.scores[T[i].id] = (s.scores[T[i].id] || 0) + d; };
      const sc = (i) => s.scores[T[i].id] || 0;
      const bankId = (c, l) => `trivia:${c}:${l}`;
      const qOf = (cell) => (DATA[cell.cat] && DATA[cell.cat][cell.lvl] && DATA[cell.cat][cell.lvl][cell.qi]) || ['—', '—'];

      const newGame = async (ask = true) => {
        if (ask && s.phase !== 'over' && !(await PG.ui.confirm('سيتم تصفير النقاط واللوحة والبدء من جديد. متابعة؟', { title: 'لعبة جديدة', ok: 'متابعة', danger: true }))) return;
        Object.assign(s, { phase: 'pick', picks: [[], []], cells: [], cats: [], turn: 0, scores: {}, used: [{}, {}], open: null, log: [] });
        PG.audio.play('whoosh'); rr();
      };
      const head = (title, sub) => h('div', { class: 'tv-head glass' },
        h('div', null, h('b', null, title), sub ? h('p', { class: 'muted small' }, sub) : null),
        h('div', { class: 'row wrap' }, PG.ui.btn(s.phase === 'over' ? 'لعبة جديدة' : 'من جديد', { icon: 'shuffle', cls: s.phase === 'over' ? 'primary' : 'ghost sm', onClick: () => newGame() })));

      /* ---------- 1) اختيار التصنيفات ---------- */
      const buildBoard = () => {
        s.cats = [];
        for (let k = 0; k < per; k++) [0, 1].forEach((i) => s.picks[i][k] && s.cats.push(s.picks[i][k]));
        s.cells = [];
        s.cats.forEach((c, ci) => PTS.forEach((p, l) => {
          const two = PG.bank.take(bankId(c, l), DATA[c][l].length, 2);
          two.forEach((qi, side) => s.cells.push({ ci, cat: c, lvl: l, pts: p, side, qi, done: null }));
        }));
        s.phase = 'board'; s.turn = 0; log('🎬 بدأت اللعبة'); PG.audio.play('whoosh');
      };
      if (s.phase === 'pick') {
        const total = s.picks[0].length + s.picks[1].length, need = per * 2;
        const who = s.picks[0].length <= s.picks[1].length ? 0 : 1;
        const taken = (c) => (s.picks[0].includes(c) ? 0 : s.picks[1].includes(c) ? 1 : -1);
        const toggle = (c) => {
          const t = taken(c);
          if (t >= 0) { s.picks[t] = s.picks[t].filter((x) => x !== c); PG.audio.play('click'); return rr(); }
          if (s.picks[who].length >= per) return;
          s.picks[who].push(c); PG.audio.play('pop');
          if (s.picks[0].length + s.picks[1].length >= need) buildBoard();
          rr();
        };
        const random = () => {
          const free = shuffle(CATS.filter((c) => taken(c) < 0));
          [0, 1].forEach((i) => { while (s.picks[i].length < per && free.length) s.picks[i].push(free.pop()); });
          buildBoard(); rr();
        };
        add(head('اختيار التصنيفات', `كل فريق يختار ${per} تصنيفات بالتناوب. اضغط على تصنيف مختار لإلغائه.`),
          h('div', { class: 'tv-pickbar' }, [0, 1].map((i) => h('div', { class: 'tv-pteam' + (i === who && total < need ? ' on' : ''), style: { '--tc': T[i].color } },
            h('b', null, T[i].name), h('span', { class: 'muted small' }, `${s.picks[i].length} / ${per}`)))),
          h('p', { class: 'tv-who', style: { '--tc': T[who].color } }, 'دور ', h('b', null, T[who].name), ' في الاختيار'),
          h('div', { class: 'tv-cats' }, CATS.map((c) => {
            const t = taken(c);
            return h('button', { type: 'button', class: 'tv-cat' + (t >= 0 ? ' taken' : ''), style: { '--cc': catColor(c), '--tc': t >= 0 ? T[t].color : 'transparent' }, onclick: () => toggle(c) },
              t >= 0 ? h('i', { class: 'tv-cat-ord' }, String(s.picks[t].indexOf(c) + 1)) : null,
              h('span', { class: 'tv-emo' }, catEmo(c)), h('span', { class: 'tv-cat-n' }, c), h('small', null, t >= 0 ? T[t].name : `${DATA[c].flat().length} سؤال`));
          })),
          h('div', { class: 'tv-go' }, PG.ui.btn('اختيار عشوائي للباقي', { icon: 'shuffle', cls: 'primary', onClick: random })));
        return;
      }

      /* ---------- شريط الفريقين ---------- */
      const helpsOn = ctx.setting('helps');
      const teamBar = () => h('div', { class: 'tv-teams' }, [0, 1].map((i) => h('div', { class: 'tv-team glass' + (s.turn === i && s.phase !== 'over' ? ' on' : ''), style: { '--tc': T[i].color } },
        h('div', { class: 'tv-tname' }, h('b', null, T[i].name), s.turn === i && s.phase !== 'over' ? h('span', { class: 'tag' }, 'الدور') : null),
        h('div', { class: 'tv-score' }, String(sc(i))),
        h('div', { class: 'tv-adj' },
          h('button', { type: 'button', class: 'btn icon sm ghost', 'aria-label': 'إنقاص 100', html: PG.icon('minus'), onclick: () => { score(i, -100); rr(); } }),
          h('button', { type: 'button', class: 'btn icon sm ghost', 'aria-label': 'زيادة 100', html: PG.icon('plus'), onclick: () => { score(i, 100); rr(); } })),
        helpsOn ? h('div', { class: 'tv-helps' }, HELPS.map((x) => h('span', { class: 'tv-help' + (s.used[i][x.id] ? ' used' : ''), title: x.name + (s.used[i][x.id] ? ' (مستخدمة)' : ''), html: PG.icon(x.icon) }))) : null)));

      /* ---------- 3) شاشة السؤال ---------- */
      if (s.phase === 'q' && s.open) {
        const o = s.open, cell = s.cells[o.cell], q = qOf(cell), cur = o.stage === 'steal' ? other(s.turn) : s.turn;
        const tm = new PG.Timer(s.timer, { save, warnAt: 5, onEnd: () => {
          if (o.stage === 'main' && ctx.setting('steal') && !o.shown) { goSteal(); }
        } });
        tm.el.classList.add('tv-timer');
        ctx.onCleanup(() => tm.destroy());
        const goSteal = () => { tm.pause(); o.stage = 'steal'; o.started = false; s.timer = PG.Timer.create(ctx.setting('stealTime')); PG.audio.play('whoosh'); rr(); };
        const finish = (winner) => {
          tm.pause();
          const pts = cell.pts, mine = s.turn;
          if (winner === mine) {
            score(mine, pts);
            if (o.helps.dbl) { score(other(mine), -pts); log(`💥 ${T[mine].name} +${pts} وخصم ${pts} من ${T[other(mine)].name} (${cell.cat})`); }
            else log(`✅ ${T[mine].name} +${pts} (${cell.cat})`);
            PG.audio.play('correct');
          } else if (winner === other(mine)) {
            score(winner, pts); log(`🔁 ${T[winner].name} سرق ${pts} (${cell.cat})`); PG.audio.play('correct');
          } else {
            if (ctx.setting('penalty')) { score(mine, -pts); log(`❌ ولا أحد — خصم ${pts} من ${T[mine].name} (${cell.cat})`); }
            else log(`❌ ولا أحد عرف (${cell.cat} ${pts})`);
            PG.audio.play('wrong');
          }
          cell.done = winner == null ? 'none' : T[winner].id;
          s.open = null; s.turn = other(s.turn);
          s.phase = s.cells.every((c) => c.done) ? 'over' : 'board';
          if (s.phase === 'over') {
            const a = sc(0), b = sc(1), w = a === b ? null : a > b ? 0 : 1;
            if (w != null) s.wins[T[w].name] = (s.wins[T[w].name] || 0) + 1;
            PG.audio.play('win');
          }
          rr();
        };
        const canHelp = (i) => helpsOn && i === s.turn && o.stage === 'main' && !o.shown;
        const useHelp = (x) => {
          if (s.used[s.turn][x.id] || !canHelp(s.turn)) return;
          s.used[s.turn][x.id] = true; o.helps[x.id] = true; PG.audio.play('reveal');
          if (x.id === 'call') { const l = tm.left() + 30; tm.pause(); s.timer.remaining = l; s.timer.duration = Math.max(s.timer.duration, l); tm.start(); }
          log(`🛟 ${T[s.turn].name} استخدم «${x.name}»`); rr();
        };
        const change = () => {
          const avoid = s.cells.filter((c) => c.cat === cell.cat && c.lvl === cell.lvl && c !== cell).map((c) => c.qi);
          const n = PG.bank.next(bankId(cell.cat, cell.lvl), DATA[cell.cat][cell.lvl].length, { avoid: avoid.concat(cell.qi) });
          if (n >= 0) { cell.qi = n; o.shown = false; PG.audio.play('flip'); rr(); } else PG.ui.toast('ما فيه سؤال بديل في هذا المستوى');
        };
        const side = (i) => h('div', { class: 'tv-side' + (i === cur ? ' on' : '') + (i === cur && o.stage === 'steal' ? ' steal' : ''), style: { '--tc': T[i].color } },
          h('div', { class: 'tv-side-name' }, T[i].name),
          h('div', { class: 'tv-side-score' }, String(sc(i))),
          helpsOn ? h('div', { class: 'tv-side-helps' }, HELPS.map((x) => {
            const used = !!s.used[i][x.id], now = !!(o.helps[x.id] && i === s.turn), can = canHelp(i) && !used;
            return h('button', { type: 'button', class: 'tv-lf' + (used ? ' used' : '') + (now ? ' now' : '') + (can ? ' can' : ''), disabled: !can,
              title: `${x.name} — ${x.hint}`, 'aria-label': x.name, onclick: () => useHelp(x) }, h('span', { html: PG.icon(x.icon) }), h('small', null, x.name));
          })) : null);
        const active = Object.keys(o.helps).filter((k) => o.helps[k]).map((k) => HELPS.find((x) => x.id === k).name);
        const stage = h('div', { class: 'tv-stage', style: { '--cc': catColor(cell.cat), '--tc': T[cur].color } },
          h('div', { class: 'tv-st-top' },
            h('div', { class: 'tv-st-cat' }, h('span', { class: 'tv-emo' }, catEmo(cell.cat)), h('b', null, cell.cat)),
            tm.el,
            h('div', { class: 'tv-st-pts' }, h('b', null, String(cell.pts)), h('small', null, 'نقطة'))),
          h('div', { class: 'tv-banner' + (o.stage === 'steal' ? ' steal' : '') },
            o.stage === 'steal' ? h('span', { html: PG.icon('swap') }) : null,
            o.stage === 'steal' ? 'فرصة ' : 'دور ', h('b', null, T[cur].name),
            active.length ? h('span', { class: 'tv-banner-h' }, active.map((n) => h('i', null, n))) : null),
          h('div', { class: 'tv-card' }, h('p', { class: 'tv-card-q' }, q[0])),
          o.shown
            ? h('div', { class: 'tv-reveal' }, h('small', null, 'الإجابة'), h('b', null, q[1]))
            : h('button', { type: 'button', class: 'tv-ansbtn', onclick: () => { o.shown = true; tm.pause(); PG.audio.play('reveal'); rr(); } }, h('span', { html: PG.icon('eye') }), 'الإجابة'),
          !o.shown && o.stage === 'main' && ctx.setting('steal') ? h('button', { type: 'button', class: 'tv-stealbtn', style: { '--tc': T[other(s.turn)].color }, onclick: goSteal },
            h('span', { html: PG.icon('swap') }), `ما عرفوا — فرصة ${T[other(s.turn)].name}`) : null,
          o.shown ? h('div', { class: 'tv-judge' },
            h('p', null, 'مين جاوب صح؟'),
            h('div', { class: 'tv-judge-btns' },
              [0, 1].map((i) => h('button', { type: 'button', class: 'tv-jb', style: { '--tc': T[i].color }, onclick: () => finish(i) }, h('span', { html: PG.icon('check') }), T[i].name)),
              h('button', { type: 'button', class: 'tv-jb none', onclick: () => finish(null) }, h('span', { html: PG.icon('x') }), 'ولا أحد'))) : null,
          h('div', { class: 'tv-st-foot' },
            PG.ui.btn('رجوع للوحة', { icon: 'arrowR', cls: 'ghost sm', onClick: () => { tm.pause(); s.open = null; s.phase = 'board'; rr(); } }),
            PG.ui.btn('تغيير السؤال', { icon: 'shuffle', cls: 'ghost sm', onClick: change })));
        add(h('div', { class: 'tv-qwrap' }, side(0), stage, side(1)));
        if (!o.started) { o.started = true; save(); tm.start(); }
        return;
      }

      /* ---------- 2) اللوحة ---------- */
      if (s.phase === 'board' || s.phase === 'q') {
        s.phase = 'board';
        const open = (idx) => {
          const c = s.cells[idx]; if (c.done) return;
          s.open = { cell: idx, stage: 'main', shown: false, started: false, helps: {} };
          s.timer = PG.Timer.create(ctx.setting('time'));
          s.phase = 'q'; PG.audio.play('flip'); rr();
        };
        const left = s.cells.filter((c) => !c.done).length;
        add(head('اللوحة', `دور ${T[s.turn].name} في الاختيار — باقي ${left} سؤال`), teamBar(),
          h('div', { class: 'tv-board', style: { '--n': s.cats.length } }, s.cats.map((c, ci) => h('div', { class: 'tv-col', style: { '--cc': catColor(c) } },
            h('div', { class: 'tv-col-h' }, h('span', { class: 'tv-emo' }, catEmo(c)), h('span', null, c)),
            PTS.map((p, l) => h('div', { class: 'tv-row' }, [0, 1].map((side) => {
              const idx = s.cells.findIndex((x) => x.ci === ci && x.lvl === l && x.side === side), cell = s.cells[idx];
              if (!cell) return h('span');
              const by = cell.done && cell.done !== 'none' ? PG.teams.get(cell.done) : null;
              return h('button', { type: 'button', class: 'tv-cell' + (cell.done ? ' done' + (by ? ' won' : ' lost') : ''), disabled: !!cell.done, style: by ? { '--tc': by.color } : null,
                'aria-label': `${c} ${p}`, onclick: () => open(idx) }, cell.done ? (by ? by.name : '—') : String(p));
            })))))),
          s.log.length ? h('details', { class: 'tv-log glass' }, h('summary', null, 'سجل اللعبة'), h('ul', null, s.log.slice(0, 30).map((m) => h('li', null, m)))) : null);
        return;
      }

      /* ---------- 4) النهاية ---------- */
      const a = sc(0), b = sc(1), w = a === b ? null : a > b ? 0 : 1;
      add(head('انتهت اللوحة', 'كل الأسئلة انلعبت'),
        h('div', { class: 'tv-over glass', style: { '--tc': w == null ? '#9ba1c6' : T[w].color } },
          h('div', { class: 'tv-trophy', html: PG.icon('trophy') }),
          h('h2', null, w == null ? 'تعادل!' : `🎉 فاز ${T[w].name}`),
          h('p', { class: 'muted' }, `${T[0].name} ${a} — ${b} ${T[1].name}`),
          Object.keys(s.wins).length ? h('div', { class: 'tv-wins' }, Object.entries(s.wins).map(([n, k]) => h('span', { class: 'tag' }, `${n}: ${k} 🏆`))) : null,
          PG.ui.btn('لعبة جديدة', { icon: 'play', cls: 'primary', onClick: () => newGame(false) })),
        teamBar(),
        s.log.length ? h('details', { class: 'tv-log glass', open: true }, h('summary', null, 'سجل اللعبة'), h('ul', null, s.log.slice(0, 40).map((m) => h('li', null, m)))) : null);
    },
  });
})();
