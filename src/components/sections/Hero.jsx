import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Magnetic from "../Magnetic.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import EnergyField from "../EnergyField.jsx";
import { profile } from "../../data/content.js";

const clients = ["Lockheed Martin", "US Navy", "Tiny Archives", "Duende"];
const focus = ["Distributed Systems", "Applied AI", "Event-Driven Backends", "Agents & MCP"];

export default function Hero({ start }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yText = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const yGfx = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const fade = (delay) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: start ? 1 : 0, y: start ? 0 : 16 },
    transition: { duration: 0.8, delay },
  });

  return (
    <header className="hero" id="top" ref={ref}>
      {/* Interactive energy core — a glowing backdrop behind the content */}
      <motion.div className="hero__sand" style={{ y: yGfx, opacity: fadeOut }}>
        <ErrorBoundary name="EnergyField">
          <EnergyField />
        </ErrorBoundary>
      </motion.div>

      <motion.div className="hero__head" style={{ y: yText, opacity: fadeOut }}>
        <motion.div className="hero__eyebrow" {...fade(0.05)}>
          <span className="hero__role mono">{profile.role}</span>
          <span className="hero__avail">
            <span className="pulse" /> {profile.available}
          </span>
        </motion.div>

        <h1 className="hero__title display">
          {start && (
            <>
              <span className="hero__line">
                <motion.span
                  className="hero__title-line"
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  Reliable&nbsp;systems,
                </motion.span>
              </span>
              <span className="hero__line">
                <motion.em
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  applied&nbsp;AI.
                </motion.em>
              </span>
            </>
          )}
        </h1>
      </motion.div>

      <motion.div className="hero__main" style={{ opacity: fadeOut }}>
        <div className="hero__text">
          <motion.p className="hero__intro" {...fade(0.5)}>
            {profile.intro}
          </motion.p>

          <motion.div className="hero__cta-row" {...fade(0.62)}>
            <Magnetic strength={0.35}>
              <a className="btn-pill btn-pill--accent" href="#projects" data-cursor data-sound>
                See the work →
              </a>
            </Magnetic>
            <Magnetic strength={0.35}>
              <a className="btn-pill" href="#contact" data-cursor data-sound>
                Get in touch
              </a>
            </Magnetic>
            <a
              className="hero__say-hello"
              href={`mailto:${profile.email}`}
              data-cursor
              data-cursor-label="email"
              data-sound
            >
              Say hello <span className="arrow">↗</span>
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* Clients + focus strip */}
      <motion.div className="hero__strip" style={{ opacity: fadeOut }} {...fade(0.8)}>
        <div className="hero__strip-col">
          <span className="hero__strip-label mono">Shipped for teams at</span>
          <div className="hero__strip-items">
            {clients.map((c) => (
              <span key={c} className="hero__client">{c}</span>
            ))}
          </div>
        </div>
        <div className="hero__strip-col">
          <span className="hero__strip-label mono">Focus</span>
          <div className="hero__strip-items">
            {focus.map((f) => (
              <span key={f} className="hero__focus">{f}</span>
            ))}
          </div>
        </div>
      </motion.div>
    </header>
  );
}
