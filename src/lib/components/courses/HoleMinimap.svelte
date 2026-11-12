<script>
  import { buildHoleMinimap } from "$lib/engine/course/CourseMinimapData";

  export let hole;
  export let manifest = null;
  export let heightClass = "h-32";

  $: minimap = hole ? buildHoleMinimap(hole, manifest) : null;
</script>

<div class="w-full {heightClass} rounded-xl bg-slate-950/75 border border-white/10 overflow-hidden flex items-center justify-center p-2">
  {#if minimap}
    <svg
      viewBox={minimap.viewBox}
      class="w-full h-full overflow-visible"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Top-down preview of {hole?.name || `Hole ${hole?.holeNumber ?? 1}`}"
    >
      <!-- Outer track dark border for silhouette legibility -->
      {#if minimap.polylinePoints}
        <polyline
          points={minimap.polylinePoints}
          fill="none"
          stroke="#0f172a"
          stroke-width="3.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}

      <!-- Per-segment color hints: elevated/ramp amber, hazard cyan, gap dashed, fairway green -->
      {#each minimap.segments as seg, i (i)}
        <line
          x1={seg.x1}
          y1={seg.z1}
          x2={seg.x2}
          y2={seg.z2}
          stroke={seg.isGap
            ? "#94a3b8"
            : seg.isHazard
              ? "#38bdf8"
              : seg.isRamp || seg.elevationStep > 0
                ? "#f59e0b"
                : "#4ade80"}
          stroke-width={seg.isGap ? "1.4" : "2.4"}
          stroke-dasharray={seg.isGap ? "1.6 1.6" : undefined}
          stroke-linecap="round"
        />
      {/each}

      <!-- Tee Marker -->
      {#if minimap.teePoint}
        <circle
          cx={minimap.teePoint.x}
          cy={minimap.teePoint.z}
          r="2.1"
          fill="#22d3ee"
          stroke="#0f172a"
          stroke-width="0.9"
        />
      {/if}

      <!-- Cup Marker -->
      {#if minimap.cupPoint}
        <circle
          cx={minimap.cupPoint.x}
          cy={minimap.cupPoint.z}
          r="2.3"
          fill="#f43f5e"
          stroke="#fef08a"
          stroke-width="0.9"
        />
      {/if}
    </svg>
  {/if}
</div>
