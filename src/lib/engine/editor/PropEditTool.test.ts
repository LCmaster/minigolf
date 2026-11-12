import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { PropEditTool } from "./PropEditTool";
import { HistoryManager } from "./HistoryManager";

describe("PropEditTool", () => {
  function setup() {
    const scene = new THREE.Scene();
    const props = new Map<string, any>();
    const courseManager: any = {
      addProp: vi.fn((data: any) => {
        const g = new THREE.Group();
        g.position.set(...data.position);
        const inst = { propData: { ...data }, group: g, colliders: [] };
        props.set(data.instanceId, inst);
        return inst;
      }),
      removeProp: vi.fn((id: string) => props.delete(id)),
      getProp: vi.fn((id: string) => props.get(id)),
      updatePropTransform: vi.fn((id: string, pos: any, rot: any) => {
        const existing = props.get(id);
        if (!existing) return false;
        existing.propData.position = pos;
        existing.propData.rotation = rot;
        existing.group.position.set(...pos);
        return true;
      }),
    };

    const meshPlay = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
    const gPlay = new THREE.Group();
    gPlay.add(meshPlay);

    const meshDecor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
    const gDecor = new THREE.Group();
    gDecor.add(meshDecor);

    const assetLoader: any = {
      getPiece: (id: string) => {
        if (id === "prop_bumper") {
          return { metadata: { id, propRole: "playable" }, visualTemplate: gPlay };
        }
        return { metadata: { id, propRole: "decorative" }, visualTemplate: gDecor };
      },
    };

    const history = new HistoryManager();
    const onToolStateChanged = vi.fn();
    const onCourseModified = vi.fn();
    const onPropPlaced = vi.fn();

    const tool = new PropEditTool({
      scene,
      courseManager,
      assetLoader,
      history,
      onToolStateChanged,
      onCourseModified,
      onPropPlaced,
    });

    return { scene, props, courseManager, history, tool, onCourseModified, onPropPlaced };
  }

  it("tints ghost previews amber for playable props and emerald for decorative props", () => {
    const { scene, tool } = setup();
    const ghost = scene.getObjectByName("Editor_PropGhost") as THREE.Group;
    expect(ghost).toBeDefined();
    expect(ghost.visible).toBe(false);

    tool.setSelectedProp("prop_bumper");
    expect(ghost.visible).toBe(true);
    let matColor = 0;
    ghost.traverse((c) => {
      if (c instanceof THREE.Mesh) matColor = (c.material as THREE.MeshBasicMaterial).color.getHex();
    });
    expect(matColor).toBe(0xfbbf24);

    tool.setSelectedProp("prop_tree");
    ghost.traverse((c) => {
      if (c instanceof THREE.Mesh) matColor = (c.material as THREE.MeshBasicMaterial).color.getHex();
    });
    expect(matColor).toBe(0x34d399);
  });

  it("places, drags, rotates, undoes, and deletes props via HistoryManager", () => {
    const { scene, props, history, tool, onPropPlaced } = setup();
    const ring = scene.getObjectByName("Editor_SelectionRing") as THREE.Mesh;

    tool.rotateBrush(45);
    expect(tool.getPropRotationY()).toBe(45);

    tool.placePropAtPoint("prop_bumper", new THREE.Vector3(2, 0, -4));
    expect(onPropPlaced).toHaveBeenCalledTimes(1);
    const id = Array.from(props.keys())[0];

    tool.selectPlacedProp(id);
    expect(ring.visible).toBe(true);
    expect(tool.beginDrag(id)).toBe(true);
    tool.updateHoverAndDrag(new THREE.Vector3(5, 0, -8));
    expect(tool.finishDrag()).toBe(true);
    expect(props.get(id).propData.position).toEqual([5, 0, -8]);

    tool.rotatePlacedProp(id, 45);
    expect(props.get(id).propData.rotation[1]).toBe(90);

    history.undo();
    expect(props.get(id).propData.rotation[1]).toBe(45);

    tool.deleteProp(id);
    expect(props.size).toBe(0);

    tool.dispose();
    expect(scene.getObjectByName("Editor_PropGhost")).toBeUndefined();
    expect(scene.getObjectByName("Editor_SelectionRing")).toBeUndefined();
  });
});
