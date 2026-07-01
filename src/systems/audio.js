// Фоновая музыка: три зацикленных трека (меню/эмбиент/бой) с плавным кроссфейдом.
export class GameMusic {
  constructor(volume = .55) {
    this.volume = volume;
    this.enabled = true;
    this.current = null;   // желаемый трек
    this.started = false;  // разблокирован ли автоплей жестом пользователя
    this.tracks = {};
    const base = import.meta.env.BASE_URL;
    this.defs = { menu: `${base}audio/menu.mp3`, ambient: `${base}audio/ambient.mp3`, combat: `${base}audio/combat.mp3` };
  }

  init() {
    if (Object.keys(this.tracks).length) return;
    for (const [name, url] of Object.entries(this.defs)) {
      const audio = new Audio(url);
      audio.loop = true; audio.preload = 'auto'; audio.volume = 0;
      this.tracks[name] = { audio, gain: 0 };
    }
  }

  // Вызывать из пользовательского жеста (клик/клавиша), иначе браузер блокирует автоплей.
  unlock() { this.init(); this.started = true; }

  setVolume(v) { this.volume = v; }

  play(name) { this.current = name; }

  update(dt) {
    if (!this.started) return;
    for (const [name, track] of Object.entries(this.tracks)) {
      const target = (name === this.current && this.enabled && this.volume > 0) ? this.volume : 0;
      track.gain += (target - track.gain) * Math.min(1, dt * 1.6);
      if (track.gain < 0.0015) track.gain = target === 0 ? 0 : track.gain;
      track.audio.volume = Math.max(0, Math.min(1, track.gain));
      if (track.audio.volume > 0.001) { if (track.audio.paused) track.audio.play().catch(() => {}); }
      else if (name !== this.current && !track.audio.paused) track.audio.pause();
    }
  }
}

export class GameAudio {
  constructor(volume = .55) {
    this.volume = volume;
    this.context = null;
    this.master = null;
    this._noiseBuf = null;
  }

  unlock() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.context.createGain();
      this.master.gain.value = .9;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  setVolume(value) { this.volume = value; }

  // ── примитивы синтеза ──
  _noiseBuffer() {
    if (this._noiseBuf) return this._noiseBuf;
    const len = this.context.sampleRate;
    const buf = this.context.createBuffer(1, len, this.context.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    return buf;
  }

  // Тон с огибающей и опциональным глиссандо.
  _tone(t0, { f, f1 = null, type = 'sine', dur = .2, peak = .12, attack = .004, curve = 'exp' } = {}) {
    const o = this.context.createOscillator(), g = this.context.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f1 && f1 !== f) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      else o.frequency.linearRampToValueAtTime(f1, t0 + dur);
    }
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak * this.volume), t0 + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + dur + .03);
  }

  // Отфильтрованный шум (удары, шаги, ветер, взрывы).
  _noise(t0, { dur = .2, peak = .12, type = 'lowpass', f = 1200, f1 = null, q = 1, attack = .002 } = {}) {
    const src = this.context.createBufferSource(); src.buffer = this._noiseBuffer(); src.loop = true;
    const filt = this.context.createBiquadFilter(); filt.type = type; filt.frequency.setValueAtTime(f, t0); filt.Q.value = q;
    if (f1) filt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    const g = this.context.createGain();
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak * this.volume), t0 + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t0); src.stop(t0 + dur + .03);
  }

  // Арпеджио из тонов (звоны/фанфары).
  _arp(t0, freqs, { step = .09, type = 'triangle', dur = .16, peak = .12 } = {}) {
    freqs.forEach((f, i) => this._tone(t0 + i * step, { f, f1: f * 1.5, type, dur, peak }));
  }

  play(name, opts = {}) {
    if (!this.context || this.volume <= 0) return;
    const t = this.context.currentTime;
    const R = (a, b) => a + Math.random() * (b - a);
    const v = opts.gain ?? 1;
    switch (name) {
      // ── интерфейс ──
      case 'click': this._tone(t, { f: 240, type: 'square', dur: .04, peak: .06 * v }); break;
      case 'select': this._tone(t, { f: 520, f1: 640, type: 'triangle', dur: .06, peak: .05 * v }); break;
      case 'ui_open': this._tone(t, { f: 300, f1: 560, type: 'sine', dur: .16, peak: .08 }); this._tone(t + .05, { f: 450, f1: 700, type: 'sine', dur: .16, peak: .05 }); break;
      case 'ui_close': this._tone(t, { f: 520, f1: 260, type: 'sine', dur: .14, peak: .07 }); break;

      // ── добыча/строительство ──
      case 'mine': case 'dig_stone': this._noise(t, { dur: .08, peak: .12 * v, type: 'bandpass', f: R(1400, 2000), q: 1.4 }); this._tone(t, { f: R(150, 190), f1: 90, type: 'square', dur: .06, peak: .04 }); break;
      case 'dig_dirt': case 'dig_sand': this._noise(t, { dur: .1, peak: .13 * v, type: 'lowpass', f: R(700, 1000), f1: 300 }); break;
      case 'dig_wood': this._noise(t, { dur: .08, peak: .1 * v, type: 'bandpass', f: R(500, 800), q: 2 }); this._tone(t, { f: 220, f1: 130, type: 'square', dur: .07, peak: .05 }); break;
      case 'dig_leaves': this._noise(t, { dur: .12, peak: .1 * v, type: 'highpass', f: R(2600, 3600) }); break;
      case 'break': this._noise(t, { dur: .22, peak: .18, type: 'lowpass', f: 1600, f1: 400 }); this._tone(t, { f: 130, f1: 60, type: 'square', dur: .18, peak: .06 }); break;
      case 'place': this._noise(t, { dur: .09, peak: .12, type: 'lowpass', f: 900, f1: 400 }); this._tone(t, { f: 160, f1: 110, type: 'triangle', dur: .08, peak: .06 }); break;

      // ── передвижение ──
      case 'step': this._noise(t, { dur: R(.05, .08), peak: R(.03, .05) * v, type: 'lowpass', f: R(500, 800), f1: 260 }); break;
      case 'step_stone': this._noise(t, { dur: .055, peak: .045 * v, type: 'bandpass', f: R(1200, 1900), q: 1.5 }); break;
      case 'step_wood': this._noise(t, { dur: .07, peak: .05 * v, type: 'bandpass', f: R(450, 750), q: 2 }); this._tone(t, { f: R(120, 165), f1: 90, type: 'square', dur: .045, peak: .025 }); break;
      case 'step_grass': this._noise(t, { dur: .09, peak: .04 * v, type: 'highpass', f: R(1700, 2600) }); break;
      case 'jump': this._tone(t, { f: 300, f1: 500, type: 'triangle', dur: .12, peak: .06 }); break;
      case 'land': this._noise(t, { dur: .12, peak: .12, type: 'lowpass', f: 700, f1: 200 }); this._tone(t, { f: 120, f1: 70, type: 'sine', dur: .1, peak: .06 }); break;
      case 'splash': this._noise(t, { dur: .3, peak: .12, type: 'bandpass', f: 900, f1: 2400, q: .7 }); break;

      // ── бой ──
      case 'swing': this._noise(t, { dur: .16, peak: .1, type: 'bandpass', f: 500, f1: 2600, q: .8 }); break;
      case 'hit': this._noise(t, { dur: .1, peak: .16, type: 'lowpass', f: 1800, f1: 500 }); this._tone(t, { f: 200, f1: 80, type: 'sawtooth', dur: .1, peak: .1 }); break;
      case 'crit': this._noise(t, { dur: .16, peak: .2, type: 'lowpass', f: 2400, f1: 400 }); this._tone(t, { f: 260, f1: 70, type: 'sawtooth', dur: .16, peak: .13 }); this._tone(t + .02, { f: 520, f1: 180, type: 'square', dur: .12, peak: .06 }); break;
      case 'bow': this._tone(t, { f: 320, f1: 140, type: 'triangle', dur: .12, peak: .09 }); this._noise(t, { dur: .06, peak: .06, type: 'highpass', f: 2000 }); break;
      case 'arrow_hit': this._noise(t, { dur: .08, peak: .12, type: 'bandpass', f: 1200, q: 3 }); this._tone(t, { f: 180, f1: 90, type: 'square', dur: .07, peak: .06 }); break;
      case 'explode': this._noise(t, { dur: .5, peak: .28, type: 'lowpass', f: 1400, f1: 90, q: .6 }); this._tone(t, { f: 90, f1: 40, type: 'sawtooth', dur: .4, peak: .12 }); break;
      case 'block': this._tone(t, { f: 1400, f1: 900, type: 'square', dur: .12, peak: .1 }); this._tone(t + .01, { f: 2100, f1: 1500, type: 'triangle', dur: .1, peak: .05 }); this._noise(t, { dur: .08, peak: .08, type: 'highpass', f: 3000 }); break;
      case 'hurt': this._tone(t, { f: 200, f1: 70, type: 'sawtooth', dur: .2, peak: .14 }); this._noise(t, { dur: .12, peak: .08, type: 'lowpass', f: 900, f1: 300 }); break;
      case 'enemy_hurt': this._tone(t, { f: R(160, 220), f1: 90, type: 'square', dur: .12, peak: .08 }); break;
      case 'enemy_die': this._tone(t, { f: 260, f1: 60, type: 'sawtooth', dur: .3, peak: .1 }); this._noise(t, { dur: .25, peak: .08, type: 'lowpass', f: 1200, f1: 200 }); break;
      case 'boss': this._tone(t, { f: 90, f1: 55, type: 'sawtooth', dur: .9, peak: .18 }); this._tone(t + .02, { f: 120, f1: 70, type: 'square', dur: .8, peak: .1 }); this._noise(t, { dur: .8, peak: .1, type: 'lowpass', f: 600, f1: 120 }); break;
      case 'wolf': this._tone(t, { f: R(150, 185), f1: R(260, 340), type: 'sawtooth', dur: .28, peak: .065 * v }); this._tone(t + .18, { f: 260, f1: 130, type: 'triangle', dur: .22, peak: .045 * v }); break;
      case 'bogling': this._tone(t, { f: R(65, 90), f1: R(42, 58), type: 'sawtooth', dur: .42, peak: .09 * v }); this._noise(t, { dur: .35, peak: .045 * v, type: 'lowpass', f: 430, f1: 130 }); break;
      case 'wraith': this._noise(t, { dur: .7, peak: .055 * v, type: 'bandpass', f: 1400, f1: 3200, q: 1.2 }); this._tone(t, { f: 520, f1: 190, type: 'sine', dur: .75, peak: .045 * v }); break;
      case 'leshy': this._tone(t, { f: 72, f1: 38, type: 'sawtooth', dur: .8, peak: .13 * v }); this._noise(t, { dur: .65, peak: .07 * v, type: 'lowpass', f: 520, f1: 100 }); break;

      // ── еда/лечение/предметы ──
      case 'eat': for (let i = 0; i < 3; i++) this._noise(t + i * .12, { dur: .06, peak: .07, type: 'bandpass', f: R(500, 900), q: 2 }); break;
      case 'drink': this._tone(t, { f: 400, f1: 700, type: 'sine', dur: .18, peak: .06 }); this._tone(t + .12, { f: 500, f1: 820, type: 'sine', dur: .14, peak: .05 }); break;
      case 'heal': this._arp(t, [523, 659, 784, 1046], { step: .06, dur: .18, peak: .07, type: 'sine' }); break;
      case 'pickup': this._tone(t, { f: 660, f1: 990, type: 'triangle', dur: .08, peak: .06 }); this._tone(t + .05, { f: 880, f1: 1320, type: 'triangle', dur: .07, peak: .05 }); break;
      case 'equip': this._noise(t, { dur: .12, peak: .1, type: 'bandpass', f: 1600, q: 1.5 }); this._tone(t, { f: 320, f1: 220, type: 'square', dur: .1, peak: .05 }); break;
      case 'craft': this._noise(t, { dur: .14, peak: .1, type: 'bandpass', f: 1800, f1: 900, q: 1.2 }); this._tone(t + .04, { f: 440, f1: 660, type: 'triangle', dur: .12, peak: .06 }); break;
      case 'item_break': this._noise(t, { dur: .22, peak: .14, type: 'highpass', f: 1900, f1: 4800 }); this._tone(t, { f: 420, f1: 75, type: 'square', dur: .25, peak: .08 }); break;

      // ── мир/атмосфера ──
      case 'fire': this._noise(t, { dur: .18, peak: .06, type: 'bandpass', f: R(700, 1100), q: 1 }); break;
      case 'torch': this._noise(t, { dur: .3, peak: .1, type: 'highpass', f: 2200, f1: 3600 }); this._tone(t, { f: 240, f1: 400, type: 'triangle', dur: .12, peak: .04 }); break;
      case 'door': this._tone(t, { f: 160, f1: 120, type: 'sawtooth', dur: .35, peak: .05 }); this._noise(t, { dur: .3, peak: .04, type: 'bandpass', f: 500, q: 4 }); break;
      case 'chest': this._tone(t, { f: 145, f1: 210, type: 'sawtooth', dur: .25, peak: .05 }); this._tone(t + .18, { f: 520, f1: 360, type: 'triangle', dur: .08, peak: .05 }); break;
      case 'wind': this._noise(t, { dur: 1.4, peak: .026 * v, type: 'bandpass', f: R(500, 900), f1: R(1100, 1900), q: .6, attack: .25 }); break;
      case 'night_wind': this._noise(t, { dur: 1.7, peak: .035 * v, type: 'bandpass', f: 420, f1: 1700, q: .8, attack: .3 }); this._tone(t + .5, { f: 330, f1: 150, type: 'sine', dur: .9, peak: .018 * v, attack: .18 }); break;
      case 'sense': this._tone(t, { f: 180, f1: 320, type: 'sine', dur: .5, peak: .07 }); this._tone(t + .04, { f: 270, f1: 480, type: 'sine', dur: .5, peak: .05 }); this._noise(t, { dur: .5, peak: .03, type: 'highpass', f: 4000 }); break;

      // ── квест/итог ──
      case 'quest': this._arp(t, [523, 659, 784], { step: .1, dur: .22, peak: .09 }); break;
      case 'levelup': this._arp(t, [523, 659, 784, 1046, 1318], { step: .08, dur: .24, peak: .09 }); break;
      case 'victory': this._arp(t, [392, 523, 659, 784, 1046], { step: .16, dur: .5, peak: .1, type: 'sine' }); break;
      case 'death': this._tone(t, { f: 300, f1: 60, type: 'sawtooth', dur: .9, peak: .14 }); this._tone(t + .05, { f: 220, f1: 45, type: 'square', dur: .8, peak: .08 }); break;

      default: this._tone(t, { f: 220, type: 'square', dur: .04, peak: .05 });
    }
  }
}
