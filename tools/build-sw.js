/* يولّد sw.js بقائمة كل ملفات الموقع ورقم نسخة من محتواها: node tools/build-sw.js
   شغّله بعد أي تعديل قبل الرفع، عشان الأجهزة تاخذ النسخة الجديدة. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const walk = (d) => fs.readdirSync(path.join(ROOT, d)).flatMap((f) => {
  const p = path.join(d, f); return fs.statSync(path.join(ROOT, p)).isDirectory() ? walk(p) : [p];
});
const files = ['index.html', 'manifest.webmanifest', ...walk('css'), ...walk('js'), ...walk('icons')].map((f) => f.split(path.sep).join('/'));
const hash = crypto.createHash('sha1');
files.forEach((f) => hash.update(f).update(fs.readFileSync(path.join(ROOT, f))));
const ver = hash.digest('hex').slice(0, 10);
const tpl = fs.readFileSync(path.join(__dirname, 'sw.template.js'), 'utf8');
fs.writeFileSync(path.join(ROOT, 'sw.js'), tpl.replace('__VERSION__', ver).replace('__FILES__', JSON.stringify(['./', ...files], null, 2)));
console.log('sw.js', ver, files.length + ' ملف');
