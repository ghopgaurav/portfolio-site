import { Reveal } from "../Reveal.jsx";
import { education, achievements } from "../../data/content.js";

export default function Closing() {
  return (
    <section className="section" id="more">
      <div className="container">
        <div className="section__head">
          <span className="section__num">[ 05 ]</span>
          <h2 className="section__title display">
            Education <em>/ recognition</em>
          </h2>
        </div>

        <div className="edu-row">
          {education.map((e, i) => (
            <Reveal key={e.school} delay={i * 0.05}>
              <div className={`edu ${e.highlight ? "edu--lead" : ""}`}>
                <div className="edu__top">
                  <h3 className="edu__school">{e.school}</h3>
                  {e.status && <span className="edu__status mono">{e.status}</span>}
                </div>
                <div className="edu__degree">{e.degree}</div>
                <div className="edu__sub mono">{e.location} · {e.period}</div>
                {e.note && <div className="edu__note">{e.note}</div>}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="ach-head">
            <span className="ach-head__label mono">Achievements</span>
            <span className="ach-head__rule" />
          </div>
        </Reveal>

        <div className="ach-grid">
          {achievements.map((a, i) => (
            <Reveal key={a.text} delay={i * 0.04}>
              <div className="ach-item">
                <span className="ach-item__idx mono">{String(i + 1).padStart(2, "0")}</span>
                <div className="ach-item__body">
                  <span className="ach-item__tag mono">{a.tag}</span>
                  <span className="ach-item__text">
                    {a.text}
                    {a.org && <span className="ach-item__org"> · {a.org}</span>}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
