import { Reveal } from "../Reveal.jsx";
import Magnetic from "../Magnetic.jsx";
import { profile } from "../../data/content.js";

export default function Contact() {
  return (
    <section className="contact container" id="contact">
      <Reveal>
        <div className="contact__kicker">[ 06 ] — Let's build something</div>
      </Reveal>
      <Reveal delay={0.05}>
        <a
          className="contact__mail display"
          href={`mailto:${profile.email}`}
          data-cursor
          data-cursor-label="email"
        >
          Say hello ↗
        </a>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="contact__row">
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
          <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>{profile.phone}</a>
          <a href={profile.github} target="_blank" rel="noopener">GitHub</a>
          <a href={profile.linkedin} target="_blank" rel="noopener">LinkedIn</a>
        </div>
      </Reveal>
      <Reveal delay={0.15}>
        <div style={{ marginTop: "3rem" }}>
          <Magnetic strength={0.35}>
            <a className="btn-pill btn-pill--accent" href={`mailto:${profile.email}`} data-cursor>
              Start a conversation →
            </a>
          </Magnetic>
        </div>
      </Reveal>
    </section>
  );
}
