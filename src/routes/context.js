import { getContext, setContext } from "svelte";
import { writable } from "svelte/store";

const id = "minigolfmania/game/context";

export function setGame(course) {
  return setContext(
    id,
    writable({
      current: writable(0),
      strokes: writable(course.holes.map((_) => 0)),
      course,
    })
  );
}
export function useGame() {
  return getContext(id);
}
