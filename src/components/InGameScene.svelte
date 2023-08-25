<script>
  import { T, useFrame, useThrelte } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { Collider, RigidBody, AutoColliders } from "@threlte/rapier";
  import { OrbitControls } from "@threlte/extras";
  import * as THREE from "three";
  import { onMount } from "svelte";

  export let stage = "001";
  const gltf = useGltf(`Stage_${stage}.glb`);

  let camera;

  const courseMaterial = new THREE.MeshStandardMaterial({
    color: 0x99ccff,
  });
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x993333,
  });
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
  });
  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
  });
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: "seagreen",
  });

  let inGameScene = new THREE.Group();

  let target;
  let spawnPosition;

  let raycaster = new THREE.Raycaster();

  let pointer = {
    isPressed: false,
    origin: new THREE.Vector2(),
    current: new THREE.Vector2(),
  };

  let playerSelected = false;

  let playerMesh;
  let playerRigidBody;

  let forceSelectionPlane = new THREE.Mesh();

  let arrowIndicator;
  let hitPoint = new THREE.Vector3();

  useGltf("/ForceArrow.glb").then((gltf) => {
    const model = gltf.scene;
    model.traverse((obj) => {
      if (obj.isMesh) {
        const arrowMaterial = new THREE.MeshBasicMaterial();
        arrowMaterial.color = new THREE.Color(0xffffff);
        arrowMaterial.depthTest = false;
        obj.material = arrowMaterial;
        obj.renderOrder = 999999;
      }
    });

    arrowIndicator = model;
  });

  const handleMouseMove = (ev) => {
    //Convert pointer screen position from screen space to clip space
    pointer.current.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = -(ev.clientY / window.innerHeight) * 2 + 1;

    if (pointer.isPressed && playerSelected) {
      raycaster.setFromCamera(
        new THREE.Vector2(pointer.current.x, pointer.current.y),
        camera
      );
      const intersections = raycaster.intersectObject(inGameScene);

      for (let i = 0; i < intersections.length; i++) {
        if (intersections[i].object === forceSelectionPlane) {
          hitPoint = intersections[i].point.clone();

          arrowIndicator.position.set(...hitPoint);

          let worldPosition = new THREE.Vector3();

          playerMesh.getWorldPosition(worldPosition);

          const distance = hitPoint.distanceTo(worldPosition);

          const hitForce = Math.min(distance, 5);

          let lookAtTarget = new THREE.Vector3();
          lookAtTarget
            .subVectors(arrowIndicator.position, worldPosition)
            .add(arrowIndicator.position);

          arrowIndicator.scale.set(hitForce - 0.75, 1, hitForce - 0.75);
          arrowIndicator.lookAt(lookAtTarget);

          let newArrowIndicatorPosition = new THREE.Vector3();
          newArrowIndicatorPosition
            .subVectors(arrowIndicator.position, worldPosition)
            .clampLength(0.75, 5)
            .add(worldPosition);
          arrowIndicator.position.set(...newArrowIndicatorPosition);
        }
      }
    }
  };

  const handleMouseDown = (ev) => {
    pointer.isPressed = true;
    pointer.origin.x = pointer.current.x;
    pointer.origin.y = pointer.current.y;
    raycaster.setFromCamera(
      new THREE.Vector2(pointer.current.x, pointer.current.y),
      camera
    );
    const intersections = raycaster.intersectObject(inGameScene);

    for (let i = 0; i < intersections.length; i++) {
      if (intersections[i].object === playerMesh) {
        playerSelected = true;
        // this.controls.enabled = false;
        let worldPosition = new THREE.Vector3();

        playerMesh.getWorldPosition(worldPosition);
        arrowIndicator.position.set(...worldPosition);
        inGameScene.add(arrowIndicator);
      }
    }
  };

  const handleMouseUp = (ev) => {
    inGameScene.remove(arrowIndicator);
    if (pointer.isPressed && playerSelected) {
      let worldPosition = new THREE.Vector3();

      playerMesh.getWorldPosition(worldPosition);

      const distance = hitPoint.distanceTo(worldPosition);
      const hitForce = Math.min(distance, 5);
      const hitDirection = new THREE.Vector3();
      hitDirection
        .subVectors(hitPoint, worldPosition)
        .normalize()
        .multiplyScalar(hitForce * 2)
        .negate()
        .setY(0);
      playerRigidBody.applyImpulse(hitDirection, true);
    }
    hitPoint = new THREE.Vector3();
    pointer.origin.set(0, 0);
    pointer.isPressed = false;
    playerSelected = false;
    // this.controls.enabled = true;
    // this._strokeEventHandler();
  };

  useFrame(() => {
    if (!playerRigidBody) return;

    let worldPosition = new THREE.Vector3();

    playerMesh.getWorldPosition(worldPosition);
    forceSelectionPlane.position.set(...worldPosition);
  });
</script>

<svelte:window
  on:mousemove={handleMouseMove}
  on:mousedown={handleMouseDown}
  on:mouseup={handleMouseUp}
/>

{#if $gltf}
  <T.DirectionalLight
    color="#ffffff"
    intensity={2}
    position={[10, 10, 10]}
    castShadow
  />

  <T.Group bind:ref={inGameScene}>
    <RigidBody type="fixed">
      <AutoColliders shape={"trimesh"}>
        <T.Mesh
          geometry={$gltf.nodes.Course.geometry}
          material={courseMaterial}
          position={[...$gltf.nodes.Course.position]}
        />
      </AutoColliders>
      <AutoColliders shape={"trimesh"}>
        <T.Mesh
          geometry={$gltf.nodes.Walls.geometry}
          material={wallMaterial}
          position={[...$gltf.nodes.Walls.position]}
        />
      </AutoColliders>
    </RigidBody>
    <T.Mesh
      geometry={$gltf.nodes.Pole.geometry}
      material={poleMaterial}
      position={[...$gltf.nodes.Pole.position]}
    />
    <T.Mesh
      geometry={$gltf.nodes.Flag.geometry}
      material={flagMaterial}
      position={[...$gltf.nodes.Flag.position]}
    />
    <T.Mesh
      geometry={$gltf.nodes.Ground.geometry}
      material={terrainMaterial}
      position={[...$gltf.nodes.Ground.position]}
    />

    <RigidBody type="dynamic" bind:rigidBody={playerRigidBody}>
      <AutoColliders shape={"ball"}>
        <T.Mesh
          bind:ref={playerMesh}
          position={[...$gltf.nodes.Start.position]}
        >
          <T.IcosahedronGeometry args={[0.45, 2]} />
          <T.MeshStandardMaterial flatShading color={"red"} />
        </T.Mesh>
      </AutoColliders>
    </RigidBody>
    <T.Mesh bind:ref={forceSelectionPlane} rotation.x={-Math.PI * 0.5}>
      <T.CircleGeometry args={[25, 32]} />
      <T.MeshBasicMaterial transparent opacity={0} />
    </T.Mesh>
  </T.Group>
  <T.PerspectiveCamera
    makeDefault
    bind:ref={camera}
    fov={45}
    position={[0, 25, 25]}
    target={[...$gltf.nodes.Start.position]}
  >
    <OrbitControls autoRotate enableDamping />
  </T.PerspectiveCamera>
{/if}
