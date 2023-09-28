<script lang="ts">
  import { T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";

  export let camera;
  export let controls;
  export let minDistance = 25;
  export let maxDistance = 30;

  export let target: Array<number> = [0, 0, 0];
  export let enabled = true;
</script>

<T.PerspectiveCamera
  bind:ref={camera}
  position={[target[0], target[1] + minDistance, target[2] + minDistance]}
>
  <OrbitControls
    bind:ref={controls}
    autoRotate={true}
    {minDistance}
    {maxDistance}
    enablePan={false}
    enableZoom={false}
    minPolarAngle={Math.PI * 0.05}
    maxPolarAngle={Math.PI * 0.3}
    {target}
  />
</T.PerspectiveCamera>
