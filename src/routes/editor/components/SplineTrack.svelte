<script>
  import {
    Shape,
    Vector3,
    CurvePath,
    LineCurve3,
    ExtrudeGeometry,
    BufferGeometry,
  } from "three";
  import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
  import { onDestroy } from "svelte";
  import { T } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";
  import TrackBlock from "../../../lib/scene/blocks/TrackBlock.svelte";

  export let controlPoints = [];
  export let isEditor = false;
  export let isPreview = false;

  // No physics needed in both editor and preview modes
  $: noPhysics = isEditor || isPreview;

  // Kept outside of any reactive block so that writing to it does NOT
  // re-trigger the reactive geometry builder (which was causing an infinite loop).
  let previousGeometry = null;

  // Base shape: spans full width, height 0 to -0.1
  const baseShape = (() => {
    const s = new Shape();
    const w = 2.5;
    const t = 0.2;
    s.moveTo(0, -w - t);
    s.lineTo(0, w + t);
    s.lineTo(-0.1, w + t);
    s.lineTo(-0.1, -w - t);
    s.lineTo(0, -w - t);
    return s;
  })();

  // Tile shape: the green felt, spans inner width, height -0.1 to -0.12
  const tileShape = (() => {
    const s = new Shape();
    const w = 2.5;
    s.moveTo(-0.1, -w);
    s.lineTo(-0.1, w);
    s.lineTo(-0.12, w);
    s.lineTo(-0.12, -w);
    s.lineTo(-0.1, -w);
    return s;
  })();

  // Walls shape: the two side walls, height -0.1 to -0.5
  const wallsShape = (() => {
    const s = new Shape();
    const w = 2.5;
    const h = 0.5;
    const t = 0.2;
    // Left wall
    s.moveTo(-0.1, w);
    s.lineTo(-0.1, w + t);
    s.lineTo(-h, w + t);
    s.lineTo(-h, w);
    s.lineTo(-0.1, w);
    // Move to Right wall (Shape can have multiple sub-paths using moveTo, or we can use two shapes? Wait, Shape with disjoint parts might not extrude well. Let's use two shapes or just one shape with a hole? No, just add two subpaths... actually ExtrudeGeometry might complain if a single Shape has disjoint contours. Better to use two separate shapes for the walls, or just one geometry for left and one for right.)
    return s;
  })();

  const rightWallShape = (() => {
    const s = new Shape();
    const w = 2.5;
    const h = 0.5;
    const t = 0.2;
    s.moveTo(-0.1, -w - t);
    s.lineTo(-0.1, -w);
    s.lineTo(-h, -w);
    s.lineTo(-h, -w - t);
    s.lineTo(-0.1, -w - t);
    return s;
  })();

  let baseGeo = null;
  let tileGeo = null;
  let leftWallGeo = null;
  let rightWallGeo = null;
  let physicsGeo = null;

  $: {
    disposeGeometry();
    if (controlPoints.length > 1 && curve) {
      const extrudeSettings = {
        extrudePath: curve,
        steps: Math.max(10, controlPoints.length * 10),
        bevelEnabled: false,
      };

      // ExtrudeGeometry creates indexed geometries.
      // Rapier's trimesh collider requires non-indexed geometries,
      // so we convert them immediately.
      baseGeo = new ExtrudeGeometry(baseShape, extrudeSettings).toNonIndexed();
      tileGeo = new ExtrudeGeometry(tileShape, extrudeSettings).toNonIndexed();
      leftWallGeo = new ExtrudeGeometry(
        wallsShape,
        extrudeSettings,
      ).toNonIndexed();
      rightWallGeo = new ExtrudeGeometry(
        rightWallShape,
        extrudeSettings,
      ).toNonIndexed();

      // store in previousGeometry to dispose later
      previousGeometry = [baseGeo, tileGeo, leftWallGeo, rightWallGeo];
    } else {
      baseGeo = tileGeo = leftWallGeo = rightWallGeo = physicsGeo = null;
      previousGeometry = null;
    }
  }

  function disposeGeometry() {
    if (previousGeometry) {
      if (Array.isArray(previousGeometry)) {
        previousGeometry.forEach((g) => g?.dispose());
      } else {
        previousGeometry.dispose();
      }
      previousGeometry = null;
    }
  }

  onDestroy(() => disposeGeometry());

  $: startPos =
    controlPoints.length > 0 ? controlPoints[0].position : [0, 0, 0];
  $: endPos =
    controlPoints.length > 0
      ? controlPoints[controlPoints.length - 1].position
      : [0, 0, 0];

  $: curve = (() => {
    if (controlPoints.length <= 1) return null;
    const path = new CurvePath();
    const vecs = controlPoints.map((p) => new Vector3(...p.position));
    for (let i = 0; i < vecs.length - 1; i++) {
      path.add(new LineCurve3(vecs[i], vecs[i + 1]));
    }
    return path;
  })();

  $: startTangent =
    controlPoints.length > 1 && curve
      ? curve.getTangentAt(0)
      : new Vector3(0, 0, 1);
  $: endTangent =
    controlPoints.length > 1 && curve
      ? curve.getTangentAt(1)
      : new Vector3(0, 0, 1);
</script>

{#if baseGeo}
  <!-- Visual meshes (always rendered regardless of physics mode) -->
  <T.Group>
    <T.Mesh geometry={baseGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#888888" />
    </T.Mesh>
    <T.Mesh geometry={tileGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#567D46" />
    </T.Mesh>
    <T.Mesh geometry={leftWallGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#8B5A2B" />
    </T.Mesh>
    <T.Mesh geometry={rightWallGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#8B5A2B" />
    </T.Mesh>
  </T.Group>

  <!-- Physics collider (only in gameplay/test mode) -->
  {#if !noPhysics}
    <RigidBody type="fixed">
      <AutoColliders shape="trimesh">
        <T.Group>
          <T.Mesh geometry={baseGeo} castShadow receiveShadow>
            <T.MeshStandardMaterial color="#888888" />
          </T.Mesh>
          <T.Mesh geometry={tileGeo} castShadow receiveShadow>
            <T.MeshStandardMaterial color="#567D46" />
          </T.Mesh>
          <T.Mesh geometry={leftWallGeo} castShadow receiveShadow>
            <T.MeshStandardMaterial color="#8B5A2B" />
          </T.Mesh>
          <T.Mesh geometry={rightWallGeo} castShadow receiveShadow>
            <T.MeshStandardMaterial color="#8B5A2B" />
          </T.Mesh>
        </T.Group>
      </AutoColliders>
    </RigidBody>
  {/if}
{/if}

{#if controlPoints.length > 0}
  <TrackBlock
    type="start"
    shape={controlPoints[0].shape || "round"}
    position={startPos}
    tangent={startTangent}
    isEditor={noPhysics}
  />
{/if}

{#if controlPoints.length > 0}
  <TrackBlock
    type="end"
    shape={controlPoints[controlPoints.length - 1].shape || "round"}
    position={endPos}
    tangent={endTangent}
    isEditor={noPhysics}
  />
{/if}
