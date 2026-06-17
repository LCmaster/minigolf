<script>
  import { T } from "@threlte/core";
  import { OrbitControls, Environment } from "@threlte/extras";
  import SplineTrack from "./SplineTrack.svelte";
  import { useEditor } from "../context";
  import { CatmullRomCurve3, Vector3 } from "three";

  const { controlPoints, stage } = useEditor();

  // Auto-frame the camera on the track centroid
  $: centroid = (() => {
    if (!$controlPoints || $controlPoints.length === 0) return [0, 5, 0];
    const xs = $controlPoints.map((p) => p.position[0]);
    const zs = $controlPoints.map((p) => p.position[2]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    return [cx, 0, cz];
  })();

  $: spread = (() => {
    if (!$controlPoints || $controlPoints.length < 2) return 20;
    const xs = $controlPoints.map((p) => p.position[0]);
    const zs = $controlPoints.map((p) => p.position[2]);
    const w = Math.max(...xs) - Math.min(...xs);
    const d = Math.max(...zs) - Math.min(...zs);
    return Math.max(w, d, 20);
  })();

  // Camera sits above+behind the centroid, scaled by how spread out the course is
  $: camStart = [centroid[0], spread * 0.7, centroid[2] + spread * 0.8];
</script>

<T.AmbientLight intensity={0.6} />
<T.DirectionalLight
  position={[20, 30, 20]}
  intensity={2.5}
  castShadow
  shadow.mapSize.width={2048}
  shadow.mapSize.height={2048}
/>

<T.PerspectiveCamera
  makeDefault
  fov={55}
  on:create={({ ref }) => {
    ref.position.set(...camStart);
    ref.lookAt(...centroid);
  }}
>
  <OrbitControls
    target={centroid}
    enableDamping
    dampingFactor={0.08}
    minDistance={5}
    maxDistance={300}
  />
</T.PerspectiveCamera>

<!-- Full track rendered without editor overlays, no physics -->
<SplineTrack controlPoints={$controlPoints} isEditor={false} isPreview={true} />
