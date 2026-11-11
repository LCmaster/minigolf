import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SplineOverlay } from "./SplineOverlay";
import type { SplineWaypoint } from "../types/CourseSchema";

describe("SplineOverlay Inside-Bisector Bevel Handles & Endpoint Rules", () => {
  it("renders bisector bevel handles only on intermediate corner bends and omits Tee & Cup handles", () => {
    const scene = new THREE.Scene();
    const overlay = new SplineOverlay(scene);
    overlay.setVisible(true);

    const nodes: SplineWaypoint[] = [
      { id: "tee", position: [0, 0, 0], handleOffset: [0, -3], bevelRadius: 0 },
      { id: "mid", position: [0, 0, -18], handleOffset: [0, -3], bevelRadius: 0 },
      { id: "cup", position: [18, 0, -18], handleOffset: [3, 0], bevelRadius: 0 },
    ];

    // Select Tee (0) -> still zero handles on Tee/Cup, 1 bevel handle on Mid
    overlay.renderOverlay(nodes, 0);
    expect(overlay.nodeMeshes.length).toBe(3);
    expect(overlay.handleMeshes.length).toBe(1);
    expect(overlay.handleMeshes[0].userData.splineHandleIndex).toBe(1);

    // Select Cup (2) -> still zero handles on Tee/Cup, 1 bevel handle on Mid
    overlay.renderOverlay(nodes, 2);
    expect(overlay.handleMeshes.length).toBe(1);
    expect(overlay.handleMeshes[0].userData.splineHandleIndex).toBe(1);

    // Sharp corner: handle sits 1.6m inside corner along 90° bisector (+1/sqrt(2), +1/sqrt(2))
    overlay.renderOverlay(nodes, 1);
    const sharpHandle = overlay.handleMeshes[0].position.clone();
    const dx = sharpHandle.x - nodes[1].position[0];
    const dz = sharpHandle.z - nodes[1].position[2];
    expect(Math.hypot(dx, dz)).toBeCloseTo(1.6, 3);
    expect(dx).toBeCloseTo(dz, 4);
    expect(dx).toBeGreaterThan(0);

    // Beveled corner (R = 6m): handle shifts deeper inward by sagitta = 6 * (sqrt(2) - 1)
    nodes[1].bevelRadius = 6;
    overlay.renderOverlay(nodes, 1);
    const beveledHandle = overlay.handleMeshes[0].position;
    const bx = beveledHandle.x - nodes[1].position[0];
    const bz = beveledHandle.z - nodes[1].position[2];
    const expectedDist = 1.6 + 6 * (Math.SQRT2 - 1);
    expect(Math.hypot(bx, bz)).toBeCloseTo(expectedDist, 3);

    // 2-node straight line (Tee + Cup only) has zero handles
    overlay.renderOverlay([nodes[0], nodes[2]], 0);
    expect(overlay.handleMeshes.length).toBe(0);

    // World GridHelper renders at active node elevation when gridSize > 0 and hides when 0 or overlay hidden
    overlay.renderOverlay([{ ...nodes[0], position: [0, 1.5, 0] }, nodes[2]], 0, false, 1);
    expect(overlay.gridGroup.visible).toBe(true);
    expect(overlay.gridGroup.children.length).toBe(1);
    expect(overlay.gridGroup.children[0].position.y).toBeCloseTo(1.54, 3);

    overlay.renderOverlay(nodes, 0, false, 0);
    expect(overlay.gridGroup.visible).toBe(false);
    expect(overlay.gridGroup.children.length).toBe(0);

    overlay.renderOverlay(nodes, 0, false, 3);
    expect(overlay.gridGroup.visible).toBe(true);
    overlay.setVisible(false);
    expect(overlay.gridGroup.visible).toBe(false);

    overlay.dispose();
  });
});
