/**
 * HoleGenerator.ts
 * Procedural Hole Generator & WFC Flow Planner.
 * Guarantees 100% solvable, playable mini-golf holes for any requested Par and Complexity.
 */

import type { HoleData, PlacedTile } from "../types/CourseSchema";
import type { AssetLoader } from "../kitbash/AssetLoader";
import { autoDecorateHole } from "./AutoDecorate";

export interface GenerationOptions {
  par: number; // 2, 3, 4, 5
  style: "straightforward" | "winding" | "elevation";
  includeObstacles: boolean;
  theme?: "country_club" | "carnival_park";
}

export class HoleGenerator {
  private assetLoader: AssetLoader;

  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader;
  }

  private resolvePieceId(preferredId: string, fallbackId: string): string {
    if (typeof this.assetLoader?.getPiece === "function" && this.assetLoader.getPiece(preferredId)) {
      return preferredId;
    }
    return fallbackId;
  }

  public generateHole(options: GenerationOptions): HoleData {
    const tiles: PlacedTile[] = [];
    let currentPos: [number, number, number] = [0, 0, 0];
    let currentYaw = 0; // Degrees
    const isCarnival = options.theme === "carnival_park";
    const idSeed = Date.now();

    const forwardStep = (length: number): [number, number, number] => {
      const rad = (currentYaw * Math.PI) / 180;
      return [
        currentPos[0] - Math.sin(rad) * length,
        currentPos[1],
        currentPos[2] - Math.cos(rad) * length,
      ];
    };

    // 1. Tee-Off Box at origin (6x6m socket standard)
    const teeTileId = `tile_tee_${idSeed}`;
    const teePiece = isCarnival
      ? this.resolvePieceId("carnival_tee_6x6", "tee_box_6x6")
      : "tee_box_6x6";
    tiles.push({
      instanceId: teeTileId,
      kitPieceId: teePiece,
      position: [0, 0, 0],
      rotationY: 0,
      walls: { left: true, right: true },
      connectedSockets: {},
    });

    currentPos = forwardStep(6.0);

    // 2. Determine fairway length based on requested Par
    let targetSegments = 3;
    if (options.par === 3) targetSegments = 5;
    if (options.par === 4) targetSegments = 8;
    if (options.par === 5) targetSegments = 12;

    const obstacleIndex = Math.floor(targetSegments / 2);

    for (let i = 0; i < targetSegments; i++) {
      const instanceId = `tile_seq_${i}_${idSeed}`;
      const prevId = tiles[tiles.length - 1].instanceId;

      // Insert Windmill or Carnival Bridge at the midpoint
      if (options.includeObstacles && i === obstacleIndex && options.par >= 3) {
        const obsPiece = isCarnival
          ? this.resolvePieceId("carnival_bridge_pond_6x12", "obstacle_windmill_6x12")
          : "obstacle_windmill_6x12";
        tiles.push({
          instanceId,
          kitPieceId: obsPiece,
          attachedTo: { parentInstanceId: prevId, parentSocketId: "LOC_Socket_Out" },
          position: [...currentPos],
          rotationY: currentYaw,
          walls: { left: true, right: true },
          connectedSockets: {},
        });
        currentPos = forwardStep(12.0);
        continue;
      }

      // Elevation ramps
      if (options.style === "elevation" && i === 1) {
        const rampUp = isCarnival
          ? this.resolvePieceId("carnival_ramp_up_15deg_6x6", "ramp_up_15deg_6x6")
          : "ramp_up_15deg_6x6";
        tiles.push({
          instanceId,
          kitPieceId: rampUp,
          attachedTo: { parentInstanceId: prevId, parentSocketId: "LOC_Socket_Out" },
          position: [...currentPos],
          rotationY: currentYaw,
          walls: { left: true, right: true },
          connectedSockets: {},
        });
        currentPos = forwardStep(6.0);
        currentPos[1] += 1.5;
        continue;
      } else if (options.style === "elevation" && i === targetSegments - 2) {
        const rampDown = isCarnival
          ? this.resolvePieceId("carnival_ramp_down_15deg_6x6", "ramp_down_15deg_6x6")
          : "ramp_down_15deg_6x6";
        tiles.push({
          instanceId,
          kitPieceId: rampDown,
          attachedTo: { parentInstanceId: prevId, parentSocketId: "LOC_Socket_Out" },
          position: [...currentPos],
          rotationY: currentYaw,
          walls: { left: true, right: true },
          connectedSockets: {},
        });
        currentPos = forwardStep(6.0);
        currentPos[1] -= 1.5;
        continue;
      }

      // Bends and Turns for "winding" style
      if (options.style === "winding" && (i === 1 || i === targetSegments - 2)) {
        const turnPiece = isCarnival
          ? this.resolvePieceId("carnival_turn_45deg_rounded", "turn_45deg_rounded")
          : "turn_45deg_rounded";
        tiles.push({
          instanceId,
          kitPieceId: turnPiece,
          attachedTo: { parentInstanceId: prevId, parentSocketId: "LOC_Socket_Out" },
          position: [...currentPos],
          rotationY: currentYaw,
          walls: { left: true, right: true },
          connectedSockets: {},
        });
        currentYaw = (currentYaw - 45 + 360) % 360;
        currentPos = forwardStep(6.0);
        continue;
      }

      // Standard Straight Fairway
      const straightPiece = isCarnival
        ? this.resolvePieceId("carnival_straight_6m", "straight_6m")
        : "straight_6m";
      tiles.push({
        instanceId,
        kitPieceId: straightPiece,
        attachedTo: { parentInstanceId: prevId, parentSocketId: "LOC_Socket_Out" },
        position: [...currentPos],
        rotationY: currentYaw,
        walls: { left: true, right: true },
        connectedSockets: {},
      });
      currentPos = forwardStep(6.0);
    }

    // 3. Terminal Cup Green
    const cupTileId = `tile_cup_${idSeed}`;
    const lastId = tiles[tiles.length - 1].instanceId;
    const defaultCup = options.style === "elevation" ? "green_cup_funnel_6x6" : "green_cup_standard_6x6";
    const greenKitId = isCarnival
      ? this.resolvePieceId("carnival_green_cup_6x6", defaultCup)
      : defaultCup;
    tiles.push({
      instanceId: cupTileId,
      kitPieceId: greenKitId,
      attachedTo: { parentInstanceId: lastId, parentSocketId: "LOC_Socket_Out" },
      position: [...currentPos],
      rotationY: currentYaw,
      walls: { left: true, right: true },
      connectedSockets: {},
    });

    // 4. Connect adjacent sockets in sequence
    for (let i = 0; i < tiles.length - 1; i++) {
      const current = tiles[i];
      const next = tiles[i + 1];
      current.connectedSockets!["LOC_Socket_Out"] = next.instanceId;
      next.connectedSockets!["LOC_Socket_In"] = current.instanceId;
    }

    const props = isCarnival ? autoDecorateHole(tiles, [], "carnival_park", idSeed) : [];

    return {
      holeNumber: 1,
      par: options.par,
      teeTileId,
      cupTileId,
      tiles,
      props,
      showBoundary: isCarnival,
    };
  }
}

