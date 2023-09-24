<script lang="ts">
  import {
    Group,
    Mesh,
    PerspectiveCamera,
    Raycaster,
    Vector2,
    Vector3,
  } from "three";
  import { T, useFrame } from "@threlte/core";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

  import CameraControls from "./CameraControls.svelte";
  import PlayerSelector from "./PlayerSelector.svelte";

  let camera: PerspectiveCamera;

  // === WORLD PROPERTIES === //
  export let position: Array<number> = [0, 0, 0];

  // === GRAPHICAL PROPERTIES === //
  export let size: number = 0.45;
  export let color: string = "#FF0000";

  // === PHYSICAL PROPERTIES === //
  export let friction: number = 2;
  export let restitution: number = 0.5;

  // === PLAYER === //
  let body: any;
  let mesh: any;

  let pulse = false;
  let playerPosition = position;

  // === SELECTION MESHES === //
  let selectable = false;
  let selected = false;
  let selectionGroup: Group;
  let selectionSphere: Mesh;
  let selectionPlane: Mesh;

  let selectionSphereScale = 1.0;
  let selectionSphereOpacity = 0.0;

  //   $: if (body) {
  //     let worldPosition = new Vector3();

  //     mesh.getWorldPosition(worldPosition);
  //     let hitPoint = worldPosition.clone();
  //     hitPoint.z += 5;

  //     const distance = hitPoint.distanceTo(worldPosition);
  //     const hitForce = Math.min(distance, 5);
  //     const hitDirection = new Vector3();

  //     hitDirection
  //       .subVectors(hitPoint, worldPosition)
  //       .normalize()
  //       .multiplyScalar(hitForce * 1.5)
  //       .negate()
  //       .setY(0);

  //     // setTimeout(() => {
  //     //   body.applyImpulse(hitDirection, true);
  //     // }, 5000);
  //   }

  let pointer = {
    isPressed: false,
    origin: new Vector2(),
    current: new Vector2(),
  };

  function handleMouseDown(ev) {
    pointer.isPressed = true;
    pointer.origin.x = pointer.current.x;
    pointer.origin.y = pointer.current.y;

    let raycaster = new Raycaster();
    raycaster.setFromCamera(
      new Vector2(pointer.current.x, pointer.current.y),
      camera
    );
    const intersections = raycaster.intersectObject(selectionGroup);

    for (let i = 0; i < intersections.length; i++) {
      if (intersections[i].object === selectionSphere) {
        selected = true;

        console.log("PLAYER SELECTED");

        // let worldPosition = new THREE.Vector3();

        // playerMesh.getWorldPosition(worldPosition);
        // arrowIndicator.position.set(...worldPosition);
        // inGameScene.add(arrowIndicator);
      }
    }
  }

  function handleMouseMove(ev) {
    //Convert pointer screen position from screen space to clip space
    pointer.current.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = -(ev.clientY / window.innerHeight) * 2 + 1;

    // if (pointer.isPressed && playerSelected) {
    //   raycaster.setFromCamera(
    //     new THREE.Vector2(pointer.current.x, pointer.current.y),
    //     camera
    //   );
    //   const intersections = raycaster.intersectObject(inGameScene);

    //   for (let i = 0; i < intersections.length; i++) {
    //     if (intersections[i].object === forceSelectionPlane) {
    //       hitPoint = intersections[i].point.clone();

    //       arrowIndicator.position.set(...hitPoint);

    //       let worldPosition = new THREE.Vector3();

    //       playerMesh.getWorldPosition(worldPosition);

    //       const distance = hitPoint.distanceTo(worldPosition);

    //       const hitForce = Math.min(distance, 5);

    //       let lookAtTarget = new THREE.Vector3();
    //       lookAtTarget
    //         .subVectors(arrowIndicator.position, worldPosition)
    //         .add(arrowIndicator.position);

    //       arrowIndicator.scale.set(hitForce - 0.75, 1, hitForce - 0.75);
    //       arrowIndicator.lookAt(lookAtTarget);

    //       let newArrowIndicatorPosition = new THREE.Vector3();
    //       newArrowIndicatorPosition
    //         .subVectors(arrowIndicator.position, worldPosition)
    //         .clampLength(0.75, 5)
    //         .add(worldPosition);
    //       arrowIndicator.position.set(...newArrowIndicatorPosition);
    //     }
    //   }
    // }
  }

  function handleMouseUp(ev) {}

  let direction = 1;
  let timestamp = 0.0;

  useFrame((ctx, delta: number) => {
    if (!body) return;

    if (body.isMoving()) {
      if (selectable) selectable = false;

      let worldPosition = new Vector3();
      mesh.getWorldPosition(worldPosition);
      playerPosition = [...worldPosition];
    } else {
      if (!selectable) selectable = true;
    }
  });
</script>

<RigidBody
  type="dynamic"
  linearDamping={0.3}
  angularDamping={0.3}
  bind:rigidBody={body}
>
  <AutoColliders shape={"ball"} {friction} {restitution}>
    <T.Mesh bind:ref={mesh} {position}>
      <T.IcosahedronGeometry args={[size, 3]} />
      <T.MeshStandardMaterial flatShading {color} />
    </T.Mesh>
  </AutoColliders>
</RigidBody>

{#if selectable}
  <PlayerSelector
    {camera}
    {size}
    position={playerPosition}
    on:setForce={(ev) => console.log(...ev.detail)}
    on:cancel={(ev) => console.log("Stroke Cancelled")}
    on:apply={(ev) => console.log("Stroke Applyed")}
  />
{/if}
<T.PerspectiveCamera makeDefault bind:ref={camera}>
  <CameraControls bind:object={mesh} />
</T.PerspectiveCamera>
