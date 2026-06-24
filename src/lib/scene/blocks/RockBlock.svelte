<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody, CollisionGroups } from "@threlte/rapier";
  import { MeshToonMaterial, DodecahedronGeometry } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;
  export let variation = 1;

  $: actualRotation = Array.isArray(rotation)
    ? rotation
    : [0, Math.PI * rotation, 0];

  const rockMaterial = new MeshToonMaterial({ color: "#9BA4B5" }); // Vibrant slate grey

  // Instantiate geometries once to be shared across all RockBlock instances.
  // This solves memory leaks and ensures AutoColliders sees the geometry synchronously!
  const geomMain1 = new DodecahedronGeometry(2.5, 0);
  const geomRight1 = new DodecahedronGeometry(1.8, 0);
  const geomLeft1 = new DodecahedronGeometry(1.5, 0);

  const geomBase2 = new DodecahedronGeometry(2.0, 0);
  const geomStacked2 = new DodecahedronGeometry(1.5, 0);
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    {#if variation === 1}
      <!-- Chunky Dodecahedron Cluster -->
      <T.Group position={[0, 0, 0]}>
        <!-- Main Center Rock -->
        <T.Group position={[0, 1.5, 0]} scale={[1, 0.8, 1]} rotation={[0.1, 0.2, 0]}>
          <Collider shape="convexHull" args={[geomMain1.attributes.position.array]} collisionGroups={0x0001FFFF} />
          <T.Mesh geometry={geomMain1} material={rockMaterial} castShadow receiveShadow />
        </T.Group>
        
        <!-- Side Rock Right -->
        <T.Group position={[1.8, 0.8, 1.0]} scale={[1.2, 0.7, 1]} rotation={[0, 0.8, 0.5]}>
          <Collider shape="convexHull" args={[geomRight1.attributes.position.array]} collisionGroups={0x0001FFFF} />
          <T.Mesh geometry={geomRight1} material={rockMaterial} castShadow receiveShadow />
        </T.Group>

        <!-- Side Rock Left -->
        <T.Group position={[-1.5, 0.6, -0.8]} scale={[1, 0.6, 1.3]} rotation={[1.0, 0, 0]}>
          <Collider shape="convexHull" args={[geomLeft1.attributes.position.array]} collisionGroups={0x0001FFFF} />
          <T.Mesh geometry={geomLeft1} material={rockMaterial} castShadow receiveShadow />
        </T.Group>
      </T.Group>
    {:else}
      <!-- Flat Slate Cluster -->
      <T.Group position={[0, 0, 0]}>
        <!-- Base Rock -->
        <T.Group position={[0, 0.6, 0]} scale={[1.5, 0.4, 1.2]} rotation={[0, 1.2, 0]}>
          <Collider shape="convexHull" args={[geomBase2.attributes.position.array]} collisionGroups={0x0001FFFF} />
          <T.Mesh geometry={geomBase2} material={rockMaterial} castShadow receiveShadow />
        </T.Group>
        
        <!-- Stacked Rock -->
        <T.Group position={[-0.5, 1.2, 0.5]} scale={[1.1, 0.3, 0.9]} rotation={[0.2, 0.4, 0.1]}>
          <Collider shape="convexHull" args={[geomStacked2.attributes.position.array]} collisionGroups={0x0001FFFF} />
          <T.Mesh geometry={geomStacked2} material={rockMaterial} castShadow receiveShadow />
        </T.Group>
      </T.Group>
    {/if}
  </RigidBody>
</T.Group>
