<script lang="ts">
  import * as THREE from "three";
  import { T } from "@threlte/core";

  import Stage from "./Stage.svelte";
  import Player from "./Player.svelte";

  const courseMaterial = new THREE.MeshStandardMaterial({
    color: 0x99ccff,
  });
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: "seagreen",
  });

  let spawn: Array<number>;
</script>

<T.DirectionalLight
  color="#ffffff"
  intensity={2}
  position={[10, 10, 10]}
  castShadow
/>
<T.Group>
  <Stage
    name={"Stage_001.glb"}
    {courseMaterial}
    {groundMaterial}
    bind:spawn
    on:completed={() => console.log("Level Completed!")}
  />
  {#if spawn}
    <Player position={spawn} />
  {/if}
</T.Group>
