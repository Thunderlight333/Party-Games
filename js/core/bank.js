/* بنوك الأسئلة: اختيار عشوائي بدون تكرار حتى ينفد البنك ثم يُعاد الخلط.
   يعتمد على فهرس العنصر في مصفوفة البيانات، لذلك: أضف عناصر جديدة في آخر المصفوفة فقط. */
(function () {
  'use strict';
  const PG = window.PG;
  const bucket = (id) => PG.store.state.banks[id] || (PG.store.state.banks[id] = { used: [], cycles: 0 });

  PG.bank = {
    /* يعيد فهرساً غير مستخدم من 0..size-1 (أو -1 إن لم يوجد) */
    next(id, size, { avoid = [] } = {}) {
      const b = bucket(id), used = new Set(b.used);
      let pool = [];
      for (let i = 0; i < size; i++) if (!used.has(i) && !avoid.includes(i)) pool.push(i);
      if (!pool.length) {
        b.used = []; b.cycles = (b.cycles || 0) + 1;
        for (let i = 0; i < size; i++) if (!avoid.includes(i)) pool.push(i);
        if (!pool.length) return -1;
      }
      const i = PG.util.pick(pool);
      b.used.push(i); PG.store.save();
      return i;
    },
    /* n فهارس مختلفة دفعة واحدة */
    take(id, size, n) { const out = []; for (let k = 0; k < n; k++) { const i = PG.bank.next(id, size, { avoid: out }); if (i < 0) break; out.push(i); } return out; },
    stats(id, size) { const b = bucket(id); return { used: b.used.length, size, cycles: b.cycles || 0 }; },
    reset(id) { delete PG.store.state.banks[id]; PG.store.save(); },
  };
})();
