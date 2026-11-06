/**
 * HistoryManager.ts
 * Command-pattern Undo/Redo history manager for the Web Track Editor.
 */

export interface EditorCommand {
  name: string;
  execute(): void;
  undo(): void;
}

export class HistoryManager {
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];
  private maxHistory: number = 50;

  public execute(command: EditorCommand): void {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
  }

  public undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.undo();
    this.redoStack.push(cmd);
    return true;
  }

  public redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.execute();
    this.undoStack.push(cmd);
    return true;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

