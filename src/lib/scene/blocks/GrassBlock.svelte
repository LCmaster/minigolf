<script>
  import { T } from "@threlte/core";
  import { MeshToonMaterial } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let variation = 1; 
  export let isEditor = false; // Just to accept the prop without warning
  
  $: actualRotation = Array.isArray(rotation) ? rotation : [0, Math.PI * rotation, 0];
  
  const grassMaterial = new MeshToonMaterial({ color: "#a3e635" }); // Vibrant lime/yellow-green
</script>

<!-- No physics, purely decorative visual element -->
<T.Group {position} rotation={actualRotation} {scale}>
  {#if variation === 1}
    <!-- Single Small Tuft -->
    <T.Group position={[0, 0, 0]}>
      <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0.2, 1.5, 0]} rotation={[0, 0, -0.2]}>
        <T.ConeGeometry args={[0.5, 3.0, 4]} />
      </T.Mesh>
      <T.Mesh material={grassMaterial} castShadow receiveShadow position={[-0.2, 1.3, 0.2]} rotation={[0.2, 1.0, 0.2]}>
        <T.ConeGeometry args={[0.4, 2.6, 4]} />
      </T.Mesh>
      <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0, 1.7, -0.3]} rotation={[-0.2, 2.0, 0]}>
        <T.ConeGeometry args={[0.6, 3.4, 4]} />
      </T.Mesh>
      <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0.3, 1.2, 0.3]} rotation={[0.3, -1.0, -0.3]}>
        <T.ConeGeometry args={[0.3, 2.4, 4]} />
      </T.Mesh>
    </T.Group>
  {:else}
    <!-- Wild Overgrown Patch (3 Tufts) -->
    <T.Group position={[0, 0, 0]}>
      <!-- Tuft 1 (Center) -->
      <T.Group position={[0, 0, 0]} scale={[1, 1, 1]}>
        <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0.2, 1.5, 0]} rotation={[0, 0, -0.2]}>
          <T.ConeGeometry args={[0.5, 3.0, 4]} />
        </T.Mesh>
        <T.Mesh material={grassMaterial} castShadow receiveShadow position={[-0.2, 1.3, 0.2]} rotation={[0.2, 1.0, 0.2]}>
          <T.ConeGeometry args={[0.4, 2.6, 4]} />
        </T.Mesh>
        <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0, 1.7, -0.3]} rotation={[-0.2, 2.0, 0]}>
          <T.ConeGeometry args={[0.6, 3.4, 4]} />
        </T.Mesh>
      </T.Group>
      
      <!-- Tuft 2 (Left) -->
      <T.Group position={[-1.5, 0, 0.5]} scale={[0.8, 0.8, 0.8]} rotation={[0, 1.5, 0]}>
        <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0.2, 1.5, 0]} rotation={[0, 0, -0.2]}>
          <T.ConeGeometry args={[0.5, 3.0, 4]} />
        </T.Mesh>
        <T.Mesh material={grassMaterial} castShadow receiveShadow position={[-0.2, 1.3, 0.2]} rotation={[0.2, 1.0, 0.2]}>
          <T.ConeGeometry args={[0.4, 2.6, 4]} />
        </T.Mesh>
      </T.Group>

      <!-- Tuft 3 (Right) -->
      <T.Group position={[1.2, 0, -0.8]} scale={[0.9, 0.9, 0.9]} rotation={[0, -1.0, 0]}>
        <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0.2, 1.5, 0]} rotation={[0, 0, -0.2]}>
          <T.ConeGeometry args={[0.5, 3.0, 4]} />
        </T.Mesh>
        <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0, 1.7, -0.3]} rotation={[-0.2, 2.0, 0]}>
          <T.ConeGeometry args={[0.6, 3.4, 4]} />
        </T.Mesh>
      </T.Group>
    </T.Group>
  {/if}
</T.Group>
