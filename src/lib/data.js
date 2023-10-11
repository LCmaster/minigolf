const stage_one = {
  name: "Hole 1",
  par: 2,
  environement: {
    // file:"/scene/default/stage1.glb",
    skybox: "default",
  },
  ground: { shape: "cuboid", position: [0, 0, 0], rotation: [0, 0, 0] },

  blocks: [
    { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -5],
      rotation: 0,
    },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -10],
      rotation: 0,
    },
    { type: "end", variation: 1, position: [0, 0, -15], rotation: 0 },
  ],
};

const stage_two = {
  name: "Hole 2",
  par: 2,
  environement: {
    skybox: "default",
  },
  ground: { shape: "cuboid", position: [0, 0, 0], rotation: [0, 0, 0] },
  blocks: [
    { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -5],
      rotation: 0,
    },
    { type: "curve", variation: 1, position: [0, 0, -10], rotation: 0 },
    {
      type: "curve",
      variation: 1,
      position: [5, 0, -10],
      rotation: 1,
    },
    {
      type: "extension",
      variation: 1,
      position: [5, 0, -15],
      rotation: 0,
    },
    { type: "end", variation: 1, position: [5, 0, -20], rotation: 0 },
  ],
};

const stage_three = {
  name: "Hole 3",
  par: 2,
  environement: {
    skybox: "default",
  },
  ground: { shape: "cuboid", position: [0, 0, 0], rotation: [0, 0, 0] },
  blocks: [
    { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -5],
      rotation: 0,
    },
    {
      type: "extension",
      variation: 13,
      position: [0, 0, -10],
      rotation: 1,
    },
    { type: "end", variation: 3, position: [0, 0, -15], rotation: 0 },
  ],
};

const stage_four = {
  name: "Hole 4",
  par: 2,
  environement: {
    skybox: "default",
  },
  ground: { shape: "cuboid", position: [0, 0, 0], rotation: [0, 0, 0] },
  blocks: [
    { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -5],
      rotation: 0,
    },
    {
      type: "extension",
      variation: 4,
      position: [0, 0, -10],
      rotation: 0,
    },
    {
      type: "extension",
      variation: 4,
      position: [0, 0, -15],
      rotation: 1,
    },
    {
      type: "curve",
      variation: 3,
      position: [0, 0, -20],
      rotation: 1.5,
    },
    {
      type: "end",
      variation: 1,
      position: [-5, 0, -20],
      rotation: 0.5,
    },
  ],
};

const stage_five = {
  name: "Hole 5",
  par: 2,
  environement: {
    skybox: "default",
  },
  ground: { shape: "cuboid", position: [0, 0, 0], rotation: [0, 0, 0] },
  blocks: [
    { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -5],
      rotation: 0,
    },
    { type: "fork", variation: 1, position: [0, 0, -10], rotation: 0 },
    {
      type: "slope",
      variation: 1,
      position: [-2.5, 0, -15],
      rotation: 0,
    },
    {
      type: "slope",
      variation: 1,
      position: [2.5, 0, -15],
      rotation: 0,
    },
    {
      type: "slope",
      variation: 1,
      position: [-2.5, 0, -20],
      rotation: 1,
    },
    {
      type: "slope",
      variation: 1,
      position: [2.5, 0, -20],
      rotation: 1,
    },
    {
      type: "fork",
      variation: 1,
      position: [0, 0, -25],
      rotation: 1,
    },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -30],
      rotation: 0,
    },
    { type: "end", variation: 1, position: [0, 0, -35], rotation: 0 },
  ],
};

const stage_six = {
  name: "Hole 6",
  par: 2,
  environement: {
    skybox: "default",
  },
  ground: { shape: "cuboid", position: [0, 0, 0], rotation: [0, 0, 0] },
  blocks: [
    { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -5],
      rotation: 0,
    },
    { type: "slope", variation: 1, position: [0, 0, -10], rotation: 0 },
    {
      type: "slope",
      variation: 1,
      position: [0, 0, -15],
      rotation: 1,
    },
    {
      type: "extension",
      variation: 6,
      position: [0, 0, -20],
      rotation: 0,
    },
    { type: "curve", variation: 3, position: [0, 0, -25], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [5, 0, -25],
      rotation: 0.5,
    },
    {
      type: "end",
      variation: 1,
      position: [10, 0, -25],
      rotation: 1.5,
    },
  ],
};

const stage_seven = {
  name: "Hole 7",
  par: 2,
  environement: {
    skybox: "default",
  },
  ground: { shape: "cuboid", position: [0, 0, 0], rotation: [0, 0, 0] },
  blocks: [
    { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -5],
      rotation: 0,
    },
    { type: "slope", variation: 1, position: [0, 0, -10], rotation: 0 },
    {
      type: "slope",
      variation: 1,
      position: [0, 0, -15],
      rotation: 1,
    },
    {
      type: "curve",
      variation: 1,
      position: [0, 0, -20],
      rotation: 1.5,
    },
    {
      type: "extension",
      variation: 8,
      position: [-5, 0, -20],
      rotation: 0.5,
    },
    {
      type: "curve",
      variation: 1,
      position: [-10, 0, -20],
      rotation: 0,
    },
    {
      type: "extension",
      variation: 1,
      position: [-10, 0, -15],
      rotation: 0,
    },
    {
      type: "end",
      variation: 1,
      position: [-10, 0, -10],
      rotation: 1,
    },
  ],
};

const stage_eight = {
  name: "Hole 8",
  par: 2,
  environement: {
    skybox: "default",
  },
  ground: { shape: "cuboid", position: [0, 0, 0], rotation: [0, 0, 0] },
  blocks: [
    { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -5],
      rotation: 0,
    },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -10],
      rotation: 0,
    },
    {
      type: "curve",
      variation: 1,
      position: [0, 0, -15],
      rotation: 1.5,
    },
    {
      type: "extension",
      variation: 1,
      position: [-5, 0, -15],
      rotation: 0.5,
    },
    {
      type: "curve",
      variation: 1,
      position: [-10, 0, -15],
      rotation: 0,
    },
    {
      type: "extension",
      variation: 1,
      position: [-10, 0, -10],
      rotation: 0,
    },
    {
      type: "curve",
      variation: 1,
      position: [-10, 0, -5],
      rotation: 0.5,
    },
    {
      type: "slope",
      variation: 1,
      position: [-5, 0, -5],
      rotation: 1.5,
    },
    {
      type: "extension",
      variation: 10,
      position: [0, 0.5, -5],
      rotation: 0.5,
    },
    {
      type: "slope",
      variation: 1,
      position: [5, 0, -5],
      rotation: 0.5,
    },
    {
      type: "curve",
      variation: 1,
      position: [10, 0, -5],
      rotation: 1,
    },
    {
      type: "extension",
      variation: 9,
      position: [10, 0, -10],
      rotation: 0,
    },
    { type: "end", variation: 3, position: [10, 0, -15], rotation: 0 },
  ],
};

const stage_nine = {
  name: "Hole 9",
  par: 2,
  environement: {
    skybox: "default",
  },
  ground: { shape: "cuboid", position: [0, 0, 0], rotation: 0 },
  blocks: [
    { type: "start", variation: 1, position: [0, 0, 0], rotation: 0 },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -5],
      rotation: 0,
    },
    { type: "fork", variation: 1, position: [0, 0, -10], rotation: 0 },
    {
      type: "slope",
      variation: 1,
      position: [-2.5, 0, -15],
      rotation: 0,
    },
    {
      type: "extension",
      variation: 16,
      position: [2.5, 0, -15],
      rotation: 0,
    },
    {
      type: "slope",
      variation: 1,
      position: [-2.5, 0, -20],
      rotation: 1,
    },
    {
      type: "extension",
      variation: 16,
      position: [2.5, 0, -20],
      rotation: 0,
    },
    {
      type: "fork",
      variation: 1,
      position: [0, 0, -25],
      rotation: 1,
    },
    {
      type: "extension",
      variation: 1,
      position: [0, 0, -30],
      rotation: 0,
    },
    {
      type: "extension",
      variation: 15,
      position: [0, 0, -30],
      rotation: 0,
    },
    { type: "end", variation: 3, position: [0, 0, -35], rotation: 0 },
  ],
};

export const stages = [
  stage_one,
  stage_two,
  stage_three,
  stage_four,
  stage_five,
  stage_six,
  stage_seven,
  stage_eight,
  stage_nine,
];
