/* برا السالفة: الكل يعرف الكلمة إلا واحد. كشف الأدوار بتمرير الجهاز، ثم دائرة أسئلة
   (كل لاعب يسأل اللي بعده، فالكل يسأل وينسأل)، ثم تصويت، ثم فرصة تخمين للي برا السالفة. */
(function () {
  'use strict';
  const PG = window.PG, { h, shuffle, pick, uid } = PG.util;
  const DATA = (window.PG_DATA && window.PG_DATA.outsider) || {};
  const CATS = Object.keys(DATA);
  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e'];

  const fromTeams = () => PG.teams.list().flatMap((t) => t.players.map((p) => p.name));
  const blank = (names) => ({ phase: 'setup', players: names.map((n) => ({ id: uid('o'), name: n })), round: 0, log: [] });

  PG.games.register({
    id: 'outsider', ready: true,
    settings: [
      { key: 'cat', label: 'التصنيف', hint: 'عشوائي = تصنيف مختلف كل جولة', type: 'select', default: 'random',
        options: [{ value: 'random', label: 'عشوائي' }].concat(CATS.map((c) => ({ value: c, label: c }))) },
      { key: 'outs', label: 'عدد اللي برا السالفة', hint: 'اثنين يحتاج 6 لاعبين على الأقل، ويُطبَّق من الجولة الجاية', type: 'select', default: '1',
        options: [{ value: '1', label: 'واحد' }, { value: '2', label: 'اثنين' }] },
      { key: 'knowCat', label: 'اللي برا السالفة يعرف التصنيف', hint: 'عند التشغيل يشوف تصنيف الكلمة (مثلاً: أكلات) بدون الكلمة نفسها', type: 'toggle', default: true },
      { key: 'vote', label: 'طريقة التصويت', hint: 'جماعي: تتناقشون وتختارون المتهم. سري: كل لاعب يصوّت على الجهاز بدون ما أحد يشوف', type: 'select', default: 'group',
        options: [{ value: 'group', label: 'جماعي' }, { value: 'secret', label: 'سري (تمرير الجهاز)' }] },
      { key: 'useTimer', label: 'مؤقت لكل سؤال', hint: 'يظهر في مرحلة الأسئلة ويرجع من البداية مع كل سؤال', type: 'toggle', default: false },
      { key: 'timer', label: 'مدة المؤقت (ثانية)', hint: 'تعمل فقط عند تفعيل المؤقت', type: 'number', min: 10, max: 120, step: 5, default: 30 },
    ],
    newSession(ctx) { return Object.assign(blank(fromTeams()), { scores: {}, timer: PG.Timer.create(ctx.setting('timer')) }); },
    onSetting(ctx, key, val) {
      const t = ctx.session && ctx.session.timer;
      if (key === 'timer' && t) { t.duration = val; if (!t.running) t.remaining = val; }
    },

    mount(root, ctx) {
      const s = ctx.session, save = () => ctx.save(), rr = () => { save(); ctx.rerender(); };
      const P = (id) => s.players.find((p) => p.id === id);
      const color = (id) => COLORS[s.players.findIndex((p) => p.id === id) % COLORS.length];
      const isOut = (id) => (s.outs || []).includes(id);
      const log = (m) => { s.log.unshift(m); s.log.length = Math.min(s.log.length, 60); };
      const add = (...nodes) => root.append(...nodes.filter(Boolean));
      const resetTimer = () => { if (s.timer) { s.timer.running = false; s.timer.remaining = s.timer.duration; } };
      const pts = (name, n) => { s.scores[name] = (s.scores[name] || 0) + n; };

      /* ---------- جولة جديدة ---------- */
      const newRound = () => {
        const want = ctx.setting('cat');
        const cat = CATS.includes(want) ? want : pick(CATS);
        const list = DATA[cat];
        const wi = PG.bank.next('outsider:' + cat, list.length);
        let k = +ctx.setting('outs') || 1;
        if (k === 2 && s.players.length < 6) { k = 1; PG.ui.toast('اثنين برا السالفة يحتاج 6 لاعبين، هذي الجولة بواحد'); }
        const ids = s.players.map((p) => p.id);
        Object.assign(s, {
          phase: 'reveal', cat, word: list[wi], outs: shuffle(ids).slice(0, k), ri: 0, showing: false,
          order: shuffle(ids), qi: 0, lap: 1, sel: [], votes: {}, vi: 0, voting: false, accused: [], opts: [], result: null,
          round: s.round + 1,
        });
        resetTimer();
        log(`🎲 الجولة ${s.round} — التصنيف: ${cat}`);
        PG.audio.play('whoosh');
      };
      const restart = async (toSetup) => {
        if (s.phase !== 'over' && !(await PG.ui.confirm('سيتم إلغاء الجولة الحالية. متابعة؟', { title: toSetup ? 'تعديل اللاعبين' : 'جولة جديدة', ok: 'متابعة', danger: true }))) return;
        if (toSetup) s.phase = 'setup'; else newRound();
        rr();
      };
      const head = (title, sub) => h('div', { class: 'os-head glass' }, h('div', null, h('b', null, title), sub ? h('p', { class: 'muted small' }, sub) : null),
        s.phase !== 'setup' ? h('div', { class: 'row wrap' },
          PG.ui.btn('جولة جديدة', { icon: 'shuffle', cls: s.phase === 'over' ? 'primary' : 'ghost', onClick: () => restart(false) }),
          PG.ui.btn('تعديل اللاعبين', { icon: 'users', cls: 'ghost', onClick: () => restart(true) })) : null);

      /* بطاقة الدور السرية */
      const roleCard = (id) => isOut(id)
        ? h('div', { class: 'os-role out' }, h('div', { class: 'os-ico', html: PG.icon('outsider') }), h('h2', null, 'أنت برا السالفة'),
          ctx.setting('knowCat') ? h('p', { class: 'os-cat' }, 'التصنيف: ', h('b', null, s.cat)) : h('p', { class: 'muted' }, 'حاول تعرف الكلمة من أسئلتهم بدون ما تنكشف'))
        : h('div', { class: 'os-role in' }, h('p', { class: 'os-cat' }, 'التصنيف: ', h('b', null, s.cat)), h('h2', { class: 'os-word' }, s.word),
          h('p', { class: 'muted small' }, 'لا تقول الكلمة! اسأل وجاوب بذكاء'));

      const peek = () => {
        const m = PG.ui.modal({ title: 'شوف دورك مرة ثانية', size: 'sm',
          body: h('div', { class: 'os-peek' }, h('p', { class: 'muted' }, 'اختر اسمك، وتأكد ما أحد يشوف الشاشة'),
            h('div', { class: 'os-pick' }, s.players.map((p) => h('button', { type: 'button', class: 'btn', onclick: () => {
              m.setBody(h('div', { class: 'os-peek' }, roleCard(p.id), PG.ui.btn('تم، أخفِ', { icon: 'check', cls: 'primary', onClick: () => m.close() })));
            } }, p.name)))) });
      };

      /* ---------- 1) اللاعبون ---------- */
      if (s.phase === 'setup') {
        const inp = h('input', { class: 'input', placeholder: 'اسم اللاعب', maxlength: 24, onkeydown: (e) => { if (e.key === 'Enter') addP(); } });
        const addP = () => { const n = inp.value.trim(); if (!n) return; s.players.push({ id: uid('o'), name: n }); inp.value = ''; rr(); setTimeout(() => root.querySelector('.os-add .input')?.focus(), 0); };
        add(head('اللاعبون', 'الكل يشوف الكلمة إلا اللي برا السالفة. يلزم 3 لاعبين على الأقل.'),
          h('div', { class: 'os-players glass' },
            h('div', { class: 'os-chips' }, s.players.length ? s.players.map((p) => h('span', { class: 'player-chip', style: { borderColor: color(p.id) } }, p.name,
              h('button', { type: 'button', class: 'x', 'aria-label': 'حذف', html: PG.icon('x'), onclick: () => { s.players = s.players.filter((x) => x.id !== p.id); rr(); } })))
              : h('span', { class: 'empty' }, 'لا يوجد لاعبون بعد.')),
            h('div', { class: 'row os-add' }, inp, PG.ui.btn('إضافة', { icon: 'plus', onClick: addP })),
            h('div', { class: 'row wrap' },
              PG.ui.btn('جلب أسماء الفرق', { icon: 'users', cls: 'ghost', onClick: () => {
                const have = new Set(s.players.map((p) => p.name)); fromTeams().forEach((n) => { if (!have.has(n)) s.players.push({ id: uid('o'), name: n }); }); rr();
              } }),
              s.players.length ? PG.ui.btn('مسح الكل', { icon: 'trash', cls: 'ghost', onClick: async () => { if (await PG.ui.confirm('حذف كل اللاعبين من القائمة؟', { danger: true, ok: 'حذف' })) { s.players = []; rr(); } } }) : null)),
          h('div', { class: 'os-rules glass' }, h('b', null, 'النقاط'),
            h('ul', null, h('li', null, 'انكشف اللي برا السالفة وما عرف الكلمة: +1 لكل لاعب داخل السالفة.'),
              h('li', null, 'انكشف لكن خمّن الكلمة صح: +2 للي برا السالفة.'),
              h('li', null, 'ما انكشف: +2 للي برا السالفة.'))),
          h('div', { class: 'os-go' }, PG.ui.btn('ابدأ الجولة', { icon: 'play', cls: 'primary', onClick: () => {
            if (s.players.length < 3) return PG.ui.toast('يلزم 3 لاعبين على الأقل');
            newRound(); rr();
          } })));
        return;
      }

      const dots = (n, at) => h('div', { class: 'os-dots' }, Array.from({ length: n }, (_, i) => h('i', { class: i < at ? 'done' : i === at ? 'now' : '' })));

      /* ---------- 2) كشف الأدوار (تمرير الجهاز) ---------- */
      if (s.phase === 'reveal') {
        const p = s.players[s.ri];
        const card = !s.showing
          ? h('div', { class: 'os-pass glass' }, h('div', { class: 'os-ico', html: PG.icon('eye') }),
            h('p', { class: 'muted' }, 'أعطِ الجهاز إلى'), h('h2', null, p.name),
            PG.ui.btn('أنا ' + p.name + ' — اكشف دوري', { icon: 'eye', cls: 'primary', onClick: () => { s.showing = true; PG.audio.play('flip'); rr(); } }))
          : h('div', { class: 'os-pass glass' }, roleCard(p.id),
            PG.ui.btn(s.ri + 1 < s.players.length ? 'تم، أخفِ ومرّر' : 'تم، ابدأ الأسئلة', { icon: 'check', cls: 'primary', onClick: () => {
              s.showing = false; s.ri++; PG.audio.play('pop');
              if (s.ri >= s.players.length) { s.phase = 'ask'; resetTimer(); PG.audio.play('whoosh'); }
              rr();
            } }));
        add(head('كشف الأدوار', `${s.ri} من ${s.players.length} — الجولة ${s.round}`), dots(s.players.length, s.ri), card);
        return;
      }

      /* ---------- 3) دائرة الأسئلة ---------- */
      if (s.phase === 'ask') {
        const n = s.order.length, done = s.qi >= n;
        const pair = (i) => [P(s.order[i]), P(s.order[(i + 1) % n])];
        let timerEl = null;
        if (ctx.setting('useTimer') && !done) { const tm = new PG.Timer(s.timer, { compact: true, save }); ctx.onCleanup(() => tm.destroy()); timerEl = tm.el; }
        const toVote = () => { s.phase = 'vote'; s.sel = []; s.votes = {}; s.vi = 0; s.voting = false; resetTimer(); PG.audio.play('whoosh'); rr(); };
        const nameTag = (p) => h('span', { class: 'os-name', style: { '--oc': color(p.id) } }, p.name);
        let main;
        if (!done) {
          const [a, b] = pair(s.qi);
          main = h('div', { class: 'os-q glass' },
            h('p', { class: 'muted' }, `سؤال ${s.qi + 1} من ${n}` + (s.lap > 1 ? ` — الدورة ${s.lap}` : '')),
            h('div', { class: 'os-pair' }, nameTag(a), h('span', { class: 'os-arrow' }, 'يسأل'), nameTag(b)),
            timerEl,
            h('div', { class: 'row wrap os-nav' },
              s.qi > 0 ? PG.ui.btn('السابق', { cls: 'ghost', onClick: () => { s.qi--; resetTimer(); rr(); } }) : null,
              PG.ui.btn(s.qi + 1 < n ? 'السؤال التالي' : 'إنهاء الدائرة', { icon: 'check', cls: 'primary', onClick: () => { s.qi++; resetTimer(); PG.audio.play('click'); rr(); } })));
        } else {
          main = h('div', { class: 'os-q glass' },
            h('h2', null, '✅ الكل سأل وانسأل'),
            h('p', { class: 'muted' }, 'تقدرون تسوون دورة ثانية بترتيب جديد، أو تروحون للتصويت.'),
            h('div', { class: 'row wrap os-nav' },
              PG.ui.btn('دورة أسئلة ثانية', { icon: 'shuffle', cls: 'ghost', onClick: () => { s.order = shuffle(s.order); s.qi = 0; s.lap++; resetTimer(); PG.audio.play('flip'); rr(); } }),
              PG.ui.btn('إلى التصويت', { icon: 'play', cls: 'primary', onClick: toVote })));
        }
        add(head('الأسئلة', 'كل لاعب يسأل اللي بعده سؤال عن الكلمة. التصنيف: ' + s.cat),
          main,
          h('div', { class: 'os-chain' }, s.order.map((id, i) => {
            const [a, b] = pair(i);
            return h('span', { class: 'os-link' + (i < s.qi ? ' done' : i === s.qi ? ' now' : '') }, a.name + ' ← ' + b.name);
          })),
          h('div', { class: 'os-go row wrap' },
            PG.ui.btn('شوف دورك مرة ثانية', { icon: 'eye', cls: 'ghost', onClick: peek }),
            !done ? PG.ui.btn('للتصويت الآن', { cls: 'ghost', onClick: async () => { if (await PG.ui.confirm('الدائرة ما كملت، يعني فيه لاعبين ما سألوا أو ما انسألوا. تروحون للتصويت؟', { ok: 'للتصويت' })) toVote(); } }) : null));
        return;
      }

      const k = s.outs.length;
      const outNames = () => s.outs.map((id) => '«' + P(id).name + '»').join(' و');

      /* ---------- 4) التصويت ---------- */
      if (s.phase === 'vote') {
        const secret = ctx.setting('vote') === 'secret';
        const voters = s.players;
        // التصويت السري: تمرير الجهاز لكل لاعب
        if (secret && s.vi < voters.length) {
          const v = voters[s.vi];
          const card = !s.voting
            ? h('div', { class: 'os-pass glass' }, h('div', { class: 'os-ico', html: PG.icon('users') }),
              h('p', { class: 'muted' }, 'التصويت السري — أعطِ الجهاز إلى'), h('h2', null, v.name),
              PG.ui.btn('أنا ' + v.name + ' — أصوّت', { icon: 'eye', cls: 'primary', onClick: () => { s.voting = true; rr(); } }))
            : h('div', { class: 'os-pass glass' }, h('p', null, v.name + '، مين تشك أنه برا السالفة؟'),
              h('div', { class: 'os-pick' }, voters.filter((x) => x.id !== v.id).map((x) => h('button', { type: 'button', class: 'btn', onclick: () => {
                s.votes[v.id] = x.id; s.voting = false; s.vi++; PG.audio.play('pop');
                if (s.vi >= voters.length) { // ترتيب الأصوات واختيار الأعلى
                  const c = {}; Object.values(s.votes).forEach((t) => { c[t] = (c[t] || 0) + 1; });
                  const sorted = Object.keys(c).sort((a, b) => c[b] - c[a]);
                  const cut = sorted.length >= k ? c[sorted[k - 1]] : 0;
                  s.sel = sorted.filter((id) => c[id] > cut || (c[id] === cut && sorted.filter((j) => c[j] >= cut).length <= k)).slice(0, k);
                }
                rr();
              } }, x.name))));
          add(head('التصويت', `${s.vi} من ${voters.length}`), dots(voters.length, s.vi), card);
          return;
        }
        const cnt = {}; Object.values(s.votes || {}).forEach((t) => { cnt[t] = (cnt[t] || 0) + 1; });
        const tie = secret && s.sel.length < k;
        const sub = secret
          ? (tie ? 'فيه تعادل في الأصوات، اختاروا من بين المتعادلين' : 'هذي نتيجة التصويت. تقدرون تعدلون الاختيار قبل الكشف.')
          : (k > 1 ? 'تناقشوا واختاروا اثنين تشكون فيهم' : 'تناقشوا واختاروا اللي تشكون أنه برا السالفة');
        add(head('مين برا السالفة؟', sub),
          h('div', { class: 'os-grid' }, s.players.map((p) => {
            const on = s.sel.includes(p.id);
            return h('button', { type: 'button', class: 'os-pl glass' + (on ? ' on' : ''), style: { '--oc': color(p.id) }, onclick: () => {
              if (on) s.sel = s.sel.filter((x) => x !== p.id);
              else { if (s.sel.length >= k) s.sel.shift(); s.sel.push(p.id); }
              PG.audio.play('click'); rr();
            } }, h('b', null, p.name), cnt[p.id] ? h('span', { class: 'os-votes' }, cnt[p.id] + ' صوت') : null);
          })),
          h('div', { class: 'os-go row wrap' },
            PG.ui.btn('رجوع للأسئلة', { cls: 'ghost', onClick: () => { s.phase = 'ask'; rr(); } }),
            PG.ui.btn('اكشف', { icon: 'eye', cls: 'primary', onClick: () => {
              if (s.sel.length < k) return PG.ui.toast(k > 1 ? 'اختاروا اثنين' : 'اختاروا لاعباً');
              s.accused = s.sel.slice();
              const caught = s.outs.every((id) => s.accused.includes(id));
              log('🗳️ المتهم: ' + s.accused.map((id) => '«' + P(id).name + '»').join(' و'));
              if (caught) {
                s.opts = shuffle([s.word].concat(shuffle(DATA[s.cat].filter((w) => w !== s.word)).slice(0, 7)));
                s.phase = 'guess'; PG.audio.play('correct');
              } else {
                s.result = { caught: false };
                s.outs.forEach((id) => pts(P(id).name, 2));
                log(`😎 ${outNames()} ما انكشف (+2)`);
                s.phase = 'over'; PG.audio.play('wrong');
              }
              rr();
            } })));
        return;
      }

      /* ---------- 5) فرصة التخمين ---------- */
      if (s.phase === 'guess') {
        add(head('🎯 انكشف!', `${outNames()} برا السالفة. باقي فرصة أخيرة: لو خمّن الكلمة ياخذ النقاط.`),
          h('div', { class: 'os-pass glass' }, h('p', null, 'وش الكلمة؟'),
            h('div', { class: 'os-pick' }, s.opts.map((w) => h('button', { type: 'button', class: 'btn', onclick: () => {
              const ok = w === s.word;
              s.result = { caught: true, guessed: ok, said: w };
              if (ok) { s.outs.forEach((id) => pts(P(id).name, 2)); log(`🧠 ${outNames()} انكشف لكن خمّن «${s.word}» (+2)`); PG.audio.play('win'); }
              else { s.players.filter((p) => !isOut(p.id)).forEach((p) => pts(p.name, 1)); log(`✅ انكشف ${outNames()} وقال «${w}» بدل «${s.word}» (+1 للباقين)`); PG.audio.play('win'); }
              s.phase = 'over'; rr();
            } }, w)))));
        return;
      }

      /* ---------- 6) النتيجة ---------- */
      const r = s.result || {};
      const insidersWon = r.caught && !r.guessed;
      const names = Object.keys(s.scores).sort((a, b) => s.scores[b] - s.scores[a]);
      add(head(insidersWon ? '🎉 فاز اللي داخل السالفة' : '😎 فاز اللي برا السالفة',
          !r.caught ? (k > 1 ? 'واحد منهم على الأقل ما انكشف.' : 'ما انكشف.') : r.guessed ? 'انكشف لكن عرف الكلمة.' : 'انكشف وما عرف الكلمة.'),
        h('div', { class: 'os-res glass' },
          h('p', { class: 'os-cat' }, 'التصنيف: ', h('b', null, s.cat)),
          h('h2', { class: 'os-word' }, s.word),
          h('p', null, 'برا السالفة: ', h('b', { class: 'os-bad' }, s.outs.map((id) => P(id).name).join(' و '))),
          r.caught && !r.guessed ? h('p', { class: 'muted small' }, 'خمّن: «' + r.said + '»') : null,
          s.accused.length ? h('p', { class: 'muted small' }, 'اتهمتم: ' + s.accused.map((id) => P(id).name).join(' و ')) : null),
        names.length ? h('div', null, h('h3', { class: 'os-sub' }, 'النقاط'),
          h('div', { class: 'os-scores' }, names.map((n, i) => { const top = i === 0 && (names.length === 1 || s.scores[n] > s.scores[names[1]]); return h('span', { class: 'tag' + (top ? ' gold' : '') }, (top ? '👑 ' : '') + n + ': ' + s.scores[n]); }))) : null,
        h('div', { class: 'os-go row wrap' },
          names.length ? PG.ui.btn('تصفير النقاط', { icon: 'reset', cls: 'ghost', onClick: async () => { if (await PG.ui.confirm('تصفير نقاط كل اللاعبين؟', { danger: true, ok: 'تصفير' })) { s.scores = {}; rr(); } } }) : null),
        s.log.length ? h('details', { class: 'os-log glass' }, h('summary', null, 'سجل اللعبة'), h('ol', null, s.log.map((m) => h('li', null, m)))) : null);
    },
  });
})();
