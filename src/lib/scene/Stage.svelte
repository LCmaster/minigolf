<script>
  import { createEventDispatcher } from "svelte";

  import { MeshStandardMaterial, RepeatWrapping } from "three";

  import { T, forwardEventHandlers } from "@threlte/core";
  import {
    OrbitControls,
    Suspense,
    useSuspense,
    useTexture,
    Environment,
  } from "@threlte/extras";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

  import Player from "./Player.svelte";
  import PlayerController from "./PlayerController.svelte";
  import Ground from "./Ground.svelte";

  import SplineTrack from "../../routes/editor/components/SplineTrack.svelte";

  export let controlPoints;
  export let skybox;

  export let groundFriction = 0.75;
  export let groundRestitution = 0.75;

  export let wallFriction = 0.75;
  export let wallRestitution = 0.95;

  let ballSize = 0.1;
  let tileHeight = 0.5;

  let camera;
  let controls;

  const spawn =
    controlPoints && controlPoints.length > 0
      ? [...controlPoints[0].position]
      : [0, 0, 0];
  spawn[1] += 2.0;

  let player;
  let respawnPoints = [[...spawn]];
  let playerPosition = spawn;
  let canSelectPlayer = false;

  const dispatch = createEventDispatcher();
  const component = forwardEventHandlers();

  $: endPos =
    controlPoints && controlPoints.length > 0
      ? controlPoints[controlPoints.length - 1].position
      : [0, 0, 0];
</script>

<T.AmbientLight intensity={0.6} />
<T.DirectionalLight
  position={[20, 30, 20]}
  intensity={2.5}
  castShadow
  shadow.mapSize.width={2048}
  shadow.mapSize.height={2048}
/>
{#if skybox}
  <Environment
    path={`/skybox/${skybox}/`}
    files={["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]}
    isBackground={true}
  />
{/if}

<T.PerspectiveCamera
  makeDefault
  fov={70}
  bind:ref={camera}
  on:create={({ ref }) => {
    if (controlPoints && controlPoints.length > 1) {
      const p0 = controlPoints[0].position;
      const p1 = controlPoints[1].position;
      const dx = p1[0] - p0[0];
      const dz = p1[2] - p0[2];
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;

      const camDist = 5;
      const cx = spawn[0] - (dx / dist) * camDist;
      const cz = spawn[2] - (dz / dist) * camDist;

      ref.position.set(cx, spawn[1] + 2.5, cz);
    } else {
      ref.position.set(spawn[0], spawn[1] + 2.5, spawn[2] + 5);
    }
  }}
>
  <OrbitControls
    bind:ref={controls}
    enableDamping
    dampingFactor={0.75}
    minDistance={2.5}
    maxDistance={7.5}
    enablePan={false}
    enableZoom={false}
    minPolarAngle={Math.PI * 0.05}
    maxPolarAngle={Math.PI * 0.35}
    bind:target={playerPosition}
  />
</T.PerspectiveCamera>

<T.Group {...$$restProps} bind:this={$component}>
  <Suspense on:load={() => console.log("Stage loaded")}>
    <Ground
      on:outofbounds={() => {
        const pos = [...respawnPoints[respawnPoints.length - 1]];
        player.moveTo(pos);
        playerPosition = pos;
      }}
    />

    <!-- SplineTrack manages its own AutoColliders internally -->
    <SplineTrack {controlPoints} />

    <!-- Hole sensor: triggers "completed" when ball enters -->
    <RigidBody type="fixed">
      <AutoColliders
        shape="cuboid"
        sensor
        on:sensorenter={() => {
          player.setEnabled(false);
          dispatch("completed");
        }}
      >
        <T.Mesh position={endPos}>
          <T.BoxGeometry args={[1, 0.25, 1]} />
          <T.MeshStandardMaterial transparent opacity={0} />
        </T.Mesh>
      </AutoColliders>
    </RigidBody>

    <!-- Player ball -->
    <Player
      bind:this={player}
      size={ballSize}
      position={[...spawn]}
      on:moved={(ev) => {
        playerPosition = ev.detail;
        canSelectPlayer = false;
      }}
      on:stopped={(ev) => {
        const position = ev.detail;
        respawnPoints.push([...position]);
        respawnPoints = respawnPoints;
        canSelectPlayer = true;
      }}
    />

    <!-- Shot controller — only visible when ball is at rest -->
    {#if player && canSelectPlayer}
      <PlayerController
        position={respawnPoints[respawnPoints.length - 1]}
        size={ballSize}
        {camera}
        on:selected={() => {
          controls.enabled = false;
        }}
        on:apply={(ev) => {
          const hitpoint = ev.detail;
          if (hitpoint.x !== 0 || hitpoint.y !== 0 || hitpoint.z !== 0) {
            player.hit(hitpoint);
            dispatch("hit");
          }
          controls.enabled = true;
        }}
      />
    {/if}
  </Suspense>
</T.Group>
