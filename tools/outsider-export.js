/* يولّد docs/outsider-review.md لمراجعة كلمات برا السالفة: node tools/outsider-export.js */
const fs = require('fs'), path = require('path');
global.window = {}; require(path.join(__dirname, '../js/data/outsider.js'));
const D = window.PG_DATA.outsider;
let md = '# برا السالفة — مراجعة الكلمات\n\n';
for (const k in D) md += `## ${k} (${D[k].length})\n${D[k].join('، ')}\n\n`;
fs.writeFileSync(path.join(__dirname, '../docs/outsider-review.md'), md);
console.log('ok', Object.keys(D).length);
