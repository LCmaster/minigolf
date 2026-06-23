import { writable } from "svelte/store";

// Global profile store containing user settings and role
export const userProfile = writable(undefined);
