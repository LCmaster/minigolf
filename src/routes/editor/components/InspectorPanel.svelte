<script>
  import { useEditor } from "../context";
  import { buildSplineStampTable, evaluateHeightmapAt } from "$lib/heightmapGeometry";

  const {
    controlPoints,
    pointSelected,
    stage,
    blocks,
    blockSelected,
    transformMode,
    insertPointAfterSelected,
    duplicateSelectedBlock,
    deleteSelected,
  } = useEditor();

  $: selectedIndex = $controlPoints.findIndex((p) => p.id === $pointSelected);
  $: selectedPoint = selectedIndex !== -1 ? $controlPoints[selectedIndex] : null;

  $: selectedBlockIndex = $blocks ? $blocks.findIndex((b) => b.id === $blockSelected) : -1;
  $: selectedBlock = selectedBlockIndex !== -1 ? $blocks[selectedBlockIndex] : null;

  function updatePointProp(prop, val) {
    if (!selectedPoint) return;
    $controlPoints[selectedIndex][prop] = val;
    $controlPoints = [...$controlPoints];
  }

  function snapBlockToGround() {
    if (!selectedBlock || selectedBlockIndex === -1) return;
    blocks.commit();
    const [bx, , bz] = selectedBlock.position;
    let groundY = 0;
    if ($controlPoints && $controlPoints.length >= 2) {
      const table = buildSplineStampTable($controlPoints);
      if (table) {
        const res = evaluateHeightmapAt(bx, bz, table);
        // If inside the course track, snap to top of the track tile (+0.18 above roadbed); otherwise snap to terrain surface
        groundY = res.distNorm <= 1.05 ? res.height + 0.18 : res.height;
      }
    }
    $blocks[selectedBlockIndex].position = [
      bx,
      Math.round(groundY * 100) / 100,
      bz,
    ];
    $blocks = [...$blocks];
  }

  $: blockYawDeg = selectedBlock
    ? Math.round(((selectedBlock.rotation?.[1] || 0) * 180) / Math.PI)
    : 0;

  function setBlockYawDeg(deg) {
    if (!selectedBlock || selectedBlockIndex === -1) return;
    const rad = (deg * Math.PI) / 180;
    const rot = [...(selectedBlock.rotation || [0, 0, 0])];
    rot[1] = rad;
    $blocks[selectedBlockIndex].rotation = rot;
    $blocks = [...$blocks];
  }
</script>

<div class="w-72 h-full flex flex-col bg-surface-900/90 backdrop-blur-md border-l border-surface-500/30 p-3.5 overflow-y-auto text-white select-none">
  {#if selectedPoint}
    <!-- Point Inspector -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold uppercase tracking-wider text-primary-400">
        {selectedIndex === 0
          ? "Tee Point (Start)"
          : selectedIndex === $controlPoints.length - 1
            ? "Cup Point (Hole)"
            : `Point ${selectedIndex + 1}`}
      </h3>
      <button
        type="button"
        class="text-xs opacity-60 hover:opacity-100"
        on:click={() => ($pointSelected = null)}
      >
        ✕
      </button>
    </div>

    <div class="flex flex-col gap-3">
      <!-- Corner / Cap Shape (Sharp vs Rounded) -->
      {#if selectedIndex === 0 || selectedIndex === $controlPoints.length - 1}
        <div class="p-3 rounded-lg bg-surface-800/80 border border-surface-500/20 flex flex-col gap-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-surface-300">
            End Cap Shape
          </h4>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              class="btn btn-sm text-xs {(selectedPoint.shape || 'rounded') === 'rounded'
                ? 'variant-filled-primary font-semibold'
                : 'variant-soft'}"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("shape", "rounded");
              }}
            >
              ◠ Rounded
            </button>
            <button
              type="button"
              class="btn btn-sm text-xs {selectedPoint.shape === 'square'
                ? 'variant-filled-primary font-semibold'
                : 'variant-soft'}"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("shape", "square");
              }}
            >
              ⊓ Sharp (Square)
            </button>
          </div>
        </div>
      {:else}
        <div class="p-3 rounded-lg bg-surface-800/80 border border-surface-500/20 flex flex-col gap-2.5">
          <h4 class="text-xs font-bold uppercase tracking-wider text-surface-300">
            Corner Style
          </h4>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              class="btn btn-sm text-xs {(selectedPoint.shape || 'sharp') !== 'rounded'
                ? 'variant-filled-primary font-semibold'
                : 'variant-soft'}"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("shape", "sharp");
              }}
            >
              ∧ Sharp
            </button>
            <button
              type="button"
              class="btn btn-sm text-xs {selectedPoint.shape === 'rounded'
                ? 'variant-filled-primary font-semibold'
                : 'variant-soft'}"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("shape", "rounded");
              }}
            >
              ◠ Rounded
            </button>
          </div>

          {#if selectedPoint.shape === "rounded"}
            <div class="flex flex-col gap-1 mt-1">
              <div class="flex justify-between text-xs">
                <span class="font-medium">Corner Radius</span>
                <span class="font-mono text-sky-300">
                  {(selectedPoint.cornerRadius ?? 4.0).toFixed(1)}m
                </span>
              </div>
              <input
                type="range"
                min="1.5"
                max="8.0"
                step="0.5"
                value={selectedPoint.cornerRadius ?? 4.0}
                on:mousedown={() => controlPoints.commit()}
                on:input={(e) =>
                  updatePointProp("cornerRadius", parseFloat(e.target.value))}
              />
            </div>
          {/if}
        </div>
      {/if}

      <!-- Side Walls (Both or Individually) -->
      {#if selectedIndex < $controlPoints.length - 1}
        <div class="p-3 rounded-lg bg-surface-800/80 border border-surface-500/20 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-surface-300">
              Segment Side Walls
            </h4>
            <div class="flex gap-1">
              <button
                type="button"
                class="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-emerald-300"
                on:click={() => {
                  controlPoints.commit();
                  updatePointProp("leftWall", true);
                  updatePointProp("rightWall", true);
                }}
              >
                Both On
              </button>
              <button
                type="button"
                class="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-amber-300"
                on:click={() => {
                  controlPoints.commit();
                  updatePointProp("leftWall", false);
                  updatePointProp("rightWall", false);
                }}
              >
                Bridge (No Walls)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              class="btn btn-sm text-xs {selectedPoint.leftWall !== false
                ? 'variant-filled-primary font-semibold'
                : 'variant-soft opacity-60'}"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("leftWall", selectedPoint.leftWall === false);
              }}
            >
              {selectedPoint.leftWall !== false ? "✓ Left Wall" : "✕ Left Wall Off"}
            </button>
            <button
              type="button"
              class="btn btn-sm text-xs {selectedPoint.rightWall !== false
                ? 'variant-filled-primary font-semibold'
                : 'variant-soft opacity-60'}"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("rightWall", selectedPoint.rightWall === false);
              }}
            >
              {selectedPoint.rightWall !== false ? "✓ Right Wall" : "✕ Right Wall Off"}
            </button>
          </div>
        </div>
      {/if}

      <!-- Heightmap Stamp Properties (Width & Banking) -->
      <div class="p-3 rounded-lg bg-surface-800/80 border border-surface-500/20 flex flex-col gap-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-surface-300">
          Fairway Width & Banking
        </h4>

        <div class="flex flex-col gap-1.5">
          <div class="flex justify-between text-xs">
            <span class="font-medium">Fairway Half-Width</span>
            <span class="font-mono text-sky-300">{(selectedPoint.width ?? 2.5).toFixed(1)}m</span>
          </div>
          <input
            type="range"
            min="1.2"
            max="5.5"
            step="0.1"
            value={selectedPoint.width ?? 2.5}
            on:mousedown={() => controlPoints.commit()}
            on:input={(e) => updatePointProp("width", parseFloat(e.target.value))}
          />
          <div class="grid grid-cols-3 gap-1 mt-0.5">
            <button
              type="button"
              class="text-[10px] py-1 rounded bg-surface-700 hover:bg-surface-600"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("width", 1.6);
              }}
            >Narrow 1.6m</button>
            <button
              type="button"
              class="text-[10px] py-1 rounded bg-surface-700 hover:bg-surface-600"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("width", 2.5);
              }}
            >Normal 2.5m</button>
            <button
              type="button"
              class="text-[10px] py-1 rounded bg-surface-700 hover:bg-surface-600"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("width", 4.0);
              }}
            >Wide 4.0m</button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5 mt-1">
          <div class="flex justify-between text-xs">
            <span class="font-medium">Bank Angle (Roll)</span>
            <span class="font-mono text-pink-300">{selectedPoint.bankAngle ?? 0}°</span>
          </div>
          <input
            type="range"
            min="-30"
            max="30"
            step="1"
            value={selectedPoint.bankAngle ?? 0}
            on:mousedown={() => controlPoints.commit()}
            on:input={(e) => updatePointProp("bankAngle", parseFloat(e.target.value))}
          />
          <div class="grid grid-cols-3 gap-1 mt-0.5">
            <button
              type="button"
              class="text-[10px] py-1 rounded bg-surface-700 hover:bg-surface-600"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("bankAngle", -18);
              }}
            >Left -18°</button>
            <button
              type="button"
              class="text-[10px] py-1 rounded bg-surface-700 hover:bg-surface-600"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("bankAngle", 0);
              }}
            >Flat 0°</button>
            <button
              type="button"
              class="text-[10px] py-1 rounded bg-surface-700 hover:bg-surface-600"
              on:click={() => {
                controlPoints.commit();
                updatePointProp("bankAngle", 18);
              }}
            >Right +18°</button>
          </div>
        </div>
      </div>

      <!-- Quick Segment Actions -->
      <div class="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          class="btn btn-sm variant-soft-primary text-xs"
          on:click={insertPointAfterSelected}
        >
          + Subdivide (I)
        </button>
        <button
          type="button"
          class="btn btn-sm variant-soft-error text-xs"
          disabled={selectedIndex === 0 || $controlPoints.length <= 2}
          on:click={deleteSelected}
        >
          Delete Point
        </button>
      </div>
    </div>
  {:else if selectedBlock}
    <!-- Obstacle / Block Inspector -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold uppercase tracking-wider text-primary-400 capitalize">
        {selectedBlock.type} Inspector
      </h3>
      <button
        type="button"
        class="text-xs opacity-60 hover:opacity-100"
        on:click={() => ($blockSelected = null)}
      >
        ✕
      </button>
    </div>

    <div class="flex flex-col gap-3">
      <!-- 3D Gizmo Mode & Surface Snap -->
      <div class="p-3 rounded-lg bg-surface-800/80 border border-surface-500/20 flex flex-col gap-2.5">
        <h4 class="text-xs font-bold uppercase tracking-wider text-surface-300">
          3D Transform Gizmo
        </h4>
        <div class="grid grid-cols-3 gap-1">
          <button
            type="button"
            class="btn btn-sm text-xs {$transformMode === 'translate' ? 'variant-filled-primary' : 'variant-soft'}"
            on:click={() => ($transformMode = "translate")}
          >Move (T)</button>
          <button
            type="button"
            class="btn btn-sm text-xs {$transformMode === 'rotate' ? 'variant-filled-primary' : 'variant-soft'}"
            on:click={() => ($transformMode = "rotate")}
          >Rotate (R)</button>
          <button
            type="button"
            class="btn btn-sm text-xs {$transformMode === 'scale' ? 'variant-filled-primary' : 'variant-soft'}"
            on:click={() => ($transformMode = "scale")}
          >Scale (E)</button>
        </div>

        <button
          type="button"
          class="btn btn-sm variant-soft-secondary text-xs w-full mt-1"
          on:click={snapBlockToGround}
        >
          ⚓ Snap Y to Terrain Ground
        </button>
      </div>

      <!-- Quick Yaw Rotation -->
      <div class="p-3 rounded-lg bg-surface-800/80 border border-surface-500/20 flex flex-col gap-2">
        <div class="flex justify-between text-xs">
          <span class="font-medium">Yaw Rotation (Y)</span>
          <span class="font-mono text-sky-300">{blockYawDeg}°</span>
        </div>
        <input
          type="range"
          min="-180"
          max="180"
          step="5"
          value={blockYawDeg}
          on:mousedown={() => blocks.commit()}
          on:input={(e) => setBlockYawDeg(parseFloat(e.target.value))}
        />
        <div class="grid grid-cols-3 gap-1">
          <button
            type="button"
            class="text-[10px] py-1 rounded bg-surface-700 hover:bg-surface-600"
            on:click={() => {
              blocks.commit();
              setBlockYawDeg(blockYawDeg - 45);
            }}
          >-45°</button>
          <button
            type="button"
            class="text-[10px] py-1 rounded bg-surface-700 hover:bg-surface-600"
            on:click={() => {
              blocks.commit();
              setBlockYawDeg(0);
            }}
          >Reset 0°</button>
          <button
            type="button"
            class="text-[10px] py-1 rounded bg-surface-700 hover:bg-surface-600"
            on:click={() => {
              blocks.commit();
              setBlockYawDeg(blockYawDeg + 45);
            }}
          >+45°</button>
        </div>
      </div>

      {#if selectedBlock.type === "bumper" || selectedBlock.type === "boost"}
        <div class="p-3 rounded-lg bg-surface-800/80 border border-surface-500/20 flex flex-col gap-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-surface-300">
            Obstacle Physics
          </h4>
          {#if selectedBlock.type === "bumper"}
            <label class="label">
              <span class="text-xs">Bounciness (Restitution)</span>
              <input
                class="input text-xs py-1"
                type="number"
                step="0.1"
                bind:value={selectedBlock.restitution}
                on:change={(e) => {
                  blocks.commit();
                  $blocks[selectedBlockIndex].restitution = parseFloat(e.target.value);
                  $blocks = [...$blocks];
                }}
              />
            </label>
          {/if}

          {#if selectedBlock.type === "boost"}
            <label class="label">
              <span class="text-xs">Boost Force</span>
              <input
                class="input text-xs py-1"
                type="number"
                step="1"
                bind:value={selectedBlock.boostForce}
                on:change={(e) => {
                  blocks.commit();
                  $blocks[selectedBlockIndex].boostForce = parseFloat(e.target.value);
                  $blocks = [...$blocks];
                }}
              />
            </label>
          {/if}
        </div>
      {/if}

      <div class="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          class="btn btn-sm variant-soft-primary text-xs"
          on:click={duplicateSelectedBlock}
          title="Shortcut: Ctrl+D"
        >
          ⧉ Duplicate
        </button>
        <button
          type="button"
          class="btn btn-sm variant-soft-error text-xs"
          on:click={deleteSelected}
          title="Shortcut: Delete"
        >
          🗑 Delete
        </button>
      </div>
    </div>
  {:else}
    <!-- Level Settings Inspector -->
    <h3 class="text-sm font-bold uppercase tracking-wider text-primary-400 mb-3">
      Level & Course Settings
    </h3>
    <div class="flex flex-col gap-3 text-xs">
      <label class="label">
        <span>Course Name</span>
        <input class="input text-xs py-1.5" type="text" bind:value={$stage.name} placeholder="My Awesome Hole" />
      </label>
      <div class="grid grid-cols-2 gap-2">
        <label class="label">
          <span>Par</span>
          <input class="input text-xs py-1.5" type="number" min="1" max="12" bind:value={$stage.par} />
        </label>
        <label class="label">
          <span>Theme</span>
          <select class="select text-xs py-1.5" bind:value={$stage.theme}>
            <option value="clear">Clear Day</option>
            <option value="sunset">Sunset</option>
            <option value="night">Night</option>
            <option value="vaporwave">Vaporwave</option>
          </select>
        </label>
      </div>

      <label class="label">
        <span>Course Ground Mode</span>
        <select class="select text-xs py-1.5" bind:value={$stage.terrainMode}>
          <option value="heightmap">Sculpted Heightmap (Organic)</option>
          <option value="classic">Classic Board Track (Wooden Walls)</option>
        </select>
      </label>

      <label class="label">
        <span>Fairway Turf Color</span>
        <input class="input h-8 w-full cursor-pointer p-0.5" type="color" bind:value={$stage.tileColor} />
      </label>

      <hr class="opacity-30 my-1" />
      <h4 class="text-xs font-bold uppercase tracking-wider text-surface-300">
        Surface Physics
      </h4>

      <div class="grid grid-cols-2 gap-2">
        <label class="label">
          <span class="text-[11px] opacity-80">Ground Friction</span>
          <input class="input text-xs py-1" type="number" step="0.05" bind:value={$stage.groundFriction} />
        </label>
        <label class="label">
          <span class="text-[11px] opacity-80">Ground Bounce</span>
          <input class="input text-xs py-1" type="number" step="0.05" bind:value={$stage.groundRestitution} />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <label class="label">
          <span class="text-[11px] opacity-80">Wall Friction</span>
          <input class="input text-xs py-1" type="number" step="0.05" bind:value={$stage.wallFriction} />
        </label>
        <label class="label">
          <span class="text-[11px] opacity-80">Wall Bounce</span>
          <input class="input text-xs py-1" type="number" step="0.05" bind:value={$stage.wallRestitution} />
        </label>
      </div>
    </div>
  {/if}
</div>
