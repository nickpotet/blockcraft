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
  }

  unlock() {
    if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === 'suspended') this.context.resume();
  }

  setVolume(value) { this.volume = value; }

  play(name) {
    if (!this.context || this.volume <= 0) return;
    const profiles = {
      mine: [110, .045, 'square'], hit: [72, .09, 'sawtooth'], hurt: [48, .16, 'sawtooth'],
      craft: [420, .08, 'triangle'], quest: [620, .28, 'sine'], fire: [180, .06, 'triangle'],
      victory: [330, .7, 'sine'], sense: [260, .18, 'sine'], click: [220, .035, 'square']
    };
    const [frequency, duration, type] = profiles[name] ?? profiles.click;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * .72), now + duration);
    gain.gain.setValueAtTime(this.volume * .09, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
