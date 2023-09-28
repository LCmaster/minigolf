<script lang="ts">
  import { Group, Material, MeshStandardMaterial } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { OrbitControls, useGltf } from "@threlte/extras";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher, setContext } from "svelte";
  import Player from "./Player.svelte";

  export let name: string;
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
  export const ref = new Group();

  let camera;
  let controls;

  let player;
  let playerPosition = [0, 0, 0];
  $: gltf = useGltf(file);
  $: if ($gltf) {
    playerPosition = [...$gltf.nodes.Start.position];
    dispatch("loaded");
  }
</script>

{#if $gltf}
  <T.PerspectiveCamera makeDefault bind:ref={camera} position={[0, 30, 30]}>
    <OrbitControls
      bind:ref={controls}
      enableDamping
      dampingFactor={0.75}
      minDistance={25}
      maxDistance={30}
      enablePan={false}
      enableZoom={false}
      minPolarAngle={Math.PI * 0.05}
      maxPolarAngle={Math.PI * 0.3}
      target={playerPosition}
    />
  </T.PerspectiveCamera>

  <T is={ref} {...$$restProps} bind:this={$component}>
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
    <slot>
      <!-- <Player bind:this={player} size={0.45} bind:camera bind:controls /> -->
    </slot>
  </T>
{/if}
