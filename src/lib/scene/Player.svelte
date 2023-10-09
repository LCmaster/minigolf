<script>
  import { Group, Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";

  import { createEventDispatcher } from "svelte";

  export let position;
  export let size = 0.45;
  export let color = "#FF0000";
  export let friction = 2;
  export let restitution = 0.5;
  export let ref = new Group();

  const dispatch = createEventDispatcher();

  let body;
  let mesh;
  let enabled = true;
  let state = "resting";
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

  useFrame(() => {
    if (!body && !enabled) return;

    if (state === "moving") {
      mesh.getWorldPosition(positionVector);
      updatePosition();
    }

    if (body.isMoving()) {
      if (state !== "moving") state = "moving";
      dispatch("moved", position);
    } else {
      if (state === "moving") {
        state = "resting";
        dispatch("stopped", position);
      }
    }
  });
</script>

<T is={ref} {position}>
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
</T>
