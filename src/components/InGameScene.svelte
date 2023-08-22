<script>
  import { T } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { OrbitControls } from "@threlte/extras";

  export let stage = "001";
  const gltf = useGltf(`Stage_${stage}.glb`);
</script>

{#if $gltf}
  <T.PerspectiveCamera
    makeDefault
    fov={45}
    position={[0, 15, 25]}
    on:create={({ ref }) => {
      ref.lookAt(0, 0, 0);
    }}
  >
    <OrbitControls autoRotate enableDamping />
  </T.PerspectiveCamera>
  <T.DirectionalLight
    color="#ffffff"
    intensity={2}
    position={[10, 10, 10]}
    castShadow
  />

  <T is={$gltf.scene} />
{/if}
