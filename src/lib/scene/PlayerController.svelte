<script>
  import { T } from "@threlte/core";
  import { createEventDispatcher } from "svelte";
  import { Group, Raycaster, Vector2, Vector3 } from "three";
  import ArrowIndicator from "./ArrowIndicator.svelte";

  export let size = 0.1;
  export let position;

  let ref = new Group();

  let lowerLimit = size * 2.5;
  let upperLimit = lowerLimit + 2.5;

  let opacity = 0.35;
  let selectionSphere;
  let selectionPlane;

  const raycaster = new Raycaster();
  let selected = false;

  let point = new Vector3();

  let showIndicator = false;

  const dispatch = createEventDispatcher();

  function handleMouseDown(ev) {
    selected = true;
    dispatch("selected", true);
  }

  function handleMouseMove(ev) {
    if (selected) {
      point = ev.point.clone();
      showIndicator = true;
    }
  }

  function handleMouseUp(ev) {
    if (selected) {
      selected = false;
      showIndicator = false;
      dispatch("apply", point);
    }
  }
</script>

<T.Group bind:ref {position}>
  <T.Mesh bind:ref={selectionSphere} on:pointerdown={handleMouseDown}>
    <T.SphereGeometry args={[lowerLimit, 32, 16]} />
    <T.MeshBasicMaterial
      transparent
      opacity={!selected ? opacity : 0.0}
      color={"white"}
    />
  </T.Mesh>
  <T.Mesh
    bind:ref={selectionPlane}
    rotation.x={-Math.PI * 0.5}
    on:pointermove={handleMouseMove}
    on:pointerup={handleMouseUp}
  >
    <T.RingGeometry args={[lowerLimit, upperLimit, 32]} />
    <T.MeshBasicMaterial transparent opacity={0.0} color={"white"} />
  </T.Mesh>
</T.Group>
{#if showIndicator}
  <slot position={[...point]} target={position}>
    <ArrowIndicator position={[...point]} target={position} color={"white"} />
  </slot>
{/if}
