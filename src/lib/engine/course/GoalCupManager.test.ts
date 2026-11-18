import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { GoalCupManager } from "./GoalCupManager";
import { CUP_DEPTH } from "./GoalCupVisuals";

beforeAll(async () => {
  await RAPIER.init();
});

function setup() {
  const scene = new THREE.Scene();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const cup = new GoalCupManager(scene, world, RAPIER);
  return { scene, world, cup };
}

describe("GoalCupManager", () => {
  it("starts empty", () => {
    const { cup } = setup();
    expect(cup.goalPosition).toBeNull();
    expect(cup.cupBottomPosition).toBeNull();
    expect(cup.goalSensorCollider).toBeNull();
    expect(cup.cupBottomCollider).toBeNull();
  });

  it("places a sunken cup with goal sensor, bottom collider, liner and flag", () => {
    const { scene, cup } = setup();
    cup.place(new THREE.Vector3(2, 1.5, -8));

    expect(cup.goalPosition!.toArray()).toEqual([2, 1.5, -8]);
    expect(cup.cupBottomPosition!.y).toBeCloseTo(1.5 - CUP_DEPTH, 5);

    const sensor = cup.goalSensorCollider!;
    expect(sensor.isSensor()).toBe(true);
    expect(sensor.shapeType()).toBe(RAPIER.ShapeType.Cylinder);
    expect(sensor.radius()).toBeCloseTo(0.425, 3);
    expect(cup.cupBottomCollider).not.toBeNull();

    expect(scene.getObjectByName("Visual_Cup_Cavity")).toBeTruthy();
    const flags = scene.children.filter((c) => c instanceof THREE.Sprite);
    expect(flags).toHaveLength(1);
  });

  it("replaces the previous cup when placed again without leaking scene objects", () => {
    const { scene, world, cup } = setup();
    cup.place(new THREE.Vector3(0, 0, 0));
    const colliderCount = world.colliders.len();
    const childCount = scene.children.length;

    cup.place(new THREE.Vector3(5, 0, 5));
    expect(world.colliders.len()).toBe(colliderCount);
    expect(scene.children.length).toBe(childCount);
    expect(cup.goalPosition!.x).toBe(5);
  });

  it("clear removes colliders, visuals and positions", () => {
    const { scene, world, cup } = setup();
    cup.place(new THREE.Vector3(1, 0, 1));
    cup.clear();

    expect(world.colliders.len()).toBe(0);
    expect(scene.children).toHaveLength(0);
    expect(cup.goalPosition).toBeNull();
    expect(cup.goalSensorCollider).toBeNull();
    expect(cup.cupBottomCollider).toBeNull();
  });
});
