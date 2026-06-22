<script>
  import { T } from "@threlte/core";
  import { Environment } from "@threlte/extras";
  import { themes } from "./themes.js";

  export let theme = "clear";

  // Fallback to clear if the theme name doesn't exist
  $: activeTheme = themes[theme] || themes["clear"];
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

<T.Fog attach="fog" color={activeTheme.fogColor} near={activeTheme.fogNear} far={activeTheme.fogFar} />

<T.Color attach="background" args={[activeTheme.skyColor]} />

<Environment preset={activeTheme.preset} isBackground={false} />
