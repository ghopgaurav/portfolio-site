/**
 * Tiny shared store for the energy-core physics. The control meter mutates
 * these values; EnergyField reads them directly inside its render loop each
 * frame (no React re-render needed, so it stays smooth).
 */
export const ENERGY_DEFAULTS = {
  rotation: 0.14, // idle rotation speed of the core
  flow: 0.55, // organic turbulence / drift
  reactivity: 1.0, // how strongly the pointer disturbs it
  glow: 1.0, // emission intensity multiplier
};

export const energyParams = { ...ENERGY_DEFAULTS };

export function setEnergyParam(key, value) {
  if (key in energyParams) energyParams[key] = value;
}

export function resetEnergyParams() {
  Object.assign(energyParams, ENERGY_DEFAULTS);
}
