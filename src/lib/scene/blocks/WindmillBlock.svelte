<script>
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, Collider, RigidBody } from "@threlte/rapier";
  import { MeshStandardMaterial, Quaternion, Vector3 } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  export let speed = 2.0;

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation)
    ? safeRotation
    : [0, Math.PI * safeRotation, 0];

  const brickMaterial = new MeshStandardMaterial({ color: "#A0522D" });
  const bladeMaterial = new MeshStandardMaterial({ color: "#F5F5F5" });
  const roofMaterial = new MeshStandardMaterial({ color: "#2F4F4F" });
  const woodMaterial = new MeshStandardMaterial({ color: "#8B4513" });

  let rapierBody;
  let rotorGroup;
  let rotorRotation = 0;
  const localQ = new Quaternion();
  const worldQ = new Quaternion();
  const worldP = new Vector3();
  const axis = new Vector3(0, 0, 1);

  useFrame((state, delta) => {
    if (rapierBody && rotorGroup) {
      rotorRotation += speed * delta;

      localQ.setFromAxisAngle(axis, rotorRotation);

      rotorGroup.getWorldQuaternion(worldQ);
      rotorGroup.getWorldPosition(worldP);

      worldQ.multiply(localQ);

      rapierBody.setNextKinematicTranslation(worldP);
      rapierBody.setNextKinematicRotation(worldQ);
    }
  });
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <!-- STATIC BASE BUILDING -->
  <RigidBody type="fixed">
    <!-- Left Pillar -->
    <AutoColliders shape="cuboid">
      <T.Mesh
        position={[-1.4, 1.5, 0]}
        material={brickMaterial}
        castShadow
        receiveShadow
      >
        <T.BoxGeometry args={[1.2, 3, 2]} />
      </T.Mesh>
    </AutoColliders>

    <!-- Right Pillar -->
    <AutoColliders shape="cuboid">
      <T.Mesh
        position={[1.4, 1.5, 0]}
        material={brickMaterial}
        castShadow
        receiveShadow
      >
        <T.BoxGeometry args={[1.2, 3, 2]} />
      </T.Mesh>
    </AutoColliders>

    <!-- Floor/Bridge connecting them -->

    <AutoColliders shape="cuboid">
      <T.Mesh
        position={[0, -0.1, 0]}
        material={brickMaterial}
        castShadow
        receiveShadow
      >
        <T.BoxGeometry args={[4, 0.2, 2]} />
      </T.Mesh>
    </AutoColliders>

    <!-- Roof Base (above the gap) -->
    <AutoColliders shape="cuboid">
      <T.Mesh
        position={[0, 3.25, 0]}
        material={brickMaterial}
        castShadow
        receiveShadow
      >
        <T.BoxGeometry args={[4, 0.5, 2]} />
      </T.Mesh>
    </AutoColliders>

    <!-- Roof Pyramid -->
    <!-- Approximated by a cuboid for simplicity, or we can use convexHull later. -->
    <AutoColliders shape="convexHull">
      <T.Mesh
        position={[0, 4.5, 0]}
        rotation={[0, Math.PI / 4, 0]}
        material={roofMaterial}
        castShadow
        receiveShadow
      >
        <T.ConeGeometry args={[2.8, 2, 4]} />
      </T.Mesh>
    </AutoColliders>
  </RigidBody>

  <!-- KINEMATIC ROTOR (The moving blades) -->
  <T.Group position={[0, 2.0, 1.2]} bind:ref={rotorGroup}>
    <RigidBody type="kinematicPosition" bind:rigidBody={rapierBody}>
      <!-- Blade 1 (Horizontal) -->
      <Collider shape="cuboid" args={[2.3, 0.2, 0.05]} restitution={0.8} />
      <T.Mesh material={bladeMaterial} castShadow receiveShadow>
        <T.BoxGeometry args={[4.6, 0.4, 0.1]} />
      </T.Mesh>

      <!-- Blade 2 (Vertical) -->
      <Collider shape="cuboid" args={[0.2, 2.3, 0.05]} restitution={0.8} />
      <T.Mesh material={bladeMaterial} castShadow receiveShadow>
        <T.BoxGeometry args={[0.4, 4.6, 0.1]} />
      </T.Mesh>

      <!-- Hub / Axle -->
      <Collider
        shape="cylinder"
        args={[0.2, 0.2]}
        rotation={[Math.PI / 2, 0, 0]}
        restitution={0.8}
      />
      <T.Mesh
        rotation={[Math.PI / 2, 0, 0]}
        material={woodMaterial}
        castShadow
        receiveShadow
      >
        <T.CylinderGeometry args={[0.4, 0.4, 0.4]} />
      </T.Mesh>
    </RigidBody>
  </T.Group>
</T.Group>
