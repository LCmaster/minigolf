<script>
  import { createEventDispatcher } from "svelte";
  import ArcadeButton from "$lib/components/ui/ArcadeButton.svelte";

  export let bundlerHoles = [];
  export let tourNameDraft = "My Custom Carnival Tour";
  export let tourThemeDraft = "carnival_park";
  export let tourVisibilityDraft = "private";
  export let bundlerTotalPar = 0;

  const dispatch = createEventDispatcher();
</script>

<aside class="rounded-3xl p-[3px] bg-[#2a1205] shadow-[0_6px_0_#2a1205,0_16px_32px_rgba(0,0,0,0.45)] sticky top-36">
  <div class="rounded-[1.35rem] bg-amber-50/95 border-[3px] border-[#431407] p-5 space-y-4 text-slate-900">
    <div>
      <span class="px-2.5 py-0.5 rounded-full bg-amber-300 border-2 border-[#431407] text-[#431407] text-[10px] font-black uppercase tracking-wider">
        Custom Multi-Hole Builder
      </span>
      <h3 class="text-xl font-black text-[#431407] mt-2">Tour Bundler</h3>
      <p class="text-xs font-bold text-[#431407]/75 mt-0.5">
        Combine official or custom holes into your own multi-hole Tour.
      </p>
    </div>

    <div class="space-y-2.5 text-xs font-bold">
      <label class="block space-y-1">
        <span class="text-[#431407] uppercase tracking-wider text-[11px] font-black">Tour Name</span>
        <input
          bind:value={tourNameDraft}
          class="w-full bg-white border-2 border-[#431407]/35 focus:border-amber-500 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
          placeholder="My Carnival Showcase"
        />
      </label>

      <div class="grid grid-cols-2 gap-2">
        <label class="block space-y-1">
          <span class="text-[#431407] uppercase tracking-wider text-[11px] font-black">Theme</span>
          <select
            bind:value={tourThemeDraft}
            class="w-full bg-white border-2 border-[#431407]/35 focus:border-amber-500 rounded-xl px-2.5 py-2 text-slate-900 font-bold"
          >
            <option value="carnival_park">🎪 Carnival</option>
            <option value="country_club">🏌️ Classic</option>
          </select>
        </label>

        <label class="block space-y-1">
          <span class="text-[#431407] uppercase tracking-wider text-[11px] font-black">Visibility</span>
          <select
            bind:value={tourVisibilityDraft}
            class="w-full bg-white border-2 border-[#431407]/35 focus:border-amber-500 rounded-xl px-2.5 py-2 text-slate-900 font-bold"
          >
            <option value="private">🔒 Private</option>
            <option value="public">🌐 Public</option>
          </select>
        </label>
      </div>
    </div>

    <div class="space-y-2.5">
      <div class="flex items-center justify-between text-xs font-black">
        <span class="text-[#431407]">Queued Holes ({bundlerHoles.length})</span>
        <span class="px-2 py-0.5 rounded-full bg-sky-500 text-white border border-[#1e3a8a]">
          Total Par {bundlerTotalPar}
        </span>
      </div>

      {#if bundlerHoles.length === 0}
        <div class="border-2 border-dashed border-[#431407]/30 bg-white/75 rounded-2xl p-4 text-center text-xs font-bold text-[#431407]/75">
          Click <span class="text-sky-700 font-black">+ Bundle</span> on any Official hole or <span class="text-sky-700 font-black">+ Tour</span> on a custom hole to add it here.
        </div>
      {:else}
        <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {#each bundlerHoles as item, i (item.key)}
            <div class="flex items-center justify-between gap-2 bg-white border-2 border-[#431407]/30 rounded-xl px-2.5 py-2 text-xs">
              <div class="min-w-0">
                <div class="font-black text-[#431407] truncate">#{i + 1} {item.label}</div>
                <div class="text-[10px] font-bold text-slate-600 truncate">
                  Par {item.hole.par} &bull; {item.sourceCourseName}
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0 font-black">
                <button
                  on:click={() => dispatch("move", { index: i, delta: -1 })}
                  disabled={i === 0}
                  class="px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 border border-[#431407]/30 text-[#431407] disabled:opacity-30 cursor-pointer"
                  title="Move Up"
                >
                  ↑
                </button>
                <button
                  on:click={() => dispatch("move", { index: i, delta: 1 })}
                  disabled={i === bundlerHoles.length - 1}
                  class="px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 border border-[#431407]/30 text-[#431407] disabled:opacity-30 cursor-pointer"
                  title="Move Down"
                >
                  ↓
                </button>
                <button
                  on:click={() => dispatch("remove", i)}
                  class="px-1.5 py-0.5 rounded bg-rose-500 hover:bg-rose-400 text-white cursor-pointer"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>
          {/each}
        </div>

        <ArcadeButton
          variant="green"
          size="md"
          extraClass="w-full"
          on:click={() => dispatch("save")}
        >
          🏆 Save Custom Tour ({bundlerHoles.length} {bundlerHoles.length === 1 ? "Hole" : "Holes"})
        </ArcadeButton>
      {/if}
    </div>
  </div>
</aside>
