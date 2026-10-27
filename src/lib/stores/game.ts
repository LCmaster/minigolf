/**
 * Typed game state factory for the active play session.
 *
 * Usage: consumed exclusively through the Context API in routes/game/context.js.
 * Do not import these stores globally — game state is route-scoped.
 *
 * - `course`      The active Course object (null = no game in progress)
 * - `current`     Index of the current hole (0-based)
 * - `shots`       Array of shot counts, one entry per hole
 * - `state`       The current game state (IDLE, AIMING, ROLLING, etc.)
 */

export enum GameState {
  IDLE = 'IDLE',
  AIMING = 'AIMING',
  ROLLING = 'ROLLING',
  OUT_OF_BOUNDS = 'OUT_OF_BOUNDS',
  HOLED_OUT = 'HOLED_OUT',
  COURSE_COMPLETE = 'COURSE_COMPLETE',
  SCOREBOARD = 'SCOREBOARD'
}

import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { Course } from '$lib/types/course';

export interface GameStores {
  course: Writable<Course | null>;
  current: Writable<number | null>;
  shots: Writable<number[] | null>;
  state: Writable<GameState>;
}

export function createGameStores(): GameStores {
  return {
    course: writable<Course | null>(null),
    current: writable<number | null>(null),
    shots: writable<number[] | null>(null),
    state: writable<GameState>(GameState.IDLE),
  };
}
