import { setContext, getContext } from "svelte";
import { writable } from "svelte/store";

export const setGame = (stages) => {
  const game = {
    stages: stages,
    shots: writable(stages.map((s) => 0)),
    current: writable(0),
  };
  return setContext("minigolfmania/game/context", game);
};

export const useGame = () => {
  return getContext("minigolfmania/game/context");
};
