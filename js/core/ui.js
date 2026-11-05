/* مكونات الواجهة: أزرار، تنبيهات، نوافذ، تأكيد، ملء الشاشة، حقول الإعدادات */
(function () {
  'use strict';
  const PG = window.PG, { h, esc, clamp } = PG.util;
  const ui = (PG.ui = {});

  ui.btn = (label, { icon, cls = '', onClick, title } = {}) =>
    h('button', { type: 'button', class: 'btn ' + cls, title: title || null, 'aria-label': title || null, onclick: onClick,
      html: (icon ? PG.icon(icon) : '') + (label ? `<span>${esc(label)}</span>` : '') });

  ui.toast = (msg, type = 'info', ms = 2600) => {
    const t = h('div', { class: 'toast ' + type }, msg);
    document.getElementById('toasts').append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
  };

  /* نافذة منبثقة */
  const stack = [];
  ui.modal = ({ title, body, actions = [], size = '', cls = '', dismissable = true, onClose } = {}) => {
    const back = h('div', { class: 'modal-backdrop' });
    const box = h('div', { class: `modal glass ${size} ${cls}`, role: 'dialog', 'aria-modal': 'true' });
    let closed = false;
    const api = {
      el: box, dismissable,
      close(v) {
        if (closed) return; closed = true;
        back.classList.remove('show'); stack.splice(stack.indexOf(api), 1);
        setTimeout(() => back.remove(), 250);
        onClose && onClose(v);
      },
      setBody(n) { const st = bodyEl.scrollTop; bodyEl.innerHTML = ''; bodyEl.append(n); bodyEl.scrollTop = st; },
    };
    const head = h('div', { class: 'modal-head' }, h('h3', null, title || ''),
      dismissable ? h('button', { type: 'button', class: 'btn icon ghost', 'aria-label': 'إغلاق', html: PG.icon('x'), onclick: () => api.close() }) : null);
    const bodyEl = h('div', { class: 'modal-body' });
    api.body = bodyEl;
    if (body) bodyEl.append(typeof body === 'string' ? h('div', { html: body }) : body);
    box.append(head, bodyEl);
    if (actions.length) {
      box.append(h('div', { class: 'modal-foot' }, actions.map((a) => ui.btn(a.label, { icon: a.icon, cls: a.cls || '',
        onClick: () => { const r = a.onClick && a.onClick(); if (a.close !== false && r !== false) api.close(a.value); } }))));
    }
    back.append(box);
    back.addEventListener('pointerdown', (e) => { if (e.target === back && dismissable) api.close(); });
    document.getElementById('modals').append(back);
    requestAnimationFrame(() => back.classList.add('show'));
    stack.push(api);
    return api;
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length) { const m = stack[stack.length - 1]; if (m.dismissable) m.close(); }
  });

  /* تأكيد: يعيد Promise<boolean> */
  ui.confirm = (msg, { title = 'تأكيد', ok = 'نعم', cancel = 'إلغاء', danger = false } = {}) =>
    new Promise((res) => {
      ui.modal({ title, size: 'sm', body: h('p', { class: 'confirm-msg' }, msg),
        actions: [{ label: cancel, cls: 'ghost', value: false }, { label: ok, cls: danger ? 'danger' : 'primary', value: true }],
        onClose: (v) => res(v === true) });
    });

  /* ملء الشاشة */
  ui.isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const reqFs = (el) => {
    const r = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!r) return false;
    try { const p = r.call(el); p && p.catch && p.catch(() => {}); } catch (e) { return false; }
    return true;
  };
  const exitFs = () => { const x = document.exitFullscreen || document.webkitExitFullscreen; if (x && ui.isFs()) x.call(document); };
  ui.toggleFullscreen = (el = document.documentElement) => {
    if (ui.isFs()) return exitFs();
    if (!reqFs(el)) el.classList.toggle('pseudo-fs');
  };

  /* عرض أي محتوى (صورة/عنصر) مكبراً بملء الشاشة */
  ui.lightbox = (content) => {
    const close = () => { exitFs(); ov.remove(); document.removeEventListener('keydown', key); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    const ov = h('div', { class: 'lightbox' },
      h('button', { type: 'button', class: 'btn icon lb-close', 'aria-label': 'إغلاق', html: PG.icon('x'), onclick: close }),
      h('div', { class: 'lb-content' }, content));
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    document.body.append(ov); document.addEventListener('keydown', key);
    reqFs(ov);
    return { close };
  };

  /* حقل إعداد: f = {key,label,type:'number'|'toggle'|'select'|'range'|'text',min,max,step,options,hint} */
  ui.field = (f, val, onChange) => {
    let ctl;
    if (f.type === 'toggle') {
      ctl = h('button', { type: 'button', class: 'switch' + (val ? ' on' : ''), role: 'switch', 'aria-checked': String(!!val),
        onclick: () => { val = !val; ctl.classList.toggle('on', val); ctl.setAttribute('aria-checked', String(val)); PG.audio.play('click'); onChange(val); } }, h('span'));
    } else if (f.type === 'number') {
      const step = f.step || 1;
      const set = (v) => { v = clamp(isNaN(v) ? f.default : v, f.min ?? -Infinity, f.max ?? Infinity); inp.value = v; onChange(v); };
      const inp = h('input', { type: 'number', inputmode: 'numeric', class: 'input num', min: f.min, max: f.max, step, value: val, onchange: () => set(+inp.value) });
      ctl = h('div', { class: 'stepper' },
        h('button', { type: 'button', class: 'btn icon sm', 'aria-label': 'زيادة', html: PG.icon('plus'), onclick: () => set(+inp.value + step) }),
        inp,
        h('button', { type: 'button', class: 'btn icon sm', 'aria-label': 'إنقاص', html: PG.icon('minus'), onclick: () => set(+inp.value - step) }));
    } else if (f.type === 'select') {
      ctl = h('select', { class: 'input', onchange: (e) => onChange(e.target.value) },
        f.options.map((o) => h('option', { value: o.value, selected: String(o.value) === String(val) }, o.label)));
    } else if (f.type === 'range') {
      ctl = h('input', { type: 'range', class: 'range', min: f.min, max: f.max, step: f.step || 1, value: val, oninput: (e) => onChange(+e.target.value) });
    } else {
      ctl = h('input', { class: 'input', value: val ?? '', onchange: (e) => onChange(e.target.value) });
    }
    return h('div', { class: 'field' }, h('div', { class: 'field-label' }, h('span', null, f.label), f.hint ? h('small', { class: 'muted' }, f.hint) : null), ctl);
  };
})();
