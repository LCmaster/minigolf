import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { carnivalParkCourse } from "../../courses/carnivalParkCourse";
import { getFreeformPropCatalog, groupFreeformProps, type KitManifest } from "../types/KitTypes";
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

  it("includes 60deg/75deg snap turns and covers every track piece & prop used in Holes 1-9", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve("static/models/kit/manifest.json"), "utf-8")
    ) as KitManifest;

    const carnivalSnapIds = new Set(getTrackSnapOptions("carnival_park").map((o) => o.id));
    const classicSnapIds = new Set(getTrackSnapOptions("country_club").map((o) => o.id));
    const carnivalSwapIds = new Set(getTrackSwapOptions("carnival_park").map((o) => o.id));
    const hazardIds = new Set(getHazardOptions().map((o) => o.id));
    const cupIds = new Set(getCupVariantOptions("carnival_park").map((o) => o.id));

    expect(carnivalSnapIds.has("carnival_turn_60deg_rounded")).toBe(true);
    expect(carnivalSnapIds.has("carnival_turn_75deg_rounded")).toBe(true);
    expect(classicSnapIds.has("turn_60deg_rounded")).toBe(true);

    const catalogProps = getFreeformPropCatalog(manifest, "carnival_park");
    const catalogPropIds = new Set(catalogProps.map((p) => p.id));

    for (const hole of carnivalParkCourse.holes) {
      for (const tile of hole.tiles) {
        if (tile.kitPieceId === "carnival_tee_6x6" || tile.kitPieceId === "tee_box_6x6") continue;
        expect(
          carnivalSnapIds.has(tile.kitPieceId) || hazardIds.has(tile.kitPieceId),
          `Missing snap/hazard option for ${tile.kitPieceId} in Hole ${hole.holeNumber}`
        ).toBe(true);
        if (!cupIds.has(tile.kitPieceId)) {
          expect(
            carnivalSwapIds.has(tile.kitPieceId) || hazardIds.has(tile.kitPieceId),
            `Missing swap/hazard option for ${tile.kitPieceId} in Hole ${hole.holeNumber}`
          ).toBe(true);
        }
      }

      for (const prop of hole.props) {
        expect(
          catalogPropIds.has(prop.propId),
          `Missing freeform prop ${prop.propId} in Hole ${hole.holeNumber}`
        ).toBe(true);
      }
    }

    const grouped = groupFreeformProps(catalogProps);
    expect(grouped.playable.length).toBeGreaterThan(0);
    expect(grouped.decor.length).toBeGreaterThan(0);
    expect(grouped.terrain.length).toBeGreaterThan(0);
    expect(grouped.playable.some((p) => p.id === "prop_bumper_star_pink")).toBe(true);
    expect(grouped.decor.some((p) => p.id === "prop_carnival_tent_pavilion")).toBe(true);
    expect(grouped.terrain.some((p) => p.category === "terrain" || p.id.startsWith("prop_rock_"))).toBe(true);
  });
});

