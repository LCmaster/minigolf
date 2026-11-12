<script>
  import { createEventDispatcher } from "svelte";
  import { getFreeformPropCatalog, getPiecePropRole, groupFreeformProps } from "$lib/engine/types/KitTypes";

  export let selectedPropId = null;
  export let theme = "carnival_park";
  export let manifest = null;

  const dispatch = createEventDispatcher();

  let roleFilter = "all"; // "all" | "playable" | "decor" | "terrain"

  const PROP_ICONS = {
    prop_carnival_booster_pad: "🚀",
    prop_carnival_wedge_bumper: "🔺",
    prop_bumper_star_pink: "⭐",
    prop_bumper_peg_yellow: "🟡",
    prop_bumper_peg_blue: "🔵",
    prop_bumper_peg_red: "🔴",
    prop_bumper_mushroom: "🍄",
    prop_bumper_wedge: "📐",
    prop_spinner_paddle: "⚔️",
    prop_carnival_arch_6m: "🎪",
    prop_bigtop_gate_6m: "⛺",
    prop_carnival_hoop_6m: "🌟",
    prop_carnival_tent_pavilion: "🎡",
    prop_lantern_bunting: "🎏",
    terrain_hill_knoll_6x6: "⛰️",
    terrain_pond_patch_6x6: "💧",
    terrain_waterfall_lagoon_12x12: "🏞️",
    prop_tree_puffy: "🌳",
    prop_boulder_faceted: "🪨",
    prop_toadstool_pair: "🍄",
    prop_grass_tuft: "🌿",
    prop_wildflower_patch: "🌼",
    prop_fence_6m: "🪵",
    prop_tree_oak: "🌳",
    prop_rock_mossy: "🪨",
    prop_lantern_post: "🏮",
    prop_rock_spire_large: "🏔️",
    prop_rock_massif_large: "⛰️",
    prop_rock_twin_crag_large: "🏔️",
    prop_rock_step_ridge_large: "⛰️",
    prop_rock_slabs_med: "🪨",
    prop_rock_pillar_med: "🗿",
    prop_rock_arch_cluster_med: "🪨",
    prop_rock_slant_ledge_med: "🪨",
    prop_rock_pyramid_crag_med: "⛰️",
    prop_rock_split_ledge_small: "🪨",
    prop_rock_tall_boulder_small: "🪨",
    prop_rock_wide_boulder_small: "🪨",
    prop_rock_block_stone_small: "🪨",
    prop_rock_wedge_stone_small: "🪨",
    prop_rock_flat_shard_small: "🪨",
  };

  const fallbackCarnivalProps = [
    { id: "prop_carnival_booster_pad", name: "Booster Pad", propRole: "playable" },
    { id: "prop_carnival_wedge_bumper", name: "Wedge Bumper", propRole: "playable" },
    { id: "prop_bumper_star_pink", name: "Star Bumper", propRole: "playable" },
    { id: "prop_bumper_peg_yellow", name: "Yellow Bumper", propRole: "playable" },
    { id: "prop_bumper_peg_blue", name: "Blue Bumper", propRole: "playable" },
    { id: "prop_bumper_peg_red", name: "Red Bumper", propRole: "playable" },
    { id: "prop_carnival_arch_6m", name: "Carnival Arch", propRole: "decorative" },
    { id: "prop_bigtop_gate_6m", name: "Big Top Gate", propRole: "decorative" },
    { id: "prop_carnival_hoop_6m", name: "Showtime Hoop", propRole: "decorative" },
    { id: "prop_carnival_tent_pavilion", name: "Carousel Tent", propRole: "decorative" },
    { id: "prop_lantern_bunting", name: "Lantern Bunting", propRole: "decorative" },
    { id: "terrain_hill_knoll_6x6", name: "Hill Knoll", propRole: "decorative" },
    { id: "terrain_pond_patch_6x6", name: "Pond Patch", propRole: "decorative" },
    { id: "terrain_waterfall_lagoon_12x12", name: "Waterfall Lagoon", propRole: "decorative" },
    { id: "prop_tree_puffy", name: "Puffy Tree", propRole: "decorative" },
    { id: "prop_boulder_faceted", name: "Boulder", propRole: "decorative" },
    { id: "prop_rock_spire_large", name: "Rock Spire (Large)", propRole: "decorative" },
    { id: "prop_rock_massif_large", name: "Rock Massif (Large)", propRole: "decorative" },
    { id: "prop_rock_twin_crag_large", name: "Twin Crag (Large)", propRole: "decorative" },
    { id: "prop_rock_step_ridge_large", name: "Step Ridge (Large)", propRole: "decorative" },
    { id: "prop_rock_slabs_med", name: "Layered Slabs (Med)", propRole: "decorative" },
    { id: "prop_rock_pillar_med", name: "Stone Pillar (Med)", propRole: "decorative" },
    { id: "prop_rock_arch_cluster_med", name: "Arch Cluster (Med)", propRole: "decorative" },
    { id: "prop_rock_slant_ledge_med", name: "Slant Ledge (Med)", propRole: "decorative" },
    { id: "prop_rock_pyramid_crag_med", name: "Pyramid Crag (Med)", propRole: "decorative" },
    { id: "prop_rock_split_ledge_small", name: "Split Ledge (Small)", propRole: "decorative" },
    { id: "prop_rock_tall_boulder_small", name: "Tall Boulder (Small)", propRole: "decorative" },
    { id: "prop_rock_wide_boulder_small", name: "Wide Boulder (Small)", propRole: "decorative" },
    { id: "prop_rock_block_stone_small", name: "Block Stone (Small)", propRole: "decorative" },
    { id: "prop_rock_wedge_stone_small", name: "Wedge Stone (Small)", propRole: "decorative" },
    { id: "prop_rock_flat_shard_small", name: "Flat Shard (Small)", propRole: "decorative" },
    { id: "prop_toadstool_pair", name: "Toadstools", propRole: "decorative" },
    { id: "prop_grass_tuft", name: "Grass Tuft", propRole: "decorative" },
    { id: "prop_wildflower_patch", name: "Wildflowers", propRole: "decorative" },
    { id: "prop_fence_6m", name: "Park Fence", propRole: "decorative" },
  ];

  const fallbackClassicProps = [
    { id: "prop_bumper_mushroom", name: "Mushroom Bumper", propRole: "playable" },
    { id: "prop_bumper_wedge", name: "Wedge Deflector", propRole: "playable" },
    { id: "prop_spinner_paddle", name: "Rotating Paddle", propRole: "playable" },
    { id: "prop_tree_oak", name: "Oak Tree", propRole: "decorative" },
    { id: "prop_rock_mossy", name: "Mossy Rock", propRole: "decorative" },
    { id: "prop_lantern_post", name: "Lantern Post", propRole: "decorative" },
  ];

  $: baseCatalog = manifest
    ? getFreeformPropCatalog(manifest, theme, "all")
    : theme === "carnival_park"
      ? fallbackCarnivalProps
      : fallbackClassicProps;

  $: grouped = groupFreeformProps(baseCatalog);

  $: sections = [
    { key: "playable", title: "Playable Physics", items: grouped.playable },
    { key: "decor", title: "Decor & Structures", items: grouped.decor },
    { key: "terrain", title: "Terrain, Rocks & Nature", items: grouped.terrain },
  ].filter((section) => (roleFilter === "all" || roleFilter === section.key) && section.items.length > 0);

  function selectProp(id) {
    if (selectedPropId === id) {
      selectedPropId = null;
    } else {
      selectedPropId = id;
    }
    dispatch("selectProp", selectedPropId);
  }
</script>

<div class="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl text-white font-mono space-y-2.5 w-80">
  <div class="text-xs font-bold text-amber-400 uppercase tracking-wider flex justify-between items-center">
    <span>Freeform Props</span>
    {#if selectedPropId}
      <button on:click={() => selectProp(null)} class="text-[10px] text-red-400 hover:underline">Cancel</button>
    {/if}
  </div>

  <!-- Segmented Filter Tabs -->
  <div class="grid grid-cols-4 gap-1 bg-black/30 p-1 rounded-xl border border-white/10 text-[10px] font-bold">
    <button
      on:click={() => (roleFilter = "all")}
      class="py-1 px-1 rounded-lg transition-all {roleFilter === 'all' ? 'bg-white/15 text-white shadow' : 'text-gray-400 hover:text-gray-200'}"
    >
      All ({baseCatalog.length})
    </button>
    <button
      on:click={() => (roleFilter = "playable")}
      class="py-1 px-1 rounded-lg transition-all {roleFilter === 'playable' ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow' : 'text-gray-400 hover:text-amber-200'}"
    >
      ⚡ ({grouped.playable.length})
    </button>
    <button
      on:click={() => (roleFilter = "decor")}
      class="py-1 px-1 rounded-lg transition-all {roleFilter === 'decor' ? 'bg-sky-500/25 text-sky-300 border border-sky-400/40 shadow' : 'text-gray-400 hover:text-sky-200'}"
    >
      🎪 ({grouped.decor.length})
    </button>
    <button
      on:click={() => (roleFilter = "terrain")}
      class="py-1 px-1 rounded-lg transition-all {roleFilter === 'terrain' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 shadow' : 'text-gray-400 hover:text-emerald-200'}"
    >
      🪨 ({grouped.terrain.length})
    </button>
  </div>

  <div class="max-h-60 overflow-y-auto pr-1 space-y-3">
    {#each sections as section (section.key)}
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-0.5">
          {section.title} ({section.items.length})
        </div>
        <div class="grid grid-cols-3 gap-1.5">
          {#each section.items as p (p.id)}
            {@const role = getPiecePropRole(p)}
            {@const isPlayable = role === "playable"}
            <button
              on:click={() => selectProp(p.id)}
              title="{p.name} ({isPlayable ? 'Playable physics prop' : 'Decorative prop'})"
              class="relative flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all text-[11px] {selectedPropId === p.id
                ? isPlayable
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 scale-105 shadow-lg'
                  : 'bg-emerald-500/25 border-emerald-400 text-emerald-200 scale-105 shadow-lg'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'}"
            >
              <span
                class="absolute top-1 right-1 text-[9px] leading-none px-1 py-0.5 rounded {isPlayable
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'}"
              >
                {isPlayable ? "⚡" : section.key === "decor" ? "🎪" : "🌿"}
              </span>
              <span class="text-xl mb-1 mt-1">{PROP_ICONS[p.id] ?? (isPlayable ? "⚡" : "🌿")}</span>
              <span class="truncate w-full font-bold">{p.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

