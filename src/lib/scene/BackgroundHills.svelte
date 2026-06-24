<script>
  import { T } from "@threlte/core";
  import { MeshToonMaterial, PlaneGeometry, Vector3 } from "three";
  import { createNoise2D } from "simplex-noise";

  export let controlPoints = [];

  const geometry = new PlaneGeometry(250, 250, 64, 64);
  geometry.rotateX(-Math.PI / 2); // Lay flat

  const noise2D = createNoise2D();

  // We want to regenerate the hills if the track changes significantly, 
  // but to avoid massive lag, we'll only do it when controlPoints array changes.
  $: {
    if (controlPoints && geometry) {
      const positions = geometry.attributes.position;
      const vertex = new Vector3();

      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);

        // Calculate natural rolling hills (gentle frequency and amplitude)
        let height = noise2D(vertex.x * 0.03, vertex.z * 0.03) * 3.5;
        // Add some macro detail
        height += noise2D(vertex.x * 0.01, vertex.z * 0.01) * 6.0;
        
        // Ensure minimum height isn't too deep
        height = Math.max(-1, height);

        // Track clearance logic
        let minDistanceSq = Infinity;
        for (let j = 0; j < controlPoints.length; j++) {
          const cp = controlPoints[j].position;
          // Ignore Y for distance
          const dx = vertex.x - cp[0];
          const dz = vertex.z - cp[2];
          const distSq = dx * dx + dz * dz;
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
          }
        }

        const minDistance = Math.sqrt(minDistanceSq);
        
        // Flatten the hills if they are too close to the track
        // Full flatten at distance 6, start blending at distance 12
        const flattenRadius = 6;
        const blendRadius = 16;
        
        if (minDistance < flattenRadius) {
          height = 0;
        } else if (minDistance < blendRadius) {
          const t = (minDistance - flattenRadius) / (blendRadius - flattenRadius);
          // Smoothstep function for blending
          const smooth = t * t * (3 - 2 * t);
          height *= smooth;
        }

        positions.setY(i, height);
      }

      geometry.computeVertexNormals();
      positions.needsUpdate = true;
    }
  }

  // Darker toon green for the background hills
  const hillsMaterial = new MeshToonMaterial({ color: "#4d7c0f" }); 
</script>

<!-- The hills sit slightly below 0 so they don't z-fight with the floor or track -->
<T.Mesh 
  {geometry} 
  material={hillsMaterial} 
  position={[0, -0.2, 0]} 
  receiveShadow 
/>
