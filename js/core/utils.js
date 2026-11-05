/* أدوات عامة + ناقل أحداث */
(function () {
  'use strict';
  const PG = (window.PG = window.PG || {});
  const u = (PG.util = {});

  u.uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  u.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  u.pick = (a) => a[Math.floor(Math.random() * a.length)];
  u.clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  u.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  u.clone = (o) => JSON.parse(JSON.stringify(o));
  u.fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  /* لون نص مقروء فوق لون خلفية */
  u.textOn = (hex) => {
    let c = String(hex || '#000').replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const n = parseInt(c, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111' : '#fff';
  };

  /* منشئ عناصر DOM: h('div', {class, onclick, style:{}, html}, ...children) */
  u.h = function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') { for (const s in v) s.startsWith('--') ? el.style.setProperty(s, v[s]) : (el.style[s] = v[s]); }
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) return c.forEach(add); el.append(c instanceof Node ? c : document.createTextNode(String(c))); };
    kids.forEach(add);
    return el;
  };

  PG.bus = {
    _m: {},
    on(e, f) { (this._m[e] = this._m[e] || []).push(f); return () => this.off(e, f); },
    off(e, f) { this._m[e] = (this._m[e] || []).filter((x) => x !== f); },
    emit(e, d) { (this._m[e] || []).slice().forEach((f) => { try { f(d); } catch (err) { console.error(err); } }); },
  };
})();
