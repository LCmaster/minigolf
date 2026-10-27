<script>
  import { createEventDispatcher } from "svelte";
  import { T, forwardEventHandlers, useFrame, useThrelte } from "@threlte/core";
  import { OrbitControls, Suspense } from "@threlte/extras";
  import { Vector3 } from "three";
  import { sfx } from "$lib/stores/audio";
  import { userProfile } from "$lib/stores/profile";
  import { writable } from "svelte/store";
  import { GameState } from "$lib/stores/game";

  import Player from "./Player.svelte";
  import PlayerController from "./PlayerController.svelte";
  import Ground from "./Ground.svelte";
  import BackgroundHills from "./BackgroundHills.svelte";
  import EnvironmentSettings from "./EnvironmentSettings.svelte";
  import CourseRenderer from "./course/CourseRenderer.svelte";
  import GoalSensor from "./course/GoalSensor.svelte";
  import ParticleSystem from "./particles/ParticleSystem.svelte";
  import BallTrail from "./particles/BallTrail.svelte";
  import { useCameraOcclusion } from "./useCameraOcclusion";

  import SplineTrack from "../../routes/editor/components/SplineTrack.svelte";

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  export let controlPoints;
  export let blocks = [];
  export let theme = "clear";
  export let gameState = writable(GameState.IDLE);

  export let groundFriction = 0.75;
  export let groundRestitution = 0.05;
  export let tileColor = "#567D46";
  export let wallFriction = 0.75;
  export let wallRestitution = 0.95;
  export let terrainMode = "heightmap";

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------
  const ballSize = 0.1;
  const dispatch = createEventDispatcher();
  const component = forwardEventHandlers();
  const threlteCtx = useThrelte();

  const spawn =
    controlPoints && controlPoints.length > 0
      ? [...controlPoints[0].position]
      : [0, 0, 0];
  spawn[1] += 0.35;

  let camera;
  let controls;
  let player;
  let playerPosition = new Vector3(...spawn);
  let playerPosArray = [...spawn];
  let currentBallSpeed = 0;
  let respawnPoints = [[...spawn]];

  // Connect camera occlusion for scenery (trees, rocks, windmill towers)
  const playerOcclusionState = { position: playerPosArray };
  useCameraOcclusion(threlteCtx, playerOcclusionState);

  $: endPos =
    controlPoints && controlPoints.length > 0
      ? controlPoints[controlPoints.length - 1].position
      : [0, 0, 0];

  $: minCourseY =
    controlPoints && controlPoints.length > 0
      ? Math.min(0, ...controlPoints.map((cp) => cp.position[1] || 0))
      : 0;

  // ---------------------------------------------------------------------------
  // Player surface callbacks (ice / sand / water)
  // ---------------------------------------------------------------------------
  let iceContacts = 0;
  let sandContacts = 0;
  let surfaceParticleTimer = 0;

  function applyActiveSurfacePhysics() {
    if (!player) return;
    if (sandContacts > 0) {
      player.setDamping(4.0, 4.0);
      player.setFriction(1.2);
    } else if (iceContacts > 0) {
      player.setDamping(0.05, 0.05);
      player.setFriction(0.0);
    } else {
      player.setDamping(0.55, 0.55);
      player.setFriction(0.5);
    }
  }

  function handleIceEnter() {
    iceContacts += 1;
    applyActiveSurfacePhysics();
  }

  function handleIceExit() {
    iceContacts = Math.max(0, iceContacts - 1);
    applyActiveSurfacePhysics();
  }

  function handleSandEnter() {
    sandContacts += 1;
    applyActiveSurfacePhysics();
    if (particleSystem) {
      particleSystem.emit(playerPosition, "dust", 12);
    }
  }

  function handleSandExit() {
    sandContacts = Math.max(0, sandContacts - 1);
    applyActiveSurfacePhysics();
  }

  function handleWaterHazard() {
    if (!player) return;
    if (particleSystem) {
      particleSystem.emit(playerPosition, "splash", 25);
    }
    sfx.play("/sounds/bounce.wav", 0.6);
    const pos = [...respawnPoints[respawnPoints.length - 1]];
    pos[1] += 0.05;
    player.moveTo(pos);
    playerPosition.set(...pos);
    playerPosArray = [...pos];
    playerOcclusionState.position = playerPosArray;
    $gameState = GameState.IDLE;
  }

  // --- Visual Polish ---
  let particleSystem;

  // --- Camera Chase System ---
  // Tracks the ball's movement direction so the camera can stay behind it.
  // When the ball is idle, the camera slowly drifts to the ideal behind position.

  // The ideal "behind" offset in world space — updated as ball moves
  const idealCamPos = new Vector3();
  let lastBallPos = new Vector3(...spawn);
  let ballMoveDirXZ = new Vector3(0, 0, 1); // direction ball is moving in XZ plane

  // Camera Shake
  let cameraTarget = new Vector3(...spawn);
  let shakeIntensity = 0;

  const CHASE_DIST = 6; // how far behind the ball to sit
  const CHASE_HEIGHT = 3; // how high above the ball
  const CHASE_SMOOTH = 3.5; // lerp speed (higher = snappier)
  const TARGET_SMOOTH = 8; // how fast the look-at target follows

  function triggerShake(intensity) {
    shakeIntensity = Math.min(shakeIntensity + intensity, 1.0);
  }

  useFrame((_, delta) => {
    // --- Water lake check (world water plane at y = -1.0) ---
    if ($gameState === GameState.ROLLING && playerPosition.y <= -0.95) {
      handleWaterHazard();
      return;
    }

    // --- Emit continuous surface or trail particles when moving ---
    if (currentBallSpeed > 0.5 && particleSystem) {
      surfaceParticleTimer += delta;
      if (surfaceParticleTimer >= 0.08) {
        surfaceParticleTimer = 0;
        if (sandContacts > 0) {
          particleSystem.emit(playerPosition, "dust", 3);
        } else if (iceContacts > 0) {
          particleSystem.emit(playerPosition, "sparkle", 2);
        }
      }
    }

    // --- track ball's XZ movement direction ---
    const dp = playerPosition.clone().sub(lastBallPos);
    const moveXZ = Math.sqrt(dp.x * dp.x + dp.z * dp.z);
    if (moveXZ > 0.005) {
      // ball moved — update the direction it's heading
      ballMoveDirXZ.set(dp.x, 0, dp.z).normalize();
    }
    lastBallPos.copy(playerPosition);

    // --- ideal camera position: behind ball in direction it came from ---
    idealCamPos.set(
      playerPosition.x - ballMoveDirXZ.x * CHASE_DIST,
      playerPosition.y + CHASE_HEIGHT,
      playerPosition.z - ballMoveDirXZ.z * CHASE_DIST,
    );

    // --- smooth camera position towards ideal (only while ball is rolling) ---
    // When ball is stopped and player is aiming, let OrbitControls handle camera freely
    if (camera && $gameState === GameState.ROLLING) {
      const t = 1 - Math.exp(-CHASE_SMOOTH * delta);
      camera.position.lerp(idealCamPos, t);
      camera.updateMatrixWorld();
    }

    // --- camera look-at target (with optional shake) ---
    if (shakeIntensity > 0) {
      shakeIntensity -= delta * 2.0;
      if (shakeIntensity < 0) shakeIntensity = 0;
      const time = performance.now() * 0.05;
      const shakeX =
        Math.sin(time) * Math.cos(time * 0.8) * shakeIntensity * 0.25;
      const shakeZ =
        Math.cos(time * 1.1) * Math.sin(time * 0.9) * shakeIntensity * 0.25;
      cameraTarget.set(
        playerPosition.x + shakeX,
        playerPosition.y,
        playerPosition.z + shakeZ,
      );
    } else {
      // Smooth target follow
      const tgt = 1 - Math.exp(-TARGET_SMOOTH * delta);
      cameraTarget.lerp(playerPosition, tgt);
    }

    // Push the live target into OrbitControls each frame
    if (controls) {
      controls.target.copy(cameraTarget);
      controls.update();
    }
  });
</script>

<EnvironmentSettings {theme} />

<!-- Camera — positioned behind the spawn based on track direction -->
<T.PerspectiveCamera
  makeDefault
  fov={70}
  bind:ref={camera}
  on:create={({ ref }) => {
    let dx = 0,
      dz = 1;
    if (controlPoints && controlPoints.length > 1) {
      const p0 = controlPoints[0].position;
      const p1 = controlPoints[1].position;
      dx = p1[0] - p0[0];
      dz = p1[2] - p0[2];
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      dx /= dist;
      dz /= dist;
    }
    // Align the initial chase direction with the track direction
    ballMoveDirXZ.set(dx, 0, dz);
    const camDist = 6;
    ref.position.set(
      spawn[0] - dx * camDist,
      spawn[1] + 3,
      spawn[2] - dz * camDist,
    );
    // Seed the smooth position so there's no initial jump
    idealCamPos.copy(ref.position);
  }}
>
  <!-- Orbit controls to let the player look around slightly -->
  <OrbitControls
    bind:ref={controls}
    enableDamping
    dampingFactor={0.08}
    minDistance={3}
    maxDistance={14}
    enablePan={false}
    enableZoom={true}
  />
</T.PerspectiveCamera>

<T.Group {...$$restProps} bind:this={$component}>
  <Suspense>
    <Ground />
    {#if terrainMode === "classic"}
      <BackgroundHills {controlPoints} />
    {/if}

    <!-- SplineTrack manages its own AutoColliders internally -->
    <SplineTrack
      {controlPoints}
      {groundFriction}
      {groundRestitution}
      {wallFriction}
      {wallRestitution}
      {tileColor}
      {terrainMode}
    />

    <!-- All obstacle/block rendering — see CourseRenderer for the type map -->
    <CourseRenderer
      {blocks}
      on:iceenter={handleIceEnter}
      on:iceexit={handleIceExit}
      on:sandenter={handleSandEnter}
      on:sandexit={handleSandExit}
      on:waterhazard={handleWaterHazard}
    />

    <!-- Hole sensor: fires "completed" when the ball enters -->
    <GoalSensor
      position={endPos}
      on:completed={() => {
        if (
          $gameState === GameState.HOLED_OUT ||
          $gameState === GameState.COURSE_COMPLETE
        )
          return;
        $gameState = GameState.HOLED_OUT;
        if (player) player.setEnabled(false);
        if (particleSystem)
          particleSystem.emit(new Vector3(...endPos), "confetti", 100);
        sfx.play("/sounds/applause.wav", 1.0);
        dispatch("completed");
      }}
    />

    <!-- The ball -->
    <Player
      bind:this={player}
      size={ballSize}
      position={[...spawn]}
      {minCourseY}
      color={$userProfile?.settings?.ballColor || "#FF0000"}
      on:outofbounds={() => {
        const pos = [...respawnPoints[respawnPoints.length - 1]];
        pos[1] += 0.05;
        player.moveTo(pos);
        playerPosition.set(...pos);
        playerPosArray = [...pos];
        playerOcclusionState.position = playerPosArray;
        $gameState = GameState.IDLE;
      }}
      on:wallhit={(e) => {
        triggerShake(e.detail.intensity);
        if (particleSystem) {
          particleSystem.emit(
            new Vector3(...e.detail.position),
            "spark",
            Math.floor(10 * e.detail.intensity),
            e.detail.intensity,
          );
        }
      }}
      on:moved={({ detail }) => {
        playerPosition.set(detail[0], detail[1], detail[2]);
        playerPosArray[0] = detail[0];
        playerPosArray[1] = detail[1];
        playerPosArray[2] = detail[2];
        if (
          $gameState !== GameState.HOLED_OUT &&
          $gameState !== GameState.COURSE_COMPLETE
        ) {
          $gameState = GameState.ROLLING;
        }
      }}
      on:stopped={(ev) => {
        respawnPoints.push([...ev.detail]);
        respawnPoints = respawnPoints;
        if (
          $gameState !== GameState.HOLED_OUT &&
          $gameState !== GameState.COURSE_COMPLETE
        ) {
          $gameState = GameState.IDLE;
        }
      }}
      on:speedchange={(ev) => {
        currentBallSpeed = ev.detail;
        // Bridge rolling audio: Player fires speedchange, Stage drives the audio system
        sfx.setRollingVolume(ev.detail);
      }}
    />

    <!-- Particle System -->
    <ParticleSystem bind:this={particleSystem} maxParticles={300} />

    <!-- Optional Ball Trail from User Profile -->
    {#if $userProfile?.settings?.ballTrail && $userProfile.settings.ballTrail !== "none"}
      <BallTrail
        position={playerPosArray}
        currentSpeed={currentBallSpeed}
        mode={$userProfile.settings.ballTrail}
      />
    {/if}

    <!-- Shot controller — only visible when ball is at rest -->
    {#if player && ($gameState === GameState.IDLE || $gameState === GameState.AIMING)}
      <PlayerController
        position={respawnPoints[respawnPoints.length - 1]}
        size={ballSize}
        on:selected={() => {
          controls.enabled = false;
          $gameState = GameState.AIMING;
        }}
        on:apply={(ev) => {
          const hitpoint = ev.detail;
          if (hitpoint.x !== 0 || hitpoint.y !== 0 || hitpoint.z !== 0) {
            player.hit(hitpoint);
            $gameState = GameState.ROLLING;
            dispatch("hit");
          } else {
            $gameState = GameState.IDLE;
          }
          controls.enabled = true;
        }}
      />
    {/if}
  </Suspense>
</T.Group>
