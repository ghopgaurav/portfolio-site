/**
 * Granular "sand" audio on the Web Audio API — no audio assets.
 * - A continuous filtered-noise bed whose level/brightness maps to how much
 *   the sand is being disturbed (setSandLevel).
 * - Short grain bursts for discrete hovers/ticks (sandBurst).
 * Everything is wrapped in try/catch so audio can never break the page.
 */

let ctx = null;
let master = null;
let noiseBuffer = null;
let bedSrc = null;
let bedFilter = null;
let bedGain = null;
let enabled = false;
let lastBurst = 0;

const BED_MAX = 0.16;

function makeNoise(c) {
  const len = Math.floor(c.sampleRate * 2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    // slightly brown-ish noise: smoother, more "sandy" than pure white
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.0 + white * 0.4;
  }
  return buf;
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

    noiseBuffer = makeNoise(ctx);

    // Continuous sand bed
    bedSrc = ctx.createBufferSource();
    bedSrc.buffer = noiseBuffer;
    bedSrc.loop = true;

    bedFilter = ctx.createBiquadFilter();
    bedFilter.type = "bandpass";
    bedFilter.frequency.value = 900;
    bedFilter.Q.value = 0.6;

    bedGain = ctx.createGain();
    bedGain.gain.value = 0.0;

    bedSrc.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(master);
    bedSrc.start(0);

    return ctx;
  } catch (e) {
    console.warn("[audio] context init failed", e);
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
    master.gain.linearRampToValueAtTime(1.0, now + 0.4);

    // welcome: a soft sand swell
    bedGain.gain.cancelScheduledValues(now);
    bedGain.gain.setValueAtTime(0.0001, now);
    bedGain.gain.linearRampToValueAtTime(BED_MAX, now + 0.5);
    bedGain.gain.linearRampToValueAtTime(0.0, now + 1.6);
    sandBurst(0.6);
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
    master.gain.linearRampToValueAtTime(0.0, now + 0.25);
  }
}

/** Continuous disturbance level, 0..1 — drives the sand bed loudness/brightness. */
export function setSandLevel(level) {
  if (!enabled || !ctx || !bedGain) return;
  try {
    const v = Math.max(0, Math.min(1, level));
    const now = ctx.currentTime;
    const target = v * v * BED_MAX;
    bedGain.gain.setTargetAtTime(target, now, 0.08);
    bedFilter.frequency.setTargetAtTime(700 + v * 2600, now, 0.1);
  } catch (e) {
    /* noop */
  }
}

/** A single grain burst — for hovers/ticks. intensity 0..1. */
export function sandBurst(intensity = 0.5) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  if (t - lastBurst < 0.03) return;
  lastBurst = t;
  try {
    const i = Math.max(0.1, Math.min(1, intensity));
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    // start at a random offset for variation
    const offset = Math.random() * 1.5;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1600 + Math.random() * 2600;
    bp.Q.value = 0.9;

    const g = ctx.createGain();
    const peak = 0.09 * i;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16 + i * 0.12);

    src.connect(bp);
    bp.connect(g);
    g.connect(master);

    src.start(t, offset);
    src.stop(t + 0.4);
  } catch (e) {
    /* never let sound crash the UI */
  }
}
