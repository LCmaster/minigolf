import { describe, it, expect, vi } from "vitest";
import { SoundBank, SOUND_PATHS, type SoundId } from "./SoundBank";

const ALL_IDS: SoundId[] = [
  "rolling",
  "putt",
  "wall_bounce",
  "bumper",
  "booster",
  "splash",
  "cup_sink",
  "aim_tick",
  "applause",
];

describe("SoundBank (TDD)", () => {
  it("maps all 9 SFX ids to files under /sounds/", () => {
    expect(Object.keys(SOUND_PATHS).sort()).toEqual([...ALL_IDS].sort());
    for (const id of ALL_IDS) {
      expect(SOUND_PATHS[id]).toMatch(/^\/sounds\/.+\.(wav|mp3)$/);
    }
  });

  it("preloads and caches decoded AudioBuffers idempotently without re-fetching", async () => {
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    })) as unknown as typeof fetch;

    const decodeAudioData = vi.fn(async (buf: ArrayBuffer) => ({
      duration: 0.5,
      byteLength: buf.byteLength,
    }));
    const ctx = { decodeAudioData } as unknown as AudioContext;

    const bank = new SoundBank(fetchMock);
    expect(bank.isLoaded("rolling")).toBe(false);
    expect(bank.get("rolling")).toBeNull();

    await bank.preload(ctx);
    expect(fetchMock).toHaveBeenCalledTimes(ALL_IDS.length);
    expect(decodeAudioData).toHaveBeenCalledTimes(ALL_IDS.length);

    for (const id of ALL_IDS) {
      expect(bank.isLoaded(id)).toBe(true);
      expect(bank.get(id)).not.toBeNull();
    }

    // Second preload call must be a no-op once already started
    await bank.preload(ctx);
    expect(fetchMock).toHaveBeenCalledTimes(ALL_IDS.length);

    bank.clear();
    expect(bank.isLoaded("rolling")).toBe(false);
    expect(bank.get("rolling")).toBeNull();
  });

  it("handles HTTP errors, rejected fetches, and decode errors gracefully", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("rolling")) {
        return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
      }
      if (url.includes("splash")) {
        throw new Error("Network failure");
      }
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
    }) as unknown as typeof fetch;

    let callIdx = 0;
    const decodeAudioData = vi.fn(async () => {
      callIdx++;
      if (callIdx === 1) throw new Error("Corrupt audio");
      return { duration: 0.25 } as unknown as AudioBuffer;
    });
    const ctx = { decodeAudioData } as unknown as AudioContext;

    const bank = new SoundBank(fetchMock);
    await expect(bank.preload(ctx)).resolves.toBeUndefined();

    expect(bank.isLoaded("rolling")).toBe(false);
    expect(bank.isLoaded("splash")).toBe(false);
    // At least the majority of valid clips decoded cleanly despite individual failures
    const loadedCount = ALL_IDS.filter((id) => bank.isLoaded(id)).length;
    expect(loadedCount).toBe(ALL_IDS.length - 3);
  });
});
