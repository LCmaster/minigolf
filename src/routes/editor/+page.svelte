<script>
  import { T, Canvas } from "@threlte/core";
  import { World } from "@threlte/rapier";
  import { OrbitControls } from "@threlte/extras";
  import Scene from "./Scene.svelte";
  import { editor, blocks } from "./store";
  import BlockPicker from "./BlockPicker.svelte";

  export let data;

  let slotSelected;
</script>

<div class="fixed top-0 left-0 w-screen h-screen overflow-hidden">
  <Canvas>
    <World gravity={[0, -15, 0]}>
      <T.PerspectiveCamera
        makeDefault
        fov={70}
        on:create={({ ref }) => {
          ref.position.set(0, 5, 5);
          ref.lookAt(0, 0, 0);
        }}
      >
        <OrbitControls />
      </T.PerspectiveCamera>
      <Scene
        on:slotSelected={(ev) => {
          const { position } = ev.detail;
          slotSelected = position;
        }}
      />
    </World>
  </Canvas>
</div>

{#if slotSelected}
  <div class="fixed top-0 left-0 w-screen h-screen">
    <button
      class="absolute top-0 left-0 w-screen h-screen bg-black/50"
      on:click={() => (slotSelected = null)}
    />
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <BlockPicker
        on:cancel={() => (slotSelected = null)}
        on:add={(ev) => {
          const { type, variation, rotation } = ev.detail;
          $blocks = [
            ...$blocks,
            { type, variation, position: slotSelected, rotation },
          ];
          slotSelected = null;
        }}
      />
    </div>
  </div>
{/if}
