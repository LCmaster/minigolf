import { describe, it, expect } from "vitest";
import { RenderPipeline } from "./RenderPipeline";

describe("RenderPipeline Unit Tests (Headless Mode)", () => {
  it("initializes scene, camera, lighting, and shadow frustum in headless mode", () => {
    const pipeline = new RenderPipeline(undefined, { headless: true });

    expect(pipeline.scene).toBeDefined();
    expect(pipeline.camera).toBeDefined();
    expect(pipeline.sunLight).toBeDefined();
    expect(pipeline.ambientLight).toBeDefined();

    expect(pipeline.sunLight.castShadow).toBe(true);
    expect(pipeline.sunLight.shadow.mapSize.width).toBe(2048);

    // Render and resize should execute cleanly without WebGL context
    expect(() => pipeline.render()).not.toThrow();
    expect(() => pipeline.resize()).not.toThrow();

    pipeline.dispose();
    expect(pipeline.scene.children.length).toBe(0);
  });

  it("updates camera aspect ratio when canvas has parent dimensions", () => {
    const mockCanvas = {
      parentElement: {
        clientWidth: 1920,
        clientHeight: 1080,
      },
    } as unknown as HTMLCanvasElement;

    const pipeline = new RenderPipeline(mockCanvas, { headless: true });
    pipeline.resize();

    expect(pipeline.camera.aspect).toBeCloseTo(1920 / 1080, 3);
    pipeline.dispose();
  });
});

