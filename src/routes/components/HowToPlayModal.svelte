<script lang="ts">
  import type { SvelteComponent } from "svelte";
  import { getModalStore } from "@skeletonlabs/skeleton";
  import { fade, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  export let parent: SvelteComponent;

  const modalStore = getModalStore();
</script>

{#if $modalStore[0]}
  <!-- Svelte transition for a bouncy entrance -->
  <div 
    in:scale={{ duration: 400, start: 0.9, easing: backOut }} 
    out:fade={{ duration: 200 }}
    class="relative w-[90vw] max-w-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden"
  >
    <!-- Header Area -->
    <div class="relative bg-gradient-to-r from-[#C4E9CC] to-[#A3D9B1] py-4 px-8 text-center border-b border-white/40 shadow-sm">
      <h2 class="text-3xl font-black italic tracking-widest text-[#4A4A4A] drop-shadow-sm">
        HOW TO PLAY
      </h2>
      <button 
        class="absolute top-1/2 right-4 -translate-y-1/2 w-10 h-10 flex justify-center items-center rounded-full bg-white/70 hover:bg-[#4A4A4A] hover:text-white border-2 border-white transition-all text-[#4A4A4A] font-bold shadow-md hover:scale-105 active:scale-95" 
        on:click={parent.onClose}
      >
        ✕
      </button>
    </div>

    <!-- Content Area -->
    <div class="p-6 md:p-10 flex flex-col gap-8 text-[#4A4A4A]">
      
      <!-- Rules Section -->
      <div class="flex flex-col gap-3 bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm">
        <h3 class="font-black text-xl text-[#7ACC52] tracking-wider uppercase">Rules</h3>
        <p class="font-bold text-md leading-relaxed text-[#4A4A4A]/80">
          Put the ball into the hole with the fewest shots possible!
        </p>
      </div>

      <!-- Steps Section -->
      <div class="flex flex-col gap-3 bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm">
        <h3 class="font-black text-xl text-[#F6A655] tracking-wider uppercase">Controls</h3>
        <ol class="flex flex-col gap-3 font-bold text-sm md:text-md text-[#4A4A4A]/80">
          <li class="flex items-start gap-3">
            <span class="w-6 h-6 flex justify-center items-center shrink-0 rounded-full bg-[#F6A655] text-white text-xs font-black shadow-inner mt-0.5">1</span>
            <span>Click/tap the white translucent ball over the golf ball.</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="w-6 h-6 flex justify-center items-center shrink-0 rounded-full bg-[#F6A655] text-white text-xs font-black shadow-inner mt-0.5">2</span>
            <span>Drag in the <strong>opposite</strong> direction you want the ball to go.</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="w-6 h-6 flex justify-center items-center shrink-0 rounded-full bg-[#F6A655] text-white text-xs font-black shadow-inner mt-0.5">3</span>
            <span>An indicator will appear showing the trajectory.</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="w-6 h-6 flex justify-center items-center shrink-0 rounded-full bg-[#F6A655] text-white text-xs font-black shadow-inner mt-0.5">4</span>
            <span>The further you drag, the harder you will hit the ball!</span>
          </li>
        </ol>
      </div>

      <!-- Tips Section -->
      <div class="flex flex-col gap-3 bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm">
        <h3 class="font-black text-xl text-[#E57300] tracking-wider uppercase">Tips</h3>
        <ul class="flex flex-col gap-2 font-bold text-sm md:text-md text-[#4A4A4A]/80">
          <li class="flex items-center gap-3">
            <span class="w-2 h-2 rounded-full bg-[#E57300] shadow-sm"></span>
            <span>To cancel a shot, just drag the cursor back into the ball.</span>
          </li>
          <li class="flex items-center gap-3">
            <span class="w-2 h-2 rounded-full bg-[#E57300] shadow-sm"></span>
            <span>Use the walls and obstacles to bounce to your advantage.</span>
          </li>
        </ul>
      </div>

    </div>
  </div>
{/if}
