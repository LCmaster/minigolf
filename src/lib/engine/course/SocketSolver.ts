/**
 * SocketSolver.ts
 * Deterministic mathematical snapping matrix solver for kitbash modular tracks.
 * Solves: M_TileB = M_TileA * L_SocketOut * R_y(180) * inv(L_SocketIn)
 */

import * as THREE from "three";
import type { SocketDefinition } from "../types/KitTypes";

export class SocketSolver {
  private static readonly UP = new THREE.Vector3(0, 1, 0);
  private static readonly DEFAULT_FORWARD = new THREE.Vector3(0, 0, 1);
  private static readonly ROT_180_Y = new THREE.Matrix4().makeRotationY(Math.PI);

  /**
   * Constructs a local transformation matrix for a socket definition.
   */
  public static makeSocketLocalMatrix(socket: SocketDefinition): THREE.Matrix4 {
    const pos = new THREE.Vector3(...socket.position);
    const norm = new THREE.Vector3(...socket.normal).normalize();

    const quat = new THREE.Quaternion();
    // Normal vector defines the forward direction of the socket
    quat.setFromUnitVectors(this.DEFAULT_FORWARD, norm);

    const mat = new THREE.Matrix4();
    mat.compose(pos, quat, new THREE.Vector3(1, 1, 1));
    return mat;
  }

  /**
   * Computes the world transformation matrix for Tile B such that its socketIn
   * snaps with 0.0000mm seam tolerance to Tile A's socketOut.
   */
  public static computeSnappedTransform(
    tileAWorldMatrix: THREE.Matrix4,
    socketAOut: SocketDefinition,
    socketBIn: SocketDefinition
  ): THREE.Matrix4 {
    const lA = this.makeSocketLocalMatrix(socketAOut);
    const lB = this.makeSocketLocalMatrix(socketBIn);

    // Invert L_B
    const lBInv = lB.clone().invert();

    // M_B = M_A * L_A * R_y(180) * L_B^-1
    const result = new THREE.Matrix4();
    result.multiplyMatrices(tileAWorldMatrix, lA);
    result.multiply(this.ROT_180_Y);
    result.multiply(lBInv);

    return result;
  }
}

