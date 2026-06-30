import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import Cursor from "./components/Cursor.jsx";
import SmoothScroll from "./components/SmoothScroll.jsx";
import ShaderBackground from "./components/ShaderBackground.jsx";
import Loader from "./components/Loader.jsx";
import Nav from "./components/Nav.jsx";

import Hero from "./components/sections/Hero.jsx";
import About from "./components/sections/About.jsx";
import Work from "./components/sections/Work.jsx";
import Projects from "./components/sections/Projects.jsx";
import Skills from "./components/sections/Skills.jsx";
import Closing from "./components/sections/Closing.jsx";
import Contact from "./components/sections/Contact.jsx";
import { profile } from "./data/content.js";

export default function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <Cursor />
      <ShaderBackground />
      <div className="grain" aria-hidden="true" />

      <AnimatePresence>
        {!loaded && <Loader key="loader" onDone={() => setLoaded(true)} />}
      </AnimatePresence>

      <SmoothScroll>
        <Nav />
        <main className="content">
          <Hero start={loaded} />
          <About />
          <Work />
          <Projects />
          <Skills />
          <Closing />
          <Contact />

          <footer className="footer container">
            <span>© {new Date().getFullYear()} {profile.name}</span>
            <span>New York, NY — Available worldwide</span>
            <span>Built with React · Three.js · Framer Motion</span>
          </footer>
        </main>
      </SmoothScroll>
    </>
  );
}
