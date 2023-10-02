<script>
  import { Group, Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";

  import { createEventDispatcher } from "svelte";

  export let position;

  // === GRAPHICAL PROPERTIES === //
  export let size = 0.45;
  export let color = "#FF0000";

  // === PHYSICAL PROPERTIES === //
  export let friction = 2;
  export let restitution = 0.5;

  // === PLAYER === //
  let body;
  let mesh;
  export let ref = new Group();
  let positionVector = new Vector3(position[0], position[1], position[2]);

  // === EVENTS === //
  const dispatch = createEventDispatcher();

  export function hit(hitpoint) {
    let forceVector = new Vector3();
    forceVector
      .subVectors(hitpoint, positionVector)
      .multiplyScalar(7.5)
      .negate()
      .setY(0);

    body.applyImpulse(forceVector, true);
  }

  export function moveTo(pos) {
    // CHANGE PLAYER'S ROOT GROUP POSITION
    ref.position.set(pos[0], pos[1], pos[2]);
    // RESET RIGID BODY POSITION AND SPEED/VELOCITY
    body.resetForces(true);
    body.resetTorques(true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true);
    body.setRotation({ w: 1.0, x: 0.0, y: 0.0, z: 0.0 }, true);
  }

  let state = "resting";

  function updatePosition() {
    position[0] = positionVector.x;
    position[1] = positionVector.y;
    position[2] = positionVector.z;
  }

  useFrame(() => {
    if (!body) return;

    mesh.getWorldPosition(positionVector);

    if (body.isMoving()) {
      if (state !== "moving") state = "moving";

      updatePosition();
      dispatch("moved", position);
    }

    if (!body.isMoving() && state === "moving") {
      state = "resting";

      updatePosition();
      dispatch("stopped", position);
    }
  });
</script>

<T is={ref} {position}>
  <CollisionGroups groups={[1, 2]}>
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
  </CollisionGroups>
</T>
