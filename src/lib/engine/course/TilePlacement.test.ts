import { describe, it, expect } from "vitest";
import * as THREE from "three";
import type { PlacedTile } from "../types/CourseSchema";
import type { SocketDefinition } from "../types/KitTypes";
import {
  snapTileToParent,
  computeTeeHeading,
  splineStartHeading,
  findWallMeshes,
  clonePlacedTile,
  locatorWorldPosition,
} from "./TilePlacement";

const socketIn: SocketDefinition = {
  id: "LOC_Socket_In",
  position: [0, 0, 3],
  normal: [0, 0, 1],
  type: "track_arcade_6m",
  elevation: 0,
};
const socketOut: SocketDefinition = {
  id: "LOC_Socket_Out",
  position: [0, 0, -3],
  normal: [0, 0, -1],
  type: "track_arcade_6m",
  elevation: 0,
};

function makeTile(attachedTo?: PlacedTile["attachedTo"]): PlacedTile {
  return {
    instanceId: "child",
    kitPieceId: "carnival_straight_6m",
    walls: { left: true, right: true },
    attachedTo,
  };
}

describe("snapTileToParent", () => {
  it("writes the snapped world position and rotation into the tile data", () => {
    const parentGroup = new THREE.Group();
    parentGroup.position.set(0, 0, 6);
    const tile = makeTile({ parentInstanceId: "p", parentSocketId: "LOC_Socket_Out" });

    snapTileToParent(tile, { group: parentGroup, sockets: [socketIn, socketOut] }, [socketIn, socketOut]);

    expect(tile.position![0]).toBeCloseTo(0, 4);
    expect(tile.position![2]).toBeCloseTo(0, 4);
    expect(Math.abs(tile.rotationY!)).toBeCloseTo(0, 3);
  });

  it("leaves the tile untouched when a socket cannot be resolved", () => {
    const tile = makeTile({ parentInstanceId: "p", parentSocketId: "LOC_Socket_Nope" });
    snapTileToParent(tile, { group: new THREE.Group(), sockets: [socketOut] }, [socketIn]);
    expect(tile.position).toBeUndefined();
  });

  it("does nothing without an attachedTo link or parent", () => {
    const tile = makeTile();
    snapTileToParent(tile, undefined, [socketIn]);
    expect(tile.position).toBeUndefined();
  });
});

describe("computeTeeHeading", () => {
  it("points from the spawn position toward the tee's exit socket", () => {
    const group = new THREE.Group();
    group.rotation.y = -Math.PI / 2;
    group.updateMatrixWorld(true);
    const heading = computeTeeHeading(group, [socketOut], new THREE.Vector3(0, 0.2, 0));
    expect(heading.x).toBeCloseTo(1, 4);
    expect(heading.z).toBeCloseTo(0, 4);
    expect(heading.y).toBe(0);
  });

  it("falls back to the group's forward axis when there is no exit socket", () => {
    const group = new THREE.Group();
    group.rotation.y = Math.PI / 2;
    group.updateMatrixWorld(true);
    const heading = computeTeeHeading(group, [], new THREE.Vector3());
    expect(heading.x).toBeCloseTo(-1, 4);
    expect(heading.z).toBeCloseTo(0, 4);
  });
});

describe("splineStartHeading", () => {
  const node = (x: number, z: number) => ({ position: [x, 0, z] as [number, number, number], handleOffset: [0, 0] as [number, number] });

  it("returns the horizontal unit direction of the first spline leg", () => {
    const heading = splineStartHeading({ closed: false, nodes: [node(0, 0), node(0, 5)] })!;
    expect(heading.toArray()).toEqual([0, 0, 1]);
  });

  it("returns null for missing, short or degenerate splines", () => {
    expect(splineStartHeading(null)).toBeNull();
    expect(splineStartHeading({ closed: false, nodes: [node(0, 0)] })).toBeNull();
    expect(splineStartHeading({ closed: false, nodes: [node(1, 1), node(1, 1)] })).toBeNull();
  });
});

describe("findWallMeshes", () => {
  it("finds left/right/back wall meshes ignoring Blender numeric suffixes", () => {
    const group = new THREE.Group();
    const named = (name: string) => {
      const m = new THREE.Mesh();
      m.name = name;
      group.add(m);
      return m;
    };
    const left = named("Mesh_Wall_L.008");
    const right = named("Mesh_Wall_R001");
    const back = named("Mesh_Wall_B");
    named("Mesh_Floor");

    const walls = findWallMeshes(group);
    expect(walls.left).toBe(left);
    expect(walls.right).toBe(right);
    expect(walls.back).toBe(back);
  });

  it("returns empty references when no walls exist", () => {
    expect(findWallMeshes(new THREE.Group())).toEqual({});
  });
});

describe("clonePlacedTile", () => {
  it("deep-copies nested tile data so edits do not leak back", () => {
    const original: PlacedTile = {
      instanceId: "t",
      kitPieceId: "carnival_straight_6m",
      position: [1, 2, 3],
      walls: { left: true, right: false },
      connectedSockets: { LOC_Socket_Out: "n" },
      attachedTo: { parentInstanceId: "p", parentSocketId: "LOC_Socket_Out" },
    };
    const copy = clonePlacedTile(original);
    expect(copy).toEqual(original);

    copy.position![0] = 99;
    copy.walls.left = false;
    copy.connectedSockets!.LOC_Socket_Out = "x";
    copy.attachedTo!.parentInstanceId = "z";
    expect(original.position).toEqual([1, 2, 3]);
    expect(original.walls.left).toBe(true);
    expect(original.connectedSockets!.LOC_Socket_Out).toBe("n");
    expect(original.attachedTo!.parentInstanceId).toBe("p");
  });
});

describe("locatorWorldPosition", () => {
  it("rotates and translates a template locator into world space", () => {
    const group = new THREE.Group();
    group.position.set(10, 1, 4);
    group.rotation.y = Math.PI / 2;
    const locators = new Map([["LOC_Spawn_Tee", new THREE.Vector3(0, 0.2, -3)]]);

    const world = locatorWorldPosition(group, locators, "LOC_Spawn_Tee")!;
    expect(world.x).toBeCloseTo(7, 4);
    expect(world.y).toBeCloseTo(1.2, 4);
    expect(world.z).toBeCloseTo(4, 4);
    // Template locator must not be mutated
    expect(locators.get("LOC_Spawn_Tee")!.z).toBe(-3);
  });

  it("returns null when the locator does not exist", () => {
    expect(locatorWorldPosition(new THREE.Group(), new Map(), "LOC_Sensor_Goal")).toBeNull();
  });
});
