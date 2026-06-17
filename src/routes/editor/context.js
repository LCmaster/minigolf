import { setContext, getContext } from "svelte";
import { writable } from "svelte/store";
import { createHistoryStore } from "./historyStore";

export const setEditor = () => {
  const startId = crypto.randomUUID();
  const secondId = crypto.randomUUID();

  return setContext("minigolfmania/editor/context", {
    testing: writable(false),
    controlPoints: createHistoryStore([
      {
        id: startId,
        position: [0, 0, 0],
      },
      {
        id: secondId,
        position: [0, 0, -10],
      },
    ]),
    pointSelected: writable(secondId),
    pointColors: writable({
      normal: "#3b82f6",        // blue-500
      hover: "#22d3ee",         // cyan-400
      selected: "#ef4444",      // red-500
      selectedHover: "#f97316", // orange-500
    }),
    stage: writable({
      name: "",
      par: 0,
      skybox: "default",
      strokeLimit: 8,
      groundFriction: 0.75,
      groundRestitution: 0.75,
      wallFriction: 0.75,
      wallRestitution: 0.95,
    }),
  });
};

export const useEditor = () => {
  return getContext("minigolfmania/editor/context");
};
