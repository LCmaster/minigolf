/**
 * SynthEffects.ts
 * Procedural Web Audio fallback synthesizers used before samples finish decoding
 * or in headless/test environments without sample playback.
 */

interface ToneOptions {
  type: OscillatorType;
  startFreq: number;
  endFreq: number;
  startVol: number;
  duration: number;
  delay?: number;
}

function playTone(ctx: AudioContext, dest: AudioNode, opts: ToneOptions): void {
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.startFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t0 + opts.duration * 0.85);

  gain.gain.setValueAtTime(Math.max(0.001, opts.startVol), t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + opts.duration);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(t0);
  osc.stop(t0 + opts.duration + 0.02);
}

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Synthesizes a filtered pink-like soft turf noise loop buffer for fallback rolling audio. */
export function createNoiseRollingBuffer(ctx: AudioContext): AudioBuffer {
  const durationSec = 1.0;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  let prev = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    prev = (prev + 0.08 * white) / 1.08;
    output[i] = prev * 1.8;
  }
  return buffer;
}

export function synthPutt(ctx: AudioContext, dest: AudioNode, power: number): void {
  const p = Math.max(0, Math.min(1, power));
  playTone(ctx, dest, {
    type: "sine",
    startFreq: 160 + p * 120,
    endFreq: 45,
    startVol: 0.28 + p * 0.45,
    duration: 0.14,
  });
}

export function synthWallBounce(ctx: AudioContext, dest: AudioNode, impactSpeed: number): void {
  const intensity = Math.max(0.15, Math.min(1, impactSpeed / 10));
  playTone(ctx, dest, {
    type: "triangle",
    startFreq: 190 + intensity * 70,
    endFreq: 85,
    startVol: 0.14 + intensity * 0.34,
    duration: 0.11,
  });
}

export function synthBumper(ctx: AudioContext, dest: AudioNode): void {
  playTone(ctx, dest, {
    type: "triangle",
    startFreq: 320,
    endFreq: 680,
    startVol: 0.45,
    duration: 0.18,
  });
}

export function synthBooster(ctx: AudioContext, dest: AudioNode): void {
  const t0 = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, 0.35);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(400, t0);
  filter.frequency.exponentialRampToValueAtTime(2200, t0 + 0.32);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, t0);
  gain.gain.exponentialRampToValueAtTime(0.32, t0 + 0.16);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start(t0);
  source.stop(t0 + 0.36);

  playTone(ctx, dest, {
    type: "sine",
    startFreq: 440,
    endFreq: 980,
    startVol: 0.22,
    duration: 0.28,
  });
}

export function synthWaterSplash(ctx: AudioContext, dest: AudioNode): void {
  const t0 = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, 0.4);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, t0);
  filter.frequency.exponentialRampToValueAtTime(160, t0 + 0.35);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.45, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start(t0);
  source.stop(t0 + 0.4);

  playTone(ctx, dest, {
    type: "sine",
    startFreq: 520,
    endFreq: 210,
    startVol: 0.2,
    duration: 0.12,
  });
}

export function synthCupSink(ctx: AudioContext, dest: AudioNode): void {
  // Subtle hollow cup rattle tap leading into C-major chime
  playTone(ctx, dest, {
    type: "triangle",
    startFreq: 240,
    endFreq: 130,
    startVol: 0.18,
    duration: 0.06,
  });
  const chord = [1046.5, 1318.5, 1567.98];
  chord.forEach((freq, i) => {
    playTone(ctx, dest, {
      type: "sine",
      startFreq: freq,
      endFreq: freq,
      startVol: 0.25,
      duration: 0.8,
      delay: 0.06 + i * 0.06,
    });
  });
}

export function synthAimTick(ctx: AudioContext, dest: AudioNode, tier: number): void {
  const clampedTier = Math.max(1, Math.min(4, tier));
  playTone(ctx, dest, {
    type: "sine",
    startFreq: 540 + clampedTier * 95,
    endFreq: 380 + clampedTier * 55,
    startVol: 0.12,
    duration: 0.035,
  });
}

