<script>
  import { MeshStandardMaterial } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";
  import { writable } from "svelte/store";
  import Player from "./Player.svelte";

  import PlayerController from "./PlayerController.svelte";

  export let scene;

  const status = writable("playing");
  let camera;
  let controls;

  const spawn = [...scene.nodes.Start.position];
  spawn[1] += 0.45;

  let playerPosition = spawn;
  let lastPlayerPosition;
  let canSelectPlayer = true;

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

  let player;
</script>

{#if scene}
  <T.PerspectiveCamera
    makeDefault
    bind:ref={camera}
    on:create={({ ref }) => {
      ref.position.set(0, 15, 25);
    }}
  >
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
      bind:target={playerPosition}
    />
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

      <CollisionGroups groups={[2]}>
        <AutoColliders
          sensor
          shape={"cuboid"}
          on:sensorenter={() => {
            player.moveTo(
              lastPlayerPosition ?? [spawn[0], spawn[1] + 0.45, spawn[2]]
            );
          }}
        >
          <T.Mesh
            geometry={scene.nodes.Ground.geometry}
            material={groundMaterial ?? scene.nodes.Ground.material}
          />
        </AutoColliders>
      </CollisionGroups>

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
    <Player
      bind:this={player}
      size={0.45}
      position={lastPlayerPosition ?? spawn}
      on:moved={(ev) => {
        let position = ev.detail;
        playerPosition = position;
        canSelectPlayer = false;
      }}
      on:stopped={(ev) => {
        let position = ev.detail;
        console.log("Stopped Moving", position);
        lastPlayerPosition = position;
        canSelectPlayer = true;
      }}
    />

    {#if player && canSelectPlayer}
      <PlayerController
        position={lastPlayerPosition ?? [spawn[0], spawn[1] + 0.45, spawn[2]]}
        size={0.45}
        {camera}
        on:selected={() => (controls.enabled = false)}
        on:apply={(ev) => {
          const hitpoint = ev.detail;
          if ((hitpoint.x !== 0 && hitpoint.y !== 0, hitpoint.z !== 0)) {
            player.hit(hitpoint);
          }
          controls.enabled = true;
        }}
      />
    {/if}
  </T.Group>
{/if}
