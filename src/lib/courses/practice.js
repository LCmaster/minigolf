export const course = {
  name: "Practice Course",
  holes: [
    {
      par: 2,
      blocks: [
        {
          type: "start",
          variation: 1,
          position: [0, 0, 0],
          rotation: 0,
          locked: true,
        },
        {
          type: "extension",
          variation: 2,
          position: [0, 0, -5],
          rotation: 0,
        },
        {
          type: "extension",
          variation: 2,
          position: [0, 0, -10],
          rotation: 0,
        },
        {
          type: "extension",
          variation: 2,
          position: [0, 0, -15],
          rotation: 0,
        },
        {
          type: "end",
          variation: 1,
          position: [0, 0, -20],
          rotation: 0,
        },
      ],
    },
    {
      par: 2,
      blocks: [
        {
          type: "start",
          variation: 1,
          position: [0, 0, 0],
          rotation: 0,
          locked: true,
        },
        {
          type: "extension",
          variation: 2,
          position: [0, 0, -5],
          rotation: 0,
        },
        {
          type: "curve",
          variation: 2,
          position: [0, 0, -10],
          rotation: 0,
        },
        {
          type: "curve",
          variation: 2,
          position: [5, 0, -10],
          rotation: 1,
        },
        {
          type: "extension",
          variation: 2,
          position: [5, 0, -15],
          rotation: 0,
        },
        {
          type: "end",
          variation: 1,
          position: [5, 0, -20],
          rotation: 0,
        },
      ],
    },
    {
      par: 2,
      blocks: [
        {
          type: "start",
          variation: 1,
          position: [0, 0, 0],
          rotation: 0,
          locked: true,
        },
        {
          type: "extension",
          variation: 2,
          position: [0, 0, -5],
          rotation: 0,
        },
        {
          type: "fork",
          variation: 1,
          position: [0, 0, -10],
          rotation: 0,
        },
        {
          type: "extension",
          variation: 13,
          position: [-2.5, 0, -15],
          rotation: 0,
        },
        {
          type: "extension",
          variation: 6,
          position: [2.5, 0, -15],
          rotation: 0,
        },
        {
          type: "fork",
          variation: 1,
          position: [0, 0, -20],
          rotation: 1,
        },
        {
          type: "extension",
          variation: 5,
          position: [0, 0, -25],
          rotation: 0,
        },
        {
          type: "end",
          variation: 1,
          position: [0, 0, -30],
          rotation: 0,
        },
      ],
    },
    {
      par: 3,
      blocks: [
        {
          type: "start",
          variation: 1,
          position: [0, 0, 0],
          rotation: 0,
          locked: true,
        },
        {
          type: "curve",
          variation: 2,
          position: [-8.75, 0, -10],
          rotation: 1.5,
        },
        {
          type: "end",
          variation: 1,
          position: [8.75, 0, -10],
          rotation: 0.5,
        },
        {
          type: "curve",
          variation: 2,
          position: [0, 0, -15],
          rotation: 0.5,
        },
        {
          type: "curve",
          variation: 2,
          position: [-8.75, 0, -15],
          rotation: 0,
        },
        {
          type: "extension",
          variation: 9,
          position: [-3.75, 0, -10],
          rotation: 0.5,
        },
        {
          type: "extension",
          variation: 9,
          position: [3.75, 0, -10],
          rotation: 1.5,
        },
        {
          type: "extension",
          variation: 1,
          position: [0, 0, -10],
          rotation: 0,
        },
        {
          type: "extension",
          variation: 2,
          position: [-3.75, 0, -15],
          rotation: 0.5,
        },
        {
          type: "extension",
          variation: 15,
          position: [0, 0, -5],
          rotation: 0,
        },
      ],
    },
  ],
};
