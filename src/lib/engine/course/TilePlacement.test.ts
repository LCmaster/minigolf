import { describe, it, expect } from "vitest";
import * as THREE from "three";
import type { PlacedTile } from "../types/CourseSchema";
import type { SocketDefinition } from "../types/KitTypes";
import { snapTileToParent, computeTeeHeading } from "./TilePlacement";

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
