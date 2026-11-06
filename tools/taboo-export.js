/* يولّد docs/taboo-review.md لمراجعة بطاقات بدون كلام: node tools/taboo-export.js */
const fs = require('fs'), path = require('path');
global.window = {}; require(path.join(__dirname, '../js/data/taboo.js'));
const D = window.PG_DATA.taboo;
let md = `# بدون كلام — مراجعة البطاقات (${D.length})\n\n| # | الكلمة | الممنوعات (أول 3 = سهل) |\n|---|---|---|\n`;
D.forEach(([w, f], i) => { md += `| ${i + 1} | ${w} | ${f.slice(0, 3).join('، ')} · ${f.slice(3).join('، ')} |\n`; });
fs.writeFileSync(path.join(__dirname, '../docs/taboo-review.md'), md); console.log('ok', D.length);
