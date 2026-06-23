<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;

  // Plinko pegs configuration
  export let pegRadius = 0.05;
  export let pegHeight = 0.5;

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];

  // 5-pin layout (quincunx)
  const d = 0.6; // distance from center
  const pegs = [
    { x: 0, z: 0 },
    { x: -d, z: -d },
    { x: d, z: -d },
    { x: -d, z: d },
    { x: d, z: d },
  ];
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    {#each pegs as peg}
      <T.Group position={[peg.x, pegHeight / 2, peg.z]}>
        <!-- Peg Visual -->
        <T.Mesh castShadow receiveShadow>
          <T.CylinderGeometry args={[pegRadius, pegRadius, pegHeight, 8]} />
          <T.MeshStandardMaterial 
            color="#f87171" 
            roughness={0.4} 
            metalness={0.1} 
          />
        </T.Mesh>

        <!-- Highly bouncy cylinder collider -->
        <Collider 
          shape="cylinder" 
          args={[pegHeight / 2, pegRadius]} 
          restitution={1.2} 
          friction={0.1}
        />
      </T.Group>
    {/each}
  </RigidBody>
</T.Group>
