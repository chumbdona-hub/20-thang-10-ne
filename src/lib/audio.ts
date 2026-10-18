// Âm thanh tổng hợp bằng Web Audio: nhạc nền hộp nhạc, hiệu ứng, và song.mp3 nếu có.
import { CONFIG } from "../data/config";

type Mood = "hero" | "letter" | "girls" | "wishes" | "finale" | "cinema";
type SfxName =
  | "pop"
  | "chime"
  | "whoosh"
  | "sparkle"
  | "boing"
  | "page"
  | "tick"
  | "heartbeat"
  | "bling"
  | "wish-spawn"
  | "wish-arrive"
  | "wish-grow"
  | "wish-vanish"
  | "bell"
  | "type"
  | "found"
  | "envelope"
  | "letter-tick"
  | "star"
  | "plant"
  | "teacher"
  | "photo-in"
  | "swish"
  | "mosaic-pop"
  | "film";

const MOODS: Record<Mood, { base: number; octave: number; bell: boolean; pad: number }> = {
  hero: { base: 523.25, octave: 1, bell: false, pad: 0.03 },
  letter: { base: 440, octave: 0.5, bell: false, pad: 0.04 },
  girls: { base: 587.33, octave: 1, bell: true, pad: 0.03 },
  wishes: { base: 493.88, octave: 1, bell: true, pad: 0.05 },
  finale: { base: 349.23, octave: 0.5, bell: true, pad: 0.08 },
  cinema: { base: 440, octave: 0.5, bell: false, pad: 0 },
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private delay: DelayNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextStepAt = 0;
  private step = 0;
  private mood: Mood = "hero";
  private lastSfx = new Map<string, number>();
  private started = false;
  private songEl: HTMLAudioElement | null = null;
  private songGain: GainNode | null = null;
  private songReady = false;
  private triedSong = false;
  private hiddenPaused = false;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array | null = null;
  private levelsCache = { bass: 0, mid: 0, high: 0, beat: 0, bands: [0, 0, 0, 0, 0, 0, 0, 0] as number[], at: 0 };

  get isStarted() {
    return this.started && this.ctx?.state === "running";
  }

  init() {
    if (this.started) {
      void this.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.6;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      this.master.connect(comp);
      comp.connect(ctx.destination);

      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.master);

      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.master);

      this.delay = ctx.createDelay(1.2);
      this.delay.delayTime.value = 0.29;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.26;
      const wet = ctx.createGain();
      wet.gain.value = 0.2;
      this.delay.connect(feedback);
      feedback.connect(this.delay);
      this.delay.connect(wet);
      wet.connect(this.master);

      // Analyser dùng chung để lấy năng lượng thật cho quả cầu (chỉ để đọc, không nối ra loa).
      try {
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.78;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.musicGain.connect(this.analyser);
      } catch {
        this.analyser = null;
      }

      const len = Math.floor(ctx.sampleRate * 0.6);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;

      this.started = true;
      this.nextStepAt = ctx.currentTime + 0.15;
      this.musicGain.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
      this.startScheduler();
      document.addEventListener("visibilitychange", this.onVisibility);
    } catch {
      this.started = false;
    }
  }

  private onVisibility = () => {
    if (!this.ctx) return;
    try {
      if (document.hidden) {
        this.hiddenPaused = true;
        void this.ctx.suspend();
        this.songEl?.pause();
      } else if (this.hiddenPaused) {
        this.hiddenPaused = false;
        void this.ctx.resume();
        if (this.songReady) void this.songEl?.play().catch(() => undefined);
      }
    } catch {
      /* im lặng */
    }
  };

  resume() {
    try {
      if (this.ctx && this.ctx.state !== "running") void this.ctx.resume();
    } catch {
      /* im lặng */
    }
  }

  /** Điều chỉnh riêng lớp nhạc nền (0 = im lặng) để cổng tinh cầu không có nhạc. */
  setBed(level: number) {
    if (!this.ctx || !this.musicGain) return;
    try {
      this.musicGain.gain.setTargetAtTime(Math.max(0, level), this.ctx.currentTime, 0.5);
    } catch {
      /* im lặng */
    }
  }

  setMood(mood: Mood) {
    this.mood = mood;
    if (!this.ctx || !this.musicGain) return;
    try {
      const now = this.ctx.currentTime;
      if (mood === "cinema") {
        // Rất khẽ: nếu có song.mp3 thì bài hát nổi lên, nếu chưa có file thì phần mở màn vẫn có nhạc.
        this.musicGain.gain.setTargetAtTime(0.14, now, 0.8);
      } else {
        this.musicGain.gain.setTargetAtTime(0.5, now, 0.9);
      }
    } catch {
      /* im lặng */
    }
  }

  private startScheduler() {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => this.schedule(), 220);
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.musicGain) return;
    try {
      const beat = 60 / CONFIG.song.bpm;
      const lookAhead = 0.7;
      while (this.nextStepAt < ctx.currentTime + lookAhead) {
        this.playStep(this.step, this.nextStepAt);
        this.step = (this.step + 1) % 64;
        this.nextStepAt += beat / 2;
      }
      if (this.nextStepAt < ctx.currentTime) this.nextStepAt = ctx.currentTime + 0.1;
    } catch {
      /* im lặng */
    }
  }

  private playStep(step: number, at: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const cfg = MOODS[this.mood];
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];
    const pattern = [0, 4, 2, 5, 3, 7, 5, 1, 0, 4, 6, 2, 5, 3, 7, 4];
    const idx = pattern[step % pattern.length] ?? 0;
    const semi = scale[idx % scale.length] ?? 0;
    const bar = Math.floor(step / 8);
    const freq = cfg.base * Math.pow(2, semi / 12) * (bar % 2 === 1 ? cfg.octave : 1);

    if (step % 2 === 0) this.pluck(freq, at, 0.9, 0.09, "sine");
    if (step % 8 === 0) this.pluck(cfg.base / 2, at, 1.8, cfg.pad, "triangle");
    if (step % 8 === 4) this.pluck(cfg.base * 0.75, at, 1.6, cfg.pad * 0.8, "sine");
    if (cfg.bell && (step % 8 === 3 || step % 8 === 6)) {
      const bellFreq = cfg.base * 2 * Math.pow(2, ((step * 5) % 12) / 12);
      this.pluck(bellFreq, at + 0.04, 0.55, 0.028, "sine", true);
    }
    if (this.mood === "wishes" && step % 16 === 10) this.pluck(cfg.base * 4, at, 0.7, 0.014, "sine", true);
  }

  private pluck(freq: number, at: number, dur: number, gain: number, type: OscillatorType, bell = false) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || !this.delay) return;
    try {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, at);
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0004, gain), at + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(env);
      env.connect(this.musicGain);
      const send = ctx.createGain();
      send.gain.value = bell ? 0.4 : 0.16;
      env.connect(send);
      send.connect(this.delay);
      osc.start(at);
      osc.stop(at + dur + 0.05);
    } catch {
      /* im lặng */
    }
  }

  private tone(
    _name: string,
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; to?: number; delay?: number } = {},
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime + (opts.delay ?? 0);
    try {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = opts.type ?? "sine";
      osc.frequency.setValueAtTime(freq, now);
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.to), now + dur);
      const peak = Math.max(0.0005, opts.gain ?? 0.08);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(peak, now + Math.min(0.03, dur / 3));
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(env);
      env.connect(this.sfxGain);
      if (this.delay) {
        const send = ctx.createGain();
        send.gain.value = 0.18;
        env.connect(send);
        send.connect(this.delay);
      }
      osc.start(now);
      osc.stop(now + dur + 0.04);
    } catch {
      /* im lặng */
    }
  }

  private noiseHit(gain = 0.05, dur = 0.4, freq = 900) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.noise) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = 0.8;
      const env = ctx.createGain();
      const now = ctx.currentTime;
      env.gain.setValueAtTime(gain, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(filter);
      filter.connect(env);
      env.connect(this.sfxGain);
      src.start(now);
      src.stop(now + dur);
    } catch {
      /* im lặng */
    }
  }

  sfx(name: SfxName, variation = 0) {
    if (!this.isStarted) return;
    const now = performance.now();
    const last = this.lastSfx.get(name) ?? 0;
    const cooldown = name === "wish-spawn" || name === "wish-arrive" ? 320 : 55;
    if (now - last < cooldown) return;
    this.lastSfx.set(name, now);
    const up = variation % 5;

    switch (name) {
      case "pop":
        this.tone("pop", 480 + up * 40, 0.14, { type: "sine", gain: 0.11, to: 880 + up * 60 });
        break;
      case "chime":
        [523.25, 659.25, 783.99].forEach((f, i) =>
          this.tone("chime", f * (1 + up * 0.015), 0.5, { gain: 0.045, delay: i * 0.075 }),
        );
        break;
      case "whoosh":
        this.noiseHit(0.035, 0.5, 750);
        this.tone("whoosh", 220, 0.4, { type: "sine", gain: 0.02, to: 120 });
        break;
      case "sparkle":
        [1046, 1318, 1568, 2093].forEach((f, i) =>
          this.tone("sparkle", f, 0.32, { gain: 0.024, delay: i * 0.045 }),
        );
        break;
      case "boing":
        this.tone("boing", 180, 0.3, { type: "triangle", gain: 0.07, to: 330 });
        this.tone("boing2", 360, 0.18, { type: "sine", gain: 0.025, to: 250, delay: 0.06 });
        break;
      case "page":
        this.noiseHit(0.045, 0.22, 1800);
        break;
      case "tick":
        this.tone("tick", 1800, 0.06, { type: "sine", gain: 0.018 });
        break;
      case "heartbeat":
        this.tone("beat-a", 76, 0.15, { type: "sine", gain: 0.11, to: 52 });
        this.tone("beat-b", 68, 0.16, { type: "sine", gain: 0.08, to: 48, delay: 0.19 });
        break;
      case "bling":
        this.tone("bling", 1568, 0.5, { gain: 0.025 });
        this.tone("bling2", 2093, 0.6, { gain: 0.018, delay: 0.07 });
        break;
      case "wish-spawn":
        this.tone("wish-spawn", 880 + up * 100, 0.22, { gain: 0.018, to: 1320 });
        break;
      case "wish-arrive":
        this.tone("wish-arrive", 523 + up * 90, 0.6, { gain: 0.034 });
        this.tone("wish-arrive2", 784 + up * 90, 0.5, { gain: 0.02, delay: 0.08 });
        break;
      case "wish-grow":
        this.tone("wish-grow", 392, 0.5, { type: "sine", gain: 0.028, to: 1046 });
        break;
      case "wish-vanish":
        [1568, 1318, 1046].forEach((f, i) =>
          this.tone("wish-vanish", f, 0.4, { gain: 0.017, delay: i * 0.05 }),
        );
        break;
      case "bell":
        [659.25, 987.77, 1318.5].forEach((f, i) =>
          this.tone("bell", f, 1.1, { gain: 0.04, delay: i * 0.12 }),
        );
        break;
      case "type":
        this.tone("type", 1400 + Math.random() * 260, 0.035, { type: "triangle", gain: 0.012 });
        break;
      case "letter-tick":
        this.tone("letter-tick", 900 + Math.random() * 180, 0.05, { type: "sine", gain: 0.014 });
        break;
      case "found":
        [783.99, 1046.5, 1318.5].forEach((f, i) =>
          this.tone("found", f, 0.5, { gain: 0.035, delay: i * 0.09 }),
        );
        break;
      case "envelope":
        this.noiseHit(0.05, 0.32, 1500);
        this.tone("envelope", 320, 0.28, { type: "triangle", gain: 0.028, to: 520 });
        break;
      case "star":
        this.tone("star", 1560 + up * 120, 0.28, { gain: 0.022 });
        this.tone("star2", 2340, 0.22, { gain: 0.013, delay: 0.04 });
        break;
      case "plant":
        this.tone("plant", 220, 0.26, { type: "sine", gain: 0.05, to: 420 });
        this.noiseHit(0.025, 0.18, 600);
        break;
      case "teacher":
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
          this.tone("teacher", f, 1.4, { gain: 0.032, delay: i * 0.14 }),
        );
        break;
      case "photo-in":
        this.noiseHit(0.035, 0.16, 2400);
        [1046.5, 1318.5].forEach((f, i) => this.tone("photo-in", f, 0.32, { gain: 0.016, delay: i * 0.06 }));
        break;
      case "swish":
        this.noiseHit(0.022, 0.28, 1200);
        this.tone("swish", 520, 0.22, { type: "sine", gain: 0.014, to: 300 });
        break;
      case "mosaic-pop":
        this.tone("mosaic-pop", 760 + up * 80, 0.12, { type: "triangle", gain: 0.028, to: 1180 });
        break;
      case "film":
        this.noiseHit(0.02, 0.4, 900);
        this.tone("film", 392, 0.5, { type: "sine", gain: 0.025, to: 523.25 });
        break;
      default:
        break;
    }
  }

  /**
   * Mở khoá phần tử audio của bài hát ngay trong cử chỉ chạm đầu tiên (iOS):
   * play() rồi pause() + tua về 0, âm lượng 0 để không nghe thấy.
   */
  unlockSong() {
    try {
      if (!this.songEl) {
        const el = new Audio();
        el.src = CONFIG.song.url;
        el.preload = "auto";
        el.loop = false;
        el.volume = 0;
        el.setAttribute("playsinline", "true");
        el.addEventListener("error", () => {
          this.songReady = false;
        });
        el.addEventListener("loadedmetadata", () => {
          this.songReady = true;
        });
        if (this.ctx && this.master) {
          const gain = this.ctx.createGain();
          gain.gain.value = 0;
          gain.connect(this.master);
          try {
            const source = this.ctx.createMediaElementSource(el);
            source.connect(gain);
            if (this.analyser) gain.connect(this.analyser);
          } catch {
            /* Safari cũ: vẫn phát qua phần tử audio */
          }
          this.songGain = gain;
        }
        this.songEl = el;
      }
      const pending = this.songEl.play();
      if (pending && typeof pending.then === "function") {
        pending
          .then(() => {
            try {
              this.songEl!.pause();
              this.songEl!.currentTime = 0;
              this.songEl!.volume = 1;
            } catch {
              /* bỏ qua */
            }
          })
          .catch(() => {
            try {
              if (this.songEl) this.songEl.volume = 1;
            } catch {
              /* bỏ qua */
            }
          });
      }
    } catch {
      /* trình duyệt không cho mở khoá, cảnh phim vẫn tự chạy */
    }
  }

  /** Thử phát song.mp3; nếu thiếu file thì im lặng và cảnh dùng đồng hồ nội bộ. */
  startSong() {
    if (!this.ctx || !this.master || !this.songGain) {
      if (!this.ctx) return;
    }
    try {
      if (!this.songEl) {
        const el = new Audio();
        el.src = CONFIG.song.url;
        el.preload = "auto";
        el.loop = false;
        el.addEventListener("error", () => {
          this.songReady = false;
        });
        el.addEventListener("loadedmetadata", () => {
          this.songReady = true;
        });
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.connect(this.master!);
        try {
          const source = this.ctx.createMediaElementSource(el);
          source.connect(gain);
        } catch {
          gain.connect(this.master!);
        }
        this.songEl = el;
        this.songGain = gain;
      }
      this.triedSong = true;
      try {
        if (this.songEl) this.songEl.currentTime = 0;
      } catch {
        /* file chưa sẵn sàng */
      }
      this.songGain?.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.6);
      void this.songEl.play().catch(() => {
        this.songReady = false;
      });
    } catch {
      this.songReady = false;
    }
  }

  get hasSong() {
    const el = this.songEl;
    return this.songReady && !!el && !el.paused && el.currentTime > 0.05 && el.readyState >= 2;
  }

  get triedSongOnce() {
    return this.triedSong;
  }

  songTime(): number | null {
    if (!this.songEl || !this.songReady) return null;
    return this.songEl.currentTime;
  }

  /** Năng lượng âm nhạc 0–1 cho hiệu ứng quả cầu. Có analyser thì dùng số thật. */
  levels() {
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
    const cache = this.levelsCache;
    if (now - cache.at < 32) return cache;
    cache.at = now;
    let bass = 0;
    let mid = 0;
    let high = 0;
    try {
      if (this.analyser && this.freqData && this.ctx && this.ctx.state === "running") {
        this.analyser.getByteFrequencyData(this.freqData as Uint8Array<ArrayBuffer>);
        const n = this.freqData.length;
        const bands: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < n; i += 1) {
          const value = this.freqData[i] / 255;
          const index = Math.min(7, Math.floor((i / n) * 8));
          bands[index] += value;
        }
        for (let b = 0; b < 8; b += 1) {
          bands[b] = Math.min(1, bands[b] / Math.max(1, n / 8) * 2.1);
          const weight = 1 - Math.abs(b - 1.6) / 8;
          if (b <= 2) bass += bands[b] * weight;
          else if (b <= 5) mid += bands[b] * weight;
          else high += bands[b] * weight;
        }
        bass = Math.min(1, bass / 2.2);
        mid = Math.min(1, mid / 2.4);
        high = Math.min(1, high / 2.2);
        cache.bands = bands;
      }
    } catch {
      bass = 0;
    }
    const beatLength = 60 / CONFIG.song.bpm;
    const wall = now / 1000 - CONFIG.song.beatOffset;
    const beatPos = ((wall % beatLength) + beatLength) % beatLength;
    const simulated = Math.exp(-beatPos * 6.5);
    if (bass + mid + high < 0.02) {
      const t = now / 1000;
      bass = 0.34 + simulated * 0.42;
      mid = 0.3 + 0.18 * Math.sin(t * 1.7);
      high = 0.22 + 0.12 * Math.sin(t * 2.9 + 1);
      const bands: number[] = [];
      for (let b = 0; b < 8; b += 1) bands.push(Math.min(1, 0.22 + simulated * (0.5 - b * 0.045) + 0.14 * Math.sin(t * 2.2 + b)));
      cache.bands = bands;
    }
    cache.bass += (bass - cache.bass) * 0.5;
    cache.mid += (mid - cache.mid) * 0.45;
    cache.high += (high - cache.high) * 0.4;
    cache.beat = Math.max(simulated, (cache.bass * 0.7 + cache.mid * 0.3) * 0.9);
    return cache;
  }

  pauseSong() {
    try {
      this.songEl?.pause();
      if (this.ctx && this.songGain) this.songGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    } catch {
      /* im lặng */
    }
  }

  resumeSong() {
    try {
      if (!this.songEl) return;
      if (this.ctx && this.songGain) this.songGain.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.3);
      void this.songEl.play().catch(() => undefined);
    } catch {
      /* im lặng */
    }
  }

  stopSong(fade = 1) {
    try {
      if (this.ctx && this.songGain) this.songGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, fade / 3);
      window.setTimeout(() => {
        try {
          this.songEl?.pause();
          if (this.songEl) this.songEl.currentTime = 0;
        } catch {
          /* im lặng */
        }
      }, fade * 1000);
    } catch {
      /* im lặng */
    }
  }
}

export const audio = new AudioEngine();
