<script>
  import { T } from "@threlte/core";
  import { Canvas } from "@threlte/core";
  import { AutoColliders, Debug, World } from "@threlte/rapier";

  import { useGame } from "../useGame";

  import Stage from "./Stage.svelte";
  import MenuScene from "./MenuScene.svelte";
  import { useGltf } from "@threlte/extras";
  import Start from "./block/Start.svelte";
  import Extension from "./block/Extension.svelte";
  import End from "./block/End.svelte";
  import { RigidBody } from "@threlte/rapier";

  const game = useGame();
  let world;
</script>

<Canvas>
  <World bind:this={world} gravity={[0, -15, 0]}>
    <!-- <Debug /> -->
    <T.AmbientLight color="#ffffff" intensity={1} />
    {#if $game}
      <T.DirectionalLight
        color="#ffffff"
        intensity={2}
        position={[10, 10, 10]}
        castShadow
      />
      {#await useGltf($game.stages[$game.current].file) then scene}
        <T.PerspectiveCamera
          makeDefault
          on:create={({ ref }) => {
            ref.position.set(0, 3.5, -7.5);
            ref.lookAt(0, 0, -10);
          }}
        />
        <RigidBody>
          <AutoColliders shape={"ball"}>
            <T.Mesh position={[0, 0.25 + 0.5, -10]}>
              <T.IcosahedronGeometry args={[0.1, 3]} />
              <T.MeshStandardMaterial flatShading color={"red"} />
            </T.Mesh>
          </AutoColliders>
        </RigidBody>
        <!-- <Stage {scene} on:completed on:hit /> -->
        <Start />
        <Extension number={1} position={[0, 0, -5]} />
        <End number={1} position={[0, 0, -10]} />
      {/await}
    {:else}
      <MenuScene />
    {/if}
  </World>
</Canvas>
