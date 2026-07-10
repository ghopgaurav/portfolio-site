import { useState, lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";

import Cursor from "./components/Cursor.jsx";
import SmoothScroll from "./components/SmoothScroll.jsx";
// three.js is heavy — load the WebGL background lazily so first paint isn't
// blocked on it (it streams in behind the intro loader).
const ShaderBackground = lazy(() => import("./components/ShaderBackground.jsx"));
import EmberField from "./components/EmberField.jsx";
import EnergyControls from "./components/EnergyControls.jsx";
import ReactionController from "./components/ReactionController.jsx";
import Loader from "./components/Loader.jsx";
import Nav from "./components/Nav.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import SoundProvider from "./components/SoundProvider.jsx";

import Hero from "./components/sections/Hero.jsx";
import About from "./components/sections/About.jsx";
import Work from "./components/sections/Work.jsx";
import Projects from "./components/sections/Projects.jsx";
import Skills from "./components/sections/Skills.jsx";
import Closing from "./components/sections/Closing.jsx";
import Contact from "./components/sections/Contact.jsx";
import { profile } from "./data/content.js";

/** Each section is wrapped so a failure in one never blanks the whole site. */
function Section({ name, children }) {
  return <ErrorBoundary name={name}>{children}</ErrorBoundary>;
}

export default function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <SoundProvider>
      <ErrorBoundary name="Cursor">
        <Cursor />
      </ErrorBoundary>

      <ErrorBoundary name="ShaderBackground">
        <Suspense fallback={null}>
          <ShaderBackground />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary name="EmberField">
        <EmberField />
      </ErrorBoundary>

      <div className="grain" aria-hidden="true" />

      <AnimatePresence>
        {!loaded && <Loader key="loader" onDone={() => setLoaded(true)} />}
      </AnimatePresence>

      <ErrorBoundary name="EnergyControls">
        <EnergyControls />
      </ErrorBoundary>

      <ErrorBoundary name="ReactionController">
        <ReactionController />
      </ErrorBoundary>

      <SmoothScroll>
        <Nav />
        <main className="content">
          <Section name="Hero"><Hero start={loaded} /></Section>
          <Section name="About"><About /></Section>
          <Section name="Work"><Work /></Section>
          <Section name="Projects"><Projects /></Section>
          <Section name="Skills"><Skills /></Section>
          <Section name="Closing"><Closing /></Section>
          <Section name="Contact"><Contact /></Section>

          <footer className="footer container">
            <span>© {new Date().getFullYear()} {profile.name}</span>
            <span>Based in New York · open across the US</span>
            <span>Built with React · Three.js · Framer Motion</span>
          </footer>
        </main>
      </SmoothScroll>
    </SoundProvider>
  );
}
