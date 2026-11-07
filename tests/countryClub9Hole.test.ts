import { describe, it, expect } from "vitest";
import { countryClub9Hole } from "../src/lib/courses/countryClub9Hole";

describe("countryClub9Hole Championship Course Integrity", () => {
  it("has valid top-level metadata and theme", () => {
    expect(countryClub9Hole.id).toBe("course_country_club_championship");
    expect(countryClub9Hole.name).toBe("Classic Country Club Championship");
    expect(countryClub9Hole.theme).toBe("country_club");
    expect(countryClub9Hole.holes.length).toBe(9);
  });

  it("numbers all 9 holes sequentially from 1 to 9 with valid Pars", () => {
    countryClub9Hole.holes.forEach((hole, index) => {
      expect(hole.holeNumber).toBe(index + 1);
      expect(hole.par).toBeGreaterThanOrEqual(2);
      expect(hole.par).toBeLessThanOrEqual(5);
    });
  });

  it("contains valid teeTileId and cupTileId present in the tiles array for each hole", () => {
    countryClub9Hole.holes.forEach((hole) => {
      const tileIds = new Set(hole.tiles.map((t) => t.instanceId));

      expect(tileIds.has(hole.teeTileId)).toBe(true);
      expect(tileIds.has(hole.cupTileId)).toBe(true);

      const teeTile = hole.tiles.find((t) => t.instanceId === hole.teeTileId);
      const cupTile = hole.tiles.find((t) => t.instanceId === hole.cupTileId);

      expect(teeTile?.kitPieceId).toContain("tee_box");
      expect(cupTile?.kitPieceId).toContain("cup");
    });
  });

  it("ensures no duplicate tile instance IDs within any hole", () => {
    countryClub9Hole.holes.forEach((hole) => {
      const ids = hole.tiles.map((t) => t.instanceId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  it("verifies all attachedTo parent references point to existing tiles in the hole", () => {
    countryClub9Hole.holes.forEach((hole) => {
      const tileIds = new Set(hole.tiles.map((t) => t.instanceId));

      hole.tiles.forEach((tile) => {
        if (tile.attachedTo) {
          expect(tileIds.has(tile.attachedTo.parentInstanceId)).toBe(true);
          expect(tile.attachedTo.parentSocketId).toBeDefined();
        }
      });
    });
  });

  it("verifies all connectedSockets references point to existing tiles in the hole", () => {
    countryClub9Hole.holes.forEach((hole) => {
      const tileIds = new Set(hole.tiles.map((t) => t.instanceId));

      hole.tiles.forEach((tile) => {
        if (tile.connectedSockets) {
          Object.values(tile.connectedSockets).forEach((targetId) => {
            expect(tileIds.has(targetId)).toBe(true);
          });
        }
      });
    });
  });

  it("calculates total course par and par balance", () => {
    const totalPar = countryClub9Hole.holes.reduce((sum, h) => sum + h.par, 0);
    // 9-hole minigolf par usually ranges from 24 to 32
    expect(totalPar).toBeGreaterThanOrEqual(24);
    expect(totalPar).toBeLessThanOrEqual(36);
  });
});

