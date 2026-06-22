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
    <!-- Visual representation: Sandy colored square -->
    <T.Mesh position={[0, 0.05, 0]} receiveShadow>
      <T.BoxGeometry args={[2, 0.1, 2]} />
      <T.MeshStandardMaterial 
        color="#eab308" 
        roughness={1.0} 
        metalness={0.0} 
      />
    </T.Mesh>

    <!-- Collider with high friction -->
    <Collider 
      shape="cuboid" 
      args={[1, 0.05, 1]} 
      position={[0, 0.05, 0]} 
      friction={10.0} 
      restitution={0.0}
    />

    <!-- Sensor to apply linear damping to ball -->
    <Collider 
      shape="cuboid" 
      args={[1, 0.5, 1]} 
      position={[0, 0.5, 0]} 
      sensor 
      on:sensorenter={() => dispatch('sandenter')}
      on:sensorexit={() => dispatch('sandexit')}
    />
  </RigidBody>
</T.Group>
