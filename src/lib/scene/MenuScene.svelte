<script>
  import { T } from "@threlte/core";
  import { useGltf } from "@threlte/extras";

  const gltf = useGltf("/MainMenuScreen.gltf");
</script>

<T.PerspectiveCamera
  makeDefault
  fov={65}
  position={[3, 10, 5]}
  on:create={({ ref }) => {
    ref.lookAt(0, 0, -2.5);
  }}
/>
<T.DirectionalLight
  color="#ffffff"
  intensity={2}
  position={[10, 10, 10]}
  castShadow
/>
{#if $gltf}
  {#each Object.values($gltf.scene.children) as child}
    <T
      is={child}
      castshadow={child.name !== "Ground"}
      receiveShadow={child.name === "Ground" || child.name === "Hole"}
      geometry={child.geometry}
      material={child.material}
      position={[...child.position]}
    />
  {/each}
{/if}
