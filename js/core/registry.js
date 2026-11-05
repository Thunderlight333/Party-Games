/* سجل الألعاب. كل لعبة تسجّل نفسها بـ PG.games.register({...}).
   الحقول: id, title, desc, icon, color, category, mode, ready,
   teams:{min,max,recommended} | null, settings:[حقول], newSession(ctx), mount(root, ctx),
   reset(ctx)? (إعادة وخلط), onSetting(ctx,key,val)? */
(function () {
  'use strict';
  const PG = window.PG;
  PG.games = {
    CATEGORIES: [
      { id: 'teams', title: 'ألعاب التحديات والفرق' },
      { id: 'deduction', title: 'ألعاب الاستنتاج والتخفي' },
      { id: 'extra', title: 'ألعاب إضافية' },
      { id: 'tools', title: 'أدوات المجلس' },
    ],
    list: [],
    register(def) {
      const i = this.list.findIndex((g) => g.id === def.id);
      if (i >= 0) this.list[i] = Object.assign({}, this.list[i], def);
      else this.list.push(Object.assign({ ready: false, teams: null, settings: [], color: '#8b5cf6', icon: 'spark', category: 'extra' }, def));
    },
    get(id) { return this.list.find((g) => g.id === id); },
  };
})();
