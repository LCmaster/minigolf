import { describe, it, expect } from "vitest";
import { carnivalParkCourse } from "$lib/courses/carnivalParkCourse";
import { computeTotalPar } from "$lib/engine/course/CourseStorage";
import PlayHud from "./PlayHud.svelte";
import PlayResultModals from "./PlayResultModals.svelte";

describe("Play HUD & Scorecard Cartoon Components", () => {
  it("renders PlayHud with wooden scoreboard, course dropdown, par/strokes, and circular utility buttons", () => {
    const res = (PlayHud as any).render({
      availableCourses: [carnivalParkCourse],
      activeCourse: carnivalParkCourse,
      selectedCourseId: carnivalParkCourse.id,
      currentHole: carnivalParkCourse.holes[1],
      strokes: 2,
      totalScore: -1,
      isMuted: false,
    });

    expect(res.html).toContain(carnivalParkCourse.name);
    expect(res.html).toContain("HOLE 2 / 9");
    expect(res.html).toContain("Big Top Windmill");
    expect(res.html).toContain("PAR");
    expect(res.html).toContain("STROKES");
    expect(res.html).toContain("-1");
    expect(res.html).toContain('aria-label="Toggle Overview"');
    expect(res.html).toContain('aria-label="Toggle Audio"');
    expect(res.html).toContain('aria-label="Respawn Ball"');
    expect(res.html).toContain('href="/"');
  });

  it("renders PlayResultModals for Hole Sink with callout badge and Next Hole action", () => {
    const res = (PlayResultModals as any).render({
      isCupSunk: true,
      isCourseFinished: false,
      currentHole: carnivalParkCourse.holes[0],
      activeCourse: carnivalParkCourse,
      strokes: 2,
      totalScore: -1,
      scoreCard: [{ hole: 1, par: 3, strokes: 2, relative: -1 }],
    });

    expect(res.html).toContain("HOLE 1 SINK!");
    expect(res.html).toContain("BIRDIE!");
    expect(res.html).toContain("NEXT HOLE");
  });

  it("renders PlayResultModals Championship Scorecard with dynamic Total Par instead of hardcoded 30", () => {
    const expectedPar = computeTotalPar(carnivalParkCourse.holes);
    const scoreCard = carnivalParkCourse.holes.map((h) => ({
      hole: h.holeNumber,
      par: h.par,
      strokes: h.par,
      relative: 0,
    }));

    const res = (PlayResultModals as any).render({
      isCupSunk: true,
      isCourseFinished: true,
      currentHole: carnivalParkCourse.holes[8],
      activeCourse: carnivalParkCourse,
      strokes: 5,
      totalScore: 0,
      scoreCard,
    });

    expect(res.html).toContain("COURSE COMPLETE!");
    expect(res.html).toContain(`>${expectedPar}<`);
    expect(res.html).toContain("PLAY AGAIN");
    expect(res.html).toContain("HOME MENU");
  });
});
