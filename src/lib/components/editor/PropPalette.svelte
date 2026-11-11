<script>
  import { createEventDispatcher } from "svelte";

  export let selectedPropId = null;
  export let theme = "carnival_park";

  const dispatch = createEventDispatcher();

  const carnivalProps = [
    { id: "prop_carnival_arch_6m", name: "Carnival Arch", icon: "🎪", category: "carnival" },
    { id: "prop_bigtop_gate_6m", name: "Big Top Gate", icon: "⛺", category: "carnival" },
    { id: "prop_bumper_peg_yellow", name: "Yellow Bumper", icon: "🟡", category: "bumpers" },
    { id: "prop_bumper_peg_blue", name: "Blue Bumper", icon: "🔵", category: "bumpers" },
    { id: "prop_bumper_peg_red", name: "Red Bumper", icon: "🔴", category: "bumpers" },
    { id: "prop_lantern_bunting", name: "Lantern Bunting", icon: "🎏", category: "carnival" },
    { id: "terrain_hill_knoll_6x6", name: "Hill Knoll", icon: "⛰️", category: "terrain" },
    { id: "terrain_pond_patch_6x6", name: "Pond Patch", icon: "💧", category: "terrain" },
    { id: "terrain_waterfall_lagoon_12x12", name: "Waterfall Lagoon", icon: "🏞️", category: "terrain" },
    { id: "prop_tree_puffy", name: "Puffy Tree", icon: "🌳", category: "nature" },
    { id: "prop_boulder_faceted", name: "Boulder", icon: "🪨", category: "nature" },
    { id: "prop_toadstool_pair", name: "Toadstools", icon: "🍄", category: "nature" },
    { id: "prop_grass_tuft", name: "Grass Tuft", icon: "🌿", category: "nature" },
    { id: "prop_wildflower_patch", name: "Wildflowers", icon: "🌼", category: "nature" },
    { id: "prop_fence_6m", name: "Park Fence", icon: "🪵", category: "terrain" },
  ];

  const classicProps = [
    { id: "prop_bumper_mushroom", name: "Mushroom Bumper", icon: "🍄", category: "bumpers" },
    { id: "prop_bumper_wedge", name: "Wedge Deflector", icon: "📐", category: "bumpers" },
    { id: "prop_spinner_paddle", name: "Rotating Paddle", icon: "⚔️", category: "bumpers" },
    { id: "hazard_booster_strip_6x3", name: "Booster Strip", icon: "⚡", category: "hazards" },
    { id: "hazard_sand_trap_6x6", name: "Sand Trap", icon: "🏖️", category: "hazards" },
    { id: "hazard_water_channel_6x6", name: "Water Hazard", icon: "🌊", category: "hazards" },
    { id: "prop_tree_oak", name: "Oak Tree", icon: "🌳", category: "dressing" },
    { id: "prop_rock_mossy", name: "Mossy Rock", icon: "🪨", category: "dressing" },
    { id: "prop_lantern_post", name: "Lantern Post", icon: "🏮", category: "dressing" },
  ];

  $: propsList = theme === "carnival_park" ? carnivalProps : classicProps;

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

