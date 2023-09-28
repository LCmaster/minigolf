<script lang="ts">
  import { MeshStandardMaterial } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { OrbitControls, useGltf } from "@threlte/extras";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher, setContext } from "svelte";
  import { camera, controls, spawn, playerPosition } from "../lib/scene";
  import Player from "./Player.svelte";

  export let file: string;

  // === GRAPHICAL PROPERTIES === //
  const courseMaterial = new MeshStandardMaterial({
    color: 0x99ccff,
  });
  const groundMaterial = new MeshStandardMaterial({
    color: "seagreen",
  });

  // === PHYSICAL PROPERTIES === //
  export let friction: number = 0.75;
  export let restitution: number = 0.75;

  // === EVENTS === //
  const dispatch = createEventDispatcher();

  const component = forwardEventHandlers();

  const gltf = useGltf(file);
  $: if ($gltf) {
    $spawn = [...$gltf.nodes.Start.position];
  }
</script>

{#if $gltf}
  <T.PerspectiveCamera
    makeDefault
    bind:ref={$camera}
    on:create={({ ref }) => {
      ref.position.set(0, 15, 30);
    }}
  >
    {#if $playerPosition}
      <OrbitControls
        bind:ref={$controls}
        enableDamping
        dampingFactor={0.75}
        minDistance={25}
        maxDistance={30}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.05}
        maxPolarAngle={Math.PI * 0.3}
        target={$playerPosition}
      />
    {/if}
  </T.PerspectiveCamera>

  <T.Group {...$$restProps} bind:this={$component}>
    <RigidBody type="fixed">
      <AutoColliders shape={"trimesh"} {friction} {restitution}>
        <T.Mesh
          geometry={$gltf.nodes.Course.geometry}
          material={courseMaterial ?? $gltf.nodes.Course.material}
        />
      </AutoColliders>

      <AutoColliders shape={"cuboid"}>
        <T.Mesh
          geometry={$gltf.nodes.Ground.geometry}
          material={groundMaterial ?? $gltf.nodes.Ground.material}
        />
      </AutoColliders>

      <CollisionGroups groups={[1]}>
        <AutoColliders
          sensor
          shape={"cuboid"}
          on:sensorenter={() => dispatch("completed")}
        >
          <T.Mesh position={[...$gltf.nodes.Target.position]}>
            <T.BoxGeometry args={[2.5, 0.01, 2.5]} />
            <T.MeshBasicMaterial transparent opacity={0.0} />
          </T.Mesh>
        </AutoColliders>
      </CollisionGroups>
    </RigidBody>
    <Player size={0.45} />
  </T.Group>
{/if}
