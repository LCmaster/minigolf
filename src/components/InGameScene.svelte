<script>
  import { T, useFrame } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import * as THREE from "three";
  import Player from "./Player.svelte";
  import Stage from "./Stage.svelte";

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
  const groundMaterial = new THREE.MeshStandardMaterial({
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
  };

  useFrame(() => {
    if (!playerRigidBody) return;

    let worldPosition = new THREE.Vector3();

    playerMesh.getWorldPosition(worldPosition);
    forceSelectionPlane.position.set(...worldPosition);
  });
</script>

<T.DirectionalLight
  color="#ffffff"
  intensity={2}
  position={[10, 10, 10]}
  castShadow
/>
<T.Group bind:ref={inGameScene}>
  <Stage name={"Stage_001.glb"} {courseMaterial} {groundMaterial} />
  <Player position={[0, 10, 0]} />
</T.Group>
