<script>
  import { useThrelte, useRender } from '@threlte/core';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { Vector2 } from 'three';

  export let enabled = true;

  const { scene, renderer, size, camera } = useThrelte();

  // Setup Composer
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, $camera);
  composer.addPass(renderPass);

  // Resolution, strength, radius, threshold
  const bloomPass = new UnrealBloomPass(
    new Vector2($size?.width || 1, $size?.height || 1),
    1.5, // strength
    0.4, // radius
    0.85 // threshold - only bloom bright objects
  );
  composer.addPass(bloomPass);

  // Handle resizing
  $: composer.setSize($size.width, $size.height);
  $: {
      renderPass.camera = $camera;
      renderPass.scene = scene;
  }

  useRender((_, delta) => {
    if (enabled) {
      composer.render(delta);
    } else {
      renderer.render(scene, $camera);
    }
  });
</script>
