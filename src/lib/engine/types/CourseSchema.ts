/**
 * CourseSchema.ts
 * Clean slate data model for modular mini-golf courses, holes, placed tiles, and props.
 */

export interface PlacedTile {
  instanceId: string; // UUID of placed instance
  kitPieceId: string; // Matches KitPieceMetadata.id (e.g. "straight_6m", "turn_90deg_crisp")
  position?: [number, number, number]; // [x, y, z] world coordinates (auto-resolved if attachedTo is provided)
  rotationY?: number; // Y-axis rotation in degrees (auto-resolved if attachedTo is provided)
  walls: {
    left: boolean; // True = left rail active; False = open cliff/edge
    right: boolean; // True = right rail active; False = open cliff/edge
  };
  isGap?: boolean; // True = surface/walls omitted (open-air jump gap) while socket chain stays intact
  connectedSockets?: Record<string, string>; // socketId -> targetTileInstanceId
  attachedTo?: {
    parentInstanceId: string;
    parentSocketId: string;
    childSocketId?: string; // defaults to "LOC_Socket_In"
  };
}

export interface PlacedProp {
  instanceId: string;
  propId: string; // Matches KitPieceMetadata.id (e.g. "prop_bumper_mushroom")
  position: [number, number, number];
  rotation: [number, number, number]; // [rotX, rotY, rotZ] in degrees
  scale: [number, number, number];
}

export interface SplineWaypoint {
  id: string;
  position: [number, number, number]; // World XYZ (Y snapped to 1.5m kit elevation tiers)
  handleOffset: [number, number]; // Legacy tangent vector (kept for serialization compatibility)
  bevelRadius?: number; // Circular fillet radius (m) at intermediate corners; 0/undefined = sharp corner
  corner?: boolean; // Legacy C0 sharp flag
  elevationStep?: number; // Discrete elevation tier (Y = elevationStep * 1.5)
  realizedTileId?: string; // Closest anchor tile instanceId
}

export interface SplinePathData {
  nodes: SplineWaypoint[];
  closed?: false;
}

export interface HoleData {
  holeNumber: number; // 1 to 18
  par: number; // Standard par target (2, 3, 4, 5)
  teeTileId: string; // instanceId of the starting tee_box
  cupTileId: string; // instanceId of the finishing green_cup
  tiles: PlacedTile[];
  props: PlacedProp[];
  showBoundary?: boolean; // Render delimited park perimeter around hole
  splinePath?: SplinePathData; // Optional persisted authoring spline path
}

export interface CourseData {
  id: string; // UUID or Firebase doc ID
  name: string;
  theme: "country_club" | "carnival_park" | "cyber_neon" | "pirate_cove";
  authorId: string;
  authorName?: string;
  createdAt: number; // Timestamp ms
  updatedAt: number; // Timestamp ms
  holes: HoleData[];
}

