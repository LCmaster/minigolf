import {
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  BufferAttribute,
} from "three";
import { createNoise2D } from "simplex-noise";
import { expandControlPoints } from "$lib/trackGeometry";

// Deterministic PRNG (Mulberry32) so terrain hills are stable across rebuilds
function createSeededRandom(seed = 1337) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noise2D = createNoise2D(createSeededRandom(42));

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Builds a densely sampled spine table from controlPoints using a CatmullRomCurve3,
 * smoothly interpolating position (including Y elevation), fairway half-width, and bankAngle.
 *
 * @param {Array<{ position: number[], width?: number, bankAngle?: number, shape?: string }>} controlPoints
 * @returns {{ samples: Array<{ p: Vector3, T: Vector3, R: Vector3, width: number, bankRad: number, s: number }>, totalLength: number }}
 */
export function buildSplineStampTable(controlPoints) {
  if (!controlPoints || controlPoints.length < 2) {
    return { samples: [], totalLength: 0 };
  }

  const pts = controlPoints.map((cp) => new Vector3(...cp.position));
  const expanded = expandControlPoints(pts, controlPoints);
  if (expanded.length < 2) {
    return { samples: [], totalLength: 0 };
  }

  const samples = [];
  let accDist = 0;

  for (let seg = 0; seg < expanded.length - 1; seg++) {
    const a = expanded[seg];
    const b = expanded[seg + 1];
    const segVec = new Vector3().subVectors(b.pos, a.pos);
    const segLen = segVec.length();
    const T = segLen > 0.0001 ? segVec.clone().divideScalar(segLen) : new Vector3(0, 0, 1);

    const R = new Vector3(T.z, 0, -T.x);
    if (R.lengthSq() < 0.0001) {
      R.set(1, 0, 0);
    } else {
      R.normalize();
    }

    const steps = Math.max(2, Math.ceil(segLen / 0.5));
    const endStep = seg === expanded.length - 2 ? steps : steps - 1;

    for (let s = 0; s <= endStep; s++) {
      const t = s / steps;
      const p = new Vector3().lerpVectors(a.pos, b.pos, t);
      if (samples.length > 0) {
        accDist += p.distanceTo(samples[samples.length - 1].p);
      }

      const width = a.width + (b.width - a.width) * t;
      const bankDeg = a.bankAngle + (b.bankAngle - a.bankAngle) * t;
      const bankRad = (bankDeg * Math.PI) / 180;

      samples.push({
        p,
        T,
        R,
        width: Math.max(1.0, width),
        bankRad,
        s: accDist,
      });
    }
  }

  return { samples, totalLength: accDist };
}

/**
 * Evaluates the sculpted terrain height and surface weights at any world (x, z) coordinate.
 * The terrain forms a supportive earth roadbed directly underneath the Course Track
 * (`fairwayElev - 0.06` so the wooden/tiled track sits cleanly on top without z-fighting)
 * and blends into natural rolling hills around the course.
 *
 * @param {number} x
 * @param {number} z
 * @param {Array} samples - Spine samples from buildSplineStampTable
 * @returns {{ height: number, fairway: number, berm: number, cup: number, distNorm: number }}
 */
export function evaluateHeightmapAt(x, z, samples) {
  // Base procedural hill height
  let hillHeight =
    noise2D(x * 0.028, z * 0.028) * 3.0 + noise2D(x * 0.01, z * 0.01) * 5.0;
  hillHeight = Math.max(-1.5, hillHeight);

  // Normalize samples argument if someone passed the object `{ samples }`
  const sampleList = Array.isArray(samples) ? samples : samples?.samples;

  if (!sampleList || sampleList.length === 0) {
    return { height: hillHeight, fairway: 0, berm: 0, cup: 0, distNorm: Infinity };
  }

  // Find closest spine sample in XZ
  let bestIdx = 0;
  let minDistSq = Infinity;
  for (let i = 0; i < sampleList.length; i++) {
    const sp = sampleList[i].p;
    const dx = x - sp.x;
    const dz = z - sp.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      bestIdx = i;
    }
  }

  const closest = sampleList[bestIdx];
  const dx = x - closest.p.x;
  const dz = z - closest.p.z;
  const distXZ = Math.sqrt(minDistSq);

  // Signed lateral offset along the local Right vector (matches trackGeometry banking direction)
  const lateralOffset = -(dx * closest.R.x + dz * closest.R.z);

  // Track outer half-width including wooden wall (width + 0.5m wall)
  const outerHalfWidth = closest.width + 0.55;
  const distNorm = distXZ / outerHalfWidth;

  // Banked elevation offset across the track width
  const clampedLateral = Math.max(
    -outerHalfWidth * 1.25,
    Math.min(outerHalfWidth * 1.25, lateralOffset)
  );
  const bankOffset = clampedLateral * Math.tan(closest.bankRad);

  // Sit 0.06m below the bottom of the course track base so the track sits cleanly ON TOP of the terrain
  const roadbedElev = closest.p.y + bankOffset - 0.06;

  // Subtle earth shoulder just outside the wooden track walls (1.0 <= distNorm <= 1.5)
  let bermWeight = 0;
  if (distNorm > 0.95 && distNorm < 1.65) {
    const bNorm = (distNorm - 1.25) / 0.35;
    bermWeight = Math.max(0, 1 - bNorm * bNorm);
    bermWeight = bermWeight * bermWeight;
  }

  const fairwayWeight = 1.0 - smoothstep(0.95, 1.3, distNorm);

  // Blend from the supportive roadbed under the track into the surrounding Simplex hills
  const hillBlend = smoothstep(1.2, 4.2, distNorm);
  const finalHeight = roadbedElev * (1.0 - hillBlend) + hillHeight * hillBlend;

  return {
    height: finalHeight,
    fairway: fairwayWeight,
    berm: bermWeight,
    cup: 0,
    distNorm,
  };
}

/**
 * Generates the visual and physics terrain BufferGeometries that support the Course Track.
 *
 * @param {Array} controlPoints
 * @returns {{ visualGeo: BufferGeometry, colliderGeo: BufferGeometry, minY: number }}
 */
export function generateCourseHeightmap(controlPoints) {
  if (!controlPoints || controlPoints.length < 2) {
    return {
      visualGeo: new BufferGeometry(),
      colliderGeo: new BufferGeometry(),
      minY: -1,
    };
  }

  const { samples } = buildSplineStampTable(controlPoints);

  // Compute bounding box of controlPoints with generous minimum world bounds so there is always plenty of terrain to click
  let minX = -35,
    maxX = 35,
    minZ = -45,
    maxZ = 35,
    minY = 0;
  for (let i = 0; i < controlPoints.length; i++) {
    const [x, y, z] = controlPoints[i].position;
    const w = controlPoints[i].width ?? 2.5;
    if (x - w < minX) minX = x - w;
    if (x + w > maxX) maxX = x + w;
    if (z - w < minZ) minZ = z - w;
    if (z + w > maxZ) maxZ = z + w;
    if (y < minY) minY = y;
  }

  const padding = 38;
  minX -= padding;
  maxX += padding;
  minZ -= padding;
  maxZ += padding;

  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;

  const targetStep = 0.85;
  const cols = Math.min(160, Math.max(64, Math.ceil(spanX / targetStep)));
  const rows = Math.min(160, Math.max(64, Math.ceil(spanZ / targetStep)));

  const numVerts = (cols + 1) * (rows + 1);
  const positions = new Float32Array(numVerts * 3);
  const uvs = new Float32Array(numVerts * 2);
  const surfaceAttr = new Float32Array(numVerts * 3);
  const distNormGrid = new Float32Array(numVerts);

  const stepX = spanX / cols;
  const stepZ = spanZ / rows;

  let vIdx = 0;
  for (let r = 0; r <= rows; r++) {
    const z = minZ + r * stepZ;
    for (let c = 0; c <= cols; c++) {
      const x = minX + c * stepX;
      const evalRes = evaluateHeightmapAt(x, z, samples);

      positions[vIdx * 3] = x;
      positions[vIdx * 3 + 1] = evalRes.height;
      positions[vIdx * 3 + 2] = z;

      uvs[vIdx * 2] = x * 0.2;
      uvs[vIdx * 2 + 1] = z * 0.2;

      surfaceAttr[vIdx * 3] = evalRes.fairway;
      surfaceAttr[vIdx * 3 + 1] = evalRes.berm;
      surfaceAttr[vIdx * 3 + 2] = evalRes.cup;

      distNormGrid[vIdx] = evalRes.distNorm;
      if (evalRes.height < minY) minY = evalRes.height;

      vIdx++;
    }
  }

  const numQuads = cols * rows;
  const visualIndices = new Uint32Array(numQuads * 6);

  let iIdx = 0;
  const stride = cols + 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i00 = r * stride + c;
      const i10 = i00 + 1;
      const i01 = (r + 1) * stride + c;
      const i11 = i01 + 1;

      visualIndices[iIdx++] = i00;
      visualIndices[iIdx++] = i01;
      visualIndices[iIdx++] = i10;

      visualIndices[iIdx++] = i10;
      visualIndices[iIdx++] = i01;
      visualIndices[iIdx++] = i11;
    }
  }

  const visualGeo = new BufferGeometry();
  visualGeo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  visualGeo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  visualGeo.setAttribute("aSurface", new Float32BufferAttribute(surfaceAttr, 3));
  visualGeo.setIndex(new BufferAttribute(visualIndices, 1));
  visualGeo.computeVertexNormals();

  return {
    visualGeo,
    colliderGeo: visualGeo,
    minY,
  };
}
