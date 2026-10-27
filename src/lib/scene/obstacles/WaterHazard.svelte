<script context="module">
  import { BoxGeometry, MeshStandardMaterial } from "three";

  const deepGeo = new BoxGeometry(2.0, 0.4, 2.0);
  const midGeo = new BoxGeometry(1.9, 0.3, 1.9);
  const surfaceGeo = new BoxGeometry(1.8, 0.2, 1.8);

  const deepMat = new MeshStandardMaterial({
    color: "#1e3a8a",
    transparent: true,
    opacity: 0.9,
    roughness: 0.1,
    metalness: 0.8,
  });
  const midMat = new MeshStandardMaterial({
    color: "#2563eb",
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.8,
  });
  const surfaceMat = new MeshStandardMaterial({
    color: "#60a5fa",
    transparent: true,
    opacity: 0.4,
    roughness: 0.0,
    metalness: 0.9,
  });
</script>

<script>
  import { T, useFrame } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let isEditor = false;

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];

  const dispatch = createEventDispatcher();

  function handleSensor(e) {
    if (isEditor) return;
    const detail = e.detail || e;
    const targetBody = detail.otherRigidBody || detail.rigidBody || detail.targetRigidBody;
    if (targetBody) {
      dispatch("waterhazard", { body: targetBody });
    }
  }

  let deepMesh;
  let midMesh;
  let surfaceMesh;
  let time = 0;

  useFrame((_, delta) => {
    time += delta;
    if (deepMesh) deepMesh.position.y = -0.3 + Math.sin(time * 2) * 0.05;
    if (midMesh) midMesh.position.y = -0.15 + Math.sin(time * 2.5 + 1) * 0.04;
    if (surfaceMesh) surfaceMesh.position.y = -0.05 + Math.sin(time * 3 + 2) * 0.03;
  });
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <!-- Water Visual Layers -->
  <!-- Layer 1: Deep -->
  <T.Mesh bind:ref={deepMesh} geometry={deepGeo} material={deepMat} position={[0, -0.3, 0]} receiveShadow />

  <!-- Layer 2: Mid -->
  <T.Mesh bind:ref={midMesh} geometry={midGeo} material={midMat} position={[0, -0.15, 0]} receiveShadow />

  <!-- Layer 3: Surface -->
  <T.Mesh bind:ref={surfaceMesh} geometry={surfaceGeo} material={surfaceMat} position={[0, -0.05, 0]} receiveShadow />

  <!-- Water Sensor: triggers when ball enters it -->
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <T.Group position={[0, -0.05, 0]}>
      <Collider 
        shape="cuboid" 
        args={[1, 0.2, 1]} 
        sensor 
        on:sensorenter={handleSensor}
      />
    </T.Group>
  </RigidBody>
</T.Group>
