export const themes = {
  clear: {
    name: "Clear Day",
    preset: "apartment", // using apartment HDRI as a bright clear day lighting
    ambientColor: "#ffffff",
    ambientIntensity: 0.6,
    dirColor: "#ffffff",
    dirIntensity: 2.5,
    dirPosition: [20, 30, 20],
    fogColor: "#87CEEB", // sky blue
    fogNear: 20,
    fogFar: 100,
    skyColor: "#87CEEB"
  },
  sunset: {
    name: "Sunset",
    preset: "sunset",
    ambientColor: "#ff9966",
    ambientIntensity: 0.8,
    dirColor: "#ffcc88",
    dirIntensity: 2.0,
    dirPosition: [30, 10, -20],
    fogColor: "#ffaa88",
    fogNear: 15,
    fogFar: 80,
    skyColor: "#ffaa88"
  },
  night: {
    name: "Night",
    preset: "night",
    ambientColor: "#223355",
    ambientIntensity: 0.7,
    dirColor: "#88aaff",
    dirIntensity: 1.5,
    dirPosition: [10, 40, 10],
    fogColor: "#000011",
    fogNear: 10,
    fogFar: 60,
    skyColor: "#000011"
  },
  vaporwave: {
    name: "Vaporwave",
    preset: "city",
    ambientColor: "#aa00ff",
    ambientIntensity: 1.0,
    dirColor: "#00ffff",
    dirIntensity: 2.0,
    dirPosition: [20, 15, 20],
    fogColor: "#ff00ff",
    fogNear: 10,
    fogFar: 60,
    skyColor: "#ff00ff"
  }
};

export const themeOptions = Object.entries(themes).map(([id, config]) => ({
  id,
  name: config.name
}));
