/* إمبراطور الكلمات: كل لاعب يكتب كلمة سرية، تُقرأ عشوائياً، ثم يخمّن الإمبراطور صاحب كل كلمة ليضمّه لإمبراطوريته. */
(function () {
  'use strict';
  const PG = window.PG, { h, shuffle, pick, uid } = PG.util;
  const norm = (w) => String(w || '').trim().replace(/^ال/, '').replace(/[إأآ]/g, 'ا').replace(/ة$/, 'ه').replace(/ى$/, 'ي').replace(/\s+/g, ' ');
  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e'];

  const fromTeams = () => PG.teams.list().flatMap((t) => t.players.map((p) => p.name));
  const blank = (names) => ({ phase: 'setup', players: names.map((n) => ({ id: uid('e'), name: n, word: '', boss: null })), wi: 0, typing: false, read: [], turn: null, target: null, log: [] });

  PG.games.register({
    id: 'emperor', ready: true,
    settings: [
      { key: 'topic', label: 'موضوع الكلمات', hint: 'اتركه فارغاً لتكون الكلمات حرة، أو اكتب مثلاً: أكلة، مدينة، حيوان', type: 'text', default: '' },
      { key: 'showList', label: 'إظهار قائمة الكلمات أثناء اللعب', hint: 'عند الإيقاف تُخفى القائمة بعد القراءة ويعتمد اللاعبون على ذاكرتهم', type: 'toggle', default: true },
      { key: 'useTimer', label: 'مؤقت التفكير', hint: 'يظهر في الدور، ويشغّله المقدّم', type: 'toggle', default: false },
      { key: 'timer', label: 'مدة المؤقت (ثانية)', hint: 'تعمل فقط عند تفعيل مؤقت التفكير', type: 'number', min: 10, max: 180, step: 10, default: 30 },
    ],
    newSession(ctx) { return Object.assign(blank(fromTeams()), { wins: {}, timer: PG.Timer.create(ctx.setting('timer')) }); },
    onSetting(ctx, key, val) {
      const t = ctx.session && ctx.session.timer;
      if (key === 'timer' && t) { t.duration = val; if (!t.running) t.remaining = val; }
    },

    mount(root, ctx) {
      const s = ctx.session, save = () => ctx.save(), rr = () => { save(); ctx.rerender(); };
      const P = (id) => s.players.find((p) => p.id === id);
      const emperors = () => s.players.filter((p) => !p.boss);
      const members = (id) => s.players.filter((p) => p.boss === id);
      const color = (id) => COLORS[s.players.findIndex((p) => p.id === id) % COLORS.length];
      const log = (m) => { s.log.unshift(m); s.log.length = Math.min(s.log.length, 60); };
      const topic = String(ctx.setting('topic') || '').trim();
      const add = (...nodes) => root.append(...nodes.filter(Boolean));
      const restart = async (toSetup) => {
        if (s.phase !== 'over' && !(await PG.ui.confirm('سيتم إلغاء اللعبة الحالية وكتابة كلمات جديدة. متابعة؟', { title: 'لعبة جديدة', ok: 'متابعة', danger: true }))) return;
        const keep = s.players.map((p) => p.name);
        Object.assign(s, blank(keep), toSetup ? {} : { phase: 'write' });
        PG.audio.play('whoosh'); rr();
      };
      const head = (title, sub) => h('div', { class: 'em-head glass' }, h('div', null, h('b', null, title), sub ? h('p', { class: 'muted small' }, sub) : null),
        s.phase !== 'setup' ? h('div', { class: 'row wrap' },
          PG.ui.btn(s.phase === 'over' ? 'جولة جديدة' : 'لعبة جديدة', { icon: 'shuffle', cls: s.phase === 'over' ? 'primary' : 'ghost', onClick: () => restart(false) }),
          PG.ui.btn('تعديل اللاعبين', { icon: 'users', cls: 'ghost', onClick: () => restart(true) })) : null);

      /* ---------- 1) اللاعبون ---------- */
      if (s.phase === 'setup') {
        const inp = h('input', { class: 'input', placeholder: 'اسم اللاعب', maxlength: 24, onkeydown: (e) => { if (e.key === 'Enter') addP(); } });
        const addP = () => { const n = inp.value.trim(); if (!n) return; s.players.push({ id: uid('e'), name: n, word: '', boss: null }); inp.value = ''; rr(); setTimeout(() => root.querySelector('.em-add .input')?.focus(), 0); };
        add(head('اللاعبون', 'كل لاعب يكتب كلمة سرية، ثم تخمّنون أصحاب الكلمات. يلزم 3 لاعبين على الأقل.'),
          h('div', { class: 'em-players glass' },
            h('div', { class: 'em-chips' }, s.players.length ? s.players.map((p) => h('span', { class: 'player-chip', style: { borderColor: color(p.id) } }, p.name,
              h('button', { type: 'button', class: 'x', 'aria-label': 'حذف', html: PG.icon('x'), onclick: () => { s.players = s.players.filter((x) => x.id !== p.id); rr(); } })))
              : h('span', { class: 'empty' }, 'لا يوجد لاعبون بعد.')),
            h('div', { class: 'row em-add' }, inp, PG.ui.btn('إضافة', { icon: 'plus', onClick: addP })),
            h('div', { class: 'row wrap' },
              PG.ui.btn('جلب أسماء الفرق', { icon: 'users', cls: 'ghost', onClick: () => {
                const have = new Set(s.players.map((p) => p.name)); fromTeams().forEach((n) => { if (!have.has(n)) s.players.push({ id: uid('e'), name: n, word: '', boss: null }); }); rr();
              } }),
              s.players.length ? PG.ui.btn('مسح الكل', { icon: 'trash', cls: 'ghost', onClick: async () => { if (await PG.ui.confirm('حذف كل اللاعبين من القائمة؟', { danger: true, ok: 'حذف' })) { s.players = []; rr(); } } }) : null)),
          h('div', { class: 'em-go' }, PG.ui.btn('ابدأ كتابة الكلمات', { icon: 'play', cls: 'primary', onClick: () => {
            if (s.players.length < 3) return PG.ui.toast('يلزم 3 لاعبين على الأقل');
            s.players = shuffle(s.players); s.phase = 'write'; s.wi = 0; s.typing = false; PG.audio.play('whoosh'); rr();
          } })));
        return;
      }

      /* ---------- 2) كتابة الكلمات (تمرير الجهاز) ---------- */
      if (s.phase === 'write') {
        const p = s.players[s.wi];
        const dots = h('div', { class: 'em-dots' }, s.players.map((x, i) => h('i', { class: i < s.wi ? 'done' : i === s.wi ? 'now' : '' })));
        let card;
        if (!s.typing) {
          card = h('div', { class: 'em-pass glass' },
            h('div', { class: 'em-icon', html: PG.icon('crown') }),
            h('p', { class: 'muted' }, 'أعطِ الجهاز إلى'), h('h2', null, p.name),
            PG.ui.btn('أنا ' + p.name + ' — اكتب كلمتي', { icon: 'eye', cls: 'primary', onClick: () => { s.typing = true; rr(); setTimeout(() => root.querySelector('.em-word')?.focus(), 50); } }));
        } else {
          const inp = h('input', { class: 'input em-word', placeholder: topic ? 'اكتب ' + topic : 'اكتب كلمتك السرية', maxlength: 30, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
            onkeydown: (e) => { if (e.key === 'Enter') done(); } });
          const done = () => {
            const w = inp.value.trim(); if (!w) return PG.ui.toast('اكتب كلمة أولاً');
            if (s.players.some((x, i) => i < s.wi && norm(x.word) === norm(w))) return PG.ui.toast('هذه الكلمة مكتوبة من قبل، اختر كلمة أخرى'), inp.select();
            p.word = w; s.typing = false; s.wi++; PG.audio.play('pop');
            if (s.wi >= s.players.length) { s.phase = 'read'; s.read = shuffle(s.players.map((x) => x.id)); }
            rr();
          };
          card = h('div', { class: 'em-pass glass' },
            h('p', { class: 'muted' }, p.name + '، اكتب كلمتك بدون أن يراها أحد' + (topic ? ' (الموضوع: ' + topic + ')' : '')),
            inp, PG.ui.btn('حفظ وإخفاء', { icon: 'check', cls: 'primary', onClick: done }),
            h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { s.typing = false; rr(); } }, 'رجوع'));
        }
        add(head('كتابة الكلمات', `${s.wi} من ${s.players.length}`), dots, card);
        return;
      }

      /* ---------- قائمة الكلمات ---------- */
      const wordsList = (big) => h('div', { class: 'em-words' + (big ? ' big' : '') }, s.read.map((id) => {
        const p = P(id), out = !!p.boss;
        return h('span', { class: 'em-w' + (out ? ' out' : '') }, p.word, out ? h('small', null, p.name) : null);
      }));

      /* ---------- 3) القراءة ---------- */
      if (s.phase === 'read') {
        add(head('قراءة الكلمات', 'اقرأ الكلمات بصوت عالٍ، ويمكنك إعادتها مرة أخرى.' + (topic ? ' الموضوع: ' + topic : '')),
          wordsList(true),
          h('div', { class: 'em-go row wrap' },
            PG.ui.btn('خلط الترتيب', { icon: 'shuffle', cls: 'ghost', onClick: () => { s.read = shuffle(s.read); PG.audio.play('flip'); rr(); } }),
            PG.ui.btn('ابدأ اللعب', { icon: 'play', cls: 'primary', onClick: () => { s.phase = 'play'; s.turn = pick(s.players).id; log('👑 يبدأ «' + P(s.turn).name + '»'); PG.audio.play('whoosh'); rr(); } })));
        return;
      }

      /* ---------- 4) اللعب ---------- */
      const capture = (att, tgt) => {
        s.players.forEach((x) => { if (x.boss === tgt.id) x.boss = att.id; });
        tgt.boss = att.id;
      };
      const guess = (word) => {
        const att = P(s.turn), tgt = P(s.target);
        if (norm(tgt.word) === norm(word)) {
          const n = members(tgt.id).length;
          capture(att, tgt);
          log(`✅ «${att.name}» خمّن كلمة «${tgt.name}» (${tgt.word})` + (n ? ` وضمّ معه ${n}` : ''));
          PG.audio.play('correct'); PG.ui.toast(`✅ «${tgt.name}» انضم لإمبراطورية «${att.name}»`);
          s.target = null;
          if (emperors().length === 1) { s.phase = 'over'; s.wins[att.name] = (s.wins[att.name] || 0) + 1; log('🏆 «' + att.name + '» إمبراطور المجلس'); PG.audio.play('win'); }
        } else {
          log(`❌ «${att.name}» ظنّ أن «${tgt.name}» كتب «${word}»`);
          PG.audio.play('wrong'); PG.ui.toast(`❌ خطأ — الدور على «${tgt.name}»`);
          s.turn = tgt.id; s.target = null;
        }
        if (s.timer) { s.timer.running = false; s.timer.remaining = s.timer.duration; }
        rr();
      };
      const askWord = () => {
        const att = P(s.turn), tgt = P(s.target);
        const opts = s.read.map(P).filter((p) => !p.boss && p.id !== att.id);
        const m = PG.ui.modal({ title: `ما كلمة «${tgt.name}»؟`, size: 'sm',
          body: h('div', { class: 'em-pickw' }, opts.map((p) => h('button', { type: 'button', class: 'btn', onclick: () => { m.close(); guess(p.word); } }, p.word))) });
      };

      const over = s.phase === 'over';
      const att = P(s.turn);
      const empCard = (e) => {
        const ms = members(e.id), me = e.id === s.turn && !over, tgt = e.id === s.target;
        return h('button', { type: 'button', class: 'em-emp glass' + (me ? ' turn' : '') + (tgt ? ' tgt' : ''), style: { '--ec': color(e.id) }, disabled: over || me ? true : null,
          onclick: () => { s.target = e.id; PG.audio.play('click'); save(); ctx.rerender(); askWord(); } },
          h('div', { class: 'em-emp-h' }, me || (over && !e.boss) ? h('span', { class: 'em-crown', html: PG.icon('crown') }) : null, h('b', null, e.name), h('span', { class: 'em-n' }, 1 + ms.length)),
          ms.length ? h('div', { class: 'em-mem' }, ms.map((x) => h('span', null, x.name))) : null);
      };

      let timerEl = null;
      if (ctx.setting('useTimer') && !over) { const tm = new PG.Timer(s.timer, { compact: true, save }); ctx.onCleanup(() => tm.destroy()); timerEl = tm.el; }
      const wins = Object.keys(s.wins);

      add(head(over ? '🏆 «' + att.name + '» إمبراطور المجلس' : 'الدور على «' + att.name + '»',
          over ? 'جمع كل اللاعبين في إمبراطوريته.' : 'اختر الإمبراطور الذي تريد تخمين كلمته.'),
        !over ? h('div', { class: 'em-bar' }, h('span', { class: 'em-turn', style: { '--ec': color(att.id) } }, h('span', { html: PG.icon('crown') }), att.name), timerEl) : null,
        h('div', { class: 'em-grid' }, emperors().map(empCard)),
        ctx.setting('showList') || over ? h('div', null, h('h3', { class: 'em-sub' }, 'الكلمات'), wordsList(false)) : null,
        over ? h('div', null, h('h3', { class: 'em-sub' }, 'من كتب ماذا؟'), h('div', { class: 'em-words' }, s.players.map((p) => h('span', { class: 'em-w' }, p.word, h('small', null, p.name))))) : null,
        wins.length ? h('div', null, h('h3', { class: 'em-sub' }, 'الانتصارات'), h('div', { class: 'em-wins' }, wins.sort((a, b) => s.wins[b] - s.wins[a]).map((n) => h('span', { class: 'tag' }, '👑 ' + n + ': ' + s.wins[n])))) : null,
        s.log.length ? h('details', { class: 'em-log glass' }, h('summary', null, 'سجل اللعبة'), h('ol', null, s.log.map((m) => h('li', null, m)))) : null);
    },
  });
})();
