# مجلس الألعاب

ألعاب جماعية عربية للمجالس والجمعات. موقع ثابت (HTML + CSS + JavaScript بدون مكتبات)، يشتغل على الجوال والكمبيوتر، ويشتغل **بدون إنترنت** بعد أول فتح.

## الألعاب
| اللعبة | النوع | الفكرة |
|---|---|---|
| حروف | فرق | شبكة حروف سداسية، أجب عن سؤال الحرف ليتلوّن بلون فريقك (1534 سؤالاً) |
| تحدي المئة | فرق | اكشف أشهر الإجابات قبل 3 أخطاء، مع السرقة ومضاعفة النقاط |
| المزايدة | فرق | سؤال تعداد، زايد على خصمك أو قل له «عدّدها!» |
| برا السالفة | تمرير الجهاز | الكل يعرف الكلمة إلا واحد، دائرة أسئلة ثم تصويت |
| إمبراطور الكلمات | جماعية | كل لاعب يكتب كلمة سرية، خمّن صاحب كل كلمة لتضمه |
| العميل السري | فريقين | شبكة 5×5، القائد يلمّح وفريقه يكشف |
| بدون كلام | فرق | اشرح الكلمة بدون الكلمات الممنوعة قبل نهاية الوقت |
| عدّاد المجلس | أداة | نقاط ومؤقت لأي لعبة خارج التطبيق |
| عجلة الحظ | أداة | اختيار عشوائي بقوائم محفوظة وأوزان وألوان |
| مافيا | — | قريباً |

## طريقة الاستخدام
1. افتح رابط الموقع (GitHub Pages) من الجوال وأنت متصل بالإنترنت مرة وحدة.
2. **ثبّته كتطبيق (اختياري):**
   - آيفون (Safari): زر المشاركة ← «إضافة إلى الشاشة الرئيسية».
   - أندرويد (Chrome): القائمة ⋮ ← «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».
3. بعدها يشتغل بدون إنترنت. كل شيء (الفرق، النقاط، الجولة الحالية، الإعدادات، قوائم العجلة) ينحفظ في الجهاز نفسه.
4. **الفرق:** من زر «الفرق» في الصفحة الرئيسية: أضف الفرق وأسماء اللاعبين وغيّر الألوان. الألعاب تستخدمها تلقائياً.
5. **الإعدادات:** كل لعبة لها زر إعدادات في شريطها، وتحت كل خيار شرح. الإعدادات العامة (الصوت، تصفير سجل الأسئلة، إعادة ضبط الجهاز) من الصفحة الرئيسية.
6. **الاستئناف:** لو قفلت الصفحة وسط اللعبة، ترجع لنفس المكان. زر «إنهاء» ينهي اللعبة الحالية.

## التحديثات
- أي تعديل يُرفع على فرع `site`، والموقع يتحدّث خلال دقيقة أو دقيقتين.
- الجوال ياخذ التحديث أول ما تفتح الموقع وأنت متصل بالإنترنت. بعدها يشتغل بدون إنترنت بالنسخة الجديدة.

## النشر على GitHub Pages
1. المستودع لازم يكون **عاماً** (أو حساب GitHub Pro للمستودعات الخاصة).
2. Settings ← Pages ← Source: **Deploy from a branch** ← Branch: **`site`** / **`/ (root)`** ← Save.
3. الرابط يكون: `https://thunderlight333.github.io/Party-Games/`

## للمطوّر
### التشغيل محلياً
افتح `index.html` مباشرة، أو شغّل `python3 -m http.server 8000` (العمل بدون إنترنت يحتاج http).

### بعد أي تعديل
```
node tools/build-sw.js   # يحدّث قائمة الملفات ورقم النسخة في sw.js
```

### الهيكل
| المسار | الدور |
|---|---|
| `js/core/utils.js` | `PG.util` (h, shuffle, pick, uid, clamp, fmtTime, textOn) + `PG.bus` |
| `js/core/icons.js` | `PG.icon(name)` أيقونات SVG |
| `js/core/store.js` | `PG.store`: الحالة الكاملة في LocalStorage بالمفتاح `majlis.state.v1` |
| `js/core/audio.js` | `PG.audio.play('click'|'pop'|'flip'|'correct'|'wrong'|'buzzer'|'tick'|'win'|'reveal'|'whoosh')` |
| `js/core/ui.js` | `PG.ui`: btn, toast, modal, confirm (Promise), toggleFullscreen, lightbox, field |
| `js/core/bank.js` | `PG.bank.next(bankId, size)`: أسئلة بلا تكرار حتى ينفد البنك |
| `js/core/timer.js` | `PG.Timer`: مؤقت محفوظ داخل الجلسة |
| `js/core/teams.js` | `PG.teams`: الفرق واللاعبون، `scoreboard()` |
| `js/core/registry.js` | `PG.games.register()` |
| `js/games/catalog.js` | بطاقات الألعاب في الصفحة الرئيسية |
| `js/games/<id>.js` | ملف كل لعبة |
| `js/data/<id>.js` | بيانات اللعبة: `window.PG_DATA.<id>` |
| `js/app.js` | التوجيه `#/` و `#/game/<id>`، الاستئناف، الإنهاء، الإعدادات، تسجيل Service Worker. يُحمَّل أخيراً |
| `sw.js`، `manifest.webmanifest`، `icons/` | العمل بدون إنترنت والتثبيت كتطبيق |
| `tools/` | سكربتات المراجعة (`*-export.js` تولّد ملفات في `docs/`) و`build-sw.js` |
| `docs/` | `progress.md`، `rules.html` و`party-games-rules.pdf`، وملفات مراجعة البيانات |

### شكل الحالة
```
{ version, prefs:{sound,volume}, teams:[{id,name,color,players:[{id,name}]}],
  active: gameId|null, games:{ [id]:{settings:{}, session:{}|null, data?} }, banks:{ [bankId]:{used:[],cycles} } }
```

### إضافة لعبة جديدة
1. أنشئ `js/games/<id>.js` واستدعِ `PG.games.register({...})` (انظر `counter.js` مثالاً):
   - `id, title, desc, icon, color, category ('teams'|'deduction'|'extra'|'tools'), mode, ready:true`
   - `teams: {min, max, recommended}` أو `null`
   - `settings: [{key,label,hint,type:'number'|'toggle'|'select'|'range'|'text',default,...}]`
   - `newSession(ctx)` يعيد كائن الجلسة (JSON فقط)
   - `mount(root, ctx)`: `ctx.session`, `ctx.save()`, `ctx.setting(k)`, `ctx.rerender()`, `ctx.onCleanup(fn)`
   - اختياري: `reset(ctx)`، `onSetting(ctx,key,val)`
2. (اختياري) `js/data/<id>.js` للبيانات.
3. سطر `<script>` في `index.html` بعد `counter.js` وقبل `app.js`، وتنسيق في آخر `css/style.css` تحت `/* ===== اسم اللعبة ===== */`.
4. `node tools/build-sw.js`.

### قواعد
- كل تغيير في الجلسة يتبعه `ctx.save()`.
- بنوك الأسئلة: أضف العناصر في **آخر** المصفوفة فقط (الفهارس محفوظة في `banks`).
- `root.append(null)` يكتب «null»؛ استخدم `.filter(Boolean)`.
- لا مكتبات ولا خطوط ولا صور خارجية.
