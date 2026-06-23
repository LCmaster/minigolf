<script>
  import { Group, Vector3, DataTexture, RGBAFormat, NearestFilter } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, RigidBody, Collider } from "@threlte/rapier";
  import { sfx } from "$lib/stores/audio";

  import { createEventDispatcher } from "svelte";

  export let position;
  export let size = 0.45;
  export let color = "#FF0000";
  export let friction = 2;
  export let restitution = 0.5;
  export let ref = new Group();

  const dispatch = createEventDispatcher();

  // Procedural toon shading gradient map
  const gradientColors = new Uint8Array([
    80, 80, 80, 255,     // Dark shadow
    160, 160, 160, 255,  // Midtone
    255, 255, 255, 255   // Highlight
  ]);
  const gradientMap = new DataTexture(gradientColors, 3, 1, RGBAFormat);
  gradientMap.minFilter = NearestFilter;
  gradientMap.magFilter = NearestFilter;
  gradientMap.needsUpdate = true;

  let body;
  let mesh;
  let enabled = true;
  let positionVector = new Vector3(position[0], position[1], position[2]);

  export function hit(hitpoint) {
    let forceVector = new Vector3();
    forceVector
      .subVectors(hitpoint, positionVector)
      .multiplyScalar(10)
      .negate()
      .setY(0);

    body.applyImpulse(forceVector, true);
    
    // Play putt sound based on hit magnitude
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

  let linearDamping = 0.35;
  let angularDamping = 0.35;

  export function setDamping(linear, angular) {
    linearDamping = linear;
    angularDamping = angular;
    body.setLinearDamping(linear);
    body.setAngularDamping(angular);
  }

  export function setFriction(value) {
    friction = value;
  }

  function updatePosition() {
    position[0] = positionVector.x;
    position[1] = positionVector.y;
    position[2] = positionVector.z;
    position = position;
  }

  let framesAwake = 0;
  let currentSpeed = 0;

  function handleSensorEnter(e) {
    if (currentSpeed > 1.0) {
      const volume = Math.min(currentSpeed / 10, 1.0);
      sfx.play("/sounds/bounce.wav", volume);
    }
  }

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
      
      sfx.setRollingVolume(currentSpeed);

      // Force stop if the ball is crawling very slowly, but give it a few frames to start falling first
      if (framesAwake > 5 && currentSpeed < 0.1 && Math.abs(linvel.y) < 0.1) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.sleep();
        sfx.setRollingVolume(0);
      } else {
        updatePosition();
        dispatch("moved", position);
      }
    } else {
      framesAwake = 0;
      currentSpeed = 0;
      sfx.setRollingVolume(0);
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
    <!-- Use min combine rule so we can force friction to 0 when on ice -->
    <AutoColliders shape={"ball"} {friction} frictionCombineRule="min" {restitution} mass={1}>
      <T.Mesh bind:ref={mesh}>
        <T.IcosahedronGeometry args={[size, 4]} />
        <T.MeshToonMaterial {color} gradientMap={gradientMap} />
      </T.Mesh>
    </AutoColliders>

    <!-- Dedicated audio sensor, slightly larger than the physical ball.
         collisionGroups: Membership 4 (Audio Sensor), Filter 2 (Walls only).
         Bitmask: 0x00040002 -->
    <Collider 
      shape={"ball"} 
      args={[size + 0.05]} 
      sensor 
      collisionGroups={0x00040002} 
      on:sensorenter={handleSensorEnter} 
    />
  </RigidBody>
</T>
