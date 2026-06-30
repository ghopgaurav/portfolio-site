import { motion } from "framer-motion";
import { SplitWords } from "../Reveal.jsx";
import { profile } from "../../data/content.js";

export default function Hero({ start }) {
  const anim = start ? "show" : "hidden";
  return (
    <header className="hero" id="top">
      <div className="hero__top">
        <motion.span
          className="hero__avail"
          initial={{ opacity: 0 }}
          animate={{ opacity: start ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="pulse" />
          {profile.available}
        </motion.span>
        <motion.span
          className="hero__avail"
          initial={{ opacity: 0 }}
          animate={{ opacity: start ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {profile.location}
        </motion.span>
      </div>

      <h1 className="hero__title display">
        {start && (
          <>
            <SplitWords text="Reliable" delay={0.1} />
            <SplitWords text="systems," delay={0.18} />
            <br />
            <span className="word" aria-hidden>
              <motion.em
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: "inline-block" }}
              >
                applied&nbsp;AI.
              </motion.em>
            </span>
          </>
        )}
      </h1>

      <div className="hero__bottom">
        <motion.p
          className="hero__intro"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: start ? 1 : 0, y: start ? 0 : 20 }}
          transition={{ duration: 0.9, delay: 0.7 }}
        >
          {profile.intro}
        </motion.p>
        <motion.div
          className="hero__scroll"
          initial={{ opacity: 0 }}
          animate={{ opacity: start ? 1 : 0 }}
          transition={{ duration: 0.9, delay: 0.9 }}
        >
          <span className="bar" /> Scroll to explore
        </motion.div>
      </div>
    </header>
  );
}
