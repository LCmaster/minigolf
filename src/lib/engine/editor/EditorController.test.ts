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

  it("supports track_path spline editing, waypoint insert/delete, elevation steps, corner toggle, and undo/redo", () => {
    let storedSpline: any = null;
    const realTiles = new Map<string, any>();
    const realProps = new Map<string, any>();

    const makeSockets = (id: string) => {
      if (id.includes("tee")) {
        return [{ id: "LOC_Socket_Out", position: [0, 0, -3], normal: [0, 0, -1], type: "track_arcade_6m", elevation: 0 }];
      }
      if (id.includes("cup")) {
        return [{ id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1], type: "track_arcade_6m", elevation: 0 }];
      }
      if (id.includes("ramp_up")) {
        return [
          { id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1], type: "track_arcade_6m", elevation: 0 },
          { id: "LOC_Socket_Out", position: [0, 1.5, -3], normal: [0, 0, -1], type: "track_arcade_6m", elevation: 1.5 },
        ];
      }
      return [
        { id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1], type: "track_arcade_6m", elevation: 0 },
        { id: "LOC_Socket_Out", position: [0, 0, -3], normal: [0, 0, -1], type: "track_arcade_6m", elevation: 0 },
      ];
    };

    const splineCourseMock: any = {
      tiles: realTiles,
      setSplinePath: (p: any) => { storedSpline = p; },
      getSplinePath: () => storedSpline,
      loadHole: (hole: any) => {
        realTiles.clear();
        realProps.clear();
        storedSpline = hole.splinePath || null;
        for (const t of hole.tiles) {
          realTiles.set(t.instanceId, {
            tileData: t,
            group: new THREE.Group(),
            pieceTemplate: { sockets: makeSockets(t.kitPieceId) },
          });
        }
        for (const p of hole.props || []) {
          realProps.set(p.instanceId, { propData: p, group: new THREE.Group() });
        }
      },
      exportHoleData: () => ({
        holeNumber: 1,
        par: 3,
        teeTileId: "tee_0",
        cupTileId: "cup_0",
        tiles: Array.from(realTiles.values()).map((v) => v.tileData),
        props: Array.from(realProps.values()).map((v) => v.propData),
        splinePath: storedSpline || undefined,
      }),
      getAllProps: () => Array.from(realProps.values()),
      getProp: (id: string) => realProps.get(id),
    };

    const splineAssetsMock: any = {
      getPiece: (id: string) => ({
        metadata: { id, name: id, dimensions: [6, 0.6, 6] },
        visualTemplate: new THREE.Group(),
        sockets: makeSockets(id),
        locators: new Map(),
      }),
    };

    splineCourseMock.loadHole({
      holeNumber: 1,
      par: 2,
      teeTileId: "tee_0",
      cupTileId: "cup_0",
      tiles: [
        { instanceId: "tee_0", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true }, connectedSockets: { LOC_Socket_Out: "cup_0" } },
        { instanceId: "cup_0", kitPieceId: "carnival_green_cup_6x6", position: [0, 0, -6], rotationY: 0, walls: { left: true, right: true }, attachedTo: { parentInstanceId: "tee_0", parentSocketId: "LOC_Socket_Out" }, connectedSockets: { LOC_Socket_In: "tee_0" } },
      ],
      props: [
        { instanceId: "p_tree", propId: "prop_tree_puffy", position: [12, 0, -8], rotation: [0, 0, 0], scale: [1, 1, 1] },
      ],
    });

    const editor = new EditorController(canvasMock, camera, scene, splineCourseMock, splineAssetsMock);
    editor.setTrackPathMode(true);
    expect(editor.toolMode).toBe("track_path");
    expect(editor.isTrackPathMode).toBe(true);
    expect(scene.getObjectByName("Editor_SplineOverlay")?.visible).toBe(true);
    expect(scene.getObjectByName("Editor_SocketGizmos")?.visible).toBe(false);

    // Selected tail node cannot be deleted when only 2 nodes exist
    expect(editor.deleteSelectedSplineNode()).toBe(false);

    // Insert waypoint further forward -> Cup moves to stay at tail, props stay intact
    expect(editor.insertSplineWaypointAt(new THREE.Vector3(0, 0, -18))).toBe(true);
    expect(splineCourseMock.exportHoleData().tiles.length).toBeGreaterThanOrEqual(3);
    expect(splineCourseMock.exportHoleData().props.length).toBe(1);
    expect(splineCourseMock.getSplinePath().nodes.length).toBe(3);

    // Step elevation up +1.5m on tail and toggle corner
    expect(editor.stepSelectedNodeElevation(1)).toBe(true);
    expect(editor.getSelectedSplineNodeInfo()?.elevationStep).toBe(1);
    expect(editor.toggleSelectedNodeCorner()).toBe(true);
    expect(editor.getSelectedSplineNodeInfo()?.corner).toBe(true);

    // Undo restores smooth corner and previous elevation
    expect(editor.undo()).toBe(true);
    expect(editor.getSelectedSplineNodeInfo()?.corner).toBe(false);

    // Delete inserted tail node works (cannot delete root node 0)
    expect(editor.deleteSelectedSplineNode()).toBe(true);
    expect(splineCourseMock.getSplinePath().nodes.length).toBe(2);
    // Root protection: only 2 nodes remain so delete returns false
    expect(editor.deleteSelectedSplineNode()).toBe(false);

    editor.dispose();
  });

  it("ignores wall clicks and editing inputs when gizmos/editor are disabled in Playtest mode", () => {
    const editor = new EditorController(
      canvasMock,
      camera,
      scene,
      courseManagerMock,
      assetLoaderMock
    );

    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 6), new THREE.MeshBasicMaterial());
    wallMesh.position.set(0, 0.3, 0);
    wallMesh.updateMatrixWorld(true);
    scene.add(wallMesh);
    courseManagerMock.tiles.set("t_wall", {
      tileData: { instanceId: "t_wall", kitPieceId: "straight_6m", walls: { left: true, right: true } },
      pieceTemplate: { sockets: [] },
      group: wallMesh,
      wallLMesh: wallMesh,
    });

    camera.position.set(0, 3, 5);
    camera.lookAt(0, 0.3, 0);
    camera.updateMatrixWorld(true);

    // Disable editor during Playtest
    editor.setGizmosVisible(false);
    expect(editor.isEnabled()).toBe(false);

    // Simulate hovering/clicking wall while disabled
    const moveCb = canvasMock.addEventListener.mock.calls.find((c: any) => c[0] === "pointermove")![1];
    const downCb = canvasMock.addEventListener.mock.calls.find((c: any) => c[0] === "pointerdown")![1];
    moveCb({ clientX: 400, clientY: 300 });
    downCb({ button: 0, clientX: 400, clientY: 300 });
    expect(courseManagerMock.toggleWall).not.toHaveBeenCalled();

    // Re-enable editor -> wall toggle works again
    editor.setGizmosVisible(true);
    expect(editor.isEnabled()).toBe(true);
    moveCb({ clientX: 400, clientY: 300 });
    downCb({ button: 0, clientX: 400, clientY: 300 });
    expect(courseManagerMock.toggleWall).toHaveBeenCalledWith("t_wall", "left");

    editor.dispose();
  });
});

