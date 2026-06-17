<script>
  import {
    Shape,
    Vector3,
    CatmullRomCurve3,
    ExtrudeGeometry,
  } from "three";
  import { onDestroy } from "svelte";
  import { T } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { AutoColliders } from "@threlte/rapier";

  export let controlPoints = [];

  let previousGeometry = null;

  $: curve = new CatmullRomCurve3(
    controlPoints.map((p) => new Vector3(...p.position)),
  );

  $: shape = (() => {
    const s = new Shape();
    const w = 2.5; // Half width
    const h = 0.5; // Wall height
    const t = 0.2; // Wall thickness

    // Negated X (which is height) and reversed winding order to fix upside down
    s.moveTo(0, -w - t);
    s.lineTo(0, w + t);
    s.lineTo(-h, w + t);
    s.lineTo(-h, w);
    s.lineTo(-0.1, w);
    s.lineTo(-0.1, -w);
    s.lineTo(-h, -w);
    s.lineTo(-h, -w - t);
    s.lineTo(0, -w - t);

    return s;
  })();

  $: {
    // Dispose old geometry before creating a new one to avoid Rapier stale buffer errors
    if (previousGeometry) {
      previousGeometry.dispose();
      previousGeometry = null;
    }
    if (controlPoints.length > 1) {
      const g = new ExtrudeGeometry(shape, {
        extrudePath: curve,
        steps: Math.max(10, controlPoints.length * 10),
        bevelEnabled: false,
      });
      previousGeometry = g;
      geometry = g;
    } else {
      geometry = null;
    }
  }

  let geometry = null;

  onDestroy(() => {
    if (previousGeometry) previousGeometry.dispose();
  });

  $: startGltf = useGltf("/block/start/1.glb");
  $: endGltf = useGltf("/block/end/1.glb");

  // Compute positions and rotations for start and end models
  $: startPos =
    controlPoints.length > 0 ? controlPoints[0].position : [0, 0, 0];
  $: endPos =
    controlPoints.length > 0
      ? controlPoints[controlPoints.length - 1].position
      : [0, 0, 0];

  $: startTangent =
    controlPoints.length > 1 ? curve.getTangentAt(0) : new Vector3(0, 0, 1);
  $: endTangent =
    controlPoints.length > 1 ? curve.getTangentAt(1) : new Vector3(0, 0, 1);

  // Rotation Y angle around UP axis
  $: startRotation = Math.atan2(startTangent.x, startTangent.z);
  $: endRotation = Math.atan2(endTangent.x, endTangent.z);
</script>

{#if geometry}
  {#key geometry}
    <AutoColliders shape="trimesh">
      <T.Mesh {geometry} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#7c83fd" />
      </T.Mesh>
    </AutoColliders>
  {/key}
{/if}

{#if $startGltf && controlPoints.length > 0}
  <T.Group position={startPos} rotation={[0, startRotation, 0]}>
    <T is={$startGltf.scene.clone()} />
  </T.Group>
{/if}

{#if $endGltf && controlPoints.length > 0}
  <T.Group position={endPos} rotation={[0, endRotation, 0]}>
    <T is={$endGltf.scene.clone()} />
  </T.Group>
{/if}
