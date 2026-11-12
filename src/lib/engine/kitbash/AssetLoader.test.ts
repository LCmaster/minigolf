import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { AssetLoader } from "./AssetLoader";
import type { KitManifest } from "../types/KitTypes";

describe("AssetLoader Unit Tests (Mocked Scene Graph)", () => {
  it("parses GLTF scene hierarchies, strips Blender .001 suffixes, and extracts UBX & LOC nodes", async () => {
    // Build a synthetic GLTF scene graph representing an end cup tile
    const mockRoot = new THREE.Group();

    const meshFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 6),
      new THREE.MeshBasicMaterial()
    );
    meshFloor.name = "Mesh_Floor.001";
    mockRoot.add(meshFloor);

    const ubxFloor = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 6));
    ubxFloor.name = "UBX_Floor.001";
    mockRoot.add(ubxFloor);

    const ubxWallL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 6));
    ubxWallL.name = "UBX_Wall_L.002";
    mockRoot.add(ubxWallL);

    const ubxWallR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 6));
    ubxWallR.name = "UBX_Wall_R.002";
    mockRoot.add(ubxWallR);

    const ubxWallB = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 0.5));
    ubxWallB.name = "UBX_Wall_B.001";
    mockRoot.add(ubxWallB);

    const locSocketIn = new THREE.Object3D();
    locSocketIn.name = "LOC_Socket_In.001";
    locSocketIn.position.set(0, 0, 3);
    mockRoot.add(locSocketIn);

    const locSpawn = new THREE.Object3D();
    locSpawn.name = "LOC_Spawn_Tee";
    locSpawn.position.set(0, 1.15, 2);
    mockRoot.add(locSpawn);

    const locGoal = new THREE.Object3D();
    locGoal.name = "LOC_Sensor_Goal";
    locGoal.position.set(0, 0.5, -0.25);
    mockRoot.add(locGoal);

    const mockManifest: KitManifest = {
      version: "2.0.0",
      theme: "country_club",
      trimSheet: {
        diffuse: "textures/diff.webp",
        normal: "textures/norm.webp",
        roughness: "textures/rough.webp",
      },
      pieces: {
        test_cup_tile: {
          id: "test_cup_tile",
          name: "Test Cup Tile",
          category: "foundations",
          glbPath: "models/kit/test_cup.glb",
          dimensions: [6, 0.6, 6],
          turfWidth: 5.2,
          railHeight: 0.6,
          hasDynamicWalls: true,
          sockets: [
            {
              id: "LOC_Socket_In",
              position: [0, 0, 3],
              normal: [0, 0, 1],
              type: "track_arcade_6m",
              elevation: 0,
            },
          ],
          tags: ["cup"],
        },
      },
    };

    const loader = new AssetLoader({
      gltfLoader: { loadAsync: vi.fn().mockResolvedValue({ scene: mockRoot }) },
      textureLoader: { loadAsync: vi.fn().mockResolvedValue(new THREE.Texture()) },
      fetchFn: vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockManifest),
      }) as unknown as typeof fetch,
    });

    await loader.init("/mock/manifest.json");

    expect(loader.getManifest()).toEqual(mockManifest);

    const parsed = loader.getPiece("test_cup_tile");
    expect(parsed).toBeDefined();
    expect(parsed!.visualTemplate.children.length).toBe(1);
    expect(parsed!.visualTemplate.children[0].name).toBe("Mesh_Floor");

    // Verify all UBX geometries extracted including UBX_Wall_B
    expect(parsed!.ubxFloorGeometry).not.toBeNull();
    expect(parsed!.ubxWallLGeometry).not.toBeNull();
    expect(parsed!.ubxWallRGeometry).not.toBeNull();
    expect(parsed!.ubxWallBackGeometry).not.toBeNull();

    // Verify sockets and locators
    expect(parsed!.sockets.length).toBe(1);
    expect(parsed!.sockets[0].id).toBe("LOC_Socket_In");
    expect(parsed!.locators.has("LOC_Spawn_Tee")).toBe(true);
    expect(parsed!.locators.get("LOC_Spawn_Tee")!.y).toBeCloseTo(1.15, 2);
    expect(parsed!.locators.has("LOC_Sensor_Goal")).toBe(true);
    expect(parsed!.locators.get("LOC_Sensor_Goal")!.y).toBeCloseTo(0.5, 2);

    // Verify shared material has flipY = false
    const sharedMat = loader.getSharedMaterial()!;
    expect(sharedMat).not.toBeNull();
    expect(sharedMat.map?.flipY).toBe(false);
    expect(sharedMat.normalMap?.flipY).toBe(false);
    expect(sharedMat.roughnessMap?.flipY).toBe(false);
  });
});

