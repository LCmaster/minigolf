import { describe, it, expect } from "vitest";
import {
  getCupVariantOptions,
  getHazardOptions,
  getTrackSnapOptions,
  getTrackSwapOptions,
} from "./KitCatalog";

describe("KitCatalog", () => {
  it("provides theme-specific snap and swap options with turn flags", () => {
    const carnivalSnap = getTrackSnapOptions("carnival_park");
    expect(carnivalSnap.some((o) => o.id === "carnival_green_cup_6x6")).toBe(true);
    expect(carnivalSnap.some((o) => o.id === "carnival_split_lane_6x12")).toBe(true);
    expect(carnivalSnap.some((o) => o.id === "carnival_tunnel_6x6")).toBe(true);

    const classicSnap = getTrackSnapOptions("country_club");
    expect(classicSnap.some((o) => o.id === "green_cup_standard_6x6")).toBe(true);

    const carnivalSwap = getTrackSwapOptions("carnival_park");
    expect(carnivalSwap.some((o) => o.id === "carnival_split_lane_6x12")).toBe(true);
    expect(carnivalSwap.some((o) => o.id === "carnival_tunnel_6x6")).toBe(true);
    const turn60 = carnivalSwap.find((o) => o.id === "carnival_turn_60deg_rounded");
    expect(turn60?.isTurn).toBe(true);
    const straight = carnivalSwap.find((o) => o.id === "carnival_straight_6m");
    expect(straight?.isTurn).toBe(false);

    const classicSwap = getTrackSwapOptions("country_club");
    expect(classicSwap.some((o) => o.id === "turn_banked_90deg_6x6" && o.isTurn)).toBe(true);
  });

  it("provides shared hazard options and theme cup variants", () => {
    const hazards = getHazardOptions();
    expect(hazards.map((h) => h.id)).toEqual([
      "hazard_booster_strip_6x3",
      "hazard_sand_trap_6x6",
      "hazard_water_channel_6x6",
    ]);

    expect(getCupVariantOptions("carnival_park")).toHaveLength(1);
    expect(getCupVariantOptions("country_club")).toHaveLength(2);
  });
});

