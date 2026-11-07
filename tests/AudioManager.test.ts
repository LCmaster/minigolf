import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioManager } from "../src/lib/engine/audio/AudioManager";

describe("AudioManager Unit Tests", () => {
  it("toggles mute state correctly", () => {
    const audio = new AudioManager();
    expect(audio.toggleMute()).toBe(true);
    expect(audio.toggleMute()).toBe(false);
  });

  it("handles server-side / headless rendering without window.AudioContext without crashing", () => {
    const audio = new AudioManager();
    expect(() => {
      audio.playPutt(0.5);
      audio.playBumper();
      audio.playWaterSplash();
      audio.playCupSink();
      audio.updateRolling(5.0);
      audio.updateRolling(0.1);
    }).not.toThrow();
  });

  it("synthesizes sound nodes when Web Audio API is available", () => {
    const mockGainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    const mockOscillator = {
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

    const mockBufferSource = {
      buffer: null as any,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const mockFilter = {
      type: "lowpass",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    const mockBuffer = {
      getChannelData: vi.fn(() => new Float32Array(100)),
    };

    const mockAudioContext = {
      state: "running",
      currentTime: 10.0,
      sampleRate: 44100,
      destination: {},
      resume: vi.fn(),
      createGain: vi.fn(() => ({ ...mockGainNode })),
      createOscillator: vi.fn(() => ({ ...mockOscillator })),
      createBuffer: vi.fn(() => mockBuffer),
      createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
      createBiquadFilter: vi.fn(() => ({ ...mockFilter })),
    };

    // Provide window mock with AudioContext
    (globalThis as any).window = {
      AudioContext: vi.fn(() => mockAudioContext),
    };

    const audio = new AudioManager();

    // 1. Putt sound
    audio.playPutt(0.8);
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();

    // 2. Bumper pop
    audio.playBumper();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    // 3. Water splash
    audio.playWaterSplash();
    expect(mockAudioContext.createBuffer).toHaveBeenCalled();
    expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();

    // 4. Cup Sink
    audio.playCupSink();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    // 5. Mute prevents synthesis
    audio.toggleMute();
    mockAudioContext.createOscillator.mockClear();
    audio.playPutt(1.0);
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();

    // Cleanup global window
    delete (globalThis as any).window;
  });
});
