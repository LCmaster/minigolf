<script lang="ts">
  import { PerspectiveCamera, Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";

  import PlayerSelector from "./PlayerSelector.svelte";
  import ArrowIndicator from "./ArrowIndicator.svelte";
  import { createEventDispatcher } from "svelte";

  let camera: PerspectiveCamera;
  let cameraControls: any;

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

  // === EVENTS === //
  const dispatch = createEventDispatcher();

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

      dispatch("hit", [...forceVector]);

      body.applyImpulse(forceVector, true);
    }
  }

  useFrame(() => {
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

<CollisionGroups groups={[1]}>
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
</CollisionGroups>

{#if selectable}
  <PlayerSelector
    {camera}
    {size}
    position={playerPosition}
    on:selected={(ev) => (cameraControls.enabled = !ev.detail)}
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
<T.PerspectiveCamera
  makeDefault
  bind:ref={camera}
  fov={60}
  position={[position[0], position[1] + 25, position[2] + 25]}
>
  <OrbitControls
    bind:ref={cameraControls}
    enableDamping
    dampingFactor={0.25}
    minDistance={25}
    maxDistance={30}
    enablePan={false}
    enableZoom={false}
    minPolarAngle={Math.PI * 0.05}
    maxPolarAngle={Math.PI * 0.3}
    target={playerPosition}
  />
</T.PerspectiveCamera>
