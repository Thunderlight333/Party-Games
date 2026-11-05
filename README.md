# مجلس الألعاب (Party Games Hub)

موقع ثابت يعمل أوفلاين 100%. افتح `index.html` مباشرة، أو شغّل `python3 -m http.server 8000`.

## الهيكل
| المسار | الدور |
|---|---|
| `js/core/utils.js` | `PG.util` (h, shuffle, pick, esc, fmtTime, textOn) + `PG.bus` |
| `js/core/icons.js` | `PG.icon(name)` أيقونات SVG |
| `js/core/store.js` | `PG.store`: الحالة الكاملة في LocalStorage بالمفتاح `majlis.state.v1` |
| `js/core/audio.js` | `PG.audio.play('click'|'pop'|'flip'|'correct'|'wrong'|'buzzer'|'tick'|'win'|'reveal'|'whoosh')` |
| `js/core/ui.js` | `PG.ui`: btn, toast, modal, confirm (Promise), toggleFullscreen, lightbox, field |
| `js/core/bank.js` | `PG.bank.next(bankId, size)`: أسئلة بلا تكرار حتى ينفد البنك |
| `js/core/timer.js` | `PG.Timer`: مؤقت محفوظ داخل الجلسة |
| `js/core/teams.js` | `PG.teams`: الفرق واللاعبون، `openManager(opts)`، `scoreboard()` |
| `js/core/registry.js` | `PG.games.register()` |
| `js/games/catalog.js` | بطاقات الألعاب المخططة (قريباً) |
| `js/games/<id>.js` | ملف كل لعبة |
| `js/data/<id>.js` | بنك أسئلة اللعبة: `window.PG_DATA.<id> = [...]` |
| `js/app.js` | التوجيه `#/` و `#/game/<id>`، الاستئناف، الإنهاء، الإعدادات. يُحمَّل أخيراً |

## شكل الحالة
```
{ version, prefs:{sound,volume}, teams:[{id,name,color,players:[{id,name}]}],
  active: gameId|null, games:{ [id]:{settings:{}, session:{}|null} }, banks:{ [bankId]:{used:[],cycles} } }
```

## إضافة لعبة جديدة
1. أنشئ `js/games/<id>.js` واستدعِ `PG.games.register({...})` (انظر `counter.js` كمثال كامل):
   - `id, title, desc, icon, color, category ('teams'|'deduction'|'extra'|'tools'), mode, ready:true`
   - `teams: {min, max, recommended}` أو `null` إن لم تستخدم الفرق
   - `settings: [{key,label,type:'number'|'toggle'|'select'|'range',default,...}]`
   - `newSession(ctx)` يعيد كائن الجلسة (JSON فقط)
   - `mount(root, ctx)` يرسم اللعبة. `ctx.session`, `ctx.save()`, `ctx.setting(k)`, `ctx.rerender()`, `ctx.onCleanup(fn)`
   - اختياري: `reset(ctx)` (إعادة وخلط)، `onSetting(ctx,key,val)`
2. (اختياري) أنشئ `js/data/<id>.js` للبيانات.
3. أضف سطر `<script>` في `index.html` بعد `catalog.js` وقبل `app.js`.

## قواعد
- كل تغيير في الجلسة يتبعه `ctx.save()`.
- بنوك الأسئلة: أضف العناصر في **آخر** المصفوفة فقط؛ الفهارس محفوظة في `banks`.
- لا مكتبات ولا خطوط ولا صور خارجية.
