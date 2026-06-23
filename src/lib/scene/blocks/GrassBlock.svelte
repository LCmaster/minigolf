<script>
  import { T } from "@threlte/core";
  import { MeshStandardMaterial } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let variation = 1; 
  export let isEditor = false; // Just to accept the prop without warning
  
  $: actualRotation = Array.isArray(rotation) ? rotation : [0, Math.PI * rotation, 0];
  
  const grassMaterial = new MeshStandardMaterial({ color: "#4ade80", roughness: 1.0, flatShading: true });
</script>

<!-- No physics, purely decorative visual element -->
<T.Group {position} rotation={actualRotation} {scale}>
  {#if variation === 1}
    <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0, 0.1, 0]}>
      <T.BoxGeometry args={[1, 0.2, 1]} />
    </T.Mesh>
  {:else}
    <T.Mesh material={grassMaterial} castShadow receiveShadow position={[0, 0.15, 0]}>
      <T.BoxGeometry args={[1.5, 0.3, 1.5]} />
    </T.Mesh>
  {/if}
</T.Group>
