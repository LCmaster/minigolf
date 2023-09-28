import { getContext } from "svelte";

export const useGame = () => {
  return getContext("minigolf/game/context");
};
