<script>
  import { createEventDispatcher } from "svelte";
  import { T, forwardEventHandlers, useThrelte } from "@threlte/core";
  import { OrbitControls, Suspense } from "@threlte/extras";
  import { sfx } from "$lib/stores/audio";
  import { userProfile } from "$lib/stores/profile";

  import Player          from "./Player.svelte";
  import PlayerController from "./PlayerController.svelte";
  import Ground          from "./Ground.svelte";
  import BackgroundHills from "./BackgroundHills.svelte";
  import EnvironmentSettings from "./EnvironmentSettings.svelte";
  import CourseRenderer  from "./course/CourseRenderer.svelte";
  import GoalSensor      from "./course/GoalSensor.svelte";
  import { useCameraOcclusion } from "./useCameraOcclusion.js";

  import SplineTrack from "../../routes/editor/components/SplineTrack.svelte";

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  export let controlPoints;
  export let blocks = [];
  export let theme = "clear";

  export let groundFriction    = 0.75;
  export let groundRestitution = 0.05;
  export let tileColor         = "#567D46";
  export let wallFriction      = 0.75;
  export let wallRestitution   = 0.95;

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------
  const ballSize   = 0.1;
  const dispatch   = createEventDispatcher();
  const component  = forwardEventHandlers();
  const threlteCtx = useThrelte();

  const spawn =
    controlPoints && controlPoints.length > 0
      ? [...controlPoints[0].position]
      : [0, 0, 0];
  spawn[1] += 0.35;

  let camera;
  let controls;
  let player;
  let playerPosition   = spawn;
  let canSelectPlayer  = false;
  let respawnPoints    = [[...spawn]];

  $: endPos =
    controlPoints && controlPoints.length > 0
      ? controlPoints[controlPoints.length - 1].position
      : [0, 0, 0];

  // Camera occlusion: fades scenery that blocks the camera-to-ball line of sight
  const occlusionState = { position: playerPosition };
  useCameraOcclusion(threlteCtx, occlusionState);

  // ---------------------------------------------------------------------------
  // Player surface callbacks (ice / sand / water)
  // ---------------------------------------------------------------------------
  function onIceEnter() {
    if (player) { player.setDamping(0.0, 0.0); player.setFriction(0.0); }
  }
  function onIceExit() {
    if (player) { player.setDamping(0.55, 0.55); player.setFriction(0.5); }
  }
  function onSandEnter() { if (player) player.setDamping(2.5, 2.5); }
  function onSandExit()  { if (player) player.setDamping(0.55, 0.55); }

  function onWaterHazard() {
    const pos = [...respawnPoints[respawnPoints.length - 1]];
    pos[1] += 0.05;
    player.moveTo(pos);
    playerPosition = pos;
    canSelectPlayer = true;
  }
</script>

<EnvironmentSettings {theme} />

<!-- Camera — positioned behind the spawn based on track direction -->
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
      ref.position.set(
        spawn[0] - (dx / dist) * camDist,
        spawn[1] + 2.5,
        spawn[2] - (dz / dist) * camDist
      );
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
    <Ground />
    <BackgroundHills {controlPoints} />

    <!-- SplineTrack manages its own AutoColliders internally -->
    <SplineTrack
      {controlPoints}
      {groundFriction}
      {groundRestitution}
      {wallFriction}
      {wallRestitution}
      {tileColor}
    />

    <!-- All obstacle/block rendering — see CourseRenderer for the type map -->
    <CourseRenderer
      {blocks}
      on:iceenter={onIceEnter}
      on:iceexit={onIceExit}
      on:sandenter={onSandEnter}
      on:sandexit={onSandExit}
      on:waterhazard={onWaterHazard}
    />

    <!-- Hole sensor: fires "completed" when the ball enters -->
    <GoalSensor
      position={endPos}
      on:completed={() => {
        if (player) player.setEnabled(false);
        sfx.play("/sounds/applause.wav", 1.0);
        dispatch("completed");
      }}
    />

    <!-- The ball -->
    <Player
      bind:this={player}
      size={ballSize}
      position={[...spawn]}
      color={$userProfile?.settings?.ballColor || "#FF0000"}
      on:outofbounds={() => {
        const pos = [...respawnPoints[respawnPoints.length - 1]];
        pos[1] += 0.05;
        player.moveTo(pos);
        playerPosition = pos;
        canSelectPlayer = true;
      }}
      on:moved={(ev) => {
        playerPosition = ev.detail;
        occlusionState.position = playerPosition;
        canSelectPlayer = false;
      }}
      on:stopped={(ev) => {
        respawnPoints.push([...ev.detail]);
        respawnPoints = respawnPoints;
        canSelectPlayer = true;
      }}
      on:speedchange={(ev) => {
        // Bridge rolling audio: Player fires speedchange, Stage drives the audio system
        sfx.setRollingVolume(ev.detail);
      }}
    />

    <!-- Shot controller — only visible when ball is at rest -->
    {#if player && canSelectPlayer}
      <PlayerController
        position={respawnPoints[respawnPoints.length - 1]}
        size={ballSize}
        {camera}
        on:selected={() => { controls.enabled = false; }}
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
