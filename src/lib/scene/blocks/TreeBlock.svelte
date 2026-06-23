<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { MeshStandardMaterial } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;
  export let variation = 1; 
  
  $: actualRotation = Array.isArray(rotation) ? rotation : [0, Math.PI * rotation, 0];
  
  const woodMaterial = new MeshStandardMaterial({ color: "#5c4033", roughness: 0.9, flatShading: true });
  const leavesMaterial = new MeshStandardMaterial({ color: "#2d5a27", roughness: 0.8, flatShading: true });
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <!-- Collider covers the trunk -->
    <Collider shape="cylinder" args={[0.5, 0.3]} position={[0, 0.5, 0]} collisionGroups={0x0001FFFF} />
    
    <!-- Trunk -->
    <T.Mesh material={woodMaterial} castShadow receiveShadow position={[0, 0.5, 0]}>
      <T.CylinderGeometry args={[0.2, 0.3, 1, 8]} />
    </T.Mesh>

    <!-- Leaves -->
    {#if variation === 1}
      <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 2, 0]}>
        <T.ConeGeometry args={[1.2, 2.5, 8]} />
      </T.Mesh>
    {:else}
      <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 1.8, 0]}>
        <T.DodecahedronGeometry args={[1.2, 1]} />
      </T.Mesh>
    {/if}
  </RigidBody>
</T.Group>
