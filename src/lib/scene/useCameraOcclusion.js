/**
 * useCameraOcclusion — Threlte frame hook
 *
 * Raycasts from the active camera toward the ball each frame.
 * Any scenery mesh (userData.isScenery = true) that intersects the ray
 * is faded to 20% opacity so the ball is never hidden behind geometry.
 * Materials are restored to their original opacity when they stop occluding.
 *
 * Note on Threlte v6 context values:
 *   - `scene`  → direct THREE.Scene reference (NOT a store)
 *   - `camera` → Svelte readable store wrapping THREE.Camera
 *
 * @param {object} threlteCtx  - return value of useThrelte()
 * @param {{ position: number[] }} playerState  - mutable ref to current player position
 */

import { useFrame } from "@threlte/core";
import { get } from "svelte/store";
import { Raycaster, Vector3 } from "three";

export function useCameraOcclusion(threlteCtx, playerState) {
  // scene is a direct THREE.Scene — do NOT call get() on it
  // camera is a Svelte store — use get() to read the current camera
  const { scene, camera } = threlteCtx;

  const raycaster = new Raycaster();
  const dir = new Vector3();
  let currentlyOccludedMaterials = new Set();

  useFrame(() => {
    const activeCam = get(camera); // camera IS a store
    const pos = playerState.position;
    if (!activeCam || !pos) return;

    const playerV = new Vector3(pos[0], pos[1], pos[2]);
    const camPos = new Vector3();
    activeCam.getWorldPosition(camPos);

    dir.subVectors(playerV, camPos);
    const distance = dir.length();
    dir.normalize();

    raycaster.set(camPos, dir);
    // scene is a direct THREE.Scene reference — use scene.children directly
    const hits = raycaster.intersectObjects(scene.children, true);

    const newlyOccludedMeshes = new Set();

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      if (hit.distance >= distance) break; // Past the ball — stop

      let obj = hit.object;
      let isScenery = false;
      let sceneryRoot = null;

      while (obj) {
        if (obj.userData?.isScenery) {
          isScenery = true;
          sceneryRoot = obj;
          break;
        }
        obj = obj.parent;
      }

      if (isScenery && sceneryRoot) {
        sceneryRoot.traverse((child) => {
          if (child.isMesh && child.material) {
            newlyOccludedMeshes.add(child);
          }
        });
      }
    }

    const newlyOccludedMaterials = new Set();

    // Fade newly occluding materials
    newlyOccludedMeshes.forEach((obj) => {
      const mat = obj.material;
      if (!currentlyOccludedMaterials.has(mat)) {
        mat.userData.origTransparent = mat.transparent;
        mat.userData.origOpacity = mat.opacity;
        mat.transparent = true;
        mat.opacity = 0.2;
        mat.depthWrite = false;
        currentlyOccludedMaterials.add(mat);
      }
      newlyOccludedMaterials.add(mat);
    });

    // Restore materials that are no longer occluding
    currentlyOccludedMaterials.forEach((mat) => {
      if (!newlyOccludedMaterials.has(mat)) {
        if (mat.userData.origTransparent !== undefined) {
          mat.transparent = mat.userData.origTransparent;
          mat.opacity = mat.userData.origOpacity;
          mat.depthWrite = true;
        }
        currentlyOccludedMaterials.delete(mat);
      }
    });
  });
}
