<script>
  import { T } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";

  /** Position of the hole — the last control point of the course */
  export let position;

  const dispatch = createEventDispatcher();
</script>

<!--
  A sensor volume placed at the hole position.
  Fires `completed` when the ball enters, letting Stage.svelte
  handle the applause SFX, disabling the player, and notifying the game loop.
-->
<RigidBody type="fixed">
  <AutoColliders
    shape="cuboid"
    sensor
    on:sensorenter={() => dispatch("completed")}
  >
    <T.Mesh {position}>
      <T.BoxGeometry args={[1, 0.25, 1]} />
      <T.MeshStandardMaterial transparent opacity={0} />
    </T.Mesh>
  </AutoColliders>
</RigidBody>
