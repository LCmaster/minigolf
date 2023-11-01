import { getContext, hasContext, setContext } from "svelte";
import { writable } from "svelte/store";

const id = "minigolfmania/game/context";

export function useGame() {
  return hasContext(id)
    ? getContext(id)
    : setContext(id, {
        course: writable(null),
        current: writable(null),
        shots: writable(null),
      });
}
