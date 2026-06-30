import { Reveal } from "../Reveal.jsx";
import { projects } from "../../data/content.js";

function CardInner({ p, i }) {
  const hasLink = p.link && p.link !== "#";
  return (
    <>
      <div className="pcard__top">
        <span className="pcard__idx">P/{String(i + 1).padStart(2, "0")}</span>
        {p.kind && <span className="pcard__kind">{p.kind}</span>}
        <span className="pcard__link">{hasLink ? "↗" : "•"}</span>
      </div>
      <h3 className="pcard__title">{p.title}</h3>
      <div className="pcard__stack">{p.stack}</div>
      <p className="pcard__blurb">{p.blurb}</p>
      <ul className="pcard__metrics">
        {p.metrics.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </>
  );
}

function Card({ p, i }) {
  const hasLink = p.link && p.link !== "#";

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  if (!hasLink) {
    return (
      <div className="pcard pcard--static" onMouseMove={onMove} data-cursor data-cursor-label="case study">
        <CardInner p={p} i={i} />
      </div>
    );
  }

  return (
    <a
      className="pcard"
      href={p.link}
      target="_blank"
      rel="noopener"
      onMouseMove={onMove}
      data-cursor
      data-cursor-label="view repo"
    >
      <CardInner p={p} i={i} />
    </a>
  );
}

export default function Projects() {
  return (
    <section className="section" id="projects">
      <div className="container">
        <div className="section__head">
          <span className="section__num">[ 03 ]</span>
          <h2 className="section__title display">
            Projects <em>/ builds</em>
          </h2>
        </div>
        <Reveal>
          <div className="projects__grid">
            {projects.map((p, i) => (
              <Card key={p.title} p={p} i={i} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
