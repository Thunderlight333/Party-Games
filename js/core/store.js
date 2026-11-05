/* مدير الحالة: كل شيء في كائن واحد يُحفظ في LocalStorage فوراً عند كل تغيير */
(function () {
  'use strict';
  const PG = window.PG;
  const KEY = 'majlis.state.v1';

  function defaults() {
    return {
      version: 1,
      prefs: { sound: true, volume: 0.8 },
      teams: [
        { id: 't_a', name: 'الصقور', color: '#ef4444', players: [] },
        { id: 't_b', name: 'النمور', color: '#3b82f6', players: [] },
      ],
      active: null,          // معرّف اللعبة الجارية
      games: {},             // { [gameId]: { settings:{}, session:{}|null } }
      banks: {},             // { [bankId]: { used:[indexes] } } لمنع تكرار الأسئلة
    };
  }

  let state = defaults();
  let warned = false;

  const store = (PG.store = {
    KEY,
    get state() { return state; },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          state = Object.assign(defaults(), d);
          state.prefs = Object.assign(defaults().prefs, d.prefs || {});
          if (!Array.isArray(state.teams) || !state.teams.length) state.teams = defaults().teams;
        }
      } catch (e) { console.warn('تعذر تحميل الحالة', e); state = defaults(); }
      if (state.active && !(state.games[state.active] && state.games[state.active].session)) state.active = null;
      return state;
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); warned = false; }
      catch (e) {
        console.error(e);
        if (!warned) { warned = true; PG.ui && PG.ui.toast('تعذّر الحفظ في ذاكرة المتصفح', 'error'); }
      }
      PG.bus.emit('save');
    },
    game(id) { return state.games[id] || (state.games[id] = { settings: {}, session: null }); },
    setting(id, key) {
      const g = store.game(id);
      if (key in g.settings) return g.settings[key];
      const def = PG.games && PG.games.get(id);
      const f = def && (def.settings || []).find((s) => s.key === key);
      return f ? f.default : undefined;
    },
    setSetting(id, key, val) { store.game(id).settings[key] = val; store.save(); },
    wipe() { try { localStorage.removeItem(KEY); } catch (e) {} state = defaults(); store.save(); },
  });

  addEventListener('pagehide', () => store.save());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') store.save(); });
})();
