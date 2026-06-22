import { setContext, getContext } from "svelte";
import { writable } from "svelte/store";
import { createHistoryStore } from "./historyStore";
import { snapToGrid } from "$lib/gridUtils";

export const activeEditor = {
  controlPoints: null,
  stage: null,
  blocks: null,
};

export const setEditor = () => {
  const startId = crypto.randomUUID();
  const secondId = crypto.randomUUID();

  const ctx = {
    testing: writable(false),
    previewing: writable(false),
    controlPoints: createHistoryStore([
      {
        id: startId,
        position: [snapToGrid(0), 0, snapToGrid(0)],
      },
      {
        id: secondId,
        position: [snapToGrid(0), 0, snapToGrid(-10)],
      },
    ]),
    pointSelected: writable(secondId),
    blocks: createHistoryStore([]),
    blockSelected: writable(null),
    transformMode: writable("translate"),
    pointColors: writable({
      normal: "#3b82f6",        // blue-500
      hover: "#22d3ee",         // cyan-400
      selected: "#ef4444",      // red-500
      selectedHover: "#f97316", // orange-500
    }),
    stage: writable({
      name: "",
      par: 0,
      theme: "clear",
      strokeLimit: 8,
      groundFriction: 0.75,
      groundRestitution: 0.75,
      wallFriction: 0.75,
      wallRestitution: 0.95,
      tileColor: "#567D46",
    }),
  };

  activeEditor.controlPoints = ctx.controlPoints;
  activeEditor.stage = ctx.stage;
  activeEditor.blocks = ctx.blocks;

  return setContext("minigolfmania/editor/context", ctx);
};

export const useEditor = () => {
  return getContext("minigolfmania/editor/context");
};
