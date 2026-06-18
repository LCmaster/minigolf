import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { snapToGrid } from '$lib/gridUtils';

const loader = new GLTFLoader();
const cache = {};

async function getSlots(type, variation) {
  const key = `${type}-${variation}`;
  if (cache[key]) return cache[key];

  const gltf = await loader.loadAsync(`/block/${type}/${variation}.glb`);
  const slots = [];
  gltf.scene.traverse((child) => {
    if (child.isMesh && child.name.toLowerCase().startsWith('slot')) {
      // ignore center/top slots used for items/decorations
      if (Math.abs(child.position.x) > 1 || Math.abs(child.position.z) > 1) {
        slots.push({
          x: child.position.x,
          y: child.position.y,
          z: child.position.z
        });
      }
    }
  });
  cache[key] = slots;
  return slots;
}

export class CourseBuilder {
  constructor(startPosition = [0, 0, 0], startRotation = 0) {
    this.blocks = [];
    this.cursor = {
      position: [...startPosition],
      rotation: startRotation
    };
  }

  async add(type, variation = 1, forceOptions = {}) {
    const id = forceOptions.id || crypto.randomUUID();

    const block = {
      id,
      type,
      variation,
      position: [...this.cursor.position],
      rotation: this.cursor.rotation,
      ...forceOptions
    };
    this.blocks.push(block);

    const slots = await getSlots(type, variation);

    // Try to find a forward-facing slot to snap to
    const forwardSlot = slots.find(s => s.z < -1) || slots.find(s => s.z <= 0);

    if (forwardSlot) {
      this.updateCursor(block, forwardSlot);
    }

    return this;
  }

  updateCursor(block, slot) {
    const angle = -Math.PI * block.rotation;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const dx = slot.x * cosA + slot.z * sinA;
    const dy = slot.y;
    const dz = -slot.x * sinA + slot.z * cosA;

    this.cursor.position[0] = block.position[0] + dx;
    this.cursor.position[1] = block.position[1] + dy;
    this.cursor.position[2] = block.position[2] + dz;

    const rotAngle = Math.atan2(-slot.x, -slot.z);
    let r = rotAngle / -Math.PI;
    if (r < 0) r += 2;

    this.cursor.rotation = (block.rotation + r) % 2;
  }

  async generateRandomCourse(length = 10) {
    this.blocks = [];
    this.cursor = { position: [0, 0, 0], rotation: 0 };

    const middleTypes = [
      { type: "extension", vars: 16 },
      { type: "curve", vars: 2 },
      { type: "slope", vars: 3 },
      { type: "tube", vars: 3 }
    ];

    await this.add("start", 1);

    for (let i = 0; i < length; i++) {
      const randType = middleTypes[Math.floor(Math.random() * middleTypes.length)];
      const randVar = Math.floor(Math.random() * randType.vars) + 1;

      const id = crypto.randomUUID();
      const block = {
        id,
        type: randType.type,
        variation: randVar,
        position: [...this.cursor.position],
        rotation: this.cursor.rotation,
      };
      this.blocks.push(block);

      const slots = await getSlots(randType.type, randVar);

      // Filter out backwards-facing slots
      const validSlots = slots.filter(s => s.z < 2);
      let chosenSlot = validSlots[Math.floor(Math.random() * validSlots.length)];
      if (!chosenSlot) chosenSlot = slots[0];

      this.updateCursor(block, chosenSlot);
    }

    const endId = crypto.randomUUID();
    this.blocks.push({
      id: endId,
      type: "end",
      variation: Math.floor(Math.random() * 3) + 1,
      position: [...this.cursor.position],
      rotation: this.cursor.rotation,
    });

    return this.blocks;
  }

  async extendFromBlock(existingBlocks, startBlockId, length = 5) {
    this.blocks = [...existingBlocks];

    const startBlock = this.blocks.find(b => b.id === startBlockId);
    if (!startBlock) return this.blocks;

    const slots = await getSlots(startBlock.type, startBlock.variation);

    // Filter out backwards-facing slots
    const validSlots = slots.filter(s => s.z < 2);
    let chosenSlot = validSlots[Math.floor(Math.random() * validSlots.length)];
    if (!chosenSlot) chosenSlot = slots[0];

    this.cursor.position = [...startBlock.position];
    this.cursor.rotation = startBlock.rotation;
    this.updateCursor(startBlock, chosenSlot);

    const middleTypes = [
      { type: "extension", vars: 16 },
      { type: "curve", vars: 2 },
      { type: "slope", vars: 3 },
      { type: "tube", vars: 3 }
    ];

    for (let i = 0; i < length; i++) {
      const randType = middleTypes[Math.floor(Math.random() * middleTypes.length)];
      const randVar = Math.floor(Math.random() * randType.vars) + 1;

      const id = crypto.randomUUID();
      const block = {
        id,
        type: randType.type,
        variation: randVar,
        position: [...this.cursor.position],
        rotation: this.cursor.rotation,
      };
      this.blocks.push(block);

      const nextSlots = await getSlots(randType.type, randVar);
      const nextValidSlots = nextSlots.filter(s => s.z < 2);
      let nextChosenSlot = nextValidSlots[Math.floor(Math.random() * nextValidSlots.length)];
      if (!nextChosenSlot) nextChosenSlot = nextSlots[0];

      this.updateCursor(block, nextChosenSlot);
    }

    return this.blocks;
  }

  generateRandomSpline() {
    const points = [];

    let currentX = 0;
    let currentZ = 0;
    let currentAngle = 0;

    // Randomly pick between 3 and 8 control points total
    const numPoints = 3 + Math.floor(Math.random() * 6);

    // Start point – snapped to nearest tile centre
    points.push({
      id: crypto.randomUUID(),
      position: [snapToGrid(currentX), 0, snapToGrid(currentZ)]
    });

    for (let i = 1; i < numPoints; i++) {
      // Pick a random turn angle between -70 and +70 degrees
      const maxTurn = Math.PI * 0.4;
      const turn = (Math.random() * 2 * maxTurn) - maxTurn;
      currentAngle += turn;

      // Pick a variable distance per segment (4 to 12 units)
      const dist = 4 + Math.random() * 8;

      currentX += Math.cos(currentAngle) * dist;
      currentZ -= Math.sin(currentAngle) * dist;

      points.push({
        id: crypto.randomUUID(),
        position: [snapToGrid(currentX), 0, snapToGrid(currentZ)]
      });
    }

    return points;
  }

  build() {
    return this.blocks;
  }
}
