<script>
  import { T } from "@threlte/core";
  import { MathUtils, Shape, ExtrudeGeometry } from "three";
  import { AutoColliders } from "@threlte/rapier";
  import TrackBlockMeshes from "./TrackBlockMeshes.svelte";

  export let type = "start"; // 'start' or 'end'
  export let shape = "square"; // 'square' or 'rounded'
  export let position = [0, 0, 0];
  export let rotation = 0; // Y rotation around the up axis
  export let color = "#7c83fd";
  export let isEditor = false;

  // Dimensions matching the track
  const w = 2.5; // Half inner width
  const t = 0.2; // Wall thickness
  const h = 0.5; // Wall height
  const floorDepth = 0.1;

  const totalWidth = w * 2 + t * 2; // 5.4
  const blockLength = 5.4;

  // The track starts at the center of this block (z=0) and goes towards +Z.
  // For the start block, the back wall is at -Z.
  // For the end block, the track comes from -Z and ends at center (z=0).
  // So the back wall is at +Z.

  let roundedWallGeo = null;
  $: if (shape === "rounded") {
    const wallShape = new Shape();
    const outerRadius = totalWidth / 2;
    const innerRadius = w;
    
    if (type === "start") {
      // Wall at -Z in 3D. Rotation -Math.PI/2 makes Shape +Y map to 3D -Z.
      // So arc at Shape +Y (0 to PI).
      wallShape.absarc(0, 0, outerRadius, 0, Math.PI, false);
      wallShape.absarc(0, 0, innerRadius, Math.PI, 0, true);
    } else {
      // Wall at +Z in 3D. Arc at Shape -Y (PI to 2PI).
      wallShape.absarc(0, 0, outerRadius, Math.PI, Math.PI * 2, false);
      wallShape.absarc(0, 0, innerRadius, Math.PI * 2, Math.PI, true);
    }
    
    roundedWallGeo = new ExtrudeGeometry(wallShape, {
      depth: h,
      bevelEnabled: false,
      curveSegments: 32
    });
  }
</script>

<T.Group {position} rotation={[0, rotation, 0]}>
  {#if isEditor}
    <TrackBlockMeshes
      {type} {shape} {totalWidth} {floorDepth} {blockLength}
      {w} {t} {h} {color} {roundedWallGeo}
    />
  {:else}
    <AutoColliders shape="trimesh">
      <TrackBlockMeshes
        {type} {shape} {totalWidth} {floorDepth} {blockLength}
        {w} {t} {h} {color} {roundedWallGeo}
      />
    </AutoColliders>
  {/if}
</T.Group>
