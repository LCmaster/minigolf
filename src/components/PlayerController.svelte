<script lang="ts">
  import {
    Group,
    Mesh,
    PerspectiveCamera,
    Raycaster,
    Vector2,
    Vector3,
  } from "three";
  import { T } from "@threlte/core";
  import { createEventDispatcher } from "svelte";
  import ArrowIndicator from "./ArrowIndicator.svelte";

  export let camera: PerspectiveCamera;
  export let controls: any;

  export let ref: Group = new Group();
  export let position: Array<number> = [0, 0, 0];
  export let size: number = 0.45;

  let opacity: number = 0.35;
  let selectionSphere: Mesh;
  let selectionPlane: Mesh;

  const raycaster: Raycaster = new Raycaster();
  let selected: boolean = false;

  let hitpoint = new Vector3();

  let showIndicator = false;

  const dispatch = createEventDispatcher();

  function handleMouseDown(ev) {
    if (!camera && !controls) return;
    const pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
    const pointerY = -(ev.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(new Vector2(pointerX, pointerY), camera);
    const intersections = raycaster.intersectObject(ref);

    for (let i = 0; i < intersections.length; i++) {
      if (intersections[i].object === selectionSphere) {
        console.log("HIT!");
        controls.enabled = false;
        selected = true;
        dispatch("selected", true);
      }
    }
  }

  function handleMouseMove(ev) {
    if (!camera && !controls) return;

    if (selected) {
      const pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
      const pointerY = -(ev.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(new Vector2(pointerX, pointerY), camera);
      const intersections = raycaster.intersectObject(ref);

      hitpoint = new Vector3();
      showIndicator = false;
      for (let i = 0; i < intersections.length; i++) {
        if (intersections[i].object === selectionPlane) {
          showIndicator = true;
          hitpoint = intersections[i].point.clone();
        }
      }

      dispatch("hitPointSelected", hitpoint);
    }
  }

  function handleMouseUp(ev) {
    if (!camera && !controls) return;

    if (selected) {
      dispatch("hitPointApplied", hitpoint);
      dispatch("selected", false);

      controls.enabled = true;
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

<T.Group {position} bind:ref>
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
  {#if showIndicator}
    <slot>
      <!-- <ArrowIndicator
        hitpoint={[...hitpoint]}
        playerPosition={position}
        color={"white"}
      /> -->
    </slot>
  {/if}
</T.Group>
