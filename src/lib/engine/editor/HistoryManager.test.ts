import { describe, it, expect, vi } from "vitest";
import { HistoryManager, type EditorCommand } from "./HistoryManager";

describe("HistoryManager Unit Tests", () => {
  it("starts empty with canUndo and canRedo false", () => {
    const history = new HistoryManager();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.undo()).toBe(false);
    expect(history.redo()).toBe(false);
  });

  it("executes command, records to undo stack, and enables undo", () => {
    const history = new HistoryManager();
    let state = 0;

    const cmd: EditorCommand = {
      name: "Increment",
      execute: () => { state += 1; },
      undo: () => { state -= 1; },
    };

    history.execute(cmd);
    expect(state).toBe(1);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    const undone = history.undo();
    expect(undone).toBe(true);
    expect(state).toBe(0);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    const redone = history.redo();
    expect(redone).toBe(true);
    expect(state).toBe(1);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it("clears redo stack upon executing a new command", () => {
    const history = new HistoryManager();
    const cmd1: EditorCommand = {
      name: "Cmd1",
      execute: vi.fn(),
      undo: vi.fn(),
    };
    const cmd2: EditorCommand = {
      name: "Cmd2",
      execute: vi.fn(),
      undo: vi.fn(),
    };

    history.execute(cmd1);
    history.undo();
    expect(history.canRedo()).toBe(true);

    history.execute(cmd2);
    expect(history.canRedo()).toBe(false);
  });

  it("evicts oldest command when exceeding maxHistory (50 items)", () => {
    const history = new HistoryManager();

    for (let i = 0; i < 60; i++) {
      const cmd: EditorCommand = {
        name: `Cmd_${i}`,
        execute: vi.fn(),
        undo: vi.fn(),
      };
      history.execute(cmd);
    }

    let undoCount = 0;
    while (history.undo()) {
      undoCount++;
    }

    expect(undoCount).toBe(50);
  });

  it("clears both stacks on clear()", () => {
    const history = new HistoryManager();
    const cmd: EditorCommand = {
      name: "Test",
      execute: vi.fn(),
      undo: vi.fn(),
    };

    history.execute(cmd);
    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });
});

