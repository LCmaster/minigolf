<script>
  import { createEventDispatcher } from "svelte";

  import {
    BoxGeometry,
    CubeTextureLoader,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
  } from "three";
  import {
    T,
    forwardEventHandlers,
    useLoader,
    useThrelte,
  } from "@threlte/core";
  import { GLTF, OrbitControls, Suspense, useTexture } from "@threlte/extras";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

  import Player from "./Player.svelte";
  import PlayerController from "./PlayerController.svelte";
  import Block from "./Block.svelte";

  export let scene;

  export let groundFriction = 0.75;
  export let groundRestitution = 0.75;

  export let wallFriction = 0.5;
  export let wallRestitution = 0.9;

  let ballSize = 0.1;
  let tileHeight = 0.25;

  let camera;
  let controls;

  const spawn = [...scene.start.position];
  spawn[1] += tileHeight + ballSize + 0.1;

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

  if (scene.environement.skybox) {
    const { scene: threeScene } = useThrelte();
    const textures = [
      "px.png",
      "nx.png",
      "py.png",
      "ny.png",
      "pz.png",
      "nz.png",
    ];
    threeScene.background = new CubeTextureLoader()
      .setPath(`/skybox/${scene.environement.skybox}/`)
      .load(textures);
  }

  const dispatch = createEventDispatcher();
  const component = forwardEventHandlers();

  $: console.log(respawnPoints);
</script>

{#if scene}
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
      maxPolarAngle={Math.PI * 0.45}
      bind:target={playerPosition}
    />
  </T.PerspectiveCamera>

  <T.Group {...$$restProps} bind:this={$component}>
    <Suspense
      on:load={() => {
        loaded = true;
      }}
    >
      {#if scene.environement.file}
        <GLTF url={scene.environement.file} />
      {/if}
      {#if scene.ground}
        <RigidBody type="fixed">
          <AutoColliders
            shape={scene.ground.type}
            on:contact={() => {
              const pos = [...respawnPoints[respawnPoints.length - 1]];
              player.moveTo(pos);
            }}
          >
            <T.Mesh>
              <T.BoxGeometry args={[1000, 0.1, 1000]} />
              <T.MeshBasicMaterial color={"#567D46"} />
            </T.Mesh>
          </AutoColliders>
        </RigidBody>
      {/if}
      <RigidBody type={"fixed"}>
        <Block
          type={"start"}
          {...scene.start}
          {wallMaterial}
          groundMaterial={courseMaterial}
          {wallFriction}
          {wallRestitution}
          {groundFriction}
          {groundRestitution}
        />
        <Block
          type={"end"}
          {...scene.end}
          {wallMaterial}
          groundMaterial={courseMaterial}
          {wallFriction}
          {wallRestitution}
          {groundFriction}
          {groundRestitution}
          on:completed={() => {
            player.setEnabled(false);
            dispatch("completed");
          }}
        />
        {#each scene.blocks as block (block.position)}
          <Block
            {...block}
            {wallMaterial}
            groundMaterial={courseMaterial}
            {wallFriction}
            {wallRestitution}
            {groundFriction}
            {groundRestitution}
          />
        {/each}
      </RigidBody>
    </Suspense>
    {#if loaded}
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
    {/if}
  </T.Group>
{/if}
