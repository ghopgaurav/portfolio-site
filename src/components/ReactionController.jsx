import { useEffect, useRef } from "react";
import { proximity } from "../lib/proximityStore.js";

/**
 * Maps the distance between the cursor and the energy-core centre into a single
 * reaction value (0 outside the zone, 1 at dead centre). That value:
 *   - is published to the proximity store (read by EnergyField), and
 *   - drives a "reality crash": an animated SVG displacement + chromatic-
 *     aberration filter plus a gravitational-collapse transform on the page
 *     content, so the site looks like it's tearing apart the deeper you push
 *     into the core. It heals back to normal as the cursor leaves the zone.
 */
export default function ReactionController() {
  const turb = useRef(null);
  const disp = useRef(null);
  const offR = useRef(null);
  const offB = useRef(null);

  useEffect(() => {
    const hoverable = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    const reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hoverable || reduced) return;

    const root = document.documentElement;
    let orb = null;
    let distortEl = null;
    const mouse = { x: -9999, y: -9999 };
    let val = 0;
    let seed = 1;
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

    const smooth = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      if (!orb) orb = document.querySelector(".hero-orb");
      if (!distortEl) distortEl = document.querySelector(".hero__distort");

      let target = 0;
      if (orb) {
        const r = orb.getBoundingClientRect();
        const inView = r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
        // core centre follows the mask focal point (62% / 54% of the box)
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
        const e = val * val; // ease the visual so it stays calm until you're close

        // organic warp + boiling turbulence
        if (disp.current) disp.current.setAttribute("scale", (e * 78).toFixed(2));
        if (turb.current) {
          const bf = 0.006 + e * 0.014;
          turb.current.setAttribute("baseFrequency", bf.toFixed(4));
          seed += 0.6 * e;
          turb.current.setAttribute("seed", (1 + Math.floor(seed)).toString());
        }
        // chromatic tearing
        const ab = e * 14;
        if (offR.current) offR.current.setAttribute("dx", (-ab).toFixed(2));
        if (offB.current) offB.current.setAttribute("dx", ab.toFixed(2));

        // gravitational collapse toward the core + crash shake
        if (distortEl) {
          const dr = distortEl.getBoundingClientRect();
          const ox = proximity.cx - dr.left;
          const oy = proximity.cy - dr.top;
          const shake = e * 9;
          const jx = (Math.random() - 0.5) * shake;
          const jy = (Math.random() - 0.5) * shake;
          const rot = (Math.random() - 0.5) * e * 1.1;
          const scale = 1 + e * 0.06;
          distortEl.style.transformOrigin = `${ox}px ${oy}px`;
          distortEl.style.transform = `translate(${jx}px, ${jy}px) scale(${scale}) rotate(${rot}deg)`;
          distortEl.style.filter = `url(#reactor-corrupt) contrast(${(1 + e * 0.45).toFixed(2)}) saturate(${(1 + e * 0.8).toFixed(2)})`;
          root.style.setProperty("--crash", val.toFixed(3));
        }
      } else if (crashing) {
        crashing = false;
        root.classList.remove("is-crashing");
        root.style.setProperty("--crash", "0");
        if (distortEl) {
          distortEl.style.transform = "";
          distortEl.style.transformOrigin = "";
          distortEl.style.filter = "";
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      root.classList.remove("is-crashing");
      if (distortEl) {
        distortEl.style.transform = "";
        distortEl.style.filter = "";
      }
    };
  }, []);

  return (
    <svg className="reactor-defs" aria-hidden="true" width="0" height="0">
      <defs>
        <filter
          id="reactor-corrupt"
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            ref={turb}
            type="fractalNoise"
            baseFrequency="0.006"
            numOctaves="2"
            seed="1"
            result="noise"
          />
          <feDisplacementMap
            ref={disp}
            in="SourceGraphic"
            in2="noise"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
            result="disp"
          />
          <feColorMatrix
            in="disp"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="r"
          />
          <feColorMatrix
            in="disp"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="g"
          />
          <feColorMatrix
            in="disp"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="b"
          />
          <feOffset ref={offR} in="r" dx="0" dy="0" result="ro" />
          <feOffset ref={offB} in="b" dx="0" dy="0" result="bo" />
          <feBlend in="ro" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="bo" mode="screen" result="out" />
        </filter>
      </defs>
    </svg>
  );
}
