<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { spring } from "svelte/motion";
  import { Vector3 } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];
  export let restitution = 2.0;

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation)
    ? safeRotation
    : [0, Math.PI * safeRotation, 0];

  const scaleSpring = spring(1, { stiffness: 0.2, damping: 0.4 });
  let active = false;

  function hit(e) {
    active = true;
    scaleSpring.set(1.3).then(() => scaleSpring.set(1));
    setTimeout(() => {
      active = false;
    }, 150);

    const detail = e.detail || e;
    if (detail.otherRigidBody) {
      // Calculate vector from bumper center to ball
      const bumperPos = new Vector3(...position);
      const ballPos = detail.otherRigidBody.translation();
      const ballVector = new Vector3(ballPos.x, ballPos.y, ballPos.z);

      // Zero out Y to prevent launching the ball out of bounds
      const dir = ballVector.sub(bumperPos).normalize().setY(0);
      const force = (restitution || 2.0) * 10;
      
      // Only apply to dynamic bodies
      if (detail.otherRigidBody.bodyType && detail.otherRigidBody.bodyType() === 0) {
        detail.otherRigidBody.applyImpulse(dir.multiplyScalar(force), true);
      }
    }
  }

  $: actualScale = [
    scale[0] * $scaleSpring,
    scale[1] * $scaleSpring,
    scale[2] * $scaleSpring,
  ];
</script>

<T.Group {position} rotation={actualRotation} scale={actualScale}>
  <RigidBody type="fixed">
    <Collider 
      shape="cylinder" 
      args={[0.3, 0.4]} 
      restitution={restitution || 2.0} 
      friction={0.0} 
      on:collisionenter={hit} 
      position={[0, 0.3, 0]} 
    />
    <T.Mesh castShadow receiveShadow position={[0, 0.3, 0]}>
      <!-- Bumper is 0.6 tall, so shifted up by 0.3 -->
      <T.CylinderGeometry args={[0.4, 0.4, 0.6, 16]} />
      <T.MeshStandardMaterial
        color={active ? "#ff3333" : "#ff5555"}
        emissive={active ? "#ff0000" : "#440000"}
        emissiveIntensity={active ? 2 : 0.5}
      />
    </T.Mesh>
  </RigidBody>
</T.Group>
