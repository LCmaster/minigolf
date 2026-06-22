<script>
  import { T } from "@threlte/core";
  import { Collider } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];

  const dispatch = createEventDispatcher();

  function handleSensor(e) {
    const targetBody = e.otherRigidBody || e.rigidBody || e.targetRigidBody;
    if (targetBody) {
      dispatch("waterhazard", { body: targetBody });
    }
  }
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <!-- Water Visual -->
  <T.Mesh position={[0, -0.25, 0]} receiveShadow>
    <T.BoxGeometry args={[2, 0.5, 2]} />
    <T.MeshStandardMaterial 
      color="#3b82f6" 
      transparent={true} 
      opacity={0.6} 
      roughness={0.1}
      metalness={0.8}
    />
  </T.Mesh>

  <!-- Water Sensor: triggers when ball enters it -->
  <!-- Note: Y is placed at the top of the water -->
  <T.Group position={[0, -0.05, 0]}>
    <Collider 
      shape="cuboid" 
      args={[1, 0.2, 1]} 
      sensor 
      on:sensorenter={handleSensor}
    />
  </T.Group>
</T.Group>
