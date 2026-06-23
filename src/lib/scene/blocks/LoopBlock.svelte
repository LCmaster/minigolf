<script>
  import {
    Shape,
    ExtrudeGeometry,
    CatmullRomCurve3,
    Vector3,
    MeshStandardMaterial,
  } from "three";
  import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
  import { T } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;

  export let groundMaterial = new MeshStandardMaterial({ color: "#567D46" });

  $: actualRotation = Array.isArray(rotation)
    ? rotation
    : [0, Math.PI * rotation, 0];

  $: sharedLoopGeometry = (() => {
    // 1. Create the Track Cross-Section Profile (Flat floor + Side walls)
    const trackWidth = 2;
    const wallHeight = 0.5;
    const wallThickness = 0.2;

    const shape = new Shape();
    // Start bottom left (thick floor)
    shape.moveTo(-trackWidth / 2 - wallThickness, -0.5);
    // Bottom right
    shape.lineTo(trackWidth / 2 + wallThickness, -0.5);
    // Right wall up
    shape.lineTo(trackWidth / 2 + wallThickness, wallHeight);
    // Right wall inner
    shape.lineTo(trackWidth / 2, wallHeight);
    // Right wall down to floor
    shape.lineTo(trackWidth / 2, 0);
    // Floor to left wall
    shape.lineTo(-trackWidth / 2, 0);
    // Left wall up
    shape.lineTo(-trackWidth / 2, wallHeight);
    // Left wall outer
    shape.lineTo(-trackWidth / 2 - wallThickness, wallHeight);

    // Note: We DO NOT manually lineTo back to the starting point.
    // Three.js automatically closes Shapes. Manually returning to the exact
    // starting point creates a 0-length segment that generates degenerate
    // triangles when extruded, causing Rapier's trimesh WASM to infinite loop!

    // 2. Create the Loop Path
    // Starts at Z=1 (entrance), loops around, ends at Z=-1 (exit)
    const loopRadius = 2.0;
    const loopWidth = 2.5; // Enough X-shift to prevent self-intersection

    // Create a perfectly smooth clothoid-like loop curve using math
    // This prevents CatmullRomCurve3 from pinching the geometry into a solid filled shape
    const numLoopSegments = 40;
    const curvePoints = [];

    // 1. Straight entrance
    curvePoints.push(new Vector3(-loopWidth / 2, 0, 4.0));
    curvePoints.push(new Vector3(-loopWidth / 2, 0, 2.0));
    curvePoints.push(new Vector3(-loopWidth / 2, 0, 0.0));

    // 2. Circular loop
    for (let i = 1; i < numLoopSegments; i++) {
      const t = i / numLoopSegments; // 0 to 1
      const angle = t * Math.PI * 2;

      // Shift X smoothly from -loopWidth/2 to loopWidth/2
      const x = -loopWidth / 2 + t * loopWidth;

      // Y and Z form a perfect circle
      const y = (1 - Math.cos(angle)) * loopRadius;
      const z = -Math.sin(angle) * loopRadius;

      curvePoints.push(new Vector3(x, y, z));
    }

    // 3. Straight exit
    curvePoints.push(new Vector3(loopWidth / 2, 0, 0.0));
    curvePoints.push(new Vector3(loopWidth / 2, 0, -2.0));
    curvePoints.push(new Vector3(loopWidth / 2, 0, -4.0));

    // REVERSE the curve points so the tangent goes along +Z instead of -Z
    // This perfectly aligns with a right-handed coordinate system without flipping axes
    curvePoints.reverse();

    const curve = new CatmullRomCurve3(curvePoints);

    const steps = 64;

    const frames = {
      tangents: [],
      normals: [],
      binormals: [],
    };

    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const t = curve.getTangentAt(u).normalize();
      frames.tangents.push(t);

      // Force the "right" vector (binormal) to always be mostly along the X axis.
      // This prevents the track from banking or twisting.
      const right = new Vector3(1, 0, 0);
      right.sub(t.clone().multiplyScalar(right.dot(t)));

      // Safety fallback: if the curve tangent is exactly aligned with the X-axis,
      // the 'right' vector becomes (0,0,0) resulting in NaN upon normalization.
      if (right.lengthSq() < 0.0001) {
        right.set(0, 0, 1);
        right.sub(t.clone().multiplyScalar(right.dot(t)));
      }

      right.normalize();

      // Since t is now along +Z, t x right = up (+Y)
      const up = new Vector3().crossVectors(t, right).normalize();

      // No negation needed! Right-handed system matches ExtrudeGeometry expectations perfectly.
      frames.normals.push(right);
      frames.binormals.push(up);
    }

    // Override the curve's computeFrenetFrames so ExtrudeGeometry uses our perfectly stable frames
    // instead of its default Frenet-Serret frames which twist violently
    curve.computeFrenetFrames = function () {
      return frames;
    };

    const extrudeSettings = {
      steps: steps,
      extrudePath: curve,
      bevelEnabled: false,
    };

    let geo = new ExtrudeGeometry(shape, extrudeSettings);
    // Merge the vertices! ExtrudeGeometry generates unmerged polygon soup which crashes Rapier
    geo = mergeVertices(geo);
    geo.computeVertexNormals();
    return geo;
  })();
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <AutoColliders shape="trimesh" friction={0.5} restitution={0.2} collisionGroups={0x0001FFFF}>
      <T.Mesh
        geometry={sharedLoopGeometry}
        material={groundMaterial}
        castShadow
        receiveShadow
      />
    </AutoColliders>
  </RigidBody>
</T.Group>
