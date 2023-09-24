<script lang="ts">
  import { PerspectiveCamera, Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

  import CameraControls from "./CameraControls.svelte";
  import PlayerSelector from "./PlayerSelector.svelte";
  import ArrowIndicator from "./ArrowIndicator.svelte";

  let camera: PerspectiveCamera;

  // === WORLD PROPERTIES === //
  export let position: Array<number> = [0, 0, 0];

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
  let showIndicator: boolean = false;
  let playerPosition: Array<number> = position;
  let hitpointPosition: Array<number>;

  //   $: if (body) {
  //     let worldPosition = new Vector3();

  //     mesh.getWorldPosition(worldPosition);
  //     let hitPoint = worldPosition.clone();
  //     hitPoint.z += 5;

  //     const distance = hitPoint.distanceTo(worldPosition);
  //     const hitForce = Math.min(distance, 5);
  //     const hitDirection = new Vector3();

  //     hitDirection
  //       .subVectors(hitPoint, worldPosition)
  //       .normalize()
  //       .multiplyScalar(hitForce * 1.5)
  //       .negate()
  //       .setY(0);

  //     // setTimeout(() => {
  //     //   body.applyImpulse(hitDirection, true);
  //     // }, 5000);
  //   }

  function handleHitPointSelected(hitpoint: Vector3) {
    if ((hitpoint.x !== 0 && hitpoint.y !== 0, hitpoint.z !== 0)) {
      if (!showIndicator) showIndicator = true;
      hitpointPosition = [...hitpoint];
    } else {
      if (showIndicator) showIndicator = false;
    }
  }

  function handleHitPointApplied(hitpoint: Vector3) {
    if ((hitpoint.x !== 0 && hitpoint.y !== 0, hitpoint.z !== 0)) {
      if (showIndicator) showIndicator = false;

      let worldPosition = new Vector3();
      mesh.getWorldPosition(worldPosition);

      let forceVector = new Vector3();
      forceVector
        .subVectors(hitpoint, worldPosition)
        .multiplyScalar(1.5)
        .negate()
        .setY(0);

      body.applyImpulse(forceVector, true);
    }
  }

  useFrame((_, delta: number) => {
    if (!body) return;

    if (body.isMoving()) {
      if (selectable) selectable = false;

      let worldPosition = new Vector3();
      mesh.getWorldPosition(worldPosition);
      playerPosition = [...worldPosition];
    } else {
      if (!selectable) selectable = true;
    }
  });
</script>

<RigidBody
  type="dynamic"
  linearDamping={0.3}
  angularDamping={0.3}
  bind:rigidBody={body}
>
  <AutoColliders shape={"ball"} {friction} {restitution}>
    <T.Mesh bind:ref={mesh} {position}>
      <T.IcosahedronGeometry args={[size, 3]} />
      <T.MeshStandardMaterial flatShading {color} />
    </T.Mesh>
  </AutoColliders>
</RigidBody>

{#if selectable}
  <PlayerSelector
    {camera}
    {size}
    position={playerPosition}
    on:hitPointSelected={(ev) => handleHitPointSelected(ev.detail)}
    on:hitPointApplied={(ev) => handleHitPointApplied(ev.detail)}
  />
{/if}
{#if showIndicator}
  <ArrowIndicator
    hitpoint={hitpointPosition}
    {playerPosition}
    color={"white"}
  />
{/if}
<T.PerspectiveCamera makeDefault bind:ref={camera}>
  <CameraControls bind:object={mesh} />
</T.PerspectiveCamera>
