import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  buildThemeVocabulary,
  getThemePieceId,
  isHeroOrHazardPiece,
} from "./KitVocabulary";

function makePiece(id: string, socketsCount: number = 2, category: string = "track") {
  const sockets =
    socketsCount >= 2
      ? [
          { id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1], type: "track", elevation: 0 },
          { id: "LOC_Socket_Out", position: [0, 0, -3], normal: [0, 0, -1], type: "track", elevation: 0 },
        ]
      : [{ id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1], type: "track", elevation: 0 }];
  return {
    metadata: { id, category, dimensions: [6, 0.6, 6] },
    visualTemplate: new THREE.Group(),
    sockets,
    locators: new Map(),
  };
}

describe("KitVocabulary", () => {
  it("resolves theme-preferred piece ids with fallback to the opposite kit", () => {
    const pieces = new Map<string, any>([
      ["straight_6m", makePiece("straight_6m")],
      ["carnival_tee_6x6", makePiece("carnival_tee_6x6", 1)],
    ]);
    const loader: any = { getPiece: (id: string) => pieces.get(id) };

    expect(getThemePieceId(loader, "carnival_park", "carnival_tee_6x6", "tee_box_6x6")).toBe(
      "carnival_tee_6x6"
    );
    expect(getThemePieceId(loader, "carnival_park", "carnival_straight_6m", "straight_6m")).toBe(
      "straight_6m"
    );
    expect(getThemePieceId(loader, "country_club", "carnival_tee_6x6", "tee_box_6x6")).toBe(
      "carnival_tee_6x6"
    );
    expect(getThemePieceId(loader, "country_club", "missing_a", "missing_b")).toBeNull();
  });

  it("identifies hero and hazard pieces consistently across piece IDs and template categories", () => {
    expect(isHeroOrHazardPiece("hazard_sand_trap_6x6")).toBe(true);
    expect(isHeroOrHazardPiece("carnival_bridge_pond_6x12")).toBe(true);
    expect(isHeroOrHazardPiece("big_top_windmill_6x6")).toBe(true);
    expect(isHeroOrHazardPiece("carnival_straight_6m")).toBe(false);
    expect(
      isHeroOrHazardPiece("custom_gate", { metadata: { category: "obstacles" } } as any)
    ).toBe(true);
    expect(
      isHeroOrHazardPiece("custom_pond", { metadata: { category: "hazards" } } as any)
    ).toBe(true);
  });

  it("builds candidate straight, symmetric left/right turn, and ramp vocabulary for a theme", () => {
    const pieces = new Map<string, any>([
      ["carnival_tee_6x6", makePiece("carnival_tee_6x6", 1)],
      ["carnival_green_cup_6x6", makePiece("carnival_green_cup_6x6", 1)],
      ["carnival_straight_6m", makePiece("carnival_straight_6m", 2)],
      ["carnival_turn_45deg_rounded", makePiece("carnival_turn_45deg_rounded", 2)],
      ["carnival_turn_90deg_rounded", makePiece("carnival_turn_90deg_rounded", 2)],
      ["carnival_ramp_up_15deg_6x6", makePiece("carnival_ramp_up_15deg_6x6", 2)],
      ["carnival_ramp_down_15deg_6x6", makePiece("carnival_ramp_down_15deg_6x6", 2)],
    ]);
    const loader: any = { getPiece: (id: string) => pieces.get(id) };

    const vocab = buildThemeVocabulary("carnival_park", loader);
    expect(vocab.teeId).toBe("carnival_tee_6x6");
    expect(vocab.cupId).toBe("carnival_green_cup_6x6");
    expect(vocab.rampUpPiece).toBeDefined();
    expect(vocab.rampDownPiece).toBeDefined();

    // 1 straight + 2 angles * (R + L) + ramp_up + ramp_down = 7 candidates
    expect(vocab.candidates).toHaveLength(7);
    const leftTurn90 = vocab.candidates.find(
      (c) => c.kitPieceId === "carnival_turn_90deg_rounded" && c.turnSign === -1
    );
    expect(leftTurn90?.entrySocketId).toBe("LOC_Socket_Out");
    expect(leftTurn90?.exitSocketId).toBe("LOC_Socket_In");
  });
});
