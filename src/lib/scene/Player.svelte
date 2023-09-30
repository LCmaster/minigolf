<script>
  import { Group, Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";

  import { createEventDispatcher } from "svelte";
  import PlayerController from "./PlayerController.svelte";
  import { useStage } from "../useStage";
  import { get } from "svelte/store";

  const { status, playerPosition, lastPlayerPosition } = useStage();

  export let position;

  // === GRAPHICAL PROPERTIES === //
  export let size = 0.45;
  export let color = "#FF0000";

  // === PHYSICAL PROPERTIES === //
  export let friction = 2;
  export let restitution = 0.5;

  // === PLAYER === //
  let body;
  let mesh;
  export let ref = new Group();

  // === SELECTION === //
  let selectable = false;

  // === EVENTS === //
  const dispatch = createEventDispatcher();

  let worldPosition = new Vector3();

  function onApplyHit(hitpoint) {
    if ((hitpoint.x !== 0 && hitpoint.y !== 0, hitpoint.z !== 0)) {
      let forceVector = new Vector3();
      forceVector
        .subVectors(
          hitpoint,
          new Vector3(
            $playerPosition[0],
            $playerPosition[1],
            $playerPosition[2]
          )
        )
        .multiplyScalar(7.5)
        .negate()
        .setY(0);

      dispatch("hit", [...forceVector]);

      body.applyImpulse(forceVector, true);
    }
  }

  export function respawn() {}

  export function spawnToLastPosition() {
    console.log($lastPlayerPosition, $playerPosition);
    const pos = get(lastPlayerPosition);

    // CHANGE PLAYER'S ROOT GROUP POSITION
    ref.position.set(pos[0], pos[1], pos[2]);
    // RESET RIGID BODY POSITION
    body.resetForces(true);
    body.resetTorques(true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true);
    body.setRotation({ w: 1.0, x: 0.0, y: 0.0, z: 0.0 }, true);

    $playerPosition = $lastPlayerPosition;
  }

  useFrame(() => {
    if (!body) return;

    mesh.getWorldPosition(worldPosition);
    let { x, y, z } = worldPosition;
    if (body.isMoving()) {
      if (selectable) selectable = !selectable;
      $playerPosition = [x, y, z];
    } else {
      if (!selectable) {
        selectable = !selectable;
        $lastPlayerPosition = [x, y, z];
      }
    }
  });
</script>

<T is={ref} {position}>
  <CollisionGroups groups={[1, 2]}>
    <RigidBody
      type="dynamic"
      linearDamping={0.35}
      angularDamping={0.35}
      bind:rigidBody={body}
    >
      <AutoColliders shape={"ball"} {friction} {restitution} mass={1}>
        <T.Mesh bind:ref={mesh}>
          <T.IcosahedronGeometry args={[size, 3]} />
          <T.MeshStandardMaterial flatShading {color} />
        </T.Mesh>
      </AutoColliders>
    </RigidBody>
  </CollisionGroups>
</T>
{#if selectable}
  <slot>
    <PlayerController
      position={$playerPosition}
      {size}
      on:apply={(ev) => onApplyHit(ev.detail)}
    />
  </slot>
{/if}
