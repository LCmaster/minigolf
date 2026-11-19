/**
 * AudioManager.ts
 * Unified Web Audio sound coordinator for Mini Golf Mania.
 * Combines normalized OpenGameArt sample playback (`SoundBank`), procedural fallbacks
 * (`SynthEffects`), ground-gated turf rolling modulation, and persisted mute controls.
 */

import { SoundBank, type SoundId } from "./SoundBank";
import {
  createNoiseRollingBuffer,
  synthAimTick,
  synthBooster,
  synthBumper,
  synthCupSink,
  synthPutt,
  synthWallBounce,
  synthWaterSplash,
} from "./SynthEffects";

const MUTE_STORAGE_KEY = "minigolf_audio_muted";
const WALL_BOUNCE_MIN_SPEED = 0.35;
const WALL_BOUNCE_COOLDOWN_MS = 50;
const ROLL_MIN_SPEED = 0.25;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private readonly soundBank: SoundBank;

  // Ground-gated continuous rolling loop
  private rollSource: AudioBufferSourceNode | null = null;
  private rollFilter: BiquadFilterNode | null = null;
  private rollGain: GainNode | null = null;
  private fallbackRollingBuffer: AudioBuffer | null = null;
  private rollingUsesSample: boolean = false;
  private rollStopTimer: ReturnType<typeof setTimeout> | null = null;

  private lastWallBounceMs: number = -Infinity;

  constructor(soundBank?: SoundBank) {
    this.soundBank = soundBank ?? new SoundBank();
    this.isMuted = this.readPersistedMute();
  }

  private readPersistedMute(): boolean {
    try {
      const storage = typeof window !== "undefined" ? window.localStorage : undefined;
      return storage?.getItem(MUTE_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  private persistMute(muted: boolean): void {
    try {
      const storage = typeof window !== "undefined" ? window.localStorage : undefined;
      storage?.setItem(MUTE_STORAGE_KEY, muted ? "true" : "false");
    } catch {
      // Ignore storage quota or private-browsing errors
    }
  }

  private ensureContext(): { ctx: AudioContext; master: GainNode } | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      void this.soundBank.preload(this.ctx);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume?.();
    }
    return this.masterGain ? { ctx: this.ctx, master: this.masterGain } : null;
  }

  private playSample(
    ctx: AudioContext,
    master: GainNode,
    id: SoundId,
    volume: number,
    playbackRate: number = 1
  ): boolean {
    const buffer = this.soundBank.get(id);
    if (!buffer) return false;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    if (src.playbackRate) {
      src.playbackRate.value = playbackRate;
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001, volume), ctx.currentTime);

    src.connect(gain);
    gain.connect(master);
    src.start();
    return true;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.persistMute(this.isMuted);
    if (this.isMuted) {
      this.stopRollingImmediately();
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.015);
    }
    return this.isMuted;
  }

  public playPutt(power: number): void {
    if (this.isMuted) return;
    const ready = this.ensureContext();
    if (!ready) return;

    const p = Math.max(0, Math.min(1, power));
    if (!this.playSample(ready.ctx, ready.master, "putt", 0.35 + p * 0.55, 0.94 + p * 0.14)) {
      synthPutt(ready.ctx, ready.master, p);
    }
  }

  public playWallBounce(impactSpeed: number = 3.0): void {
    if (this.isMuted || impactSpeed < WALL_BOUNCE_MIN_SPEED) return;

    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (nowMs - this.lastWallBounceMs < WALL_BOUNCE_COOLDOWN_MS) return;

    const ready = this.ensureContext();
    if (!ready) return;
    this.lastWallBounceMs = nowMs;

    const intensity = Math.max(0.15, Math.min(1, impactSpeed / 10));
    if (
      !this.playSample(
        ready.ctx,
        ready.master,
        "wall_bounce",
        0.22 + intensity * 0.55,
        0.92 + intensity * 0.18
      )
    ) {
      synthWallBounce(ready.ctx, ready.master, impactSpeed);
    }
  }

  public playBumper(): void {
    if (this.isMuted) return;
    const ready = this.ensureContext();
    if (!ready) return;

    if (!this.playSample(ready.ctx, ready.master, "bumper", 0.72, 0.97 + Math.random() * 0.08)) {
      synthBumper(ready.ctx, ready.master);
    }
  }

  public playBooster(): void {
    if (this.isMuted) return;
    const ready = this.ensureContext();
    if (!ready) return;

    if (!this.playSample(ready.ctx, ready.master, "booster", 0.8)) {
      synthBooster(ready.ctx, ready.master);
    }
  }

  public playWaterSplash(): void {
    if (this.isMuted) return;
    const ready = this.ensureContext();
    if (!ready) return;

    if (!this.playSample(ready.ctx, ready.master, "splash", 0.82)) {
      synthWaterSplash(ready.ctx, ready.master);
    }
  }

  public playAimTick(tier: number = 1): void {
    if (this.isMuted) return;
    const ready = this.ensureContext();
    if (!ready) return;

    const clamped = Math.max(1, Math.min(4, tier));
    if (!this.playSample(ready.ctx, ready.master, "aim_tick", 0.28, 0.9 + clamped * 0.08)) {
      synthAimTick(ready.ctx, ready.master, clamped);
    }
  }

  public playCupSink(isParOrBetter: boolean = false): void {
    if (this.isMuted) return;
    const ready = this.ensureContext();
    if (!ready) return;

    if (!this.playSample(ready.ctx, ready.master, "cup_sink", 0.82)) {
      synthCupSink(ready.ctx, ready.master);
    }
    if (isParOrBetter) {
      this.playSample(ready.ctx, ready.master, "applause", 0.65);
    }
  }

  public updateRolling(speed: number, isGrounded: boolean = true): void {
    if (this.isMuted || !isGrounded || speed <= ROLL_MIN_SPEED) {
      this.fadeOutRolling();
      return;
    }

    const ready = this.ensureContext();
    if (!ready) return;
    const { ctx, master } = ready;

    if (this.rollStopTimer !== null) {
      clearTimeout(this.rollStopTimer);
      this.rollStopTimer = null;
    }

    const sampleLoaded = this.soundBank.isLoaded("rolling");
    if (this.rollSource && !this.rollingUsesSample && sampleLoaded) {
      this.stopRollingImmediately();
    }

    if (!this.rollSource) {
      const buffer =
        this.soundBank.get("rolling") ??
        this.fallbackRollingBuffer ??
        (this.fallbackRollingBuffer = createNoiseRollingBuffer(ctx));

      this.rollSource = ctx.createBufferSource();
      this.rollSource.buffer = buffer;
      this.rollSource.loop = true;

      this.rollFilter = ctx.createBiquadFilter();
      this.rollFilter.type = "lowpass";
      this.rollFilter.frequency.setValueAtTime(550, ctx.currentTime);

      this.rollGain = ctx.createGain();
      this.rollGain.gain.setValueAtTime(0.02, ctx.currentTime);

      this.rollSource.connect(this.rollFilter);
      this.rollFilter.connect(this.rollGain);
      this.rollGain.connect(master);

      this.rollSource.start();
      this.rollingUsesSample = sampleLoaded;
    }

    const norm = Math.max(0, Math.min(1, speed / 14));
    const cutoffHz = 450 + norm * 1950;
    const rate = 0.78 + norm * 0.72;
    const vol = 0.04 + norm * 0.34;

    this.rollFilter?.frequency.setTargetAtTime?.(cutoffHz, ctx.currentTime, 0.04);
    this.rollSource.playbackRate?.setTargetAtTime?.(rate, ctx.currentTime, 0.04);
    this.rollGain?.gain.setTargetAtTime(vol, ctx.currentTime, 0.04);
  }

  private fadeOutRolling(): void {
    if (!this.rollSource || !this.rollGain || !this.ctx || this.rollStopTimer !== null) return;
    this.rollGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.025);
    this.rollStopTimer = setTimeout(() => {
      this.rollStopTimer = null;
      this.stopRollingImmediately();
    }, 80);
  }

  private stopRollingImmediately(): void {
    if (this.rollStopTimer !== null) {
      clearTimeout(this.rollStopTimer);
      this.rollStopTimer = null;
    }
    if (this.rollSource) {
      try {
        this.rollSource.stop();
        this.rollSource.disconnect();
      } catch {
        // Ignore already-stopped source errors
      }
      this.rollSource = null;
    }
    this.rollFilter?.disconnect?.();
    this.rollGain?.disconnect?.();
    this.rollFilter = null;
    this.rollGain = null;
    this.rollingUsesSample = false;
  }

  public dispose(): void {
    this.stopRollingImmediately();
    this.fallbackRollingBuffer = null;
    this.masterGain?.disconnect?.();
    this.masterGain = null;
    if (this.ctx) {
      void this.ctx.close?.();
      this.ctx = null;
    }
  }
}
