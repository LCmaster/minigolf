import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";

/** Standard socket handle length (in meters) used when deriving Bezier spline handles from tiles. */
export const DEFAULT_HANDLE_LEN = 2.4;

/** Discrete track candidate descriptor used by the spline-to-tile beam search fitter. */
export interface KitCandidatePiece {
  kitPieceId: string;
  template: ParsedKitPiece;
  entrySocketId: "LOC_Socket_In" | "LOC_Socket_Out";
  exitSocketId: "LOC_Socket_In" | "LOC_Socket_Out";
  kind: "straight" | "turn" | "ramp_up" | "ramp_down" | "hero";
  turnSign: number; // -1 left, 0 straight/ramp, +1 right
  elevDeltaStep: number;
  baseLength: number;
}

/** Theme-resolved candidate pieces, endpoints, and elevation ramps for discrete fitting. */
export interface ThemeVocabulary {
  teeId: string;
  cupId: string | null;
  candidates: KitCandidatePiece[];
  rampUpPiece: ParsedKitPiece | undefined;
  rampDownPiece: ParsedKitPiece | undefined;
}

/** Resolves a theme-preferred piece ID (`carnival_park` vs `country_club`) with fallback to the other kit. */
export function getThemePieceId(
  assetLoader: AssetLoader,
  theme: string,
  carnivalId: string,
  classicId: string
): string | null {
  if (theme === "carnival_park") {
    if (assetLoader.getPiece(carnivalId)) return carnivalId;
    if (assetLoader.getPiece(classicId)) return classicId;
  } else {
    if (assetLoader.getPiece(classicId)) return classicId;
    if (assetLoader.getPiece(carnivalId)) return carnivalId;
  }
  return null;
}

/**
 * Returns `true` when a piece is a hero feature or hazard module (bridges, windmills, hazards, obstacles)
 * that should be preserved when refitting tracks.
 */
export function isHeroOrHazardPiece(kitPieceId: string, template?: ParsedKitPiece): boolean {
  if (
    kitPieceId.startsWith("hazard_") ||
    kitPieceId.includes("bridge") ||
    kitPieceId.includes("windmill")
  ) {
    return true;
  }
  const category = template?.metadata?.category;
  return category === "obstacles" || category === "hazards";
}

/** Builds the candidate vocabulary of straights, left/right turns, and 15° ramps for a course theme. */
export function buildThemeVocabulary(theme: string, assetLoader: AssetLoader): ThemeVocabulary {
  const teeId =
    getThemePieceId(assetLoader, theme, "carnival_tee_6x6", "tee_box_6x6") || "tee_box_6x6";
  const cupId = getThemePieceId(
    assetLoader,
    theme,
    "carnival_green_cup_6x6",
    "green_cup_standard_6x6"
  );
  const straightId = getThemePieceId(assetLoader, theme, "carnival_straight_6m", "straight_6m");
  const rampUpId = getThemePieceId(
    assetLoader,
    theme,
    "carnival_ramp_up_15deg_6x6",
    "ramp_up_15deg_6x6"
  );
  const rampDownId = getThemePieceId(
    assetLoader,
    theme,
    "carnival_ramp_down_15deg_6x6",
    "ramp_down_15deg_6x6"
  );

  const candidates: KitCandidatePiece[] = [];

  if (straightId) {
    const tpl = assetLoader.getPiece(straightId)!;
    candidates.push({
      kitPieceId: straightId,
      template: tpl,
      entrySocketId: "LOC_Socket_In",
      exitSocketId: "LOC_Socket_Out",
      kind: "straight",
      turnSign: 0,
      elevDeltaStep: 0,
      baseLength: 6.0,
    });
  }

  for (const ang of [15, 30, 45, 60, 75, 90]) {
    const turnId = getThemePieceId(
      assetLoader,
      theme,
      `carnival_turn_${ang}deg_rounded`,
      `turn_${ang}deg_rounded`
    );
    if (!turnId) continue;
    const tpl = assetLoader.getPiece(turnId)!;
    if (tpl.sockets.length < 2) continue;

    // Right turn (forward socket order)
    candidates.push({
      kitPieceId: turnId,
      template: tpl,
      entrySocketId: "LOC_Socket_In",
      exitSocketId: "LOC_Socket_Out",
      kind: "turn",
      turnSign: 1,
      elevDeltaStep: 0,
      baseLength: (ang * Math.PI * 6.0) / 180,
    });

    // Left turn (symmetric reversed socket attachment: enter Out, exit In)
    candidates.push({
      kitPieceId: turnId,
      template: tpl,
      entrySocketId: "LOC_Socket_Out",
      exitSocketId: "LOC_Socket_In",
      kind: "turn",
      turnSign: -1,
      elevDeltaStep: 0,
      baseLength: (ang * Math.PI * 6.0) / 180,
    });
  }

  const rampUpPiece = rampUpId ? assetLoader.getPiece(rampUpId) : undefined;
  if (rampUpId && rampUpPiece) {
    candidates.push({
      kitPieceId: rampUpId,
      template: rampUpPiece,
      entrySocketId: "LOC_Socket_In",
      exitSocketId: "LOC_Socket_Out",
      kind: "ramp_up",
      turnSign: 0,
      elevDeltaStep: 1,
      baseLength: 6.0,
    });
  }

  const rampDownPiece = rampDownId ? assetLoader.getPiece(rampDownId) : undefined;
  if (rampDownId && rampDownPiece) {
    candidates.push({
      kitPieceId: rampDownId,
      template: rampDownPiece,
      entrySocketId: "LOC_Socket_In",
      exitSocketId: "LOC_Socket_Out",
      kind: "ramp_down",
      turnSign: 0,
      elevDeltaStep: -1,
      baseLength: 6.0,
    });
  }

  return { teeId, cupId, candidates, rampUpPiece, rampDownPiece };
}
