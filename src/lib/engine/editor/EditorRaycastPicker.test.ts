import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { EditorRaycastPicker } from "./EditorRaycastPicker";

describe("EditorRaycastPicker (TDD)", () => {
  let canvasMock: any;
  let camera: THREE.PerspectiveCamera;
  let raycaster: THREE.Raycaster;
  let tiles: any[];
  let props: any[];
  let gapPickables: THREE.Object3D[];
  let propRoles: Record<string, "playable" | "decorative">;
  let picker: EditorRaycastPicker;

  beforeEach(() => {
    canvasMock = {
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 })),
    };
    camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    raycaster = new THREE.Raycaster();
    tiles = [];
    props = [];
    gapPickables = [];
    propRoles = {};

    picker = new EditorRaycastPicker({
      getTiles: () => tiles,
      getProps: () => props,
      getGapPickables: () => gapPickables,
      getPropPieceMetadata: (propId) => ({
        id: propId,
        propRole: propRoles[propId],
      }),
    });
  });

  it("computes NDC ray and intersects arbitrary horizontal planes", () => {
    picker.setRayFromClient(raycaster, canvasMock, camera, 400, 300);
    expect(raycaster.ray.origin.y).toBeCloseTo(10, 3);

    const hitY2 = picker.getPointOnPlane(raycaster, canvasMock, camera, 400, 300, 2.0);
    expect(hitY2).not.toBeNull();
    expect(hitY2!.x).toBeCloseTo(0, 2);
    expect(hitY2!.y).toBeCloseTo(2.0, 2);
    expect(hitY2!.z).toBeCloseTo(0, 2);
  });

  it("prefers raised tile surface hits over the y=0 ground plane fallback", () => {
    // Ground fallback when no tiles exist
    const fallback = picker.getSurfaceHitPoint(raycaster, canvasMock, camera, 400, 300);
    expect(fallback).not.toBeNull();
    expect(fallback!.y).toBeCloseTo(0, 2);

    // Raised tile deck at y = 1.5
    const tileGroup = new THREE.Group();
    tileGroup.userData = { tileInstanceId: "t_elevated" };
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.2, 6),
      new THREE.MeshBasicMaterial()
    );
    deck.position.set(0, 1.4, 0);
    tileGroup.add(deck);
    tileGroup.updateMatrixWorld(true);
    tiles.push({ tileData: { instanceId: "t_elevated" }, group: tileGroup });

    const deckHit = picker.getSurfaceHitPoint(raycaster, canvasMock, camera, 400, 300);
    expect(deckHit).not.toBeNull();
    expect(deckHit!.y).toBeCloseTo(1.5, 2);
  });

  it("prioritizes playable props over tiles, and tiles over overlapping decorative props", () => {
    const tileGroup = new THREE.Group();
    tileGroup.userData = { tileInstanceId: "tile_1" };
    const tileMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), new THREE.MeshBasicMaterial());
    tileMesh.position.set(0, 0, 0);
    tileGroup.add(tileMesh);
    tileGroup.updateMatrixWorld(true);
    tiles.push({ tileData: { instanceId: "tile_1" }, group: tileGroup });

    // Overhead decorative arch closer to camera (y=3)
    const archGroup = new THREE.Group();
    archGroup.userData = { propInstanceId: "arch_decor" };
    const archMesh = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 3), new THREE.MeshBasicMaterial());
    archMesh.position.set(0, 3, 0);
    archGroup.add(archMesh);
    archGroup.updateMatrixWorld(true);
    propRoles["prop_arch"] = "decorative";
    props.push({
      propData: { instanceId: "arch_decor", propId: "prop_arch" },
      group: archGroup,
    });

    picker.setRayFromClient(raycaster, canvasMock, camera, 400, 300);
    // Decorative arch must NOT steal the click from the track tile underneath
    expect(picker.pickInteractiveTarget(raycaster)).toEqual({ kind: "tile", id: "tile_1" });

    // Add playable booster prop seated at y=0.2 (closer to camera than tile top y=0.1)
    const bumperGroup = new THREE.Group();
    bumperGroup.userData = { propInstanceId: "bumper_play" };
    const bumperMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 1), new THREE.MeshBasicMaterial());
    bumperMesh.position.set(0, 0.2, 0);
    bumperGroup.add(bumperMesh);
    bumperGroup.updateMatrixWorld(true);
    propRoles["prop_bumper"] = "playable";
    props.push({
      propData: { instanceId: "bumper_play", propId: "prop_bumper" },
      group: bumperGroup,
    });

    // Playable prop on the track SHOULD beat the tile
    expect(picker.pickInteractiveTarget(raycaster)).toEqual({ kind: "prop", id: "bumper_play" });

    // Without tiles, decorative prop is still clickable
    tiles.length = 0;
    props.pop(); // remove playable bumper
    expect(picker.pickInteractiveTarget(raycaster)).toEqual({ kind: "prop", id: "arch_decor" });
  });
});

