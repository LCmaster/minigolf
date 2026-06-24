import * as THREE from "three";

export class ProceduralGenerator {
  /**
   * Generates a random spline track and scenery.
   * @param {number} minPoints - Minimum control points
   * @param {number} maxPoints - Maximum control points
   * @param {number} minSpacing - Minimum spacing between points
   * @param {number} maxSpacing - Maximum spacing between points
   * @param {boolean} varyDifficulty - Whether to increase obstacles with length
   * @returns {Object} { controlPoints, blocks, par }
   */
  static generateRandomCourse(minPoints = 3, maxPoints = 8, minSpacing = 3, maxSpacing = 10, varyDifficulty = true) {
    const controlPoints = [];
    const blocks = [];

    // 1. Generate the Track Path (Spline Walk)
    const numPoints = Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints;
    let currentPos = new THREE.Vector3(0, 0, 0);
    let currentAngle = 0; // Forward direction

    controlPoints.push({
      id: crypto.randomUUID(),
      position: [currentPos.x, currentPos.y, currentPos.z],
    });

    for (let i = 1; i < numPoints; i++) {
      // Pick distance and angle delta
      const distance = minSpacing + Math.random() * (maxSpacing - minSpacing);
      const angleDelta = (Math.random() - 0.5) * (Math.PI / 2); // Max +/- 45 degrees
      currentAngle += angleDelta;

      const nextPos = new THREE.Vector3(
        currentPos.x + Math.sin(currentAngle) * distance,
        currentPos.y,
        currentPos.z + Math.cos(currentAngle) * distance
      );

      // Simple elevation changes (20% chance to go up or down by 0.5 to 1.5 units)
      if (Math.random() < 0.2) {
        const heightDelta = 0.5 + Math.random() * 1.0;
        nextPos.y += Math.random() > 0.5 ? heightDelta : -heightDelta;
        if (nextPos.y < 0) nextPos.y = 0; // Prevent going underground
      }

      controlPoints.push({
        id: crypto.randomUUID(),
        position: [nextPos.x, nextPos.y, nextPos.z],
      });

      currentPos.copy(nextPos);
    }

    // Par calculation based on length
    const par = Math.max(2, Math.floor(numPoints / 2));

    // 2. Tangent-Aligned Obstacle Placement
    // We create a temporary CatmullRomCurve3 to sample points along the track
    const vectors = controlPoints.map((p) => new THREE.Vector3(...p.position));
    const curve = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.5);
    
    // We avoid placing obstacles at the very start (t < 0.1) and end (t > 0.9)
    const numObstacles = varyDifficulty ? Math.floor(numPoints / 2) : 2;
    const obstacleTypes = ["ramp", "bumper", "boost", "loop", "windmill", "ice", "sand", "water", "plinko"];

    for (let i = 0; i < numObstacles; i++) {
      const t = 0.1 + Math.random() * 0.8;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);

      // Calculate yaw from tangent
      const yaw = Math.atan2(tangent.x, tangent.z);
      // Normalize rotation for minigolf schema (0 to 2 where 1 = 180 degrees)
      let rotation = yaw / -Math.PI;
      if (rotation < 0) rotation += 2;

      blocks.push({
        id: crypto.randomUUID(),
        type: obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)],
        variation: 1, // Default variation
        position: [point.x, point.y, point.z],
        rotation: [0, rotation, 0],
        scale: [1, 1, 1],
      });
    }

    // 3. Poisson Disk Style Scenery Generation
    // Define bounding box of the track
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    controlPoints.forEach(p => {
      if (p.position[0] < minX) minX = p.position[0];
      if (p.position[2] < minZ) minZ = p.position[2];
      if (p.position[0] > maxX) maxX = p.position[0];
      if (p.position[2] > maxZ) maxZ = p.position[2];
    });

    // Expand bounding box for scenery
    const padding = 5;
    minX -= padding;
    minZ -= padding;
    maxX += padding;
    maxZ += padding;

    const sceneryTypes = [
      { type: "tree", maxVars: 2 },
      { type: "rock", maxVars: 2 },
      { type: "grass", maxVars: 2 }
    ];

    const numScenery = numPoints * 3; // Number of scenery items scales with track length

    for (let i = 0; i < numScenery; i++) {
      const px = minX + Math.random() * (maxX - minX);
      const pz = minZ + Math.random() * (maxZ - minZ);
      const pos = new THREE.Vector3(px, 0, pz);

      // Check distance to the curve. If it's too close (< 2.0 units), skip to keep the fairway clear.
      let closestDistSq = Infinity;
      // Fast rough check against control points first, then fine check if needed
      for (let j = 0; j < controlPoints.length; j++) {
        const cp = new THREE.Vector3(...controlPoints[j].position);
        cp.y = 0; // Ignore height for clearance
        const distSq = pos.distanceToSquared(cp);
        if (distSq < closestDistSq) closestDistSq = distSq;
      }

      // We actually want clearance from the continuous curve, but checking distance to control points 
      // + a small margin is a fast approximation. To be safer, we require distance > 3.0
      if (closestDistSq > 9.0) {
        const sType = sceneryTypes[Math.floor(Math.random() * sceneryTypes.length)];
        const variation = Math.floor(Math.random() * sType.maxVars) + 1;
        const sRotation = Math.random() * 2; // Random rotation

        blocks.push({
          id: crypto.randomUUID(),
          type: sType.type,
          variation: variation,
          position: [px, 0, pz], // Scenery rests at y=0, could map to a heightmap later
          rotation: [0, sRotation, 0],
          scale: [1, 1, 1],
        });
      }
    }

    return { controlPoints, blocks, par };
  }
}
