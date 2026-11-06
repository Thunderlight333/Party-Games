/* تصدير أسئلة تحدي المئة لملف مراجعة: node tools/feud-export.js */
const path = require('path'), fs = require('fs');
global.window = {};
const root = path.join(__dirname, '..');
require(path.join(root, 'js/data/feud.js'));
const D = window.PG_DATA.feud;
let out = '# تحدي المئة — بنك الأسئلة (للمراجعة)\n\nالمطلوب من المراجع: هل الإجابات منطقية وشائعة في المجتمع الخليجي/العربي؟ هل ترتيب النقاط معقول؟ اقترح إجابات ناقصة أو تعديل النقاط مع رقم السؤال.\n\n| # | السؤال | الإجابات (النقاط) |\n|---|---|---|\n';
D.forEach((q, i) => { out += `| ${i + 1} | ${q[0]} | ${q[1].map((a) => `${a[0]} (${a[1]})`).join('، ')} |\n`; });
out += `\n**المجموع: ${D.length} سؤالاً**\n`;
const f = path.join(root, 'docs/feud-review.md'); fs.writeFileSync(f, out); console.log(f, D.length);
