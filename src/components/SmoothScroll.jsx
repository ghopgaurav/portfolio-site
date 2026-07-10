import { useEffect } from "react";
import Lenis from "lenis";

/** Wraps the app in Lenis smooth scrolling and wires anchor links to it. */
export default function SmoothScroll({ children }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // lerp-based feels far more responsive than a long duration ease — the page
    // follows the wheel closely instead of gliding behind it (a common "slow
    // scroll" complaint). Native touch scrolling is left untouched.
    const lenis = new Lenis({
      lerp: 0.14,
      wheelMultiplier: 1.05,
      smoothWheel: true,
      syncTouch: false,
    });

    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        lenis.scrollTo(el, { offset: -10 });
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);

  return children;
}
