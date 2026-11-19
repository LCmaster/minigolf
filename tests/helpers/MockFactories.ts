/**
 * MockFactories.ts
 * Centralized mock factories and fixtures for unit and integration testing.
 */

import * as THREE from "three";
import type { ParsedKitPiece } from "../../src/lib/engine/kitbash/AssetLoader";
import type { SocketDefinition } from "../../src/lib/engine/types/KitTypes";

export class MockFactories {
  /**
   * Creates a standard 6x6m arcade parsed kit piece template for testing.
   */
  public static createMockPiece(
    id: string,
    options?: {
      isTee?: boolean;
      isCup?: boolean;
      turnAngleDeg?: number;
      elevationChange?: number;
    }
  ): ParsedKitPiece {
    const visualGroup = new THREE.Group();
    visualGroup.name = `Visual_${id}`;

    const meshFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(5.0, 6.0),
      new THREE.MeshBasicMaterial()
    );
    meshFloor.name = "Mesh_Floor";
    visualGroup.add(meshFloor);

    const meshWallL = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 6.0),
      new THREE.MeshBasicMaterial()
    );
    meshWallL.name = "Mesh_Wall_L";
    visualGroup.add(meshWallL);

    const meshWallR = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 6.0),
      new THREE.MeshBasicMaterial()
    );
    meshWallR.name = "Mesh_Wall_R";
    visualGroup.add(meshWallR);

    // Floor geometry at Y = 1.0m matching master standard
    const ubxFloor = new THREE.BoxGeometry(5.0, 0.2, 6.0);
    ubxFloor.translate(0, 0.9, 0);

    const ubxWallL = new THREE.BoxGeometry(0.5, 0.6, 6.0);
    ubxWallL.translate(-2.75, 1.2, 0);

    const ubxWallR = new THREE.BoxGeometry(0.5, 0.6, 6.0);
    ubxWallR.translate(2.75, 1.2, 0);

    let ubxWallBack: THREE.BufferGeometry | null = null;
    if (options?.isTee || options?.isCup) {
      ubxWallBack = new THREE.BoxGeometry(6.0, 0.6, 0.5);
      ubxWallBack.translate(0, 1.2, options?.isTee ? 2.75 : -2.75);
    }

    const sockets: SocketDefinition[] = [];
    if (!options?.isTee) {
      sockets.push({
        id: "LOC_Socket_In",
        position: [0, 0, 3.0],
        normal: [0, 0, 1],
        type: "track_arcade_6m",
        elevation: 0,
      });
    }

    if (!options?.isCup) {
      const angleRad = ((options?.turnAngleDeg || 0) * Math.PI) / 180;
      const elev = options?.elevationChange || 0;
      sockets.push({
        id: "LOC_Socket_Out",
        position: [Math.sin(angleRad) * 3.0, elev, -Math.cos(angleRad) * 3.0],
        normal: [Math.sin(angleRad), 0, -Math.cos(angleRad)],
        type: "track_arcade_6m",
        elevation: elev,
      });
    }

    const locators = new Map<string, THREE.Vector3>();
    if (options?.isTee) {
      locators.set("LOC_Spawn_Tee", new THREE.Vector3(0, 1.1, 1.5));
    }
    if (options?.isCup) {
      locators.set("LOC_Sensor_Goal", new THREE.Vector3(0, 0.65, -0.25));
    }

    return {
      metadata: {
        id,
        name: id,
        category: "straights",
        glbPath: `models/kit/${id}.glb`,
        dimensions: [6, 0.6, 6],
        hasDynamicWalls: true,
        sockets,
        tags: [],
      },
      visualTemplate: visualGroup,
      ubxFloorGeometry: ubxFloor,
      ubxWallLGeometry: ubxWallL,
      ubxWallRGeometry: ubxWallR,
      ubxWallBackGeometry: ubxWallBack,
      sockets,
      locators,
    };
  }
}

