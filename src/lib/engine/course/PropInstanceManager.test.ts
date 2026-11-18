import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { PropInstanceManager, createStaticTrimeshColliderDesc } from "./PropInstanceManager";
import type { BoosterSensorInfo } from "./CourseManager";
import type { PlacedProp } from "../types/CourseSchema";

function makeMockRapier() {
  let nextHandle = 100;
  const removedColliders: unknown[] = [];

  const rapierWorld = {
    createCollider: vi.fn((desc: any) => ({
      handle: nextHandle++,
      _desc: desc,
    })),
    removeCollider: vi.fn((col: any) => {
      removedColliders.push(col);
    }),
  };

  const makeDesc = () => {
    const desc: any = {
      friction: 0,
      restitution: 0,
      sensor: false,
      activeEvents: 0,
      setFriction(v: number) {
        desc.friction = v;
        return desc;
      },
      setRestitution(v: number) {
        desc.restitution = v;
        return desc;
      },
      setSensor(v: boolean) {
        desc.sensor = v;
        return desc;
      },
      setActiveEvents(v: number) {
        desc.activeEvents = v;
        return desc;
      },
    };
    return desc;
  };

  const rapier = {
    ColliderDesc: {
      trimesh: vi.fn(() => makeDesc()),
    },
    ActiveEvents: {
      COLLISION_EVENTS: 1,
    },
  };

  return { rapierWorld, rapier, removedColliders };
}

describe("PropInstanceManager", () => {
  it("builds static trimesh collider descriptors with transformed vertices", () => {
    const { rapier } = makeMockRapier();
    const box = new THREE.BoxGeometry(1, 1, 1);
    const matrix = new THREE.Matrix4().makeTranslation(5, 0, -2);
    const desc = createStaticTrimeshColliderDesc(rapier as any, box, matrix);
    expect(desc).not.toBeNull();
    expect(rapier.ColliderDesc.trimesh).toHaveBeenCalledTimes(1);
    const [verts] = rapier.ColliderDesc.trimesh.mock.calls[0] as unknown as [Float32Array, Uint32Array];
    expect(verts.length).toBeGreaterThan(0);
    // Centroid X of translated 1x1x1 box is ~5
    let avgX = 0;
    const count = verts.length / 3;
    for (let i = 0; i < count; i++) avgX += verts[i * 3];
    expect(avgX / count).toBeCloseTo(5);
  });

  it("replaces legacy booster pad mesh with hovering chevron visuals that are removed with the prop", () => {
    const scene = new THREE.Scene();
    const { rapierWorld, rapier } = makeMockRapier();
    const boosterSensors = new Map<number, BoosterSensorInfo>();

    const template = new THREE.Group();
    const legacyPad = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 2), new THREE.MeshBasicMaterial());
    legacyPad.name = "Mesh_Booster_Pad";
    template.add(legacyPad);

    const manager = new PropInstanceManager({
      scene,
      rapierWorld: rapierWorld as any,
      rapier: rapier as any,
      assetLoader: {
        getPiece: () => ({
          id: "prop_booster",
          visualTemplate: template,
          metadata: { tags: ["booster"] },
          ubxColliderGeometries: [],
          ubxSensorGeometry: new THREE.BoxGeometry(0.8, 0.2, 0.8),
        }),
      } as any,
      boosterSensors,
      bumperColliderHandles: new Set<number>(),
    });

    const booster = manager.addProp({
      instanceId: "pad_visual",
      propId: "prop_booster",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    })!;

    const clonedPad = booster.group.getObjectByName("Mesh_Booster_Pad")!;
    expect(clonedPad.visible).toBe(false);
    expect(booster.group.getObjectByName("Visual_Booster_Chevrons")).toBeTruthy();

    const info = boosterSensors.get(booster.colliders[0].handle)!;
    expect(info.visuals).toBeDefined();
    expect(booster.group.children).toContain(info.visuals!.group);

    manager.removeProp("pad_visual");
    expect(boosterSensors.size).toBe(0);
  });

  it("instantiates bumper and booster props, registers physics metadata, updates transforms, and removes cleanly", () => {
    const scene = new THREE.Scene();
    const { rapierWorld, rapier } = makeMockRapier();
    const boosterSensors = new Map<number, BoosterSensorInfo>();
    const bumperColliderHandles = new Set<number>();
    const onChanged = vi.fn();

    const bumperGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const sensorGeo = new THREE.BoxGeometry(0.8, 0.2, 0.8);

    const pieces: Record<string, any> = {
      prop_bumper: {
        id: "prop_bumper",
        visualTemplate: new THREE.Group(),
        metadata: { tags: ["bumper"] },
        ubxColliderGeometries: [bumperGeo],
      },
      prop_booster: {
        id: "prop_booster",
        visualTemplate: new THREE.Group(),
        metadata: { tags: ["booster"] },
        ubxColliderGeometries: [],
        ubxSensorGeometry: sensorGeo,
      },
    };

    const manager = new PropInstanceManager({
      scene,
      rapierWorld: rapierWorld as any,
      rapier: rapier as any,
      assetLoader: { getPiece: (id: string) => pieces[id] } as any,
      boosterSensors,
      bumperColliderHandles,
      onChanged,
    });

    const bumperData: PlacedProp = {
      instanceId: "b1",
      propId: "prop_bumper",
      position: [1, 0, 2],
      rotation: [0, 45, 0],
      scale: [1, 1, 1],
    };
    const bumper = manager.addProp(bumperData);
    expect(bumper).not.toBeNull();
    expect(bumper!.colliders).toHaveLength(1);
    expect(bumperColliderHandles.has(bumper!.colliders[0].handle)).toBe(true);
    expect(scene.children).toContain(bumper!.group);

    const booster = manager.addProp({
      instanceId: "pad1",
      propId: "prop_booster",
      position: [0, 0, -4],
      rotation: [0, 90, 0],
      scale: [1, 1, 1],
    });
    expect(booster).not.toBeNull();
    expect(boosterSensors.size).toBe(1);
    const sensorInfo = boosterSensors.get(booster!.colliders[0].handle)!;
    // +90 deg around Y rotates local (0,0,-1) to (-1,0,0)
    expect(sensorInfo.direction.x).toBeCloseTo(-1);
    expect(sensorInfo.direction.z).toBeCloseTo(0);
    expect(sensorInfo.impulse).toBeCloseTo(0.038);

    expect(manager.updatePropTransform("b1", [3, 0, 5], [0, 90, 0])).toBe(true);
    const moved = manager.getProp("b1")!;
    expect(moved.group.position.x).toBeCloseTo(3);
    expect(moved.group.position.z).toBeCloseTo(5);
    expect(manager.updatePropTransform("missing", [0, 0, 0], [0, 0, 0])).toBe(false);

    expect(manager.exportProps()).toHaveLength(2);
    expect(manager.removeProp("pad1")).toBe(true);
    expect(boosterSensors.size).toBe(0);
    expect(manager.getAllProps()).toHaveLength(1);

    manager.clear();
    expect(manager.getAllProps()).toHaveLength(0);
    expect(bumperColliderHandles.size).toBe(0);
    expect(scene.children).toHaveLength(0);
    expect(onChanged).toHaveBeenCalled();
  });

  it("registers water hazard colliders from ubxWaterGeometries and removes them on removeProp/clear", () => {
    const scene = new THREE.Scene();
    const { rapierWorld, rapier } = makeMockRapier();
    const boosterSensors = new Map<number, BoosterSensorInfo>();
    const bumperColliderHandles = new Set<number>();
    const waterHazardColliderHandles = new Set<number>();

    const pieces: Record<string, any> = {
      terrain_pond_patch_6x6: {
        id: "terrain_pond_patch_6x6",
        visualTemplate: new THREE.Group(),
        metadata: { tags: ["terrain", "pond", "water"] },
        ubxColliderGeometries: [new THREE.BoxGeometry(6, 0.2, 6)],
        ubxWaterGeometries: [new THREE.PlaneGeometry(5, 5)],
      },
    };

    const manager = new PropInstanceManager({
      scene,
      rapierWorld: rapierWorld as any,
      rapier: rapier as any,
      assetLoader: { getPiece: (id: string) => pieces[id] } as any,
      boosterSensors,
      bumperColliderHandles,
      waterHazardColliderHandles,
    });

    const pond = manager.addProp({
      instanceId: "pond_1",
      propId: "terrain_pond_patch_6x6",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    })!;

    expect(pond.colliders).toHaveLength(2);
    expect(waterHazardColliderHandles.size).toBe(1);
    const [waterHandle] = Array.from(waterHazardColliderHandles);
    const waterCol = pond.colliders.find((c) => c.handle === waterHandle) as any;
    expect(waterCol._desc.sensor).toBe(true);

    manager.removeProp("pond_1");
    expect(waterHazardColliderHandles.size).toBe(0);

    manager.addProp({
      instanceId: "pond_2",
      propId: "terrain_pond_patch_6x6",
      position: [4, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
    expect(waterHazardColliderHandles.size).toBe(1);

    manager.clear();
    expect(waterHazardColliderHandles.size).toBe(0);
  });
});

