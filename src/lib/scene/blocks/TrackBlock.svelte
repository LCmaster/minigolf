<script>
  import { T } from "@threlte/core";
  import { Shape, ExtrudeGeometry, Vector3, Quaternion, Matrix4 } from "three";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { onDestroy } from "svelte";
  import WoodMaterial from "$lib/scene/materials/WoodMaterial.svelte";
  import TileMaterial from "$lib/scene/materials/TileMaterial.svelte";

  export let type = "start"; // 'start' or 'end'
  export let shape = "rounded"; // 'square' or 'rounded'
  export let position = [0, 0, 0];
  export let tangent = new Vector3(0, 0, 1); // direction the track is heading
  export let width = 2.5; // half inner width
  export let bankAngle = 0; // degrees
  export let isEditor = false;

  export let groundFriction = 0.5;
  export let groundRestitution = 0.05;
  export let wallFriction = 0.5;
  export let wallRestitution = 0.5;
  export let tileColor = "#567D46";

  const t = 0.5; // wall thickness
  const h = 0.5; // wall height (from top surface downward)
  const floorDepth = 0.1;

  let baseGeo, tileGeo, wallGeo;
  let previousGeos = null;
  let meshes = [];

  $: rotationQuaternion = (() => {
    const targetDir = tangent.clone().normalize();
    const up = new Vector3(0, 1, 0);
    const xAxis = new Vector3().crossVectors(up, targetDir);

    if (xAxis.lengthSq() < 0.0001) {
      xAxis.set(1, 0, 0);
    } else {
      xAxis.normalize();
    }

    const yAxis = new Vector3().crossVectors(targetDir, xAxis).normalize();

    // Apply banking roll around targetDir if bankAngle !== 0
    const bankRad = ((bankAngle || 0) * Math.PI) / 180;
    if (Math.abs(bankRad) > 0.0001) {
      const cosB = Math.cos(bankRad);
      const sinB = Math.sin(bankRad);
      // Note: xAxis is -R in computeMiterPathData
      const bankedX = xAxis.clone().multiplyScalar(cosB).addScaledVector(yAxis, -sinB);
      const bankedY = yAxis.clone().multiplyScalar(cosB).addScaledVector(xAxis, sinB);
      xAxis.copy(bankedX).normalize();
      yAxis.copy(bankedY).normalize();
    }

    const m = new Matrix4().makeBasis(xAxis, yAxis, targetDir);
    return new Quaternion().setFromRotationMatrix(m);
  })();

  function buildGeometries(currentShape, currentType, wVal, currentTileColor) {
    disposeGeometries();

    const w = wVal || 2.5;
    const R_base = w + t;
    const R_tile = w;
    const blockLength = w + 0.2;

    const baseShapeLocal = new Shape();
    const tileShapeLocal = new Shape();
    const wallShapeLocal = new Shape();

    const zMult = currentType === "start" ? -1 : 1;
    const angleStart = currentType === "start" ? 0 : Math.PI;

    if (currentShape === "rounded") {
      baseShapeLocal.moveTo(-R_base * zMult, 0);
      baseShapeLocal.absarc(0, 0, R_base, angleStart, angleStart + Math.PI, false);
      baseShapeLocal.lineTo(-R_base * zMult, 0);

      tileShapeLocal.moveTo(-R_tile * zMult, 0);
      tileShapeLocal.absarc(0, 0, R_tile, angleStart, angleStart + Math.PI, false);
      tileShapeLocal.lineTo(-R_tile * zMult, 0);

      wallShapeLocal.moveTo(-R_base * zMult, 0);
      wallShapeLocal.absarc(0, 0, R_base, angleStart, angleStart + Math.PI, false);
      wallShapeLocal.lineTo(R_tile * zMult, 0);
      wallShapeLocal.absarc(0, 0, R_tile, angleStart + Math.PI, angleStart, true);
      wallShapeLocal.lineTo(-R_base * zMult, 0);
    } else {
      baseShapeLocal.moveTo(-R_base * zMult, 0);
      baseShapeLocal.lineTo(-R_base * zMult, -blockLength * zMult);
      baseShapeLocal.lineTo(R_base * zMult, -blockLength * zMult);
      baseShapeLocal.lineTo(R_base * zMult, 0);
      baseShapeLocal.lineTo(-R_base * zMult, 0);

      tileShapeLocal.moveTo(-R_tile * zMult, 0);
      tileShapeLocal.lineTo(-R_tile * zMult, (-blockLength + t) * zMult);
      tileShapeLocal.lineTo(R_tile * zMult, (-blockLength + t) * zMult);
      tileShapeLocal.lineTo(R_tile * zMult, 0);
      tileShapeLocal.lineTo(-R_tile * zMult, 0);

      wallShapeLocal.moveTo(-R_base * zMult, 0);
      wallShapeLocal.lineTo(-R_base * zMult, -blockLength * zMult);
      wallShapeLocal.lineTo(R_base * zMult, -blockLength * zMult);
      wallShapeLocal.lineTo(R_base * zMult, 0);
      wallShapeLocal.lineTo(R_tile * zMult, 0);
      wallShapeLocal.lineTo(R_tile * zMult, (-blockLength + t) * zMult);
      wallShapeLocal.lineTo(-R_tile * zMult, (-blockLength + t) * zMult);
      wallShapeLocal.lineTo(-R_tile * zMult, 0);
      wallShapeLocal.lineTo(-R_base * zMult, 0);
    }

    baseGeo = new ExtrudeGeometry(baseShapeLocal, {
      depth: floorDepth,
      steps: 1,
      bevelEnabled: false,
    });
    baseGeo.rotateX(-Math.PI / 2);

    tileGeo = new ExtrudeGeometry(tileShapeLocal, {
      depth: 0.02,
      steps: 1,
      bevelEnabled: false,
    });
    tileGeo.rotateX(-Math.PI / 2);
    tileGeo.translate(0, floorDepth, 0);

    wallGeo = new ExtrudeGeometry(wallShapeLocal, {
      depth: h - floorDepth,
      steps: 1,
      bevelEnabled: false,
    });
    wallGeo.rotateX(-Math.PI / 2);
    wallGeo.translate(0, floorDepth, 0);

    previousGeos = [baseGeo, tileGeo, wallGeo].filter(Boolean);
    meshes = [
      { geo: baseGeo, color: "#888888", meshType: "base" },
      { geo: tileGeo, color: currentTileColor, meshType: "tile" },
      { geo: wallGeo, color: "#8B5A2B", meshType: "wall" },
    ];
  }

  function disposeGeometries() {
    if (previousGeos) {
      previousGeos.forEach((g) => g?.dispose());
      previousGeos = null;
    }
  }

  onDestroy(() => disposeGeometries());

  $: if (shape && type) {
    buildGeometries(shape, type, width, tileColor);
  }

  $: colliders = (() => {
    const floorSegments = [];
    const wallSegments = [];
    if (!shape || !type) return { floor: floorSegments, wall: wallSegments };

    const w = width || 2.5;
    const R_base = w + t;
    const R_tile = w;
    const blockLength = w + 0.2;
    const y0_base = 0;
    const y1_base = floorDepth;
    const y0_tile = floorDepth;
    const y1_tile = floorDepth + 0.02;
    const y0_wall = floorDepth;
    const y1_wall = h;

    const addBox = (target, x0, x1, z0, z1, y0, y1) => {
      target.push(new Float32Array([
        x0, y0, z0,  x1, y0, z0,  x0, y1, z0,  x1, y1, z0,
        x0, y0, z1,  x1, y0, z1,  x0, y1, z1,  x1, y1, z1,
      ]));
    };

    const addQuad = (target, p1, p2, p3, p4, y0, y1) => {
      target.push(new Float32Array([
        p1.x, y0, p1.z,  p2.x, y0, p2.z,  p3.x, y0, p3.z,  p4.x, y0, p4.z,
        p1.x, y1, p1.z,  p2.x, y1, p2.z,  p3.x, y1, p3.z,  p4.x, y1, p4.z,
      ]));
    };

    const getPoint = (r, angle) => ({
      x: r * Math.cos(angle),
      z: -r * Math.sin(angle),
    });

    const zMult = type === "start" ? -1 : 1;

    if (shape === "square") {
      const z0 = Math.min(0, blockLength * zMult);
      const z1 = Math.max(0, blockLength * zMult);
      const zTile0 = Math.min(0, (blockLength - t) * zMult);
      const zTile1 = Math.max(0, (blockLength - t) * zMult);
      const zBack0 = zMult === -1 ? -blockLength : blockLength - t;
      const zBack1 = zMult === -1 ? -blockLength + t : blockLength;

      addBox(floorSegments, -R_base, R_base, z0, z1, y0_base, y1_base);
      addBox(floorSegments, -R_tile, R_tile, zTile0, zTile1, y0_tile, y1_tile);
      addBox(wallSegments, -R_base, -R_tile, z0, z1, y0_wall, y1_wall);
      addBox(wallSegments, R_tile, R_base, z0, z1, y0_wall, y1_wall);
      addBox(wallSegments, -R_tile, R_tile, zBack0, zBack1, y0_wall, y1_wall);
    } else if (shape === "rounded") {
      const numSegments = 12;
      const angleStart = type === "start" ? 0 : Math.PI;
      const angleEnd = angleStart + Math.PI;
      const angleStep = (angleEnd - angleStart) / numSegments;

      for (let i = 0; i < numSegments; i++) {
        const a1 = angleStart + i * angleStep;
        const a2 = angleStart + (i + 1) * angleStep;
        const origin = { x: 0, z: 0 };
        const b1 = getPoint(R_base, a1);
        const b2 = getPoint(R_base, a2);
        const t1 = getPoint(R_tile, a1);
        const t2 = getPoint(R_tile, a2);

        addQuad(floorSegments, origin, b1, b2, origin, y0_base, y1_base);
        addQuad(floorSegments, origin, t1, t2, origin, y0_tile, y1_tile);
        addQuad(wallSegments, t1, b1, b2, t2, y0_wall, y1_wall);
      }
    }
    return { floor: floorSegments, wall: wallSegments };
  })();
</script>

{#if baseGeo}
  <RigidBody type={isEditor ? "kinematicPosition" : "fixed"}>
    <T.Group {position} quaternion={[rotationQuaternion.x, rotationQuaternion.y, rotationQuaternion.z, rotationQuaternion.w]}>
      {#each meshes as {geo, color, meshType}}
        <T.Mesh geometry={geo}>
          {#if meshType === "wall"}
            <WoodMaterial {color} />
          {:else if meshType === "tile"}
            <TileMaterial {color} />
          {:else}
            <T.MeshStandardMaterial {color} />
          {/if}
        </T.Mesh>
      {/each}

      {#each colliders.floor as hullVertices}
        <Collider shape="convexHull" args={[hullVertices]} friction={groundFriction} restitution={groundRestitution} collisionGroups={0x0001FFFF} />
      {/each}
      {#each colliders.wall as hullVertices}
        <Collider shape="convexHull" args={[hullVertices]} friction={wallFriction} restitution={wallRestitution} collisionGroups={0x0002FFFF} />
      {/each}

      {#if type === "start"}
        <T.Mesh position={[0, floorDepth + 0.025, 0]}>
          <T.CylinderGeometry args={[0.4, 0.4, 0.01, 32]} />
          <T.MeshStandardMaterial color="#4ade80" />
        </T.Mesh>
      {:else}
        <T.Mesh position={[0, floorDepth + 0.025, 0]}>
          <T.CylinderGeometry args={[0.4, 0.4, 0.01, 32]} />
          <T.MeshStandardMaterial color="#111111" />
        </T.Mesh>

        <T.Mesh position={[0, floorDepth + 1.0, 0]} castShadow receiveShadow>
          <T.CylinderGeometry args={[0.02, 0.02, 2, 8]} />
          <T.MeshStandardMaterial color="#cccccc" />
        </T.Mesh>

        <T.Mesh position={[0.3, floorDepth + 1.8, 0]} castShadow receiveShadow>
          <T.BoxGeometry args={[0.6, 0.3, 0.02]} />
          <T.MeshStandardMaterial color="#ef4444" />
        </T.Mesh>
      {/if}
    </T.Group>
  </RigidBody>
{/if}
