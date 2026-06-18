<script>
  import {
    Shape,
    Vector3,
    CatmullRomCurve3,
    ExtrudeGeometry,
    BufferGeometry,
  } from "three";
  import { onDestroy } from "svelte";
  import { T } from "@threlte/core";
  import { AutoColliders } from "@threlte/rapier";
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

  $: {
    disposeGeometry();
    if (controlPoints.length > 1 && curve) {
      const extrudeSettings = {
        extrudePath: curve,
        steps: Math.max(10, controlPoints.length * 10),
        bevelEnabled: false,
      };
      baseGeo = new ExtrudeGeometry(baseShape, extrudeSettings);
      tileGeo = new ExtrudeGeometry(tileShape, extrudeSettings);
      leftWallGeo = new ExtrudeGeometry(wallsShape, extrudeSettings);
      rightWallGeo = new ExtrudeGeometry(rightWallShape, extrudeSettings);
      // store in previousGeometry to dispose later
      previousGeometry = [baseGeo, tileGeo, leftWallGeo, rightWallGeo];
    } else {
      baseGeo = tileGeo = leftWallGeo = rightWallGeo = null;
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

  $: curve =
    controlPoints.length > 1
      ? new CatmullRomCurve3(
          controlPoints.map((p) => new Vector3(...p.position)),
        )
      : null;

  $: startTangent =
    controlPoints.length > 1 && curve
      ? curve.getTangentAt(0)
      : new Vector3(0, 0, 1);
  $: endTangent =
    controlPoints.length > 1 && curve
      ? curve.getTangentAt(1)
      : new Vector3(0, 0, 1);
</script>

{#if noPhysics && baseGeo}
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
{:else if baseGeo}
  <T.Group>
    <AutoColliders shape="convexHull">
      <T.Mesh geometry={baseGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#888888" />
      </T.Mesh>
    </AutoColliders>
    <AutoColliders shape="convexHull">
      <T.Mesh geometry={tileGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#567D46" />
      </T.Mesh>
    </AutoColliders>
    <AutoColliders shape="convexHull">
      <T.Mesh geometry={leftWallGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#8B5A2B" />
      </T.Mesh>
    </AutoColliders>
    <AutoColliders shape="convexHull">
      <T.Mesh geometry={rightWallGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#8B5A2B" />
      </T.Mesh>
    </AutoColliders>
  </T.Group>
{/if}

{#if controlPoints.length > 0}
  <TrackBlock
    type="start"
    shape={controlPoints[0].shape || "square"}
    position={startPos}
    tangent={startTangent}
    isEditor={noPhysics}
  />
{/if}

{#if controlPoints.length > 0}
  <TrackBlock
    type="end"
    shape={controlPoints[controlPoints.length - 1].shape || "square"}
    position={endPos}
    tangent={endTangent}
    isEditor={noPhysics}
  />
{/if}
