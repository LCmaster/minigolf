import { setContext, getContext } from "svelte";
import { writable } from "svelte/store";

export const setEditor = () => {
  return setContext("minigolfmania/editor/context", {
    testing: writable(false),
    blocks: writable([
      {
        id: crypto.randomUUID(),
        type: "start",
        variation: 1,
        position: [0, 0, 0],
        rotation: 0,
        locked: true,
      },
    ]),
    blockSelected: writable(null),
    slotSelected: writable(null),
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
