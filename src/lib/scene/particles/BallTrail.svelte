<script context="module">
  import { SphereGeometry, MeshBasicMaterial } from "three";

  const sharedSphereGeo = new SphereGeometry(1, 6, 6);
  const sharedTrailMat = new MeshBasicMaterial({
    color: "#ffffff",
    toneMapped: false,
    transparent: true,
    opacity: 0.6,
  });
</script>

<script>
  import { T, useFrame } from "@threlte/core";
  import { Matrix4, Vector3, Quaternion, Color } from "three";

  export let position = [0, 0, 0];
  export let maxTrailLength = 50;
  export let speedThreshold = 1.0;
  export let currentSpeed = 0;
  export let mode = "sparkle"; // "sparkle" | "rainbow"

  let instancedMesh;
  
  const trailSegments = Array.from({ length: maxTrailLength }).map(() => ({
    active: false,
    position: new Vector3(),
    color: new Color(0xffffff),
    life: 0,
    maxLife: 0.45,
  }));

  const tempMatrix = new Matrix4();
  const tempPosition = new Vector3();
  const tempRotation = new Quaternion();
  const tempScale = new Vector3();

  let emitTimer = 0;
  let hueCounter = 0;
  const emitRate = 0.02; // emit every 20ms when fast

  const zeroMatrix = new Matrix4().makeScale(0, 0, 0);

  useFrame((_, delta) => {
    if (!instancedMesh) return;

    let needsUpdate = false;
    let colorNeedsUpdate = false;

    // Emit new trail segments if moving fast enough
    if (currentSpeed > speedThreshold && mode && mode !== "none") {
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
        seg.position.set(position[0], position[1], position[2]);
        seg.life = 0;

        if (mode === "rainbow") {
          hueCounter = (hueCounter + 0.05) % 1.0;
          seg.color.setHSL(hueCounter, 1.0, 0.55);
        } else {
          // sparkle
          seg.color.setHex(Math.random() > 0.5 ? 0xffffff : 0xa5f3fc);
        }
        instancedMesh.setColorAt(oldestIdx, seg.color);
        colorNeedsUpdate = true;
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
        const currentScale = 0.09 * (1.0 - lifeRatio);

        tempPosition.copy(seg.position);
        tempRotation.set(0, 0, 0, 1);
        tempScale.set(currentScale, currentScale, currentScale);
        
        tempMatrix.compose(tempPosition, tempRotation, tempScale);
        instancedMesh.setMatrixAt(i, tempMatrix);
      }
    }

    if (needsUpdate) {
      instancedMesh.instanceMatrix.needsUpdate = true;
    }
    if (colorNeedsUpdate && instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
  });
</script>

<T.InstancedMesh 
  bind:ref={instancedMesh}
  on:create={({ ref }) => {
    for (let i = 0; i < maxTrailLength; i++) {
      ref.setMatrixAt(i, zeroMatrix);
      ref.setColorAt(i, trailSegments[i].color);
    }
    ref.instanceMatrix.needsUpdate = true;
    if (ref.instanceColor) ref.instanceColor.needsUpdate = true;
  }}
  args={[sharedSphereGeo, sharedTrailMat, maxTrailLength]} 
  frustumCulled={false}
/>
