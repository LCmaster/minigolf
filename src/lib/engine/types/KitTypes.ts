/**
 * KitTypes.ts
 * Type definitions for modular kitbash pieces, sockets, and metadata.
 */

export type SocketType =
  | "track_standard_4m"
  | "track_arcade_6m"
  | "track_narrow_2m"
  | "ramp_top_1m"
  | "ramp_top_2m"
  | "ramp_bottom_0m"
  | "green_open_4m"
  | "prop_anchor";

export interface SocketDefinition {
  id: string; // e.g. "LOC_Socket_In", "LOC_Socket_Out", "LOC_Socket_Top_In"
  position: [number, number, number]; // [x, y, z] relative to piece origin
  normal: [number, number, number]; // Outward facing normal vector, e.g. [0, 0, 1]
  type: SocketType;
  elevation: number; // Elevation delta relative to piece origin (e.g. 0.0, 1.0, 2.0)
}

export type KitCategory =
  | "foundations"
  | "straights"
  | "turns"
  | "elevation"
  | "obstacles"
  | "hazards"
  | "terrain"
  | "props";

export type PropRole = "playable" | "decorative";
export type PropFilterMode = "all" | PropRole;

export interface KitPieceMetadata {
  id: string; // Unique identifier, e.g. "straight_6m", "turn_45deg_rounded"
  name: string; // Display name, e.g. "Straight Fairway (6m)"
  category: KitCategory;
  glbPath: string; // Relative path, e.g. "models/kit/straight_6m.glb"
  dimensions: [number, number, number]; // [width, height, length] in meters
  turfWidth: number; // Playable width, default 5.2m
  railHeight: number; // Default 0.6m
  hasDynamicWalls: boolean; // True if Left/Right rails can be toggled
  sockets: SocketDefinition[];
  tags: string[];
  theme?: string; // e.g. "country_club" | "carnival_park"
  preserveMaterials?: boolean; // Keep glTF/vertex materials instead of trim sheet override
  propRole?: PropRole; // Distinguishes interactive gameplay props from decorative scenery
}

const PLAYABLE_ROLE_TAGS = new Set([
  "bumper",
  "booster",
  "spinner",
  "obstacle",
  "hazard",
  "ramp",
  "playable",
]);

/**
 * Resolves whether a kit piece acts as an interactive gameplay prop ("playable")
 * or passive scenery ("decorative"). Uses explicit `propRole` first, then falls
 * back to gameplay tags and categories for backwards compatibility.
 */
export function getPiecePropRole(meta?: Partial<KitPieceMetadata>): PropRole {
  if (meta?.propRole === "playable" || meta?.propRole === "decorative") {
    return meta.propRole;
  }
  if (meta?.category === "obstacles" || meta?.category === "hazards") {
    return "playable";
  }
  if (meta?.tags?.some((tag) => PLAYABLE_ROLE_TAGS.has(tag.toLowerCase()))) {
    return "playable";
  }
  return "decorative";
}

/**
 * Returns freeform (zero-socket) props & terrain from a kit manifest,
 * filtered by active theme and role (`"all" | "playable" | "decorative"`).
 * Track/hazard tiles with sockets belong in the RadialSocketMenu instead.
 */
export function getFreeformPropCatalog(
  manifest: KitManifest | null | undefined,
  theme: string,
  roleFilter: PropFilterMode = "all"
): KitPieceMetadata[] {
  if (!manifest?.pieces) return [];

  const freeform = Object.values(manifest.pieces).filter((piece) => {
    if (piece.sockets && piece.sockets.length > 0) return false;
    if (piece.category !== "props" && piece.category !== "terrain") return false;

    if (theme === "carnival_park") {
      return piece.theme === "carnival_park";
    }
    return !piece.theme || piece.theme === theme;
  });

  const filtered =
    roleFilter === "all"
      ? freeform
      : freeform.filter((piece) => getPiecePropRole(piece) === roleFilter);

  return filtered.sort((a, b) => {
    const roleA = getPiecePropRole(a);
    const roleB = getPiecePropRole(b);
    if (roleA === roleB) return 0;
    return roleA === "playable" ? -1 : 1;
  });
}

export interface KitManifest {
  version: string;
  theme: string;
  trimSheet?: {
    diffuse: string;
    normal: string;
    roughness: string;
  };
  pieces: Record<string, KitPieceMetadata>;
}

