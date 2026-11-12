import { describe, it, expect } from "vitest";
import { carnivalParkCourse } from "$lib/courses/carnivalParkCourse";
import type { CourseData } from "$lib/engine/types/CourseSchema";
import CoursesHub from "./CoursesHub.svelte";
import {
  moveBundlerHole,
  resolveEditorLoadTarget,
  resolvePlayStartHoleIndex,
} from "./CourseHubHelpers";

describe("CoursesHub & CourseHubHelpers", () => {
  it("resolves deep-link query params for /editor and /play", () => {
    const custom: CourseData[] = [
      {
        id: "course_custom_42",
        name: "My Remix Track",
        theme: "carnival_park",
        authorId: "local_user",
        createdAt: 100,
        updatedAt: 200,
        visibility: "public",
        holes: [
          {
            ...carnivalParkCourse.holes[0],
            holeNumber: 1,
            name: "Remix Hole 1",
          },
          {
            ...carnivalParkCourse.holes[2],
            holeNumber: 2,
            name: "Remix Hole 2",
          },
        ],
      },
    ];

    // Official course hole 5 (1-indexed -> index 4)
    const officialTarget = resolveEditorLoadTarget(
      new URLSearchParams("courseId=course_carnival_park_showcase&hole=5"),
      custom,
      [carnivalParkCourse]
    );
    expect(officialTarget?.isBuiltIn).toBe(true);
    expect(officialTarget?.holeIndex).toBe(4);
    expect(officialTarget?.hole.holeNumber).toBe(5);

    // Custom course hole 2 (1-indexed -> index 1)
    const customTarget = resolveEditorLoadTarget(
      new URLSearchParams("courseId=course_custom_42&hole=2"),
      custom,
      [carnivalParkCourse]
    );
    expect(customTarget?.isBuiltIn).toBe(false);
    expect(customTarget?.holeIndex).toBe(1);
    expect(customTarget?.courseName).toBe("My Remix Track");

    // Play start hole index clamps safely
    expect(
      resolvePlayStartHoleIndex(new URLSearchParams("hole=9"), carnivalParkCourse)
    ).toBe(8);
    expect(
      resolvePlayStartHoleIndex(new URLSearchParams("hole=99"), carnivalParkCourse)
    ).toBe(8);
    expect(
      resolvePlayStartHoleIndex(new URLSearchParams(""), carnivalParkCourse)
    ).toBe(0);
  });

  it("reorders Tour Bundler holes cleanly", () => {
    const items = ["A", "B", "C"];
    expect(moveBundlerHole(items, 1, -1)).toEqual(["B", "A", "C"]);
    expect(moveBundlerHole(items, 1, 1)).toEqual(["A", "C", "B"]);
    expect(moveBundlerHole(items, 0, -1)).toEqual(["A", "B", "C"]);
  });

  it("renders CoursesHub with Official Tours and My Holes & Tours tabs (no Import/Export JSON or Community tab)", () => {
    const res = (CoursesHub as any).render({
      initialTab: "official",
      initialCustomCourses: [
        {
          id: "course_custom_99",
          name: "Backyard Midway",
          theme: "carnival_park",
          authorId: "local_user",
          createdAt: 100,
          updatedAt: 100,
          visibility: "public",
          holes: [
            {
              ...carnivalParkCourse.holes[0],
              holeNumber: 1,
              name: "Backyard Opener",
              visibility: "public",
              allowRemix: true,
            },
          ],
        },
      ],
    });

    expect(res.html).toContain("Official Tours");
    expect(res.html).toContain("My Holes &amp; Tours");
    expect(res.html).toContain("Play 9-Hole Tour");
    expect(res.html).toContain("Edit Remix");
    expect(res.html).toContain("/editor?courseId=course_carnival_park_showcase&amp;hole=1");
    expect(res.html).toContain("/play?course=course_carnival_park_showcase&amp;hole=1");
    expect(res.html).not.toContain("Export JSON");
    expect(res.html).not.toContain("Import JSON");

    // My Holes & Tours tab renders custom course & visibility/remix controls
    const myRes = (CoursesHub as any).render({
      initialTab: "mine",
      initialCustomCourses: [
        {
          id: "course_custom_99",
          name: "Backyard Midway",
          theme: "carnival_park",
          authorId: "local_user",
          createdAt: 100,
          updatedAt: 100,
          visibility: "public",
          holes: [
            {
              ...carnivalParkCourse.holes[0],
              holeNumber: 1,
              name: "Backyard Opener",
              visibility: "public",
              allowRemix: true,
            },
          ],
        },
      ],
    });
    expect(myRes.html).toContain("Backyard Midway");
    expect(myRes.html).toContain("Public");
    expect(myRes.html).toContain("Remixable");
    expect(myRes.html).toContain("Tour Bundler");
  });
});
