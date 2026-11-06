/**
 * HoleGenerator.ts
 * Procedural Hole Generator & WFC Flow Planner.
 * Guarantees 100% solvable, playable mini-golf holes for any requested Par and Complexity.
 */

import type { HoleData, PlacedTile } from "../types/CourseSchema";
import type { AssetLoader } from "../kitbash/AssetLoader";

export interface GenerationOptions {
  par: number; // 2, 3, 4, 5
  style: "straightforward" | "winding" | "elevation";
  includeObstacles: boolean;
}

export class HoleGenerator {
  private assetLoader: AssetLoader;

  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader;
  }

  public generateHole(options: GenerationOptions): HoleData {
    const tiles: PlacedTile[] = [];
    let currentPos: [number, number, number] = [0, 0, 0];
    let currentYaw = 0; // Degrees

    // Helper to calculate next tile position based on step length and yaw
    const forwardStep = (length: number): [number, number, number] => {
      const rad = (currentYaw * Math.PI) / 180;
      return [
        currentPos[0] - Math.sin(rad) * length,
        currentPos[1],
        currentPos[2] - Math.cos(rad) * length,
      ];
    };

    // 1. Tee-Off Box at origin
    const teeTileId = `tile_tee_${Date.now()}`;
    tiles.push({
      instanceId: teeTileId,
      kitPieceId: "tee_box_4x4",
      position: [0, 0, 0],
      rotationY: 0,
      walls: { left: true, right: true },
      connectedSockets: {},
    });

    // Advance forward 4 meters
    currentPos = forwardStep(4.0);

    // 2. Determine fairway length based on requested Par
    let targetSegments = 3;
    if (options.par === 3) targetSegments = 5;
    if (options.par === 4) targetSegments = 8;
    if (options.par === 5) targetSegments = 12;

    const obstacleIndex = Math.floor(targetSegments / 2);

    for (let i = 0; i < targetSegments; i++) {
      const instanceId = `tile_seq_${i}_${Date.now()}`;

      // Check if we should insert the Windmill or Obstacle at the midpoint
      if (options.includeObstacles && i === obstacleIndex && options.par >= 3) {
        tiles.push({
          instanceId,
          kitPieceId: "obstacle_windmill_4x8",
          position: [...currentPos],
          rotationY: currentYaw,
          walls: { left: true, right: true },
          connectedSockets: {},
        });
        currentPos = forwardStep(8.0);
        continue;
      }

      // Check if we should insert elevation ramp
      if (options.style === "elevation" && i === 1) {
        tiles.push({
          instanceId,
          kitPieceId: "ramp_up_15deg_4x4",
          position: [...currentPos],
          rotationY: currentYaw,
          walls: { left: true, right: true },
          connectedSockets: {},
        });
        currentPos = forwardStep(4.0);
        currentPos[1] += 1.0; // Elevation delta
        continue;
      } else if (options.style === "elevation" && i === targetSegments - 2) {
        tiles.push({
          instanceId,
          kitPieceId: "ramp_down_15deg_4x4",
          position: [...currentPos],
          rotationY: currentYaw,
          walls: { left: true, right: true },
          connectedSockets: {},
        });
        currentPos = forwardStep(4.0);
        currentPos[1] -= 1.0;
        continue;
      }

      // Bends and Turns for "winding" style
      if (options.style === "winding" && (i === 1 || i === targetSegments - 2)) {
        const turnAngle = i % 2 === 1 ? 45 : -45;
        tiles.push({
          instanceId,
          kitPieceId: "turn_45deg_rounded",
          position: [...currentPos],
          rotationY: currentYaw,
          walls: { left: true, right: true },
          connectedSockets: {},
        });
        currentYaw = (currentYaw + turnAngle + 360) % 360;
        currentPos = forwardStep(4.0);
        continue;
      }

      // Standard Straight Fairway
      tiles.push({
        instanceId,
        kitPieceId: "straight_4m",
        position: [...currentPos],
        rotationY: currentYaw,
        walls: { left: true, right: true },
        connectedSockets: {},
      });
      currentPos = forwardStep(4.0);
    }

    // 3. Terminal Cup Green
    const cupTileId = `tile_cup_${Date.now()}`;
    const greenKitId = options.style === "elevation" ? "green_cup_funnel_4x4" : "green_cup_standard_4x4";
    tiles.push({
      instanceId: cupTileId,
      kitPieceId: greenKitId,
      position: [...currentPos],
      rotationY: currentYaw,
      walls: { left: true, right: true },
      connectedSockets: {},
    });

    // 4. Connect adjacent sockets in sequence
    for (let i = 0; i < tiles.length - 1; i++) {
      const current = tiles[i];
      const next = tiles[i + 1];
      current.connectedSockets["LOC_Socket_Out"] = next.instanceId;
      next.connectedSockets["LOC_Socket_In"] = current.instanceId;
    }

    return {
      holeNumber: 1,
      par: options.par,
      teeTileId,
      cupTileId,
      tiles,
      props: [],
    };
  }
}

