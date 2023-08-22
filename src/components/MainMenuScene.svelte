<script>
  import { T } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
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
{#await useGltf("/MainMenuScreen.gltf") then gltf}
  <T is={gltf.scene} />
{/await}
