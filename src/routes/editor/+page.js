// The editor uses Threlte/Three.js which requires browser APIs.
// Disable SSR to prevent hydration mismatches and ensure event
// handlers are properly attached on the client.
export const ssr = false;
