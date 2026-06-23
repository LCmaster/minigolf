import { setContext, getContext } from "svelte";
import { writable, derived } from "svelte/store";
import { createHistoryStore } from "./historyStore";
import { snapToGrid } from "$lib/gridUtils";

export const activeEditor = {
  history: null,
  controlPoints: null,
  stage: null,
  blocks: null,
};

export const setEditor = () => {
  const startId = crypto.randomUUID();
  const secondId = crypto.randomUUID();

  const history = createHistoryStore({
    controlPoints: [
      {
        id: startId,
        position: [snapToGrid(0), 0, snapToGrid(0)],
      },
      {
        id: secondId,
        position: [snapToGrid(0), 0, snapToGrid(-10)],
      },
    ],
    blocks: [],
  });

  const controlPoints = {
    subscribe: derived(history, ($h) => $h.controlPoints).subscribe,
    set: (val) => history.update((h) => ({ ...h, controlPoints: val })),
    update: (fn) => history.update((h) => ({ ...h, controlPoints: fn(h.controlPoints) })),
    commit: history.commit,
    undo: history.undo,
    redo: history.redo,
  };

  const blocks = {
    subscribe: derived(history, ($h) => $h.blocks).subscribe,
    set: (val) => history.update((h) => ({ ...h, blocks: val })),
    update: (fn) => history.update((h) => ({ ...h, blocks: fn(h.blocks) })),
    commit: history.commit,
    undo: history.undo,
    redo: history.redo,
  };

  const ctx = {
    testing: writable(false),
    previewing: writable(false),
    history,
    controlPoints,
    pointSelected: writable(secondId),
    blocks,
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

  activeEditor.history = ctx.history;
  activeEditor.controlPoints = ctx.controlPoints;
  activeEditor.stage = ctx.stage;
  activeEditor.blocks = ctx.blocks;

  return setContext("minigolfmania/editor/context", ctx);
};

export const useEditor = () => {
  return getContext("minigolfmania/editor/context");
};
