<script>
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { Vector3, Euler, Shape } from "three";

  const chevronShape = new Shape();
  const width = 1.4;
  const height = 0.8;
  const thickness = 0.3;

  chevronShape.moveTo(-width/2, -height/2);
  chevronShape.lineTo(0, height/2 - thickness);
  chevronShape.lineTo(width/2, -height/2);
  chevronShape.lineTo(width/2, -height/2 + thickness);
  chevronShape.lineTo(0, height/2);
  chevronShape.lineTo(-width/2, -height/2 + thickness);
  chevronShape.lineTo(-width/2, -height/2);

  const extrudeSettings = {
    depth: 0.05,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  };

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
    <!-- Back Chevron -->
    <T.Mesh position={[0, 0.05, -0.3]} rotation={[Math.PI/2, 0, 0]} receiveShadow>
      <T.ExtrudeGeometry args={[chevronShape, extrudeSettings]} />
      <T.MeshStandardMaterial 
        color={triggered ? "#ffffff" : "#00ffff"} 
        emissive={triggered ? "#ffffff" : "#00aaaa"} 
        emissiveIntensity={triggered ? 2 : 0.8} 
      />
    </T.Mesh>

    <!-- Front Chevron -->
    <T.Mesh position={[0, 0.05, 0.3]} rotation={[Math.PI/2, 0, 0]} receiveShadow>
      <T.ExtrudeGeometry args={[chevronShape, extrudeSettings]} />
      <T.MeshStandardMaterial 
        color={triggered ? "#ffffff" : "#00ffff"} 
        emissive={triggered ? "#ffffff" : "#00aaaa"} 
        emissiveIntensity={triggered ? 2 : 0.8} 
      />
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
