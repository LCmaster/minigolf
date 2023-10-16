<script>
  import { T, Canvas } from "@threlte/core";
  import { World } from "@threlte/rapier";
  import { Environment, OrbitControls } from "@threlte/extras";
  import { AppShell, getModalStore } from "@skeletonlabs/skeleton";
  import EditorScene from "./EditorScene.svelte";
  import { editor, blocks } from "./store";
  import BlockPicker from "./BlockPicker.svelte";
  import Backdrop from "../../lib/component/Backdrop.svelte";
  import TestScene from "./TestScene.svelte";
  import BlockList from "./BlockList.svelte";
  import BlockProperties from "./BlockProperties.svelte";
  import Header from "./Header.svelte";
  import Footer from "./Footer.svelte";

  const modalStore = getModalStore();

  export let data;

  let slotSelected;
  let blockSelected;

  $: isTesting = $editor.testing;
</script>

<AppShell regionPage="relative" slotPageHeader="sticky top-0 z-10">
  <!-- <slot name="sidebarLeft" /> -->
  <svelte:fragment slot="header">
    <Header />
  </svelte:fragment>
  <svelte:fragment slot="sidebarLeft">
    {#if !isTesting}
      <BlockList
        types={data.types}
        blocks={data.blocks}
        bind:selected={blockSelected}
      />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="sidebarRight">
    {#if !isTesting}
      <BlockProperties />
    {/if}
  </svelte:fragment>
  <Canvas>
    <World gravity={[0, -15, 0]}>
      <Environment
        path="/skybox/default/"
        files={["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]}
        isBackground={true}
      />
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
      {#if $editor.testing}
        <TestScene />
      {:else}<EditorScene
          on:slotSelected={(ev) => {
            const { position } = ev.detail;
            slotSelected = position;
            $blocks = [
              ...$blocks,
              { ...blockSelected, position, rotation: 0, locked: false },
            ];
            $editor.selected = $blocks.length - 1;
          }}
        />
      {/if}
    </World>
  </Canvas>
</AppShell>
