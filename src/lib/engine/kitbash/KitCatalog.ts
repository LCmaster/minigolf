/**
 * KitCatalog.ts
 * Single source of truth for editor socket-snapping, tile-swapping, hazard, and cup option menus.
 */

export interface KitMenuOption {
  id: string;
  label: string;
  icon: string;
  isTurn?: boolean;
}

const CARNIVAL_SWAP_TRACK_OPTIONS: KitMenuOption[] = [
  { id: "carnival_straight_6m", label: "Straight (6m)", icon: "🟩", isTurn: false },
  { id: "carnival_bridge_pond_6x12", label: "Pond Bridge (12m)", icon: "🌉", isTurn: false },
  { id: "carnival_windmill_6x12", label: "Windmill Gate (12m)", icon: "🎡", isTurn: false },
  { id: "carnival_split_lane_6x12", label: "Carousel Split (12m)", icon: "🎠", isTurn: false },
  { id: "carnival_tunnel_6x6", label: "Funhouse Tunnel (6m)", icon: "🌈", isTurn: false },
  { id: "carnival_ramp_up_15deg_6x6", label: "Ramp Up (+1.5m)", icon: "📈", isTurn: false },
  { id: "carnival_ramp_down_15deg_6x6", label: "Ramp Down (-1.5m)", icon: "📉", isTurn: false },
  { id: "carnival_turn_15deg_rounded", label: "Turn 15°", icon: "↪️", isTurn: true },
  { id: "carnival_turn_30deg_rounded", label: "Turn 30°", icon: "↪️", isTurn: true },
  { id: "carnival_turn_45deg_rounded", label: "Turn 45°", icon: "↗️", isTurn: true },
  { id: "carnival_turn_60deg_rounded", label: "Turn 60°", icon: "↗️", isTurn: true },
  { id: "carnival_turn_75deg_rounded", label: "Turn 75°", icon: "⤴️", isTurn: true },
  { id: "carnival_turn_90deg_rounded", label: "Turn 90°", icon: "⤵️", isTurn: true },
];

const CLASSIC_SWAP_TRACK_OPTIONS: KitMenuOption[] = [
  { id: "straight_6m", label: "Straight (6m)", icon: "➡️", isTurn: false },
  { id: "bridge_overpass_6x12", label: "Bridge (12m)", icon: "🌉", isTurn: false },
  { id: "obstacle_windmill_6x12", label: "Windmill (12m)", icon: "🎡", isTurn: false },
  { id: "ramp_up_15deg_6x6", label: "Ramp Up (+1.5m)", icon: "📈", isTurn: false },
  { id: "ramp_down_15deg_6x6", label: "Ramp Down (-1.5m)", icon: "📉", isTurn: false },
  { id: "turn_30deg_rounded", label: "Turn 30°", icon: "↪️", isTurn: true },
  { id: "turn_45deg_rounded", label: "Turn 45°", icon: "↗️", isTurn: true },
  { id: "turn_60deg_rounded", label: "Turn 60°", icon: "↗️", isTurn: true },
  { id: "turn_90deg_rounded", label: "Turn 90°", icon: "⤵️", isTurn: true },
  { id: "turn_banked_90deg_6x6", label: "Banked 90°", icon: "🎢", isTurn: true },
];

const CARNIVAL_SNAP_OPTIONS: KitMenuOption[] = [
  { id: "carnival_straight_6m", label: "Carnival Straight", icon: "🟩" },
  { id: "carnival_turn_15deg_rounded", label: "Carnival Turn 15°", icon: "↗️" },
  { id: "carnival_turn_30deg_rounded", label: "Carnival Turn 30°", icon: "↗️" },
  { id: "carnival_turn_45deg_rounded", label: "Carnival Turn 45°", icon: "↗️" },
  { id: "carnival_turn_90deg_rounded", label: "Carnival Turn 90°", icon: "⤵️" },
  { id: "carnival_ramp_up_15deg_6x6", label: "Carnival Ramp Up", icon: "📈" },
  { id: "carnival_ramp_down_15deg_6x6", label: "Carnival Ramp Down", icon: "📉" },
  { id: "carnival_bridge_pond_6x12", label: "Pond Bridge (12m)", icon: "🌉" },
  { id: "carnival_windmill_6x12", label: "Windmill Gate (12m)", icon: "🎡" },
  { id: "carnival_split_lane_6x12", label: "Carousel Split (12m)", icon: "🎠" },
  { id: "carnival_tunnel_6x6", label: "Funhouse Tunnel (6m)", icon: "🌈" },
  { id: "carnival_green_cup_6x6", label: "Carnival Cup Green", icon: "⛳" },
];

const CLASSIC_SNAP_OPTIONS: KitMenuOption[] = [
  { id: "straight_6m", label: "Straight (6m)", icon: "➡️" },
  { id: "turn_45deg_rounded", label: "Turn 45°", icon: "↗️" },
  { id: "turn_90deg_rounded", label: "Turn 90°", icon: "⤵️" },
  { id: "turn_banked_90deg_6x6", label: "Banked 90°", icon: "🎢" },
  { id: "ramp_up_15deg_6x6", label: "Ramp Up (1.5m)", icon: "📈" },
  { id: "ramp_down_15deg_6x6", label: "Ramp Down (1.5m)", icon: "📉" },
  { id: "obstacle_windmill_6x12", label: "Windmill Gate", icon: "🎡" },
  { id: "green_cup_standard_6x6", label: "Cup Green", icon: "⛳" },
];

const HAZARD_TILE_OPTIONS: KitMenuOption[] = [
  { id: "hazard_booster_strip_6x3", label: "Booster Strip (3m)", icon: "⚡", isTurn: false },
  { id: "hazard_sand_trap_6x6", label: "Sand Trap (6m)", icon: "🏖️", isTurn: false },
  { id: "hazard_water_channel_6x6", label: "Water Channel (6m)", icon: "🌊", isTurn: false },
];

const CARNIVAL_CUP_OPTIONS: KitMenuOption[] = [
  { id: "carnival_green_cup_6x6", label: "Carnival Cup", icon: "⛳", isTurn: false },
];

const CLASSIC_CUP_OPTIONS: KitMenuOption[] = [
  { id: "green_cup_standard_6x6", label: "Standard Cup", icon: "⛳", isTurn: false },
  { id: "green_cup_funnel_6x6", label: "Funnel Cup", icon: "🕳️", isTurn: false },
];

/** Returns modular track & cup pieces shown in the Radial Socket snap popover for a theme. */
export function getTrackSnapOptions(theme: string): KitMenuOption[] {
  return theme === "carnival_park" ? CARNIVAL_SNAP_OPTIONS : CLASSIC_SNAP_OPTIONS;
}

/** Returns modular track swap pieces shown in the Tile Action popover for a theme. */
export function getTrackSwapOptions(theme: string): KitMenuOption[] {
  return theme === "carnival_park" ? CARNIVAL_SWAP_TRACK_OPTIONS : CLASSIC_SWAP_TRACK_OPTIONS;
}

/** Returns shared hazard tile options (booster strip, sand trap, water channel). */
export function getHazardOptions(): KitMenuOption[] {
  return HAZARD_TILE_OPTIONS;
}

/** Returns Cup green variants available for the active theme. */
export function getCupVariantOptions(theme: string): KitMenuOption[] {
  return theme === "carnival_park" ? CARNIVAL_CUP_OPTIONS : CLASSIC_CUP_OPTIONS;
}

