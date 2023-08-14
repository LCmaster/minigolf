// place files you want to import through the `$lib` alias in this folder.
import initAssetManager from "$lib/assets.js";
import initAudioEngine from "$lib/audio.js";
import initRenderingEngine from "$lib/graphics.js";
import initPhysicsEngine from "$lib/physics.js";
import Game from "$lib/game.js";

export {
  initRenderingEngine,
  initPhysicsEngine,
  initAssetManager,
  initAudioEngine,
  Game,
};
