<script>
  import { T, Canvas } from "@threlte/core";
  import { World } from "@threlte/rapier";
  import { OrbitControls } from "@threlte/extras";
  import Scene from "./Scene.svelte";
  import { editor, blocks } from "./store";
  import BlockPicker from "./BlockPicker.svelte";
  import Backdrop from "../../lib/component/Backdrop.svelte";

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
<!-- <button class="fixed bottom-4 right-4 btn-icon">
  <img src="/editor/play.svg" alt="Play" class="block h-10 w-10" />
</button> -->
{#if $editor.selected !== null}
  <button
    class="fixed bottom-20 right-4 btn-icon"
    on:click={() => {
      const index = $editor.selected;
      $blocks.splice(index, 1);
      $blocks = [...$blocks];
      $editor.selected = null;
    }}
  >
    <img src="/editor/garbage.svg" alt="Delete" class="block h-10 w-10" />
  </button>
  <div class="fixed top-0 left-0">
    <div class="card h-screen rounded-none">
      <div class="p-4">
        <label class="label">
          <span>Type</span>
          <select class="select" bind:value={$blocks[$editor.selected].type}>
            <option value="extension">Extension</option>
            <option value="curve">Curve</option>
            <option value="slope">Slope</option>
            <option value="fork">Fork</option>
            <option value="end">End</option>
          </select>
        </label>
        <label class="label">
          <span>Variation</span>
          <select
            class="select"
            bind:value={$blocks[$editor.selected].variation}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <label class="label">
          <span>Rotation</span>
          <select
            class="select"
            value={$blocks[$editor.selected].rotation.toString()}
            on:change={(ev) => {
              const block = $blocks[$editor.selected];
              const rotation = parseFloat(ev.target.value);
              $blocks[$editor.selected] = { ...block, rotation };
            }}
          >
            <option value="0">0&deg;</option>
            <option value="0.5">90&deg;</option>
            <option value="1">180&deg;</option>
            <option value="1.5">270&deg;</option>
          </select>
        </label>
      </div>
    </div>
  </div>
{/if}
{#if slotSelected}
  <div class="fixed top-0 left-0 w-screen h-screen">
    <Backdrop on:click={() => (slotSelected = null)} />
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <BlockPicker
        on:cancel={() => (slotSelected = null)}
        on:add={(ev) => {
          const { type, variation, rotation } = ev.detail;
          const selectedId = $blocks.length;
          $blocks = [
            ...$blocks,
            { type, variation, position: slotSelected, rotation },
          ];
          slotSelected = null;
          $editor.selected = selectedId;
        }}
      />
    </div>
  </div>
{/if}
