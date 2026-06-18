<script>
  import {
    Shape,
    Vector3,
    Float32BufferAttribute,
    BufferGeometry,
    DoubleSide,
  } from "three";
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

  // Custom function to create geometry for a path of straight lines with miter joints
  function createMiterGeometry(shape, points) {
    if (points.length < 2) return new BufferGeometry();

    const shapePoints = shape.getPoints();
    const vertexCount = shapePoints.length * points.length;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = [];

    let pathDist = 0;

    for (let i = 0; i < points.length; i++) {
      if (i > 0) {
        pathDist += points[i].distanceTo(points[i - 1]);
      }

      let R = new Vector3();
      let U = new Vector3();
      let miterScaleX = 1;

      if (i === 0) {
        const d = new Vector3().subVectors(points[1], points[0]).normalize();
        R.crossVectors(d, new Vector3(0, 1, 0)).normalize();
        U.crossVectors(R, d).normalize();
      } else if (i === points.length - 1) {
        const d = new Vector3().subVectors(points[i], points[i - 1]).normalize();
        R.crossVectors(d, new Vector3(0, 1, 0)).normalize();
        U.crossVectors(R, d).normalize();
      } else {
        const d1 = new Vector3().subVectors(points[i], points[i - 1]).normalize();
        const d2 = new Vector3().subVectors(points[i + 1], points[i]).normalize();

        const n = new Vector3().addVectors(d1, d2).normalize();

        if (n.lengthSq() < 0.001) {
          // Fallback for 180 degree turns
          R.crossVectors(d1, new Vector3(0, 1, 0)).normalize();
          U.crossVectors(R, d1).normalize();
        } else {
          R.crossVectors(n, new Vector3(0, 1, 0)).normalize();
          U.crossVectors(R, n).normalize();

          const r1 = new Vector3().crossVectors(d1, new Vector3(0, 1, 0)).normalize();
          const dot = R.dot(r1);
          if (dot > 0.01) {
            miterScaleX = 1 / dot;
          }
        }
      }

      for (let j = 0; j < shapePoints.length; j++) {
        const sp = shapePoints[j];
        // Based on original ExtrudeGeometry mapping: Shape X maps to UP, Shape Y maps to RIGHT
        const pos = new Vector3()
          .copy(points[i])
          .addScaledVector(U, -sp.x)
          .addScaledVector(R, -sp.y * miterScaleX);

        const offset = (i * shapePoints.length + j) * 3;
        positions[offset] = pos.x;
        positions[offset + 1] = pos.y;
        positions[offset + 2] = pos.z;

        const uvOffset = (i * shapePoints.length + j) * 2;
        uvs[uvOffset] = j / (shapePoints.length - 1 || 1);
        uvs[uvOffset + 1] = pathDist;
      }
    }

    for (let i = 0; i < points.length - 1; i++) {
      for (let j = 0; j < shapePoints.length - 1; j++) {
        const a = i * shapePoints.length + j;
        const b = i * shapePoints.length + j + 1;
        const c = (i + 1) * shapePoints.length + j;
        const d = (i + 1) * shapePoints.length + j + 1;

        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo.toNonIndexed();
  }

  let baseGeo = null;
  let tileGeo = null;
  let leftWallGeo = null;
  let rightWallGeo = null;

  $: {
    disposeGeometry();
    if (controlPoints.length > 1) {
      const pts = controlPoints.map((p) => new Vector3(...p.position));
      baseGeo = createMiterGeometry(baseShape, pts);
      tileGeo = createMiterGeometry(tileShape, pts);
      leftWallGeo = createMiterGeometry(wallsShape, pts);
      rightWallGeo = createMiterGeometry(rightWallShape, pts);

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

  $: startTangent =
    controlPoints.length > 1
      ? new Vector3()
          .subVectors(
            new Vector3(...controlPoints[1].position),
            new Vector3(...controlPoints[0].position),
          )
          .normalize()
      : new Vector3(0, 0, 1);
  $: endTangent =
    controlPoints.length > 1
      ? new Vector3()
          .subVectors(
            new Vector3(...controlPoints[controlPoints.length - 1].position),
            new Vector3(...controlPoints[controlPoints.length - 2].position),
          )
          .normalize()
      : new Vector3(0, 0, 1);
</script>

{#if baseGeo}
  <!-- Visual meshes (always rendered regardless of physics mode) -->
  <T.Group>
    <T.Mesh geometry={baseGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#888888" side={DoubleSide} />
    </T.Mesh>
    <T.Mesh geometry={tileGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#567D46" side={DoubleSide} />
    </T.Mesh>
    <T.Mesh geometry={leftWallGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#8B5A2B" side={DoubleSide} />
    </T.Mesh>
    <T.Mesh geometry={rightWallGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#8B5A2B" side={DoubleSide} />
    </T.Mesh>
  </T.Group>

  <!-- Physics collider (only in gameplay/test mode) -->
  {#if !noPhysics}
    <RigidBody type="fixed">
      <AutoColliders shape="trimesh">
        <T.Group>
          <T.Mesh geometry={baseGeo} castShadow receiveShadow>
            <T.MeshStandardMaterial color="#888888" side={DoubleSide} />
          </T.Mesh>
          <T.Mesh geometry={tileGeo} castShadow receiveShadow>
            <T.MeshStandardMaterial color="#567D46" side={DoubleSide} />
          </T.Mesh>
          <T.Mesh geometry={leftWallGeo} castShadow receiveShadow>
            <T.MeshStandardMaterial color="#8B5A2B" side={DoubleSide} />
          </T.Mesh>
          <T.Mesh geometry={rightWallGeo} castShadow receiveShadow>
            <T.MeshStandardMaterial color="#8B5A2B" side={DoubleSide} />
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
