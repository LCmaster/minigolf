<script>
  import { T } from "@threlte/core";
  import { useEditor } from "../context";
  import { TILE_SIZE, GRID_SIZE } from "$lib/gridUtils";

  const { controlPoints, pointSelected, placementBlock, previewPosition, blocks, blockSelected } = useEditor();

  // Grid settings (must match gridUtils.js)
  const GAP = 0.06; // gap between tiles (visual grid lines)
  const HALF = (GRID_SIZE * TILE_SIZE) / 2;

  // Hex grid settings
  const HEX_RADIUS = TILE_SIZE / Math.sqrt(3); // ensures comparable surface area
  const HEX_WIDTH = 2 * HEX_RADIUS;
  const HEX_HEIGHT = Math.sqrt(3) * HEX_RADIUS;
  const COL_SPACING = HEX_RADIUS * 1.5;
  const ROW_SPACING = HEX_HEIGHT;
  const HALF_X = (GRID_SIZE * COL_SPACING) / 2;
  const HALF_Z = (GRID_SIZE * ROW_SPACING) / 2;

  // Pre-build tile descriptors once
  const tiles = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const zOffset = (col % 2 === 1) ? ROW_SPACING / 2 : 0;
      const x = col * COL_SPACING - HALF_X;
      const z = row * ROW_SPACING + zOffset - HALF_Z;
      
      // 3-color coloring for hexes so no adjacent hexes share color
      const colorIndex = (row + (col % 2 === 1 ? 1 : 0) + col * 2) % 3;
      tiles.push({ x, z, key: `${row}-${col}`, colorIndex });
    }
  }

  const COLOR_1 = "#527a36";
  const COLOR_2 = "#5f8f3f";
  const COLOR_3 = "#4b7031";
  const COLOR_HOVER = "#8fcc55";

  // Hover & double-click state
  let hoveredKey = null;
  const DOUBLE_CLICK_MS = 280;
  let lastClickKey = null;
  let lastClickTime = 0;

  function handleClick(e, tile) {
    e.stopPropagation();

    if ($placementBlock) {
      // Place the block
      const newBlock = {
        id: crypto.randomUUID(),
        type: $placementBlock.type,
        variation: $placementBlock.variation,
        position: [tile.x, 0, tile.z],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };
      if (newBlock.type === "bumper") newBlock.restitution = 2.0;
      if (newBlock.type === "boost") newBlock.boostForce = 15;

      blocks.commit();
      $blocks = [...$blocks, newBlock];
      $blockSelected = newBlock.id;
      
      // Exit placement mode
      $placementBlock = null;
      return;
    }

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

  function handlePointerMove(e, tile) {
    if ($placementBlock) {
      e.stopPropagation();
      $previewPosition = [tile.x, 0, tile.z];
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
    on:pointermove={(e) => handlePointerMove(e, tile)}
    on:click={(e) => handleClick(e, tile)}
  >
    <T.CircleGeometry args={[HEX_RADIUS - GAP / 2, 6]} />
    <T.MeshStandardMaterial
      color={hoveredKey === tile.key
        ? COLOR_HOVER
        : tile.colorIndex === 0
          ? COLOR_1
          : tile.colorIndex === 1
            ? COLOR_2
            : COLOR_3}
      roughness={0.85}
      metalness={0.0}
    />
  </T.Mesh>
{/each}
