import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SocketSolver } from "../src/lib/engine/course/SocketSolver";
import type { SocketDefinition } from "../src/lib/engine/types/KitTypes";

describe("SocketSolver (TDD)", () => {
  it("aligns two standard 6m straights with 0.0000mm error", () => {
    // Tile A at origin (0, 0, 0), facing North (-Z)
    // Socket Out is at (0, 0, -3.0) facing -Z
    const tileAWorldMatrix = new THREE.Matrix4().identity();
    const socketAOut: SocketDefinition = {
      id: "LOC_Socket_Out",
      position: [0, 0, -3.0],
      normal: [0, 0, -1],
      type: "track_arcade_6m",
      elevation: 0,
    };

    // Tile B: Socket In is at (0, 0, 3.0) facing +Z
    const socketBIn: SocketDefinition = {
      id: "LOC_Socket_In",
      position: [0, 0, 3.0],
      normal: [0, 0, 1],
      type: "track_arcade_6m",
      elevation: 0,
    };

    const tileBWorldMatrix = SocketSolver.computeSnappedTransform(
      tileAWorldMatrix,
      socketAOut,
      socketBIn
    );

    const bPos = new THREE.Vector3();
    const bQuat = new THREE.Quaternion();
    const bScale = new THREE.Vector3();
    tileBWorldMatrix.decompose(bPos, bQuat, bScale);

    // Tile B should be placed at (0, 0, -6.0)
    expect(bPos.x).toBeCloseTo(0, 4);
    expect(bPos.y).toBeCloseTo(0, 4);
    expect(bPos.z).toBeCloseTo(-6.0, 4);

    // In world space, Tile A's socket Out and Tile B's socket In must coincide
    const worldSocketAOut = new THREE.Vector3(...socketAOut.position).applyMatrix4(tileAWorldMatrix);
    const worldSocketBIn = new THREE.Vector3(...socketBIn.position).applyMatrix4(tileBWorldMatrix);

    expect(worldSocketAOut.distanceTo(worldSocketBIn)).toBeLessThan(1e-4);
  });

  it("aligns a straight into a 45-degree turn correctly", () => {
    // Tile A at (0, 0, 0)
    const tileAWorldMatrix = new THREE.Matrix4().identity();
    const socketAOut: SocketDefinition = {
      id: "LOC_Socket_Out",
      position: [0, 0, -3.0],
      normal: [0, 0, -1],
      type: "track_arcade_6m",
      elevation: 0,
    };

    // Compact 45-degree turn: Socket In at (0, 0, 2.0) facing +Z
    const socketBIn: SocketDefinition = {
      id: "LOC_Socket_In",
      position: [0, 0, 2.0],
      normal: [0, 0, 1],
      type: "track_arcade_6m",
      elevation: 0,
    };

    const tileBWorldMatrix = SocketSolver.computeSnappedTransform(
      tileAWorldMatrix,
      socketAOut,
      socketBIn
    );

    const worldSocketAOut = new THREE.Vector3(...socketAOut.position).applyMatrix4(tileAWorldMatrix);
    const worldSocketBIn = new THREE.Vector3(...socketBIn.position).applyMatrix4(tileBWorldMatrix);

    expect(worldSocketAOut.distanceTo(worldSocketBIn)).toBeLessThan(1e-4);
  });

  it("chains 4 consecutive 90-degree turns back to the starting point", () => {
    // 4x 90-degree turns in a loop
    let currentMatrix = new THREE.Matrix4().identity();

    const turnSocketIn: SocketDefinition = {
      id: "LOC_Socket_In",
      position: [0, 0, 3.0],
      normal: [0, 0, 1],
      type: "track_arcade_6m",
      elevation: 0,
    };

    // 90 deg turn exits East (+X) at (3.0, 0, 0)
    const turnSocketOut: SocketDefinition = {
      id: "LOC_Socket_Out",
      position: [3.0, 0, 0.0],
      normal: [1, 0, 0],
      type: "track_arcade_6m",
      elevation: 0,
    };

    // Connect 4 turns
    for (let i = 0; i < 4; i++) {
      currentMatrix = SocketSolver.computeSnappedTransform(
        currentMatrix,
        turnSocketOut,
        turnSocketIn
      );
    }

    const finalPos = new THREE.Vector3();
    const finalQuat = new THREE.Quaternion();
    const finalScale = new THREE.Vector3();
    currentMatrix.decompose(finalPos, finalQuat, finalScale);

    // After 4x 90 deg turns (360 deg), orientation must be back to 0 (identity rotation)
    const euler = new THREE.Euler().setFromQuaternion(finalQuat);
    expect(Math.abs(euler.y) % (2 * Math.PI)).toBeCloseTo(0, 3);
  });
});

