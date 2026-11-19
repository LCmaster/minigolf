import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { EditorInputHandler, type EditorInputHandlerDeps } from "./EditorInputHandler";

describe("EditorInputHandler (TDD)", () => {
  let canvasMock: any;
  let camera: THREE.PerspectiveCamera;
  let raycaster: THREE.Raycaster;
  let deps: EditorInputHandlerDeps;
  let enabled: boolean;
  let eraseMode: boolean;
  let trackPathMode: boolean;
  let selectedPropId: string | null;
  let selectedPlacedPropId: string | null;
  let handler: EditorInputHandler;

  beforeEach(() => {
    canvasMock = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 })),
      style: { cursor: "default" },
    };
    camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
    raycaster = new THREE.Raycaster();
    enabled = true;
    eraseMode = false;
    trackPathMode = false;
    selectedPropId = null;
    selectedPlacedPropId = null;

    deps = {
      canvas: canvasMock,
      camera,
      raycaster,
      isEnabled: () => enabled,
      isEraseMode: () => eraseMode,
      picker: {
        setRayFromClient: vi.fn(),
        getPointOnPlane: vi.fn(() => new THREE.Vector3()),
        getSurfaceHitPoint: vi.fn(() => new THREE.Vector3(1, 0, 2)),
        pickInteractiveTarget: vi.fn(() => null),
      } as any,
      socketOverlay: {
        hoveredSocket: null,
        updateHover: vi.fn(() => null),
      } as any,
      propTool: {
        isDragging: vi.fn(() => false),
        getSelectedPropId: () => selectedPropId,
        getSelectedPlacedPropId: () => selectedPlacedPropId,
        updateHoverAndDrag: vi.fn(() => ({ handled: false })),
        rotatePlacedProp: vi.fn(),
        rotateBrush: vi.fn(),
        selectPlacedProp: vi.fn((id: string | null) => {
          selectedPlacedPropId = id;
        }),
        deleteProp: vi.fn(),
        placePropAtPoint: vi.fn(),
        beginDrag: vi.fn(),
        cancelDrag: vi.fn(),
        finishDrag: vi.fn(),
      } as any,
      pathTool: {
        isActive: () => trackPathMode,
        isDragging: vi.fn(() => false),
        handlePointerMove: vi.fn(() => "grab"),
        handlePointerDown: vi.fn(),
        handleDoubleClick: vi.fn(),
        cancelDrag: vi.fn(),
        finishDrag: vi.fn(),
      } as any,
      undo: vi.fn(() => true),
      redo: vi.fn(() => true),
      setTrackPathMode: vi.fn((v: boolean) => {
        trackPathMode = v;
      }),
      setEraseMode: vi.fn((v: boolean) => {
        eraseMode = v;
      }),
      setSelectedProp: vi.fn((id: string | null) => {
        selectedPropId = id;
      }),
      selectPlacedProp: vi.fn((id: string | null) => {
        selectedPlacedPropId = id;
      }),
      deleteSelectedSplineNode: vi.fn(() => true),
      deleteTile: vi.fn(() => true),
      getTileClickInfo: vi.fn(() => null),
      onSocketClick: vi.fn(),
      onTileClick: vi.fn(),
    };

    handler = new EditorInputHandler(deps);
  });

  function dispatchKey(key: string, opts: Record<string, any> = {}): KeyboardEvent {
    const ev = {
      key,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      target: null,
      preventDefault: vi.fn(),
      ...opts,
    } as unknown as KeyboardEvent;
    handler.handleKeyDown(ev);
    return ev;
  }

  it("attaches and disposes canvas pointer listeners cleanly", () => {
    handler.attach();
    expect(canvasMock.addEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(canvasMock.addEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(canvasMock.addEventListener).toHaveBeenCalledWith("dblclick", expect.any(Function));

    handler.dispose();
    expect(canvasMock.removeEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(canvasMock.removeEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(canvasMock.removeEventListener).toHaveBeenCalledWith("dblclick", expect.any(Function));
  });

  it("routes undo/redo and tool keyboard shortcuts while ignoring form inputs or disabled state", () => {
    // Ctrl+Z -> undo; Ctrl+Shift+Z / Ctrl+Y -> redo
    const undoEv = dispatchKey("z", { ctrlKey: true });
    expect(undoEv.preventDefault).toHaveBeenCalled();
    expect(deps.undo).toHaveBeenCalledTimes(1);

    dispatchKey("z", { ctrlKey: true, shiftKey: true });
    dispatchKey("y", { metaKey: true });
    expect(deps.redo).toHaveBeenCalledTimes(2);

    // T toggles track path mode, X toggles erase mode
    dispatchKey("t");
    expect(deps.setTrackPathMode).toHaveBeenCalledWith(true);
    dispatchKey("x");
    expect(deps.setEraseMode).toHaveBeenCalledWith(true);

    // R rotates selected placed prop if idle, else brush
    eraseMode = false;
    selectedPlacedPropId = "prop_1";
    dispatchKey("r");
    expect(deps.propTool.rotatePlacedProp).toHaveBeenCalledWith("prop_1", 45);
    selectedPlacedPropId = null;
    dispatchKey("R");
    expect(deps.propTool.rotateBrush).toHaveBeenCalledWith(45);

    // Delete / Backspace removes selected spline node or placed prop
    trackPathMode = true;
    dispatchKey("Delete");
    expect(deps.deleteSelectedSplineNode).toHaveBeenCalledTimes(1);
    trackPathMode = false;
    selectedPlacedPropId = "prop_2";
    dispatchKey("Backspace");
    expect(deps.propTool.selectPlacedProp).toHaveBeenCalledWith(null);
    expect(deps.propTool.deleteProp).toHaveBeenCalledWith("prop_2");

    // Escape resets modes and selections
    dispatchKey("Escape");
    expect(deps.setTrackPathMode).toHaveBeenLastCalledWith(false);
    expect(deps.setEraseMode).toHaveBeenLastCalledWith(false);
    expect(deps.setSelectedProp).toHaveBeenLastCalledWith(null);
    expect(deps.selectPlacedProp).toHaveBeenLastCalledWith(null);

    // Ignores form inputs and disabled state
    dispatchKey("t", { target: { tagName: "INPUT" } });
    dispatchKey("x", { target: { tagName: "TEXTAREA" } });
    enabled = false;
    dispatchKey("z", { ctrlKey: true });
    expect(deps.undo).toHaveBeenCalledTimes(1);
  });

  it("updates erase cursor feedback and deletes hit targets on pointerdown", () => {
    eraseMode = true;
    (deps.picker.pickInteractiveTarget as any).mockReturnValueOnce(null);
    handler.handlePointerMove({ clientX: 100, clientY: 100 } as PointerEvent);
    expect(canvasMock.style.cursor).toBe("crosshair");

    (deps.picker.pickInteractiveTarget as any).mockReturnValueOnce({ kind: "tile", id: "t1" });
    handler.handlePointerMove({ clientX: 100, clientY: 100 } as PointerEvent);
    expect(canvasMock.style.cursor).toBe("pointer");

    (deps.picker.pickInteractiveTarget as any).mockReturnValueOnce({ kind: "tile", id: "t1" });
    handler.handlePointerDown({ button: 0, clientX: 100, clientY: 100 } as PointerEvent);
    expect(deps.deleteTile).toHaveBeenCalledWith("t1");
  });
});

