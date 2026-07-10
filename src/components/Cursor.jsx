import { useEffect, useRef } from "react";

/**
 * Custom cursor: a crisp dot that tracks the pointer 1:1 (no easing lag) plus a
 * thin reticle ring with a slowly spinning accent arc — a light HUD feel that
 * stays snappy on every machine. Grows over interactive targets and can show a
 * label via data-cursor-label.
 */
export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    const onMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      // 1:1 tracking on the compositor — no rAF, no lerp, no perceived lag
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      if (ring.current) ring.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      if (label.current) {
        label.current.style.left = `${x}px`;
        label.current.style.top = `${y - 40}px`;
      }
    };

    const setHover = (on, text) => {
      ring.current?.classList.toggle("is-hover", on);
      dot.current?.classList.toggle("is-hover", on);
      if (label.current) {
        label.current.textContent = text || "";
        label.current.classList.toggle("is-show", on && !!text);
      }
    };

    const onOver = (e) => {
      const t = e.target.closest("a, button, [data-cursor]");
      if (t) setHover(true, t.getAttribute("data-cursor-label"));
    };
    const onOut = (e) => {
      const t = e.target.closest("a, button, [data-cursor]");
      if (t) setHover(false);
    };
    const onDown = () => ring.current?.classList.add("is-down");
    const onUp = () => ring.current?.classList.remove("is-down");

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <>
      <div ref={dot} className="cursor-dot" />
      <div ref={ring} className="cursor-ring" />
      <span ref={label} className="cursor-label" />
    </>
  );
}
