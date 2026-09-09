<script>
  import { T, useThrelte } from "@threlte/core";
  import { Environment } from "@threlte/extras";
  import { Color, Fog } from "three";
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
  
  $: {
    if (scene && activeTheme) {
      scene.fog = new Fog(activeTheme.fogColor, activeTheme.fogNear, activeTheme.fogFar);
    }
  }
</script>

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
