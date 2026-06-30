import { useEffect, useRef } from "react";

/**
 * Custom cursor: a crisp dot that tracks the pointer 1:1 and a soft ring
 * that lags behind with easing. Grows over [data-cursor] targets and can
 * show a label via data-cursor-label.
 */
export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...pos };
    let raf;

    const onMove = (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (dot.current) dot.current.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
      if (label.current) {
        label.current.style.left = `${pos.x}px`;
        label.current.style.top = `${pos.y - 38}px`;
      }
    };

    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      if (ring.current)
        ring.current.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };

    const setHover = (on, text) => {
      ring.current?.classList.toggle("is-hover", on);
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

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
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
