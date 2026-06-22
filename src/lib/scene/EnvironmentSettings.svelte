<script>
  import { T, useThrelte } from "@threlte/core";
  import { Environment } from "@threlte/extras";
  import { Color } from "three";
  import { themes } from "./themes.js";

  export let theme = "clear";

  // Fallback to clear if the theme name doesn't exist
  $: activeTheme = themes[theme] || themes["clear"];

  const { scene, renderer, invalidate } = useThrelte();

  $: {
    if (renderer && activeTheme) {
      renderer.setClearColor(new Color(activeTheme.skyColor), 1.0);
      invalidate();
    }
  }
</script>

<!-- Declaratively attach fog to the root 3D scene -->
<T is={scene}>
  <T.Fog attach="fog" color={activeTheme.fogColor} near={activeTheme.fogNear} far={activeTheme.fogFar} />
</T>

<T.AmbientLight intensity={activeTheme.ambientIntensity} color={activeTheme.ambientColor} />
<T.DirectionalLight
  position={activeTheme.dirPosition}
  intensity={activeTheme.dirIntensity}
  color={activeTheme.dirColor}
  castShadow
  shadow.mapSize.width={2048}
  shadow.mapSize.height={2048}
/>



<Environment preset={activeTheme.preset} isBackground={false} />
