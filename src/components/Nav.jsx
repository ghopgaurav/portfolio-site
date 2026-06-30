import Magnetic from "./Magnetic.jsx";

export default function Nav() {
  return (
    <nav className="nav">
      <a href="#top" className="nav__brand" data-cursor>
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
    </nav>
  );
}
