<script>
  import { T } from "@threlte/core";
  import { useEditor } from "../context";
  import { TILE_SIZE, GRID_SIZE } from "$lib/gridUtils";

  const { controlPoints, pointSelected } = useEditor();

  // Grid settings (must match gridUtils.js)
  const GAP = 0.06; // gap between tiles (visual grid lines)
  const HALF = (GRID_SIZE * TILE_SIZE) / 2;

  // Pre-build tile descriptors once
  const tiles = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = col * TILE_SIZE - HALF + TILE_SIZE / 2;
      const z = row * TILE_SIZE - HALF + TILE_SIZE / 2;
      // Checkerboard shade so the grid reads clearly
      const isLight = (row + col) % 2 === 0;
      tiles.push({ x, z, key: `${row}-${col}`, isLight });
    }
  }

  const COLOR_DARK = "#527a36";
  const COLOR_LIGHT = "#5f8f3f";
  const COLOR_HOVER = "#8fcc55";

  // Hover & double-click state
  let hoveredKey = null;
  const DOUBLE_CLICK_MS = 280;
  let lastClickKey = null;
  let lastClickTime = 0;

  function handleClick(e, tile) {
    console.log("Terrain tile clicked");
    e.stopPropagation();
    const now = Date.now();
    const isDouble =
      tile.key === lastClickKey && now - lastClickTime < DOUBLE_CLICK_MS;
    lastClickKey = tile.key;
    lastClickTime = now;

    if (isDouble) {
      // Add a new control point at this tile's position
      controlPoints.commit();
      const newId = crypto.randomUUID();
      $controlPoints = [
        ...$controlPoints,
        { id: newId, position: [tile.x, 0, tile.z] },
      ];
      $pointSelected = newId;
    } else {
      // Single click: deselect current point
      $pointSelected = null;
    }
  }


</script>

{#each tiles as tile (tile.key)}
  <T.Mesh
    position={[tile.x, 0, tile.z]}
    rotation={[-Math.PI / 2, 0, 0]}
    receiveShadow
    on:pointerenter={() => {
      hoveredKey = tile.key;
    }}
    on:pointerleave={() => {
      if (hoveredKey === tile.key) hoveredKey = null;
    }}
    on:click={(e) => handleClick(e, tile)}
  >
    <T.PlaneGeometry args={[TILE_SIZE - GAP, TILE_SIZE - GAP]} />
    <T.MeshStandardMaterial
      color={hoveredKey === tile.key
        ? COLOR_HOVER
        : tile.isLight
          ? COLOR_LIGHT
          : COLOR_DARK}
      roughness={0.85}
      metalness={0.0}
    />
  </T.Mesh>
{/each}
