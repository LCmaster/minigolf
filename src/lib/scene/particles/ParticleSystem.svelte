<script context="module">
  import { BoxGeometry, MeshBasicMaterial } from "three";

  const sharedBoxGeo = new BoxGeometry(1, 1, 1);
  const sharedParticleMat = new MeshBasicMaterial({
    toneMapped: false,
    transparent: true,
    opacity: 0.75,
  });
</script>

<script>
  import { T, useFrame } from "@threlte/core";
  import { Matrix4, Vector3, Quaternion, Color } from "three";

  export let maxParticles = 200;

  let instancedMesh;
  
  // Particle state
  const particles = Array.from({ length: maxParticles }).map(() => ({
    active: false,
    position: new Vector3(),
    velocity: new Vector3(),
    life: 0,
    maxLife: 1,
    scale: 1,
    color: new Color(),
    gravity: 9.8,
    drag: 0.95
  }));

  // Reusable objects to avoid allocation in loop
  const tempMatrix = new Matrix4();
  const tempPosition = new Vector3();
  const tempRotation = new Quaternion();
  const tempScale = new Vector3();
  const spinAxis = new Vector3(1, 1, 1).normalize();

  // Public API to trigger particles
  export function emit(pos, type = "spark", count = 10, intensity = 1.0) {
    if (!instancedMesh) return;

    let emitted = 0;
    for (let i = 0; i < maxParticles; i++) {
      if (emitted >= count) break;
      const p = particles[i];
      if (!p.active) {
        p.active = true;
        p.position.copy(pos);
        
        if (type === "spark") {
          // Sparks shoot outward and upward slightly
          p.velocity.set(
            (Math.random() - 0.5) * 5 * intensity,
            Math.random() * 3 * intensity,
            (Math.random() - 0.5) * 5 * intensity
          );
          p.life = 0;
          p.maxLife = 0.3 + Math.random() * 0.3; // Short life
          p.scale = 0.05 + Math.random() * 0.05;
          p.color.setHex(Math.random() > 0.5 ? 0xffcc00 : 0xff5500); // Yellow/Orange
          p.gravity = 5;
          p.drag = 0.9;
        } else if (type === "confetti") {
          // Confetti explodes upward and drifts
          p.velocity.set(
            (Math.random() - 0.5) * 10,
            5 + Math.random() * 10,
            (Math.random() - 0.5) * 10
          );
          p.life = 0;
          p.maxLife = 2.0 + Math.random() * 2.0; // Long life
          p.scale = 0.15 + Math.random() * 0.15;
          const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
          p.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
          p.gravity = 2.0; // Floaty
          p.drag = 0.98;
        } else if (type === "splash") {
          p.velocity.set(
            (Math.random() - 0.5) * 3,
            2 + Math.random() * 4,
            (Math.random() - 0.5) * 3
          );
          p.life = 0;
          p.maxLife = 0.4 + Math.random() * 0.3;
          p.scale = 0.1 + Math.random() * 0.1;
          p.color.setHex(Math.random() > 0.5 ? 0xffffff : 0x3b82f6); // White/Blue
          p.gravity = 8.0;
          p.drag = 0.95;
        } else if (type === "dust") {
          p.velocity.set(
            (Math.random() - 0.5) * 2,
            Math.random() * 1.5,
            (Math.random() - 0.5) * 2
          );
          p.life = 0;
          p.maxLife = 0.5 + Math.random() * 0.5;
          p.scale = 0.15 + Math.random() * 0.1;
          p.color.setHex(0xd4d4d8); // Light gray/sand
          p.gravity = -0.5; // Floats up slightly
          p.drag = 0.85;
        } else if (type === "sparkle") {
          p.velocity.set(
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5
          );
          p.life = 0;
          p.maxLife = 0.2 + Math.random() * 0.2;
          p.scale = 0.05 + Math.random() * 0.05;
          p.color.setHex(Math.random() > 0.5 ? 0xffffff : 0xa5f3fc); // White/Cyan
          p.gravity = 0;
          p.drag = 0.9;
        }
        
        emitted++;
      }
    }
  }

  const zeroMatrix = new Matrix4().makeScale(0, 0, 0);

  useFrame((_, delta) => {
    if (!instancedMesh) return;
    
    let needsUpdate = false;
    for (let i = 0; i < maxParticles; i++) {
      const p = particles[i];
      if (p.active) {
        needsUpdate = true;
        p.life += delta;
        
        if (p.life >= p.maxLife) {
          p.active = false;
          // Hide it
          tempMatrix.makeScale(0, 0, 0);
          instancedMesh.setMatrixAt(i, tempMatrix);
          continue;
        }

        // Physics integration
        p.velocity.y -= p.gravity * delta;
        p.velocity.multiplyScalar(Math.pow(p.drag, delta * 60)); // Framerate independent drag
        
        p.position.addScaledVector(p.velocity, delta);
        
        // Visuals
        const lifeRatio = p.life / p.maxLife;
        let currentScale = p.scale;
        
        // Fade out scale at the end
        if (lifeRatio > 0.8) {
          currentScale *= (1.0 - (lifeRatio - 0.8) * 5);
        }

        tempPosition.copy(p.position);
        
        // Spin confetti
        if (p.gravity === 2.0) {
          tempRotation.setFromAxisAngle(spinAxis, p.life * 5);
        } else {
          tempRotation.set(0, 0, 0, 1);
        }
        
        tempScale.set(currentScale, currentScale, currentScale);
        
        tempMatrix.compose(tempPosition, tempRotation, tempScale);
        instancedMesh.setMatrixAt(i, tempMatrix);
        instancedMesh.setColorAt(i, p.color);
      }
    }

    if (needsUpdate) {
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
    }
  });
</script>

<T.InstancedMesh 
  bind:ref={instancedMesh}
  on:create={({ ref }) => {
    // Hide all instances immediately on creation — before the first render frame.
    // Using on:create (not onMount) because bind:ref resolves asynchronously in Threlte.
    for (let i = 0; i < maxParticles; i++) {
      ref.setMatrixAt(i, zeroMatrix);
    }
    ref.instanceMatrix.needsUpdate = true;
  }}
  args={[sharedBoxGeo, sharedParticleMat, maxParticles]} 
  frustumCulled={false}
/>
