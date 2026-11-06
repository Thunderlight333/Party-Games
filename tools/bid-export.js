/* يولّد docs/bid-review.md لمراجعة أسئلة المزايدة: node tools/bid-export.js */
const fs = require('fs'), path = require('path');
global.window = {}; require(path.join(__dirname, '../js/data/bid.js'));
const D = window.PG_DATA.bid;
let md = `# المزايدة — مراجعة الأسئلة (${D.length})\n\n`;
D.forEach(([q, a], i) => { md += `**${i + 1}. ${q}**\n${a.join('، ')}\n\n`; });
fs.writeFileSync(path.join(__dirname, '../docs/bid-review.md'), md); console.log('ok', D.length);
