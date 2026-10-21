/* ==========================================================================
   Sonido ambiental generativo (Web Audio API)
   Un pad cálido con reverb, campanas suaves ocasionales y efectos para cada
   interacción. Todo se sintetiza en el navegador: no hay archivos de audio.
   ========================================================================== */

window.Sound = (() => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const MASTER_LEVEL = 0.55;

  // Re mayor: acordes abiertos y luminosos (notas MIDI)
  const CHORDS = [
    [38, 50, 57, 61, 64, 66], // Dmaj9
    [35, 47, 54, 57, 61, 62], // Bm9
    [31, 43, 50, 54, 57, 59], // Gmaj7
    [33, 45, 52, 57, 59, 64], // Asus2
  ];
  const PENTA = [74, 76, 78, 81, 83, 86, 88, 90];

  let ctx = null;
  let master = null;
  let dry = null;
  let reverb = null;
  let enabled = false;
  let padTimer = null;
  let sparkleTimer = null;
  let chordIndex = 0;

  const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function impulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  function init() {
    if (ctx || !AudioCtx) return Boolean(ctx);
    ctx = new AudioCtx();

    master = ctx.createGain();
    master.gain.value = 0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;

    const tone = ctx.createBiquadFilter();
    tone.type = "highshelf";
    tone.frequency.value = 5000;
    tone.gain.value = -6;

    master.connect(tone).connect(comp).connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = impulse(4, 2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    reverb.connect(wet).connect(master);

    dry = ctx.createGain();
    dry.gain.value = 0.55;
    dry.connect(master);
    return true;
  }

  function padNote(note, start, duration, volume) {
    const f = freq(note);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(volume, start + 3);
    env.gain.setValueAtTime(volume, start + duration - 2.5);
    env.gain.linearRampToValueAtTime(0, start + duration + 2);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = note < 45 ? 380 : 1100;
    lp.Q.value = 0.4;

    const voices = [
      { type: "sine", detune: 0, gain: 0.7 },
      { type: "triangle", detune: -7, gain: 0.22 },
      { type: "triangle", detune: 7, gain: 0.22 },
    ];
    voices.forEach((v) => {
      const osc = ctx.createOscillator();
      osc.type = v.type;
      osc.frequency.value = f;
      osc.detune.value = v.detune;
      const g = ctx.createGain();
      g.gain.value = v.gain;
      osc.connect(g).connect(lp);
      osc.start(start);
      osc.stop(start + duration + 2.5);
    });

    lp.connect(env);
    env.connect(dry);
    env.connect(reverb);
  }

  function playChord() {
    if (!enabled) return;
    const now = ctx.currentTime + 0.05;
    const chord = CHORDS[chordIndex % CHORDS.length];
    chord.forEach((n, i) => padNote(n, now + i * 0.12, 10, i === 0 ? 0.05 : 0.028));
    chordIndex++;
    padTimer = setTimeout(playChord, 8500);
  }

  function bell(note, when, volume = 0.06, decay = 2.6) {
    const f = freq(note);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(volume, when + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, when + decay);

    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = f * 2.01;
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    const o3 = ctx.createOscillator();
    o3.type = "sine";
    o3.frequency.value = f * 3.98;
    const g3 = ctx.createGain();
    g3.gain.value = 0.06;

    o1.connect(env);
    o2.connect(g2).connect(env);
    o3.connect(g3).connect(env);
    env.connect(dry);
    env.connect(reverb);

    [o1, o2, o3].forEach((o) => {
      o.start(when);
      o.stop(when + decay + 0.1);
    });
  }

  function sparkle() {
    if (!enabled) return;
    const note = PENTA[Math.floor(Math.random() * 5)];
    bell(note, ctx.currentTime + 0.05, 0.025, 3.2);
    sparkleTimer = setTimeout(sparkle, 3500 + Math.random() * 5000);
  }

  function fadeTo(value, seconds) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(value, now + seconds);
  }

  function enable() {
    if (!init()) return false;
    if (ctx.state === "suspended") ctx.resume();
    if (enabled) return true;
    enabled = true;
    fadeTo(MASTER_LEVEL, 3);
    clearTimeout(padTimer);
    clearTimeout(sparkleTimer);
    playChord();
    sparkleTimer = setTimeout(sparkle, 2500);
    return true;
  }

  function disable() {
    if (!ctx || !enabled) return;
    enabled = false;
    clearTimeout(padTimer);
    clearTimeout(sparkleTimer);
    fadeTo(0, 1.2);
  }

  // Efectos (solo suenan con el sonido activado)
  function chime(step = 0) {
    if (!enabled) return;
    const now = ctx.currentTime + 0.02;
    const base = PENTA[step % PENTA.length];
    bell(base, now, 0.09, 2.8);
    bell(base + 7, now + 0.09, 0.035, 2.4);
  }

  function bloom() {
    if (!enabled) return;
    const now = ctx.currentTime + 0.02;
    [74, 78, 81, 86, 90].forEach((n, i) => bell(n, now + i * 0.13, 0.07, 3.4));
  }

  function tap() {
    if (!enabled) return;
    bell(93, ctx.currentTime + 0.01, 0.02, 0.7);
  }

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (enabled) ctx.resume();
  });

  return {
    enable,
    disable,
    chime,
    bloom,
    tap,
    get enabled() {
      return enabled;
    },
    get supported() {
      return Boolean(AudioCtx);
    },
  };
})();
