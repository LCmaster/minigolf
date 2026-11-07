import { describe, it, expect } from "vitest";
import { AssetDiagnosticValidator } from "./helpers/AssetDiagnosticValidator";

describe("AssetDiagnosticValidator Unit Tests", () => {
  it("validates mandatory colliders for standard straight tile", () => {
    const validColliders = ["UBX_Floor", "UBX_Floor_Slab", "UBX_Wall_L", "UBX_Wall_R"];
    const result = AssetDiagnosticValidator.validateTileColliders("straight_6m", validColliders);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("fails validation with clear error when a required collider is missing", () => {
    const incompleteColliders = ["UBX_Floor", "UBX_Wall_L"];
    const result = AssetDiagnosticValidator.validateTileColliders("straight_6m", incompleteColliders);

    expect(result.valid).toBe(false);
    expect(result.errors.some((err) => err.includes("UBX_Floor_Slab"))).toBe(true);
    expect(result.errors.some((err) => err.includes("UBX_Wall_R"))).toBe(true);
  });

  it("requires UBX_Hole_Indicator and UBX_Wall_B for end cup tiles", () => {
    const endColliders = [
      "UBX_Floor",
      "UBX_Floor_Slab",
      "UBX_Wall_L",
      "UBX_Wall_R",
      "UBX_Wall_B",
      "UBX_Hole_Indicator",
    ];
    const result = AssetDiagnosticValidator.validateTileColliders(
      "Tile_Pack_01_End",
      endColliders,
      true, // isEndTile
      false
    );

    expect(result.valid).toBe(true);

    // Missing hole indicator
    const withoutIndicator = endColliders.filter((c) => c !== "UBX_Hole_Indicator");
    const failResult = AssetDiagnosticValidator.validateTileColliders(
      "Tile_Pack_01_End",
      withoutIndicator,
      true,
      false
    );
    expect(failResult.valid).toBe(false);
    expect(failResult.errors[0]).toContain("UBX_Hole_Indicator");
  });

  it("validates arcade tile dimensions according to the 6x6m kitbash specification", () => {
    const validDims = {
      width: 6.0,
      length: 6.0,
      slabHeight: 0.25,
      turfHeight: 0.75,
      wallHeight: 0.5,
    };
    const result = AssetDiagnosticValidator.validateTileDimensions(validDims);
    expect(result.valid).toBe(true);

    const invalidWidth = { ...validDims, width: 4.8 };
    const failResult = AssetDiagnosticValidator.validateTileDimensions(invalidWidth);
    expect(failResult.valid).toBe(false);
    expect(failResult.errors[0]).toContain("6.0m");
  });
});
