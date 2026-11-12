<script>
  import { createEventDispatcher } from "svelte";
  import MiniGolfManiaLogo from "./MiniGolfManiaLogo.svelte";
  import ProfileCornerCard from "./ProfileCornerCard.svelte";

  export let isSceneReady = false;
  export let user = null;
  export let canEditLevels = false;
  export let isMuted = false;

  const dispatch = createEventDispatcher();
</script>

<!-- Loading Overlay while 3D Carnival Park Course initializes -->
{#if !isSceneReady}
  <div class="fixed inset-0 z-30 bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-300 flex flex-col items-center justify-center gap-5 p-6 transition-opacity duration-500">
    <div class="w-16 h-16 rounded-full bg-white border-4 border-slate-800 shadow-xl flex items-center justify-center text-3xl animate-bounce">
      ⛳
    </div>
    <div class="text-center space-y-1.5">
      <div class="text-2xl font-black tracking-wide text-slate-900 drop-shadow-sm">
        Loading Carnival Park...
      </div>
      <div class="text-xs font-bold uppercase tracking-widest text-slate-800/75">
        Preparing 3D Course Flyover
      </div>
    </div>
    <div class="w-56 h-3 rounded-full bg-white/60 border-2 border-slate-800 overflow-hidden">
      <div class="h-full w-2/3 bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full animate-pulse"></div>
    </div>
  </div>
{/if}

<!-- Main Arcade Menu Overlay -->
<div class="relative z-10 min-h-screen w-full flex flex-col justify-between p-4 md:p-6 pointer-events-none">
  <!-- Top-Right Profile Card & Utility Icons -->
  <div class="flex justify-end w-full">
    <ProfileCornerCard
      {user}
      {canEditLevels}
      {isMuted}
      on:toggleAudio={() => dispatch("toggleAudio")}
      on:openInfo={() => dispatch("openHowToPlay")}
      on:signOut={() => dispatch("signOut")}
    />
  </div>

  <!-- Center Logo & Glossy Arcade Button Stack -->
  <div class="flex flex-col items-center justify-center gap-5 my-auto pb-6 pointer-events-auto">
    <MiniGolfManiaLogo />

    <div class="w-full max-w-[330px] flex flex-col gap-3">
      <!-- Primary Play Button -->
      <a
        href="/play"
        class="group relative w-full h-16 rounded-full bg-gradient-to-b from-[#a3e635] via-[#65a30d] to-[#3f6212] border-[3px] border-white shadow-[0_6px_0_#1a2e05,0_12px_24px_rgba(0,0,0,0.45)] hover:brightness-105 hover:scale-[1.03] active:translate-y-1 active:shadow-[0_2px_0_#1a2e05] transition-all flex items-center justify-center gap-3 overflow-hidden"
      >
        <span class="absolute inset-x-4 top-1 h-4 rounded-full bg-white/30 pointer-events-none"></span>
        <span class="text-2xl md:text-3xl font-black tracking-wider text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">
          PLAY NOW
        </span>
        <span class="text-2xl text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">▶</span>
      </a>

      <!-- Courses & Tours Hub -->
      <a
        href="/courses"
        class="group relative w-full h-14 rounded-full bg-gradient-to-b from-[#7dd3fc] via-[#0ea5e9] to-[#0369a1] border-[3px] border-white shadow-[0_5px_0_#0c4a6e,0_10px_20px_rgba(0,0,0,0.4)] hover:brightness-105 hover:scale-[1.03] active:translate-y-1 active:shadow-[0_2px_0_#0c4a6e] transition-all flex items-center justify-center gap-2.5 overflow-hidden"
      >
        <span class="absolute inset-x-4 top-1 h-3.5 rounded-full bg-white/30 pointer-events-none"></span>
        <span class="text-lg md:text-xl font-black tracking-wider text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
          COURSES &amp; TOURS
        </span>
        <span class="text-xl">📚</span>
      </a>

      <!-- Track Builder (Logged-in users only) -->
      {#if user}
        <a
          href="/editor"
          class="group relative w-full h-14 rounded-full bg-gradient-to-b from-[#e879f9] via-[#a855f7] to-[#6b21a8] border-[3px] border-white shadow-[0_5px_0_#3b0764,0_10px_20px_rgba(0,0,0,0.4)] hover:brightness-105 hover:scale-[1.03] active:translate-y-1 active:shadow-[0_2px_0_#3b0764] transition-all flex items-center justify-center gap-2.5 overflow-hidden"
        >
          <span class="absolute inset-x-4 top-1 h-3.5 rounded-full bg-white/30 pointer-events-none"></span>
          <span class="text-lg md:text-xl font-black tracking-wider text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
            TRACK BUILDER
          </span>
          <span class="text-xl">🛠️</span>
        </a>
      {/if}

      <!-- How to Play -->
      <div class="flex justify-center pt-1">
        <button
          on:click={() => dispatch("openHowToPlay")}
          class="px-7 py-2.5 rounded-full bg-gradient-to-b from-slate-600 to-slate-800 border-2 border-white shadow-[0_4px_0_#0f172a,0_8px_16px_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-0.5 text-sm font-black tracking-wider text-white transition-all cursor-pointer"
        >
          HOW TO PLAY
        </button>
      </div>
    </div>
  </div>

  <div class="h-4"></div>
</div>

