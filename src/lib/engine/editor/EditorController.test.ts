import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { EditorController, type OpenSocketInfo } from "./EditorController";

describe("EditorController Unit Tests", () => {
  let canvasMock: any;
  let camera: THREE.PerspectiveCamera;
  let scene: THREE.Scene;
  let courseManagerMock: any;
  let assetLoaderMock: any;

  beforeEach(() => {
    canvasMock = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 })),
      style: {},
    };
    camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
    scene = new THREE.Scene();

    const tilesMap = new Map();
    const propsMap = new Map<string, any>();
    courseManagerMock = {
      tiles: tilesMap,
      addTile: vi.fn((tileData: any) => {
        tilesMap.set(tileData.instanceId, {
          tileData,
          group: new THREE.Group(),
          pieceTemplate: {
            sockets: [{ id: "LOC_Socket_Out", position: [0, 0, 3], normal: [0, 0, 1] }],
          },
        });
      }),
      removeTile: vi.fn((id: string) => tilesMap.delete(id)),
      addProp: vi.fn((propData: any) => {
        const inst = { propData, group: new THREE.Group(), colliders: [] };
        propsMap.set(propData.instanceId, inst);
        return inst;
      }),
      removeProp: vi.fn((id: string) => propsMap.delete(id)),
      updatePropTransform: vi.fn((id: string, position: any, rotation: any) => {
        const existing = propsMap.get(id);
        if (!existing) return false;
        existing.propData.position = position;
        existing.propData.rotation = rotation;
        return true;
      }),
      getAllProps: vi.fn(() => Array.from(propsMap.values())),
      getProp: vi.fn((id: string) => propsMap.get(id)),
      toggleWall: vi.fn(),
      rebuildWeldedFloorPhysics: vi.fn(),
    };

    assetLoaderMock = {
      getPiece: vi.fn((id: string) => ({
        name: "Straight 6m",
        sockets: [
          { id: "LOC_Socket_In", position: [0, 0, -3], normal: [0, 0, -1] },
          { id: "LOC_Socket_Out", position: [0, 0, 3], normal: [0, 0, 1] },
        ],
      })),
    };
  });

  it("initializes and attaches pointer listeners and socket gizmo group", () => {
    const editor = new EditorController(
      canvasMock,
      camera,
      scene,
      courseManagerMock,
      assetLoaderMock
    );

    expect(canvasMock.addEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(canvasMock.addEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(scene.getObjectByName("Editor_SocketGizmos")).toBeDefined();

    editor.dispose();
  });

  it("refreshes open sockets and creates gizmo rings for unconnected sockets", () => {
    const editor = new EditorController(
      canvasMock,
      camera,
      scene,
      courseManagerMock,
      assetLoaderMock
    );

    const group = new THREE.Group();
    group.position.set(0, 0, 0);
    courseManagerMock.tiles.set("tee_tile", {
      tileData: {
        instanceId: "tee_tile",
        kitPieceId: "tee_box_6x6",
        connectedSockets: {},
      },
      pieceTemplate: {
        sockets: [{ id: "LOC_Socket_Out", position: [0, 0, 3], normal: [0, 0, 1] }],
      },
      group,
    });

    editor.refreshOpenSockets();

    expect(editor.openSockets.length).toBe(1);
    expect(editor.openSockets[0].tileInstanceId).toBe("tee_tile");
    expect(editor.openSockets[0].socketId).toBe("LOC_Socket_Out");
    expect(editor.openSockets[0].worldPosition.z).toBeCloseTo(3, 2);

    editor.dispose();
  });

  it("snaps a new piece to an open socket and supports undo/redo via history", () => {
    const editor = new EditorController(
      canvasMock,
      camera,
      scene,
      courseManagerMock,
      assetLoaderMock
    );

    const targetSocket: OpenSocketInfo = {
      tileInstanceId: "tee_tile",
      socketId: "LOC_Socket_Out",
      worldPosition: new THREE.Vector3(0, 0, 3),
      normal: new THREE.Vector3(0, 0, 1),
      elevation: 0,
    };

    editor.snapPieceToSocket(targetSocket, "straight_6m");

    expect(courseManagerMock.addTile).toHaveBeenCalled();
    expect(editor.history.canUndo()).toBe(true);

    editor.history.undo();
    expect(editor.history.canUndo()).toBe(false);
    expect(editor.history.canRedo()).toBe(true);

    editor.history.redo();
    expect(editor.history.canUndo()).toBe(true);

    editor.dispose();
  });

  it("toggles socket gizmos visibility", () => {
    const editor = new EditorController(
      canvasMock,
      camera,
      scene,
      courseManagerMock,
      assetLoaderMock
    );

    editor.setGizmosVisible(false);
    const gizmoGroup = scene.getObjectByName("Editor_SocketGizmos");
    expect(gizmoGroup?.visible).toBe(false);

    editor.setGizmosVisible(true);
    expect(gizmoGroup?.visible).toBe(true);

    editor.dispose();
  });

  it("places and undoes props at arbitrary world coordinates", () => {
    const editor = new EditorController(
      canvasMock,
      camera,
      scene,
      courseManagerMock,
      assetLoaderMock
    );

    editor.placePropAtPoint("prop_tree_oak", new THREE.Vector3(4, 0, -2));
    expect(courseManagerMock.addProp).toHaveBeenCalledTimes(1);
    expect(editor.history.canUndo()).toBe(true);

    editor.history.undo();
    expect(courseManagerMock.removeProp).toHaveBeenCalledTimes(1);

    editor.dispose();
  });

  it("rotates placed props and erases non-root tiles with full undo/redo restoration", () => {
    const editor = new EditorController(
      canvasMock,
      camera,
      scene,
      courseManagerMock,
      assetLoaderMock
    );

    // Populate root tee + child straight tile
    courseManagerMock.addTile({
      instanceId: "tee_root",
      kitPieceId: "carnival_tee_6x6",
      position: [0, 0, 0],
      rotationY: 0,
      walls: { left: true, right: true },
      connectedSockets: { LOC_Socket_Out: "tile_child" },
    });
    courseManagerMock.addTile({
      instanceId: "tile_child",
      kitPieceId: "carnival_straight_6m",
      position: [0, 0, -6],
      rotationY: 0,
      walls: { left: true, right: true },
      connectedSockets: { LOC_Socket_In: "tee_root" },
    });

    // Cannot delete root tee tile, CAN delete non-root child tile
    expect(editor.deleteTile("tee_root")).toBe(false);
    expect(editor.deleteTile("tile_child")).toBe(true);
    expect(courseManagerMock.removeTile).toHaveBeenCalledWith("tile_child");

    // Undo restores tile_child
    editor.history.undo();
    expect(courseManagerMock.tiles.has("tile_child")).toBe(true);

    // Place and rotate a prop
    editor.placePropAtPoint("prop_tree_puffy", new THREE.Vector3(5, 0, 0));
    const placed = courseManagerMock.getAllProps()[0];
    editor.rotatePlacedProp(placed.propData.instanceId, 45);
    expect(placed.propData.rotation[1]).toBe(45);

    editor.history.undo();
    expect(placed.propData.rotation[1]).toBe(0);

    // Erase mode toggle clears selected prop
    editor.setEraseMode(true);
    expect(editor.isEraseMode).toBe(true);
    expect(editor.toolMode).toBe("erase");

    editor.dispose();
  });
});

