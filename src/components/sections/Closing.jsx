import { Reveal } from "../Reveal.jsx";
import { education, achievements } from "../../data/content.js";

export default function Closing() {
  return (
    <section className="section" id="more">
      <div className="container">
        <div className="section__head">
          <span className="section__num">[ 05 ]</span>
          <h2 className="section__title display">
            Education <em>/ extras</em>
          </h2>
        </div>

        <div className="closing__grid">
          <div>
            {education.map((e, i) => (
              <Reveal key={e.school} delay={i * 0.05}>
                <div className="edu">
                  <h3>{e.school}</h3>
                  <div className="meta">{e.degree} · {e.location}</div>
                  <div className="period">{e.period}</div>
                  {e.note && <div className="note">{e.note}</div>}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <ul className="ach">
              {achievements.map((a, i) => (
                <li key={a}>
                  <span className="mk">0{i + 1}</span>
                  {a}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
