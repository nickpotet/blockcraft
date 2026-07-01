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
