import { describe, it, expect } from "vitest";
import { get } from "svelte/store";
import { createGameStores, GameState } from "../src/lib/stores/game";
import type { Course } from "../src/lib/types/course";

describe("GameStores Unit Tests", () => {
  it("initializes with default null and IDLE states", () => {
    const stores = createGameStores();

    expect(get(stores.course)).toBeNull();
    expect(get(stores.current)).toBeNull();
    expect(get(stores.shots)).toBeNull();
    expect(get(stores.state)).toBe(GameState.IDLE);
  });

  it("updates and subscribes to state transitions", () => {
    const stores = createGameStores();

    stores.state.set(GameState.AIMING);
    expect(get(stores.state)).toBe(GameState.AIMING);

    stores.state.set(GameState.ROLLING);
    expect(get(stores.state)).toBe(GameState.ROLLING);

    stores.state.set(GameState.HOLED_OUT);
    expect(get(stores.state)).toBe(GameState.HOLED_OUT);

    stores.state.set(GameState.SCOREBOARD);
    expect(get(stores.state)).toBe(GameState.SCOREBOARD);
  });

  it("manages course progress and shot recording", () => {
    const stores = createGameStores();
    const mockCourse: Course = {
      id: "test_course",
      name: "Mini Test Course",
      par: 2,
      holes: [
        { par: 2, controlPoints: [], blocks: [] },
        { par: 3, controlPoints: [], blocks: [] },
      ],
    };

    // Start game
    stores.course.set(mockCourse);
    stores.current.set(0);
    stores.shots.set([0, 0]);

    expect(get(stores.course)?.name).toBe("Mini Test Course");
    expect(get(stores.current)).toBe(0);

    // Record stroke on hole 0
    stores.shots.update((arr) => {
      if (!arr) return [1, 0];
      const copy = [...arr];
      copy[0] += 1;
      return copy;
    });

    expect(get(stores.shots)?.[0]).toBe(1);

    // Advance to hole 1
    stores.current.set(1);
    expect(get(stores.current)).toBe(1);

    // Record 2 strokes on hole 1
    stores.shots.update((arr) => {
      const copy = [...(arr || [0, 0])];
      copy[1] += 2;
      return copy;
    });

    expect(get(stores.shots)).toEqual([1, 2]);
  });
});

