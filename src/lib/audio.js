/**
 * Subtle, cool, futuristic audio on the Web Audio API — no assets, no melody.
 * - A neutral "reactor" drone bed (root + a fifth, no minor thirds) whose
 *   level/brightness tracks how much the energy core is disturbed.
 * - Airy "energy sparks" (filtered noise bursts) on interaction — textural,
 *   not musical, so it never sounds sad or cheesy.
 * - Crisp digital ticks for UI hovers.
 * Everything is wrapped in try/catch so audio can never break the page.
 */

let ctx = null;
let master = null;
let bus = null;
let delay = null;
let noiseBuf = null;
let droneA = null;
let droneB = null;
let droneSub = null;
let droneFilter = null;
let droneGain = null;
let enabled = false;
let lastTick = 0;
let lastSpark = 0;

function makeNoise(c) {
  const len = Math.floor(c.sampleRate * 1.2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    noiseBuf = makeNoise(ctx);

    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    bus = ctx.createBiquadFilter();
    bus.type = "lowpass";
    bus.frequency.value = 6200;
    bus.Q.value = 0.15;
    bus.connect(master);

    // subtle stereo-ish space
    delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.28;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.18;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.25;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(bus);

    // neutral reactor drone — root + fifth (no minor third → not sad)
    droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 150;
    droneFilter.Q.value = 4;
    droneGain = ctx.createGain();
    droneGain.gain.value = 0.0;
    droneFilter.connect(droneGain);
    droneGain.connect(master);

    droneA = ctx.createOscillator();
    droneA.type = "sawtooth";
    droneA.frequency.value = 55.0; // A1
    droneB = ctx.createOscillator();
    droneB.type = "triangle";
    droneB.frequency.value = 82.41; // E2 (a fifth) — neutral, strong
    droneSub = ctx.createOscillator();
    droneSub.type = "sine";
    droneSub.frequency.value = 27.5; // deep sub
    const bGain = ctx.createGain();
    bGain.gain.value = 0.5;
    droneA.connect(droneFilter);
    droneB.connect(bGain);
    bGain.connect(droneFilter);
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

    // power-up: a clean filtered whoosh + drone settling in (no chord)
    droneGain.gain.cancelScheduledValues(now);
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.linearRampToValueAtTime(0.05, now + 0.8);
    droneGain.gain.linearRampToValueAtTime(0.022, now + 2.2);
    whoosh(0.6);
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

/** Clean rising filtered-noise sweep — the "power on" gesture. */
function whoosh(vel = 0.5) {
  if (!ctx || !noiseBuf) return;
  try {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(220, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 * vel, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    src.connect(bp);
    bp.connect(g);
    g.connect(bus);
    src.start(t);
    src.stop(t + 0.75);
  } catch (e) {
    /* noop */
  }
}

/** Airy energy crackle on interaction — textural, cool, never melodic. */
export function spark(intensity = 0.4) {
  if (!enabled || !ctx || !noiseBuf) return;
  const t = ctx.currentTime;
  if (t - lastSpark < 0.05) return;
  lastSpark = t;
  try {
    const v = Math.max(0.08, Math.min(1, intensity));
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = 0.9 + Math.random() * 0.5;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 3.5;
    bp.frequency.value = 1600 + Math.random() * 2600;
    const g = ctx.createGain();
    const peak = 0.035 * v;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16 + v * 0.12);
    src.connect(bp);
    bp.connect(g);
    g.connect(bus);
    g.connect(delay);
    src.start(t);
    src.stop(t + 0.35);
  } catch (e) {
    /* noop */
  }
}

/** Crisp digital tick for UI hovers. */
export function tactile(vel = 0.4) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  if (t - lastTick < 0.04) return;
  lastTick = t;
  try {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 1300 + Math.random() * 500;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 800;
    const g = ctx.createGain();
    const peak = 0.035 * Math.max(0.1, Math.min(1, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(hp);
    hp.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + 0.07);
  } catch (e) {
    /* noop */
  }
}

/** Soft neutral blip (kept for the nav "note" hook). */
export function tone(freq = 440, dur = 0.4, vel = 0.4) {
  if (!enabled || !ctx) return;
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    const peak = 0.05 * Math.max(0.1, Math.min(1, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
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
    droneGain.gain.setTargetAtTime(0.016 + v * v * 0.06, now, 0.1);
    droneFilter.frequency.setTargetAtTime(130 + v * 850, now, 0.12);
  } catch (e) {
    /* noop */
  }
}
