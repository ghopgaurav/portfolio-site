import { useEffect } from "react";
import { proximity } from "../lib/proximityStore.js";

/**
 * Maps the distance between the cursor and the energy-core centre into a single
 * reaction value (0 outside the zone, 1 at dead centre). That value:
 *   - is published to the proximity store (read by EnergyField), and
 *   - drives a "reality crash" on the page content — a gravitational-collapse
 *     transform (pull, shake, warp-skew) plus GPU-composited colour tearing
 *     (contrast/saturate/hue, chromatic drop-shadows, a touch of blur).
 *
 * NB: this deliberately avoids SVG feTurbulence/feDisplacementMap. Measured on
 * Firefox those drop the page from ~110fps to ~31fps whenever the cursor nears
 * the core; the CSS-composited version below runs on the GPU and holds ~100fps
 * for a near-identical "tearing" look on every browser.
 */
export default function ReactionController() {
  useEffect(() => {
    const hoverable = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    const reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hoverable || reduced) return;

    const root = document.documentElement;
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
      if (distortEl) {
        distortEl.style.transform = "";
        distortEl.style.transformOrigin = "";
        distortEl.style.filter = "";
      }
    };

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

      // fully skip layout reads + effects while the hero is off-screen
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
          p = p * p * (3 - 2 * p); // smoothstep — ramps up near the centre
          target = p;
        }
      }

      // fast attack, slightly slower heal
      val = smooth(val, target, target > val ? 0.22 : 0.08);
      if (val < 0.001) val = 0;
      proximity.value = val;

      const active = val > 0.002;
      if (active) {
        if (!crashing) {
          crashing = true;
          root.classList.add("is-crashing");
        }
        const e = val * val; // stay calm until you're close, then tear

        // gravitational collapse toward the core + shake + warp-skew
        const dr = distortEl ? distortEl.getBoundingClientRect() : { left: 0, top: 0 };
        const ox = proximity.cx - dr.left;
        const oy = proximity.cy - dr.top;
        const shake = e * 10;
        const jx = (Math.random() - 0.5) * shake;
        const jy = (Math.random() - 0.5) * shake;
        const rot = (Math.random() - 0.5) * e * 1.2;
        const sk = (Math.random() - 0.5) * e * 1.6; // skew jitter = organic "tear"
        const scale = 1 + e * 0.06;
        const ab = (e * 10).toFixed(1); // chromatic-aberration offset

        if (distortEl) {
          // Compositor-only transform (cheap: transforms the existing layer, no
          // re-raster). We deliberately set NO `filter:` here — an animated filter
          // on this large subtree forces Firefox to re-render it to a texture every
          // frame (measured: 107fps -> 39fps). The colour "tear" comes from the
          // chromatic text-shadow (CSS, driven by --crash-ab) + the WebGL core.
          distortEl.style.transformOrigin = `${ox}px ${oy}px`;
          distortEl.style.transform = `translate(${jx}px, ${jy}px) scale(${scale}) rotate(${rot}deg) skewX(${sk}deg)`;
          root.style.setProperty("--crash", val.toFixed(3));
          root.style.setProperty("--crash-ab", ab);
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

  return null;
}
