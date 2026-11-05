/* بطاقات الألعاب المخططة. ملف كل لعبة يعيد التسجيل بنفس الـ id ويضيف ready:true */
(function () {
  'use strict';
  const R = (d) => window.PG.games.register(d);
  R({ id: 'huroof', title: 'حروف', category: 'teams', icon: 'letters', color: '#f59e0b', mode: 'فرق', desc: 'شبكة الحروف: اختر حرفاً وأجب عن سؤاله ليتلوّن بلون فريقك.' });
  R({ id: 'pictures', title: 'تحدي الصور', category: 'teams', icon: 'image', color: '#06b6d4', mode: 'فرق', desc: 'خمّن الصورة ورتّب مقاطع الكلمة المبعثرة.' });
  R({ id: 'feud', title: 'تحدي المئة', category: 'teams', icon: 'board', color: '#ef4444', mode: 'فرق', desc: 'اكشف أشهر الإجابات قبل أن تجمع ثلاثة أخطاء ❌.' });
  R({ id: 'mafia', title: 'مافيا', category: 'deduction', icon: 'mafia', color: '#dc2626', mode: 'تمرير الجهاز', desc: 'أدوار سرية وليل ونهار؛ الجهاز يدير اللعبة ليشارك الهوست.' });
  R({ id: 'outsider', title: 'برا السالفة', category: 'deduction', icon: 'outsider', color: '#a855f7', mode: 'تمرير الجهاز', desc: 'الكل يعرف الكلمة إلا واحد... اكشفوه!' });
  R({ id: 'emperor', title: 'إمبراطور الكلمات', category: 'deduction', icon: 'crown', color: '#eab308', mode: 'جماعية', desc: 'كل لاعب يكتب كلمة، ثم خمّن صاحب كل كلمة لتضمّه لإمبراطوريتك.' });
  R({ id: 'codenames', title: 'العميل السري', category: 'extra', icon: 'grid', color: '#22c55e', mode: 'فريقين', desc: 'شبكة 5×5 من الكلمات؛ القائد يلمّح وفريقه يكشف عملاءه ويتجنب القاتل.' });
  R({ id: 'taboo', title: 'بدون كلام', category: 'extra', icon: 'taboo', color: '#ec4899', mode: 'فرق', desc: 'اشرح الكلمة لفريقك دون أن تقول الكلمات الممنوعة.' });
})();
