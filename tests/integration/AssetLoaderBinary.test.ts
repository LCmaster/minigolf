import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

describe("AssetLoader Binary GLB Integration Tests", () => {
  const loader = new GLTFLoader();

  function parseGlbFromDisk(relativePath: string): Promise<THREE.Group> {
    const fullPath = path.resolve("static", relativePath);
    const buffer = fs.readFileSync(fullPath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

    return new Promise((resolve, reject) => {
      loader.parse(
        arrayBuffer,
        "",
        (gltf) => resolve(gltf.scene),
        (err) => reject(err)
      );
    });
  }

  it("parses tee_box_6x6.glb binary and extracts visual meshes, UBX colliders, and LOC_Spawn_Tee", async () => {
    const scene = await parseGlbFromDisk("models/kit/tee_box_6x6.glb");

    const foundMeshes: string[] = [];
    const foundColliders: string[] = [];
    const foundLocators: string[] = [];

    scene.traverse((child) => {
      const cleanName = child.name.replace(/(?:\.\d+|\d{3})+$/, "");
      if (cleanName.startsWith("Mesh_")) foundMeshes.push(cleanName);
      if (cleanName.startsWith("UBX_")) foundColliders.push(cleanName);
      if (cleanName.startsWith("LOC_")) foundLocators.push(cleanName);
    });

    expect(foundMeshes).toContain("Mesh_Floor");
    expect(foundMeshes).toContain("Mesh_Wall_L");
    expect(foundMeshes).toContain("Mesh_Wall_R");
    expect(foundColliders).toContain("UBX_Floor");
    expect(foundLocators).toContain("LOC_Spawn_Tee");
    expect(foundLocators).toContain("LOC_Socket_Out");
  });

  it("parses straight_6m.glb binary and verifies 6x6m geometry bounds and sockets", async () => {
    const scene = await parseGlbFromDisk("models/kit/straight_6m.glb");

    let floorMesh: THREE.Mesh | null = null;
    const sockets: string[] = [];

    scene.traverse((child) => {
      const cleanName = child.name.replace(/(?:\.\d+|\d{3})+$/, "");
      if (cleanName === "Mesh_Floor" && child instanceof THREE.Mesh) {
        floorMesh = child;
      }
      if (cleanName.startsWith("LOC_Socket_")) {
        sockets.push(cleanName);
      }
    });

    expect(floorMesh).not.toBeNull();
    floorMesh!.geometry.computeBoundingBox();
    const bbox = floorMesh!.geometry.boundingBox!;
    const lengthZ = bbox.max.z - bbox.min.z;

    expect(lengthZ).toBeCloseTo(6.0, 1);
    expect(sockets).toContain("LOC_Socket_In");
    expect(sockets).toContain("LOC_Socket_Out");
  });

  it("parses green_cup_standard_6x6.glb binary and verifies recessed circular cup vertices and LOC_Sensor_Goal", async () => {
    const scene = await parseGlbFromDisk("models/kit/green_cup_standard_6x6.glb");

    let floorMesh: THREE.Mesh | null = null;
    let hasGoalSensor = false;

    scene.traverse((child) => {
      const cleanName = child.name.replace(/(?:\.\d+|\d{3})+$/, "");
      if (cleanName === "Mesh_Floor" && child instanceof THREE.Mesh) {
        floorMesh = child;
      }
      if (cleanName === "LOC_Sensor_Goal") {
        hasGoalSensor = true;
      }
    });

    expect(hasGoalSensor).toBe(true);
    expect(floorMesh).not.toBeNull();

    // Verify recessed cup cavity vertices exist below the top rolling plane
    const posAttr = floorMesh!.geometry.attributes.position;
    let recessedVertexCount = 0;
    for (let i = 0; i < posAttr.count; i++) {
      if (posAttr.getY(i) < -0.05) {
        recessedVertexCount++;
      }
    }

    expect(recessedVertexCount).toBeGreaterThan(20);
  });

  it("parses Carnival Park track & prop GLBs with UBX colliders and LOC locators", async () => {
    const tee = await parseGlbFromDisk("models/kit/carnival_tee_6x6.glb");
    const bridge = await parseGlbFromDisk("models/kit/carnival_bridge_pond_6x12.glb");
    const green = await parseGlbFromDisk("models/kit/carnival_green_cup_6x6.glb");
    const arch = await parseGlbFromDisk("models/kit/prop_carnival_arch_6m.glb");

    const collectNames = (root: THREE.Group) => {
      const names: string[] = [];
      root.traverse((c) => {
        if (c.name) names.push(c.name.replace(/(?:\.\d+|\d{3})+$/, ""));
      });
      return names;
    };

    const teeNames = collectNames(tee);
    expect(teeNames).toContain("Mesh_Floor");
    expect(teeNames).toContain("UBX_Floor");
    expect(teeNames).toContain("LOC_Spawn_Tee");
    expect(teeNames).toContain("LOC_Socket_Out");

    const bridgeNames = collectNames(bridge);
    expect(bridgeNames).toContain("UBX_Floor");
    expect(bridgeNames).toContain("Mesh_Pond_Water");
    expect(bridgeNames).toContain("Mesh_Bridge_Deck");

    const greenNames = collectNames(green);
    expect(greenNames).toContain("UBX_Floor");
    expect(greenNames).toContain("LOC_Sensor_Goal");
    expect(greenNames).toContain("UBX_Wall_Back");

    const archNames = collectNames(arch);
    expect(archNames).toContain("Mesh_Carnival_Arch");
    expect(archNames).toContain("UBX_Arch_Posts");

    const boosterPad = await parseGlbFromDisk("models/kit/prop_carnival_booster_pad.glb");
    const boosterNames = collectNames(boosterPad);
    expect(boosterNames).toContain("Mesh_Booster_Pad");
    expect(boosterNames).toContain("UBX_Booster_Sensor");

    const wedgeBumper = await parseGlbFromDisk("models/kit/prop_carnival_wedge_bumper.glb");
    const wedgeNames = collectNames(wedgeBumper);
    expect(wedgeNames).toContain("Mesh_Wedge_Bumper");
    expect(wedgeNames).toContain("UBX_Bumper");
  });
});
