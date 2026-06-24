<script>
  import { T, useFrame } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { MeshStandardMaterial, Quaternion, Vector3 } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  export let speed = 2.0;
  export let isEditor = false;

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation)
    ? safeRotation
    : [0, Math.PI * safeRotation, 0];

  const redBarnMaterial = new MeshStandardMaterial({ color: "#dc2626", roughness: 0.8 });
  const whiteTrimMaterial = new MeshStandardMaterial({ color: "#f8fafc", roughness: 0.5 });
  const roofMaterial = new MeshStandardMaterial({ color: "#1e3a8a", roughness: 0.7 });
  const woodMaterial = new MeshStandardMaterial({ color: "#8b4513", roughness: 0.9 });
  const sailMaterial = new MeshStandardMaterial({ color: "#fef08a", roughness: 0.9 });

  let rotorGroup;
  let rotorBodies = Array(9).fill(null);
  let rotorMeshes = Array(9).fill(null);
  const worldQ = new Quaternion();
  const worldP = new Vector3();

  useFrame((state, delta) => {
    if (rotorGroup) {
      // Spin the visual group
      rotorGroup.rotateZ(speed * delta);
      // Force Three.js to compute the new world matrices immediately
      rotorGroup.updateMatrixWorld(true);

      // Manually sync all 9 individual rigid bodies to their visual counterparts
      for (let i = 0; i < 9; i++) {
        if (rotorBodies[i] && rotorMeshes[i]) {
          rotorMeshes[i].getWorldPosition(worldP);
          rotorMeshes[i].getWorldQuaternion(worldQ);
          rotorBodies[i].setNextKinematicTranslation(worldP);
          rotorBodies[i].setNextKinematicRotation(worldQ);
        }
      }
    }
  });
</script>

<T.Group {position} rotation={actualRotation} {scale} userData={{ isScenery: true }}>
  <!-- STATIC BASE BUILDING (Visuals + Physics combined elegantly) -->
  
  <!-- Base Floor (Tunnel floor) -->
  <T.Group position={[0, -0.1, 0]}>
    <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
      <Collider shape="cuboid" args={[2, 0.1, 1.5]} collisionGroups={0x0001FFFF} />
    </RigidBody>
    <T.Mesh material={whiteTrimMaterial} castShadow receiveShadow>
      <T.BoxGeometry args={[4, 0.2, 3]} />
    </T.Mesh>
  </T.Group>

  <!-- Left Wall -->
  <T.Group position={[-1.25, 1.0, 0]}>
    <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
      <Collider shape="cuboid" args={[0.75, 1.0, 1.5]} />
    </RigidBody>
    <T.Mesh material={redBarnMaterial} castShadow receiveShadow>
      <T.BoxGeometry args={[1.5, 2.0, 3]} />
    </T.Mesh>
  </T.Group>

  <!-- Right Wall -->
  <T.Group position={[1.25, 1.0, 0]}>
    <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
      <Collider shape="cuboid" args={[0.75, 1.0, 1.5]} />
    </RigidBody>
    <T.Mesh material={redBarnMaterial} castShadow receiveShadow>
      <T.BoxGeometry args={[1.5, 2.0, 3]} />
    </T.Mesh>
  </T.Group>

  <!-- Tunnel Ceiling / Base Top -->
  <T.Group position={[0, 2.1, 0]}>
    <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
      <Collider shape="cuboid" args={[2, 0.1, 1.6]} />
    </RigidBody>
    <T.Mesh material={whiteTrimMaterial} castShadow receiveShadow>
      <T.BoxGeometry args={[4, 0.2, 3.2]} />
    </T.Mesh>
  </T.Group>

  <!-- Octagonal Tower -->
  <T.Group position={[0, 3.45, 0]}>
    <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
      <Collider shape="cylinder" args={[1.25, 1.25]} />
    </RigidBody>
    <T.Mesh material={redBarnMaterial} castShadow receiveShadow>
      <T.CylinderGeometry args={[1.0, 1.5, 2.5, 8]} />
    </T.Mesh>
  </T.Group>

  <!-- Roof Trim -->
  <T.Group position={[0, 4.75, 0]}>
    <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
      <Collider shape="cylinder" args={[0.1, 1.1]} />
    </RigidBody>
    <T.Mesh material={whiteTrimMaterial} castShadow receiveShadow>
      <T.CylinderGeometry args={[1.1, 1.1, 0.2, 8]} />
    </T.Mesh>
  </T.Group>

  <!-- Roof Dome/Cone -->
  <T.Group position={[0, 5.6, 0]}>
    <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
      <Collider shape="cylinder" args={[0.75, 0.8]} />
    </RigidBody>
    <T.Mesh material={roofMaterial} castShadow receiveShadow>
      <T.ConeGeometry args={[0, 1.1, 1.5, 8]} />
    </T.Mesh>
  </T.Group>

  <!-- KINEMATIC ROTOR (The moving blades) -->
  <T.Group position={[0, 3.5, 1.4]} bind:ref={rotorGroup}>
    
    <!-- Hub / Axle -->
    <T.Group rotation={[Math.PI / 2, 0, 0]} bind:ref={rotorMeshes[0]}>
      <RigidBody type="kinematicPosition" bind:rigidBody={rotorBodies[0]}>
        <Collider shape="cylinder" args={[0.2, 0.3]} restitution={0.5} />
      </RigidBody>
      <T.Mesh material={woodMaterial} castShadow receiveShadow>
        <T.CylinderGeometry args={[0.3, 0.3, 0.4, 16]} />
      </T.Mesh>
    </T.Group>

    <!-- 4 Blades -->
    {#each [0, 1, 2, 3] as i}
      <T.Group rotation={[0, 0, (Math.PI / 2) * i]}>
        
        <!-- Wooden Arm -->
        <T.Group position={[0, 1.8, 0]} bind:ref={rotorMeshes[1 + i * 2]}>
          <RigidBody type="kinematicPosition" bind:rigidBody={rotorBodies[1 + i * 2]}>
            <Collider shape="cuboid" args={[0.1, 1.8, 0.05]} restitution={0.5} />
          </RigidBody>
          <T.Mesh material={woodMaterial} castShadow receiveShadow>
            <T.BoxGeometry args={[0.2, 3.6, 0.1]} />
          </T.Mesh>
        </T.Group>

        <!-- Sail Cloth -->
        <T.Group position={[0.4, 2.2, 0]} bind:ref={rotorMeshes[2 + i * 2]}>
          <RigidBody type="kinematicPosition" bind:rigidBody={rotorBodies[2 + i * 2]}>
            <Collider shape="cuboid" args={[0.3, 1.2, 0.02]} restitution={0.2} />
          </RigidBody>
          <T.Mesh material={sailMaterial} castShadow receiveShadow>
            <T.BoxGeometry args={[0.6, 2.4, 0.04]} />
          </T.Mesh>
        </T.Group>

      </T.Group>
    {/each}

  </T.Group>
</T.Group>
