<script lang="ts">
  import { Vector3, Color } from "three";
  import { T, forwardEventHandlers, useFrame } from "@threlte/core";
  import { useGltf } from "@threlte/extras";

  // === GRAPHICAL PROPERTIES === //
  export let color: string = "#ffffff";
  export let position: Array<number>;
  export let target: Array<number>;

  const component = forwardEventHandlers();
  let ref: any;

  // Define our colors for Lerping
  const baseColor = new Color("#90ee90"); // Light Green
  const midColor = new Color("#ffff00");  // Yellow
  const maxColor = new Color("#ff0000");  // Red

  // Reactively calculate scale when position or target change
  $: positionVector = new Vector3(position[0], position[1], position[2]);
  $: targetVector = new Vector3(target[0], target[1], target[2]);
  $: distance = positionVector.distanceTo(targetVector);
  $: scale = distance - 0.25;

  // The max pull distance is roughly 2.5
  $: intensity = Math.min(Math.max(scale / 2.5, 0), 1);
  
  // Calculate dynamic color based on intensity
  $: dynamicColorHex = intensity < 0.5 
    ? baseColor.clone().lerp(midColor, intensity * 2).getHexString()
    : midColor.clone().lerp(maxColor, (intensity - 0.5) * 2).getHexString();

  // Use a reactive statement for rotation, but do NOT set position here because useFrame will override it
  $: if (ref && position && target) {
    ref.lookAt(target[0], target[1], target[2]);
    ref.rotation.y += Math.PI;
  }

  // Tension Shaking (Rumble effect)
  useFrame(() => {
    if (ref && position) {
      if (intensity > 0.3) {
        // Shake multiplies intensely as it nears max limit
        const shakeAmount = Math.pow((intensity - 0.3), 2) * 0.3;
        ref.position.set(
          position[0] + (Math.random() - 0.5) * shakeAmount,
          position[1] + (Math.random() - 0.5) * shakeAmount,
          position[2] + (Math.random() - 0.5) * shakeAmount
        );
      } else {
        ref.position.set(position[0], position[1], position[2]);
      }
    }
  });

</script>

<T.Group
  scale={[scale, scale, scale]}
  bind:ref
  {...$$restProps}
  bind:this={$component}
>
  {#await useGltf("/ForceArrow.glb") then gltf}
    <T.Mesh geometry={gltf.nodes.Arrow.geometry}>
      <T.MeshBasicMaterial color={"#" + dynamicColorHex} depthTest={false} renderOrder={9999} />
    </T.Mesh>
  {/await}
</T.Group>
