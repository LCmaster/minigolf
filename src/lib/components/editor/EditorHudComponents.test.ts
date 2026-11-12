import { describe, it, expect } from "vitest";
import EditorToolbar from "./EditorToolbar.svelte";
import PathWaypointInspector from "./PathWaypointInspector.svelte";
import PlaytestOverlay from "./PlaytestOverlay.svelte";

describe("Editor HUD Svelte Components", () => {
  it("renders EditorToolbar with build tools in edit mode and compact controls in playtest mode", () => {
    const editRes = (EditorToolbar as any).render({
      isReady: true,
      isPlaytestMode: false,
      currentFps: 60,
      activeTheme: "carnival_park",
      showBoundary: true,
      isTrackPathMode: true,
      isEraseMode: false,
      saveFeedback: "",
      savedCourseId: "custom_1",
    });
    expect(editRes.html).toContain("Track Runner Editor");
    expect(editRes.html).toContain("Courses");
    expect(editRes.html).toContain("New Hole");
    expect(editRes.html).toContain("Auto-Gen");
    expect(editRes.html).toContain("Play Saved");
    expect(editRes.html).toContain("Test Putt");
    expect(editRes.html).not.toContain("Sunny Creek");
    expect(editRes.html).not.toContain("Big Top");

    const playRes = (EditorToolbar as any).render({
      isReady: true,
      isPlaytestMode: true,
      currentFps: 60,
      activeTheme: "carnival_park",
      showBoundary: true,
      isTrackPathMode: false,
      isEraseMode: false,
      saveFeedback: "",
      savedCourseId: "",
    });
    expect(playRes.html).toContain("Playtest Mode");
    expect(playRes.html).toContain("Exit Test");
    expect(playRes.html).not.toContain("Auto-Gen");
  });

  it("renders PathWaypointInspector with bevel state, red unreachable alert, and grid snap controls", () => {
    const res = (PathWaypointInspector as any).render({
      selectedSplineNode: {
        index: 1,
        nodeCount: 3,
        elevationStep: 1,
        elevationMeters: 1.5,
        bevelRadius: 6,
        maxBevelRadius: 9,
        canBevel: true,
        corner: false,
        isRoot: false,
        canDelete: true,
        isInvalid: true,
        invalidCount: 1,
      },
      gridSnapSize: 3,
    });
    expect(res.html).toContain("Waypoint #1");
    expect(res.html).toContain("Y: 1.5m");
    expect(res.html).toContain("Bevel 6.0m");
    expect(res.html).toContain("unreachable with kit tiles");
    expect(res.html).toContain("Align Path to 3m Grid");
  });

  it("renders PlaytestOverlay bottom HUD and HOLE IN modal on cup sink", () => {
    const res = (PlaytestOverlay as any).render({
      par: 3,
      strokes: 2,
      isCupSunk: true,
    });
    expect(res.html).toContain("PAR");
    expect(res.html).toContain("STROKES");
    expect(res.html).toContain("HOLE IN!");
    expect(res.html).toContain("Putt Again");
  });
});

