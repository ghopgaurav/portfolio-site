import { useState } from "react";
import { Reveal } from "../Reveal.jsx";
import { experience } from "../../data/content.js";

export default function Work() {
  const [open, setOpen] = useState(0);

  return (
    <section className="section" id="work">
      <div className="container">
        <div className="section__head">
          <span className="section__num">[ 02 ]</span>
          <h2 className="section__title display">
            Work <em>/ history</em>
          </h2>
        </div>

        <div className="work">
          {experience.map((job, i) => (
            <Reveal key={job.company} delay={i * 0.05}>
              <div className={`work__row-wrap ${open === i ? "is-open" : ""}`}>
                <button
                  className="work__row work__company-btn"
                  onClick={() => setOpen(open === i ? -1 : i)}
                  data-cursor
                  data-cursor-label={open === i ? "close" : "open"}
                  data-embers
                  aria-expanded={open === i}
                >
                  <span className="work__idx">0{i + 1}</span>
                  <span>
                    <span className="work__company">{job.company}</span>
                    <span className="work__role"> — {job.role}, {job.location}</span>
                  </span>
                  <span className="work__period">{job.period}</span>
                </button>

                <div className="work__detail">
                  <div className="work__detail-inner">
                    <ul className="work__points">
                      {job.points.map((p, j) => (
                        <li key={j}>{p}</li>
                      ))}
                    </ul>
                    <div className="work__tags">
                      {job.tags.map((t) => (
                        <span className="tag" key={t}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
