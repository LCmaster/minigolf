import { setContext, getContext } from "svelte";
import { writable, derived, get } from "svelte/store";
import { createHistoryStore } from "./historyStore";
import { snapToGrid } from "$lib/gridUtils";
import { evaluateHeightmapAt } from "$lib/heightmapGeometry";

const SESSION_STORAGE_KEY = "minigolfmania_editor_session_v1";

export const activeEditor = {
  history: null,
  controlPoints: null,
  stage: null,
  blocks: null,
  placementBlock: null,
  previewPosition: null,
  previewRotation: null,
  debugPhysics: null,
};

export const setEditor = () => {
  const startId = crypto.randomUUID();
  const secondId = crypto.randomUUID();

  let initialHistory = {
    controlPoints: [
      {
        id: startId,
        position: [snapToGrid(0), 0, snapToGrid(0)],
        width: 2.5,
        bankAngle: 0,
      },
      {
        id: secondId,
        position: [snapToGrid(0), 0, snapToGrid(-10)],
        width: 2.5,
        bankAngle: 0,
      },
    ],
    blocks: [],
  };

  let initialStage = {
    id: null,
    name: "",
    par: 2,
    theme: "clear",
    strokeLimit: 8,
    groundFriction: 0.75,
    groundRestitution: 0.05,
    wallFriction: 0.75,
    wallRestitution: 0.95,
    tileColor: "#567D46",
    terrainMode: "heightmap",
  };

  // Restore unsaved dev session state on browser reload if not loading a cloud courseId
  if (typeof window !== "undefined") {
    const hasCourseIdParam = new URLSearchParams(window.location.search).has("courseId");
    if (!hasCourseIdParam) {
      try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.controlPoints?.length >= 2) {
            initialHistory = {
              controlPoints: parsed.controlPoints,
              blocks: parsed.blocks || [],
            };
          }
          if (parsed?.stage) {
            initialStage = { ...initialStage, ...parsed.stage };
          }
        }
      } catch (e) {
        console.warn("Could not restore editor session:", e);
      }
    }
  }

  const history = createHistoryStore(initialHistory);

  const controlPoints = {
    subscribe: derived(history, ($h) => $h.controlPoints).subscribe,
    set: (val) => history.update((h) => ({ ...h, controlPoints: val })),
    update: (fn) => history.update((h) => ({ ...h, controlPoints: fn(h.controlPoints) })),
    commit: history.commit,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };

  const blocks = {
    subscribe: derived(history, ($h) => $h.blocks).subscribe,
    set: (val) => history.update((h) => ({ ...h, blocks: val })),
    update: (fn) => history.update((h) => ({ ...h, blocks: fn(h.blocks) })),
    commit: history.commit,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };

  const initialSelectedPoint =
    initialHistory.controlPoints[initialHistory.controlPoints.length - 1]?.id || secondId;

  const initialDebug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debug");

  const pointSelected = writable(initialSelectedPoint);
  const blockSelected = writable(null);
  const placementBlock = writable(null);
  const previewPosition = writable([0, 0, 0]);
  const previewRotation = writable([0, 0, 0]);

  /**
   * Extends the track forward along the tangent of the last two points by ~9m.
   */
  function extendTrack() {
    const pts = get(controlPoints);
    if (!pts || pts.length === 0) return;

    const last = pts[pts.length - 1];
    let dx = 0;
    let dy = 0;
    let dz = -9;

    if (pts.length >= 2) {
      const prev = pts[pts.length - 2];
      const vx = last.position[0] - prev.position[0];
      const vz = last.position[2] - prev.position[2];
      const len = Math.hypot(vx, vz);
      if (len > 0.001) {
        dx = (vx / len) * 9;
        dz = (vz / len) * 9;
      }
    }

    const nextX = Math.round((last.position[0] + dx) * 10) / 10;
    const nextZ = Math.round((last.position[2] + dz) * 10) / 10;
    const nextY = Math.round((evaluateHeightmapAt(nextX, nextZ).height + 0.06) * 10) / 10;

    const newPoint = {
      id: crypto.randomUUID(),
      position: [nextX, nextY, nextZ],
      width: last.width ?? 2.5,
      bankAngle: 0,
    };

    controlPoints.commit();
    controlPoints.set([...pts, newPoint]);
    pointSelected.set(newPoint.id);
    blockSelected.set(null);
  }

  /**
   * Inserts a new control point midway between the selected point and its neighbor.
   */
  function insertPointAfterSelected() {
    const pts = get(controlPoints);
    const selId = get(pointSelected);
    if (!pts || pts.length < 2) return;

    let idx = pts.findIndex((p) => p.id === selId);
    if (idx === -1) idx = pts.length - 2;
    // If the very last point is selected, insert BEFORE the last point
    const aIdx = idx === pts.length - 1 ? idx - 1 : idx;
    const bIdx = aIdx + 1;

    const a = pts[aIdx];
    const b = pts[bIdx];
    const midX = Math.round(((a.position[0] + b.position[0]) / 2) * 10) / 10;
    const midZ = Math.round(((a.position[2] + b.position[2]) / 2) * 10) / 10;
    const midY = Math.round((evaluateHeightmapAt(midX, midZ).height + 0.06) * 10) / 10;

    const newPoint = {
      id: crypto.randomUUID(),
      position: [midX, midY, midZ],
      width: ((a.width ?? 2.5) + (b.width ?? 2.5)) / 2,
      bankAngle: Math.round(((a.bankAngle ?? 0) + (b.bankAngle ?? 0)) / 2),
    };

    controlPoints.commit();
    const next = [...pts];
    next.splice(bIdx, 0, newPoint);
    controlPoints.set(next);
    pointSelected.set(newPoint.id);
    blockSelected.set(null);
  }

  /**
   * Duplicates the currently selected block with a slight offset.
   */
  function duplicateSelectedBlock() {
    const blkList = get(blocks);
    const selId = get(blockSelected);
    if (!blkList || !selId) return;

    const orig = blkList.find((b) => b.id === selId);
    if (!orig) return;

    const copy = {
      ...structuredClone(orig),
      id: crypto.randomUUID(),
      position: [
        orig.position[0] + 1.5,
        orig.position[1],
        orig.position[2] + 1.5,
      ],
    };

    blocks.commit();
    blocks.set([...blkList, copy]);
    blockSelected.set(copy.id);
    pointSelected.set(null);
  }

  /**
   * Deletes the currently selected point (if not Start point & >=3 points) or selected block.
   */
  function deleteSelected() {
    const selPtId = get(pointSelected);
    if (selPtId) {
      const pts = get(controlPoints);
      const idx = pts.findIndex((p) => p.id === selPtId);
      // Do not delete start point (index 0) and keep at least 2 points
      if (idx > 0 && pts.length > 2) {
        controlPoints.commit();
        const next = [...pts];
        next.splice(idx, 1);
        controlPoints.set(next);
        pointSelected.set(next[Math.min(idx, next.length - 1)]?.id || null);
      }
      return;
    }

    const selBlkId = get(blockSelected);
    if (selBlkId) {
      const blkList = get(blocks);
      const idx = blkList.findIndex((b) => b.id === selBlkId);
      if (idx !== -1) {
        blocks.commit();
        const next = [...blkList];
        next.splice(idx, 1);
        blocks.set(next);
        blockSelected.set(null);
      }
    }
  }

  const ctx = {
    testing: writable(false),
    previewing: writable(false),
    debugPhysics: writable(initialDebug),
    placementBlock,
    previewPosition,
    previewRotation,
    history,
    controlPoints,
    pointSelected,
    blocks,
    blockSelected,
    transformMode: writable("translate"),
    pointColors: writable({
      normal: "#3b82f6",        // blue-500
      hover: "#22d3ee",         // cyan-400
      selected: "#ef4444",      // red-500
      selectedHover: "#f97316", // orange-500
    }),
    stage: writable(initialStage),
    extendTrack,
    insertPointAfterSelected,
    duplicateSelectedBlock,
    deleteSelected,
  };

  // Auto-persist changes to sessionStorage for fast F5 / dev reload loop
  if (typeof window !== "undefined") {
    const saveToSession = () => {
      try {
        const h = get(ctx.history);
        const s = get(ctx.stage);
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            controlPoints: h.controlPoints,
            blocks: h.blocks,
            stage: s,
          })
        );
      } catch (e) {
        // Ignore quota errors
      }
    };
    ctx.history.subscribe(saveToSession);
    ctx.stage.subscribe(saveToSession);
  }

  activeEditor.history = ctx.history;
  activeEditor.controlPoints = ctx.controlPoints;
  activeEditor.stage = ctx.stage;
  activeEditor.blocks = ctx.blocks;
  activeEditor.placementBlock = ctx.placementBlock;
  activeEditor.previewPosition = ctx.previewPosition;
  activeEditor.previewRotation = ctx.previewRotation;
  activeEditor.debugPhysics = ctx.debugPhysics;

  return setContext("minigolfmania/editor/context", ctx);
};

export const useEditor = () => {
  return getContext("minigolfmania/editor/context");
};
