<script context="module">
  import { BoxGeometry, MeshStandardMaterial } from "three";

  const iceGeo = new BoxGeometry(2, 0.01, 2);
  const iceMat = new MeshStandardMaterial({
    color: "#a5f3fc",
    roughness: 0.0,
    metalness: 0.2,
    transparent: true,
    opacity: 0.8,
  });
</script>

<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;

  const dispatch = createEventDispatcher();

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <!-- Visual representation: Light blue icy square (Thin decal) -->
  <T.Mesh geometry={iceGeo} material={iceMat} position={[0, 0.005, 0]} receiveShadow />

  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <T.Group position={[0, 0.5, 0]}>
      <Collider 
        shape="cuboid" 
        args={[1, 0.5, 1]} 
        sensor 
        on:sensorenter={() => !isEditor && dispatch('iceenter')}
        on:sensorexit={() => !isEditor && dispatch('iceexit')}
      />
    </T.Group>
  </RigidBody>
</T.Group>
