export function load() {
  const types = ["end", "extension", "curve", "slope", "fork", "tube"];
  const rotations = { 0: 0, 90: 0.5, 180: 1, 270: 1.5 };
  const extensions = [...new Array(2).keys()].map((index) => {
    return { type: "extension", variation: index + 1 };
  });
  const curves = [...new Array(2).keys()].map((index) => {
    return { type: "curve", variation: index + 1 };
  });
  const slopes = [...new Array(3).keys()].map((index) => {
    return { type: "slope", variation: index + 1 };
  });
  const forks = [...new Array(1).keys()].map((index) => {
    return { type: "fork", variation: index + 1 };
  });
  const tubes = [...new Array(3).keys()].map((index) => {
    return { type: "tube", variation: index + 1 };
  });
  const ends = [...new Array(1).keys()].map((index) => {
    return { type: "end", variation: index + 1 };
  });
  const blocks = [
    ...ends,
    ...extensions,
    ...curves,
    ...slopes,
    ...forks,
    ...tubes,
  ];
  return {
    types,
    rotations,
    blocks,
  };
}
