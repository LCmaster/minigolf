import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { GapOverlayManager } from "./GapOverlayManager";

describe("GapOverlayManager", () => {
  it("renders Editor_GapGizmos centered between sockets only for gap tiles", () => {
    const scene = new THREE.Scene();
    const mgr = new GapOverlayManager(scene);
    expect(scene.getObjectByName("Editor_GapGizmos")).toBeDefined();

    const g1 = new THREE.Group();
    g1.position.set(0, 0, -6);

    const g2 = new THREE.Group();
    g2.position.set(0, 0, -12);

    const tiles: any[] = [
      {
        tileData: { instanceId: "solid_1", kitPieceId: "straight_6m", isGap: false },
        group: g1,
        pieceTemplate: { metadata: { dimensions: [6, 0.6, 6] }, sockets: [] },
      },
      {
        tileData: { instanceId: "gap_1", kitPieceId: "straight_6m", isGap: true },
        group: g2,
        pieceTemplate: {
          metadata: { dimensions: [6, 0.6, 6] },
          sockets: [
            { id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1] },
            { id: "LOC_Socket_Out", position: [0, 0, -5], normal: [0, 0, -1] },
          ],
        },
      },
    ];

    mgr.refresh(tiles);
    const pickables = mgr.getPickables();
    expect(pickables).toHaveLength(1);
    expect(pickables[0].userData.tileInstanceId).toBe("gap_1");
    // Midpoint Z between +3 and -5 is -1; added to group.z (-12) = -13
    expect(pickables[0].position.z).toBeCloseTo(-13, 4);

    mgr.setVisible(false);
    expect(mgr.getPickables()).toHaveLength(0);
    mgr.dispose();
    expect(scene.getObjectByName("Editor_GapGizmos")).toBeUndefined();
  });
});
