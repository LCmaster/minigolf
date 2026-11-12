/**
 * CourseStorage.ts
 * Local persistence for custom courses created in the Smart Track Editor.
 */

import type { CourseData, CourseVisibility, HoleData } from "../types/CourseSchema";

const STORAGE_KEY = "minigolf_custom_courses_v1";

function persistAll(courses: CourseData[]): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

function cloneHole(hole: HoleData): HoleData {
  return JSON.parse(JSON.stringify(hole)) as HoleData;
}

export function loadCustomCourses(): CourseData[] {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomCourse(course: CourseData): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  const existing = loadCustomCourses();
  const idx = existing.findIndex((c) => c.id === course.id);
  if (idx >= 0) {
    existing[idx] = course;
  } else {
    existing.unshift(course);
  }
  persistAll(existing);
}

export function getCustomCourseById(id: string): CourseData | undefined {
  return loadCustomCourses().find((c) => c.id === id);
}

/** Deletes a saved custom course or hole entry by ID. Returns true if removed. */
export function deleteCustomCourse(courseId: string): boolean {
  const existing = loadCustomCourses();
  const next = existing.filter((c) => c.id !== courseId);
  if (next.length === existing.length) return false;
  persistAll(next);
  return true;
}

/** Renames a custom course/tour and updates its `updatedAt` timestamp. */
export function renameCustomCourse(courseId: string, name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const existing = loadCustomCourses();
  const target = existing.find((c) => c.id === courseId);
  if (!target) return false;
  target.name = trimmed;
  if (target.holes.length === 1) {
    target.holes[0] = { ...target.holes[0], name: trimmed };
  }
  target.updatedAt = Date.now();
  persistAll(existing);
  return true;
}

/** Toggles whether a custom Tour/Course is private or public for future community play. */
export function updateCourseVisibility(
  courseId: string,
  visibility: CourseVisibility
): boolean {
  const existing = loadCustomCourses();
  const target = existing.find((c) => c.id === courseId);
  if (!target) return false;
  target.visibility = visibility;
  target.updatedAt = Date.now();
  persistAll(existing);
  return true;
}

/** Updates per-hole public visibility and/or remix permission inside a custom course. */
export function updateHolePermissions(
  courseId: string,
  holeIndex: number,
  permissions: { visibility?: CourseVisibility; allowRemix?: boolean }
): boolean {
  const existing = loadCustomCourses();
  const target = existing.find((c) => c.id === courseId);
  if (!target || holeIndex < 0 || holeIndex >= target.holes.length) return false;
  target.holes[holeIndex] = {
    ...target.holes[holeIndex],
    ...(permissions.visibility !== undefined ? { visibility: permissions.visibility } : {}),
    ...(permissions.allowRemix !== undefined ? { allowRemix: permissions.allowRemix } : {}),
  };
  target.updatedAt = Date.now();
  persistAll(existing);
  return true;
}

export interface SaveHoleOptions {
  sourceCourseId?: string | null;
  sourceHoleIndex?: number;
  holeData: HoleData;
  theme: CourseData["theme"];
  courseName?: string;
  saveAsNew?: boolean;
  visibility?: CourseVisibility;
  allowRemix?: boolean;
}

/**
 * Smart Save: updates a custom hole in-place when editing an existing local custom course
 * (unless `saveAsNew` is true), or creates a new custom Remix copy when editing built-in holes.
 */
export function saveHoleToCourse(opts: SaveHoleOptions): {
  course: CourseData;
  holeIndex: number;
  savedAsCopy: boolean;
} {
  const existing = opts.sourceCourseId ? getCustomCourseById(opts.sourceCourseId) : undefined;
  const now = Date.now();
  const holeCopy = cloneHole(opts.holeData);

  if (existing && !opts.saveAsNew) {
    const idx = Math.max(0, Math.min(opts.sourceHoleIndex ?? 0, existing.holes.length - 1));
    const prevHole = existing.holes[idx];
    const updatedHole: HoleData = {
      ...holeCopy,
      holeNumber: idx + 1,
      name: opts.courseName?.trim() || holeCopy.name || prevHole?.name || `Hole ${idx + 1}`,
      visibility: opts.visibility ?? prevHole?.visibility ?? "private",
      allowRemix: opts.allowRemix ?? prevHole?.allowRemix ?? true,
    };
    const nextHoles = existing.holes.map((h, i) => (i === idx ? updatedHole : h));
    const updatedCourse: CourseData = {
      ...existing,
      theme: opts.theme,
      name: existing.holes.length === 1 ? updatedHole.name || existing.name : existing.name,
      visibility: opts.visibility ?? existing.visibility ?? "private",
      updatedAt: now,
      holes: nextHoles,
    };
    saveCustomCourse(updatedCourse);
    return { course: updatedCourse, holeIndex: idx, savedAsCopy: false };
  }

  const label = opts.courseName?.trim() || holeCopy.name?.trim() || `Custom Hole`;
  const newCourse: CourseData = {
    id: `course_custom_${now}_${Math.floor(Math.random() * 1000)}`,
    name: label,
    theme: opts.theme,
    authorId: "local_user",
    createdAt: now,
    updatedAt: now,
    visibility: opts.visibility ?? "private",
    holes: [
      {
        ...holeCopy,
        holeNumber: 1,
        name: label,
        visibility: opts.visibility ?? holeCopy.visibility ?? "private",
        allowRemix: opts.allowRemix ?? holeCopy.allowRemix ?? true,
      },
    ],
  };
  saveCustomCourse(newCourse);
  return { course: newCourse, holeIndex: 0, savedAsCopy: true };
}

export interface BundleTourOptions {
  name: string;
  theme: CourseData["theme"];
  holes: HoleData[];
  visibility?: CourseVisibility;
  existingTourId?: string;
}

/**
 * Bundles chosen holes (from Official Tours or Custom Holes) into a numbered
 * multi-hole Custom Tour persisted in localStorage.
 */
export function bundleCoursesIntoTour(opts: BundleTourOptions): CourseData {
  if (!opts.holes || opts.holes.length === 0) {
    throw new Error("Cannot bundle an empty Tour without at least one hole.");
  }
  const now = Date.now();
  const existing = opts.existingTourId ? getCustomCourseById(opts.existingTourId) : undefined;
  const tourName = opts.name.trim() || "Custom Tour";
  const numberedHoles: HoleData[] = opts.holes.map((h, idx) => {
    const copy = cloneHole(h);
    return {
      ...copy,
      holeNumber: idx + 1,
      visibility: copy.visibility ?? "private",
      allowRemix: copy.allowRemix ?? true,
    };
  });

  const tour: CourseData = {
    id: existing?.id ?? `tour_custom_${now}_${Math.floor(Math.random() * 1000)}`,
    name: tourName,
    theme: opts.theme,
    authorId: existing?.authorId ?? "local_user",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    visibility: opts.visibility ?? existing?.visibility ?? "private",
    holes: numberedHoles,
  };
  saveCustomCourse(tour);
  return tour;
}

/** Computes total par across all holes in a tour. */
export function computeTotalPar(holes: Pick<HoleData, "par">[]): number {
  return holes.reduce((acc, h) => acc + (Number.isFinite(h.par) ? h.par : 3), 0);
}

/** Formats a relative-to-par score cleanly as `"0"`, `"+N"`, or `"-N"`. */
export function formatRelativeScore(relative: number): string {
  if (!Number.isFinite(relative) || relative === 0) return "0";
  return relative > 0 ? `+${relative}` : `${relative}`;
}

