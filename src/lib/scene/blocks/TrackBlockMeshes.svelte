<script>
  import { T } from "@threlte/core";

  export let type = "start";
  export let shape = "square";
  export let totalWidth;
  export let floorDepth;
  export let blockLength;
  export let w;
  export let t;
  export let h;
  export let color;
  export let roundedWallGeo;
</script>

{#if shape === "square"}
  <!-- Base -->
  <T.Mesh position={[0, floorDepth / 2, 0]} receiveShadow>
    <T.BoxGeometry args={[totalWidth, floorDepth, blockLength]} />
    <T.MeshStandardMaterial color="#888888" />
  </T.Mesh>

  <!-- Tile (Green Felt) -->
  <T.Mesh position={[0, floorDepth + 0.01, 0]} receiveShadow>
    <T.BoxGeometry args={[w * 2, 0.02, blockLength]} />
    <T.MeshStandardMaterial color="#567D46" />
  </T.Mesh>

  <!-- Left Wall -->
  <T.Mesh position={[-w - t / 2, floorDepth + (h - floorDepth) / 2, 0]} castShadow receiveShadow>
    <T.BoxGeometry args={[t, h - floorDepth, blockLength]} />
    <T.MeshStandardMaterial color="#8B5A2B" />
  </T.Mesh>

  <!-- Right Wall -->
  <T.Mesh position={[w + t / 2, floorDepth + (h - floorDepth) / 2, 0]} castShadow receiveShadow>
    <T.BoxGeometry args={[t, h - floorDepth, blockLength]} />
    <T.MeshStandardMaterial color="#8B5A2B" />
  </T.Mesh>

  <!-- Back Wall -->
  {#if type === "start"}
    <T.Mesh position={[0, floorDepth + (h - floorDepth) / 2, -blockLength / 2 + t / 2]} castShadow receiveShadow>
      <T.BoxGeometry args={[totalWidth, h - floorDepth, t]} />
      <T.MeshStandardMaterial color="#8B5A2B" />
    </T.Mesh>
  {:else}
    <T.Mesh position={[0, floorDepth + (h - floorDepth) / 2, blockLength / 2 - t / 2]} castShadow receiveShadow>
      <T.BoxGeometry args={[totalWidth, h - floorDepth, t]} />
      <T.MeshStandardMaterial color="#8B5A2B" />
    </T.Mesh>
  {/if}
{:else}
  <!-- Rounded Base -->
  <T.Mesh position={[0, floorDepth / 2, 0]} receiveShadow>
    <T.CylinderGeometry args={[totalWidth / 2, totalWidth / 2, floorDepth, 32]} />
    <T.MeshStandardMaterial color="#888888" />
  </T.Mesh>

  <!-- Rounded Tile -->
  <T.Mesh position={[0, floorDepth + 0.01, 0]} receiveShadow>
    <T.CylinderGeometry args={[w, w, 0.02, 32]} />
    <T.MeshStandardMaterial color="#567D46" />
  </T.Mesh>

  <!-- Rounded Wall -->
  {#if roundedWallGeo}
    <T.Mesh geometry={roundedWallGeo} position={[0, floorDepth, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#8B5A2B" />
    </T.Mesh>
  {/if}
{/if}

<!-- Indicators -->
{#if type === "start"}
  <T.Mesh position={[0, floorDepth + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <T.CircleGeometry args={[0.4, 32]} />
    <T.MeshStandardMaterial color="#4ade80" />
  </T.Mesh>
{:else}
  <!-- Hole indicator (a black circle) -->
  <T.Mesh position={[0, floorDepth + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <T.CircleGeometry args={[0.4, 32]} />
    <T.MeshStandardMaterial color="#111111" />
  </T.Mesh>
  
  <!-- Flag pole -->
  <T.Mesh position={[0, floorDepth + 1.0, 0]} castShadow receiveShadow>
    <T.CylinderGeometry args={[0.02, 0.02, 2, 8]} />
    <T.MeshStandardMaterial color="#cccccc" />
  </T.Mesh>
  
  <!-- Flag -->
  <T.Mesh position={[0.3, floorDepth + 1.8, 0]} castShadow receiveShadow>
    <T.BoxGeometry args={[0.6, 0.3, 0.02]} />
    <T.MeshStandardMaterial color="#ef4444" />
  </T.Mesh>
{/if}
