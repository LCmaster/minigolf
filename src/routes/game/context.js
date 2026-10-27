import { getContext, hasContext, setContext } from "svelte";
import { createGameStores } from "$lib/stores/game";

const GAME_CONTEXT_KEY = "minigolfmania/game/context";

/**
 * Returns the route-scoped game stores (course, current hole, shots).
 * Creates the context with fresh stores on first call; subsequent calls
 * within the same component tree return the existing instance.
 *
 * @returns {{ course, current, shots }} Svelte writable stores
 */
export function useGame() {
  return hasContext(GAME_CONTEXT_KEY)
    ? getContext(GAME_CONTEXT_KEY)
    : setContext(GAME_CONTEXT_KEY, createGameStores());
}
