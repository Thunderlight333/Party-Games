/* مؤقت قابل للحفظ: حالته كائن عادي داخل جلسة اللعبة {duration, remaining, running, endsAt}
   بعد تحديث الصفحة يُستعاد متوقفاً على الوقت المتبقي الفعلي. */
(function () {
  'use strict';
  const PG = window.PG, { h, fmtTime } = PG.util;
  const seen = new WeakSet();
  const C = 2 * Math.PI * 26;

  class Timer {
    static create(sec) { return { duration: sec, remaining: sec, running: false, endsAt: 0 }; }

    constructor(state, { onEnd, save = () => PG.store.save(), warnAt = 5, compact = false } = {}) {
      this.s = state; this.onEnd = onEnd; this.save = save; this.warnAt = warnAt; this.lastSec = null;
      if (!seen.has(state)) {
        seen.add(state);
        if (state.running) { state.remaining = Math.max(0, (state.endsAt - Date.now()) / 1000); state.running = false; save(); }
      }
      this.el = this.build(compact);
      this.render();
      if (state.running) this.loop();
    }
    left() { return this.s.running ? Math.max(0, (this.s.endsAt - Date.now()) / 1000) : this.s.remaining; }
    start() {
      if (this.s.running) return;
      if (this.s.remaining <= 0) this.s.remaining = this.s.duration;
      this.s.running = true; this.s.endsAt = Date.now() + this.s.remaining * 1000;
      this.save(); this.loop(); this.render(); PG.audio.play('click');
    }
    pause() {
      if (!this.s.running) return;
      this.s.remaining = this.left(); this.s.running = false;
      this.save(); this.stopLoop(); this.render();
    }
    toggle() { this.s.running ? this.pause() : this.start(); }
    reset(sec) {
      this.stopLoop();
      if (sec != null) this.s.duration = sec;
      this.s.remaining = this.s.duration; this.s.running = false; this.lastSec = null;
      this.save(); this.render();
    }
    loop() { this.stopLoop(); this.iv = setInterval(() => this.tick(), 200); }
    stopLoop() { clearInterval(this.iv); this.iv = null; }
    tick() {
      const l = this.left(), sec = Math.ceil(l);
      if (sec !== this.lastSec) { this.lastSec = sec; if (sec <= this.warnAt && sec > 0) PG.audio.play('tick'); }
      if (l <= 0) {
        this.s.running = false; this.s.remaining = 0; this.save(); this.stopLoop(); this.render();
        PG.audio.play('buzzer'); this.onEnd && this.onEnd();
        return;
      }
      this.render();
    }
    build(compact) {
      const wrap = h('div', { class: 'timer' + (compact ? ' compact' : '') });
      wrap.innerHTML = `<svg viewBox="0 0 60 60" class="t-ring"><circle cx="30" cy="30" r="26" class="t-bg"/><circle cx="30" cy="30" r="26" class="t-fg" stroke-dasharray="${C}"/></svg>`;
      this.ring = wrap.querySelector('.t-fg');
      this.txt = h('div', { class: 't-text' });
      this.playBtn = h('button', { type: 'button', class: 'btn icon sm', 'aria-label': 'تشغيل/إيقاف', onclick: () => this.toggle() });
      const resetBtn = h('button', { type: 'button', class: 'btn icon sm ghost', 'aria-label': 'إعادة المؤقت', html: PG.icon('reset'), onclick: () => this.reset() });
      wrap.append(h('div', { class: 't-face' }, wrap.firstChild, this.txt), h('div', { class: 't-btns' }, this.playBtn, resetBtn));
      return wrap;
    }
    render() {
      const l = this.left(), d = this.s.duration || 1;
      this.txt.textContent = fmtTime(l);
      this.ring.style.strokeDashoffset = String(C * (1 - l / d));
      this.el.classList.toggle('warn', l > 0 && l <= this.warnAt);
      this.el.classList.toggle('ended', l <= 0);
      this.el.classList.toggle('running', this.s.running);
      this.playBtn.innerHTML = PG.icon(this.s.running ? 'pause' : 'play');
    }
    destroy() { this.stopLoop(); }
  }
  PG.Timer = Timer;
})();
