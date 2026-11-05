/* تصدير كلمات العميل السري لملف مراجعة: node tools/codenames-export.js */
const path = require('path'), fs = require('fs');
global.window = {};
const root = path.join(__dirname, '..');
require(path.join(root, 'js/data/codenames.js'));
const D = window.PG_DATA.codenames;
let out = '# العميل السري — بنك الكلمات (للمراجعة)\n\nالمطلوب من المراجع: هل كل كلمة واضحة ومعروفة ويمكن التلميح لها؟ اذكر الكلمات الصعبة أو المكررة المعنى مع بديل.\n\n| # | الكلمة |\n|---|---|\n';
D.forEach((w, i) => { out += `| ${i + 1} | ${w} |\n`; });
out += `\n**المجموع: ${D.length} كلمة**\n`;
const f = path.join(root, 'docs/codenames-review.md'); fs.writeFileSync(f, out); console.log(f, D.length);
