import { writable } from "svelte/store";

export function startGame(type) {
  const stages = [
    { name: "Stage 1", file: "/Stage_001.glb" },
    { name: "Stage 2", file: "/Stage_002.glb" },
  ];

  let current = 0;
  let status = "playing";

  return writable({
    stages,
    current,
    status,
  });
}
