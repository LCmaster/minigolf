/**
 * SoundBank.ts
 * Lazily fetches, decodes, and caches static audio samples under /sounds/
 * with graceful no-throw fallback handling for headless tests or offline environments.
 */

export type SoundId =
  | "rolling"
  | "putt"
  | "wall_bounce"
  | "bumper"
  | "booster"
  | "splash"
  | "cup_sink"
  | "aim_tick"
  | "applause";

export const SOUND_PATHS: Record<SoundId, string> = {
  rolling: "/sounds/rolling.wav",
  putt: "/sounds/putt.wav",
  wall_bounce: "/sounds/wall_bounce.wav",
  bumper: "/sounds/bumper.wav",
  booster: "/sounds/booster.wav",
  splash: "/sounds/splash.wav",
  cup_sink: "/sounds/cup_sink.wav",
  aim_tick: "/sounds/aim_tick.wav",
  applause: "/sounds/applause.mp3",
};

export class SoundBank {
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private readonly fetchFn?: typeof fetch;
  private preloadPromise: Promise<void> | null = null;

  constructor(fetchFn?: typeof fetch) {
    this.fetchFn = fetchFn ?? (typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined);
  }

  /** Fetches and decodes all SFX assets into cached `AudioBuffer`s (idempotent). */
  public preload(ctx: AudioContext): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;
    if (!this.fetchFn || typeof ctx.decodeAudioData !== "function") {
      this.preloadPromise = Promise.resolve();
      return this.preloadPromise;
    }

    const entries = Object.entries(SOUND_PATHS) as [SoundId, string][];
    this.preloadPromise = Promise.all(
      entries.map(async ([id, url]) => {
        try {
          const response = await this.fetchFn!(url);
          if (!response.ok) return;
          const arrayBuffer = await response.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          if (decoded) {
            this.buffers.set(id, decoded);
          }
        } catch {
          // Swallow transient fetch/decode errors so procedural fallback SFX always remain playable
        }
      })
    ).then(() => undefined);

    return this.preloadPromise;
  }

  /** Returns the decoded `AudioBuffer` for `id`, or `null` if not loaded yet. */
  public get(id: SoundId): AudioBuffer | null {
    return this.buffers.get(id) ?? null;
  }

  /** Returns `true` when `id` has been decoded and cached. */
  public isLoaded(id: SoundId): boolean {
    return this.buffers.has(id);
  }

  /** Empties all cached buffers and resets preload state. */
  public clear(): void {
    this.buffers.clear();
    this.preloadPromise = null;
  }
}
