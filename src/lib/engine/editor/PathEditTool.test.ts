import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { PathEditTool } from "./PathEditTool";
import { HistoryManager } from "./HistoryManager";
import type { SplinePathData } from "../types/CourseSchema";

function makeTurnPiece(id: string, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const r = 6.0;
  const outX = r * (1 - Math.cos(rad));
  const outZ = -r * Math.sin(rad);
  return {
    metadata: { id, dimensions: [6, 0.6, 6], hasDynamicWalls: true },
    visualTemplate: new THREE.Group(),
    sockets: [
      { id: "LOC_Socket_In", position: [0, 0, 0], normal: [0, 0, 1], type: "track", elevation: 0 },
      {
        id: "LOC_Socket_Out",
        position: [outX, 0, outZ],
        normal: [Math.sin(rad), 0, -Math.cos(rad)],
        type: "track",
        elevation: 0,
      },
    ],
    locators: new Map(),
  };
}

function makeStraightPiece(id: string, length: number = 6, hasGoal: boolean = false) {
  const half = length / 2;
  return {
    metadata: { id, dimensions: [6, 0.6, length], hasDynamicWalls: true },
    visualTemplate: new THREE.Group(),
    sockets: hasGoal
      ? [{ id: "LOC_Socket_In", position: [0, 0, half], normal: [0, 0, 1], type: "track", elevation: 0 }]
      : [
          { id: "LOC_Socket_In", position: [0, 0, half], normal: [0, 0, 1], type: "track", elevation: 0 },
          { id: "LOC_Socket_Out", position: [0, 0, -half], normal: [0, 0, -1], type: "track", elevation: 0 },
        ],
    locators: hasGoal ? new Map([["LOC_Sensor_Goal", new THREE.Vector3(0, 0, 0)]]) : new Map(),
  };
}

describe("PathEditTool", () => {
  function setup() {
    const scene = new THREE.Scene();
    let storedSpline: SplinePathData = {
      closed: false,
      nodes: [
        { id: "tee", position: [0, 0, 0], handleOffset: [0, -2.4], corner: true, elevationStep: 0 },
        {
          id: "corner",
          position: [0, 0, -18],
          handleOffset: [2.4, 0],
          bevelRadius: 0,
          corner: true,
          elevationStep: 0,
        },
        { id: "cup", position: [18, 0, -18], handleOffset: [2.4, 0], corner: true, elevationStep: 0 },
      ],
    };

    const holeTiles: any[] = [
      { instanceId: "tee_1", kitPieceId: "carnival_tee_6x6", walls: { left: true, right: true } },
    ];

    const courseManager: any = {
      loadHole: vi.fn((h: any) => {
        storedSpline = h.splinePath;
      }),
      exportHoleData: vi.fn(() => ({
        holeNumber: 1,
        par: 3,
        teeTileId: "tee_1",
        cupTileId: "cup_1",
        tiles: holeTiles,
        props: [],
        splinePath: storedSpline,
      })),
      getSplinePath: vi.fn(() => storedSpline),
      setSplinePath: vi.fn((s: any) => {
        storedSpline = s;
      }),
    };

    const assetLoader: any = {
      getPiece: (id: string) => {
        if (id.includes("turn_90")) return makeTurnPiece(id, 90);
        if (id.includes("turn_45")) return makeTurnPiece(id, 45);
        if (id.includes("cup")) return makeStraightPiece(id, 6, true);
        if (id.includes("ramp")) return makeStraightPiece(id, 6);
        return makeStraightPiece(id, 6);
      },
    };

    const history = new HistoryManager();
    const onRefreshOpenSockets = vi.fn();
    const onSplineSelectionChanged = vi.fn();
    const onCourseModified = vi.fn();

    const tool = new PathEditTool({
      scene,
      courseManager,
      assetLoader,
      history,
      onRefreshOpenSockets,
      onSplineSelectionChanged,
      onCourseModified,
    });

    return { scene, history, tool, courseManager, onRefreshOpenSockets, onSplineSelectionChanged };
  }

  it("supports node selection, bevel toggles, elevation stepping, grid snapping, insert/delete, and undo", () => {
    const { history, tool, onRefreshOpenSockets } = setup();

    tool.setActive(true);
    expect(onRefreshOpenSockets).toHaveBeenCalledTimes(0);

    tool.selectSplineNode(1);
    expect(tool.getSelectedNodeInfo()?.canBevel).toBe(true);
    expect(tool.toggleSelectedNodeBevel()).toBe(true);
    expect(tool.getSelectedNodeInfo()?.bevelRadius).toBeGreaterThan(0);

    history.undo();
    expect(tool.getSelectedNodeInfo()?.bevelRadius).toBe(0);

    expect(tool.stepSelectedNodeElevation(1)).toBe(true);
    expect(tool.getSelectedNodeInfo()?.elevationStep).toBe(1);

    tool.setGridSnapSize(3);
    expect(tool.insertWaypointAt(new THREE.Vector3(24, 0, -18))).toBe(true);
    expect(tool.getActiveSpline()?.nodes.length).toBe(4);
    expect(tool.deleteSelectedNode()).toBe(true);
    expect(tool.getActiveSpline()?.nodes.length).toBe(3);

    tool.selectSplineNode(0);
    expect(tool.deleteSelectedNode()).toBe(false);

    tool.dispose();
  });
});

