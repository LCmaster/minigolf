/**
 * CourseStorage.ts
 * Local persistence for custom courses created in the Smart Track Editor.
 */

import type { CourseData } from "../types/CourseSchema";

const STORAGE_KEY = "minigolf_custom_courses_v1";

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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getCustomCourseById(id: string): CourseData | undefined {
  return loadCustomCourses().find((c) => c.id === id);
}
