const stage_one = {
    name: "Stage 1",
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "extension", variation: 1, position: [0, 0, -10], rotation: [0, 0, 0]},
    ],
    end: {variation: 1, position: [0, 0, -15], rotation: [0, 0, 0]}
};

const stage_two = {
    name: "Stage 1",
    start: {variation: 1, position: [0, 0, 0], rotation: [0, 0, 0]},
    blocks: [
        {type: "extension", variation: 1, position: [0, 0, -5], rotation: [0, 0, 0]},
        {type: "curve", variation: 1, position: [0, 0, -10], rotation: [0, 0, 0]},
        {type: "curve", variation: 1, position: [5, 0, -10], rotation: [0, Math.PI, 0]},
        {type: "extension", variation: 1, position: [5, 0, -15], rotation: [0, 0, 0]},
    ],
    end: {variation: 1, position: [5, 0, -20], rotation: [0, 0, 0]}
};

export const stages = [stage_one, stage_two];