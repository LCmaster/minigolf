<script lang="ts">
  import { Group, Mesh, Vector3 } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

  import CameraControls from "./CameraControls.svelte";

  // === WORLD PROPERTIES === //
  export let position: Array<number> = [0, 0, 0];

  // === GRAPHICAL PROPERTIES === //
  export let size: number = 0.45;
  export let color: string = "#FF0000";

  // === PHYSICAL PROPERTIES === //
  export let friction: number = 2;
  export let restitution: number = 0.5;

  let body: any;
  let mesh: Mesh;

  let currentPosition: Array<number>;
  let selectionGroup: Group;

  useFrame(() => {
    if (!body?.isSleeping()) {
      let worldPosition = new Vector3();
      mesh.getWorldPosition(worldPosition);
      currentPosition = [...worldPosition];
    }
  });
</script>

<RigidBody
  type="dynamic"
  linearDamping={0.3}
  angularDamping={0.3}
  bind:rigidBody={body}
>
  <AutoColliders shape={"ball"} {friction} {restitution}>
    <T.Mesh bind:ref={mesh} {position}>
      <T.IcosahedronGeometry args={[size, 3]} />
      <T.MeshStandardMaterial flatShading {color} />
    </T.Mesh>
  </AutoColliders>
</RigidBody>

<T.Group bind:position={currentPosition} bind:ref={selectionGroup}>
  <T.Mesh>
    <T.SphereGeometry args={[size + 0.75, 32, 16]} />
    <T.MeshBasicMaterial transparent opacity={0.25} color={"white"} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI * 0.5}>
    <T.RingGeometry args={[size + 0.75, 5 + size + 0.75, 32]} />
    <T.MeshBasicMaterial transparent opacity={0.0} color={"white"} />
  </T.Mesh>
</T.Group>
<T.PerspectiveCamera makeDefault>
  <CameraControls bind:object={mesh} />
</T.PerspectiveCamera>
