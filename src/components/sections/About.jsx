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
                I like the unglamorous parts of systems — retries, idempotency,
                dead-letter queues, reconciliation — <span>the plumbing that keeps
                things from silently breaking.</span>
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="about__body">
                Across an early-stage AI startup, a logistics company, and an
                enterprise integration platform, I've shipped backends that stay
                correct under load and outages. Lately I've gone deep on applied
                AI: confidence-based model routing, local/edge fine-tuning, and
                tool-using agents with guardrails that ground every action in real
                data. I care about cost, latency, and not hallucinating.
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
