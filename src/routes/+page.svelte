<script>
  import { getModalStore } from "@skeletonlabs/skeleton";
  import { useGame } from "./context";
  import { writable } from "svelte/store";
  import { Canvas, T } from "@threlte/core";
  import GameScreen from "./components/GameScreen.svelte";
  import { AppBar, AppShell } from "@skeletonlabs/skeleton";
  import GameScene from "./components/GameScene.svelte";
  import LobbyScene from "./components/LobbyScene.svelte";
  import LobbyScreen from "./components/LobbyScreen.svelte";
  import { World } from "@threlte/rapier";
  import Button from "../lib/component/Button.svelte";
  import HowToPlayModal from "./components/HowToPlayModal.svelte";

  const modalStore = getModalStore();

  const modal = {
    type: "component",
    component: {
      ref: HowToPlayModal,
    },
  };
</script>

<div class="bg-[#C4E9CC]">
  <div
    class="w-screen h-screen flex flex-col gap-6 justify-center items-center"
  >
    <img src="/logo.png" alt="Minigolf Mania" width="320" />
    <div class="w-80 flex flex-col gap-2">
      <Button on:click={() => modalStore.trigger(modal)}>How to play</Button>
      <Button
        on:click={() => {
          window.location = "/game";
        }}>Play</Button
      >
      <!-- 
        <img src="/separator.png" alt="or" />
        <Button>Sign In</Button>
        -->
    </div>
  </div>
</div>
