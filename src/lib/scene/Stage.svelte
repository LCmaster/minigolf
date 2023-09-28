<script>
  import { MeshStandardMaterial } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { OrbitControls, useGltf } from "@threlte/extras";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher, setContext } from "svelte";
  import Player from "./Player.svelte";
  import { writable } from "svelte/store";

  export let scene;

  const status = writable("playing");
  const camera = writable(null);
  const controls = writable(null);
  const spawn = writable([...scene.nodes.Start.position]);
  const playerPosition = writable([...scene.nodes.Start.position]);

  setContext("minigolf/game/stage/context", {
    status,
    camera,
    controls,
    spawn,
    playerPosition,
  });

  // === GRAPHICAL PROPERTIES === //
  const courseMaterial = new MeshStandardMaterial({
    color: 0x99ccff,
  });
  const groundMaterial = new MeshStandardMaterial({
    color: "seagreen",
  });

  // === PHYSICAL PROPERTIES === //
  export let friction = 0.75;
  export let restitution = 0.75;

  // === EVENTS === //
  const dispatch = createEventDispatcher();
  const component = forwardEventHandlers();
</script>

{#if scene}
  <T.PerspectiveCamera
    makeDefault
    bind:ref={$camera}
    on:create={({ ref }) => {
      ref.position.set(0, 15, 25);
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
          geometry={scene.nodes.Course.geometry}
          material={courseMaterial ?? scene.nodes.Course.material}
        />
      </AutoColliders>

      <AutoColliders shape={"cuboid"}>
        <T.Mesh
          geometry={scene.nodes.Ground.geometry}
          material={groundMaterial ?? scene.nodes.Ground.material}
        />
      </AutoColliders>

      <CollisionGroups groups={[1]}>
        <AutoColliders
          sensor
          shape={"cuboid"}
          on:sensorenter={() => {
            $status = "completed";
            dispatch("completed");
          }}
        >
          <T.Mesh position={[...scene.nodes.Target.position]}>
            <T.BoxGeometry args={[2.5, 0.01, 2.5]} />
            <T.MeshBasicMaterial transparent opacity={0.0} />
          </T.Mesh>
        </AutoColliders>
      </CollisionGroups>
    </RigidBody>
    <Player size={0.45} />
  </T.Group>
{/if}
