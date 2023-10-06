<script>
  import { createEventDispatcher } from "svelte";

  import { MeshStandardMaterial } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { OrbitControls, Suspense } from "@threlte/extras";

  import Player from "./Player.svelte";
  import PlayerController from "./PlayerController.svelte";
  import Block from "./Block.svelte";

  export let scene;

  export let groundFriction = 0.75;
  export let groundRestitution = 0.75;

  export let wallFriction = 0.5;
  export let wallRestitution = 0.9;

  let camera;
  let controls;

  const spawn = [...scene.start.position];
  spawn[1] += 0.25 + 0.1;

  let player;
  let lastPlayerPosition;
  let playerPosition = spawn;
  let canSelectPlayer = true;

  let ballSize = 0.1;

  const courseMaterial = new MeshStandardMaterial({
    color: 0x99ccff,
  });
  const groundMaterial = new MeshStandardMaterial({
    color: "seagreen",
  });
  const wallMaterial = new MeshStandardMaterial({
    color: "sandybrown",
  });

  const dispatch = createEventDispatcher();
  const component = forwardEventHandlers();
</script>

{#if scene}
  <T.PerspectiveCamera
    makeDefault
    bind:ref={camera}
    on:create={({ ref }) => {
      ref.position.set(0, 2.5, 5);
    }}
  >
    <OrbitControls
      bind:ref={controls}
      enableDamping
      dampingFactor={0.75}
      minDistance={5}
      maxDistance={10}
      enablePan={false}
      enableZoom={false}
      minPolarAngle={Math.PI * 0.05}
      maxPolarAngle={Math.PI * 0.3}
      bind:target={playerPosition}
    />
  </T.PerspectiveCamera>

  <T.Group {...$$restProps} bind:this={$component}>
    <Suspense>
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
    </Suspense>
    <Player
      bind:this={player}
      size={ballSize}
      position={lastPlayerPosition ?? spawn}
      on:moved={(ev) => {
        let position = ev.detail;
        playerPosition = position;
        canSelectPlayer = false;
      }}
      on:stopped={(ev) => {
        let position = ev.detail;
        lastPlayerPosition = position;
        canSelectPlayer = true;
      }}
    />
    {#if player && canSelectPlayer}
      <PlayerController
        position={lastPlayerPosition ?? [spawn[0], spawn[1], spawn[2]]}
        size={ballSize}
        {camera}
        on:selected={() => (controls.enabled = false)}
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
  </T.Group>
{/if}
