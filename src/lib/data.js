const stage_one = {
    name: "Stage 1",
    environement: {
        // file:"/scene/default/stage1.glb",
        skybox: "default",
    },
    ground: {shape:"cuboid", position: [0, 0, 0], rotation: [0, 0, 0]},
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "extension", variation: 1, position: [0, 0, -10], rotation: [0, 0, 0]},
    ],
    end: {variation: 1, position: [0, 0, -15], rotation: [0, 0, 0]}
};

const stage_two = {
    name: "Stage 2",
    environement: {
        skybox: "default",
    },
    ground: {shape:"cuboid", position: [0, 0, 0], rotation: [0, 0, 0]},
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "curve", variation: 1, position: [0, 0, -10], rotation: [0, 0, 0]},
        {type: "curve", variation: 1, position: [5, 0, -10], rotation: [0, Math.PI, 0]},
        {type: "extension", variation: 1, position: [5, 0, -15], rotation: [0, 0, 0]},
    ],
    end: {variation: 1, position: [5, 0, -20], rotation: [0, 0, 0]}
};

const stage_three = {
    name: "Stage 3",
    environement: {
        skybox: "default",
    },
    ground: {shape:"cuboid", position: [0, 0, 0], rotation: [0, 0, 0]},
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "extension", variation: 13, position: [0, 0, -10], rotation: [0, Math.PI, 0]},
    ],
    end: {variation: 3, position: [0, 0, -15], rotation: [0, 0, 0]}
};

const stage_four = {
    name: "Stage 4",
    environement: {
        skybox: "default",
    },
    ground: {shape:"cuboid", position: [0, 0, 0], rotation: [0, 0, 0]},
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "extension", variation: 4, position: [0, 0, -10], rotation: [0, 0, 0]},
        {type: "extension", variation: 4, position: [0, 0, -15], rotation: [0, Math.PI, 0]},
        {type: "curve", variation: 1, position: [0, 0, -20], rotation: [0, Math.PI*1.5, 0]},
    ],
    end: {variation: 1, position: [-5, 0, -20], rotation: [0, Math.PI*0.5, 0]}
};

const stage_five = {
    name: "Stage 5",
    environement: {
        skybox: "default",
    },
    ground: {shape:"cuboid", position: [0, 0, 0], rotation: [0, 0, 0]},
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "fork", variation: 1, position: [0, 0, -10], rotation: [0, 0, 0]},
        {type: "slope", variation: 1, position: [-2.5, 0, -15], rotation: [0, 0, 0]},
        {type: "slope", variation: 1, position: [2.5, 0, -15], rotation: [0, 0, 0]},
        {type: "slope", variation: 1, position: [-2.5, 0, -20], rotation: [0, Math.PI, 0]},
        {type: "slope", variation: 1, position: [2.5, 0, -20], rotation: [0, Math.PI, 0]},
        {type: "fork", variation: 1, position: [0, 0, -25], rotation: [0, Math.PI, 0]},
        {type: "extension", variation: 1, position: [0, 0, -30], rotation: [0, 0, 0]},
    ],
    end: {variation: 1, position: [0, 0, -35], rotation: [0, 0, 0]}
};

const stage_six = {
    name: "Stage 6",
    environement: {
        skybox: "default",
    },
    ground: {shape:"cuboid", position: [0, 0, 0], rotation: [0, 0, 0]},
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "slope", variation: 1, position: [0, 0, -10], rotation: [0, 0, 0]},
        {type: "slope", variation: 1, position: [0, 0, -15], rotation: [0, Math.PI, 0]},
        {type: "extension", variation: 6, position: [0, 0, -20], rotation: [0, 0, 0]},
        {type: "curve", variation: 1, position: [0, 0, -25], rotation: [0, 0, 0]},
        {type: "extension", variation: 1, position: [5, 0, -25], rotation: [0, Math.PI*0.5, 0]},
    ],
    end: {variation: 3, position: [10, 0, -25], rotation: [0, Math.PI*1.5, 0]}
};

const stage_seven = {
    name: "Stage 7",
    environement: {
        skybox: "default",
    },
    ground: {shape:"cuboid", position: [0, 0, 0], rotation: [0, 0, 0]},
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "slope", variation: 1, position: [0, 0, -10], rotation: [0, 0, 0]},
        {type: "slope", variation: 1, position: [0, 0, -15], rotation: [0, Math.PI, 0]},
        {type: "curve", variation: 1, position: [0, 0, -20], rotation: [0, Math.PI*1.5, 0]},
        {type: "extension", variation: 8, position: [-5, 0, -20], rotation: [0, Math.PI*0.5, 0]},
        {type: "curve", variation: 1, position: [-10, 0, -20], rotation: [0, 0, 0]},
        {type: "extension", variation: 1, position: [-10, 0, -15], rotation: [0, 0, 0]},
    ],
    end: {variation: 1, position: [-10, 0, -10], rotation: [0, Math.PI, 0]}
};

const stage_eight = {
    name: "Stage 8",
    environement: {
        skybox: "default",
    },
    ground: {shape:"cuboid", position: [0, 0, 0], rotation: [0, 0, 0]},
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "extension", variation: 1, position: [0, 0, -10], rotation: [0, 0, 0]},
        {type: "curve", variation: 1, position: [0, 0, -15], rotation: [0, Math.PI*1.5, 0]},
        {type: "extension", variation: 1, position: [-5, 0, -15], rotation: [0, Math.PI*0.5, 0]},
        {type: "curve", variation: 1, position: [-10, 0, -15], rotation: [0, 0, 0]},
        {type: "extension", variation: 1, position: [-10, 0, -10], rotation: [0, 0, 0]},
        {type: "curve", variation: 1, position: [-10, 0, -5], rotation: [0, Math.PI*0.5, 0]},
        {type: "slope", variation: 1, position: [-5, 0, -5], rotation: [0, Math.PI*1.5, 0]},
        {type: "extension", variation: 10, position: [0, 0.5, -5], rotation: [0, Math.PI*0.5, 0]},
        {type: "slope", variation: 1, position: [5, 0, -5], rotation: [0, Math.PI*0.5, 0]},
        {type: "curve", variation: 1, position: [10, 0, -5], rotation: [0, Math.PI, 0]},
        {type: "extension", variation: 9, position: [10, 0, -10], rotation: [0, 0, 0]},
    ],
    end: {variation: 3, position: [10, 0, -15], rotation: [0, 0, 0]}
};

const stage_nine = {
    name: "Stage 9",
    environement: {
        skybox: "default",
    },
    ground: {shape:"cuboid", position: [0, 0, 0], rotation: [0, 0, 0]},
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "fork", variation: 1, position: [0, 0, -10], rotation: [0, 0, 0]},
        {type: "slope", variation: 1, position: [-2.5, 0, -15], rotation: [0, 0, 0]},
        {type: "extension", variation: 16, position: [2.5, 0, -15], rotation: [0, 0, 0]},
        {type: "slope", variation: 1, position: [-2.5, 0, -20], rotation: [0, Math.PI, 0]},
        {type: "extension", variation: 16, position: [2.5, 0, -20], rotation: [0, 0, 0]},
        {type: "fork", variation: 1, position: [0, 0, -25], rotation: [0, Math.PI, 0]},
        {type: "extension", variation: 1, position: [0, 0, -30], rotation: [0, 0, 0]},
        {type: "extension", variation: 15, position: [0, 0, -30], rotation: [0, 0, 0]},
    ],
    end: {variation: 3, position: [0, 0, -35], rotation: [0, 0, 0]}
};

export const stages = [stage_nine, stage_one, stage_two, stage_three, stage_four, stage_five, stage_six, stage_seven, stage_eight, ];