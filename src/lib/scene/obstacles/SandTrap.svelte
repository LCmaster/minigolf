<script context="module">
  import { BoxGeometry, IcosahedronGeometry, MeshStandardMaterial } from "three";

  const sandGeo = new BoxGeometry(2, 0.01, 2);
  const sandMat = new MeshStandardMaterial({
    color: "#eab308",
    roughness: 1.0,
    metalness: 0.0,
  });
  const rockGeo = new IcosahedronGeometry(1, 0);
  const rockMat = new MeshStandardMaterial({
    color: "#737373",
    roughness: 0.9,
  });
</script>

<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;

  const dispatch = createEventDispatcher();

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];

  // Generate random perimeter rocks
  const numRocks = 4 + Math.floor(Math.random() * 3);
  const rocks = [];
  for (let i = 0; i < numRocks; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.8 + Math.random() * 0.2;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const rScale = 0.05 + Math.random() * 0.05;
    const rRot = [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI];
    rocks.push({ position: [rx, 0.02, rz], scale: [rScale, rScale, rScale], rotation: rRot });
  }
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <!-- Visual representation: Sandy colored square (Thin decal) -->
  <T.Mesh geometry={sandGeo} material={sandMat} position={[0, 0.005, 0]} receiveShadow />

  <!-- Decorative Edge Rocks -->
  {#each rocks as rock}
    <T.Mesh
      geometry={rockGeo}
      material={rockMat}
      position={rock.position}
      scale={rock.scale}
      rotation={rock.rotation}
      castShadow
      receiveShadow
    />
  {/each}

  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <T.Group position={[0, 0.5, 0]}>
      <Collider 
        shape="cuboid" 
        args={[1, 0.5, 1]} 
        sensor 
        on:sensorenter={() => !isEditor && dispatch('sandenter')}
        on:sensorexit={() => !isEditor && dispatch('sandexit')}
      />
    </T.Group>
  </RigidBody>
</T.Group>
