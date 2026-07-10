import { useEffect, useRef } from "react";

/**
 * A fixed canvas behind the content that emits glowing amber "embers" from any
 * element marked [data-embers] (e.g. the work rows). The lights rise and
 * disperse with simple physics — buoyancy, drag, turbulence — then fade, so the
 * section's glow feels like it naturally scatters into the dark background.
 */
const MAX = 420;

export default function EmberField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const particles = [];
    let raf = 0;
    let hadParticles = false;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (x, y, n) => {
      for (let i = 0; i < n && particles.length < MAX; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.5; // mostly upward
        const spd = 0.2 + Math.random() * 0.7;
        particles.push({
          x: x + (Math.random() - 0.5) * 26,
          y: y + (Math.random() - 0.5) * 14,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.2,
          life: 0,
          max: 1400 + Math.random() * 1400,
          size: 1 + Math.random() * 2.4,
          seed: Math.random() * 6.283,
          warm: Math.random(), // shift between amber and hot amber
        });
      }
    };

    // emit while the pointer is over a [data-embers] region
    let last = 0;
    const onMove = (e) => {
      const el = e.target.closest && e.target.closest("[data-embers]");
      if (!el) return;
      const now = performance.now();
      if (now - last < 26) return;
      last = now;
      spawn(e.clientX, e.clientY, 2 + Math.floor(Math.random() * 2));
    };
    const onOver = (e) => {
      const el = e.target.closest && e.target.closest("[data-embers]");
      if (el) spawn(e.clientX, e.clientY, 10);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);

    let prev = performance.now();
    const tick = (t) => {
      const dt = Math.min(t - prev, 50);
      prev = t;
      const f = dt / 16.67;

      if (particles.length === 0) {
        if (hadParticles) {
          ctx.clearRect(0, 0, w, h);
          hadParticles = false;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      hadParticles = true;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        const age = p.life / p.max;
        // physics: buoyancy fades, gravity + drag + turbulent drift
        p.vy += (-0.012 * (1 - age) + 0.006) * f;
        p.vx += Math.sin(p.seed + p.life * 0.002) * 0.01 * f;
        p.vx *= Math.pow(0.985, f);
        p.vy *= Math.pow(0.99, f);
        p.x += p.vx * f;
        p.y += p.vy * f;

        const alpha = Math.sin(age * Math.PI) * 0.9; // fade in + out
        const r = p.size * (1 + age * 1.6);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        const hot = p.warm > 0.6;
        const c = hot ? "255,190,92" : "255,150,52";
        g.addColorStop(0, `rgba(${c},${alpha})`);
        g.addColorStop(0.4, `rgba(${c},${alpha * 0.4})`);
        g.addColorStop(1, "rgba(255,150,52,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
    };
  }, []);

  return <canvas ref={canvasRef} className="ember-layer" aria-hidden="true" />;
}
