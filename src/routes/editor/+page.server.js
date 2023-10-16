export function load() {
  const types = ["extension", "curve", "slope", "end"];
  const rotations = { 0: 0, 90: 0.5, 180: 1, 270: 1.5 };
  const extensions = [...new Array(18).keys()].map((index) => {
    return { type: "extension", variation: index + 1 };
  });
  const curves = [...new Array(4).keys()].map((index) => {
    return { type: "curve", variation: index + 1 };
  });
  const slopes = [...new Array(2).keys()].map((index) => {
    return { type: "slope", variation: index + 1 };
  });
  const ends = [...new Array(3).keys()].map((index) => {
    return { type: "end", variation: index + 1 };
  });
  const blocks = [...extensions, ...curves, ...slopes, ...ends];
  return {
    types,
    rotations,
    blocks,
  };
}
