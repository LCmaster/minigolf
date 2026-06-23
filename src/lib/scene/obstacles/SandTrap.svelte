<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  const dispatch = createEventDispatcher();

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];

</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <!-- Fixed RigidBody ensures it doesn't move but collides -->
  <RigidBody type="fixed">
    <!-- Visual representation: Sandy colored square (Thin decal) -->
    <T.Mesh position={[0, 0.005, 0]} receiveShadow>
      <T.BoxGeometry args={[2, 0.01, 2]} />
      <T.MeshStandardMaterial 
        color="#eab308" 
        roughness={1.0} 
        metalness={0.0} 
      />
    </T.Mesh>

    <!-- Sensor to apply linear damping to ball -->
    <T.Group position={[0, 0.5, 0]}>
      <Collider 
        shape="cuboid" 
        args={[1, 0.5, 1]} 
        sensor 
        on:sensorenter={() => dispatch('sandenter')}
        on:sensorexit={() => dispatch('sandexit')}
      />
    </T.Group>
  </RigidBody>
</T.Group>
