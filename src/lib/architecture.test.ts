/**
 * architecture.test.ts
 * Codebase hygiene guards: superseded v1 prototype modules must stay deleted and
 * engine source files must stay lean (single-responsibility).
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const SRC = path.resolve(__dirname, "..");

function lineCount(rel: string): number {
  return fs.readFileSync(path.join(SRC, rel), "utf-8").split("\n").length;
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(SRC, rel));
}

describe("codebase architecture guards", () => {
  it("keeps superseded v1 prototype modules removed", () => {
    const legacy = [
      "lib/trackGeometry.js",
      "lib/heightmapGeometry.js",
      "lib/ProceduralGenerator.js",
      "lib/courses/practice.js",
      "lib/level.js",
      "lib/campaign.js",
      "lib/gridUtils.js",
      "lib/gridUtils.test.ts",
      "lib/index.js",
      "lib/stores/game.ts",
      "lib/stores/game.test.ts",
      "lib/stores/audio.js",
      "lib/types/course.ts",
      "lib/component/ArrowButton.svelte",
      "lib/component/HudIndicator.svelte",
      "lib/component/Modal.svelte",
      "routes/mylevels/+page.svelte",
      "routes/campaign/[id]/+page.svelte",
    ];
    const lingering = legacy.filter(exists);
    expect(lingering).toEqual([]);
  });

  it("keeps core engine classes under the 450-line single-responsibility budget", () => {
    const budgeted = [
      "lib/engine/course/CourseManager.ts",
      "lib/engine/editor/EditorController.ts",
    ];
    for (const rel of budgeted) {
      expect(lineCount(rel), `${rel} exceeds 450 lines`).toBeLessThanOrEqual(450);
    }
  });
});
