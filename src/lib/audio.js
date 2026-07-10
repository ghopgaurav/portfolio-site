/**
 * Futuristic / dystopian audio on the Web Audio API — no audio assets.
 * - A cold "reactor" drone bed whose level/brightness maps to the energy core
 *   being disturbed (setEnergyLevel).
 * - Crystalline, glassy tones (whole-tone scale) with shimmer on interaction.
 * - Crisp digital ticks for UI hovers.
 * Everything is wrapped in try/catch so audio can never break the page.
 */

let ctx = null;
let master = null;
let bus = null;
let delay = null;
let delayGain = null;
let droneA = null;
let droneB = null;
let droneSub = null;
let droneFilter = null;
let droneGain = null;
let enabled = false;
let lastTactile = 0;
let lastTone = 0;

// E whole-tone — dreamy, cold, futuristic in any order
const SCALE = [329.63, 369.99, 415.3, 466.16, 523.25, 587.33, 659.25, 739.99];

export function noteFromUnit(u) {
  const i = Math.max(0, Math.min(SCALE.length - 1, Math.floor(u * SCALE.length)));
  return SCALE[i];
}

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    bus = ctx.createBiquadFilter();
    bus.type = "lowpass";
    bus.frequency.value = 5200;
    bus.Q.value = 0.2;
    bus.connect(master);

    // shimmer / space
    delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.36;
    delayGain = ctx.createGain();
    delayGain.gain.value = 0.32;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.36;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(bus);

    // cold reactor drone — two detuned saws + a sub sine
    droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 140;
    droneFilter.Q.value = 6;
    droneGain = ctx.createGain();
    droneGain.gain.value = 0.0;
    droneFilter.connect(droneGain);
    droneGain.connect(master);

    droneA = ctx.createOscillator();
    droneA.type = "sawtooth";
    droneA.frequency.value = 82.41; // E2
    droneB = ctx.createOscillator();
    droneB.type = "sawtooth";
    droneB.frequency.value = 82.41 * 1.006; // detune → slow beating
    droneSub = ctx.createOscillator();
    droneSub.type = "sine";
    droneSub.frequency.value = 41.2; // E1 sub
    droneA.connect(droneFilter);
    droneB.connect(droneFilter);
    droneSub.connect(droneFilter);
    droneA.start(0);
    droneB.start(0);
    droneSub.start(0);

    return ctx;
  } catch (e) {
    console.warn("[audio] init failed", e);
    return null;
  }
}

export function isEnabled() {
  return enabled;
}

export async function enableAudio() {
  const c = ensureContext();
  if (!c) return false;
  try {
    if (c.state === "suspended") await c.resume();
    enabled = true;
    const now = c.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.9, now + 0.5);

    // power-up: reactor swell + crystalline chord
    droneGain.gain.cancelScheduledValues(now);
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.linearRampToValueAtTime(0.05, now + 0.9);
    droneGain.gain.linearRampToValueAtTime(0.02, now + 2.2);
    tone(SCALE[0], 2.6, 0.34);
    setTimeout(() => tone(SCALE[3], 2.6, 0.28), 160);
    setTimeout(() => tone(SCALE[5], 3.0, 0.24), 340);
    return true;
  } catch (e) {
    console.warn("[audio] enable failed", e);
    return false;
  }
}

export function disableAudio() {
  enabled = false;
  if (ctx && master) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0, now + 0.3);
  }
}

/** Crystalline, glassy tone with shimmer. */
export function tone(freq = SCALE[0], dur = 2.0, vel = 0.5) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  if (t - lastTone < 0.05) return;
  lastTone = t;
  try {
    const partials = [
      { m: 1.0, g: 1.0, type: "sine" },
      { m: 2.0, g: 0.28, type: "sine" },
      { m: 3.01, g: 0.16, type: "sine" }, // slightly inharmonic → glassy
    ];
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;

    const g = ctx.createGain();
    const peak = 0.14 * Math.max(0.12, Math.min(1, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const oscs = partials.map((pt) => {
      const o = ctx.createOscillator();
      o.type = pt.type;
      o.frequency.value = freq * pt.m;
      const og = ctx.createGain();
      og.gain.value = pt.g;
      o.connect(og);
      og.connect(lp);
      return o;
    });
    lp.connect(g);
    g.connect(bus);
    g.connect(delay);

    oscs.forEach((o) => {
      o.start(t);
      o.stop(t + dur + 0.1);
    });
  } catch (e) {
    /* never crash the UI */
  }
}

/** Crisp digital tick for UI hovers. */
export function tactile(vel = 0.4) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  if (t - lastTactile < 0.04) return;
  lastTactile = t;
  try {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 1100 + Math.random() * 500;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 700;
    const g = ctx.createGain();
    const peak = 0.04 * Math.max(0.1, Math.min(1, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(hp);
    hp.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + 0.08);
  } catch (e) {
    /* noop */
  }
}

/** Energy disturbance 0..1 — drives the reactor drone. */
export function setEnergyLevel(level) {
  if (!enabled || !ctx || !droneGain) return;
  try {
    const v = Math.max(0, Math.min(1, level));
    const now = ctx.currentTime;
    droneGain.gain.setTargetAtTime(0.015 + v * v * 0.07, now, 0.1);
    droneFilter.frequency.setTargetAtTime(120 + v * 900, now, 0.12);
  } catch (e) {
    /* noop */
  }
}
