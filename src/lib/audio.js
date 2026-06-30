/**
 * Tiny generative synth built on the Web Audio API — no audio assets.
 * Plays soft, bell-like notes from a pentatonic scale through a low-pass
 * filter and a feedback delay for a futuristic shimmer. Everything is
 * wrapped in try/catch so audio can never break the page.
 */

let ctx = null;
let master = null;
let delay = null;
let feedback = null;
let enabled = false;
let lastNoteAt = 0;

// C minor pentatonic across two octaves — moody but pretty / "cyberpunk".
const SCALE = [
  207.65, 246.94, 277.18, 311.13, 369.99, // G3 B3 C#4 D#4 F#4-ish set
  415.3, 493.88, 554.37, 622.25, 739.99,
];

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    // Shimmer: short feedback delay
    delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.28;
    feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;

    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);

    // expose the delay send on the module scope
    ensureContext._wet = delay;
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
    // fade master in
    const now = c.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.22, now + 0.4);
    // welcome arpeggio
    [0, 2, 4, 6].forEach((i, k) => setTimeout(() => playNote(SCALE[i + 2]), k * 110));
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

/** Play a single soft note. freq optional — defaults to a random scale tone. */
export function playNote(freq) {
  if (!enabled || !ctx) return;
  // light throttle so rapid hovers don't machine-gun
  const t = ctx.currentTime;
  if (t - lastNoteAt < 0.04) return;
  lastNoteAt = t;

  try {
    const f = freq || SCALE[Math.floor(Math.random() * SCALE.length)];

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc2.type = "sine";
    osc.frequency.value = f;
    osc2.frequency.value = f * 2.0; // octave shimmer
    osc2.detune.value = 4;

    lp.type = "lowpass";
    lp.frequency.value = 2600;
    lp.Q.value = 0.7;

    const peak = 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

    osc.connect(g);
    osc2.connect(g);
    g.connect(master);
    if (ensureContext._wet) g.connect(ensureContext._wet);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.95);
    osc2.stop(t + 0.95);
  } catch (e) {
    // never let sound crash the UI
  }
}

/** Map a 0..1 value to a scale note (handy for positional hover pitch). */
export function noteFromUnit(u) {
  const i = Math.max(0, Math.min(SCALE.length - 1, Math.round(u * (SCALE.length - 1))));
  return SCALE[i];
}
