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

  $: treeRadius = 1.2 * Math.max(scale[0], scale[2]);
  $: treeHalfHeight = 3.0 * scale[1];
</script>

<T.Group {position} rotation={actualRotation} {scale} userData={{ isScenery: true }}>
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <!-- Collider covers the trunk and part of the leaves -->
    {#key scale.join(',')}
      <Collider shape="cylinder" args={[treeHalfHeight, treeRadius]} position={[0, 3.0 * scale[1], 0]} collisionGroups={0x0001FFFF} restitution={0.5} />
    {/key}
    
    <!-- Trunk (Tapered) -->
    <T.Mesh material={woodMaterial} castShadow receiveShadow position={[0, 1.5, 0]}>
      <T.CylinderGeometry args={[0.45, 0.9, 3, 8]} />
    </T.Mesh>

    <!-- Leaves -->
    {#if variation === 1}
      <!-- Layered Pine Stack -->
      <T.Group position={[0, 0, 0]}>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 3.6, 0]}>
          <T.ConeGeometry args={[4.2, 4.5, 8]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 6.0, 0]}>
          <T.ConeGeometry args={[3.3, 3.6, 8]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 8.1, 0]}>
          <T.ConeGeometry args={[2.4, 3.0, 8]} />
        </T.Mesh>
      </T.Group>
    {:else}
      <!-- Fluffy Cloud Canopy -->
      <T.Group position={[0, 0, 0]}>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0, 6.0, 0]}>
          <T.IcosahedronGeometry args={[3.3, 1]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[2.1, 5.4, 1.5]}>
          <T.IcosahedronGeometry args={[2.4, 1]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[-2.4, 5.7, -0.6]}>
          <T.IcosahedronGeometry args={[2.7, 1]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0.6, 5.1, -2.4]}>
          <T.IcosahedronGeometry args={[2.25, 1]} />
        </T.Mesh>
        <T.Mesh material={leavesMaterial} castShadow receiveShadow position={[0.3, 8.4, 0.3]}>
          <T.IcosahedronGeometry args={[2.1, 1]} />
        </T.Mesh>
      </T.Group>
    {/if}
  </RigidBody>
</T.Group>
