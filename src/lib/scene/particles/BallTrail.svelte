<script>
  import { T, useFrame } from "@threlte/core";
  import { Matrix4, Vector3, Quaternion, Color, InstancedMesh } from "three";

  export let position = [0, 0, 0];
  export let maxTrailLength = 50;
  export let speedThreshold = 2.0;
  export let currentSpeed = 0;

  let instancedMesh;
  
  const trailSegments = Array.from({ length: maxTrailLength }).map(() => ({
    active: false,
    position: new Vector3(),
    life: 0,
    maxLife: 0.5,
  }));

  const tempMatrix = new Matrix4();
  const tempPosition = new Vector3();
  const tempRotation = new Quaternion();
  const tempScale = new Vector3();
  const color = new Color(0xffffff); // White/Blue glow

  let emitTimer = 0;
  const emitRate = 0.02; // emit every 20ms when fast

  useFrame((_, delta) => {
    if (!instancedMesh) return;

    let needsUpdate = false;

    // Emit new trail segments if moving fast enough
    if (currentSpeed > speedThreshold) {
      emitTimer += delta;
      if (emitTimer >= emitRate) {
        emitTimer = 0;
        // Find oldest or inactive segment
        let oldestIdx = 0;
        let maxLifeFound = -1;
        for (let i = 0; i < maxTrailLength; i++) {
          if (!trailSegments[i].active) {
            oldestIdx = i;
            break;
          }
          if (trailSegments[i].life > maxLifeFound) {
            maxLifeFound = trailSegments[i].life;
            oldestIdx = i;
          }
        }
        
        const seg = trailSegments[oldestIdx];
        seg.active = true;
        // Offset slightly down so it looks like it's on the ground or center of ball
        seg.position.set(position[0], position[1] - 0.2, position[2]);
        seg.life = 0;
        needsUpdate = true;
      }
    }

    // Update all segments
    for (let i = 0; i < maxTrailLength; i++) {
      const seg = trailSegments[i];
      if (seg.active) {
        needsUpdate = true;
        seg.life += delta;
        
        if (seg.life >= seg.maxLife) {
          seg.active = false;
          tempMatrix.makeScale(0, 0, 0);
          instancedMesh.setMatrixAt(i, tempMatrix);
          continue;
        }

        // Scale shrinks as life increases
        const lifeRatio = seg.life / seg.maxLife;
        const currentScale = 0.4 * (1.0 - lifeRatio);

        tempPosition.copy(seg.position);
        tempRotation.set(0, 0, 0, 1);
        tempScale.set(currentScale, currentScale, currentScale);
        
        tempMatrix.compose(tempPosition, tempRotation, tempScale);
        instancedMesh.setMatrixAt(i, tempMatrix);
        
        // Optionally fade color to transparent, but InstancedMesh needs material with opacity support.
        // We'll just shrink it to 0.
      }
    }

    if (needsUpdate) {
      instancedMesh.instanceMatrix.needsUpdate = true;
    }
  });
</script>

<!-- Add toneMapped={false} so bloom can pick it up if it's bright enough -->
<T.InstancedMesh 
  bind:ref={instancedMesh} 
  args={[undefined, undefined, maxTrailLength]} 
  frustumCulled={false}
>
  <T.SphereGeometry args={[1, 8, 8]} />
  <T.MeshBasicMaterial color="#a855f7" toneMapped={false} transparent opacity={0.6} />
</T.InstancedMesh>
