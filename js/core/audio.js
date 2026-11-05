/* مؤثرات صوتية مولّدة بـ Web Audio API (بدون ملفات) */
(function () {
  'use strict';
  const PG = window.PG;
  let ac = null, master = null;

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC(); master = ac.createGain(); master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    master.gain.value = PG.store.state.prefs.volume ?? 0.8;
    return ac;
  }

  function tone(f, dur, { type = 'sine', vol = 0.25, at = 0, to = null, attack = 0.006 } = {}) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(dur, { vol = 0.2, at = 0, freq = 1200 } = {}) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + at, len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = freq; g.gain.value = vol;
    s.connect(bp); bp.connect(g); g.connect(master); s.start(t);
  }

  const notes = (fs, step, opt) => fs.forEach((f, i) => tone(f, opt.dur || 0.2, Object.assign({}, opt, { at: i * step })));

  const fx = {
    click: () => tone(700, 0.06, { type: 'triangle', vol: 0.12 }),
    pop: () => tone(420, 0.12, { vol: 0.2, to: 900 }),
    flip: () => { noise(0.12, { vol: 0.15, freq: 2600 }); tone(320, 0.16, { type: 'triangle', vol: 0.12, to: 640 }); },
    correct: () => notes([523.25, 659.25, 783.99], 0.09, { type: 'triangle', vol: 0.22, dur: 0.2 }),
    wrong: () => tone(230, 0.4, { type: 'sawtooth', vol: 0.16, to: 110 }),
    buzzer: () => { tone(110, 0.9, { type: 'square', vol: 0.2 }); tone(117, 0.9, { type: 'sawtooth', vol: 0.16 }); },
    tick: () => tone(1250, 0.045, { type: 'square', vol: 0.06 }),
    win: () => notes([523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5], 0.12, { type: 'triangle', vol: 0.2, dur: 0.24 }),
    reveal: () => tone(280, 0.55, { vol: 0.2, to: 1200 }),
    whoosh: () => noise(0.32, { vol: 0.16, freq: 700 }),
  };

  PG.audio = {
    fx,
    play(name) { if (!PG.store.state.prefs.sound) return; try { fx[name] && fx[name](); } catch (e) { /* تجاهل */ } },
    unlock: ctx,
  };
  document.addEventListener('pointerdown', () => { if (PG.store.state.prefs.sound) ctx(); }, { once: true });
})();
