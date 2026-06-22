<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];

</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <!-- Fixed RigidBody ensures it doesn't move but collides -->
  <RigidBody type="fixed">
    <!-- Visual representation: Light blue icy square -->
    <T.Mesh position={[0, 0.05, 0]} receiveShadow>
      <T.BoxGeometry args={[2, 0.1, 2]} />
      <T.MeshStandardMaterial 
        color="#a5f3fc" 
        roughness={0.0} 
        metalness={0.2} 
        transparent={true} 
        opacity={0.8} 
      />
    </T.Mesh>

    <!-- Collider with zero friction -->
    <Collider 
      shape="cuboid" 
      args={[1, 0.05, 1]} 
      position={[0, 0.05, 0]} 
      friction={0.0} 
      restitution={0.2}
    />
  </RigidBody>
</T.Group>
