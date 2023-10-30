<script lang="ts">
  import type { SvelteComponent } from "svelte";

  import { getModalStore } from "@skeletonlabs/skeleton";

  // Props
  /** Exposes parent props to this component. */
  export let parent: SvelteComponent;

  const modalStore = getModalStore();

  // Base Classes
  const cBase = "relative w-modal-wide shadow-xl rounded-md variant-filled";
  const cButton =
    "absolute -top-3 -right-3 z-1 btn-icon variant-filled border-2 border-solid border-white";
  const cIframe =
    "bg-black w-full aspect-video rounded-container-token overflow-hidden";

  console.log("Hello Modal");
</script>

{#if $modalStore[0]}
  <div class="modal-example-form {cBase}">
    <button class={cButton} on:click={parent.onClose}>✕</button>
    <div
      class="px-6 md:px-12 py-4 md:py-8 flex flex-col gap-4 font-acme text-white"
    >
      <div class="flex flex-col gap-2">
        <h2 class="h2 font-acme text-2xl md:text-4xl">Rules</h2>
        <p class="text-sm md:text-md tracking-wider md:tracking-normal">
          Put the ball into the hole with fewer shots possible.
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <h2 class="h2 font-acme text-2xl md:text-4xl">How to play</h2>
        <ol class="list text-sm md:text-md tracking-wider md:tracking-normal">
          <li>
            <span> 1. </span>
            <span>
              Click/tap the white translucent ball over the golf ball.
            </span>
          </li>
          <li>
            <span> 2. </span>
            <span>
              Drag in the oposite direction you want the ball to go.
            </span>
          </li>
          <li>
            <span> 3. </span>
            <span>
              An indicator will appear showing the way the ball will be shot to.
            </span>
          </li>
          <li>
            <span> 4. </span>
            <span>
              The further you drag the arrow the harder you will hit the ball.
            </span>
          </li>
          <li>
            <span> 5. </span>
            <span> Aim for the hole. </span>
          </li>
        </ol>
      </div>
      <div class="flex flex-col gap-2">
        <h2 class="h2 font-acme text-2xl md:text-4xl">Tips</h2>
        <ul class="list text-sm md:text-md tracking-wider md:tracking-normal">
          <li>
            <span> - </span>
            <span>
              To cancel the shot just drag the cursor back into the ball.
            </span>
          </li>
          <li>
            <span> - </span>
            <span> Use the walls and obstacles to your advantage. </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
{/if}
