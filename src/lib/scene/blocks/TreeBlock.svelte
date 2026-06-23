<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { MeshToonMaterial } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;
  export let variation = 1; 
  
  $: actualRotation = Array.isArray(rotation) ? rotation : [0, Math.PI * rotation, 0];
  
  const woodMaterial = new MeshToonMaterial({ color: "#8B5A2B" }); // Vibrant warm brown
  const leavesMaterial = new MeshToonMaterial({ color: "#32CD32" }); // Vibrant lime green
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <!-- Collider covers the trunk and part of the leaves -->
    <Collider shape="cylinder" args={[1.0, 0.4]} position={[0, 1.0, 0]} collisionGroups={0x0001FFFF} />
    
    <!-- Trunk (Tapered) -->
    <T.Mesh material={woodMaterial} castShadow receiveShadow position={[0, 0.5, 0]}>
      <T.CylinderGeometry args={[0.15, 0.3, 1, 8]} />
    </T.Mesh>

    <!-- Leaves -->
    {#if variation === 1}
      <!-- Layered Pine Stack -->
      <T.Group position={[0, 0, 0]}>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 1.2, 0]}>
          <T.ConeGeometry args={[1.4, 1.5, 8]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 2.0, 0]}>
          <T.ConeGeometry args={[1.1, 1.2, 8]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 2.7, 0]}>
          <T.ConeGeometry args={[0.8, 1.0, 8]} />
        </T.Mesh>
      </T.Group>
    {:else}
      <!-- Fluffy Cloud Canopy -->
      <T.Group position={[0, 0, 0]}>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 2.0, 0]}>
          <T.IcosahedronGeometry args={[1.1, 1]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0.7, 1.8, 0.5]}>
          <T.IcosahedronGeometry args={[0.8, 1]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[-0.8, 1.9, -0.2]}>
          <T.IcosahedronGeometry args={[0.9, 1]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0.2, 1.7, -0.8]}>
          <T.IcosahedronGeometry args={[0.75, 1]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0.1, 2.8, 0.1]}>
          <T.IcosahedronGeometry args={[0.7, 1]} />
        </T.Mesh>
      </T.Group>
    {/if}
  </RigidBody>
</T.Group>
