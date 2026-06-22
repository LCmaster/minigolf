<script>
  import { Shape, ExtrudeGeometry, CatmullRomCurve3, Vector3, MeshStandardMaterial } from "three";
  import { T } from "@threlte/core";
  import { AutoColliders } from "@threlte/rapier";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  export let groundMaterial = new MeshStandardMaterial({ color: "#567D46" });

  $: actualRotation = Array.isArray(rotation) ? rotation : [0, Math.PI * rotation, 0];

  // 1. Create the Track Cross-Section Profile (Flat floor + Side walls)
  const trackWidth = 2;
  const wallHeight = 0.5;
  const wallThickness = 0.2;

  const shape = new Shape();
  // Start bottom left
  shape.moveTo(-trackWidth / 2 - wallThickness, -0.1);
  // Bottom right
  shape.lineTo(trackWidth / 2 + wallThickness, -0.1);
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
  // Back to start
  shape.lineTo(-trackWidth / 2 - wallThickness, -0.1);

  // 2. Create the Loop Path
  // Starts at Z=1 (entrance), loops around, ends at Z=-1 (exit)
  const loopRadius = 2.0;
  const loopWidth = 2.5; // Enough X-shift to prevent self-intersection

  // Create a teardrop loop. 
  // It enters from Z=3, starts looping at Z=1, hits the top at Z=0, and exits at Z=-2
  // X shifts continuously to avoid collision.
  const curve = new CatmullRomCurve3([
    new Vector3(-loopWidth / 2, 0, 4.0),
    new Vector3(-loopWidth / 2, 0, 2.0),
    // enter loop
    new Vector3(-loopWidth * 0.3, loopRadius * 0.2, 0.5),
    new Vector3(-loopWidth * 0.1, loopRadius * 1.0, -0.5),
    // top of loop (upside down)
    new Vector3(0, loopRadius * 2.0, 0.0),
    // descending
    new Vector3(loopWidth * 0.1, loopRadius * 1.0, 1.0),
    new Vector3(loopWidth * 0.3, loopRadius * 0.2, 0.5),
    // exit loop
    new Vector3(loopWidth / 2, 0, -1.0),
    new Vector3(loopWidth / 2, 0, -3.0),
  ]);

  const steps = 64;

  const frames = {
    tangents: [],
    normals: [],
    binormals: []
  };

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const t = curve.getTangentAt(u).normalize();
    frames.tangents.push(t);

    // Force the "right" vector (binormal) to always be mostly along the X axis.
    // This prevents the track from banking or twisting.
    const right = new Vector3(1, 0, 0);
    right.sub(t.clone().multiplyScalar(right.dot(t))).normalize();
    // The up vector of the track is Right x Tangent
    const up = new Vector3().crossVectors(right, t).normalize();

    // ExtrudeGeometry maps shape.x to normal and shape.y to binormal.
    // Since our shape.x is the track width (horizontal), we push 'right' to normals.
    // Since our shape.y is the track height (vertical), we push 'up' to binormals.
    frames.normals.push(right);
    frames.binormals.push(up);
  }

  const extrudeSettings = {
    steps: steps,
    extrudePath: curve,
    frames: frames,
    bevelEnabled: false,
  };

  const geometry = new ExtrudeGeometry(shape, extrudeSettings);
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <AutoColliders shape="trimesh">
    <T.Mesh {geometry} material={groundMaterial} castShadow receiveShadow />
  </AutoColliders>
</T.Group>
