import { describe, it, expect, vi, afterEach } from "vitest";
import { AudioManager } from "./AudioManager";
import { SoundBank, SOUND_PATHS, type SoundId } from "./SoundBank";

function createMockAudioEnv() {
  const sources: any[] = [];
  const filters: any[] = [];
  const gains: any[] = [];
  const oscillators: any[] = [];

  const createGain = vi.fn(() => {
    const g = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn((v: number) => {
          g.gain.value = v;
        }),
        exponentialRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn((v: number) => {
          g.gain.value = v;
        }),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    gains.push(g);
    return g;
  });

  const createOscillator = vi.fn(() => {
    const osc = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    oscillators.push(osc);
    return osc;
  });

  const createBufferSource = vi.fn(() => {
    const src = {
      buffer: null as any,
      loop: false,
      playbackRate: {
        value: 1,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    sources.push(src);
    return src;
  });

  const createBiquadFilter = vi.fn(() => {
    const flt = {
      type: "lowpass",
      frequency: {
        value: 350,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    filters.push(flt);
    return flt;
  });

  const mockBuffer = {
    duration: 1.0,
    getChannelData: vi.fn(() => new Float32Array(100)),
  };

  const mockAudioContext = {
    state: "running",
    currentTime: 10.0,
    sampleRate: 44100,
    destination: {},
    resume: vi.fn(),
    close: vi.fn(),
    decodeAudioData: vi.fn(async () => ({ duration: 0.5 })),
    createGain,
    createOscillator,
    createBuffer: vi.fn(() => mockBuffer),
    createBufferSource,
    createBiquadFilter,
  };

  const storage = new Map<string, string>();
  const mockLocalStorage = {
    getItem: vi.fn((k: string) => storage.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => storage.set(k, v)),
    removeItem: vi.fn((k: string) => storage.delete(k)),
    clear: vi.fn(() => storage.clear()),
  };

  (globalThis as any).window = {
    AudioContext: vi.fn(() => mockAudioContext),
    localStorage: mockLocalStorage,
  };
  (globalThis as any).localStorage = mockLocalStorage;

  return { mockAudioContext, sources, filters, gains, oscillators, mockLocalStorage, storage };
}

describe("AudioManager Unit Tests", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  });

  it("toggles mute state correctly", () => {
    const audio = new AudioManager();
    expect(audio.getMuted()).toBe(false);
    expect(audio.toggleMute()).toBe(true);
    expect(audio.getMuted()).toBe(true);
    expect(audio.toggleMute()).toBe(false);
    expect(audio.getMuted()).toBe(false);
  });

  it("handles server-side / headless rendering without window.AudioContext without crashing", () => {
    const audio = new AudioManager();
    expect(() => {
      audio.playPutt(0.5);
      audio.playWallBounce(3.0);
      audio.playBumper();
      audio.playBooster();
      audio.playWaterSplash();
      audio.playAimTick(2);
      audio.playCupSink(true);
      audio.updateRolling(5.0, true);
      audio.updateRolling(0.1, false);
      audio.dispose();
    }).not.toThrow();
  });

  it("synthesizes procedural fallback sound nodes when samples are not yet decoded", () => {
    const { mockAudioContext } = createMockAudioEnv();
    const audio = new AudioManager();

    audio.playPutt(0.8);
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();

    audio.playBumper();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    audio.playWaterSplash();
    expect(mockAudioContext.createBuffer).toHaveBeenCalled();
    expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();

    audio.playCupSink();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    audio.playBooster();
    audio.playWallBounce(4.0);
    audio.playAimTick(3);

    audio.toggleMute();
    mockAudioContext.createOscillator.mockClear();
    audio.playPutt(1.0);
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();

    audio.dispose();
  });

  it("plays decoded samples from SoundBank and layers applause only when Par or better", async () => {
    const { sources, mockAudioContext } = createMockAudioEnv();
    const sampleBuffers = new Map<SoundId, AudioBuffer>();
    for (const id of Object.keys(SOUND_PATHS) as SoundId[]) {
      sampleBuffers.set(id, { id, duration: 0.5 } as unknown as AudioBuffer);
    }

    const fakeBank = {
      preload: vi.fn(async () => {}),
      get: vi.fn((id: SoundId) => sampleBuffers.get(id) ?? null),
      isLoaded: vi.fn((id: SoundId) => sampleBuffers.has(id)),
      clear: vi.fn(),
    } as unknown as SoundBank;

    const audio = new AudioManager(fakeBank);
    mockAudioContext.createOscillator.mockClear();

    audio.playPutt(0.7);
    expect(sources.at(-1)?.buffer).toBe(sampleBuffers.get("putt"));
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();

    audio.playWallBounce(5.0);
    expect(sources.at(-1)?.buffer).toBe(sampleBuffers.get("wall_bounce"));

    audio.playBumper();
    expect(sources.at(-1)?.buffer).toBe(sampleBuffers.get("bumper"));

    audio.playBooster();
    expect(sources.at(-1)?.buffer).toBe(sampleBuffers.get("booster"));

    audio.playWaterSplash();
    expect(sources.at(-1)?.buffer).toBe(sampleBuffers.get("splash"));

    audio.playAimTick(4);
    expect(sources.at(-1)?.buffer).toBe(sampleBuffers.get("aim_tick"));

    // Bogey cup sink: plays cup_sink without applause
    const beforeBogey = sources.length;
    audio.playCupSink(false);
    expect(sources.length - beforeBogey).toBe(1);
    expect(sources.at(-1)?.buffer).toBe(sampleBuffers.get("cup_sink"));

    // Par-or-better cup sink: plays both cup_sink and applause
    const beforePar = sources.length;
    audio.playCupSink(true);
    expect(sources.length - beforePar).toBe(2);
    expect(sources.slice(beforePar).map((s) => s.buffer)).toContain(sampleBuffers.get("cup_sink"));
    expect(sources.slice(beforePar).map((s) => s.buffer)).toContain(sampleBuffers.get("applause"));

    audio.dispose();
  });

  it("ignores weak wall bumps (< 0.35) and debounces rapid consecutive wall bounces within 50ms", () => {
    const { sources } = createMockAudioEnv();
    let nowMs = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => nowMs);

    const audio = new AudioManager();
    audio.playWallBounce(0.2);
    expect(sources).toHaveLength(0);

    audio.playWallBounce(4.5);
    const afterFirst = sources.length;
    // Wait: fallback uses oscillator, sample uses sources — check with loaded sample buffer
    const fakeBank = {
      preload: vi.fn(async () => {}),
      get: vi.fn(() => ({ duration: 0.2 } as unknown as AudioBuffer)),
      isLoaded: vi.fn(() => true),
      clear: vi.fn(),
    } as unknown as SoundBank;

    const sampleAudio = new AudioManager(fakeBank);
    const startCount = sources.length;

    sampleAudio.playWallBounce(0.2);
    expect(sources.length).toBe(startCount);

    sampleAudio.playWallBounce(4.5);
    expect(sources.length).toBe(startCount + 1);

    // Within 50ms cooldown -> suppressed
    nowMs += 25;
    sampleAudio.playWallBounce(5.0);
    expect(sources.length).toBe(startCount + 1);

    // Past 50ms cooldown -> allowed
    nowMs += 30;
    sampleAudio.playWallBounce(5.0);
    expect(sources.length).toBe(startCount + 2);
    expect(afterFirst).toBeGreaterThanOrEqual(0);

    audio.dispose();
    sampleAudio.dispose();
  });

  it("uses filtered buffer loop (not oscillator) for rolling and silences immediately when airborne or stopped", () => {
    vi.useFakeTimers();
    const { sources, filters, mockAudioContext } = createMockAudioEnv();
    const rollingBuf = { duration: 1.9, isRolling: true } as unknown as AudioBuffer;
    const fakeBank = {
      preload: vi.fn(async () => {}),
      get: vi.fn((id: SoundId) => (id === "rolling" ? rollingBuf : null)),
      isLoaded: vi.fn((id: SoundId) => id === "rolling"),
      clear: vi.fn(),
    } as unknown as SoundBank;

    const audio = new AudioManager(fakeBank);

    // Airborne fast ball must NOT start rolling loop
    audio.updateRolling(8.0, false);
    expect(sources).toHaveLength(0);
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();

    // Grounded rolling starts looping buffer source through lowpass filter (never oscillator)
    audio.updateRolling(6.0, true);
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    expect(sources).toHaveLength(1);
    expect(sources[0].loop).toBe(true);
    expect(sources[0].buffer).toBe(rollingBuf);
    expect(filters).toHaveLength(1);
    expect(filters[0].type).toBe("lowpass");

    // Going airborne stops rolling cleanly after fade without duplicating timers
    audio.updateRolling(6.0, false);
    audio.updateRolling(6.0, false);
    expect(sources[0].stop).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(sources[0].stop).toHaveBeenCalledTimes(1);

    // Slow/stationary ball while grounded does not restart rolling
    audio.updateRolling(0.1, true);
    expect(sources).toHaveLength(1);

    audio.dispose();
  });

  it("persists mute state in localStorage, silences masterGain, and cleans up on dispose", () => {
    const { gains, storage, mockAudioContext, sources } = createMockAudioEnv();
    const rollingBuf = { duration: 1.9 } as unknown as AudioBuffer;
    const fakeBank = {
      preload: vi.fn(async () => {}),
      get: vi.fn(() => rollingBuf),
      isLoaded: vi.fn(() => true),
      clear: vi.fn(),
    } as unknown as SoundBank;

    const audio1 = new AudioManager(fakeBank);
    audio1.updateRolling(5.0, true);
    expect(sources[0].stop).not.toHaveBeenCalled();

    const muted = audio1.toggleMute();
    expect(muted).toBe(true);
    expect(storage.get("minigolf_audio_muted")).toBe("true");
    // Master gain (first GainNode created) muted cleanly to 0
    expect(gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(0, mockAudioContext.currentTime, expect.any(Number));
    expect(sources[0].stop).toHaveBeenCalledTimes(1);

    // New AudioManager instance restores muted flag from localStorage
    const audio2 = new AudioManager(fakeBank);
    expect(audio2.getMuted()).toBe(true);

    expect(audio2.toggleMute()).toBe(false);
    expect(storage.get("minigolf_audio_muted")).toBe("false");

    audio1.dispose();
    audio2.dispose();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });
});

