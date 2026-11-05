/* تصدير دفعة من أسئلة حروف لملف مراجعة: node tools/huroof-export.js <رقم الدفعة> */
const path = require('path'), fs = require('fs');
const n = process.argv[2]; if (!n) { console.error('usage: node tools/huroof-export.js <n>'); process.exit(1); }
global.window = { PG_DATA: {} };
const root = path.join(__dirname, '..');
require(path.join(root, 'js/data/huroof.js'));
const H = window.PG_DATA.huroof, before = {};
for (const l in H) before[l] = H[l].length;
for (let i = 1; i < n; i++) { require(path.join(root, `js/data/huroof-${i}.js`)); for (const l in H) before[l] = H[l].length; }
require(path.join(root, `js/data/huroof-${n}.js`));
let out = `# حروف — الدفعة ${n} (للمراجعة)\n\nالمطلوب من المراجع: تأكد أن كل إجابة صحيحة، وأنها تبدأ بالحرف المذكور (دون «ال» التعريف)، وأن السؤال واضح وله إجابة واحدة. اذكر رقم السؤال الخاطئ مع التصحيح.\n`;
let total = 0;
for (const l in H) {
  const add = H[l].slice(before[l]); if (!add.length) continue;
  out += `\n## حرف ${l === 'ه' ? 'هـ' : l} (${add.length})\n\n| # | المجال | السؤال | الإجابة |\n|---|---|---|---|\n`;
  add.forEach((q, i) => { out += `| ${i + 1} | ${q[2] || 'عام'} | ${q[0]} | ${q[1]} |\n`; });
  total += add.length;
}
out += `\n**المجموع: ${total} سؤالاً**\n`;
const f = path.join(root, `docs/huroof-batches/batch-${n}.md`);
fs.writeFileSync(f, out); console.log(f, total);
