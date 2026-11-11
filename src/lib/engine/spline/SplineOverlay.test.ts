import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SplineOverlay } from "./SplineOverlay";
import type { SplineWaypoint } from "../types/CourseSchema";

describe("SplineOverlay Perpendicular Handles & Endpoint Rules", () => {
  it("renders perpendicular handles only on intermediate smooth nodes and omits Tee & Cup handles", () => {
    const scene = new THREE.Scene();
    const overlay = new SplineOverlay(scene);
    overlay.setVisible(true);

    const nodes: SplineWaypoint[] = [
      { id: "tee", position: [0, 0, 0], handleOffset: [0, -3], corner: false },
      { id: "mid", position: [6, 0, -12], handleOffset: [0, -4], corner: false },
      { id: "cup", position: [12, 0, -24], handleOffset: [0, -3], corner: false },
    ];

    // Select Tee (0) -> still zero handles on Tee/Cup, 1 handle on Mid
    overlay.renderOverlay(nodes, 0);
    expect(overlay.nodeMeshes.length).toBe(3);
    expect(overlay.handleMeshes.length).toBe(1);
    expect(overlay.handleMeshes[0].userData.splineHandleIndex).toBe(1);

    // Select Cup (2) -> still zero handles on Tee/Cup, 1 handle on Mid
    overlay.renderOverlay(nodes, 2);
    expect(overlay.handleMeshes.length).toBe(1);
    expect(overlay.handleMeshes[0].userData.splineHandleIndex).toBe(1);

    // Verify Mid handle arm is perpendicular (90°) to its tangent [0, -4]
    overlay.renderOverlay(nodes, 1);
    const handlePos = overlay.handleMeshes[0].position;
    const armX = handlePos.x - nodes[1].position[0];
    const armZ = handlePos.z - nodes[1].position[2];
    expect(armX).toBeCloseTo(4, 4);
    expect(armZ).toBeCloseTo(0, 4);
    expect(armX * nodes[1].handleOffset[0] + armZ * nodes[1].handleOffset[1]).toBeCloseTo(0, 5);

    // Corner intermediate node hides handle too
    nodes[1].corner = true;
    overlay.renderOverlay(nodes, 1);
    expect(overlay.handleMeshes.length).toBe(0);

    // 2-node spline (Tee + Cup only) has zero handles
    overlay.renderOverlay([nodes[0], nodes[2]], 0);
    expect(overlay.handleMeshes.length).toBe(0);

    overlay.dispose();
  });
});

