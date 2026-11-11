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
      addProp: vi.fn((propData: any) => ({ propData, group: new THREE.Group(), colliders: [] })),
      removeProp: vi.fn(() => true),
      getAllProps: vi.fn(() => []),
      getProp: vi.fn(),
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
});

