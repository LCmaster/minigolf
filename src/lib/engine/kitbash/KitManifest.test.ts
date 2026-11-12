import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import { getPiecePropRole, getFreeformPropCatalog } from "../types/KitTypes";
import { SeamWelder } from "../physics/SeamWelder";
import { createStaticTrimeshColliderDesc } from "../course/PropInstanceManager";

describe("Kit Manifest & Arcade Standard (TDD)", () => {
  const manifestPath = path.resolve("static/models/kit/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  it("conforms to version 2.0.0 arcade specifications", () => {
    expect(manifest.version).toBe("2.0.0");
    expect(manifest.gridSize).toBe(6.0);
    expect(manifest.turfWidth).toBe(5.2);
    expect(manifest.railGirth).toBe(0.4);
    expect(manifest.railHeight).toBe(0.6);
    expect(manifest.floorSlabDepth).toBe(0.5);
    expect(manifest.cupRadius).toBe(0.28);
  });

  it("contains all 32 base arcade pieces and 50 Carnival Park kitbash pieces", () => {
    const pieces = Object.keys(manifest.pieces);
    expect(pieces.length).toBe(82);

    expect(pieces).toContain("tee_box_6x6");
    expect(pieces).toContain("straight_6m");
    expect(pieces).toContain("green_cup_standard_6x6");
    expect(pieces).toContain("green_cup_funnel_6x6");

    for (const ang of [15, 30, 45, 60, 75, 90]) {
      expect(pieces).toContain(`turn_${ang}deg_crisp`);
      expect(pieces).toContain(`turn_${ang}deg_rounded`);
    }
    expect(pieces).toContain("turn_banked_90deg_6x6");

    expect(pieces).toContain("bridge_overpass_6x12");
    expect(pieces).toContain("obstacle_windmill_6x12");
    expect(pieces).toContain("hazard_sand_trap_6x6");
    expect(pieces).toContain("hazard_water_channel_6x6");
    expect(pieces).toContain("hazard_booster_strip_6x3");

    // Carnival Park kit pieces
    for (const cid of [
      "carnival_tee_6x6",
      "carnival_straight_6m",
      "carnival_ramp_up_15deg_6x6",
      "carnival_ramp_down_15deg_6x6",
      "carnival_turn_15deg_rounded",
      "carnival_turn_30deg_rounded",
      "carnival_turn_45deg_rounded",
      "carnival_turn_60deg_rounded",
      "carnival_turn_75deg_rounded",
      "carnival_turn_90deg_rounded",
      "carnival_bridge_pond_6x12",
      "carnival_windmill_6x12",
      "carnival_split_lane_6x12",
      "carnival_tunnel_6x6",
      "carnival_green_cup_6x6",
      "terrain_hill_knoll_6x6",
      "terrain_pond_patch_6x6",
      "terrain_waterfall_lagoon_12x12",
      "prop_carnival_arch_6m",
      "prop_bigtop_gate_6m",
      "prop_carnival_hoop_6m",
      "prop_carnival_tent_pavilion",
      "prop_bumper_star_pink",
      "prop_bumper_peg_yellow",
      "prop_bumper_peg_blue",
      "prop_bumper_peg_red",
      "prop_carnival_booster_pad",
      "prop_carnival_wedge_bumper",
      "prop_rock_spire_large",
      "prop_rock_massif_large",
      "prop_rock_twin_crag_large",
      "prop_rock_step_ridge_large",
      "prop_rock_slabs_med",
      "prop_rock_pillar_med",
      "prop_rock_arch_cluster_med",
      "prop_rock_slant_ledge_med",
      "prop_rock_pyramid_crag_med",
      "prop_rock_split_ledge_small",
      "prop_rock_tall_boulder_small",
      "prop_rock_wide_boulder_small",
      "prop_rock_block_stone_small",
      "prop_rock_wedge_stone_small",
      "prop_rock_flat_shard_small",
      "prop_tree_puffy",
      "prop_toadstool_pair",
    ]) {
      expect(pieces).toContain(cid);
    }
  });

  it("classifies every prop/terrain piece as playable or decorative and excludes socket tiles from freeform palette", () => {
    const propsAndTerrain = Object.values<any>(manifest.pieces).filter(
      (p) => p.category === "props" || p.category === "terrain"
    );
    expect(propsAndTerrain.length).toBeGreaterThan(0);

    for (const p of propsAndTerrain) {
      expect(["playable", "decorative"]).toContain(p.propRole);
      expect(getPiecePropRole(p)).toBe(p.propRole);
    }

    const carnivalAll = getFreeformPropCatalog(manifest, "carnival_park", "all");
    const carnivalPlayable = getFreeformPropCatalog(manifest, "carnival_park", "playable");
    const carnivalDecorative = getFreeformPropCatalog(manifest, "carnival_park", "decorative");

    expect(carnivalPlayable.map((p) => p.id)).toContain("prop_carnival_booster_pad");
    expect(carnivalPlayable.map((p) => p.id)).toContain("prop_carnival_wedge_bumper");
    expect(carnivalPlayable.map((p) => p.id)).toContain("prop_bumper_peg_yellow");
    expect(carnivalDecorative.map((p) => p.id)).toContain("prop_tree_puffy");
    expect(carnivalAll.length).toBe(carnivalPlayable.length + carnivalDecorative.length);

    // Socket hazard tiles must not leak into the freeform PropPalette catalog
    const allIds = carnivalAll.map((p) => p.id).concat(getFreeformPropCatalog(manifest, "country_club", "all").map((p) => p.id));
    expect(allIds).not.toContain("hazard_booster_strip_6x3");
    expect(allIds).not.toContain("hazard_sand_trap_6x6");
    expect(allIds).not.toContain("hazard_water_channel_6x6");
  });

  it("verifies every piece GLB file actually exists on disk", () => {
    for (const piece of Object.values<any>(manifest.pieces)) {
      const glbOnDisk = path.resolve("static", piece.glbPath);
      expect(fs.existsSync(glbOnDisk)).toBe(true);
      const stats = fs.statSync(glbOnDisk);
      expect(stats.size).toBeGreaterThan(100);
    }
  });

  it("verifies master .blend file exists in assets/", () => {
    const blendPath = path.resolve("assets/minigolf_kitbash_master.blend");
    expect(fs.existsSync(blendPath)).toBe(true);
    expect(fs.statSync(blendPath).size).toBeGreaterThan(10000);
  });

  it("ensures cup tile side and back walls have continuous masonry/curb coverage with zero entry-seam or brick gaps", () => {
    const readGlb = (relPath: string) => {
      const buf = fs.readFileSync(path.resolve("static", relPath));
      const chunk0Len = buf.readUInt32LE(12);
      const chunk1Len = buf.readUInt32LE(20 + chunk0Len);
      const gltf = JSON.parse(buf.subarray(20, 20 + chunk0Len).toString("utf-8"));
      const bin = buf.subarray(28 + chunk0Len, 28 + chunk0Len + chunk1Len);
      return { gltf, bin };
    };

    const extractPrimitiveBoxes = (gltf: any, bin: Buffer, nodePrefix: string) => {
      const tris: Array<[number, number, number][]> = [];
      for (const node of gltf.nodes ?? []) {
        const clean = String(node.name || "").replace(/(?:\.\d+|\d{3})+$/, "");
        if (clean !== nodePrefix || node.mesh === undefined) continue;
        const mesh = gltf.meshes[node.mesh];
        for (const prim of mesh.primitives) {
          const posAcc = gltf.accessors[prim.attributes.POSITION];
          const posBv = gltf.bufferViews[posAcc.bufferView];
          const posOffset = (posBv.byteOffset ?? 0) + (posAcc.byteOffset ?? 0);
          const posStride = posBv.byteStride ?? 12;
          const pts: [number, number, number][] = [];
          for (let i = 0; i < posAcc.count; i++) {
            const off = posOffset + i * posStride;
            pts.push([bin.readFloatLE(off), bin.readFloatLE(off + 4), bin.readFloatLE(off + 8)]);
          }
          if (prim.indices !== undefined) {
            const idxAcc = gltf.accessors[prim.indices];
            const idxBv = gltf.bufferViews[idxAcc.bufferView];
            const idxOffset = (idxBv.byteOffset ?? 0) + (idxAcc.byteOffset ?? 0);
            const readIdx = (k: number) =>
              idxAcc.componentType === 5125
                ? bin.readUInt32LE(idxOffset + k * 4)
                : bin.readUInt16LE(idxOffset + k * 2);
            for (let k = 0; k < idxAcc.count; k += 3) {
              tris.push([pts[readIdx(k)], pts[readIdx(k + 1)], pts[readIdx(k + 2)]]);
            }
          } else {
            for (let k = 0; k < pts.length; k += 3) {
              tris.push([pts[k], pts[k + 1], pts[k + 2]]);
            }
          }
        }
      }
      return tris;
    };

    const { gltf, bin } = readGlb("models/kit/carnival_green_cup_6x6.glb");

    // Check lower wall coverage (Y in [0.05, 0.40]) along Z = [-2.95 .. +2.95] on L & R walls
    for (const side of ["Mesh_Wall_L", "Mesh_Wall_R"]) {
      const tris = extractPrimitiveBoxes(gltf, bin, side).filter((tri) => {
        const yMin = Math.min(tri[0][1], tri[1][1], tri[2][1]);
        const yMax = Math.max(tri[0][1], tri[1][1], tri[2][1]);
        return yMax >= 0.05 && yMin <= 0.40;
      });
      for (let z = -2.95; z <= 2.951; z += 0.05) {
        const covered = tris.some((tri) => {
          const zMin = Math.min(tri[0][2], tri[1][2], tri[2][2]);
          const zMax = Math.max(tri[0][2], tri[1][2], tri[2][2]);
          return z >= zMin - 1e-4 && z <= zMax + 1e-4;
        });
        expect(covered, `${side} has lower-wall gap at Z=${z.toFixed(2)}`).toBe(true);
      }
    }

    // Check back wall lower coverage along X = [-2.95 .. +2.95] across both back corners
    const backTris = extractPrimitiveBoxes(gltf, bin, "Mesh_Wall_Back").filter((tri) => {
      const yMin = Math.min(tri[0][1], tri[1][1], tri[2][1]);
      const yMax = Math.max(tri[0][1], tri[1][1], tri[2][1]);
      return yMax >= 0.05 && yMin <= 0.40;
    });
    for (let x = -2.95; x <= 2.951; x += 0.05) {
      const covered = backTris.some((tri) => {
        const xMin = Math.min(tri[0][0], tri[1][0], tri[2][0]);
        const xMax = Math.max(tri[0][0], tri[1][0], tri[2][0]);
        return x >= xMin - 1e-4 && x <= xMax + 1e-4;
      });
      expect(covered, `Mesh_Wall_Back has lower-wall gap at X=${x.toFixed(2)}`).toBe(true);
    }

    // Check Mesh_Floor and UBX_Floor cover all 4 outer rectangle corners (±2.6, ±3.0) with no clipped corner holes
    for (const cupPath of [
      "models/kit/carnival_green_cup_6x6.glb",
      "models/kit/green_cup_standard_6x6.glb",
      "models/kit/green_cup_funnel_6x6.glb",
    ]) {
      const cupGlb = readGlb(cupPath);
      for (const floorNode of ["Mesh_Floor", "UBX_Floor"]) {
        const floorTris = extractPrimitiveBoxes(cupGlb.gltf, cupGlb.bin, floorNode).filter((tri) => {
          const yMax = Math.max(tri[0][1], tri[1][1], tri[2][1]);
          return yMax >= -0.05;
        });
        const cornerProbes: Array<[number, number]> = [
          [-2.5, -2.9],
          [2.5, -2.9],
          [-2.5, 2.9],
          [2.5, 2.9],
        ];
        for (const [px, pz] of cornerProbes) {
          const hasPointInTri = floorTris.some(([a, b, c]) => {
            const sign = (p1: [number, number], p2: [number, number], p3: [number, number]) =>
              (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
            const d1 = sign([px, pz], [a[0], a[2]], [b[0], b[2]]);
            const d2 = sign([px, pz], [b[0], b[2]], [c[0], c[2]]);
            const d3 = sign([px, pz], [c[0], c[2]], [a[0], a[2]]);
            const hasNeg = d1 < -1e-6 || d2 < -1e-6 || d3 < -1e-6;
            const hasPos = d1 > 1e-6 || d2 > 1e-6 || d3 > 1e-6;
            return !(hasNeg && hasPos);
          });
          expect(hasPointInTri, `${cupPath} ${floorNode} has corner hole at (${px}, ${pz})`).toBe(true);
        }
      }
    }
  });

  it("verifies carnival_green_cup_6x6 GLB colliders keep the ball on the turf across all side seams and corners in Rapier", async () => {
    const RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    const buf = fs.readFileSync(path.resolve("static/models/kit/carnival_green_cup_6x6.glb"));
    const chunk0Len = buf.readUInt32LE(12);
    const chunk1Len = buf.readUInt32LE(20 + chunk0Len);
    const gltf = JSON.parse(buf.subarray(20, 20 + chunk0Len).toString("utf-8"));
    const bin = buf.subarray(28 + chunk0Len, 28 + chunk0Len + chunk1Len);

    const buildGeo = (targetGltf: any, targetBin: Buffer, nodePrefix: string): THREE.BufferGeometry => {
      const node = (targetGltf.nodes ?? []).find(
        (n: any) => String(n.name || "").replace(/(?:\.\d+|\d{3})+$/, "") === nodePrefix && n.mesh !== undefined
      );
      expect(node, `Missing node ${nodePrefix}`).toBeDefined();
      const prim = targetGltf.meshes[node.mesh].primitives[0];
      const posAcc = targetGltf.accessors[prim.attributes.POSITION];
      const posBv = targetGltf.bufferViews[posAcc.bufferView];
      const posOff = (posBv.byteOffset ?? 0) + (posAcc.byteOffset ?? 0);
      const posStride = posBv.byteStride ?? 12;
      const verts = new Float32Array(posAcc.count * 3);
      for (let i = 0; i < posAcc.count; i++) {
        const off = posOff + i * posStride;
        verts[i * 3] = targetBin.readFloatLE(off);
        verts[i * 3 + 1] = targetBin.readFloatLE(off + 4);
        verts[i * 3 + 2] = targetBin.readFloatLE(off + 8);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      if (prim.indices !== undefined) {
        const idxAcc = targetGltf.accessors[prim.indices];
        const idxBv = targetGltf.bufferViews[idxAcc.bufferView];
        const idxOff = (idxBv.byteOffset ?? 0) + (idxAcc.byteOffset ?? 0);
        const indices = new Uint32Array(idxAcc.count);
        for (let k = 0; k < idxAcc.count; k++) {
          indices[k] =
            idxAcc.componentType === 5125
              ? targetBin.readUInt32LE(idxOff + k * 4)
              : targetBin.readUInt16LE(idxOff + k * 2);
        }
        geo.setIndex(new THREE.BufferAttribute(indices, 1));
      }
      return geo;
    };

    const readRawGlb = (rel: string) => {
      const b = fs.readFileSync(path.resolve("static", rel));
      const c0 = b.readUInt32LE(12);
      const c1 = b.readUInt32LE(20 + c0);
      return {
        gltf: JSON.parse(b.subarray(20, 20 + c0).toString("utf-8")),
        bin: b.subarray(28 + c0, 28 + c0 + c1),
      };
    };

    const straightGlb = readRawGlb("models/kit/carnival_straight_6m.glb");
    const cupMat = new THREE.Matrix4();
    const straightMat = new THREE.Matrix4().makeTranslation(0, 0, 6);

    const floorDesc = SeamWelder.weldFloorsToRapierTrimesh(
      [
        { geometry: buildGeo(gltf, bin, "UBX_Floor"), worldMatrix: cupMat },
        { geometry: buildGeo(straightGlb.gltf, straightGlb.bin, "UBX_Floor"), worldMatrix: straightMat },
      ],
      RAPIER
    );
    expect(floorDesc).not.toBeNull();
    world.createCollider(floorDesc!);

    for (const wallPrefix of ["UBX_Wall_L", "UBX_Wall_R", "UBX_Wall_Back"]) {
      const desc = createStaticTrimeshColliderDesc(RAPIER, buildGeo(gltf, bin, wallPrefix), cupMat);
      expect(desc, `Failed collider for ${wallPrefix}`).not.toBeNull();
      world.createCollider(desc!);
    }
    for (const wallPrefix of ["UBX_Wall_L", "UBX_Wall_R"]) {
      const desc = createStaticTrimeshColliderDesc(
        RAPIER,
        buildGeo(straightGlb.gltf, straightGlb.bin, wallPrefix),
        straightMat
      );
      expect(desc).not.toBeNull();
      world.createCollider(desc!);
    }

    // Shoot balls directly across the left/right entry seam corners (z=3) and into both back corners
    const shots: Array<{ pos: [number, number, number]; vel: [number, number, number] }> = [
      { pos: [-2.35, 0.08, 3.6], vel: [-2.5, 0, -2.5] }, // Left entry corner seam
      { pos: [2.35, 0.08, 3.6], vel: [2.5, 0, -2.5] },   // Right entry corner seam
      { pos: [-2.35, 0.08, -2.3], vel: [-2.5, 0, -2.5] }, // Back-left corner
      { pos: [2.35, 0.08, -2.3], vel: [2.5, 0, -2.5] },   // Back-right corner
    ];

    for (const shot of shots) {
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(...shot.pos)
          .setLinvel(...shot.vel)
          .setCcdEnabled(true)
      );
      world.createCollider(RAPIER.ColliderDesc.ball(0.05).setRestitution(0.6), body);
      for (let i = 0; i < 90; i++) {
        world.step();
        const t = body.translation();
        expect(t.y, `Ball fell through floor from ${shot.pos}`).toBeGreaterThan(-0.02);
        expect(Math.abs(t.x)).toBeLessThan(2.65);
      }
    }
  });
});

