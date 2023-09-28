import { getContext } from "svelte";

export const useStage = () => {
  return getContext("minigolf/game/stage/context");
};
