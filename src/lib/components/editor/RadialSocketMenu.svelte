<script>
  import { createEventDispatcher } from "svelte";

  export let x = 0;
  export let y = 0;
  export let socketInfo = null;
  export let theme = "carnival_park";

  const dispatch = createEventDispatcher();

  let activeSection = "track"; // "track" | "hazards"

  const carnivalOptions = [
    { id: "carnival_straight_6m", label: "Carnival Straight", icon: "🟩" },
    { id: "carnival_turn_15deg_rounded", label: "Carnival Turn 15°", icon: "↗️" },
    { id: "carnival_turn_30deg_rounded", label: "Carnival Turn 30°", icon: "↗️" },
    { id: "carnival_turn_45deg_rounded", label: "Carnival Turn 45°", icon: "↗️" },
    { id: "carnival_turn_90deg_rounded", label: "Carnival Turn 90°", icon: "⤵️" },
    { id: "carnival_ramp_up_15deg_6x6", label: "Carnival Ramp Up", icon: "📈" },
    { id: "carnival_ramp_down_15deg_6x6", label: "Carnival Ramp Down", icon: "📉" },
    { id: "carnival_bridge_pond_6x12", label: "Pond Bridge (12m)", icon: "🌉" },
    { id: "carnival_windmill_6x12", label: "Windmill Gate (12m)", icon: "🎡" },
    { id: "carnival_green_cup_6x6", label: "Carnival Cup Green", icon: "⛳" },
  ];

  const classicOptions = [
    { id: "straight_6m", label: "Straight (6m)", icon: "➡️" },
    { id: "turn_45deg_rounded", label: "Turn 45°", icon: "↗️" },
    { id: "turn_90deg_rounded", label: "Turn 90°", icon: "⤵️" },
    { id: "turn_banked_90deg_6x6", label: "Banked 90°", icon: "🎢" },
    { id: "ramp_up_15deg_6x6", label: "Ramp Up (1.5m)", icon: "📈" },
    { id: "ramp_down_15deg_6x6", label: "Ramp Down (1.5m)", icon: "📉" },
    { id: "obstacle_windmill_6x12", label: "Windmill Gate", icon: "🎡" },
    { id: "green_cup_standard_6x6", label: "Cup Green", icon: "⛳" },
  ];

  const hazardTileOptions = [
    { id: "hazard_booster_strip_6x3", label: "Booster Strip (3m)", icon: "⚡" },
    { id: "hazard_sand_trap_6x6", label: "Sand Trap (6m)", icon: "🏖️" },
    { id: "hazard_water_channel_6x6", label: "Water Channel (6m)", icon: "🌊" },
  ];

  $: trackOptions = theme === "carnival_park" ? carnivalOptions : classicOptions;
  $: options = activeSection === "hazards" ? hazardTileOptions : trackOptions;

  function selectOption(pieceId) {
    dispatch("select", { socketInfo, pieceId });
  }

  function closeMenu() {
    dispatch("close");
  }
</script>

<!-- Backdrop to close on click outside -->
<div class="fixed inset-0 z-40" on:click={closeMenu} on:contextmenu|preventDefault={closeMenu}></div>

<!-- Radial / Context Snap Menu -->
<div
  class="fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-2xl text-white font-mono min-w-[220px] space-y-1.5 animate-in fade-in zoom-in-95 duration-100"
  style="left: {Math.min(x, window.innerWidth - 240)}px; top: {Math.min(y, window.innerHeight - 340)}px;"
>
  <div class="text-[11px] font-bold text-cyan-400 uppercase tracking-wider pb-1 border-b border-white/10 flex justify-between items-center gap-2">
    <span>Snap Next Piece</span>
    <button on:click={closeMenu} class="text-gray-400 hover:text-white">&times;</button>
  </div>

  <div class="grid grid-cols-2 gap-1 bg-black/30 p-0.5 rounded-xl border border-white/10 text-[10px] font-bold">
    <button
      on:click={() => (activeSection = "track")}
      class="py-1 px-2 rounded-lg transition-all {activeSection === 'track' ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40' : 'text-gray-400 hover:text-gray-200'}"
    >
      🟩 Track
    </button>
    <button
      on:click={() => (activeSection = "hazards")}
      class="py-1 px-2 rounded-lg transition-all {activeSection === 'hazards' ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40' : 'text-gray-400 hover:text-amber-200'}"
    >
      ⚡ Hazards
    </button>
  </div>

  <div class="grid grid-cols-2 gap-1.5 pt-1">
    {#each options as opt}
      <button
        on:click={() => selectOption(opt.id)}
        class="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-white/10 text-left text-xs font-bold transition-all active:scale-95 group"
      >
        <span class="text-base group-hover:scale-110 transition-transform">{opt.icon}</span>
        <span class="truncate">{opt.label}</span>
      </button>
    {/each}
  </div>
</div>

