const MELODY = [
  76, 79, 83, 79, 76, 72, 74, 76, 79, 76, 72, 67, 69, 71, 72, 74, 76, 79, 81, 79,
  76, 74, 72, 71, 72, 0, 76, 0, 79, 76, 74, 72,
];

const BASS = [
  48, 0, 48, 0, 43, 0, 43, 0, 45, 0, 45, 0, 41, 0, 41, 43, 48, 0, 48, 0, 43, 0,
  43, 0, 45, 0, 41, 0, 43, 0, 48, 0,
];

type MusicMode = "off" | "menu" | "play" | "pause";

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioBank {
  private coin: HTMLAudioElement | null = null;
  private pickup: HTMLAudioElement | null = null;
  private grunt: HTMLAudioElement | null = null;
  private rocket: HTMLAudioElement | null = null;
  private unlocked = false;
  private rocketOn = false;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private musicMode: MusicMode = "off";
  private step = 0;
  private nextNote = 0;
  private musicRaf = 0;

  constructor() {
    this.coin = this.el("/media/pickup-coin.mp3", 0.45);
    this.pickup = this.el("/media/item_pickup.mp3", 0.5);
    this.grunt = this.el("/media/grunt.mp3", 0.32);
    this.rocket = this.el("/media/rocket.mp3", 0.22);
    if (this.rocket) this.rocket.loop = true;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.ensureCtx();
    if (this.musicMode === "off") this.setMusic("menu");
    for (const a of [this.coin, this.pickup, this.grunt, this.rocket]) {
      if (!a) continue;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
        })
        .catch(() => {});
    }
  }

  playCoin() {
    this.restart(this.coin);
  }
  playPickup() {
    this.restart(this.pickup);
  }

  playCrash() {
    this.restart(this.grunt);
    const n = Math.floor(Math.random() * 5);
    if (n === 0) this.boing();
    else if (n === 1) this.bonk();
    else if (n === 2) this.yip();
    else if (n === 3) this.honk();
    else this.slide();
  }

  playDeath() {
    this.restart(this.grunt);
    this.slide();
    window.setTimeout(() => this.whomp(), 90);
    window.setTimeout(() => this.honk(), 180);
  }

  setRocket(on: boolean) {
    if (!this.rocket) return;
    if (on && !this.rocketOn) {
      this.rocketOn = true;
      this.rocket.play().catch(() => {});
    } else if (!on && this.rocketOn) {
      this.rocketOn = false;
      this.rocket.pause();
    }
  }

  setMusic(mode: MusicMode) {
    this.ensureCtx();
    if (!this.musicGain || !this.ctx) return;
    const was = this.musicMode;
    this.musicMode = mode;
    const vol = mode === "play" ? 0.22 : mode === "menu" ? 0.16 : mode === "pause" ? 0.05 : 0;
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.12);
    if (mode === "off") {
      this.stopMusicClock();
      return;
    }
    if (was === "off" || was === "pause" || this.musicRaf === 0) {
      this.nextNote = this.ctx.currentTime + 0.05;
      this.tickMusic();
    }
  }

  stopAll() {
    this.setRocket(false);
    this.setMusic("off");
  }

  private ensureCtx() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.85;
    this.sfxGain.connect(this.master);
    const sr = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, sr * 0.5, sr);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.ctx.resume().catch(() => {});
  }

  private tickMusic = () => {
    if (!this.ctx || this.musicMode === "off") {
      this.musicRaf = 0;
      return;
    }
    const stepDur = 60 / 138 / 2;
    const horizon = this.ctx.currentTime + 0.25;
    while (this.nextNote < horizon) {
      if (this.musicMode !== "pause") this.scheduleStep(this.nextNote, this.step);
      this.nextNote += stepDur;
      this.step = (this.step + 1) % MELODY.length;
    }
    this.musicRaf = requestAnimationFrame(this.tickMusic);
  };

  private stopMusicClock() {
    if (this.musicRaf) cancelAnimationFrame(this.musicRaf);
    this.musicRaf = 0;
  }

  private scheduleStep(when: number, step: number) {
    const ctx = this.ctx;
    const dest = this.musicGain;
    if (!ctx || !dest) return;
    const mel = MELODY[step] ?? 0;
    const bass = BASS[step] ?? 0;
    if (mel) this.tone(dest, when, midiToFreq(mel), 0.16, "square", 0.07);
    if (bass) this.tone(dest, when, midiToFreq(bass), 0.22, "triangle", 0.11);
    if (step % 2 === 1) this.hat(dest, when);
  }

  private tone(
    dest: AudioNode,
    when: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  private hat(dest: AudioNode, when: number) {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.035, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + 0.06);
  }

  private sfxNow() {
    this.ensureCtx();
    return this.ctx?.currentTime ?? 0;
  }

  private boing() {
    const ctx = this.ctx;
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    const t = this.sfxNow();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.07);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.32);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  private bonk() {
    const ctx = this.ctx;
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    const t = this.sfxNow();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.2);
    this.noiseBurst(t, 0.08, 0.18, 900);
  }

  private yip() {
    const ctx = this.ctx;
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    const t = this.sfxNow();
    this.tone(dest, t, 980, 0.07, "square", 0.22);
    this.tone(dest, t + 0.08, 720, 0.09, "square", 0.2);
    this.tone(dest, t + 0.16, 1140, 0.06, "square", 0.16);
  }

  private honk() {
    const ctx = this.ctx;
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    const t = this.sfxNow();
    this.tone(dest, t, 196, 0.22, "square", 0.2);
    this.tone(dest, t, 247, 0.22, "square", 0.12);
    this.tone(dest, t + 0.12, 185, 0.18, "square", 0.16);
  }

  private slide() {
    const ctx = this.ctx;
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    const t = this.sfxNow();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.42);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  private whomp() {
    const ctx = this.ctx;
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    const t = this.sfxNow();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.28);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.34);
    this.noiseBurst(t, 0.16, 0.22, 400);
  }

  private noiseBurst(when: number, dur: number, gain: number, hp: number) {
    const ctx = this.ctx;
    const dest = this.sfxGain;
    if (!ctx || !dest || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(hp, when);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + dur + 0.02);
  }

  private el(src: string, volume: number) {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = volume;
    return a;
  }

  private restart(a: HTMLAudioElement | null) {
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }
}
