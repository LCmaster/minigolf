<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { Vector3, Euler } from "three";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0]; 
  export let scale = [1, 1, 1];
  export let boostForce = 15;

  $: safeRotation = rotation ?? [0, 0, 0];
  $: actualRotation = Array.isArray(safeRotation) ? safeRotation : [0, Math.PI * safeRotation, 0];

  let triggered = false;

  function handleSensor(e) {
    triggered = true;
    setTimeout(() => triggered = false, 200);

    // In Svelte, component events are wrapped in a CustomEvent, so the payload is in e.detail
    const detail = e.detail || e;
    const targetBody = detail.otherRigidBody || detail.rigidBody || detail.targetRigidBody;
    
    if (targetBody) {
       const euler = new Euler(...actualRotation);
       // We'll have the chevron point along +Z locally.
       const forward = new Vector3(0, 0, 1).applyEuler(euler).normalize();
       const force = boostForce || 15;
       
       // Force the impulse vector to be a raw object
       const impulse = forward.multiplyScalar(force);
       
       // Only apply to dynamic bodies (bodyType === 0)
       if (targetBody.bodyType && targetBody.bodyType() === 0) {
         targetBody.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
       }
    }
  }
</script>

<T.Group {position} rotation={actualRotation} {scale}>
  <RigidBody type="fixed">
    <!-- Visible Pad -->
    <T.Mesh position={[0, 0.05, 0]} receiveShadow>
      <T.BoxGeometry args={[1.5, 0.1, 1.5]} />
      <T.MeshStandardMaterial 
        color={triggered ? "#ffffff" : "#00ffff"} 
        emissive={triggered ? "#ffffff" : "#00aaaa"} 
        emissiveIntensity={triggered ? 2 : 0.8} 
      />
    </T.Mesh>
    
    <!-- Chevron/Arrow Indicator pointing +Z -->
    <!-- We rotate Cone so it points along Z instead of Y -->
    <T.Mesh position={[0, 0.1, 0.2]} rotation={[Math.PI/2, 0, 0]}>
       <T.ConeGeometry args={[0.4, 0.8, 3]} />
       <T.MeshBasicMaterial color="#ffffff" />
    </T.Mesh>

    <!-- Sensor (raised slightly above the pad to overlap with ball) -->
    <!-- Ball is radius 0.1 typically, so Y=0.2 center covers it -->
    <Collider 
      shape="cuboid" 
      args={[0.75, 0.5, 0.75]} 
      position={[0, 0.2, 0]} 
      sensor 
      on:sensorenter={handleSensor} 
    />
  </RigidBody>
</T.Group>
