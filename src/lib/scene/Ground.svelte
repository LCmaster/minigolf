<script>
  import { T } from "@threlte/core";
  import { AutoColliders, Collider, RigidBody } from "@threlte/rapier";
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

<!-- Infinite ground plane — cheapest possible Rapier collider (halfspace) -->
<RigidBody type="fixed" position={[0, -1, 0]}>
  <!-- Halfspace normal points up (Y+) -->
  <Collider
    shape="halfspace"
    args={[{ x: 0, y: 1, z: 0 }]}
    collisionGroups={0x0001FFFF}
    on:contact={() => dispatch("outofbounds")}
  />
</RigidBody>

<!-- Visual ground mesh (no physics, pure visuals) -->
<T.Mesh position={[0, -1.05, 0]} receiveShadow>
  <T.BoxGeometry args={[1000, 0.1, 1000]} />
  <T.MeshStandardMaterial
    map={checkerTexture}
    color={"#7AA966"}
    roughness={0.8}
  />
</T.Mesh>
