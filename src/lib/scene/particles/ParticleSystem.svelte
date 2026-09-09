<script>
  import { T, useFrame } from "@threlte/core";
  import { Matrix4, Vector3, Quaternion, Color, InstancedMesh, MathUtils } from "three";
  import { createEventDispatcher, onMount } from "svelte";

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
  const tempColor = new Color();

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
          p.scale = 0.1 + Math.random() * 0.1;
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
        }
        
        emitted++;
      }
    }
  }

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
            tempRotation.setFromAxisAngle(new Vector3(1, 1, 1).normalize(), p.life * 5);
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
  args={[undefined, undefined, maxParticles]} 
  frustumCulled={false}
>
  <T.BoxGeometry args={[1, 1, 1]} />
  <T.MeshBasicMaterial toneMapped={false} />
</T.InstancedMesh>
