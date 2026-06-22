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
  // We'll use a spiral loop
  const loopRadius = 1.5;
  const curve = new CatmullRomCurve3([
    new Vector3(0, 0, 2.5),
    new Vector3(0, 0, 1.5),
    // start climbing and moving forward (-Z)
    new Vector3(-0.2, loopRadius * 0.2, 0.5),
    // vertical
    new Vector3(-0.4, loopRadius * 1.0, 0.0),
    // top of loop (going backwards, +Z)
    new Vector3(0, loopRadius * 2.0, 0.5),
    // descending
    new Vector3(0.4, loopRadius * 1.0, 1.0),
    // bottom of loop (going forwards again, -Z)
    new Vector3(0.2, loopRadius * 0.2, 0.5),
    // exit straight
    new Vector3(0, 0, -0.5),
    new Vector3(0, 0, -1.5),
    new Vector3(0, 0, -2.5),
  ]);

  const extrudeSettings = {
    steps: 64, // high resolution for smooth loop
    extrudePath: curve,
    bevelEnabled: false,
  };

  const geometry = new ExtrudeGeometry(shape, extrudeSettings);
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <AutoColliders shape="trimesh">
    <T.Mesh {geometry} material={groundMaterial} castShadow receiveShadow />
  </AutoColliders>
</T.Group>
