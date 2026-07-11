import { Reveal } from "../Reveal.jsx";
import Magnetic from "../Magnetic.jsx";
import ContactForm from "../ContactForm.jsx";
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
        <div className="contact__grid">
          <div className="contact__form-col">
            <h3 className="contact__form-title">Send me a message</h3>
            <p className="contact__form-sub">
              Drop your email and a note — it lands straight in my inbox.
            </p>
            <ContactForm />
          </div>
          <div className="contact__aside">
            <p className="contact__aside-label mono">Prefer the details?</p>
            <Magnetic strength={0.3}>
              <a
                className="btn-pill btn-pill--accent"
                href={profile.resume}
                download="Gaurav_Ghop_Resume.pdf"
                data-cursor
                data-sound
              >
                Download résumé ↓
              </a>
            </Magnetic>
            <Magnetic strength={0.3}>
              <a className="btn-pill" href={`mailto:${profile.email}`} data-cursor data-sound>
                Email me directly
              </a>
            </Magnetic>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
