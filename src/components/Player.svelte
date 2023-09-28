<script lang="ts">
  import { Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";

  import { createEventDispatcher, getContext } from "svelte";
  import { writable } from "svelte/store";

  export let camera;
  export let controls;

  // === WORLD PROPERTIES === //
  let position = writable([0, 0, 0]);

  // === GRAPHICAL PROPERTIES === //
  export let size: number = 0.45;
  export let color: string = "#FF0000";

  // === PHYSICAL PROPERTIES === //
  export let friction: number = 2;
  export let restitution: number = 0.5;

  // === PLAYER === //
  let body: any;
  let mesh: any;

  // === SELECTION === //
  let selectable: boolean = false;
  let hitpointPosition: Array<number>;

  // === EVENTS === //
  const dispatch = createEventDispatcher();

  function handleHitPointSelected(hitpoint: Vector3) {
    if ((hitpoint.x !== 0 && hitpoint.y !== 0, hitpoint.z !== 0)) {
      hitpointPosition = [...hitpoint];
    }
  }

  function handleHitPointApplied(hitpoint: Vector3) {
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
      position = [...worldPosition];
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
        position={[position[0], position[1] + size + 0.01, position[2]]}
      >
        <T.IcosahedronGeometry args={[size, 3]} />
        <T.MeshStandardMaterial flatShading {color} />
      </T.Mesh>
    </AutoColliders>
  </RigidBody>
</CollisionGroups>

{#if selectable}
  <slot>
    <!-- <PlayerController
    {size}
    {camera}
    {controls}
    {position}
    on:hitPointSelected={(ev) => handleHitPointSelected(ev.detail)}
    on:hitPointApplied={(ev) => handleHitPointApplied(ev.detail)}
  /> -->
  </slot>
{/if}
