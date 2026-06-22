import { writable } from 'svelte/store';

function createAudioStore() {
  const { subscribe, set } = writable(null);
  let currentAudio = null;

  return {
    subscribe,
    /**
     * Plays a looping audio track, gracefully fading out any currently playing track.
     * @param {string} src The URL/path to the audio file
     */
    play: (src) => {
      if (typeof Audio === 'undefined') return; // SSR check

      // If the same track is already playing, do nothing
      if (currentAudio && currentAudio.src.includes(src)) return;

      const newAudio = new Audio(src);
      newAudio.loop = true;
      newAudio.volume = 0; // Start at 0 for fade in

      const fadeOutOldAndPlayNew = () => {
        if (currentAudio) {
          // Fade out current audio
          const oldAudio = currentAudio;
          let vol = oldAudio.volume;
          const fadeOutInterval = setInterval(() => {
            if (vol > 0.05) {
              vol -= 0.05;
              oldAudio.volume = vol;
            } else {
              clearInterval(fadeOutInterval);
              oldAudio.pause();
              oldAudio.src = ''; // Release memory
            }
          }, 100);
        }

        // Play new audio and fade in
        currentAudio = newAudio;
        set(currentAudio);
        
        currentAudio.play().then(() => {
          let vol = 0;
          const fadeInInterval = setInterval(() => {
            if (vol < 0.4) { // Max volume 0.4 for ambient music
              vol += 0.05;
              if (vol > 0.4) vol = 0.4;
              currentAudio.volume = vol;
            } else {
              clearInterval(fadeInInterval);
            }
          }, 100);
        }).catch(err => {
          console.warn("Audio autoplay prevented by browser. User interaction needed.", err);
        });
      };

      fadeOutOldAndPlayNew();
    },
    
    /**
     * Fades out and stops the currently playing track.
     */
    stop: () => {
      if (currentAudio) {
        const oldAudio = currentAudio;
        let vol = oldAudio.volume;
        const fadeOutInterval = setInterval(() => {
          if (vol > 0.05) {
            vol -= 0.05;
            oldAudio.volume = vol;
          } else {
            clearInterval(fadeOutInterval);
            oldAudio.pause();
            oldAudio.src = '';
            currentAudio = null;
            set(null);
          }
        }, 100);
      }
    }
  };
}

export const bgm = createAudioStore();

function createSfxStore() {
  let rollingAudio = null;

  return {
    /**
     * Plays a one-shot sound effect.
     * @param {string} src Path to the audio file
     * @param {number} volume Volume from 0.0 to 1.0
     */
    play: (src, volume = 1.0) => {
      if (typeof Audio === 'undefined') return;
      const audio = new Audio(src);
      audio.volume = Math.max(0, Math.min(volume, 1.0));
      audio.play().catch(() => {});
    },

    /**
     * Dynamically sets the volume of the rolling sound.
     * If speed is greater than 0, it starts playing if paused.
     * If speed is 0, it pauses.
     * @param {number} speed Velocity/Speed of the ball
     */
    setRollingVolume: (speed) => {
      if (typeof Audio === 'undefined') return;
      if (!rollingAudio) {
        rollingAudio = new Audio("/sounds/rolling.wav");
        rollingAudio.loop = true;
        rollingAudio.volume = 0;
      }

      // Normalize speed (assuming max speed is around 15 for minigolf)
      const targetVolume = Math.min(Math.max((speed - 0.5) / 15, 0), 0.08); // much quieter, only starts if speed > 0.5

      if (targetVolume > 0.01) {
        rollingAudio.volume = targetVolume;
        if (rollingAudio.paused) {
          rollingAudio.play().catch(() => {});
        }
      } else {
        if (!rollingAudio.paused) {
          rollingAudio.pause();
        }
      }
    }
  };
}

export const sfx = createSfxStore();
