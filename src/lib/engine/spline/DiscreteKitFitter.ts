/**
 * DiscreteKitFitter.ts
 * Beam-search solver that fits socket-aligned discrete kitbash GLB tiles
 * along a single-path spline while preserving Tee, Cup, and hero/hazard modules.
 */

import * as THREE from "three";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import { SocketSolver } from "../course/SocketSolver";
import type { PlacedTile, SplinePathData, SplineWaypoint } from "../types/CourseSchema";
import {
  ELEVATION_STEP_METERS,
  cloneSplineWaypoints,
  getElevationStep,
  getSampleAtArcLength,
  projectPointOntoSpline,
  sampleSplineChain,
} from "./SplineMath";
import { resolveOrderedTileChain } from "./SplineTrackSync";
import {
  buildThemeVocabulary,
  isHeroOrHazardPiece,
  type KitCandidatePiece,
  type ThemeVocabulary,
} from "./KitVocabulary";
import { evaluatePrefixFeasibility } from "./PathFeasibility";

export type { KitCandidatePiece };

export interface GhostSegmentPreview {
  kitPieceId: string;
  matrix: THREE.Matrix4;
}

export interface FitSplineResult {
  tiles: PlacedTile[];
  snappedNodes: SplineWaypoint[];
  ghostSegments: GhostSegmentPreview[];
  invalidNodeIndices: number[];
  lastValidNodeIndex: number;
}

interface PinnedHeroSpec {
  kitPieceId: string;
  instanceId: string;
  walls: { left: boolean; right: boolean };
  isGap?: boolean;
  targetFraction: number;
  lengthEstimate: number;
}

interface BeamState {
  s: number;
  score: number;
  elevStep: number;
  lastWasRamp: boolean;
  lastTurnSign: number;
  usedHeroIndices: number; // Bitmask for pinned heroes (up to 16)
  maxStepPosErr: number;
  maxStepHeadingDeg: number;
  steps: Array<{
    kitPieceId: string;
    kind: KitCandidatePiece["kind"];
    posErr: number;
    headingDeg: number;
    projS: number;
    instanceId?: string;
    walls?: { left: boolean; right: boolean };
    isGap?: boolean;
    entrySocketId: "LOC_Socket_In" | "LOC_Socket_Out";
    exitSocketId: "LOC_Socket_In" | "LOC_Socket_Out";
    worldMatrix: THREE.Matrix4;
    exitSocketWorld: {
      matrix: THREE.Matrix4;
      position: THREE.Vector3;
      tangentXZ: THREE.Vector2;
    };
  }>;
}

function getWorldMatrixAndExit(
  parentWorldMatrix: THREE.Matrix4,
  parentOutSocketId: string,
  parentTemplate: ParsedKitPiece,
  candidateTemplate: ParsedKitPiece,
  entrySocketId: "LOC_Socket_In" | "LOC_Socket_Out",
  exitSocketId: "LOC_Socket_In" | "LOC_Socket_Out"
) {
  const parentSock =
    parentTemplate.sockets.find((s) => s.id === parentOutSocketId) ||
    parentTemplate.sockets[0];
  const entrySock =
    candidateTemplate.sockets.find((s) => s.id === entrySocketId) ||
    candidateTemplate.sockets[0];
  const exitSock =
    candidateTemplate.sockets.find((s) => s.id === exitSocketId) ||
    candidateTemplate.sockets[candidateTemplate.sockets.length - 1];

  const worldMatrix = SocketSolver.computeSnappedTransform(
    parentWorldMatrix,
    parentSock,
    entrySock
  );

  const exitPos = new THREE.Vector3(...exitSock.position).applyMatrix4(worldMatrix);
  const rotQuat = new THREE.Quaternion();
  worldMatrix.decompose(new THREE.Vector3(), rotQuat, new THREE.Vector3());
  const norm3 = new THREE.Vector3(...exitSock.normal).applyQuaternion(rotQuat).normalize();
  const tangentXZ = new THREE.Vector2(norm3.x, norm3.z);
  if (tangentXZ.lengthSq() > 1e-6) tangentXZ.normalize();
  else tangentXZ.set(0, -1);

  return { worldMatrix, exitPos, tangentXZ };
}

function extractPreservedContext(existingTiles: PlacedTile[], assetLoader: AssetLoader) {
  const ordered = resolveOrderedTileChain(existingTiles, assetLoader);
  const teeTile = ordered.find((t) => t.tile.kitPieceId.includes("tee")) || ordered[0];
  const lastTile = ordered[ordered.length - 1];
  const cupTile =
    lastTile && lastTile.tile.kitPieceId.includes("cup")
      ? lastTile
      : ordered.find((t) => t.tile.kitPieceId.includes("cup"));

  const heroes: PinnedHeroSpec[] = [];
  const totalCount = Math.max(1, ordered.length - 1);

  for (let i = 0; i < ordered.length; i++) {
    const r = ordered[i];
    if (isHeroOrHazardPiece(r.tile.kitPieceId, r.template) || r.tile.isGap) {
      const dims = r.template.metadata?.dimensions;
      heroes.push({
        kitPieceId: r.tile.kitPieceId,
        instanceId: r.tile.instanceId,
        walls: { ...r.tile.walls },
        isGap: r.tile.isGap,
        targetFraction: THREE.MathUtils.clamp(i / totalCount, 0.12, 0.88),
        lengthEstimate: dims ? dims[2] : 6.0,
      });
    }
  }

  return {
    teeTile: teeTile?.tile,
    cupTile: cupTile?.tile,
    heroes,
  };
}

function solvePrefixChain(
  prefixNodes: SplineWaypoint[],
  fullNodeCount: number,
  vocab: ThemeVocabulary,
  teeTile: PlacedTile | undefined,
  cupTile: PlacedTile | undefined,
  heroes: PinnedHeroSpec[],
  teePieceId: string,
  teeTemplate: ParsedKitPiece,
  theme: string,
  assetLoader: AssetLoader
): {
  tiles: PlacedTile[];
  ghostSegments: GhostSegmentPreview[];
  isValid: boolean;
  realizedEndPos: THREE.Vector3;
} {
  const samples = sampleSplineChain(prefixNodes, 28);
  const totalLength = samples[samples.length - 1]?.s ?? 0;

  // Aim Tee straight along the first leg [P0 -> P1] so starting fairway stays straight
  const startTan =
    prefixNodes.length > 1
      ? new THREE.Vector2(
          prefixNodes[1].position[0] - prefixNodes[0].position[0],
          prefixNodes[1].position[2] - prefixNodes[0].position[2]
        )
      : new THREE.Vector2(prefixNodes[0].handleOffset[0], prefixNodes[0].handleOffset[1]);

  if (startTan.lengthSq() < 1e-6) startTan.set(0, -1);
  else startTan.normalize();

  const teeElevStep = getElevationStep(prefixNodes[0]);
  const teePos = new THREE.Vector3(
    prefixNodes[0].position[0],
    teeElevStep * ELEVATION_STEP_METERS,
    prefixNodes[0].position[2]
  );
  const teeYawRad = Math.atan2(-startTan.x, -startTan.y);
  const teeYawDeg = (teeYawRad * 180) / Math.PI;
  const teeMatrix = new THREE.Matrix4().compose(
    teePos,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, teeYawRad, 0, "YXZ")),
    new THREE.Vector3(1, 1, 1)
  );

  const teeOutSock =
    teeTemplate.sockets.find((s) => s.id === "LOC_Socket_Out") || teeTemplate.sockets[0];
  const teeExitPos = new THREE.Vector3(...teeOutSock.position).applyMatrix4(teeMatrix);
  const teeProj = projectPointOntoSpline(samples, new THREE.Vector2(teeExitPos.x, teeExitPos.z), 0);

  const hasCup = Boolean(cupTile);
  const endNode = prefixNodes[prefixNodes.length - 1];
  const finalElevStep = getElevationStep(endNode);
  const targetBodyEndS = Math.max(
    teeProj?.s ?? 3.0,
    hasCup ? Math.max(3.0, totalLength - 3.0) : totalLength
  );

  // Only prioritize pinned heroes whose target fraction falls within this prefix
  const prefixFracLimit = fullNodeCount > 1 ? (prefixNodes.length - 1) / (fullNodeCount - 1) : 1.0;

  let beam: BeamState[] = [
    {
      s: teeProj?.s ?? 3.0,
      score: 0,
      elevStep: teeElevStep,
      lastWasRamp: false,
      lastTurnSign: 0,
      usedHeroIndices: 0,
      maxStepPosErr: 0,
      maxStepHeadingDeg: 0,
      steps: [],
    },
  ];

  const finishedStates: BeamState[] = [];
  const BEAM_WIDTH = 16;
  const maxSteps = Math.max(2, Math.min(48, Math.ceil(totalLength / 3.0) + 4));

  for (let stepIdx = 0; stepIdx < maxSteps && beam.length > 0; stepIdx++) {
    const nextBeam: BeamState[] = [];

    for (const state of beam) {
      const lastStep = state.steps[state.steps.length - 1];
      const curMatrix = lastStep ? lastStep.worldMatrix : teeMatrix;
      const curTemplate = lastStep
        ? assetLoader.getPiece(lastStep.kitPieceId)!
        : teeTemplate;
      const curOutSockId = lastStep ? lastStep.exitSocketId : "LOC_Socket_Out";
      const curTanXZ = lastStep ? lastStep.exitSocketWorld.tangentXZ : startTan;

      if (
        state.s >= targetBodyEndS - 2.6 &&
        state.elevStep === finalElevStep &&
        (state.steps.length > 0 || (!hasCup && totalLength < 4.5))
      ) {
        finishedStates.push(state);
        if (state.s >= targetBodyEndS - 0.5) continue;
      }

      const lookSample = getSampleAtArcLength(
        samples,
        Math.min(totalLength, state.s + 6.0)
      );
      const targetStepHere = lookSample ? lookSample.targetElevationStep : finalElevStep;
      const neededElevDiff = targetStepHere - state.elevStep;

      const stepCandidates: Array<{ cand: KitCandidatePiece; heroIdx?: number }> = [];

      for (let hi = 0; hi < heroes.length; hi++) {
        if (state.usedHeroIndices & (1 << hi)) continue;
        const hero = heroes[hi];
        if (hero.targetFraction > prefixFracLimit + 0.12) continue;
        const scaledFrac = prefixFracLimit > 1e-4 ? hero.targetFraction / prefixFracLimit : 0.5;
        const heroFrac = totalLength > 1e-4 ? state.s / totalLength : 0.5;
        if (
          Math.abs(heroFrac - scaledFrac) <= 0.18 &&
          !state.lastWasRamp &&
          state.s + hero.lengthEstimate <= targetBodyEndS + 3.0
        ) {
          const heroTpl = assetLoader.getPiece(hero.kitPieceId);
          if (heroTpl && heroTpl.sockets.length >= 2) {
            stepCandidates.push({
              heroIdx: hi,
              cand: {
                kitPieceId: hero.kitPieceId,
                template: heroTpl,
                entrySocketId: "LOC_Socket_In",
                exitSocketId: "LOC_Socket_Out",
                kind: "hero",
                turnSign: 0,
                elevDeltaStep: 0,
                baseLength: hero.lengthEstimate,
              },
            });
          }
        }
      }

      for (const c of vocab.candidates) {
        if (c.kind === "ramp_up" && neededElevDiff <= 0) continue;
        if (c.kind === "ramp_down" && neededElevDiff >= 0) continue;
        if (state.lastWasRamp && c.kind === "turn") continue;
        stepCandidates.push({ cand: c });
      }

      for (const { cand, heroIdx } of stepCandidates) {
        const { worldMatrix, exitPos, tangentXZ } = getWorldMatrixAndExit(
          curMatrix,
          curOutSockId,
          curTemplate,
          cand.template,
          cand.entrySocketId,
          cand.exitSocketId
        );

        const proj = projectPointOntoSpline(
          samples,
          new THREE.Vector2(exitPos.x, exitPos.z),
          Math.max(0, state.s - 0.5)
        );
        if (!proj) continue;

        const nextS = Math.max(state.s + 0.5, proj.s);
        const posErrSq =
          (exitPos.x - proj.position.x) ** 2 + (exitPos.z - proj.position.z) ** 2;
        const posErr = Math.sqrt(posErrSq);

        const dotHeading = THREE.MathUtils.clamp(
          tangentXZ.x * proj.tangentXZ.x + tangentXZ.y * proj.tangentXZ.y,
          -1,
          1
        );
        const headingDeg = (Math.acos(dotHeading) * 180) / Math.PI;
        const headingCost = (1 - dotHeading) * 6.0;

        const nextElevStep = state.elevStep + cand.elevDeltaStep;
        const elevCost = Math.abs(nextElevStep - proj.targetElevationStep) * 14.0;

        const flipPenalty =
          state.lastTurnSign !== 0 &&
          cand.turnSign !== 0 &&
          state.lastTurnSign !== cand.turnSign
            ? 0.45
            : 0;
        const straightDot = curTanXZ.x * proj.tangentXZ.x + curTanXZ.y * proj.tangentXZ.y;
        const aheadTanDot = lookSample
          ? curTanXZ.x * lookSample.tangentXZ.x + curTanXZ.y * lookSample.tangentXZ.y
          : straightDot;
        const turnOverhead =
          cand.kind === "turn" && straightDot > 0.98 && aheadTanDot > 0.98 ? 6.0 : 0;
        const heroBonus = heroIdx !== undefined ? -4.5 : 0;

        const stepScore =
          posErrSq * 1.15 +
          headingCost +
          elevCost +
          flipPenalty +
          turnOverhead +
          0.18 +
          heroBonus;

        const onBevelArc = Boolean(proj.isBevelArc);
        let kitPieceId = cand.kitPieceId;
        if (
          theme !== "carnival_park" &&
          cand.kind === "turn" &&
          !onBevelArc &&
          kitPieceId.endsWith("_rounded")
        ) {
          const crispId = kitPieceId.replace(/_rounded$/, "_crisp");
          if (assetLoader.getPiece(crispId)) {
            kitPieceId = crispId;
          }
        }

        const nextState: BeamState = {
          s: nextS,
          score: state.score + stepScore,
          elevStep: nextElevStep,
          lastWasRamp: cand.elevDeltaStep !== 0,
          lastTurnSign: cand.turnSign !== 0 ? cand.turnSign : state.lastTurnSign,
          usedHeroIndices:
            heroIdx !== undefined ? state.usedHeroIndices | (1 << heroIdx) : state.usedHeroIndices,
          maxStepPosErr: Math.max(state.maxStepPosErr, posErr),
          maxStepHeadingDeg: Math.max(state.maxStepHeadingDeg, headingDeg),
          steps: [
            ...state.steps,
            {
              kitPieceId,
              kind: cand.kind,
              posErr,
              headingDeg,
              projS: nextS,
              instanceId: heroIdx !== undefined ? heroes[heroIdx].instanceId : undefined,
              walls: heroIdx !== undefined ? heroes[heroIdx].walls : undefined,
              isGap: heroIdx !== undefined ? heroes[heroIdx].isGap : undefined,
              entrySocketId: cand.entrySocketId,
              exitSocketId: cand.exitSocketId,
              worldMatrix,
              exitSocketWorld: {
                matrix: worldMatrix,
                position: exitPos,
                tangentXZ,
              },
            },
          ],
        };

        if (nextS >= targetBodyEndS - 2.6 && nextElevStep === finalElevStep) {
          finishedStates.push(nextState);
        }
        if (nextS < targetBodyEndS + 2.8) {
          nextBeam.push(nextState);
        }
      }
    }

    nextBeam.sort((a, b) => a.score - b.score);
    beam = nextBeam.slice(0, BEAM_WIDTH);
  }

  const pool = finishedStates.length > 0 ? finishedStates : beam;
  const endRefSample =
    getSampleAtArcLength(samples, targetBodyEndS) || samples[samples.length - 1];

  let bestState = pool[0] || {
    s: teeProj?.s ?? 3.0,
    score: 0,
    elevStep: teeElevStep,
    lastWasRamp: false,
    lastTurnSign: 0,
    usedHeroIndices: 0,
    maxStepPosErr: 0,
    maxStepHeadingDeg: 0,
    steps: [],
  };

  let bestFinalCost = Infinity;
  for (const st of pool) {
    const last = st.steps[st.steps.length - 1];
    const exPos = last ? last.exitSocketWorld.position : teeExitPos;
    const exTan = last ? last.exitSocketWorld.tangentXZ : startTan;
    const endDistSq = endRefSample
      ? (exPos.x - endRefSample.position.x) ** 2 +
        (exPos.z - endRefSample.position.z) ** 2
      : 0;
    const endHeading = endRefSample
      ? (1 - (exTan.x * endRefSample.tangentXZ.x + exTan.y * endRefSample.tangentXZ.y)) * 5.0
      : 0;
    const elevPenalty = Math.abs(st.elevStep - finalElevStep) * 25.0;
    let missedHeroes = 0;
    for (let hi = 0; hi < heroes.length; hi++) {
      if (heroes[hi].targetFraction <= prefixFracLimit + 0.12 && (st.usedHeroIndices & (1 << hi)) === 0) {
        missedHeroes += 8.0;
      }
    }

    const totalCost = st.score + endDistSq * 0.65 + endHeading + elevPenalty + missedHeroes;
    if (totalCost < bestFinalCost) {
      bestFinalCost = totalCost;
      bestState = st;
    }
  }

  const idSeed = Date.now() % 1000000;
  const teeId = teeTile?.instanceId || `tile_tee_${idSeed}`;
  const fittedTiles: PlacedTile[] = [
    {
      instanceId: teeId,
      kitPieceId: teePieceId,
      position: [teePos.x, teePos.y, teePos.z],
      rotationY: ((teeYawDeg % 360) + 360) % 360,
      walls: teeTile ? { ...teeTile.walls } : { left: true, right: true },
      connectedSockets: {},
    },
  ];
  const ghostSegments: GhostSegmentPreview[] = [
    { kitPieceId: teePieceId, matrix: teeMatrix.clone() },
  ];

  let prevTile = fittedTiles[0];
  let prevExitSocketId: "LOC_Socket_In" | "LOC_Socket_Out" = "LOC_Socket_Out";
  let lastWorldMatrix = teeMatrix;
  let lastTemplate = teeTemplate;

  for (let i = 0; i < bestState.steps.length; i++) {
    const step = bestState.steps[i];
    const instanceId = step.instanceId || `tile_fit_${idSeed}_${i}`;

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    step.worldMatrix.decompose(pos, quat, new THREE.Vector3());
    const euler = new THREE.Euler().setFromQuaternion(quat, "YXZ");
    const rotY = (((euler.y * 180) / Math.PI) % 360 + 360) % 360;

    prevTile.connectedSockets = prevTile.connectedSockets || {};
    prevTile.connectedSockets[prevExitSocketId] = instanceId;

    const tile: PlacedTile = {
      instanceId,
      kitPieceId: step.kitPieceId,
      position: [pos.x, pos.y, pos.z],
      rotationY: rotY,
      walls: step.walls ? { ...step.walls } : { left: true, right: true },
      ...(step.isGap ? { isGap: true } : {}),
      attachedTo: {
        parentInstanceId: prevTile.instanceId,
        parentSocketId: prevExitSocketId,
        childSocketId: step.entrySocketId,
      },
      connectedSockets: {
        [step.entrySocketId]: prevTile.instanceId,
      },
    };

    fittedTiles.push(tile);
    ghostSegments.push({ kitPieceId: step.kitPieceId, matrix: step.worldMatrix.clone() });

    prevTile = tile;
    prevExitSocketId = step.exitSocketId;
    lastWorldMatrix = step.worldMatrix;
    lastTemplate = assetLoader.getPiece(step.kitPieceId)!;
  }

  let realizedEndPos = teeExitPos.clone();
  let realizedEndTan = startTan.clone();
  if (bestState.steps.length > 0) {
    const lastStep = bestState.steps[bestState.steps.length - 1];
    realizedEndPos = lastStep.exitSocketWorld.position.clone();
    realizedEndTan = lastStep.exitSocketWorld.tangentXZ.clone();
  }

  if (cupTile) {
    const cupPieceId = assetLoader.getPiece(cupTile.kitPieceId)
      ? cupTile.kitPieceId
      : vocab.cupId;
    const cupTpl = cupPieceId ? assetLoader.getPiece(cupPieceId) : undefined;
    if (cupPieceId && cupTpl) {
      const { worldMatrix } = getWorldMatrixAndExit(
        lastWorldMatrix,
        prevExitSocketId,
        lastTemplate,
        cupTpl,
        "LOC_Socket_In",
        "LOC_Socket_In"
      );

      const cPos = new THREE.Vector3();
      const cQuat = new THREE.Quaternion();
      worldMatrix.decompose(cPos, cQuat, new THREE.Vector3());
      const cEuler = new THREE.Euler().setFromQuaternion(cQuat, "YXZ");

      prevTile.connectedSockets = prevTile.connectedSockets || {};
      prevTile.connectedSockets[prevExitSocketId] = cupTile.instanceId;

      fittedTiles.push({
        instanceId: cupTile.instanceId,
        kitPieceId: cupPieceId,
        position: [cPos.x, cPos.y, cPos.z],
        rotationY: (((cEuler.y * 180) / Math.PI) % 360 + 360) % 360,
        walls: { ...cupTile.walls },
        attachedTo: {
          parentInstanceId: prevTile.instanceId,
          parentSocketId: prevExitSocketId,
          childSocketId: "LOC_Socket_In",
        },
        connectedSockets: {
          LOC_Socket_In: prevTile.instanceId,
        },
      });
      ghostSegments.push({ kitPieceId: cupPieceId, matrix: worldMatrix.clone() });
      realizedEndPos.copy(cPos);
    }
  }

  const isValid = evaluatePrefixFeasibility({
    achievedElevStep: bestState.elevStep,
    finalElevStep,
    prefixNodes,
    samples,
    steps: bestState.steps,
    realizedEndPos,
    realizedEndTan,
  });

  return { tiles: fittedTiles, ghostSegments, isValid, realizedEndPos };
}

/**
 * Fits an ordered single-path polyline+bevel path into discrete socket-snapped PlacedTile[].
 * Keeps the user's waypoint coordinates untouched (Path is authoritative) and returns any
 * trailing invalid node indices when the full path cannot be validly realized by kit tiles.
 */
export function fitTilesToSpline(
  spline: SplinePathData,
  existingTiles: PlacedTile[],
  theme: string,
  assetLoader: AssetLoader
): FitSplineResult {
  const nodes = cloneSplineWaypoints(spline.nodes);
  if (nodes.length === 0) {
    return {
      tiles: existingTiles,
      snappedNodes: nodes,
      ghostSegments: [],
      invalidNodeIndices: [],
      lastValidNodeIndex: 0,
    };
  }

  const vocab = buildThemeVocabulary(theme, assetLoader);
  const { teeTile, cupTile, heroes } = extractPreservedContext(existingTiles, assetLoader);

  const teePieceId =
    teeTile?.kitPieceId && assetLoader.getPiece(teeTile.kitPieceId)
      ? teeTile.kitPieceId
      : vocab.teeId;
  const teeTemplate = assetLoader.getPiece(teePieceId);
  if (!teeTemplate) {
    return {
      tiles: existingTiles,
      snappedNodes: nodes,
      ghostSegments: [],
      invalidNodeIndices: [],
      lastValidNodeIndex: nodes.length - 1,
    };
  }

  if (nodes.length === 1) {
    const single = solvePrefixChain(
      nodes,
      1,
      vocab,
      teeTile,
      cupTile,
      heroes,
      teePieceId,
      teeTemplate,
      theme,
      assetLoader
    );
    const preserved = cloneSplineWaypoints(nodes);
    preserved[0].realizedTileId = single.tiles[0]?.instanceId;
    return {
      tiles: single.tiles,
      snappedNodes: preserved,
      ghostSegments: single.ghostSegments,
      invalidNodeIndices: [],
      lastValidNodeIndex: 0,
    };
  }

  let bestFit = solvePrefixChain(
    nodes,
    nodes.length,
    vocab,
    teeTile,
    cupTile,
    heroes,
    teePieceId,
    teeTemplate,
    theme,
    assetLoader
  );
  let lastValidNodeIndex = bestFit.isValid ? nodes.length - 1 : -1;

  if (!bestFit.isValid) {
    for (let prefixLen = nodes.length - 1; prefixLen >= 2; prefixLen--) {
      const candidate = solvePrefixChain(
        nodes.slice(0, prefixLen),
        nodes.length,
        vocab,
        teeTile,
        cupTile,
        heroes,
        teePieceId,
        teeTemplate,
        theme,
        assetLoader
      );
      if (candidate.isValid) {
        bestFit = candidate;
        lastValidNodeIndex = prefixLen - 1;
        break;
      }
    }
  }

  if (lastValidNodeIndex < 0) {
    // Only Tee (+ immediately attached Cup) is valid
    bestFit = solvePrefixChain(
      nodes.slice(0, 1),
      nodes.length,
      vocab,
      teeTile,
      cupTile,
      heroes,
      teePieceId,
      teeTemplate,
      theme,
      assetLoader
    );
    lastValidNodeIndex = 0;
  }

  const invalidNodeIndices: number[] = [];
  for (let i = lastValidNodeIndex + 1; i < nodes.length; i++) {
    invalidNodeIndices.push(i);
  }

  // Strictly preserve user-authored waypoint coordinates (Track follows Path)
  const preservedNodes = cloneSplineWaypoints(nodes);
  preservedNodes[0].realizedTileId = bestFit.tiles[0]?.instanceId;
  if (lastValidNodeIndex > 0) {
    preservedNodes[lastValidNodeIndex].realizedTileId =
      bestFit.tiles[bestFit.tiles.length - 1]?.instanceId;
  }

  return {
    tiles: bestFit.tiles,
    snappedNodes: preservedNodes,
    ghostSegments: bestFit.ghostSegments,
    invalidNodeIndices,
    lastValidNodeIndex,
  };
}

