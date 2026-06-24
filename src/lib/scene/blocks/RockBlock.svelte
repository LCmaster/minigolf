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

  // Helper to pre-scale vertices for Rapier convexHull since it ignores scale
  function getScaledVertices(geometry, localScale, globalScale) {
    const positions = geometry.attributes.position.array;
    const scaled = new Float32Array(positions.length);
    const sx = localScale[0] * globalScale[0];
    const sy = localScale[1] * globalScale[1];
    const sz = localScale[2] * globalScale[2];
    for (let i = 0; i < positions.length; i += 3) {
      scaled[i] = positions[i] * sx;
      scaled[i+1] = positions[i+1] * sy;
      scaled[i+2] = positions[i+2] * sz;
    }
    return scaled;
  }

  $: vertsMain1 = getScaledVertices(geomMain1, [1, 0.8, 1], scale);
  $: vertsRight1 = getScaledVertices(geomRight1, [1.2, 0.7, 1], scale);
  $: vertsLeft1 = getScaledVertices(geomLeft1, [1, 0.6, 1.3], scale);
  
  $: vertsBase2 = getScaledVertices(geomBase2, [1.5, 0.4, 1.2], scale);
  $: vertsStacked2 = getScaledVertices(geomStacked2, [1.1, 0.3, 0.9], scale);
</script>

<T.Group {position} rotation={actualRotation} {scale} userData={{ isScenery: true }}>
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    {#if variation === 1}
      <!-- Chunky Dodecahedron Cluster -->
      <T.Group position={[0, 0, 0]}>
        <!-- Main Center Rock -->
        <T.Group position={[0, 1.5, 0]} scale={[1, 0.8, 1]} rotation={[0.1, 0.2, 0]}>
          {#key scale.join(',')}
            <Collider shape="convexHull" args={[vertsMain1]} collisionGroups={0x0001FFFF} restitution={0.5} />
          {/key}
          <T.Mesh geometry={geomMain1} material={rockMaterial} castShadow receiveShadow />
        </T.Group>
        
        <!-- Side Rock Right -->
        <T.Group position={[1.8, 0.8, 1.0]} scale={[1.2, 0.7, 1]} rotation={[0, 0.8, 0.5]}>
          {#key scale.join(',')}
            <Collider shape="convexHull" args={[vertsRight1]} collisionGroups={0x0001FFFF} restitution={0.5} />
          {/key}
          <T.Mesh geometry={geomRight1} material={rockMaterial} castShadow receiveShadow />
        </T.Group>

        <!-- Side Rock Left -->
        <T.Group position={[-1.5, 0.6, -0.8]} scale={[1, 0.6, 1.3]} rotation={[1.0, 0, 0]}>
          {#key scale.join(',')}
            <Collider shape="convexHull" args={[vertsLeft1]} collisionGroups={0x0001FFFF} restitution={0.5} />
          {/key}
          <T.Mesh geometry={geomLeft1} material={rockMaterial} castShadow receiveShadow />
        </T.Group>
      </T.Group>
    {:else}
      <!-- Flat Slate Cluster -->
      <T.Group position={[0, 0, 0]}>
        <!-- Base Rock -->
        <T.Group position={[0, 0.6, 0]} scale={[1.5, 0.4, 1.2]} rotation={[0, 1.2, 0]}>
          {#key scale.join(',')}
            <Collider shape="convexHull" args={[vertsBase2]} collisionGroups={0x0001FFFF} restitution={0.5} />
          {/key}
          <T.Mesh geometry={geomBase2} material={rockMaterial} castShadow receiveShadow />
        </T.Group>
        
        <!-- Stacked Rock -->
        <T.Group position={[-0.5, 1.2, 0.5]} scale={[1.1, 0.3, 0.9]} rotation={[0.2, 0.4, 0.1]}>
          {#key scale.join(',')}
            <Collider shape="convexHull" args={[vertsStacked2]} collisionGroups={0x0001FFFF} restitution={0.5} />
          {/key}
          <T.Mesh geometry={geomStacked2} material={rockMaterial} castShadow receiveShadow />
        </T.Group>
      </T.Group>
    {/if}
  </RigidBody>
</T.Group>
