/* مافيا: تمرير الجهاز بالكامل (بدون مقدّم). كشف الأدوار ← ليل يمر فيه الجهاز على كل اللاعبين الأحياء
   (حتى بدون مهمة، حتى ما ينكشف أحد من مدة إمساكه) ← صباح ← نقاش ← تصويت ← حكم ← فحص الفوز. */
(function () {
  'use strict';
  const PG = window.PG, { h, shuffle, uid } = PG.util;

  /* ---------- رسومات الأدوار (48×48، تعبئة بلون أبيض فوق خلفية الدور) ---------- */
  const HAT = '<path d="M5 31.5c5 3.6 33 3.6 38 0-2 4.8-9.4 7-19 7s-17-2.2-19-7z"/><path d="M12.5 31l3.2-14.6c.6-2.8 3.4-4 5.6-2.5L24 15.8l2.7-1.9c2.2-1.5 5-.3 5.6 2.5L35.5 31c-7.4 2.3-15.6 2.3-23 0z"/><path d="M13.7 25.6c6.8 1.9 13.8 1.9 20.6 0l-.8 3.7c-6.3 1.7-12.7 1.7-19 0z" fill="#000" opacity=".35"/>';
  const ART = {
    mafia: HAT,
    godfather: '<g transform="translate(0 4)">' + HAT + '</g><path d="M16 10.5l3.6 3 4.4-5.5 4.4 5.5 3.6-3-1.4 6.5H17.4z"/>',
    silencer: '<circle cx="24" cy="22" r="14" opacity=".9"/><g fill="#000" opacity=".45"><circle cx="18.5" cy="19" r="2.2"/><circle cx="29.5" cy="19" r="2.2"/></g><g transform="rotate(-12 24 28)"><rect x="12" y="24.5" width="24" height="7" rx="1.6" fill="#000" opacity=".55"/><path d="M14 26l4 3.5M18 26l-4 3.5M30 26l4 3.5M34 26l-4 3.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g><path d="M14 38c2.5 3 17.5 3 20 0" opacity=".5"/>',
    citizen: '<circle cx="24" cy="16" r="7.5"/><path d="M9.5 40c1.4-8.4 7-13 14.5-13s13.1 4.6 14.5 13c-9.5 2.4-19.5 2.4-29 0z"/>',
    doctor: '<path fill-rule="evenodd" d="M24 41C14 34 6.5 27.5 6.5 19.2 6.5 13.6 10.8 9.5 16 9.5c3.4 0 6.3 1.8 8 4.5 1.7-2.7 4.6-4.5 8-4.5 5.2 0 9.5 4.1 9.5 9.7C41.5 27.5 34 34 24 41zM21.5 15.5v5h-5v5h5v5h5v-5h5v-5h-5v-5z"/>',
    detective: '<path fill-rule="evenodd" d="M20 6.5a13.5 13.5 0 1 1 0 27 13.5 13.5 0 0 1 0-27zm0 4.2a9.3 9.3 0 1 0 0 18.6 9.3 9.3 0 0 0 0-18.6z"/><path d="M29.6 30.4l3-3 9.4 9.4a2.1 2.1 0 0 1 0 3l-.1.1a2.1 2.1 0 0 1-3 0z"/><path d="M13.5 20s2.6-4.4 6.5-4.4 6.5 4.4 6.5 4.4-2.6 4.4-6.5 4.4-6.5-4.4-6.5-4.4z" opacity=".7"/><circle cx="20" cy="20" r="1.9" fill="#000" opacity=".5"/>',
    guard: '<path fill-rule="evenodd" d="M24 5l15 5.5v10.2C39 30.5 32.6 38.6 24 43 15.4 38.6 9 30.5 9 20.7V10.5zm0 9.2l2.3 4.8 5.2.6-3.9 3.6 1 5.2-4.6-2.6-4.6 2.6 1-5.2-3.9-3.6 5.2-.6z"/>',
    witch: '<path d="M19 6.5h10v2.5h-1.6v8.4c6.3 2 10.6 7.6 10.6 14.1C38 39.5 31.7 44 24 44s-14-4.5-14-12.5c0-6.5 4.3-12.1 10.6-14.1V9H19z"/><path d="M11.3 30c4.4 2.6 21 2.6 25.4 0 .2.5.3 1 .3 1.5C37 38 31.2 41.5 24 41.5S11 38 11 31.5c0-.5.1-1 .3-1.5z" fill="#000" opacity=".3"/><g fill="#000" opacity=".35"><circle cx="20" cy="35" r="2"/><circle cx="27" cy="33" r="1.4"/><circle cx="25" cy="37.6" r="1.1"/></g><circle cx="31" cy="12" r="1.6" opacity=".7"/><circle cx="34.5" cy="7.5" r="1.1" opacity=".5"/>',
    hunter: '<path fill-rule="evenodd" d="M24 8a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm0 4a12 12 0 1 0 0 24 12 12 0 0 0 0-24z"/><path d="M22.2 3h3.6v11h-3.6zM22.2 34h3.6v11h-3.6zM3 22.2h11v3.6H3zM34 22.2h11v3.6H34z"/><circle cx="24" cy="24" r="3"/>',
    mayor: '<path d="M14 4h7l3 9 3-9h7l-6.5 14h-7z" opacity=".75"/><circle cx="24" cy="30" r="13"/><path d="M24 22.3l2.3 4.7 5.2.8-3.8 3.6.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.6 5.2-.8z" fill="#000" opacity=".4"/>',
    jester: '<path d="M24 15c-6-6.5-14-8-20.5-4 4.5.6 7.6 3.7 8.6 8.6L14 31h20l1.9-11.4c1-4.9 4.1-8 8.6-8.6C38 7 30 8.5 24 15z"/><path d="M24 15c-1.8 4.4-3 9.6-3.3 16h6.6C27 24.6 25.8 19.4 24 15z" fill="#000" opacity=".22"/><circle cx="3.5" cy="11" r="3.2"/><circle cx="44.5" cy="11" r="3.2"/><path d="M11 30.5h26a3 3 0 0 1 0 6H11a3 3 0 0 1 0-6z"/><g fill="#000" opacity=".35"><path d="M16 33.5l2-1.8 2 1.8-2 1.8zM22 33.5l2-1.8 2 1.8-2 1.8zM28 33.5l2-1.8 2 1.8-2 1.8z"/></g><path d="M17 39.5c3.5 3.4 10.5 3.4 14 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    killer: '<path d="M26.4 4.5L38 16.1 22.8 31.3l-6.1-6.1z"/><path d="M26.4 4.5L38 16.1l-3 1.2L27.6 9.9z" fill="#000" opacity=".25"/><path d="M12.5 26.6l3.4-3.4 8.9 8.9-3.4 3.4z"/><path d="M14.6 31.3l2.1 2.1-7.6 7.6a1.5 1.5 0 0 1-2.1 0l-.1-.1a1.5 1.5 0 0 1 0-2.1z"/>',
    moon: '<path d="M30 6a17 17 0 1 0 12 25.5A14 14 0 0 1 30 6z"/>',
    sun: '<circle cx="24" cy="24" r="9"/><g stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2"/></g>',
    skull: '<path fill-rule="evenodd" d="M24 5c9.4 0 16 6.6 16 15.4 0 5.3-2.4 8.9-6 11.1V37a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3v-5.5c-3.6-2.2-6-5.8-6-11.1C8 11.6 14.6 5 24 5zm-6.5 13.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm13 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM24 26.5l-2.5 4.5h5z"/><path d="M19 34v6M24 34v6M29 34v6" stroke="#000" stroke-width="1.6" opacity=".35"/>',
    vote: '<path d="M8 22h32v18a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z"/><path d="M15 6h18v16H15z" opacity=".8"/><path d="M19 13.5l3.5 3.5 6.5-7" stroke="#000" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/><rect x="14" y="24.5" width="20" height="3" rx="1.5" fill="#000" opacity=".35"/>',
  };
  const art = (k) => `<svg viewBox="0 0 48 48" fill="#fff" aria-hidden="true">${ART[k] || ''}</svg>`;

  /* ---------- الأدوار ---------- */
  const ROLES = {
    citizen: { n: 'مواطن', side: 'town', w: 1, c: '#64748b', d: 'ما عندك قدرة خاصة. ركّز في النقاش واكشف المافيا بالتصويت.' },
    doctor: { n: 'الطبيب', side: 'town', w: 3, c: '#10b981', uniq: true, d: 'كل ليلة تختار لاعباً تنقذه من القتل. ما تقدر تختار نفس الشخص ليلتين متتاليتين، ونفسك مرة وحدة باللعبة.' },
    detective: { n: 'المحقق', side: 'town', w: 5, c: '#3b82f6', uniq: true, d: 'كل ليلة تفحص لاعباً وتعرف هل هو من المافيا. (العرّاب يظهر لك بريئاً)' },
    guard: { n: 'الحارس', side: 'town', w: 3, c: '#0ea5e9', uniq: true, d: 'كل ليلة تحرس لاعباً (غيرك). إذا انهاجم تموت أنت بداله. ما تحرس نفس الشخص ليلتين متتاليتين.' },
    witch: { n: 'الساحرة', side: 'town', w: 3, c: '#8b5cf6', uniq: true, d: 'معك جرعتان لكل اللعبة: جرعة حماية تنقذ لاعباً ليلة وحدة، وجرعة سم تقتل لاعباً. جرعة وحدة في الليلة.' },
    hunter: { n: 'القنّاص', side: 'town', w: 2, c: '#f97316', uniq: true, d: 'إذا متّ (بالليل أو بالتصويت) تختار لاعباً ياخذ رصاصتك ويموت معك.' },
    mayor: { n: 'العمدة', side: 'town', w: 2, c: '#eab308', uniq: true, d: 'تقدر بالليل تقرر تكشف نفسك الصباح؛ بعدها صوتك في التصويت بصوتين.' },
    mafia: { n: 'مافيا', side: 'mafia', w: -5, c: '#dc2626', night: true, d: 'تعرف زملاءك. كل ليلة تختارون ضحية (بالأغلبية). تفوزون إذا صار عددكم يساوي الباقين.' },
    godfather: { n: 'العرّاب', side: 'mafia', w: -7, c: '#b91c1c', uniq: true, d: 'زعيم المافيا: يظهر للمحقق بريئاً، وصوته يحسم تعادل اختيار الضحية.' },
    silencer: { n: 'المُسكِت', side: 'mafia', w: -6, c: '#9f1239', uniq: true, d: 'من المافيا. كل ليلة تشارك في اختيار الضحية وتسكّت لاعباً: ما يتكلم ولا يصوّت في اليوم التالي.' },
    jester: { n: 'المهرّج', side: 'neutral', w: -1, c: '#d946ef', uniq: true, d: 'محايد: تفوز لوحدك إذا طردوك بالتصويت. خلّهم يشكّون فيك!' },
    killer: { n: 'القاتل المتسلسل', side: 'neutral', w: -5, c: '#475569', uniq: true, d: 'محايد: تقتل لاعباً كل ليلة لحالك. تفوز إذا بقيت آخر واحد (أو مع لاعب واحد).' },
  };
  const ORDER = ['mafia', 'godfather', 'silencer', 'killer', 'jester', 'citizen', 'doctor', 'detective', 'guard', 'witch', 'hunter', 'mayor'];
  const SIDES = { town: { n: 'المدينة', c: '#22c55e' }, mafia: { n: 'المافيا', c: '#ef4444' }, neutral: { n: 'محايد', c: '#d946ef' } };
  const isMafia = (r) => ROLES[r] && ROLES[r].side === 'mafia';
  const score = (c) => Object.entries(c).reduce((a, [r, k]) => a + (ROLES[r] ? ROLES[r].w * k : 0), 0);
  const total = (c) => Object.values(c).reduce((a, b) => a + b, 0);

  /* توزيع موزون حسب العدد: الأدوار المتقدمة تنفتح تدريجياً */
  const TABLE = {
    5: { mafia: 1, doctor: 1, citizen: 3 },
    6: { mafia: 2, doctor: 1, detective: 1, citizen: 2 },
    7: { mafia: 2, doctor: 1, detective: 1, citizen: 3 },
    8: { godfather: 1, mafia: 1, doctor: 1, detective: 1, jester: 1, citizen: 3 },
    9: { godfather: 1, mafia: 1, doctor: 1, detective: 1, guard: 1, jester: 1, citizen: 3 },
    10: { godfather: 1, mafia: 2, doctor: 1, detective: 1, guard: 1, hunter: 1, witch: 1, jester: 1, citizen: 1 },
    11: { godfather: 1, silencer: 1, mafia: 1, doctor: 1, detective: 1, guard: 1, hunter: 1, witch: 1, jester: 1, citizen: 2 },
    12: { godfather: 1, silencer: 1, mafia: 1, doctor: 1, detective: 1, guard: 1, hunter: 1, witch: 1, mayor: 1, jester: 1, citizen: 2 },
    13: { godfather: 1, silencer: 1, mafia: 1, killer: 1, doctor: 1, detective: 1, guard: 1, hunter: 1, witch: 1, mayor: 1, jester: 1, citizen: 2 },
  };
  const preset = (n) => {
    if (n < 5) return { mafia: 1, citizen: Math.max(0, n - 1) };
    const c = Object.assign({}, TABLE[Math.min(n, 13)]);
    for (let k = 14; k <= n; k++) { if (score(c) >= 3) c.mafia = (c.mafia || 0) + 1; else c.citizen = (c.citizen || 0) + 1; }
    return c;
  };

  const fromTeams = () => PG.teams.list().flatMap((t) => t.players.map((p) => p.name));
  const fresh = (names) => ({ phase: 'setup', players: names.map((n) => ({ id: uid('m'), name: n })), auto: true, counts: {}, log: [], wins: {}, games: 0 });

  PG.games.register({
    id: 'mafia', title: 'مافيا', category: 'deduction', icon: 'mafia', color: '#dc2626', mode: 'تمرير الجهاز', ready: true,
    desc: '12 دوراً بتوزيع موزون، ليل سرّي بتمرير الجهاز، نهار ونقاش وتصويت.',
    settings: [
      { key: 'dayTime', label: 'وقت النقاش (ثانية)', hint: 'مؤقت النهار قبل التصويت', type: 'number', min: 30, max: 600, step: 30, default: 180 },
      { key: 'vote', label: 'طريقة التصويت', hint: 'جماعي: ترفعون أيديكم وتختارون المطرود. سري: كل لاعب حي يصوّت على الجهاز', type: 'select', default: 'secret',
        options: [{ value: 'group', label: 'جماعي' }, { value: 'secret', label: 'سري' }] },
      { key: 'tie', label: 'عند تعادل الأصوات', hint: 'إعادة: تصويت ثاني بين المتعادلين فقط، وإذا تعادلوا مرة ثانية ما أحد يطلع', type: 'select', default: 'revote',
        options: [{ value: 'revote', label: 'إعادة' }, { value: 'none', label: 'ما أحد يطلع' }] },
      { key: 'reveal', label: 'كشف دور الميت', hint: 'الدور كامل، أو الفريق فقط (مدينة/مافيا/محايد)، أو بدون كشف حتى نهاية اللعبة', type: 'select', default: 'role',
        options: [{ value: 'role', label: 'الدور' }, { value: 'side', label: 'الفريق' }, { value: 'none', label: 'بدون' }] },
      { key: 'suspect', label: 'سؤال الشك بالليل', hint: 'اللي ما عندهم مهمة يختارون أكثر واحد يشكّون فيه، ويُعلن الأكثر صباحاً بدون أسماء المصوّتين', type: 'toggle', default: true },
      { key: 'lastWords', label: 'كلمة أخيرة', hint: 'المطرود بالتصويت يقدر يتكلم قبل ما يطلع', type: 'toggle', default: true },
    ],
    newSession() { return fresh(fromTeams()); },

    mount(root, ctx) {
      const s = ctx.session, save = () => ctx.save(), rr = () => { save(); ctx.rerender(); };
      const add = (...n) => root.append(...n.filter(Boolean));
      const P = (id) => s.players.find((p) => p.id === id);
      const alive = () => s.players.filter((p) => p.alive);
      const log = (m) => { s.log.unshift(m); s.log.length = Math.min(s.log.length, 120); };
      const R = (p) => ROLES[p.role];
      const emb = (key, color, cls = '') => h('div', { class: 'mf-emb ' + cls, style: { '--rc': color }, html: art(key) });
      const roleEmb = (r, cls) => emb(r, ROLES[r].c, cls);
      const tag = (r) => h('span', { class: 'mf-rtag', style: { '--rc': ROLES[r].c } }, ROLES[r].n);
      const deadText = (p) => {
        const m = ctx.setting('reveal');
        return m === 'role' ? ROLES[p.role].n : m === 'side' ? SIDES[R(p).side].n : '؟';
      };
      const head = (title, sub, extra) => h('div', { class: 'mf-head glass' },
        h('div', null, h('b', null, title), sub ? h('p', { class: 'muted small' }, sub) : null),
        h('div', { class: 'row wrap' }, extra || null,
          !['setup', 'roles', 'reveal'].includes(s.phase) ? PG.ui.btn('شوف دورك', { icon: 'eye', cls: 'ghost sm', onClick: peek }) : null,
          s.phase !== 'setup' ? PG.ui.btn(s.phase === 'over' ? 'لعبة جديدة' : 'من جديد', { icon: 'shuffle', cls: s.phase === 'over' ? 'primary sm' : 'ghost sm', onClick: restart }) : null));
      const dots = (n, at) => h('div', { class: 'os-dots' }, Array.from({ length: n }, (_, i) => h('i', { class: i < at ? 'done' : i === at ? 'now' : '' })));

      const restart = async () => {
        if (s.phase !== 'over' && !(await PG.ui.confirm('سيتم إلغاء اللعبة الحالية والرجوع لاختيار الأدوار. متابعة؟', { title: 'لعبة جديدة', ok: 'متابعة', danger: true }))) return;
        s.phase = 'roles'; s.players.forEach((p) => { delete p.role; p.alive = true; }); PG.audio.play('whoosh'); rr();
      };

      /* بطاقة الدور */
      const mates = (p) => s.players.filter((q) => q.id !== p.id && isMafia(q.role));
      const roleCard = (p) => {
        const r = R(p), side = SIDES[r.side];
        return h('div', { class: 'mf-card', style: { '--rc': r.c } },
          h('div', { class: 'mf-card-glow' }),
          roleEmb(p.role, 'xl pop'),
          h('span', { class: 'mf-side', style: { '--sc': side.c } }, side.n),
          h('h2', null, r.n),
          h('p', { class: 'mf-desc' }, r.d),
          isMafia(p.role) && mates(p).length ? h('div', { class: 'mf-mates' }, h('small', null, 'زملاؤك في المافيا'),
            h('div', { class: 'mf-mate-list' }, mates(p).map((q) => h('span', { class: 'mf-mate' + (q.alive === false ? ' dead' : '') }, q.name, tag(q.role))))) : null);
      };
      function peek() {
        const m = PG.ui.modal({ title: 'شوف دورك', size: 'sm',
          body: h('div', { class: 'os-peek' }, h('p', { class: 'muted' }, 'اختر اسمك، وتأكد ما أحد يشوف الشاشة'),
            h('div', { class: 'os-pick' }, s.players.map((p) => h('button', { type: 'button', class: 'btn', onclick: () => {
              m.setBody(h('div', { class: 'os-peek' }, roleCard(p), PG.ui.btn('تم، أخفِ', { icon: 'check', cls: 'primary', onClick: () => m.close() })));
            } }, p.name)))) });
      }
      const guide = () => PG.ui.modal({ title: 'دليل الأدوار', body: h('div', { class: 'mf-guide' }, ORDER.map((r) => h('div', { class: 'mf-gi' }, roleEmb(r, 'sm'),
        h('div', null, h('b', null, ROLES[r].n, ' ', h('span', { class: 'mf-side', style: { '--sc': SIDES[ROLES[r].side].c } }, SIDES[ROLES[r].side].n)), h('p', { class: 'muted small' }, ROLES[r].d))))) });

      /* ---------- 1) اللاعبون ---------- */
      if (s.phase === 'setup') {
        const inp = h('input', { class: 'input', placeholder: 'اسم اللاعب', maxlength: 24, onkeydown: (e) => { if (e.key === 'Enter') addP(); } });
        const addP = () => { const n = inp.value.trim(); if (!n) return; s.players.push({ id: uid('m'), name: n }); inp.value = ''; rr(); setTimeout(() => root.querySelector('.os-add .input')?.focus(), 0); };
        add(h('div', { class: 'mf-hero' }, emb('mafia', '#dc2626', 'xl pop'), h('div', null, h('h2', null, 'مافيا'), h('p', { class: 'muted' }, 'المدينة تنام... والمافيا تصحى. يلزم 5 لاعبين على الأقل (حتى 20).'))),
          h('div', { class: 'os-players glass' },
            h('div', { class: 'os-chips' }, s.players.length ? s.players.map((p, i) => h('span', { class: 'player-chip' }, h('i', { class: 'mf-seat' }, String(i + 1)), p.name,
              h('button', { type: 'button', class: 'x', 'aria-label': 'حذف', html: PG.icon('x'), onclick: () => { s.players = s.players.filter((x) => x.id !== p.id); rr(); } })))
              : h('span', { class: 'empty' }, 'لا يوجد لاعبون بعد.')),
            h('div', { class: 'row os-add' }, inp, PG.ui.btn('إضافة', { icon: 'plus', onClick: addP })),
            h('div', { class: 'row wrap' },
              PG.ui.btn('جلب أسماء الفرق', { icon: 'users', cls: 'ghost', onClick: () => {
                const have = new Set(s.players.map((p) => p.name)); fromTeams().forEach((n) => { if (!have.has(n)) s.players.push({ id: uid('m'), name: n }); }); rr();
              } }),
              s.players.length > 1 ? PG.ui.btn('ترتيب عشوائي', { icon: 'shuffle', cls: 'ghost', onClick: () => { s.players = shuffle(s.players); rr(); } }) : null,
              s.players.length ? PG.ui.btn('مسح الكل', { icon: 'trash', cls: 'ghost', onClick: async () => { if (await PG.ui.confirm('حذف كل اللاعبين؟', { danger: true, ok: 'حذف' })) { s.players = []; rr(); } } }) : null),
            h('p', { class: 'muted small' }, 'الترقيم = ترتيب الجلوس، والجهاز يمر بهذا الترتيب.')),
          h('div', { class: 'os-go' }, PG.ui.btn('التالي: الأدوار', { icon: 'arrowL', cls: 'primary', onClick: () => {
            if (s.players.length < 5) return PG.ui.toast('يلزم 5 لاعبين على الأقل');
            if (s.players.length > 20) return PG.ui.toast('الحد الأقصى 20 لاعباً');
            s.phase = 'roles'; PG.audio.play('whoosh'); rr();
          } })));
        return;
      }

      /* ---------- 2) الأدوار ---------- */
      if (s.phase === 'roles') {
        const n = s.players.length;
        if (s.auto || !total(s.counts)) s.counts = preset(n);
        const c = s.counts, sc = score(c), tot = total(c);
        const killers = (c.mafia || 0) + (c.godfather || 0) + (c.silencer || 0);
        const pos = Math.max(-12, Math.min(12, sc));
        const lean = Math.abs(sc) <= 3 ? ['متوازنة', '#22c55e'] : sc > 0 ? ['تميل للمدينة', '#3b82f6'] : ['تميل للمافيا', '#ef4444'];
        const setC = (r, d) => {
          const v = Math.max(0, (c[r] || 0) + d);
          if (ROLES[r].uniq && v > 1) return;
          c[r] = v; s.auto = false; PG.audio.play('click'); rr();
        };
        const row = (r) => h('div', { class: 'mf-rrow' + (c[r] ? ' on' : ''), style: { '--rc': ROLES[r].c } }, roleEmb(r, 'sm'),
          h('div', { class: 'mf-rinfo' }, h('b', null, ROLES[r].n), h('small', null, `${ROLES[r].w > 0 ? '+' : ''}${ROLES[r].w}`)),
          h('div', { class: 'stepper' },
            h('button', { type: 'button', class: 'btn icon', 'aria-label': 'إنقاص', html: PG.icon('minus'), onclick: () => setC(r, -1) }),
            h('span', { class: 'stepper-val' }, String(c[r] || 0)),
            h('button', { type: 'button', class: 'btn icon', 'aria-label': 'زيادة', html: PG.icon('plus'), onclick: () => setC(r, 1) })));
        const deal = () => {
          if (tot !== n) return PG.ui.toast(`عدد الأدوار (${tot}) لازم يساوي عدد اللاعبين (${n})`, 'error');
          if (!killers) return PG.ui.toast('لازم يكون فيه عضو مافيا واحد على الأقل', 'error');
          const bag = shuffle(Object.entries(c).flatMap(([r, k]) => Array(k).fill(r)));
          s.players.forEach((p, i) => { p.role = bag[i]; p.alive = true; });
          Object.assign(s, { phase: 'reveal', ri: 0, showing: false, night: 0, day: 0, mem: { docLast: null, docSelf: false, guardLast: null, heal: false, poison: false, mayor: false }, silenced: null, report: null, cands: null, log: [] });
          log(`🎭 بدأت لعبة جديدة بـ${n} لاعبين`); PG.audio.play('whoosh'); rr();
        };
        add(head('الأدوار', `${n} لاعبين — التوزيع ${s.auto ? 'التلقائي الموزون' : 'اليدوي'}`, PG.ui.btn('دليل الأدوار', { icon: 'eye', cls: 'ghost sm', onClick: guide })),
          h('div', { class: 'mf-bal glass' },
            h('div', { class: 'seg' }, ['auto', 'manual'].map((m) => h('button', { type: 'button', class: 'seg-btn' + ((m === 'auto') === !!s.auto ? ' on' : ''), onclick: () => { s.auto = m === 'auto'; if (s.auto) s.counts = preset(n); rr(); } }, m === 'auto' ? 'تلقائي' : 'يدوي'))),
            h('div', { class: 'mf-meter' },
              h('div', { class: 'mf-meter-bar' }, h('span', { class: 'mf-meter-dot', style: { insetInlineStart: `${50 - (pos / 12) * 50}%`, background: lean[1] } })),
              h('div', { class: 'mf-meter-lbl' }, h('small', null, 'المدينة'), h('b', { style: { color: lean[1] } }, `${lean[0]} (${sc > 0 ? '+' : ''}${sc})`), h('small', null, 'المافيا'))),
            h('p', { class: 'mf-count' + (tot === n ? '' : ' bad') }, `الأدوار: ${tot} / ${n}`)),
          h('div', { class: 'mf-roles' }, ['mafia', 'neutral', 'town'].map((sd) => h('div', { class: 'mf-rgroup glass' },
            h('h3', { style: { color: SIDES[sd].c } }, SIDES[sd].n),
            ORDER.filter((r) => ROLES[r].side === sd).map(row)))),
          h('div', { class: 'os-go' }, PG.ui.btn('تعديل اللاعبين', { icon: 'users', cls: 'ghost', onClick: () => { s.phase = 'setup'; rr(); } }),
            PG.ui.btn('وزّع الأدوار', { icon: 'shuffle', cls: 'primary', onClick: deal })));
        return;
      }

      /* ---------- 3) كشف الأدوار ---------- */
      if (s.phase === 'reveal') {
        const p = s.players[s.ri];
        const body = !s.showing
          ? h('div', { class: 'mf-pass glass' }, h('div', { class: 'mf-cardback' }, h('div', { html: art('mafia') })),
            h('p', { class: 'muted' }, 'أعطِ الجهاز إلى'), h('h2', null, p.name),
            PG.ui.btn('أنا ' + p.name + ' — اكشف دوري', { icon: 'eye', cls: 'primary', onClick: () => { s.showing = true; PG.audio.play('flip'); rr(); } }))
          : h('div', { class: 'mf-pass glass flip' }, roleCard(p),
            PG.ui.btn(s.ri + 1 < s.players.length ? 'تم، أخفِ ومرّر' : 'تم، تبدأ الليلة الأولى', { icon: 'check', cls: 'primary', onClick: () => {
              s.showing = false; s.ri++; PG.audio.play('pop');
              if (s.ri >= s.players.length) startNight();
              rr();
            } }));
        add(head('كشف الأدوار', `${s.ri} من ${s.players.length}`), dots(s.players.length, s.ri), body);
        return;
      }

      /* ---------- الليل ---------- */
      function startNight() {
        s.night++; s.phase = 'night'; s.ni = 0; s.nshow = false; s.acts = {}; s.silenced = null;
        log(`🌙 الليلة ${s.night}`); PG.audio.play('whoosh');
      }
      const target = (list, cur, onPick, opts = {}) => h('div', { class: 'mf-targets' }, list.map((q) => h('button', { type: 'button',
        class: 'mf-tg' + (cur === q.id ? ' on' : '') + (opts.dis && opts.dis(q) ? ' dis' : ''), disabled: !!(opts.dis && opts.dis(q)),
        onclick: () => { onPick(cur === q.id ? null : q.id); PG.audio.play('click'); } },
        h('i', { class: 'mf-tg-av' }, q.name.slice(0, 1)), h('span', null, q.name), opts.badge ? opts.badge(q) : null)));

      if (s.phase === 'night') {
        const order = alive();
        if (s.ni >= order.length) { resolveNight(); return rr(); }
        const p = order[s.ni], a = s.acts[p.id] || (s.acts[p.id] = {});
        const others = order.filter((q) => q.id !== p.id);
        const redraw = () => { save(); ctx.rerender(); };
        const done = () => { s.nshow = false; s.ni++; PG.audio.play('pop'); rr(); };
        let task, ok = true;
        const r = p.role;
        if (isMafia(r)) {
          const team = order.filter((q) => isMafia(q.role) && q.id !== p.id);
          const picks = {}; Object.entries(s.acts).forEach(([id, x]) => { if (x.kill && isMafia(P(id).role)) picks[x.kill] = (picks[x.kill] || []).concat(P(id).name); });
          task = h('div', { class: 'mf-task' },
            team.length ? h('p', { class: 'mf-hint' }, 'زملاؤك: ', team.map((q) => q.name + ' (' + ROLES[q.role].n + ')').join('، ')) : h('p', { class: 'mf-hint' }, 'أنت آخر واحد من المافيا'),
            h('h3', null, 'اختر الضحية'),
            target(order.filter((q) => !isMafia(q.role)), a.kill, (v) => { a.kill = v; redraw(); }, { badge: (q) => picks[q.id] ? h('small', { class: 'mf-pk' }, picks[q.id].join('، ')) : null }),
            r === 'silencer' ? [h('h3', null, 'من تسكّت بكرة؟'), target(others, a.sil, (v) => { a.sil = v; redraw(); })] : null);
          ok = !!a.kill;
        } else if (r === 'killer') {
          task = h('div', { class: 'mf-task' }, h('h3', null, 'من تقتل الليلة؟'), target(others, a.kill, (v) => { a.kill = v; redraw(); }));
          ok = !!a.kill;
        } else if (r === 'doctor') {
          const list = order.filter((q) => !(q.id === p.id && s.mem.docSelf));
          task = h('div', { class: 'mf-task' }, h('h3', null, 'من تنقذ الليلة؟'),
            target(list, a.save, (v) => { a.save = v; redraw(); }, { dis: (q) => q.id === s.mem.docLast }),
            s.mem.docLast && P(s.mem.docLast) ? h('p', { class: 'muted small' }, `ما تقدر تنقذ ${P(s.mem.docLast).name} ليلتين ورا بعض.`) : null);
          ok = !!a.save;
        } else if (r === 'guard') {
          task = h('div', { class: 'mf-task' }, h('h3', null, 'من تحرس الليلة؟'), target(others, a.guard, (v) => { a.guard = v; redraw(); }, { dis: (q) => q.id === s.mem.guardLast }));
          ok = !!a.guard;
        } else if (r === 'detective') {
          const res = a.inv && P(a.inv);
          task = h('div', { class: 'mf-task' }, h('h3', null, 'من تفحص الليلة؟'),
            res ? h('div', { class: 'mf-inv ' + (isMafia(res.role) && res.role !== 'godfather' ? 'bad' : 'good') }, emb(isMafia(res.role) && res.role !== 'godfather' ? 'mafia' : 'citizen', isMafia(res.role) && res.role !== 'godfather' ? '#dc2626' : '#22c55e', 'md pop'),
              h('b', null, res.name), h('span', null, isMafia(res.role) && res.role !== 'godfather' ? 'من المافيا!' : 'ليس من المافيا'))
              : target(others, null, (v) => { a.inv = v; PG.audio.play('reveal'); redraw(); }));
          ok = !!a.inv;
        } else if (r === 'witch') {
          const mode = a.mode || null;
          task = h('div', { class: 'mf-task' }, h('h3', null, 'جرعاتك'),
            h('div', { class: 'seg' }, [['none', 'بدون'], ['heal', 'حماية' + (s.mem.heal ? ' (مستخدمة)' : '')], ['poison', 'سم' + (s.mem.poison ? ' (مستخدم)' : '')]].map(([k, l]) =>
              h('button', { type: 'button', class: 'seg-btn' + ((mode || 'none') === k ? ' on' : ''), disabled: (k === 'heal' && s.mem.heal) || (k === 'poison' && s.mem.poison),
                onclick: () => { a.mode = k === 'none' ? null : k; a.t = null; redraw(); } }, l))),
            mode ? target(mode === 'heal' ? order : others, a.t, (v) => { a.t = v; redraw(); }) : h('p', { class: 'muted small' }, 'ما راح تستخدم شي الليلة.'));
          ok = !mode || !!a.t;
        } else {
          const extras = [];
          if (r === 'mayor' && !s.mem.mayor) extras.push(h('label', { class: 'mf-check' }, h('input', { type: 'checkbox', checked: !!a.reveal, onchange: (e) => { a.reveal = e.target.checked; save(); } }), 'اكشف إني العمدة الصباح (صوتي يصير بصوتين)'));
          task = h('div', { class: 'mf-task' }, h('p', { class: 'mf-hint' }, 'ما عندك مهمة الليلة. ' + (r === 'jester' ? 'تذكّر: هدفك إنهم يطردونك!' : r === 'hunter' ? 'إذا متّ تقدر تاخذ واحد معك.' : 'نم بهدوء...')), extras,
            ctx.setting('suspect') ? [h('h3', null, 'مين أكثر واحد تشك فيه؟'), target(others, a.sus, (v) => { a.sus = v; redraw(); })] : null);
        }
        const body = !s.nshow
          ? h('div', { class: 'mf-pass mf-night glass' }, h('div', { class: 'mf-stars' }, Array.from({ length: 14 }, (_, i) => h('i', { style: { '--x': `${(i * 37) % 100}%`, '--y': `${(i * 53) % 70}%`, '--d': `${(i % 5) * .4}s` } }))),
            emb('moon', '#4338ca', 'xl moon'), h('p', { class: 'muted' }, `الليلة ${s.night} — الكل مغمّض. أعطِ الجهاز إلى`), h('h2', null, p.name),
            PG.ui.btn('أنا ' + p.name, { icon: 'eye', cls: 'primary', onClick: () => { s.nshow = true; PG.audio.play('flip'); rr(); } }))
          : h('div', { class: 'mf-pass mf-night glass act' }, h('div', { class: 'mf-me' }, roleEmb(r, 'md'), h('div', null, h('small', { class: 'muted' }, p.name), h('b', null, ROLES[r].n))), task,
            PG.ui.btn(ok ? 'تم، أخفِ ومرّر' : 'اختر أولاً', { icon: 'check', cls: 'primary', onClick: () => ok ? done() : PG.ui.toast('اختر لاعباً أولاً') }));
        add(head(`الليلة ${s.night}`, `${s.ni} من ${order.length}`), dots(order.length, s.ni), body);
        return;
      }

      function kill(p, cause) {
        if (!p || !p.alive) return null;
        p.alive = false; return { id: p.id, cause };
      }
      function resolveNight() {
        const A = (role) => alive().filter((p) => p.role === role).map((p) => s.acts[p.id] || {});
        // ضحية المافيا بالأغلبية، والتعادل يحسمه العرّاب
        const tally = {}; let gf = null;
        alive().filter((p) => isMafia(p.role)).forEach((p) => { const t = (s.acts[p.id] || {}).kill; if (t) { tally[t] = (tally[t] || 0) + 1; if (p.role === 'godfather') gf = t; } });
        const max = Math.max(0, ...Object.values(tally)), tops = Object.keys(tally).filter((k) => tally[k] === max);
        const mafiaT = tops.length ? (tops.includes(gf) ? gf : tops[0]) : null;
        const killerT = (A('killer')[0] || {}).kill || null;
        const docT = (A('doctor')[0] || {}).save || null;
        const guardA = alive().find((p) => p.role === 'guard'), guardT = guardA ? (s.acts[guardA.id] || {}).guard : null;
        const w = A('witch')[0] || {};
        const healT = w.mode === 'heal' ? w.t : null, poisonT = w.mode === 'poison' ? w.t : null;
        const sil = (A('silencer')[0] || {}).sil || null;
        const prot = (id) => id === docT || id === healT;
        const deaths = [], saved = [];
        [[mafiaT, 'المافيا'], [killerT, 'القاتل المتسلسل']].forEach(([t, by]) => {
          if (!t || !P(t).alive) return;
          if (guardA && guardT === t && guardA.alive) { if (prot(guardA.id)) saved.push(t); else deaths.push(kill(guardA, `مات وهو يحرس (هجوم ${by})`)); return; }
          if (prot(t)) { saved.push(t); return; }
          deaths.push(kill(P(t), `قتلته ${by}`));
        });
        if (poisonT && P(poisonT).alive) deaths.push(kill(P(poisonT), 'مات مسموماً'));
        // ذاكرة القدرات
        const docP = s.players.find((p) => p.role === 'doctor');
        if (docT && docP && docT === docP.id) s.mem.docSelf = true;
        s.mem.docLast = docT; s.mem.guardLast = guardT;
        if (healT) s.mem.heal = true; if (poisonT) s.mem.poison = true;
        const mayorP = s.players.find((p) => p.role === 'mayor');
        const mayorRev = mayorP && mayorP.alive && (s.acts[mayorP.id] || {}).reveal && !s.mem.mayor;
        if (mayorRev) s.mem.mayor = mayorP.id;
        s.silenced = sil && P(sil).alive ? sil : null;
        // الشك
        const sus = {}; Object.values(s.acts).forEach((x) => { if (x.sus) sus[x.sus] = (sus[x.sus] || 0) + 1; });
        const sMax = Math.max(0, ...Object.values(sus)), sTop = Object.keys(sus).filter((k) => sus[k] === sMax && sMax > 0);
        s.report = { deaths: deaths.filter(Boolean), saved: saved.length > 0, mayor: mayorRev ? mayorP.id : null, sus: sTop.length === 1 ? { id: sTop[0], n: sMax } : null };
        s.report.deaths.forEach((d) => log(`💀 ${P(d.id).name} (${ROLES[P(d.id).role].n}) — ${d.cause}`));
        if (!s.report.deaths.length) log('🌅 ليلة بدون ضحايا');
        if (s.silenced) log(`🤐 ${P(s.silenced).name} مسكّت`);
        s.phase = 'dawn'; s.day++; s.shoot = s.report.deaths.filter((d) => P(d.id).role === 'hunter').map((d) => d.id); s.after = 'day';
        PG.audio.play(s.report.deaths.length ? 'buzzer' : 'reveal');
      }

      /* ---------- فحص الفوز ---------- */
      function winner() {
        const al = alive(), maf = al.filter((p) => isMafia(p.role)).length, k = al.some((p) => p.role === 'killer');
        if (!al.length) return 'draw';
        if (k && al.length <= 2) return 'killer';
        if (!k && !maf) return 'town';
        if (!k && maf >= al.length - maf) return 'mafia';
        return null;
      }
      const WIN = { town: ['فازت المدينة!', '#22c55e', 'citizen'], mafia: ['فازت المافيا!', '#ef4444', 'mafia'], killer: ['فاز القاتل المتسلسل!', '#94a3b8', 'killer'], jester: ['فاز المهرّج!', '#d946ef', 'jester'], draw: ['ما أحد فاز!', '#9ba1c6', 'skull'] };
      function end(w) {
        s.phase = 'over'; s.win = w; s.games++; s.wins[w] = (s.wins[w] || 0) + 1;
        log(`🏆 ${WIN[w][0]}`); PG.audio.play('win');
      }
      const afterDeaths = (next) => {
        if (s.shoot && s.shoot.length) { s.phase = 'shoot'; s.after = next; return; }
        const w = winner(); if (w) return end(w);
        if (next === 'day') { s.phase = 'day'; s.timer = PG.Timer.create(ctx.setting('dayTime')); s.vstart = false; }
        else startNight();
      };

      const deathCard = (d, i) => { const p = P(d.id); return h('div', { class: 'mf-death', style: { '--i': i } }, emb('skull', '#1f2937', 'md shake'),
        h('div', null, h('b', null, p.name), h('small', { class: 'muted' }, d.cause)), h('span', { class: 'mf-dtag' }, deadText(p))); };

      /* ---------- الصباح ---------- */
      if (s.phase === 'dawn') {
        const r = s.report;
        add(head(`صباح اليوم ${s.day}`, 'افتحوا عيونكم!'),
          h('div', { class: 'mf-dawn glass' }, emb('sun', '#f59e0b', 'xl sunrise'),
            r.deaths.length ? h('div', { class: 'mf-deaths' }, h('h3', null, r.deaths.length > 1 ? 'ضحايا الليلة' : 'ضحية الليلة'), r.deaths.map(deathCard))
              : h('h3', { class: 'mf-calm' }, r.saved ? 'محاولة قتل فاشلة — أحد انقذ الضحية! 🛡️' : 'ليلة هادئة... ما أحد مات'),
            r.deaths.length && r.saved ? h('p', { class: 'muted' }, 'وفيه شخص انهاجم لكنه انقذ.') : null,
            r.mayor ? h('div', { class: 'mf-note', style: { '--rc': ROLES.mayor.c } }, roleEmb('mayor', 'sm'), h('span', null, h('b', null, P(r.mayor).name), ' كشف إنه العمدة — صوته بصوتين.')) : null,
            s.silenced ? h('div', { class: 'mf-note', style: { '--rc': ROLES.silencer.c } }, roleEmb('silencer', 'sm'), h('span', null, h('b', null, P(s.silenced).name), ' مسكّت اليوم: ما يتكلم ولا يصوّت.')) : null,
            r.sus ? h('div', { class: 'mf-note', style: { '--rc': '#64748b' } }, emb('detective', '#64748b', 'sm'), h('span', null, 'أكثر واحد مشكوك فيه بالليل: ', h('b', null, P(r.sus.id).name), ` (${r.sus.n} أصوات)`)) : null,
            PG.ui.btn('ابدأ النهار', { icon: 'play', cls: 'primary', onClick: () => { afterDeaths('day'); rr(); } })));
        return;
      }

      /* ---------- القنّاص ---------- */
      if (s.phase === 'shoot') {
        const hp = P(s.shoot[0]);
        add(head('رصاصة القنّاص', `${hp.name} مات... بس ما راح يروح لحاله`),
          h('div', { class: 'mf-pass glass' }, roleEmb('hunter', 'xl pop'), h('h2', null, hp.name, ' هو القنّاص!'), h('p', { class: 'muted' }, 'أعطِ الجهاز للقنّاص يختار من ياخذ معه'),
            target(alive(), s.shotT, (v) => { s.shotT = v; save(); ctx.rerender(); }),
            h('div', { class: 'row wrap center' },
              PG.ui.btn('ما أبي أطلق', { cls: 'ghost', onClick: () => { s.shoot.shift(); s.shotT = null; afterDeaths(s.after); rr(); } }),
              PG.ui.btn('أطلق النار', { icon: 'check', cls: 'primary', onClick: () => {
                if (!s.shotT) return PG.ui.toast('اختر لاعباً');
                const t = P(s.shotT), d = kill(t, 'رصاصة القنّاص'); s.shoot.shift(); s.shotT = null;
                log(`🎯 القنّاص ${hp.name} أخذ معه ${t.name} (${ROLES[t.role].n})`); PG.audio.play('buzzer');
                if (t.role === 'hunter') s.shoot.push(t.id);
                s.lastShot = d; afterDeaths(s.after); rr();
              } }))));
        return;
      }

      /* ---------- النهار ---------- */
      const board = () => h('div', { class: 'mf-board' }, s.players.map((p) => h('div', { class: 'mf-pl' + (p.alive ? '' : ' dead') + (s.silenced === p.id && p.alive ? ' mute' : '') },
        h('i', { class: 'mf-tg-av' }, p.alive ? p.name.slice(0, 1) : h('span', { html: art('skull') })),
        h('span', null, p.name), !p.alive ? h('small', null, deadText(p)) : s.mem.mayor === p.id ? h('small', { class: 'mayor' }, 'العمدة ×2') : s.silenced === p.id ? h('small', null, '🤐 مسكّت') : null)));

      if (s.phase === 'day') {
        const tm = new PG.Timer(s.timer, { save, warnAt: 10 });
        ctx.onCleanup(() => tm.destroy());
        const al = alive();
        add(head(`النهار ${s.day}`, `${al.length} أحياء — ${al.filter((p) => isMafia(p.role)).length ? 'المافيا بينكم...' : ''}`),
          h('div', { class: 'mf-day glass' }, emb('sun', '#f59e0b', 'md'), h('div', null, h('b', null, 'وقت النقاش'), h('p', { class: 'muted small' }, 'اتهموا، دافعوا، وكشفوا الكذّاب. ' + (s.silenced && P(s.silenced).alive ? `${P(s.silenced).name} ما يتكلم اليوم.` : ''))), tm.el),
          board(),
          h('div', { class: 'os-go' },
            PG.ui.btn('تخطي التصويت', { cls: 'ghost', onClick: async () => { if (await PG.ui.confirm('ما أحد يطلع اليوم، ونروح لليل مباشرة؟', { ok: 'نعم' })) { tm.pause(); log(`☀️ اليوم ${s.day}: بدون تصويت`); afterDeaths('night'); rr(); } } }),
            PG.ui.btn('التصويت', { icon: 'check', cls: 'primary', onClick: () => { tm.pause(); s.phase = 'vote'; s.votes = {}; s.vi = 0; s.vshow = false; s.vsel = null; s.cands = null; PG.audio.play('whoosh'); rr(); } })));
        if (!s.vstart) { s.vstart = true; save(); tm.start(); }
        return;
      }

      /* ---------- التصويت ---------- */
      const weight = (id) => (s.mem.mayor === id ? 2 : 1);
      const decide = (counts) => {
        const max = Math.max(0, ...Object.values(counts)); if (!max) return { out: null };
        const tops = Object.keys(counts).filter((k) => counts[k] === max);
        return tops.length === 1 ? { out: tops[0] } : { tie: tops };
      };
      const verdict = (out) => {
        s.phase = 'verdict'; s.out = out || null; s.shoot = [];
        if (out) {
          const p = P(out); kill(p, 'طُرد بالتصويت'); log(`⚖️ اليوم ${s.day}: طُرد ${p.name} (${ROLES[p.role].n})`);
          if (p.role === 'hunter') s.shoot = [p.id];
          PG.audio.play('buzzer');
        } else { log(`⚖️ اليوم ${s.day}: ما أحد طلع`); PG.audio.play('wrong'); }
      };
      const onTie = (tops) => {
        if (ctx.setting('tie') === 'revote' && !s.cands) { s.cands = tops; s.votes = {}; s.vi = 0; s.vshow = false; s.vsel = null; PG.ui.toast('تعادل! إعادة التصويت بين المتعادلين'); PG.audio.play('whoosh'); }
        else verdict(null);
      };
      if (s.phase === 'vote') {
        const cands = s.cands ? s.cands.map(P).filter((p) => p.alive) : alive();
        const voters = alive().filter((p) => p.id !== s.silenced);
        if (ctx.setting('vote') === 'group') {
          add(head('التصويت' + (s.cands ? ' (إعادة)' : ''), 'ارفعوا أيديكم، واختاروا اللاعب اللي أخذ أكثر أصوات' + (s.mem.mayor && P(s.mem.mayor).alive ? ' — صوت العمدة بصوتين' : '')),
            h('div', { class: 'mf-pass glass' }, emb('vote', '#6366f1', 'lg pop'), target(cands, s.vsel, (v) => { s.vsel = v; save(); ctx.rerender(); }),
              h('div', { class: 'row wrap center' },
                PG.ui.btn('ما أحد', { cls: 'ghost', onClick: () => { verdict(null); rr(); } }),
                PG.ui.btn('اطرده', { icon: 'check', cls: 'primary', onClick: () => { if (!s.vsel) return PG.ui.toast('اختر لاعباً'); verdict(s.vsel); rr(); } }))));
          return;
        }
        if (s.vi >= voters.length) {
          const counts = {}; Object.entries(s.votes).forEach(([v, t]) => { if (t !== 'x') counts[t] = (counts[t] || 0) + weight(v); });
          const d = decide(counts); if (d.tie) onTie(d.tie); else verdict(d.out);
          return rr();
        }
        const v = voters[s.vi];
        const body = !s.vshow
          ? h('div', { class: 'mf-pass glass' }, emb('vote', '#6366f1', 'lg'), h('p', { class: 'muted' }, 'تصويت سري — أعطِ الجهاز إلى'), h('h2', null, v.name),
            PG.ui.btn('أنا ' + v.name, { icon: 'eye', cls: 'primary', onClick: () => { s.vshow = true; s.vsel = null; PG.audio.play('flip'); rr(); } }))
          : h('div', { class: 'mf-pass glass act' }, h('h3', null, 'من تطرد؟' + (weight(v.id) > 1 ? ' (صوتك بصوتين)' : '')),
            target(cands.filter((q) => q.id !== v.id), s.vsel, (t) => { s.vsel = t; save(); ctx.rerender(); }),
            h('div', { class: 'row wrap center' },
              PG.ui.btn('امتناع', { cls: 'ghost', onClick: () => { s.votes[v.id] = 'x'; s.vi++; s.vshow = false; PG.audio.play('pop'); rr(); } }),
              PG.ui.btn('صوّت وأخفِ', { icon: 'check', cls: 'primary', onClick: () => { if (!s.vsel) return PG.ui.toast('اختر لاعباً أو امتنع'); s.votes[v.id] = s.vsel; s.vi++; s.vshow = false; PG.audio.play('pop'); rr(); } })));
        add(head('التصويت السري' + (s.cands ? ' (إعادة)' : ''), `${s.vi} من ${voters.length}`), dots(voters.length, s.vi), body);
        return;
      }

      /* ---------- الحكم ---------- */
      if (s.phase === 'verdict') {
        const p = s.out && P(s.out);
        const tally = {}; Object.entries(s.votes || {}).forEach(([v, t]) => { if (t !== 'x') tally[t] = (tally[t] || 0) + weight(v); });
        const mx = Math.max(1, ...Object.values(tally));
        const jest = p && p.role === 'jester';
        add(head('الحكم', `اليوم ${s.day}`),
          h('div', { class: 'mf-pass glass' },
            p ? [emb(jest ? 'jester' : 'skull', jest ? ROLES.jester.c : '#1f2937', 'xl ' + (jest ? 'pop' : 'shake')), h('h2', null, `طُرد ${p.name}`),
              h('span', { class: 'mf-dtag big' }, jest ? 'المهرّج! 🤡' : deadText(p)),
              ctx.setting('lastWords') && !jest ? h('p', { class: 'muted' }, `🎤 ${p.name}: كلمتك الأخيرة...`) : null]
              : [emb('vote', '#6366f1', 'xl'), h('h2', null, 'ما أحد طلع اليوم')],
            Object.keys(tally).length ? h('div', { class: 'mf-tally' }, Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([id, k], i) => h('div', { class: 'mf-bar', style: { '--w': `${(k / mx) * 100}%`, '--i': i } },
              h('span', null, P(id).name), h('i'), h('b', null, String(k))))) : null,
            PG.ui.btn(jest ? 'النتيجة' : 'الليل يحل', { icon: jest ? 'trophy' : 'play', cls: 'primary', onClick: () => { if (jest) end('jester'); else afterDeaths('night'); rr(); } })));
        return;
      }

      /* ---------- النهاية ---------- */
      const W = WIN[s.win] || WIN.draw;
      add(head('انتهت اللعبة', `بعد ${s.night} ليالٍ`),
        h('div', { class: 'mf-over glass', style: { '--rc': W[1] } }, h('div', { class: 'mf-burst' }, Array.from({ length: 12 }, (_, i) => h('i', { style: { '--a': `${i * 30}deg` } }))),
          emb(W[2], W[1], 'xl pop'), h('h2', null, W[0]),
          h('div', { class: 'tv-wins' }, Object.entries(s.wins).map(([k, n]) => h('span', { class: 'tag' }, `${(WIN[k] || WIN.draw)[0].replace('!', '')}: ${n}`)))),
        h('div', { class: 'mf-final' }, s.players.map((p, i) => h('div', { class: 'mf-fc' + (p.alive ? '' : ' dead'), style: { '--rc': ROLES[p.role].c, '--i': i } }, roleEmb(p.role, 'md'),
          h('b', null, p.name), h('small', null, ROLES[p.role].n), h('span', { class: 'mf-fs' }, p.alive ? 'حي' : 'ميت')))),
        h('div', { class: 'os-go' }, PG.ui.btn('تعديل اللاعبين', { icon: 'users', cls: 'ghost', onClick: () => { s.phase = 'setup'; rr(); } }),
          PG.ui.btn('لعبة جديدة', { icon: 'play', cls: 'primary', onClick: restart })),
        s.log.length ? h('details', { class: 'tv-log glass', open: true }, h('summary', null, 'سجل اللعبة'), h('ul', null, s.log.slice().reverse().map((m) => h('li', null, m)))) : null);
    },
  });
})();
