/**
 * AudioManager.ts
 * Procedural low-latency Web Audio API sound generator for Mini Golf Mania.
 * Synthesizes putt thwacks, ball rolling rumbles, rubber bumper pops, water splashes,
 * and celebratory cup capture chimes without requiring external audio assets.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Ball rolling continuous rumble
  private rollOsc: OscillatorNode | null = null;
  private rollGain: GainNode | null = null;
  private isRolling: boolean = false;

  constructor() {
    // AudioContext will be lazily initialized on first user interaction
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Putter hit impact sound: punchy pop scaling pitch & volume with shot power.
   */
  public playPutt(power: number): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const startFreq = 160 + power * 120;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);

    const volume = 0.3 + power * 0.5;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /**
   * Bumper bounce pop: crisp bouncy spring FM chime.
   */
  public playBumper(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  /**
   * Water hazard splash: filtered noise sweep.
   */
  public playWaterSplash(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Buffer noise
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start();
    whiteNoise.stop(ctx.currentTime + 0.4);
  }

  /**
   * Cup capture chime: celebratory harmonic bell chord.
   */
  public playCupSink(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // C-major chord frequencies: C6, E6, G6
    const freqs = [1046.5, 1318.5, 1567.98];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.85);
    });
  }

  public updateRolling(speed: number): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (speed > 0.3) {
      if (!this.isRolling) {
        this.rollOsc = ctx.createOscillator();
        this.rollGain = ctx.createGain();

        this.rollOsc.type = "triangle";
        this.rollOsc.frequency.setValueAtTime(60, ctx.currentTime);

        this.rollGain.gain.setValueAtTime(0.05, ctx.currentTime);

        this.rollOsc.connect(this.rollGain);
        this.rollGain.connect(ctx.destination);

        this.rollOsc.start();
        this.isRolling = true;
      }

      if (this.rollOsc && this.rollGain) {
        const pitch = Math.min(60 + speed * 12, 180);
        const vol = Math.min(0.03 + (speed / 15) * 0.08, 0.12);
        this.rollOsc.frequency.setTargetAtTime(pitch, ctx.currentTime, 0.05);
        this.rollGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
      }
    } else {
      if (this.isRolling && this.rollGain && this.rollOsc) {
        this.rollGain.gain.setTargetAtTime(0.001, ctx.currentTime, 0.05);
        setTimeout(() => {
          if (this.rollOsc) {
            this.rollOsc.stop();
            this.rollOsc.disconnect();
            this.rollOsc = null;
          }
          this.isRolling = false;
        }, 60);
      }
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

