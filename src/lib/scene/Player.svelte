<script>
  import { Group, Vector3, DataTexture, RGBAFormat, NearestFilter } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

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

  function updatePosition() {
    position[0] = positionVector.x;
    position[1] = positionVector.y;
    position[2] = positionVector.z;
    position = position;
  }

  let framesAwake = 0;

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
      const speed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z);

      // Force stop if the ball is crawling very slowly, but give it a few frames to start falling first
      if (framesAwake > 5 && speed < 0.1 && Math.abs(linvel.y) < 0.1) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.sleep();
      } else {
        updatePosition();
        dispatch("moved", position);
      }
    } else {
      framesAwake = 0;
    }
  });
</script>

<T is={ref} {position}>
  <RigidBody
    ccd
    type="dynamic"
    linearDamping={0.35}
    angularDamping={0.35}
    bind:rigidBody={body}
    on:sleep={() => dispatch("stopped", position)}
  >
    <AutoColliders shape={"ball"} {friction} {restitution} mass={1}>
      <T.Mesh bind:ref={mesh}>
        <T.IcosahedronGeometry args={[size, 4]} />
        <T.MeshToonMaterial {color} gradientMap={gradientMap} />
      </T.Mesh>
    </AutoColliders>
  </RigidBody>
</T>
