import { writable, derived } from "svelte/store";

// Global profile store containing user settings and role
// Available roles: 'super-admin', 'admin', 'moderator', 'editor', 'player'
export const userProfile = writable(undefined);

// Derived permission helpers
export const isSuperAdmin = derived(userProfile, $p => $p?.role === 'super-admin');
export const isAdmin = derived(userProfile, $p => $p?.role === 'super-admin' || $p?.role === 'admin');
export const isModerator = derived(userProfile, $p => $p?.role === 'super-admin' || $p?.role === 'admin' || $p?.role === 'moderator');
export const canEditLevels = derived(userProfile, $p => 
  ['super-admin', 'admin', 'moderator', 'editor'].includes($p?.role)
);
