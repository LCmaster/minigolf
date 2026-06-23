<script>
  import { T } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";
  import { MeshToonMaterial } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;
  export let variation = 1; 
  
  $: actualRotation = Array.isArray(rotation) ? rotation : [0, Math.PI * rotation, 0];
  
  const rockMaterial = new MeshToonMaterial({ color: "#9BA4B5" }); // Vibrant slate grey
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <AutoColliders shape="convexHull" collisionGroups={0x0001FFFF}>
      {#if variation === 1}
        <!-- Chunky Dodecahedron Cluster -->
        <T.Group position={[0, 0, 0]}>
          <!-- Main Center Rock -->
          <T.Mesh material={rockMaterial} castShadow receiveShadow position={[0, 1.5, 0]} scale={[1, 0.8, 1]} rotation={[0.1, 0.2, 0]}>
            <T.DodecahedronGeometry args={[2.5, 0]} />
          </T.Mesh>
          <!-- Side Rock Right -->
          <T.Mesh material={rockMaterial} castShadow receiveShadow position={[1.8, 0.8, 1.0]} scale={[1.2, 0.7, 1]} rotation={[0, 0.8, 0.5]}>
            <T.DodecahedronGeometry args={[1.8, 0]} />
          </T.Mesh>
          <!-- Side Rock Left -->
          <T.Mesh material={rockMaterial} castShadow receiveShadow position={[-1.5, 0.6, -0.8]} scale={[1, 0.6, 1.3]} rotation={[1.0, 0, 0]}>
            <T.DodecahedronGeometry args={[1.5, 0]} />
          </T.Mesh>
        </T.Group>
      {:else}
        <!-- Flatter Icosahedron Cluster -->
        <T.Group position={[0, 0, 0]}>
          <!-- Main Rock -->
          <T.Mesh material={rockMaterial} castShadow receiveShadow position={[0, 1.0, 0]} scale={[1.2, 0.6, 1]} rotation={[0, 0.5, 0.1]}>
            <T.IcosahedronGeometry args={[2.2, 0]} />
          </T.Mesh>
          <!-- Flat Side Rock -->
          <T.Mesh material={rockMaterial} castShadow receiveShadow position={[-1.8, 0.7, 1.2]} scale={[1, 0.5, 1.2]} rotation={[0.2, -0.3, 0]}>
            <T.IcosahedronGeometry args={[1.8, 0]} />
          </T.Mesh>
          <!-- Small Wedge -->
          <T.Mesh material={rockMaterial} castShadow receiveShadow position={[1.6, 0.6, -1.0]} scale={[1.3, 0.7, 1]} rotation={[-0.1, 0.4, 0]}>
            <T.IcosahedronGeometry args={[1.6, 0]} />
          </T.Mesh>
        </T.Group>
      {/if}
    </AutoColliders>
  </RigidBody>
</T.Group>
