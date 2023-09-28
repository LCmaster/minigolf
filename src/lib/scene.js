import { writable } from "svelte/store";

export const camera = writable(null);
export const controls = writable(null);
export const spawn = writable([0, 0, 0]);
export const playerPosition = writable([0, 0, 0]);
