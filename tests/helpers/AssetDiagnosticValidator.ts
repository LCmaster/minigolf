/**
 * AssetDiagnosticValidator.ts
 * Validates integrity, socket topology, UBX colliders, and timestamp synchronization
 * between Blender master source files (.blend) and runtime exported GLB assets.
 */

import fs from "fs";
import path from "path";

export interface AssetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class AssetDiagnosticValidator {
  /**
   * Verifies that the exported glTF/GLB is up-to-date with respect to its source .blend file.
   */
  public static checkFreshness(blendPath: string, glbPath: string): AssetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fs.existsSync(blendPath)) {
      errors.push(`Source Blender file does not exist at: ${blendPath}`);
      return { valid: false, errors, warnings };
    }

    if (!fs.existsSync(glbPath)) {
      errors.push(
        `Target runtime GLB does not exist at: ${glbPath}. Action: Export the piece from ${blendPath}.`
      );
      return { valid: false, errors, warnings };
    }

    const blendStat = fs.statSync(blendPath);
    const glbStat = fs.statSync(glbPath);

    // If source .blend was modified after the exported .glb (allowing 2s filesystem tolerance)
    if (blendStat.mtimeMs > glbStat.mtimeMs + 2000) {
      warnings.push(
        `Asset out-of-sync: ${path.basename(blendPath)} (modified ${blendStat.mtime.toISOString()}) is newer than ${path.basename(glbPath)} (modified ${glbStat.mtime.toISOString()}). Action: Re-export GLB.`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates required UBX collision proxies for an arcade tile.
   */
  public static validateTileColliders(
    pieceId: string,
    existingColliderNames: string[],
    isEndTile = false,
    isStartTile = false
  ): AssetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const required = ["UBX_Floor", "UBX_Floor_Slab", "UBX_Wall_L", "UBX_Wall_R"];

    if (isStartTile || isEndTile) {
      required.push("UBX_Wall_B");
    }

    if (isEndTile) {
      required.push("UBX_Hole_Indicator");
    }

    for (const req of required) {
      const match = existingColliderNames.some(
        (name) => name === req || name.startsWith(`${req}.`) || name.startsWith(`${req}_`)
      );
      if (!match) {
        errors.push(
          `Tile '${pieceId}' is missing mandatory physics collider '${req}'. Current colliders: [${existingColliderNames.join(
            ", "
          )}]`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates that standard dimensions adhere to the 6x6m arcade kitbash grid.
   */
  public static validateTileDimensions(dimensions: {
    width: number;
    length: number;
    slabHeight: number;
    turfHeight: number;
    wallHeight: number;
  }): AssetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (Math.abs(dimensions.width - 6.0) > 0.1) {
      errors.push(`Tile total width must be 6.0m, got ${dimensions.width}m`);
    }

    if (Math.abs(dimensions.slabHeight - 0.25) > 0.05) {
      errors.push(`Floor slab foundation height must be 0.25m, got ${dimensions.slabHeight}m`);
    }

    if (Math.abs(dimensions.turfHeight - 0.75) > 0.05) {
      errors.push(`Turf block thickness must be 0.75m, got ${dimensions.turfHeight}m`);
    }

    if (dimensions.wallHeight < 0.3) {
      errors.push(`Wall height must be at least 0.3m above turf, got ${dimensions.wallHeight}m`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

