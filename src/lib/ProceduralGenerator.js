import * as THREE from "three";
import { buildSplineStampTable, evaluateHeightmapAt } from "./heightmapGeometry";

export class ProceduralGenerator {
  /**
   * Generates a random spline track stamped into the heightmap with varied widths,
   * automatic curve banking, elevation contours, and scenery.
   *
   * @param {number} minPoints - Minimum control points
   * @param {number} maxPoints - Maximum control points
   * @param {number} minSpacing - Minimum spacing between points
   * @param {number} maxSpacing - Maximum spacing between points
   * @param {boolean} varyDifficulty - Whether to increase obstacles with length
   * @returns {Object} { controlPoints, blocks, par }
   */
  static generateRandomCourse(
    minPoints = 4,
    maxPoints = 8,
    minSpacing = 5,
    maxSpacing = 11,
    varyDifficulty = true
  ) {
    const controlPoints = [];
    const blocks = [];

    // 1. Generate the Track Path (Spline Walk)
    const numPoints =
      Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints;
    let currentPos = new THREE.Vector3(0, 0, 0);
    let currentAngle = 0; // Forward direction

    controlPoints.push({
      id: crypto.randomUUID(),
      position: [currentPos.x, currentPos.y, currentPos.z],
      width: 2.6,
      bankAngle: 0,
    });

    for (let i = 1; i < numPoints; i++) {
      const distance = minSpacing + Math.random() * (maxSpacing - minSpacing);
      const angleDelta = (Math.random() - 0.5) * (Math.PI * 0.55); // Up to ~50 deg turn
      currentAngle += angleDelta;

      const nextPos = new THREE.Vector3(
        currentPos.x + Math.sin(currentAngle) * distance,
        currentPos.y,
        currentPos.z + Math.cos(currentAngle) * distance
      );

      // Organic elevation changes (45% chance to slope up or down)
      if (Math.random() < 0.45) {
        const heightDelta = (Math.random() - 0.48) * 1.6;
        nextPos.y = Math.max(-2.0, Math.min(4.0, Math.round((nextPos.y + heightDelta) * 2) / 2));
      }

      const isEnd = i === numPoints - 1;
      // Vary fairway width (wider bowls or narrower bridges, while keeping end green generous)
      const width = isEnd
        ? 2.8
        : Number((1.9 + Math.random() * 1.6).toFixed(1));

      // Bank turns inward proportionally to angleDelta (except on the final hole green)
      const bankAngle = isEnd
        ? 0
        : Math.round(Math.max(-22, Math.min(22, (-angleDelta / (Math.PI / 2)) * 24)));

      controlPoints.push({
        id: crypto.randomUUID(),
        position: [nextPos.x, nextPos.y, nextPos.z],
        width,
        bankAngle,
      });

      currentPos.copy(nextPos);
    }

    // Par calculation based on length
    const par = Math.max(2, Math.floor(numPoints / 2));

    // Build heightmap stamp table so obstacles and trees sit accurately on the terrain surface
    const { samples } = buildSplineStampTable(controlPoints);
    const endPoint = controlPoints[controlPoints.length - 1];

    // 2. Tangent-Aligned Obstacle Placement
    const vectors = controlPoints.map((p) => new THREE.Vector3(...p.position));
    const curve = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.5);

    const numObstacles = varyDifficulty ? Math.floor(numPoints / 2) : 2;
    const obstacleTypes = [
      "ramp",
      "bumper",
      "boost",
      "windmill",
      "ice",
      "sand",
      "water",
      "plinko",
    ];

    for (let i = 0; i < numObstacles; i++) {
      const t = 0.15 + Math.random() * 0.7;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const surfaceEval = evaluateHeightmapAt(point.x, point.z, samples, endPoint);

      const yaw = Math.atan2(tangent.x, tangent.z) + Math.PI;
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

      blocks.push({
        id: crypto.randomUUID(),
        type,
        variation: 1,
        position: [point.x, surfaceEval.height, point.z],
        rotation: [0, yaw, 0],
        scale: [1, 1, 1],
        ...(type === "bumper" ? { restitution: 2.0 } : {}),
        ...(type === "boost" ? { boostForce: 15 } : {}),
      });
    }

    // 3. Scenery Generation (seated directly onto the heightmap hills!)
    let minX = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxZ = -Infinity;
    controlPoints.forEach((p) => {
      if (p.position[0] < minX) minX = p.position[0];
      if (p.position[2] < minZ) minZ = p.position[2];
      if (p.position[0] > maxX) maxX = p.position[0];
      if (p.position[2] > maxZ) maxZ = p.position[2];
    });

    const padding = 12;
    minX -= padding;
    minZ -= padding;
    maxX += padding;
    maxZ += padding;

    const sceneryTypes = [
      { type: "tree", maxVars: 2 },
      { type: "rock", maxVars: 2 },
      { type: "grass", maxVars: 2 },
    ];

    const numScenery = numPoints * 4;

    for (let i = 0; i < numScenery; i++) {
      const px = minX + Math.random() * (maxX - minX);
      const pz = minZ + Math.random() * (maxZ - minZ);
      const evalRes = evaluateHeightmapAt(px, pz, samples, endPoint);

      // Place scenery outside the fairway + berm (distNorm > 1.55)
      if (evalRes.distNorm > 1.55) {
        const sType =
          sceneryTypes[Math.floor(Math.random() * sceneryTypes.length)];
        const variation = Math.floor(Math.random() * sType.maxVars) + 1;
        const sRotation = Math.random() * Math.PI * 2;

        blocks.push({
          id: crypto.randomUUID(),
          type: sType.type,
          variation,
          position: [px, evalRes.height, pz],
          rotation: [0, sRotation, 0],
          scale: [1, 1, 1],
        });
      }
    }

    return { controlPoints, blocks, par };
  }
}
