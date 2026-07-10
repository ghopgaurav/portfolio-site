import { useState, useEffect } from "react";
import { energyParams, setEnergyParam, resetEnergyParams, ENERGY_DEFAULTS } from "../lib/energyStore.js";

const SLIDERS = [
  { key: "rotation", label: "Rotation", min: 0, max: 0.6, step: 0.01 },
  { key: "flow", label: "Turbulence", min: 0, max: 1.5, step: 0.01 },
  { key: "reactivity", label: "Reactivity", min: 0, max: 2.2, step: 0.01 },
  { key: "glow", label: "Glow", min: 0.4, max: 1.8, step: 0.01 },
];

export default function EnergyControls() {
  const [vals, setVals] = useState({ ...energyParams });
  const [visible, setVisible] = useState(true);

  // only show the meter while the hero (its target graphic) is on screen
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting && e.intersectionRatio > 0.2),
      { threshold: [0, 0.2, 0.5] }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const update = (key, value) => {
    const v = parseFloat(value);
    setEnergyParam(key, v);
    setVals((s) => ({ ...s, [key]: v }));
  };

  const reset = () => {
    resetEnergyParams();
    setVals({ ...ENERGY_DEFAULTS });
  };

  const pct = (s) => Math.round(((vals[s.key] - s.min) / (s.max - s.min)) * 100);

  return (
    <aside
      className={`core-controls ${visible ? "" : "core-controls--hidden"}`}
      aria-label="Energy core controls"
    >
      <div className="core-controls__head">
        <span className="core-controls__title">Reactor</span>
        <span className="core-controls__dot" aria-hidden="true" />
      </div>
      {SLIDERS.map((s) => (
        <label className="core-ctl" key={s.key}>
          <span className="core-ctl__row">
            <span className="core-ctl__label">{s.label}</span>
            <span className="core-ctl__val">{pct(s)}%</span>
          </span>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={vals[s.key]}
            onChange={(e) => update(s.key, e.target.value)}
            aria-label={s.label}
          />
        </label>
      ))}
      <button className="core-controls__reset" onClick={reset} data-cursor>
        Reset
      </button>
    </aside>
  );
}
