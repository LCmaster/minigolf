<script>
  import { createEventDispatcher } from "svelte";

  export let x = 0;
  export let y = 0;
  export let socketInfo = null;

  const dispatch = createEventDispatcher();

  const options = [
    { id: "straight_4m", label: "Straight (4m)", icon: "➡️" },
    { id: "turn_45deg_rounded", label: "Turn 45°", icon: "↗️" },
    { id: "turn_90deg_rounded", label: "Turn 90°", icon: "⤵️" },
    { id: "turn_banked_90deg_4x4", label: "Banked 90°", icon: "🎢" },
    { id: "ramp_up_15deg_4x4", label: "Ramp Up (1m)", icon: "📈" },
    { id: "ramp_down_15deg_4x4", label: "Ramp Down (1m)", icon: "📉" },
    { id: "obstacle_windmill_4x8", label: "Windmill Gate", icon: "🎡" },
    { id: "green_cup_standard_4x4", label: "Cup Green", icon: "⛳" },
  ];

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
  <div class="text-[11px] font-bold text-cyan-400 uppercase tracking-wider pb-1 border-b border-white/10 flex justify-between items-center">
    <span>Snap Next Track Piece</span>
    <button on:click={closeMenu} class="text-gray-400 hover:text-white">&times;</button>
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

