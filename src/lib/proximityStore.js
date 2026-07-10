/**
 * Shared reaction state between the cursor and the energy core.
 *  - value: 0..1 how deep the pointer is inside the core's reactive zone
 *    (0 = outside, 1 = dead centre). Drives graphic reactivity, sound, and
 *    the page "crash" distortion.
 *  - cx, cy: core centre in screen coordinates (px).
 *  - inView: whether the core is currently on screen.
 * ReactionController writes this every frame; EnergyField reads it in its loop.
 */
export const proximity = {
  value: 0,
  cx: 0,
  cy: 0,
  inView: false,
};
