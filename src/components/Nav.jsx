import Magnetic from "./Magnetic.jsx";
import { useSound } from "./SoundProvider.jsx";

export default function Nav() {
  const { on, toggle } = useSound();

  return (
    <nav className="nav">
      <a href="#top" className="nav__brand" data-cursor data-sound>
        <span className="dot" />
        Gaurav Ghop
      </a>
      <div className="nav__links">
        <a href="#about">About</a>
        <a href="#work">Work</a>
        <a href="#projects">Projects</a>
        <a href="#skills">Skills</a>
        <Magnetic strength={0.5}>
          <a href="#contact">Contact</a>
        </Magnetic>
      </div>
      <button
        className={`sound-toggle ${on ? "is-on" : ""}`}
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? "Mute sound" : "Enable sound"}
        data-cursor
        data-cursor-label={on ? "mute" : "sound"}
      >
        <span className="sound-toggle__bars" aria-hidden>
          <i></i><i></i><i></i><i></i>
        </span>
        <span className="sound-toggle__label mono">{on ? "SOUND ON" : "MUTED"}</span>
      </button>
    </nav>
  );
}
