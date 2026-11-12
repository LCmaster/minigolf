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
      getAllTiles: vi.fn(() => Array.from(tilesMap.values())),
      getTile: vi.fn((id: string) => tilesMap.get(id)),
      connectTileSocket: vi.fn((tileId: string, sockId: string, targetId: string) => {
        const t = tilesMap.get(tileId);
        if (!t) return false;
        t.tileData.connectedSockets = t.tileData.connectedSockets || {};
        t.tileData.connectedSockets[sockId] = targetId;
        return true;
      }),
      disconnectTileSocket: vi.fn((tileId: string, sockId: string) => {
        const t = tilesMap.get(tileId);
        if (!t?.tileData.connectedSockets || !(sockId in t.tileData.connectedSockets)) return false;
        delete t.tileData.connectedSockets[sockId];
        return true;
      }),
      findIncomingSocketLinks: vi.fn((tileId: string) => {
        const links: Array<{ tileId: string; socketId: string }> = [];
        for (const [otherId, otherTile] of tilesMap.entries()) {
          const conns = otherTile.tileData.connectedSockets;
          if (!conns) continue;
          for (const [sockId, target] of Object.entries(conns)) {
            if (target === tileId) links.push({ tileId: otherId, socketId: sockId });
          }
        }
        return links;
      }),
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
      setTileGap: vi.fn((id: string, isGap: boolean) => {
        const t = tilesMap.get(id);
        if (!t) return false;
        t.tileData.isGap = isGap;
        return true;
      }),
      swapTileType: vi.fn((id: string, newKitPieceId: string) => {
        const t = tilesMap.get(id);
        if (!t) return false;
        t.tileData.kitPieceId = newKitPieceId;
        t.tileData.isGap = false;
        return true;
      }),
      exportHoleData: vi.fn(() => ({
        holeNumber: 1,
        par: 3,
        teeTileId: "",
        cupTileId: "",
        tiles: Array.from(tilesMap.values()).map((t: any) => ({ ...t.tileData })),
        props: [],
      })),
      loadHole: vi.fn((hole: any) => {
        tilesMap.clear();
        for (const t of hole.tiles) {
          tilesMap.set(t.instanceId, {
            tileData: { ...t },
            group: new THREE.Group(),
            pieceTemplate: { sockets: [] },
          });
        }
      }),
      getSplinePath: vi.fn(() => null),
      setSplinePath: vi.fn(),
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
      if (id.includes("turn_90")) {
        return [
          { id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1], type: "track_arcade_6m", elevation: 0 },
          { id: "LOC_Socket_Out", position: [6, 0, -3], normal: [1, 0, 0], type: "track_arcade_6m", elevation: 0 },
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

    // Insert waypoint with 90° bend -> Cup moves to stay at tail, props stay intact
    expect(editor.insertSplineWaypointAt(new THREE.Vector3(18, 0, -9))).toBe(true);
    expect(splineCourseMock.exportHoleData().tiles.length).toBeGreaterThanOrEqual(3);
    expect(splineCourseMock.exportHoleData().props.length).toBe(1);
    expect(splineCourseMock.getSplinePath().nodes.length).toBe(3);

    // Step elevation up +1.5m on tail; endpoints (Tee/Cup) omit bevels
    expect(editor.stepSelectedNodeElevation(1)).toBe(true);
    expect(editor.getSelectedSplineNodeInfo()?.elevationStep).toBe(1);
    expect(editor.getSelectedSplineNodeInfo()?.canBevel).toBe(false);
    expect(editor.toggleSelectedNodeBevel()).toBe(false);

    // Select intermediate corner (idx 1) -> defaults to Sharp, toggleSelectedNodeBevel rounds it & Undo restores Sharp
    (editor as any).selectedSplineNodeIndex = 1;
    expect(editor.getSelectedSplineNodeInfo()?.canBevel).toBe(true);
    expect(editor.getSelectedSplineNodeInfo()?.corner).toBe(true);
    expect(editor.toggleSelectedNodeBevel()).toBe(true);
    expect(editor.getSelectedSplineNodeInfo()?.bevelRadius).toBeGreaterThan(0);
    expect(editor.getSelectedSplineNodeInfo()?.corner).toBe(false);

    // Undo restores sharp corner
    expect(editor.undo()).toBe(true);
    expect(editor.getSelectedSplineNodeInfo()?.corner).toBe(true);
    expect(editor.getSelectedSplineNodeInfo()?.bevelRadius).toBe(0);

    // Grid Snap defaults to 1m, supports 1m/3m/6m/Off, bypassGrid=true (Shift/Alt), and snapAllSplineNodesToGrid with Undo
    expect(editor.getGridSnapSize()).toBe(1);
    editor.setGridSnapSize(3);
    expect(editor.getGridSnapSize()).toBe(3);

    // Bypass grid places exact fractional point -> then snapAllSplineNodesToGrid snaps onto 3m cells & undoes cleanly
    expect(editor.insertSplineWaypointAt(new THREE.Vector3(7.4, 0, -16.8), true)).toBe(true);
    const freeTail = splineCourseMock.getSplinePath().nodes[2];
    expect(freeTail).toBeDefined();

    // Drag/edit simulation directly on off-grid node followed by snapAllSplineNodesToGrid
    const working = splineCourseMock.getSplinePath();
    working.nodes[1].position[0] = 4.4;
    working.nodes[1].position[2] = -10.9;
    splineCourseMock.setSplinePath(working);
    (editor as any).activeSpline = working;

    expect(editor.snapAllSplineNodesToGrid()).toBe(true);
    expect(splineCourseMock.getSplinePath().nodes[1].position[0]).toBe(3);
    expect(editor.undo()).toBe(true);

    // Delete inserted tail node works (cannot delete root node 0)
    (editor as any).selectedSplineNodeIndex = splineCourseMock.getSplinePath().nodes.length - 1;
    expect(editor.deleteSelectedSplineNode()).toBe(true);
    expect(splineCourseMock.getSplinePath().nodes.length).toBe(3);

    editor.dispose();
  });

  it("ignores tile clicks when disabled in Playtest, opens Tile Action Popover in Build mode, and supports wall/gap/swap undo", () => {
    const editor = new EditorController(
      canvasMock,
      camera,
      scene,
      courseManagerMock,
      assetLoaderMock
    );

    const tileGroup = new THREE.Group();
    tileGroup.userData = { tileInstanceId: "t_wall" };
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 6), new THREE.MeshBasicMaterial());
    wallMesh.position.set(0, 0.3, 0);
    tileGroup.add(wallMesh);
    tileGroup.updateMatrixWorld(true);
    scene.add(tileGroup);
    courseManagerMock.tiles.set("t_wall", {
      tileData: { instanceId: "t_wall", kitPieceId: "straight_6m", walls: { left: true, right: true } },
      pieceTemplate: { metadata: { name: "Straight 6m", hasDynamicWalls: true }, sockets: [] },
      group: tileGroup,
      wallLMesh: wallMesh,
    });

    const tileClicks: any[] = [];
    editor.onTileClick = (info) => tileClicks.push(info);

    camera.position.set(0, 3, 5);
    camera.lookAt(0, 0.3, 0);
    camera.updateMatrixWorld(true);

    // Disable editor during Playtest
    editor.setGizmosVisible(false);
    expect(editor.isEnabled()).toBe(false);

    // Clicking tile/wall while disabled does not open Tile Action Popover or toggle walls
    const moveCb = canvasMock.addEventListener.mock.calls.find((c: any) => c[0] === "pointermove")![1];
    const downCb = canvasMock.addEventListener.mock.calls.find((c: any) => c[0] === "pointerdown")![1];
    moveCb({ clientX: 400, clientY: 300 });
    downCb({ button: 0, clientX: 400, clientY: 300 });
    expect(tileClicks.length).toBe(0);
    expect(courseManagerMock.toggleWall).not.toHaveBeenCalled();

    // Re-enable editor -> left-clicking tile/wall opens Tile Action Popover
    editor.setGizmosVisible(true);
    expect(editor.isEnabled()).toBe(true);
    moveCb({ clientX: 400, clientY: 300 });
    downCb({ button: 0, clientX: 400, clientY: 300 });
    expect(tileClicks.length).toBe(1);
    expect(tileClicks[0].tileInstanceId).toBe("t_wall");
    expect(courseManagerMock.toggleWall).not.toHaveBeenCalled();

    // Popover actions execute via HistoryManager with Undo/Redo
    expect(editor.toggleTileWall("t_wall", "left")).toBe(true);
    expect(courseManagerMock.toggleWall).toHaveBeenCalledWith("t_wall", "left");

    expect(editor.toggleTileGap("t_wall")).toBe(true);
    expect(courseManagerMock.setTileGap).toHaveBeenCalledWith("t_wall", true);

    // Simulate gapped tile with empty group -> clicking gap gizmo wireframe still opens Tile Action Popover
    tileGroup.clear();
    editor.refreshOpenSockets();
    downCb({ button: 0, clientX: 400, clientY: 300 });
    expect(tileClicks.length).toBe(2);
    expect(tileClicks[1].tileInstanceId).toBe("t_wall");
    expect(tileClicks[1].isGap).toBe(true);

    editor.undo();
    expect(courseManagerMock.setTileGap).toHaveBeenCalledWith("t_wall", false);

    expect(editor.swapTileType("t_wall", "carnival_bridge_pond_6x12")).toBe(true);
    expect(courseManagerMock.swapTileType).toHaveBeenCalledWith("t_wall", "carnival_bridge_pond_6x12", undefined);

    editor.dispose();
  });
});

