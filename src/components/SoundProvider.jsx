import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { enableAudio, disableAudio, sandBurst, isEnabled } from "../lib/audio.js";

const SoundCtx = createContext({ on: false, toggle: () => {}, note: () => {} });
export const useSound = () => useContext(SoundCtx);

const STORAGE_KEY = "sound-pref";

export default function SoundProvider({ children }) {
  const [on, setOn] = useState(false);
  const [asked, setAsked] = useState(true); // hidden until we know there's no stored pref

  useEffect(() => {
    const pref = localStorage.getItem(STORAGE_KEY);
    if (pref === null) {
      setAsked(false); // show the prompt
    } else if (pref === "on") {
      // can't auto-resume without a gesture; wait for first interaction
      const resume = async () => {
        const ok = await enableAudio();
        setOn(ok && isEnabled());
        window.removeEventListener("pointerdown", resume);
        window.removeEventListener("keydown", resume);
      };
      window.addEventListener("pointerdown", resume, { once: true });
      window.addEventListener("keydown", resume, { once: true });
    }
  }, []);

  const accept = useCallback(async () => {
    const ok = await enableAudio();
    setOn(ok);
    setAsked(true);
    localStorage.setItem(STORAGE_KEY, ok ? "on" : "off");
  }, []);

  const decline = useCallback(() => {
    setOn(false);
    setAsked(true);
    localStorage.setItem(STORAGE_KEY, "off");
  }, []);

  const toggle = useCallback(async () => {
    if (on) {
      disableAudio();
      setOn(false);
      localStorage.setItem(STORAGE_KEY, "off");
    } else {
      const ok = await enableAudio();
      setOn(ok);
      localStorage.setItem(STORAGE_KEY, ok ? "on" : "off");
    }
  }, [on]);

  const note = useCallback((intensity) => sandBurst(intensity), []);

  // Global hover → soft grain on interactive targets
  useEffect(() => {
    if (!on) return;
    const onOver = (e) => {
      const t = e.target.closest("a, button, [data-sound]");
      if (t) sandBurst(0.4);
    };
    document.addEventListener("mouseover", onOver);
    return () => document.removeEventListener("mouseover", onOver);
  }, [on]);

  return (
    <SoundCtx.Provider value={{ on, toggle, note }}>
      {children}
      {!asked && (
        <div className="sound-prompt" role="dialog" aria-label="Enable sound">
          <div className="sound-prompt__inner">
            <span className="sound-prompt__wave" aria-hidden>
              <i></i><i></i><i></i><i></i><i></i>
            </span>
            <div className="sound-prompt__text">
              <strong>Sound on?</strong>
              <span>Disturb the sand and you'll hear it shift. Best with sound.</span>
            </div>
            <div className="sound-prompt__actions">
              <button className="sp-btn sp-btn--accent" onClick={accept} data-cursor>Enable sound</button>
              <button className="sp-btn" onClick={decline} data-cursor>Keep muted</button>
            </div>
          </div>
        </div>
      )}
    </SoundCtx.Provider>
  );
}
