<script lang="ts">
  import { Group, Mesh, Raycaster, Vector2, Vector3 } from "three";
  import { T } from "@threlte/core";
  import { createEventDispatcher, getContext } from "svelte";
  import ArrowIndicator from "./ArrowIndicator.svelte";
  import { camera, controls, playerPosition } from "../lib/scene";

  export let size: number = 0.45;

  let ref = new Group();

  let opacity: number = 0.35;
  let selectionSphere: Mesh;
  let selectionPlane: Mesh;

  const raycaster: Raycaster = new Raycaster();
  let selected: boolean = false;

  let point = new Vector3();

  let showIndicator = false;

  const dispatch = createEventDispatcher();

  function handleMouseDown(ev) {
    if (!$camera && !$controls) return;

    const pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
    const pointerY = -(ev.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(new Vector2(pointerX, pointerY), $camera);
    const intersections = raycaster.intersectObject(ref);

    for (let i = 0; i < intersections.length; i++) {
      if (intersections[i].object === selectionSphere) {
        $controls.enabled = false;
        selected = true;
        dispatch("selected", true);
      }
    }
  }

  function handleMouseMove(ev) {
    if (!$camera && !$controls) return;

    if (selected) {
      const pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
      const pointerY = -(ev.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(new Vector2(pointerX, pointerY), $camera);
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
    if (!$camera && !$controls) return;

    if (selected) {
      dispatch("apply", point);

      $controls.enabled = true;
      showIndicator = false;
      selected = false;
    }
  }
</script>

<svelte:window
  on:mousemove={handleMouseMove}
  on:mousedown={handleMouseDown}
  on:mouseup={handleMouseUp}
/>

<T.Group bind:ref position={$playerPosition}>
  <T.Mesh bind:ref={selectionSphere}>
    <T.SphereGeometry args={[size + 0.75, 32, 16]} />
    <T.MeshBasicMaterial
      transparent
      opacity={!selected ? opacity : 0.0}
      color={"white"}
    />
  </T.Mesh>
  <T.Mesh bind:ref={selectionPlane} rotation.x={-Math.PI * 0.5}>
    <T.RingGeometry args={[size + 0.75, 5 + size + 0.75, 32]} />
    <T.MeshBasicMaterial transparent opacity={0.0} color={"white"} />
  </T.Mesh>
</T.Group>
{#if showIndicator}
  <slot position={[...point]} target={$playerPosition}>
    <ArrowIndicator
      position={[...point]}
      target={$playerPosition}
      color={"white"}
    />
  </slot>
{/if}
