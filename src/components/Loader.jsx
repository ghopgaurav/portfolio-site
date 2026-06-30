import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/** Podium-style percentage intro that counts to 100 then wipes away. */
export default function Loader({ onDone }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCount(100);
      const t = setTimeout(onDone, 200);
      return () => clearTimeout(t);
    }
    let n = 0;
    const id = setInterval(() => {
      n += Math.floor(Math.random() * 8) + 3;
      if (n >= 100) {
        n = 100;
        clearInterval(id);
        setTimeout(onDone, 550);
      }
      setCount(n);
    }, 90);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <motion.div
      className="loader"
      initial={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.9, ease: [0.83, 0, 0.17, 1] }}
    >
      <span className="loader__label">Gaurav Ghop — Studio © 2026</span>
      <span className="loader__count">{count}</span>
    </motion.div>
  );
}
