// js/audio.js — Web Audio API synthesizer

const AudioEngine = (() => {
  let ctx = null;
  let muted = false;
  let masterGain = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setMuted(val) {
    muted = val;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
  }

  function isMuted() { return muted; }

  function playTone(freq, type, duration, gainVal = 0.3, startDelay = 0) {
    if (!ctx || muted) return;
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration);
  }

  function playLaserShot() {
    if (!ctx || muted) return;
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  function playWordDestroy() {
    if (!ctx || muted) return;
    resume();
    // Heavy metallic thump
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    src.start(ctx.currentTime);

    // Metallic ring
    playTone(120, 'sine', 0.3, 0.4);
    playTone(80, 'sine', 0.5, 0.3);
  }

  function playRedBonusSpawn() {
    if (!ctx || muted) return;
    resume();
    // High-pitched dual-tone chime
    playTone(1200, 'sine', 0.15, 0.4, 0);
    playTone(1800, 'sine', 0.15, 0.3, 0.08);
    playTone(2400, 'sine', 0.1, 0.2, 0.16);
  }

  function playDamage() {
    if (!ctx || muted) return;
    resume();
    // Low crunch buzz
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 150;
    filter.Q.value = 0.5;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    src.start(ctx.currentTime);
    playTone(60, 'square', 0.2, 0.5);
  }

  function playVictoryFanfare() {
    if (!ctx || muted) return;
    resume();
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    const times = [0, 0.12, 0.24, 0.36, 0.52, 0.64, 0.76];
    notes.forEach((f, i) => {
      playTone(f, 'square', 0.2, 0.35, times[i]);
      playTone(f * 1.5, 'sine', 0.15, 0.2, times[i]);
    });
  }

  function playUIClick() {
    if (!ctx || muted) return;
    resume();
    playTone(800, 'square', 0.05, 0.15);
    playTone(1000, 'square', 0.04, 0.1, 0.03);
  }

  function playCombo() {
    if (!ctx || muted) return;
    resume();
    playTone(600, 'sine', 0.1, 0.3, 0);
    playTone(900, 'sine', 0.1, 0.3, 0.07);
    playTone(1200, 'sine', 0.1, 0.3, 0.14);
  }

  function playGameOver() {
    if (!ctx || muted) return;
    resume();
    playTone(400, 'sawtooth', 0.4, 0.5, 0);
    playTone(300, 'sawtooth', 0.4, 0.5, 0.3);
    playTone(200, 'sawtooth', 0.5, 0.6, 0.6);
    playTone(100, 'sawtooth', 0.6, 0.7, 1.0);
  }

  return { init, resume, setMuted, isMuted, playLaserShot, playWordDestroy,
           playRedBonusSpawn, playDamage, playVictoryFanfare, playUIClick,
           playCombo, playGameOver };
})();
