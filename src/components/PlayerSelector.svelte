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

  export let camera: PerspectiveCamera;

  export let ref: Group = new Group();
  export let position: Array<number> = [0, 0, 0];
  export let size: number = 0.45;

  let opacity: number = 0.35;
  let selectionSphere: Mesh;
  let selectionPlane: Mesh;

  let raycaster: Raycaster = new Raycaster();
  let selected: boolean = false;

  let worldPosition: Vector3 = new Vector3(
    position[0],
    position[1],
    position[2]
  );

  const dispatch = createEventDispatcher();

  function handleMouseDown(ev) {
    const pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
    const pointerY = -(ev.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(new Vector2(pointerX, pointerY), camera);
    const intersections = raycaster.intersectObject(ref);

    for (let i = 0; i < intersections.length; i++) {
      if (intersections[i].object === selectionSphere) {
        selected = true;
      }
    }
  }

  function handleMouseMove(ev) {
    if (selected) {
      const pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
      const pointerY = -(ev.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(new Vector2(pointerX, pointerY), camera);
      const intersections = raycaster.intersectObject(ref);

      for (let i = 0; i < intersections.length; i++) {
        if (intersections[i].object === selectionPlane) {
          let intersectionPoint = intersections[i].point.clone();
          const force = new Vector3();
          force.subVectors(worldPosition, intersectionPoint);

          dispatch("setForce", force);
        }
      }
    }
  }

  function handleMouseUp(ev) {
    if (selected) {
      selected = false;
      const pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
      const pointerY = -(ev.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(new Vector2(pointerX, pointerY), camera);
      const intersections = raycaster.intersectObject(ref);

      let apply = false;

      for (let i = 0; i < intersections.length; i++) {
        if (intersections[i].object === selectionPlane) {
          apply = true;
        }
      }

      dispatch(apply ? "apply" : "cancel", null);
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
</T.Group>
