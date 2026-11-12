import { describe, it, expect, beforeEach, vi } from "vitest";
import type { CourseData, HoleData } from "../types/CourseSchema";
import {
  bundleCoursesIntoTour,
  computeTotalPar,
  deleteCustomCourse,
  getCustomCourseById,
  loadCustomCourses,
  renameCustomCourse,
  saveCustomCourse,
  saveHoleToCourse,
  updateCourseVisibility,
  updateHolePermissions,
} from "./CourseStorage";

function makeSampleHole(num: number, name = `Hole ${num}`, par = 3): HoleData {
  return {
    holeNumber: num,
    name,
    par,
    teeTileId: `tee_${num}`,
    cupTileId: `cup_${num}`,
    tiles: [
      {
        instanceId: `tee_${num}`,
        kitPieceId: "carnival_tee_6x6",
        position: [0, 0, 0],
        rotationY: 0,
        walls: { left: true, right: true },
      },
      {
        instanceId: `cup_${num}`,
        kitPieceId: "carnival_green_cup_6x6",
        position: [0, 0, -6],
        rotationY: 0,
        walls: { left: true, right: true },
      },
    ],
    props: [],
  };
}

describe("CourseStorage CRUD, Smart Save, Visibility & Tour Bundler", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const localStorageMock = {
      getItem: vi.fn((k: string) => store.get(k) ?? null),
      setItem: vi.fn((k: string, v: string) => {
        store.set(k, v);
      }),
      removeItem: vi.fn((k: string) => {
        store.delete(k);
      }),
      clear: vi.fn(() => store.clear()),
    };
    vi.stubGlobal("window", { localStorage: localStorageMock });
    vi.stubGlobal("localStorage", localStorageMock);
  });

  it("supports save, rename, visibility toggle, hole permissions, and delete", () => {
    const tour: CourseData = {
      id: "course_custom_1",
      name: "My Test Hole",
      theme: "carnival_park",
      authorId: "local",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      visibility: "private",
      holes: [makeSampleHole(1, "Midway Warmup", 2)],
    };

    saveCustomCourse(tour);
    expect(loadCustomCourses()).toHaveLength(1);

    expect(renameCustomCourse("course_custom_1", "Renamed Arcade Hole")).toBe(true);
    expect(getCustomCourseById("course_custom_1")?.name).toBe("Renamed Arcade Hole");

    expect(updateCourseVisibility("course_custom_1", "public")).toBe(true);
    expect(getCustomCourseById("course_custom_1")?.visibility).toBe("public");

    expect(
      updateHolePermissions("course_custom_1", 0, { visibility: "public", allowRemix: false })
    ).toBe(true);
    const updatedHole = getCustomCourseById("course_custom_1")?.holes[0];
    expect(updatedHole?.visibility).toBe("public");
    expect(updatedHole?.allowRemix).toBe(false);

    expect(deleteCustomCourse("course_custom_1")).toBe(true);
    expect(loadCustomCourses()).toHaveLength(0);
    expect(deleteCustomCourse("missing")).toBe(false);
  });

  it("implements Smart Save: remixes built-in holes as copies and updates custom holes in-place", () => {
    // 1. Editing an official built-in course hole always creates a new custom remix copy
    const editedOfficial = makeSampleHole(2, "Big Top Remix", 4);
    const remixResult = saveHoleToCourse({
      sourceCourseId: "course_carnival_park_showcase",
      sourceHoleIndex: 1,
      holeData: editedOfficial,
      theme: "carnival_park",
      courseName: "Big Top Remix",
    });

    expect(remixResult.savedAsCopy).toBe(true);
    expect(remixResult.holeIndex).toBe(0);
    expect(remixResult.course.id).not.toBe("course_carnival_park_showcase");
    expect(remixResult.course.visibility).toBe("private");
    expect(remixResult.course.holes[0].allowRemix).toBe(true);
    expect(loadCustomCourses()).toHaveLength(1);

    // 2. Editing that custom course hole updates it in-place without duplicating
    const tweakedHole = { ...remixResult.course.holes[0], name: "Big Top Remix v2", par: 5 };
    const inPlaceResult = saveHoleToCourse({
      sourceCourseId: remixResult.course.id,
      sourceHoleIndex: 0,
      holeData: tweakedHole,
      theme: "carnival_park",
      courseName: "Big Top Remix v2",
    });

    expect(inPlaceResult.savedAsCopy).toBe(false);
    expect(inPlaceResult.course.id).toBe(remixResult.course.id);
    expect(inPlaceResult.course.holes[0].par).toBe(5);
    expect(loadCustomCourses()).toHaveLength(1);

    // 3. Explicit saveAsNew creates a separate custom course copy
    const duplicateResult = saveHoleToCourse({
      sourceCourseId: remixResult.course.id,
      sourceHoleIndex: 0,
      holeData: tweakedHole,
      theme: "carnival_park",
      courseName: "Big Top Remix Copy",
      saveAsNew: true,
    });
    expect(duplicateResult.savedAsCopy).toBe(true);
    expect(duplicateResult.course.id).not.toBe(remixResult.course.id);
    expect(loadCustomCourses()).toHaveLength(2);
  });

  it("bundles selected holes into a numbered multi-hole Tour and sums Par", () => {
    const h1 = makeSampleHole(7, "Star Bumper Ring", 3);
    const h2 = makeSampleHole(9, "Grand Finale", 4);
    const h3 = makeSampleHole(1, "Warmup", 2);

    const bundled = bundleCoursesIntoTour({
      name: "Weekend Carnival Trio",
      theme: "carnival_park",
      holes: [h1, h2, h3],
      visibility: "public",
    });

    expect(bundled.name).toBe("Weekend Carnival Trio");
    expect(bundled.visibility).toBe("public");
    expect(bundled.holes.map((h) => h.holeNumber)).toEqual([1, 2, 3]);
    expect(bundled.holes.map((h) => h.name)).toEqual([
      "Star Bumper Ring",
      "Grand Finale",
      "Warmup",
    ]);
    expect(computeTotalPar(bundled.holes)).toBe(9);
    expect(getCustomCourseById(bundled.id)?.holes).toHaveLength(3);

    // Mutating original input hole does not mutate saved tour hole
    h1.name = "Mutated";
    expect(getCustomCourseById(bundled.id)?.holes[0].name).toBe("Star Bumper Ring");
  });
});
