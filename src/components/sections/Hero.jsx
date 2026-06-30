import { motion } from "framer-motion";
import { SplitWords } from "../Reveal.jsx";
import Magnetic from "../Magnetic.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import SandField from "../SandField.jsx";
import { profile } from "../../data/content.js";

const clients = ["Lockheed Martin", "US Navy", "Tiny Archives", "Duende"];
const focus = ["Distributed Systems", "Applied AI", "Event-Driven Backends", "Agents & MCP"];

export default function Hero({ start }) {
  const fade = (delay) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: start ? 1 : 0, y: start ? 0 : 16 },
    transition: { duration: 0.8, delay },
  });

  return (
    <header className="hero" id="top">
      {/* Opening line — say hello + contact */}
      <div className="hero__lead">
        <motion.a className="hero__hello" href={`mailto:${profile.email}`} data-cursor data-cursor-label="email" data-sound {...fade(0.15)}>
          <span className="hero__hello-big display">Say hello</span>
          <span className="hero__hello-arrow">↗</span>
        </motion.a>
        <motion.div className="hero__contact-line mono" {...fade(0.25)}>
          <a href={`mailto:${profile.email}`} data-sound>{profile.email}</a>
          <span className="sep">/</span>
          <span>{profile.location}</span>
          <span className="sep">/</span>
          <span className="hero__avail-inline"><span className="pulse" /> {profile.available}</span>
        </motion.div>
      </div>

      <div className="hero__main">
        <div className="hero__text">
          <motion.span className="hero__role mono" {...fade(0.05)}>
            {profile.role}
          </motion.span>
          <h1 className="hero__title display">
            {start && (
              <>
                <span className="hero__line"><SplitWords text="Software that" delay={0.1} /></span>
                <span className="hero__line">
                  <SplitWords text="survives" delay={0.24} />{" "}
                  <motion.em
                    initial={{ y: "110%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    the&nbsp;storm.
                  </motion.em>
                </span>
              </>
            )}
          </h1>

          <motion.p className="hero__intro" {...fade(0.7)}>
            {profile.intro}
          </motion.p>

          <motion.div className="hero__cta-row" {...fade(0.8)}>
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
          </motion.div>
        </div>

        {/* Interactive WebGL element — isolated so it can never crash the page */}
        <motion.div
          className="hero__orb-wrap"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: start ? 1 : 0, scale: start ? 1 : 0.96 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <ErrorBoundary name="SandField">
            <SandField />
          </ErrorBoundary>
        </motion.div>
      </div>

      {/* Clients + focus strip */}
      <motion.div className="hero__strip" {...fade(0.95)}>
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
