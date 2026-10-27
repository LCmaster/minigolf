/**
 * Shared type definitions for the Mini Golf Mania course schema.
 * These types are the single source of truth for control points, blocks,
 * holes, and courses — used across the editor, game, and procedural generator.
 */

// ---------------------------------------------------------------------------
// Block Types
// ---------------------------------------------------------------------------

export type BlockType =
  | 'bumper'
  | 'boost'
  | 'ramp'
  | 'slope'
  | 'loop'
  | 'windmill'
  | 'tree'
  | 'rock'
  | 'grass'
  | 'ice'
  | 'sand'
  | 'water'
  | 'plinko';

// ---------------------------------------------------------------------------
// Course Schema
// ---------------------------------------------------------------------------

export interface ControlPoint {
  id: string;
  position: [number, number, number];
  /** End-cap shape for start/end points ('rounded' | 'square'), or corner mode for interior points ('sharp' | 'rounded') */
  shape?: 'rounded' | 'square' | 'sharp';
  /** Fillet radius in meters when an interior control point has shape === 'rounded' (default: 4.0) */
  cornerRadius?: number;
  /** Fairway half-width at this point (default: 2.5) */
  width?: number;
  /** Banking roll angle in degrees at this point (default: 0) */
  bankAngle?: number;
  /** Whether the left wooden wall is enabled on the segment starting at this point (default: true) */
  leftWall?: boolean;
  /** Whether the right wooden wall is enabled on the segment starting at this point (default: true) */
  rightWall?: boolean;
}

export interface CourseBlock {
  id: string;
  type: BlockType;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  /** For blocks that have visual variants (rock, tree, grass) */
  variation?: number;
  /** Overrides default restitution (e.g. bouncy bumpers) */
  restitution?: number;
  /** Magnitude of the boost impulse for boost pads */
  boostForce?: number;
}

export interface CourseHole {
  par: number;
  controlPoints: ControlPoint[];
  blocks: CourseBlock[];
  // Per-hole physics overrides (optional — defaults applied in Stage.svelte)
  groundFriction?: number;
  groundRestitution?: number;
  wallFriction?: number;
  wallRestitution?: number;
  tileColor?: string;
  theme?: string;
  /** Course ground generation mode ('heightmap' default, or 'classic' board-game trough) */
  terrainMode?: 'heightmap' | 'classic';
}

export interface Course {
  id?: string;
  name: string;
  theme?: string;
  isCampaign?: boolean;
  difficulty?: string;
  holes: CourseHole[];
  /** Present on campaigns fetched from Firebase before holes are merged */
  levelIds?: string[];
  /** Summary fields present on campaign list entries before full load */
  totalHoles?: number;
  totalPar?: number;
}
