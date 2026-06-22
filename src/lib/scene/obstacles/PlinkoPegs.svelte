<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  // Plinko pegs configuration
  export let rows = 4;
  export let cols = 4;
  export let spacing = 0.5;
  export let pegRadius = 0.05;
  export let pegHeight = 0.5;

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];

  // Generate staggered peg positions
  $: pegs = (() => {
    let p = [];
    const offsetX = (cols * spacing) / 2 - (spacing / 2);
    const offsetZ = (rows * spacing) / 2 - (spacing / 2);
    for (let r = 0; r < rows; r++) {
      const stagger = (r % 2 === 0) ? 0 : spacing / 2;
      for (let c = 0; c < cols; c++) {
        p.push({
          x: c * spacing - offsetX + stagger,
          z: r * spacing - offsetZ
        });
      }
    }
    return p;
  })();
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type="fixed">
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
