<script>
  import { Shape, ExtrudeGeometry, MeshStandardMaterial } from "three";
  import { T } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

  export let type = "ramp"; // 'ramp' or 'slope'
  export let variation = 1;
  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  export let groundMaterial = new MeshStandardMaterial({ color: "#567D46" });

  $: actualRotation = Array.isArray(rotation) ? rotation : [0, Math.PI * rotation, 0];
  
  $: height = variation * 0.5; // Variation 1=0.5, 2=1.0, 3=1.5

  $: geometry = (() => {
    // Draw the side profile (Z and Y axes)
    const shape = new Shape();
    shape.moveTo(1, 0);              // top front
    shape.lineTo(1, -0.2);           // bottom front
    shape.lineTo(-1, -0.2);          // bottom back (solid to the ground)
    shape.lineTo(-1, height);        // top back
    shape.lineTo(1, 0);              // close

    // Extrude by 2 units
    const geo = new ExtrudeGeometry(shape, {
      depth: 2.0,
      bevelEnabled: false,
    });

    // We drew Z on the Shape's X axis. 
    // Extrusion happens along the Shape's Z axis.
    // Rotate -90 degrees on Y to align Extrusion(Z) to World X, and Shape(X) to World Z.
    geo.rotateY(-Math.PI / 2);

    // After rotateY(-90), Extrusion Z (0 to 2) becomes World X (0 to -2).
    // Center the extrusion on the X axis (from [0, -2] to [1, -1])
    geo.translate(1, 0, 0);
    
    geo.computeVertexNormals();
    return geo;
  })();
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type="fixed">
    <AutoColliders shape="convexHull">
      <T.Mesh
        {geometry}
        material={groundMaterial}
        castShadow
        receiveShadow
      />
    </AutoColliders>
  </RigidBody>
</T.Group>
