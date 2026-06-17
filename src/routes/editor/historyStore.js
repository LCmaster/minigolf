import { writable, get } from "svelte/store";

/**
 * Creates a writable store with undo/redo history.
 * Use `commit()` before making a meaningful mutation to snapshot the current
 * state into the history stack. Undo/redo navigate between snapshots.
 *
 * @param {any} initialValue
 * @param {number} [maxHistory=50]
 */
export function createHistoryStore(initialValue, maxHistory = 50) {
  const inner = writable(JSON.parse(JSON.stringify(initialValue)));

  let past = [];   // stack of previous snapshots (index 0 = oldest)
  let future = []; // stack of undone snapshots (index 0 = most recently undone)

  const canUndo = writable(false);
  const canRedo = writable(false);

  function updateFlags() {
    canUndo.set(past.length > 0);
    canRedo.set(future.length > 0);
  }

  /**
   * Snapshot the current value into the history stack BEFORE mutating.
   * Call this right before every meaningful state change.
   */
  function commit() {
    const snapshot = JSON.parse(JSON.stringify(get(inner)));
    past.push(snapshot);
    if (past.length > maxHistory) past.shift();
    future = [];
    updateFlags();
  }

  function undo() {
    if (past.length === 0) return;
    const current = JSON.parse(JSON.stringify(get(inner)));
    future.push(current);
    inner.set(past.pop());
    updateFlags();
  }

  function redo() {
    if (future.length === 0) return;
    const current = JSON.parse(JSON.stringify(get(inner)));
    past.push(current);
    if (past.length > maxHistory) past.shift();
    inner.set(future.pop());
    updateFlags();
  }

  return {
    subscribe: inner.subscribe,
    set: inner.set,
    update: inner.update,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
