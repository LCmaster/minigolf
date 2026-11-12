<script>
  import { createEventDispatcher } from "svelte";

  export let user = null;
  export let canEditLevels = false;
  export let isMuted = false;
  export let isOpen = false;

  const dispatch = createEventDispatcher();
  let containerEl;

  function handleWindowClick(ev) {
    if (!isOpen || !containerEl) return;
    if (!containerEl.contains(ev.target)) {
      isOpen = false;
    }
  }

  function handleKeyDown(ev) {
    if (isOpen && ev.key === "Escape") {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleWindowClick} on:keydown={handleKeyDown} />

<div bind:this={containerEl} class="relative flex flex-col items-end gap-2.5 pointer-events-auto">
  <!-- Circular Arcade Utility & Avatar Buttons -->
  <div class="flex items-center gap-2">
    <button
      on:click={() => dispatch("toggleAudio")}
      title={isMuted ? "Unmute Audio" : "Mute Audio"}
      aria-label={isMuted ? "Unmute Audio" : "Mute Audio"}
      class="w-11 h-11 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-white shadow-[0_4px_0_#1e3a8a,0_6px_12px_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-0.5 flex items-center justify-center text-lg transition-all cursor-pointer"
    >
      {isMuted ? "🔇" : "🔊"}
    </button>

    <button
      on:click={() => dispatch("openInfo")}
      title="How to Play"
      aria-label="How to Play"
      class="w-11 h-11 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-white shadow-[0_4px_0_#78350f,0_6px_12px_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-0.5 flex items-center justify-center text-lg font-black text-amber-950 transition-all cursor-pointer"
    >
      i
    </button>

    <button
      on:click={() => (isOpen = !isOpen)}
      title={user ? user.displayName || user.email || "Profile" : "Sign In / Profile"}
      aria-label="Toggle Profile Menu"
      aria-expanded={isOpen}
      class="w-12 h-12 rounded-full border-[3px] border-white shadow-[0_4px_0_#451a03,0_6px_14px_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-0.5 flex items-center justify-center text-lg font-black text-white transition-all cursor-pointer {user
        ? 'bg-gradient-to-b from-amber-400 to-orange-600'
        : 'bg-gradient-to-b from-slate-500 to-slate-700'}"
    >
      {#if user}
        {(user.displayName || user.email || "P")[0].toUpperCase()}
      {:else}
        👤
      {/if}
    </button>
  </div>

  <!-- Popover Profile & Login Card (Shown when Avatar button is clicked) -->
  {#if isOpen}
    <div class="absolute top-14 right-0 w-56 rounded-2xl bg-gradient-to-b from-amber-800/95 to-amber-950/95 border-[3px] border-amber-300/90 shadow-[0_6px_0_#451a03,0_12px_24px_rgba(0,0,0,0.45)] p-3 text-white backdrop-blur-md z-30">
      <div class="text-[11px] font-black tracking-wider uppercase text-amber-200 text-center pb-2 border-b border-amber-400/25">
        PROFILES / {user ? "player" : "login"}
      </div>

      {#if user}
        <div class="flex items-center gap-2.5 py-2.5">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-white flex items-center justify-center text-lg font-black shrink-0 shadow">
            {(user.displayName || user.email || "P")[0].toUpperCase()}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-extrabold text-white truncate">
              {user.displayName || user.email || "Golfer"}
            </div>
            <div class="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">
              Signed In
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-extrabold">
          <a
            href="/profile"
            class="text-center py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 border border-white/60 text-white shadow transition-colors"
          >
            Profile
          </a>
          {#if canEditLevels}
            <a
              href="/mylevels"
              class="text-center py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 border border-white/60 text-slate-950 shadow transition-colors"
            >
              My Levels
            </a>
          {:else}
            <button
              on:click={() => {
                isOpen = false;
                dispatch("signOut");
              }}
              class="py-1.5 rounded-xl bg-rose-500/90 hover:bg-rose-400 border border-white/60 text-white shadow transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          {/if}
        </div>

        {#if canEditLevels}
          <button
            on:click={() => {
              isOpen = false;
              dispatch("signOut");
            }}
            class="w-full mt-1.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-bold text-amber-100 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        {/if}
      {:else}
        <div class="flex items-center gap-2.5 py-2.5">
          <div class="w-10 h-10 rounded-xl bg-slate-700/90 border-2 border-white/60 flex items-center justify-center text-lg shrink-0">
            👤
          </div>
          <div>
            <div class="text-sm font-extrabold text-white">Guest</div>
            <div class="text-[10px] text-amber-200/80">Sign in to build tracks</div>
          </div>
        </div>

        <a
          href="/auth/signin"
          class="block w-full text-center py-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:brightness-110 border-2 border-white text-xs font-black tracking-wide text-white shadow-[0_3px_0_#14532d] transition-all"
        >
          🔑 Sign In
        </a>
      {/if}
    </div>
  {/if}
</div>
