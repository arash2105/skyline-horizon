// Procedural sound, no audio files: the engine is a filtered sawtooth whose pitch
// follows the throttle, the wind is looped noise, and the ring, crash and landing
// sounds are short synthesized notes. The context is created on the first user
// gesture, so a screenshot scene stays silent.

export function createAudio() {
  let context = null;
  let engine = null;
  let engineGain = null;
  let windGain = null;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      engine = context.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 60;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engine.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engine.start();
      const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
      const wind = context.createBufferSource();
      wind.buffer = noise;
      wind.loop = true;
      const windFilter = context.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 500;
      windGain = context.createGain();
      windGain.gain.value = 0;
      wind.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(context.destination);
      wind.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, startAt, duration, volume) {
    if (context === null) return;
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime + startAt);
    gain.gain.linearRampToValueAtTime(volume, context.currentTime + startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime + startAt);
    oscillator.stop(context.currentTime + startAt + duration + 0.05);
  }

  return {
    /** Call from a user gesture: unlocks the sound. */
    unlock() {
      if (ensure() && context.state === 'suspended') void context.resume();
    },
    /** Every frame: the engine and wind follow the throttle and the speed. */
    update(throttle, speed) {
      if (context === null) return;
      engine.frequency.value = 55 + throttle * 75 + speed * 0.12;
      engineGain.gain.value = 0.03 + throttle * 0.05;
      windGain.gain.value = Math.min(0.06, speed * 0.0002);
    },
    ring() {
      if (context === null) return;
      tone(880, 0, 0.35, 0.12);
      tone(1318, 0.08, 0.4, 0.1);
    },
    crash() {
      if (context === null) return;
      tone(70, 0, 0.5, 0.2);
      tone(45, 0.05, 0.6, 0.18);
    },
    land() {
      if (context === null) return;
      tone(523, 0, 0.25, 0.12);
      tone(659, 0.12, 0.25, 0.12);
      tone(784, 0.24, 0.4, 0.12);
    },
  };
}
