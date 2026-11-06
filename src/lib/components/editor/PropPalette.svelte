<script>
  import { createEventDispatcher } from "svelte";

  export let selectedPropId = null;

  const dispatch = createEventDispatcher();

  const propsList = [
    { id: "prop_bumper_mushroom", name: "Mushroom Bumper", icon: "🍄", category: "bumpers" },
    { id: "prop_bumper_wedge", name: "Wedge Deflector", icon: "📐", category: "bumpers" },
    { id: "prop_spinner_paddle", name: "Rotating Paddle", icon: "⚔️", category: "bumpers" },
    { id: "hazard_booster_strip_4x2", name: "Booster Strip", icon: "⚡", category: "hazards" },
    { id: "hazard_sand_trap_4x4", name: "Sand Trap", icon: "🏖️", category: "hazards" },
    { id: "hazard_water_channel_4x4", name: "Water Hazard", icon: "🌊", category: "hazards" },
    { id: "prop_tree_oak", name: "Oak Tree", icon: "🌳", category: "dressing" },
    { id: "prop_rock_mossy", name: "Mossy Rock", icon: "🪨", category: "dressing" },
    { id: "prop_lantern_post", name: "Lantern Post", icon: "🏮", category: "dressing" },
  ];

  function selectProp(id) {
    if (selectedPropId === id) {
      selectedPropId = null;
    } else {
      selectedPropId = id;
    }
    dispatch("selectProp", selectedPropId);
  }
</script>

<div class="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl text-white font-mono space-y-2 max-w-xs">
  <div class="text-xs font-bold text-amber-400 uppercase tracking-wider flex justify-between items-center">
    <span>Placeable Props &amp; Hazards</span>
    {#if selectedPropId}
      <button on:click={() => selectProp(null)} class="text-[10px] text-red-400 hover:underline">Cancel</button>
    {/if}
  </div>

  <div class="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
    {#each propsList as p}
      <button
        on:click={() => selectProp(p.id)}
        class="flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all text-[11px] {selectedPropId === p.id ? 'bg-amber-500/20 border-amber-400 text-amber-300 scale-105 shadow-lg' : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'}"
      >
        <span class="text-xl mb-1">{p.icon}</span>
        <span class="truncate w-full font-bold">{p.name}</span>
      </button>
    {/each}
  </div>
</div>

