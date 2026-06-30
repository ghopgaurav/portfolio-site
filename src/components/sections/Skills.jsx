import { Reveal } from "../Reveal.jsx";
import { skills } from "../../data/content.js";

const marqueeItems = [
  "Distributed Systems",
  "LLM Routing",
  "Event-Driven",
  "Idempotency",
  "Fine-Tuning",
  "Kafka",
  "Agents & MCP",
  "Reliability",
];

export default function Skills() {
  return (
    <section className="section" id="skills">
      <div className="container">
        <div className="section__head">
          <span className="section__num">[ 04 ]</span>
          <h2 className="section__title display">
            Stack <em>/ tools</em>
          </h2>
        </div>

        <Reveal>
          <div className="skills__groups">
            {skills.map((g) => (
              <div className="sgroup" key={g.group}>
                <h3>{g.group}</h3>
                <ul>
                  {g.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[...marqueeItems, ...marqueeItems].map((m, i) => (
            <span key={i}>
              {m} <em>✦</em>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
