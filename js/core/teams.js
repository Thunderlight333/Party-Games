/* نظام الفرق الديناميكي: أي عدد فرق، اسم ولون لكل فريق، لاعبين قابلين للنقل */
(function () {
  'use strict';
  const PG = window.PG, { h, uid } = PG.util;
  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#14b8a6', '#ec4899', '#64748b', '#84cc16'];
  const NAMES = ['الصقور', 'النمور', 'الذئاب', 'النسور', 'الفهود', 'الأسود', 'الخيول', 'الدلافين', 'البروق', 'النجوم'];
  const countAr = (n) => (n === 1 ? 'فريق واحد' : n === 2 ? 'فريقين' : n + ' فرق');

  const T = (PG.teams = {
    COLORS,
    list: () => PG.store.state.teams,
    get: (id) => T.list().find((t) => t.id === id),
    changed() { PG.store.save(); PG.bus.emit('teams'); },
    add() {
      const used = new Set(T.list().map((t) => t.color)), names = new Set(T.list().map((t) => t.name));
      const t = {
        id: uid('t'),
        name: NAMES.find((n) => !names.has(n)) || 'فريق ' + (T.list().length + 1),
        color: COLORS.find((c) => !used.has(c)) || '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
        players: [],
      };
      T.list().push(t); T.changed(); return t;
    },
    remove(id) { PG.store.state.teams = T.list().filter((t) => t.id !== id); T.changed(); },
    addPlayer(teamId, name) { name = String(name || '').trim(); const t = T.get(teamId); if (!name || !t) return; t.players.push({ id: uid('p'), name }); T.changed(); },
    removePlayer(pid) { T.list().forEach((t) => (t.players = t.players.filter((p) => p.id !== pid))); T.changed(); },
    findPlayer(pid) { for (const t of T.list()) { const p = t.players.find((x) => x.id === pid); if (p) return { team: t, player: p }; } return null; },
    movePlayer(pid, toId) {
      const f = T.findPlayer(pid), to = T.get(toId);
      if (!f || !to || f.team === to) return;
      f.team.players = f.team.players.filter((p) => p.id !== pid); to.players.push(f.player); T.changed();
    },
    allPlayers: () => T.list().flatMap((t) => t.players.map((p) => Object.assign({ teamId: t.id }, p))),
    shuffleDistribute() {
      const ps = PG.util.shuffle(T.list().flatMap((t) => t.players)), list = T.list();
      list.forEach((t) => (t.players = []));
      ps.forEach((p, i) => list[i % list.length].players.push(p));
      T.changed();
    },

    /* نافذة إدارة الفرق. opts: {min, max, recommended, title} */
    openManager(opts = {}) {
      const m = PG.ui.modal({ title: opts.title || 'الفرق واللاعبين', size: 'lg', body: h('div'), actions: [{ label: 'تم', cls: 'primary', icon: 'check' }] });
      const render = () => {
        const list = T.list(), wrap = h('div', { class: 'team-manager' });
        if (opts.recommended) wrap.append(h('div', { class: 'hint' }, `💡 يُنصح بلعب هذه اللعبة بـ ${countAr(opts.recommended)}.`, list.length !== opts.recommended ? ` (لديك الآن ${countAr(list.length)})` : ''));
        if (opts.min && list.length < opts.min) wrap.append(h('div', { class: 'hint warn' }, `تحتاج هذه اللعبة ${countAr(opts.min)} على الأقل.`));
        const grid = h('div', { class: 'team-grid' });
        list.forEach((t) => {
          const card = h('div', { class: 'team-card', style: { '--tc': t.color },
            ondragover: (e) => { e.preventDefault(); card.classList.add('drop'); },
            ondragleave: () => card.classList.remove('drop'),
            ondrop: (e) => { e.preventDefault(); card.classList.remove('drop'); const pid = e.dataTransfer.getData('text/plain'); if (pid) { T.movePlayer(pid, t.id); PG.audio.play('pop'); render(); } } });
          const color = h('input', { type: 'color', value: t.color, 'aria-label': 'لون الفريق',
            oninput: (e) => { t.color = e.target.value; card.style.setProperty('--tc', t.color); },
            onchange: () => { T.changed(); render(); } });
          const head = h('div', { class: 'team-head' },
            h('label', { class: 'swatch', title: 'اختيار لون مخصص' }, color),
            h('input', { class: 'input team-name', value: t.name, maxlength: 24, 'aria-label': 'اسم الفريق',
              oninput: (e) => { t.name = e.target.value; PG.store.save(); }, onchange: () => T.changed() }),
            h('button', { type: 'button', class: 'btn icon ghost danger-text', title: 'حذف الفريق', html: PG.icon('trash'),
              onclick: async () => {
                if (list.length <= 1) return PG.ui.toast('يجب أن يبقى فريق واحد على الأقل', 'error');
                if (!(await PG.ui.confirm(`حذف «${t.name}»${t.players.length ? ' ومن فيه من لاعبين' : ''}؟`, { danger: true, ok: 'حذف' }))) return;
                T.remove(t.id); render();
              } }));
          const dots = h('div', { class: 'color-dots' }, COLORS.map((c) => h('button', { type: 'button', class: 'dot' + (c === t.color ? ' on' : ''), style: { background: c }, 'aria-label': 'لون ' + c,
            onclick: () => { t.color = c; T.changed(); render(); } })));
          const players = h('div', { class: 'players' });
          t.players.forEach((p) => {
            const sel = h('select', { class: 'move-select', title: 'نقل إلى فريق آخر',
              onchange: (e) => { if (e.target.value) { T.movePlayer(p.id, e.target.value); PG.audio.play('pop'); render(); } } },
              h('option', { value: '' }, 'نقل ⇄'), list.filter((o) => o.id !== t.id).map((o) => h('option', { value: o.id }, o.name)));
            players.append(h('div', { class: 'player-chip', draggable: 'true', ondragstart: (e) => e.dataTransfer.setData('text/plain', p.id) },
              h('span', { class: 'pname' }, p.name), list.length > 1 ? sel : null,
              h('button', { type: 'button', class: 'x', 'aria-label': 'حذف اللاعب', html: PG.icon('x'), onclick: () => { T.removePlayer(p.id); render(); } })));
          });
          if (!t.players.length) players.append(h('div', { class: 'empty' }, 'لا يوجد لاعبون بعد'));
          const inp = h('input', { class: 'input', placeholder: 'اسم لاعب جديد', maxlength: 20, dataset: { add: t.id }, onkeydown: (e) => { if (e.key === 'Enter') addP(); } });
          const addP = () => {
            if (!inp.value.trim()) return;
            T.addPlayer(t.id, inp.value); render();
            const el = m.body.querySelector(`[data-add="${t.id}"]`); el && el.focus();
          };
          card.append(head, dots, players, h('div', { class: 'add-row' }, inp, PG.ui.btn('', { icon: 'plus', cls: 'icon', title: 'إضافة لاعب', onClick: addP })));
          grid.append(card);
        });
        wrap.append(grid, h('div', { class: 'row wrap' },
          PG.ui.btn('إضافة فريق', { icon: 'plus', cls: 'primary', onClick: () => {
            if (opts.max && list.length >= opts.max) return PG.ui.toast(`الحد الأقصى لهذه اللعبة ${countAr(opts.max)}`, 'error');
            T.add(); PG.audio.play('pop'); render();
          } }),
          PG.ui.btn('توزيع اللاعبين عشوائياً', { icon: 'shuffle', cls: 'ghost', onClick: async () => {
            if (!T.allPlayers().length) return PG.ui.toast('أضف لاعبين أولاً');
            if (await PG.ui.confirm('سيتم خلط جميع اللاعبين وتوزيعهم على الفرق بالتساوي. متابعة؟')) { T.shuffleDistribute(); PG.audio.play('whoosh'); render(); }
          } })),
          h('p', { class: 'muted small' }, 'لنقل لاعب: اختر الفريق من قائمة «نقل»، أو اسحبه وأفلته على فريق آخر.'));
        m.setBody(wrap);
      };
      render();
      return m;
    },

    /* لوحة نقاط. scores = {teamId: n} */
    scoreboard(scores, { teams = null, active = null, step = 1, onChange } = {}) {
      return h('div', { class: 'scoreboard' }, (teams || T.list()).map((t) =>
        h('div', { class: 'score-card glass' + (t.id === active ? ' active' : ''), style: { '--tc': t.color } },
          h('div', { class: 'sc-name' }, t.name),
          h('div', { class: 'sc-score' }, String(scores[t.id] || 0)),
          onChange ? h('div', { class: 'sc-btns' },
            h('button', { type: 'button', class: 'btn icon sm', 'aria-label': 'إنقاص', html: PG.icon('minus'), onclick: () => onChange(t.id, -step) }),
            h('button', { type: 'button', class: 'btn icon sm', 'aria-label': 'زيادة', html: PG.icon('plus'), onclick: () => onChange(t.id, step) })) : null,
          t.players.length ? h('div', { class: 'sc-players' }, t.players.map((p) => p.name).join('، ')) : null)));
    },
  });
})();
