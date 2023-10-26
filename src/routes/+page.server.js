import { course as practiceCourse } from "$lib/courses/practice";

export function load() {
  const courses = [practiceCourse];
  return {
    courses,
  };
}
