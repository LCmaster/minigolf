<script>
  import { Group, Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, RigidBody, Collider } from "@threlte/rapier";
  import { sfx } from "$lib/stores/audio";
  import { createToonGradientMap } from "$lib/scene/materials/index.js";
  import { createEventDispatcher } from "svelte";

  export let position;
  export let size = 0.45;
  export let color = "#FF0000";
  export let friction = 0.5;
  export let restitution = 0.0;
  export let ref = new Group();

  const dispatch = createEventDispatcher();

  // Cel-shaded gradient map — construction delegated to the materials utility
  const gradientMap = createToonGradientMap();

  let body;
  let mesh;
  let enabled = true;
  let positionVector = new Vector3(position[0], position[1], position[2]);

  // ---------------------------------------------------------------------------
  // Public API (called by Stage.svelte)
  // ---------------------------------------------------------------------------

  export function hit(hitpoint) {
    let forceVector = new Vector3();
    forceVector
      .subVectors(hitpoint, positionVector)
      .multiplyScalar(10)
      .negate()
      .setY(0);

    body.applyImpulse(forceVector, true);

    // Play putt sound scaled to hit magnitude
    const magnitude = forceVector.length();
    const volume = Math.min(Math.max(magnitude / 20, 0.2), 1.0);
    sfx.play("/sounds/putt.wav", volume);
  }

  export function moveTo(pos) {
    body.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true);
    body.setRotation({ w: 1.0, x: 0.0, y: 0.0, z: 0.0 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.resetTorques(true);
    body.resetForces(true);
  }

  export function setEnabled(value) {
    enabled = value;
    body.setEnabled(value);
  }

  let linearDamping = 0.55;
  let angularDamping = 0.55;

  export function setDamping(linear, angular) {
    linearDamping = linear;
    angularDamping = angular;
    body.setLinearDamping(linear);
    body.setAngularDamping(angular);
  }

  export function setFriction(value) {
    friction = value;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function syncPosition() {
    position[0] = positionVector.x;
    position[1] = positionVector.y;
    position[2] = positionVector.z;
    position = position;
  }

  let framesAwake = 0;
  let currentSpeed = 0;

  // Audio sensor: fires bounce SFX when the ball collides with walls
  function handleSensorEnter() {
    if (currentSpeed > 1.0) {
      const volume = Math.min(currentSpeed / 10, 1.0);
      sfx.play("/sounds/bounce.wav", volume);
    }
  }

  // ---------------------------------------------------------------------------
  // Physics frame loop
  // Pure physics + position concerns only.
  // Audio side-effects are delegated via the `speedchange` event so consumers
  // can bridge audio without this component depending on the audio system.
  // ---------------------------------------------------------------------------
  useFrame(() => {
    if (!body || !enabled) return;

    mesh.getWorldPosition(positionVector);

    if (positionVector.y < -1) {
      dispatch("outofbounds", position);
      return;
    }

    if (body.isMoving()) {
      framesAwake++;
      const linvel = body.linvel();
      currentSpeed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z);

      // Gliding feel: suppress small vertical velocities caused by the ball
      // bumping over trimesh triangle edges on the track surface.
      // The 1.5 threshold is safe: surface jitter is < 0.3, ramps produce > 2.0.
      if (framesAwake > 2 && Math.abs(linvel.y) < 1.5) {
        body.setLinvel({ x: linvel.x, y: linvel.y * 0.05, z: linvel.z }, true);
      }

      // Notify consumers of speed change so they can drive audio independently
      dispatch("speedchange", currentSpeed);

      // Force-stop: prevent the ball from crawling indefinitely on nearly-flat surfaces.
      // Wait a few frames first so the ball has time to fall after teleport/respawn.
      if (framesAwake > 5 && currentSpeed < 0.25 && Math.abs(linvel.y) < 0.1) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.sleep();
        // Note: `sleep` triggers the RigidBody's on:sleep, which dispatches "stopped".
        // "stopped" is a game-state signal meaning "ball is ready for next shot".
        dispatch("speedchange", 0);
      } else {
        syncPosition();
        dispatch("moved", position);
      }
    } else {
      framesAwake = 0;
      currentSpeed = 0;
      dispatch("speedchange", 0);
    }
  });
</script>

<T is={ref} {position}>
  <RigidBody
    ccd
    type="dynamic"
    {linearDamping}
    {angularDamping}
    bind:rigidBody={body}
    on:sleep={() => dispatch("stopped", position)}
  >
    <!-- frictionCombineRule="min" lets IcePatch force friction to 0 without fighting the ball's own value -->
    <AutoColliders shape={"ball"} {friction} frictionCombineRule="min" {restitution} mass={1}>
      <T.Mesh bind:ref={mesh}>
        <T.IcosahedronGeometry args={[size, 4]} />
        <T.MeshToonMaterial {color} {gradientMap} />
      </T.Mesh>
    </AutoColliders>

    <!--
      Dedicated audio sensor, slightly larger than the physical collider.
      collisionGroups: Membership 4 (Audio Sensor), Filter 2 (Walls only).
      Bitmask: 0x00040002
    -->
    <Collider
      shape={"ball"}
      args={[size + 0.05]}
      sensor
      collisionGroups={0x00040002}
      on:sensorenter={handleSensorEnter}
    />
  </RigidBody>
</T>
