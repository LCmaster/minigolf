<script>
  import { T } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";
  import {
    DataTexture,
    RGBAFormat,
    NearestFilter,
    RepeatWrapping,
  } from "three";

  const dispatch = createEventDispatcher();

  // Create a 2x2 checkerboard texture for grass
  const checkerData = new Uint8Array([
    86,
    125,
    70,
    255, // Light green (#567D46)
    74,
    107,
    60,
    255, // Dark green
    74,
    107,
    60,
    255, // Dark green
    86,
    125,
    70,
    255, // Light green
  ]);
  const checkerTexture = new DataTexture(checkerData, 2, 2, RGBAFormat);
  checkerTexture.wrapS = RepeatWrapping;
  checkerTexture.wrapT = RepeatWrapping;
  checkerTexture.magFilter = NearestFilter;
  checkerTexture.minFilter = NearestFilter;
  checkerTexture.repeat.set(500, 500);
  checkerTexture.needsUpdate = true;
</script>

<!-- Ground / out-of-bounds floor -->
<RigidBody type="fixed">
  <AutoColliders shape={"cuboid"} on:contact={() => dispatch("outofbounds")}>
    <T.Mesh>
      <T.BoxGeometry args={[1000, 0.1, 1000]} />
      <T.MeshStandardMaterial
        map={checkerTexture}
        color={"#7AA966"}
        roughness={0.8}
      />
    </T.Mesh>
  </AutoColliders>
</RigidBody>
