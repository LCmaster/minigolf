/**
 * SplineOverlay.ts
 * 3D viewport visualizer for Spline Track Mode:
 * draws Bezier spline curves, waypoint spheres, single C1 tangent handles,
 * and pooled translucent ghost tile previews during live node/handle drags.
 */

import * as THREE from "three";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type { SplineWaypoint } from "../types/CourseSchema";
import type { GhostSegmentPreview } from "./DiscreteKitFitter";
import { getCornerBevelGeometry, sampleSplineChain } from "./SplineMath";

const OVERLAY_Y_OFFSET = 0.68;

export class SplineOverlay {
  private scene: THREE.Scene;
  public overlayGroup: THREE.Group;
  public ghostGroup: THREE.Group;

  public nodeMeshes: THREE.Mesh[] = [];
  public handleMeshes: THREE.Mesh[] = [];

  private ghostMaterial: THREE.MeshBasicMaterial;
  private isVisibleState: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = "Editor_SplineOverlay";
    this.overlayGroup.visible = false;
    this.scene.add(this.overlayGroup);

    this.ghostGroup = new THREE.Group();
    this.ghostGroup.name = "Editor_SplineGhostPreview";
    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);

    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
  }

  public setVisible(visible: boolean): void {
    this.isVisibleState = visible;
    this.overlayGroup.visible = visible;
    if (!visible) {
      this.clearGhost();
    }
  }

  public isVisible(): boolean {
    return this.isVisibleState;
  }

  public renderOverlay(
    nodes: SplineWaypoint[],
    selectedIndex: number,
    isDragging: boolean = false
  ): void {
    while (this.overlayGroup.children.length > 0) {
      this.overlayGroup.remove(this.overlayGroup.children[0]);
    }
    this.nodeMeshes = [];
    this.handleMeshes = [];

    if (nodes.length === 0) return;

    // 1. Curve Path Line
    const samples = sampleSplineChain(nodes, 20);
    if (samples.length >= 2) {
      const pts = samples.map(
        (s) => new THREE.Vector3(s.position.x, s.position.y + OVERLAY_Y_OFFSET, s.position.z)
      );
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: isDragging ? 0xfbbf24 : 0x38bdf8,
        transparent: true,
        opacity: 0.95,
      });
      const curveLine = new THREE.Line(lineGeo, lineMat);
      curveLine.name = "SplineOverlay_Curve";
      this.overlayGroup.add(curveLine);
    }

    // 2. Waypoint Spheres & Perpendicular Symmetric Curve Handles (intermediate nodes only; Tee & Cup have no handles)
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isRoot = i === 0;
      const isEnd = i === nodes.length - 1;
      const isIntermediate = !isRoot && !isEnd;
      const isSelected = i === selectedIndex;

      const nodePos = new THREE.Vector3(
        node.position[0],
        node.position[1] + OVERLAY_Y_OFFSET,
        node.position[2]
      );

      const sphereGeo = new THREE.SphereGeometry(isSelected ? 0.44 : 0.36, 16, 12);
      const color = isSelected ? 0xfbbf24 : isRoot ? 0x10b981 : 0x38bdf8;
      const sphereMat = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(nodePos);
      sphere.name = `SplineOverlay_Node_${i}`;
      sphere.userData = { splineNodeIndex: i };
      this.overlayGroup.add(sphere);
      this.nodeMeshes.push(sphere);

      if (isSelected) {
        const ringGeo = new THREE.RingGeometry(0.55, 0.72, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(nodePos);
        ring.position.y -= 0.1;
        this.overlayGroup.add(ring);
      }

      // Vertical drop tether down to ground/fairway surface for depth clarity
      const stemGeo = new THREE.BufferGeometry().setFromPoints([
        nodePos,
        new THREE.Vector3(node.position[0], node.position[1] + 0.05, node.position[2]),
      ]);
      const stemLine = new THREE.Line(
        stemGeo,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 })
      );
      this.overlayGroup.add(stemLine);

      // Render inside-bisector Bevel Handle ONLY for valid intermediate corners (Tee & Cup never have handles)
      if (isIntermediate) {
        const reqRadius = node.corner ? 0 : node.bevelRadius ?? 0;
        const bevel = getCornerBevelGeometry(
          nodes[i - 1].position,
          node.position,
          nodes[i + 1].position,
          reqRadius
        );
        if (bevel.isValidCorner) {
          const handleWorld = new THREE.Vector3(
            bevel.handlePosXZ.x,
            node.position[1] + OVERLAY_Y_OFFSET,
            bevel.handlePosXZ.y
          );

          const armGeo = new THREE.BufferGeometry().setFromPoints([nodePos, handleWorld]);
          const armLine = new THREE.Line(
            armGeo,
            new THREE.LineBasicMaterial({
              color: isSelected ? 0xf59e0b : 0x94a3b8,
              transparent: true,
              opacity: isSelected ? 0.95 : 0.45,
            })
          );
          this.overlayGroup.add(armLine);

          // When corner is beveled, draw faint corner guide arms to show sharp apex geometry
          if (bevel.isBeveled && isSelected) {
            const apexGuideGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(bevel.entryXZ.x, node.position[1] + OVERLAY_Y_OFFSET, bevel.entryXZ.y),
              nodePos,
              new THREE.Vector3(bevel.exitXZ.x, node.position[1] + OVERLAY_Y_OFFSET, bevel.exitXZ.y),
            ]);
            this.overlayGroup.add(
              new THREE.Line(
                apexGuideGeo,
                new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.45 })
              )
            );
          }

          const diamondGeo = new THREE.OctahedronGeometry(isSelected ? 0.34 : 0.24, 0);
          const diamondMat = new THREE.MeshBasicMaterial({
            color: bevel.isBeveled ? 0x22d3ee : isSelected ? 0xf59e0b : 0x94a3b8,
          });
          const diamond = new THREE.Mesh(diamondGeo, diamondMat);
          diamond.position.copy(handleWorld);
          diamond.name = `SplineOverlay_Handle_${i}`;
          diamond.userData = { splineHandleIndex: i };
          this.overlayGroup.add(diamond);
          this.handleMeshes.push(diamond);
        }
      }
    }
  }

  public renderGhostSegments(
    segments: GhostSegmentPreview[],
    assetLoader: AssetLoader
  ): void {
    this.clearGhost();
    if (segments.length === 0) return;

    for (const seg of segments) {
      const tpl = assetLoader.getPiece(seg.kitPieceId);
      if (!tpl || !tpl.visualTemplate) continue;

      const clone = tpl.visualTemplate.clone(true);
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          child.material = this.ghostMaterial;
        }
      });
      clone.matrixAutoUpdate = false;
      clone.matrix.copy(seg.matrix);
      clone.updateMatrixWorld(true);
      this.ghostGroup.add(clone);
    }

    this.ghostGroup.visible = true;
  }

  public clearGhost(): void {
    while (this.ghostGroup.children.length > 0) {
      this.ghostGroup.remove(this.ghostGroup.children[0]);
    }
    this.ghostGroup.visible = false;
  }

  public dispose(): void {
    this.clearGhost();
    this.scene.remove(this.overlayGroup);
    this.scene.remove(this.ghostGroup);
  }
}

