import { writable } from "svelte/store";

export const blocks = writable([
  { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
]);
export const editor = writable({
  actions: [],
  selected: null,
});
