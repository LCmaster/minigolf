<script>
  import { createEventDispatcher } from "svelte";

  import { MeshStandardMaterial, RepeatWrapping } from "three";

  import { T, forwardEventHandlers } from "@threlte/core";
  import {
    Environment,
    OrbitControls,
    Suspense,
    useSuspense,
    useTexture,
  } from "@threlte/extras";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

  import Player from "./Player.svelte";
  import PlayerController from "./PlayerController.svelte";

  import SplineTrack from "../../routes/editor/components/SplineTrack.svelte";

  export let controlPoints;
  export let skybox;

  export let groundFriction = 0.75;
  export let groundRestitution = 0.75;

  export let wallFriction = 0.75;
  export let wallRestitution = 0.95;

  let ballSize = 0.1;
  let tileHeight = 0.5;

  let camera;
  let controls;

  const spawn = controlPoints && controlPoints.length > 0 ? [...controlPoints[0].position] : [0, 0, 0];
  spawn[1] += tileHeight + ballSize + 0.01;

  let player;
  let respawnPoints = [[...spawn]];
  let playerPosition = spawn;
  let canSelectPlayer = true;

  let loaded = false;

  const courseMaterial = new MeshStandardMaterial({
    color: 0x99ccff,
  });
  const groundMaterial = new MeshStandardMaterial({
    color: "seagreen",
  });
  const wallMaterial = new MeshStandardMaterial({
    color: "sandybrown",
  });

  const suspend = useSuspense();
  const dispatch = createEventDispatcher();
  const component = forwardEventHandlers();

  $: endPos = controlPoints && controlPoints.length > 0 ? controlPoints[controlPoints.length - 1].position : [0,0,0];

  $: texture = useTexture("/low_poly_grass.png");
  $: if ($texture) {
    $texture.wrapS = RepeatWrapping;
    $texture.wrapT = RepeatWrapping;
    $texture.repeat.set(100, 100);
  }
</script>

<Environment
  path={`/skybox/${skybox}/`}
  files={["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]}
  isBackground={true}
/>
<T.PerspectiveCamera
  makeDefault
  fov={70}
  bind:ref={camera}
  on:create={({ ref }) => {
    ref.position.set(0, 2.5, 5);
  }}
>
  <OrbitControls
    bind:ref={controls}
    enableDamping
    dampingFactor={0.75}
    minDistance={2.5}
    maxDistance={7.5}
    enablePan={false}
    enableZoom={false}
    minPolarAngle={Math.PI * 0.05}
    maxPolarAngle={Math.PI * 0.35}
    bind:target={playerPosition}
  />
</T.PerspectiveCamera>

<T.Group {...$$restProps} bind:this={$component}>
  <Suspense on:load={() => console.log("Loaded")}>
      <RigidBody type="fixed">
        <!-- SplineTrack already wraps itself in AutoColliders, but we might want custom friction. For now just render it -->
        <SplineTrack {controlPoints} />

        <AutoColliders
          shape="cuboid"
          sensor
          on:sensorenter={() => {
            player.setEnabled(false);
            dispatch("completed");
          }}
        >
          <T.Mesh position={endPos}>
            <T.BoxGeometry args={[1, 0.25, 1]} />
            <T is={courseMaterial} transparent opacity={0} />
          </T.Mesh>
        </AutoColliders>
      </RigidBody>
      <RigidBody type="fixed">
        <AutoColliders
          shape={"cuboid"}
          on:contact={() => {
            const pos = [...respawnPoints[respawnPoints.length - 1]];
            player.moveTo(pos);
            playerPosition = pos;
          }}
        >
          <T.Mesh>
            <T.BoxGeometry args={[1000, 0.1, 1000]} />
            {#if $texture}
              <T.MeshStandardMaterial map={$texture} color={"#ffffff"} />
            {:else}
              <T.MeshBasicMaterial color={"#567D46"} />
            {/if}
          </T.Mesh>
        </AutoColliders>
      </RigidBody>
      <Player
        bind:this={player}
        size={ballSize}
        position={[...spawn]}
        on:moved={(ev) => {
          let position = ev.detail;
          playerPosition = position;
          canSelectPlayer = false;
        }}
        on:stopped={(ev) => {
          let position = ev.detail;
          if (respawnPoints.slice(-1) !== position) {
            respawnPoints.push([...position]);
            respawnPoints = respawnPoints;
          }
          canSelectPlayer = true;
        }}
      />
      {#if player && canSelectPlayer}
        <PlayerController
          position={respawnPoints[respawnPoints.length - 1]}
          size={ballSize}
          {camera}
          on:selected={() => {
            controls.enabled = false;
          }}
          on:apply={(ev) => {
            const hitpoint = ev.detail;
            if ((hitpoint.x !== 0 && hitpoint.y !== 0, hitpoint.z !== 0)) {
              player.hit(hitpoint);
              dispatch("hit");
            }
            controls.enabled = true;
          }}
        />
      {/if}
    </Suspense>
</T.Group>
