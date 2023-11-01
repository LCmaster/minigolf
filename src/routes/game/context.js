import { getContext, hasContext, setContext } from "svelte";
import { get, writable } from "svelte/store";

const id = "minigolfmania/game/context";

class GameContext {
  constructor() {
    this.course = null;
    this.current = writable(null);
    this.shots = writable(null);
  }

  start(course) {
    this.course = course;
    this.current.set(0);
    this.shots.set(course.holes.map((_) => 0));
  }

  quit() {
    this.course = null;
    this.current.set(null);
    this.shots.set(null);
  }

  hit() {
    const currentStage = get(this.current);
    this.shots.update((value) =>
      value.map((s, i) => (i === currentStage ? s++ : s))
    );
  }

  next() {
    this.current.update((value) => value + 1);
  }
}

export function useGame() {
  return hasContext(id)
    ? getContext(id)
    : setContext(id, {
        course: writable(null),
        current: writable(null),
        shots: writable(null),
      });
}
