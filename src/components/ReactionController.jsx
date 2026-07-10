import { useEffect, useRef } from "react";
import { proximity } from "../lib/proximityStore.js";

const STRIPS = 7; // datamosh tear-lines

/**
 * Maps cursor→core-centre distance into a reaction value (0 outside the zone,
 * 1 at dead-centre), published to the proximity store AND used to violently
 * "destroy" the page as you push toward the core:
 *   - Gravitational collapse: the content pulls toward the core, scales, shears
 *     (skew), rotates and shakes — harder the closer you are.
 *   - Datamosh: horizontal tear-strips jump/flicker across the screen + a
 *     chromatic RGB split (amber/teal) on the text.
 *
 * Everything here is GPU-composited (transform / opacity / text-shadow only) —
 * no SVG or CSS layer filters, which tank Firefox/Safari. Holds ~100fps.
 */
export default function ReactionController() {
  const stripRefs = useRef([]);

  useEffect(() => {
    const hoverable = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    const reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hoverable || reduced) return;

    const root = document.documentElement;
    const strips = stripRefs.current;
    let orb = null;
    let distortEl = null;
    let heroInView = true;
    let io = null;
    const mouse = { x: -9999, y: -9999 };
    let val = 0;
    let raf = 0;
    let crashing = false;

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget) onLeave();
    });

    const clearCrash = () => {
      crashing = false;
      root.classList.remove("is-crashing");
      root.style.setProperty("--crash", "0");
      root.style.setProperty("--crash-ab", "0");
      if (distortEl) {
        distortEl.style.transform = "";
        distortEl.style.transformOrigin = "";
      }
      for (const s of strips) if (s) s.style.opacity = "0";
    };

    const rnd = (n) => (Math.random() - 0.5) * n;
    const smooth = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      if (!orb) {
        orb = document.querySelector(".hero-orb");
        if (orb && "IntersectionObserver" in window) {
          io = new IntersectionObserver(([e]) => (heroInView = e.isIntersecting), {
            rootMargin: "140px",
          });
          io.observe(orb);
        }
      }
      if (!distortEl) distortEl = document.querySelector(".hero__distort");

      if (!heroInView) {
        if (crashing) clearCrash();
        proximity.value = 0;
        proximity.inView = false;
        val = 0;
        raf = requestAnimationFrame(tick);
        return;
      }

      let target = 0;
      if (orb) {
        const r = orb.getBoundingClientRect();
        const inView = r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
        const cx = r.left + r.width * 0.62;
        const cy = r.top + r.height * 0.54;
        proximity.cx = cx;
        proximity.cy = cy;
        proximity.inView = inView;
        if (inView && mouse.x > -9998) {
          const zone = Math.min(r.width, r.height) * 0.55;
          const d = Math.hypot(mouse.x - cx, mouse.y - cy);
          let p = Math.max(0, 1 - d / zone);
          p = p * p * (3 - 2 * p);
          target = p;
        }
      }

      // fast attack, quick heal (so it doesn't linger after you leave)
      val = smooth(val, target, target > val ? 0.24 : 0.14);
      if (val < 0.001) val = 0;
      proximity.value = val;

      const active = val > 0.002;
      if (active) {
        if (!crashing) {
          crashing = true;
          root.classList.add("is-crashing");
        }
        const e = val * val; // stay calm until close, then destroy

        // ---- gravitational collapse (compositor transform) ----
        const dr = distortEl ? distortEl.getBoundingClientRect() : { left: 0, top: 0 };
        const ox = proximity.cx - dr.left;
        const oy = proximity.cy - dr.top;
        let jx = rnd(e * 26);
        let jy = rnd(e * 20);
        // occasional violent signal-jump sideways (datamosh)
        if (Math.random() < e * 0.5) jx += rnd(80 * e);
        const rot = rnd(e * 2.2);
        const skX = rnd(e * 7);
        const skY = rnd(e * 3);
        const scale = 1 + e * 0.1;
        if (distortEl) {
          distortEl.style.transformOrigin = `${ox}px ${oy}px`;
          distortEl.style.transform = `translate(${jx.toFixed(1)}px, ${jy.toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(2)}deg) skew(${skX.toFixed(2)}deg, ${skY.toFixed(2)}deg)`;
        }

        // ---- chromatic RGB split on text (amber/teal, jumps — never pink) ----
        const ab = e * 16 * (0.5 + Math.random());
        root.style.setProperty("--crash", val.toFixed(3));
        root.style.setProperty("--crash-ab", ab.toFixed(1));

        // ---- datamosh tear-strips (transform + opacity only) ----
        const vh = window.innerHeight;
        for (let i = 0; i < strips.length; i++) {
          const s = strips[i];
          if (!s) continue;
          // each strip flickers in with probability scaled by how deep we are
          if (Math.random() < e * 0.85) {
            const y = Math.random() * vh;
            const thick = 1 + Math.random() * 26 * e;
            const shift = rnd(140 * e);
            s.style.opacity = (0.25 + Math.random() * 0.55 * e).toFixed(2);
            s.style.transform = `translate3d(${shift.toFixed(1)}px, ${y.toFixed(1)}px, 0) scaleY(${thick.toFixed(2)})`;
          } else {
            s.style.opacity = "0";
          }
        }
      } else if (crashing) {
        clearCrash();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      if (io) io.disconnect();
      clearCrash();
    };
  }, []);

  return (
    <div className="crash-glitch" aria-hidden="true">
      {Array.from({ length: STRIPS }).map((_, i) => (
        <span
          key={i}
          ref={(el) => (stripRefs.current[i] = el)}
          className={`crash-strip crash-strip--${i % 3}`}
        />
      ))}
    </div>
  );
}
