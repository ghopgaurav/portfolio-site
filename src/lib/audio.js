/**
 * Soothing, tactile audio on the Web Audio API — no audio assets.
 * - Warm, lowpass-filtered pentatonic tones with a gentle delay (zen / ASMR).
 * - Soft "tactile" ticks for UI hovers.
 * - A smooth, airy "wind over sand" bed mapped to how much the graphic is
 *   being disturbed (setSandLevel).
 * Everything is wrapped in try/catch so audio can never break the page.
 */

let ctx = null;
let master = null;
let bus = null;          // shared lowpass bus for warmth
let delay = null;
let delayGain = null;
let noiseBuffer = null;
let bedSrc = null;
let bedFilter = null;
let bedGain = null;
let enabled = false;
let lastTactile = 0;
let lastTone = 0;

// C major pentatonic — calm and consonant in any order
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

export function noteFromUnit(u) {
  const i = Math.max(0, Math.min(SCALE.length - 1, Math.floor(u * SCALE.length)));
  return SCALE[i];
}

function makeNoise(c) {
  const len = Math.floor(c.sampleRate * 2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // smoothed = airy, not gritty
    data[i] = last * 2.6;
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

    // warm bus
    bus = ctx.createBiquadFilter();
    bus.type = "lowpass";
    bus.frequency.value = 3200;
    bus.Q.value = 0.3;
    bus.connect(master);

    // gentle space
    delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.3;
    delayGain = ctx.createGain();
    delayGain.gain.value = 0.28;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(bus);

    // airy wind bed
    noiseBuffer = makeNoise(ctx);
    bedSrc = ctx.createBufferSource();
    bedSrc.buffer = noiseBuffer;
    bedSrc.loop = true;
    bedFilter = ctx.createBiquadFilter();
    bedFilter.type = "lowpass";
    bedFilter.frequency.value = 600;
    bedFilter.Q.value = 0.4;
    bedGain = ctx.createGain();
    bedGain.gain.value = 0.0;
    bedSrc.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(master);
    bedSrc.start(0);

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
    master.gain.linearRampToValueAtTime(0.9, now + 0.4);

    // welcome: a soft, slow chord
    tone(SCALE[0], 2.2, 0.4);
    setTimeout(() => tone(SCALE[2], 2.2, 0.32), 140);
    setTimeout(() => tone(SCALE[4], 2.6, 0.28), 300);
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

/** Warm pentatonic tone — zen bell/pad. */
export function tone(freq = SCALE[0], dur = 1.8, vel = 0.5) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  if (t - lastTone < 0.05) return;
  lastTone = t;
  try {
    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2.0; // soft overtone
    const o2g = ctx.createGain();
    o2g.gain.value = 0.18;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;

    const g = ctx.createGain();
    const peak = 0.16 * Math.max(0.15, Math.min(1, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o1.connect(lp);
    o2.connect(o2g);
    o2g.connect(lp);
    lp.connect(g);
    g.connect(bus);
    g.connect(delay);

    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.1);
    o2.stop(t + dur + 0.1);
  } catch (e) {
    /* never crash the UI */
  }
}

/** Soft, short tactile tick for UI hovers. */
export function tactile(vel = 0.4) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  if (t - lastTactile < 0.04) return;
  lastTactile = t;
  try {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 480 + Math.random() * 160;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    const g = ctx.createGain();
    const peak = 0.05 * Math.max(0.1, Math.min(1, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(lp);
    lp.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + 0.12);
  } catch (e) {
    /* noop */
  }
}

/** Continuous disturbance level 0..1 — soft airy wind bed. */
export function setSandLevel(level) {
  if (!enabled || !ctx || !bedGain) return;
  try {
    const v = Math.max(0, Math.min(1, level));
    const now = ctx.currentTime;
    bedGain.gain.setTargetAtTime(v * v * 0.07, now, 0.12);
    bedFilter.frequency.setTargetAtTime(450 + v * 1400, now, 0.15);
  } catch (e) {
    /* noop */
  }
}
