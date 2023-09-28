<script>
  import { Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";

  import { createEventDispatcher } from "svelte";
  import PlayerController from "./PlayerController.svelte";
  import { useStage } from "../useStage";

  const { spawn, playerPosition } = useStage();

  // === GRAPHICAL PROPERTIES === //
  export let size = 0.45;
  export let color = "#FF0000";

  // === PHYSICAL PROPERTIES === //
  export let friction = 2;
  export let restitution = 0.5;

  // === PLAYER === //
  let body;
  let mesh;

  // === SELECTION === //
  let selectable = false;

  // === EVENTS === //
  const dispatch = createEventDispatcher();

  function onApplyHit(hitpoint) {
    if ((hitpoint.x !== 0 && hitpoint.y !== 0, hitpoint.z !== 0)) {
      let worldPosition = new Vector3();
      mesh.getWorldPosition(worldPosition);

      let forceVector = new Vector3();
      forceVector
        .subVectors(hitpoint, worldPosition)
        .multiplyScalar(7.5)
        .negate()
        .setY(0);

      dispatch("hit", [...forceVector]);

      body.applyImpulse(forceVector, true);
    }
  }

  useFrame(() => {
    if (!body) return;
    if (body.isMoving()) {
      if (selectable) selectable = !selectable;

      let worldPosition = new Vector3();
      mesh.getWorldPosition(worldPosition);
      $playerPosition = [...worldPosition];
    } else {
      if (!selectable) selectable = !selectable;
    }
  });
</script>

<CollisionGroups groups={[1]}>
  <RigidBody
    type="dynamic"
    linearDamping={0.35}
    angularDamping={0.35}
    bind:rigidBody={body}
  >
    <AutoColliders shape={"ball"} {friction} {restitution} mass={1}>
      <T.Mesh
        bind:ref={mesh}
        position={[$spawn[0], $spawn[1] + size + 0.01, $spawn[2]]}
      >
        <T.IcosahedronGeometry args={[size, 3]} />
        <T.MeshStandardMaterial flatShading {color} />
      </T.Mesh>
    </AutoColliders>
  </RigidBody>
</CollisionGroups>

{#if selectable}
  <slot>
    <PlayerController {size} on:apply={(ev) => onApplyHit(ev.detail)} />
  </slot>
{/if}
