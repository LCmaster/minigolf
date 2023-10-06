<script>
  import { T } from "@threlte/core";
  import { createEventDispatcher } from "svelte";
  import { Group, Raycaster, Vector2, Vector3 } from "three";
  import ArrowIndicator from "./ArrowIndicator.svelte";

  export let size = 0.1;

  export let camera;
  export let position;

  let ref = new Group();

  let opacity = 0.35;
  let selectionSphere;
  let selectionPlane;

  const raycaster = new Raycaster();
  let selected = false;

  let point = new Vector3();

  let showIndicator = false;

  const dispatch = createEventDispatcher();

  function handleMouseDown(ev) {
    if (!camera) return;

    const pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
    const pointerY = -(ev.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(new Vector2(pointerX, pointerY), camera);
    const intersections = raycaster.intersectObject(ref);

    for (let i = 0; i < intersections.length; i++) {
      if (intersections[i].object === selectionSphere) {
        selected = true;
        dispatch("selected", true);
      }
    }
  }

  function handleMouseMove(ev) {
    if (!camera) return;

    if (selected) {
      const pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
      const pointerY = -(ev.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(new Vector2(pointerX, pointerY), camera);
      const intersections = raycaster.intersectObject(ref);

      point = new Vector3();
      showIndicator = false;
      for (let i = 0; i < intersections.length; i++) {
        if (intersections[i].object === selectionPlane) {
          showIndicator = true;
          point = intersections[i].point.clone();
        }
      }
    }
  }

  function handleMouseUp(ev) {
    if (!camera) return;

    if (selected) {
      selected = false;
      showIndicator = false;
      dispatch("apply", point);
    }
  }
</script>

<svelte:window
  on:mousemove={handleMouseMove}
  on:mousedown={handleMouseDown}
  on:mouseup={handleMouseUp}
/>

<T.Group bind:ref {position}>
  <T.Mesh bind:ref={selectionSphere}>
    <T.SphereGeometry args={[size + 0.1, 32, 16]} />
    <T.MeshBasicMaterial
      transparent
      opacity={!selected ? opacity : 0.0}
      color={"white"}
    />
  </T.Mesh>
  <T.Mesh bind:ref={selectionPlane} rotation.x={-Math.PI * 0.5}>
    <T.RingGeometry args={[size + 0.25, 2.5 + size + 0.25, 32]} />
    <T.MeshBasicMaterial transparent opacity={0.0} color={"white"} />
  </T.Mesh>
</T.Group>
{#if showIndicator}
  <slot position={[...point]} target={position}>
    <ArrowIndicator position={[...point]} target={position} color={"white"} />
  </slot>
{/if}
