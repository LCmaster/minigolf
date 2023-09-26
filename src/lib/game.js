import { writable } from "svelte/store";

export const hits = writable(0);
export const stage = writable("/Stage_001.glb");
export const completed = writable(false);
