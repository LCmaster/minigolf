import { describe, it, expect } from "vitest";
import EditorToolbar from "./EditorToolbar.svelte";
import PathWaypointInspector from "./PathWaypointInspector.svelte";
import PlaytestOverlay from "./PlaytestOverlay.svelte";
import PropPalette from "./PropPalette.svelte";
import WfcWizardModal from "./WfcWizardModal.svelte";
import RadialSocketMenu from "./RadialSocketMenu.svelte";
import TileActionMenu from "./TileActionMenu.svelte";

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
    expect(editRes.html).toContain("from-amber-700 via-amber-800 to-amber-950");
    expect(editRes.html).not.toContain("bg-slate-900/90");
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
    expect(res.html).toContain("from-amber-700 via-amber-800 to-amber-950");
    expect(res.html).not.toContain("bg-slate-900/90");
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
    expect(res.html).toContain("from-amber-700 via-amber-800 to-amber-950");
    expect(res.html).not.toContain("bg-slate-900/90");
    expect(res.html).not.toContain("bg-black/90");
  });

  it("renders PropPalette, WfcWizardModal, RadialSocketMenu, and TileActionMenu in Cartoon Arcade theme", () => {
    const paletteRes = (PropPalette as any).render({ theme: "carnival_park" });
    expect(paletteRes.html).toContain("Freeform Props");
    expect(paletteRes.html).toContain("from-amber-700 via-amber-800 to-amber-950");
    expect(paletteRes.html).not.toContain("bg-slate-900");

    const wfcRes = (WfcWizardModal as any).render({ isOpen: true, theme: "carnival_park" });
    expect(wfcRes.html).toContain("WFC Hole Generator");
    expect(wfcRes.html).toContain("bg-[#2a1205]");
    expect(wfcRes.html).not.toContain("bg-slate-900");

    const radialRes = (RadialSocketMenu as any).render({ x: 100, y: 100, socketInfo: { id: "LOC_Socket_Out" } });
    expect(radialRes.html).toContain("Snap Next Piece");
    expect(radialRes.html).toContain("from-amber-700 via-amber-800 to-amber-950");
    expect(radialRes.html).not.toContain("bg-slate-900");

    const tileRes = (TileActionMenu as any).render({
      x: 100,
      y: 100,
      tileInfo: {
        tileInstanceId: "t1",
        kitPieceId: "carnival_straight_6m",
        name: "Carnival Straight",
        walls: { left: true, right: true },
        hasDynamicWalls: true,
        isGap: false,
        isTee: false,
        isCup: false,
        hasDownstream: false,
      },
    });
    expect(tileRes.html).toContain("Carnival Straight");
    expect(tileRes.html).toContain("from-amber-700 via-amber-800 to-amber-950");
    expect(tileRes.html).not.toContain("bg-slate-900");
  });
});

