/**
 * CourseHubHelpers.ts
 * Pure helper functions for /courses, /editor deep-link resolution, and /play hole startup.
 */

import type { CourseData, HoleData } from "$lib/engine/types/CourseSchema";

export type HubTab = "official" | "mine";

/** Resolves the Courses Hub tab from `?tab=mine|official`, defaulting to `official`. */
export function resolveInitialHubTab(params: URLSearchParams): HubTab {
  return params.get("tab") === "mine" ? "mine" : "official";
}

export interface EditorLoadTarget {
  hole: HoleData;
  theme: CourseData["theme"];
  sourceCourseId: string;
  holeIndex: number;
  isBuiltIn: boolean;
  courseName: string;
}

/**
 * Resolves `?courseId=...&hole=N` query params into an editable HoleData snapshot.
 * `hole` query parameter is 1-indexed (`hole=1` -> index `0`).
 */
export function resolveEditorLoadTarget(
  params: URLSearchParams,
  customCourses: CourseData[],
  officialCourses: CourseData[]
): EditorLoadTarget | null {
  const courseId = params.get("courseId");
  if (!courseId) return null;

  const builtInMatch = officialCourses.find((c) => c.id === courseId);
  const customMatch = !builtInMatch ? customCourses.find((c) => c.id === courseId) : undefined;
  const course = builtInMatch || customMatch;
  if (!course || !course.holes?.length) return null;

  const rawHoleNum = Number.parseInt(params.get("hole") || "1", 10);
  const clampedIndex = Number.isFinite(rawHoleNum)
    ? Math.max(0, Math.min(rawHoleNum - 1, course.holes.length - 1))
    : 0;

  return {
    hole: JSON.parse(JSON.stringify(course.holes[clampedIndex])) as HoleData,
    theme: course.theme,
    sourceCourseId: course.id,
    holeIndex: clampedIndex,
    isBuiltIn: Boolean(builtInMatch),
    courseName: course.name,
  };
}

/**
 * Resolves `?hole=N` query param (1-indexed) into a safe 0-indexed hole index for /play.
 */
export function resolvePlayStartHoleIndex(
  params: URLSearchParams,
  course: Pick<CourseData, "holes">
): number {
  if (!course?.holes?.length) return 0;
  const rawHoleNum = Number.parseInt(params.get("hole") || "1", 10);
  if (!Number.isFinite(rawHoleNum)) return 0;
  return Math.max(0, Math.min(rawHoleNum - 1, course.holes.length - 1));
}

/**
 * Swaps an item in the Tour Bundler list up (`delta = -1`) or down (`delta = +1`).
 */
export function moveBundlerHole<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const targetIndex = index + delta;
  if (index < 0 || index >= items.length || targetIndex < 0 || targetIndex >= items.length) {
    return [...items];
  }
  const copy = [...items];
  const [moved] = copy.splice(index, 1);
  copy.splice(targetIndex, 0, moved);
  return copy;
}
