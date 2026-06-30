import { useEffect, useRef, useState } from "react";
import { Reveal } from "../Reveal.jsx";
import { stats } from "../../data/content.js";

function Counter({ value, suffix }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const dur = 1400;
        const t0 = performance.now();
        const step = (now) => {
          const p = Math.min((now - t0) / dur, 1);
          setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="stat__num">
      {n}
      <span className="suf">{suffix}</span>
    </span>
  );
}

export default function About() {
  return (
    <section className="section" id="about">
      <div className="container">
        <div className="section__head">
          <span className="section__num">[ 01 ]</span>
          <h2 className="section__title display">
            About <em>/ ethos</em>
          </h2>
        </div>

        <div className="about__grid">
          <div>
            <Reveal>
              <p className="about__lead">
                The parts of a system nobody notices are the ones I like best:
                the retry that quietly saves an order, the idempotency check that
                stops a double charge, <span>the queue that holds onto a message
                instead of losing it.</span>
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="about__body">
                I've built backends for an enterprise integration platform, a
                delivery startup, and an AI company. Most of it is the kind of work
                that only gets noticed when it breaks, so I spend my time making
                sure it doesn't. Lately I've been on the AI side too: routing the
                simpler requests to cheaper models, fine-tuning ones small enough
                to run on a laptop, and getting agents to back up what they say with
                a real source instead of guessing.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="stats">
              {stats.map((s) => (
                <div className="stat" key={s.label} data-cursor>
                  <Counter value={s.value} suffix={s.suffix} />
                  <div className="stat__label">{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
