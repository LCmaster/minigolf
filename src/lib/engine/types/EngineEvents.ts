/**
 * EngineEvents.ts
 * Typed event signatures bridging the pure Three.js/Rapier GameEngine to Svelte 5 UI/HUD.
 */

export type BallPlayState = "aiming" | "moving" | "in_hole" | "out_of_bounds" | "idle";

export interface StrokeEvent {
  holeNumber: number;
  strokeNumber: number;
  power: number; // 0.0 to 1.0
  impulse: [number, number, number];
}

export interface BallMoveEvent {
  position: [number, number, number];
  velocity: [number, number, number];
  speed: number;
}

export interface CupSinkEvent {
  holeNumber: number;
  totalStrokes: number;
  par: number;
  scoreRelative: number; // e.g. -1 for Birdie, 0 for Par, +1 for Bogey
}

export interface OutOfBoundsEvent {
  holeNumber: number;
  reason: "water" | "cliff_fall" | "stuck";
  penaltyApplied: boolean;
  respawnPosition: [number, number, number];
}

export interface TileSelectEvent {
  instanceId: string | null;
  kitPieceId?: string;
  position?: [number, number, number];
  walls?: { left: boolean; right: boolean };
}

export interface SocketClickEvent {
  tileInstanceId: string;
  socketId: string;
  worldPosition: [number, number, number];
  normal: [number, number, number];
  screenX: number;
  screenY: number;
}

export type EngineEventMap = {
  ballStateChange: (state: BallPlayState) => void;
  strokeTaken: (ev: StrokeEvent) => void;
  ballMove: (ev: BallMoveEvent) => void;
  cupSink: (ev: CupSinkEvent) => void;
  outOfBounds: (ev: OutOfBoundsEvent) => void;
  tileSelected: (ev: TileSelectEvent) => void;
  socketClicked: (ev: SocketClickEvent) => void;
  fpsUpdate: (fps: number) => void;
};
