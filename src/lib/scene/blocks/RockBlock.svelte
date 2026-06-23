<script>
  import { T } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";
  import { MeshStandardMaterial } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;
  export let variation = 1; 
  
  $: actualRotation = Array.isArray(rotation) ? rotation : [0, Math.PI * rotation, 0];
  
  const rockMaterial = new MeshStandardMaterial({ color: "#808080", roughness: 1.0, flatShading: true });
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <AutoColliders shape="convexHull" collisionGroups={0x0001FFFF}>
      {#if variation === 1}
        <T.Mesh material={rockMaterial} castShadow receiveShadow position={[0, 0.5, 0]} scale={[1, 0.6, 1.2]}>
          <T.DodecahedronGeometry args={[1, 0]} />
        </T.Mesh>
      {:else}
        <T.Mesh material={rockMaterial} castShadow receiveShadow position={[0, 0.4, 0]} scale={[1.2, 0.5, 1]}>
          <T.IcosahedronGeometry args={[1, 0]} />
        </T.Mesh>
      {/if}
    </AutoColliders>
  </RigidBody>
</T.Group>
