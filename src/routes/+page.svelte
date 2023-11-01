<script>
  import { goto } from "$app/navigation";
  import { getModalStore } from "@skeletonlabs/skeleton";
  import Button from "../lib/component/Button.svelte";
  import HowToPlayModal from "./components/HowToPlayModal.svelte";

  export let data;

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
          goto("/game");
        }}
        class="h-16 text-2xl from-[#F6A655] to-[#E57300]"
      >
        Play
      </Button>
      <!-- {#if data.session}
        <Button
          on:click={() => {
            window.location = "/editor";
          }}
        >
          Level editor
        </Button>
      {:else}
        <img src="/separator.png" alt="or" class="self-center" />
        <Button
          on:click={() => {
            goto("/auth/signin");
          }}>Sign In</Button
        >
      {/if} -->
    </div>
  </div>
</div>
