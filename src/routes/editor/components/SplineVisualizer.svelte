<script>
  import { T } from "@threlte/core";
  import { onDestroy } from "svelte";
  import {
    BufferGeometry,
    Float32BufferAttribute,
    Vector3,
  } from "three";
  import { computeMiterPathData } from "$lib/trackGeometry";

  export let controlPoints = [];
  export let selectedPointId = null;

  let spineGeo = null;
  let ribs = [];

  $: rebuildVisuals(controlPoints, selectedPointId);

  function disposeVisuals() {
    if (spineGeo) {
      spineGeo.dispose();
      spineGeo = null;
    }
    for (const r of ribs) {
      r.geo?.dispose();
      r.stemGeo?.dispose();
    }
    ribs = [];
  }

  function rebuildVisuals(points, selectedId) {
    disposeVisuals();
    if (!points || points.length < 2) return;

    const vecs = points.map(
      (p) => new Vector3(p.position[0], p.position[1], p.position[2])
    );
    const pathData = computeMiterPathData(vecs, points);

    // 1. Centerline spine geometry through all pathData vertices (curves smoothly at rounded control points)
    const spinePositions = new Float32Array(pathData.length * 3);
    for (let i = 0; i < pathData.length; i++) {
      const pt = pathData[i].p;
      spinePositions[i * 3] = pt.x;
      spinePositions[i * 3 + 1] = pt.y + 0.22;
      spinePositions[i * 3 + 2] = pt.z;
    }
    const newSpineGeo = new BufferGeometry();
    newSpineGeo.setAttribute(
      "position",
      new Float32BufferAttribute(spinePositions, 3)
    );
    spineGeo = newSpineGeo;

    // 2. Per-control-point Width + Bank Angle cross-bars & vertical stem to handle
    const newRibs = [];
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const pd = pathData.find((d) => d.controlIndex === i) || pathData[0];
      const halfWidth = pd.halfWidth ?? 2.5;

      // Center of the track tile surface along banked Up vector
      const center = pd.p.clone().addScaledVector(pd.U, 0.2);
      const leftEdge = center.clone().addScaledVector(pd.R, -halfWidth * pd.miterScaleX);
      const rightEdge = center.clone().addScaledVector(pd.R, halfWidth * pd.miterScaleX);
      const leftTickH = pt.leftWall !== false ? 0.35 : 0;
      const rightTickH = pt.rightWall !== false ? 0.35 : 0;
      const leftTop = leftEdge.clone().addScaledVector(pd.U, leftTickH);
      const rightTop = rightEdge.clone().addScaledVector(pd.U, rightTickH);

      const ribVerts = new Float32Array([
        leftTop.x, leftTop.y, leftTop.z,
        leftEdge.x, leftEdge.y, leftEdge.z,
        center.x, center.y, center.z,
        rightEdge.x, rightEdge.y, rightEdge.z,
        rightTop.x, rightTop.y, rightTop.z,
      ]);
      const ribGeo = new BufferGeometry();
      ribGeo.setAttribute("position", new Float32BufferAttribute(ribVerts, 3));

      // Stem from actual control point handle down to the track apex
      const rawPos = vecs[i];
      const stemVerts = new Float32Array([
        pd.p.x, pd.p.y + 0.14, pd.p.z,
        rawPos.x, rawPos.y + 1.5, rawPos.z,
      ]);
      const stemGeo = new BufferGeometry();
      stemGeo.setAttribute("position", new Float32BufferAttribute(stemVerts, 3));

      newRibs.push({
        id: pt.id,
        geo: ribGeo,
        stemGeo,
        isSelected: pt.id === selectedId,
        isBanked: Math.abs(pt.bankAngle ?? 0) > 0.5,
      });
    }
    ribs = newRibs;
  }

  onDestroy(() => {
    disposeVisuals();
  });
</script>

{#if spineGeo}
  <!-- Centerline Spine -->
  <T.Line geometry={spineGeo}>
    <T.LineBasicMaterial color="#38bdf8" linewidth={2} transparent opacity={0.9} />
  </T.Line>
{/if}

{#each ribs as rib (rib.id)}
  <!-- Fairway Width & Bank Angle Cross-Bar -->
  <T.Line geometry={rib.geo}>
    <T.LineBasicMaterial
      color={rib.isSelected ? "#facc15" : rib.isBanked ? "#f472b6" : "#a7f3d0"}
      linewidth={2}
      transparent
      opacity={rib.isSelected ? 1.0 : 0.75}
    />
  </T.Line>

  <!-- Vertical Stem to Control Point Sphere -->
  <T.Line geometry={rib.stemGeo}>
    <T.LineBasicMaterial
      color={rib.isSelected ? "#ef4444" : "#94a3b8"}
      transparent
      opacity={0.7}
    />
  </T.Line>
{/each}
