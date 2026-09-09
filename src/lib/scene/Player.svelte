<script>
  import { Group, Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, RigidBody, Collider, useRapier } from "@threlte/rapier";
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

  // Rapier world + Ray constructor for the hover raycast system
  const { world, rapier } = useRapier();

  // Hover gap: ball floats this many units above the detected surface.
  // Large enough to avoid trimesh contact, small enough to look grounded.
  const HOVER_GAP = 0.03;

  // Threshold for "in free-fall or on a loop" — Y velocity above this
  // means we let Rapier handle it naturally (no hover snap).
  const FREE_FALL_THRESHOLD = 2.5;

  // Ray cast distance downward — ball must be within this distance of a surface
  // for the hover system to engage. Keeps ramps and loops unaffected when the
  // ball is far from the floor.
  const HOVER_CAST_DIST = 1.5;

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
  // Hover raycast system
  //
  // Purpose: Completely eliminate sphere-on-trimesh jitter by taking the ball's
  // Y axis off the physics simulation when it is near a surface.
  //
  // How it works each frame:
  //   1. Cast a ray straight down from slightly above the ball's center.
  //   2. If a surface is found within HOVER_CAST_DIST AND the ball is not in
  //      free-fall (|linvel.y| < FREE_FALL_THRESHOLD), we are "on surface".
  //   3. Snap the body's Y translation to surfaceHitY + size + HOVER_GAP.
  //   4. Zero out Y velocity entirely → no bounce, no oscillation.
  //
  // The ball still collides with walls/bumpers/obstacles in XZ via Rapier —
  // only the vertical position is overridden.
  // ---------------------------------------------------------------------------
  const DOWN = { x: 0, y: -1, z: 0 };

  function applyHover(linvel, delta) {
    if (!body || !world || !rapier) return false;

    const t = body.translation();

    // Cast from slightly above the ball center to avoid self-intersection
    const rayOrigin = { x: t.x, y: t.y + size * 0.5, z: t.z };
    const ray = new rapier.Ray(rayOrigin, DOWN);

    // Exclude the ball's own rigid body from the raycast
    const hit = world.castRay(
      ray,
      HOVER_CAST_DIST + size,
      true,       // solid: stop at first hit
      undefined,  // filterFlags
      undefined,  // filterGroups (hit everything — floor and obstacles)
      undefined,  // filterExcludeCollider
      body,       // filterExcludeRigidBody — skip the ball itself
    );

    if (!hit) {
      return false;
    }

    // toi is the "time of impact" along the ray (distance from ray origin)
    const surfaceY = rayOrigin.y + DOWN.y * hit.toi; 
    const targetY  = surfaceY + size + HOVER_GAP;

    // Only engage hover if we're actually close enough to the surface
    const distToSurface = t.y - surfaceY;
    if (distToSurface > HOVER_CAST_DIST) {
      return false;
    }

    // Proportional-Derivative (PD) Hover Controller
    const error = targetY - t.y;
    const springK = 350; // Stiffness
    const dampingK = 25; // Damping

    // Calculate upward spring force
    const springForce = (error * springK) - (linvel.y * dampingK);
    
    // Only apply force upwards (acts like a cushion)
    const upwardForce = Math.max(0, springForce);

    if (upwardForce > 0) {
      body.applyImpulse({ x: 0, y: upwardForce * delta, z: 0 }, true);
    }
    
    return true;
  }

  // ---------------------------------------------------------------------------
  // Physics frame loop
  // ---------------------------------------------------------------------------
  useFrame((_, delta) => {
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

      // Hover system: engage when not in free-fall and not inside a loop
      // We no longer manually disable gravity, so no need to manage setGravityScale
      const inFreefall = Math.abs(linvel.y) > FREE_FALL_THRESHOLD;
      if (framesAwake > 2 && !inFreefall) {
        applyHover(linvel, delta);
      }

      // Notify consumers of speed change so they can drive audio independently
      dispatch("speedchange", currentSpeed);

      // Force-stop: prevent the ball from crawling indefinitely on flat surfaces.
      // Wait a few frames first so the ball has time to fall after teleport/respawn.
      if (framesAwake > 5 && currentSpeed < 0.25 && Math.abs(linvel.y) < 0.1) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.sleep();
        // Note: `sleep` triggers RigidBody's on:sleep → dispatches "stopped"
        // "stopped" is the game-state signal meaning "ball is ready for next shot".
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
