<script>
  import { Shape, ExtrudeGeometry, MeshStandardMaterial, Vector3 } from "three";
  import { T } from "@threlte/core";
  import { AutoColliders } from "@threlte/rapier";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  export let groundMaterial = new MeshStandardMaterial({ color: "#567D46" });

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];

  // Create a U-shaped half-pipe profile
  const width = 4;
  const height = 1.5;
  const thickness = 0.2;
  const segments = 16;
  
  const shape = new Shape();
  
  // Outer curve (bottom/sides)
  shape.moveTo(-width/2 - thickness, height);
  shape.lineTo(-width/2 - thickness, 0);
  
  // Outer bottom curve
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = Math.PI + (t * Math.PI);
    const r = width/2 + thickness;
    // We only want the bottom half of a circle, so angle from PI to 2PI
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r * (height / width); // squish Y to match height
    shape.lineTo(x, y);
  }
  
  shape.lineTo(width/2 + thickness, height);
  
  // Inner curve
  shape.lineTo(width/2, height);
  
  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    const angle = Math.PI + (t * Math.PI);
    const r = width/2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r * (height / width);
    shape.lineTo(x, y);
  }
  
  shape.lineTo(-width/2, height);
  shape.lineTo(-width/2 - thickness, height);

  // Extrude along Z
  const length = 4;
  const extrudeSettings = {
    steps: 1,
    depth: length,
    bevelEnabled: false,
  };

  const geometry = new ExtrudeGeometry(shape, extrudeSettings);
  
  // The extrude geometry goes from Z=0 to Z=length. We want it centered.
  geometry.translate(0, height, -length / 2);

</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <AutoColliders shape="trimesh">
    <T.Mesh {geometry} material={groundMaterial} castShadow receiveShadow />
  </AutoColliders>
</T.Group>
