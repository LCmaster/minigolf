import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SocketOverlayManager } from "./SocketOverlayManager";

describe("SocketOverlayManager", () => {
  it("creates Editor_SocketGizmos, computes world positions for unconnected sockets, and highlights hover", () => {
    const scene = new THREE.Scene();
    const mgr = new SocketOverlayManager(scene);
    expect(scene.getObjectByName("Editor_SocketGizmos")).toBeDefined();

    const tileGroup = new THREE.Group();
    tileGroup.position.set(0, 0, -6);
    tileGroup.rotation.y = Math.PI / 2;

    const tiles: any[] = [
      {
        tileData: {
          instanceId: "t1",
          kitPieceId: "straight_6m",
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "t0" },
        },
        group: tileGroup,
        pieceTemplate: {
          sockets: [
            { id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1] },
            { id: "LOC_Socket_Out", position: [0, 0, -3], normal: [0, 0, -1] },
          ],
        },
      },
    ];

    mgr.refresh(tiles);
    expect(mgr.openSockets).toHaveLength(1);
    expect(mgr.openSockets[0].socketId).toBe("LOC_Socket_Out");
    // Local (0,0,-3) rotated +90deg Y -> (-3,0,0) + (0,0,-6) = (-3,0,-6)
    expect(mgr.openSockets[0].worldPosition.x).toBeCloseTo(-3, 4);
    expect(mgr.openSockets[0].worldPosition.z).toBeCloseTo(-6, 4);

    scene.updateMatrixWorld(true);
    // Raycast straight down onto the torus gizmo ring (major radius 0.8m around (-3, 0.05, -6))
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(-3, 5, -6.8),
      new THREE.Vector3(0, -1, 0)
    );
    const hit = mgr.updateHover(raycaster);
    expect(hit?.tileInstanceId).toBe("t1");
    expect(mgr.hoveredSocket?.socketId).toBe("LOC_Socket_Out");

    mgr.clearHover();
    expect(mgr.hoveredSocket).toBeNull();

    mgr.setVisible(false);
    expect(mgr.getGroup().visible).toBe(false);
    mgr.dispose();
    expect(scene.getObjectByName("Editor_SocketGizmos")).toBeUndefined();
  });
});
