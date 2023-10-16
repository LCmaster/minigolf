import { writable } from "svelte/store";

export const blocks = writable([
  {
    type: "start",
    variation: 1,
    position: [0, 0, 0],
    rotation: 0,
    locked: true,
  },
]);
export const editor = writable({
  testing: false,
  history: [],
  selected: 0,
});
