import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { enableAudio, disableAudio, tactile, tone, isEnabled } from "../lib/audio.js";

const SoundCtx = createContext({ on: false, toggle: () => {}, note: () => {} });
export const useSound = () => useContext(SoundCtx);

const STORAGE_KEY = "sound-pref";

export default function SoundProvider({ children }) {
  const [on, setOn] = useState(false);

  // Restore a previous "on" preference on the first user gesture (browsers
  // block audio until then). No dialog — the nav toggle is the control.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "on") return;
    const resume = async () => {
      const ok = await enableAudio();
      setOn(ok && isEnabled());
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
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

  const note = useCallback((freq) => tone(freq), []);

  // Global hover → soft tactile tick on interactive targets
  useEffect(() => {
    if (!on) return;
    const onOver = (e) => {
      const t = e.target.closest("a, button, [data-sound]");
      if (t) tactile(0.35);
    };
    document.addEventListener("mouseover", onOver);
    return () => document.removeEventListener("mouseover", onOver);
  }, [on]);

  return <SoundCtx.Provider value={{ on, toggle, note }}>{children}</SoundCtx.Provider>;
}
