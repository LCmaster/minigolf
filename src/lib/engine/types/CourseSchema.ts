/**
 * CourseSchema.ts
 * Clean slate data model for modular mini-golf courses, holes, placed tiles, and props.
 */

export interface PlacedTile {
  instanceId: string; // UUID of placed instance
  kitPieceId: string; // Matches KitPieceMetadata.id (e.g. "straight_4m", "turn_90deg_crisp")
  position: [number, number, number]; // [x, y, z] world coordinates
  rotationY: number; // Y-axis rotation in degrees (0, 15, 30, 45, 90, 180...)
  walls: {
    left: boolean; // True = left rail active; False = open cliff/edge
    right: boolean; // True = right rail active; False = open cliff/edge
  };
  connectedSockets: Record<string, string>; // socketId -> targetTileInstanceId
}

export interface PlacedProp {
  instanceId: string;
  propId: string; // Matches KitPieceMetadata.id (e.g. "prop_bumper_mushroom")
  position: [number, number, number];
  rotation: [number, number, number]; // [rotX, rotY, rotZ] in degrees
  scale: [number, number, number];
}

export interface HoleData {
  holeNumber: number; // 1 to 18
  par: number; // Standard par target (2, 3, 4, 5)
  teeTileId: string; // instanceId of the starting tee_box_4x4
  cupTileId: string; // instanceId of the finishing green_cup_standard_4x4
  tiles: PlacedTile[];
  props: PlacedProp[];
}

export interface CourseData {
  id: string; // UUID or Firebase doc ID
  name: string;
  theme: "country_club" | "cyber_neon" | "pirate_cove";
  authorId: string;
  authorName?: string;
  createdAt: number; // Timestamp ms
  updatedAt: number; // Timestamp ms
  holes: HoleData[];
}

