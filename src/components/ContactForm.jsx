import { useState } from "react";
import { profile } from "../data/content.js";

/**
 * A minimal "message me" box. Posts to FormSubmit's AJAX endpoint (no backend,
 * no API key, free) which emails the message to `profile.email`. On the very
 * first submission FormSubmit sends a one-time activation link to that inbox.
 * A hidden honeypot field (`_honey`) filters out bots.
 *
 * Cheap client-side quality gates keep junk out of the inbox:
 *   - valid email shape (single regex, no network call)
 *   - no throwaway/temporary inboxes (O(1) Set lookup)
 *   - a real message (>= MIN_WORDS words), so no blank/one-word pings
 * Set REQUIRE_WORK_EMAIL to also reject free personal inboxes (Gmail, etc.).
 */
const ENDPOINT = `https://formsubmit.co/ajax/${profile.email}`;

const MIN_WORDS = 10;
// Deliberately simple + fast: one local part, one domain, a dotted TLD. This is
// a shape check, not RFC-perfect (that's what the confirmation reply is for).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

// Throwaway inboxes = pure spam. Cheap Set lookup, easy to extend.
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "10minutemail.com",
  "tempmail.com", "temp-mail.org", "throwaway.email", "yopmail.com", "trashmail.com",
  "getnada.com", "sharklasers.com", "dispostable.com", "maildrop.cc", "fakeinbox.com",
  "mailnesia.com", "mintemail.com", "spam4.me", "grr.la", "emailondeck.com", "moakt.com",
]);

// Flip to `true` to require a work/company email (rejects the free providers
// below). Off by default so recruiters/HMs who use personal email still reach you.
const REQUIRE_WORK_EMAIL = false;
const FREE_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com",
  "proton.me", "protonmail.com", "live.com", "msn.com", "gmx.com", "mail.com",
]);

const countWords = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

function validate(email, message) {
  const e = (email || "").trim().toLowerCase();
  const m = (message || "").trim();
  if (!EMAIL_RE.test(e)) return "Please enter a valid email address.";
  const domain = e.slice(e.indexOf("@") + 1);
  if (DISPOSABLE.has(domain)) return "Please use a permanent email — temporary inboxes aren't accepted.";
  if (REQUIRE_WORK_EMAIL && FREE_PROVIDERS.has(domain)) return "Please use your work / company email address.";
  const words = countWords(m);
  if (words < MIN_WORDS) return `Please write a bit more — at least ${MIN_WORDS} words (${words} so far).`;
  return "";
}

export default function ContactForm() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");
  const [words, setWords] = useState(0);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("_honey")) return; // bot

    const problem = validate(data.get("email"), data.get("message"));
    if (problem) {
      setStatus("error");
      setError(problem);
      return;
    }

    setStatus("sending");
    setError("");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json.success === "true" || json.success === true || res.status === 200)) {
        setStatus("sent");
        form.reset();
        setWords(0);
      } else {
        throw new Error(json.message || "Something went wrong.");
      }
    } catch (err) {
      setStatus("error");
      setError(err.message || "Couldn't send — try emailing me directly.");
    }
  };

  if (status === "sent") {
    return (
      <div className="cform cform--done" role="status">
        <span className="cform__check">✓</span>
        <p>Thanks — your message is on its way. I'll get back to you soon.</p>
      </div>
    );
  }

  const enough = words >= MIN_WORDS;

  return (
    <form className="cform" onSubmit={onSubmit} noValidate>
      <input type="hidden" name="_subject" value="New message from your portfolio" />
      <input type="hidden" name="_template" value="table" />
      <input type="text" name="_honey" tabIndex={-1} autoComplete="off" className="cform__honey" aria-hidden="true" />

      <div className="cform__field">
        <label htmlFor="cf-email">Your email</label>
        <input
          id="cf-email"
          type="email"
          name="email"
          required
          placeholder="you@company.com"
          autoComplete="email"
          data-cursor
        />
      </div>

      <div className="cform__field">
        <div className="cform__label-row">
          <label htmlFor="cf-msg">Message</label>
          <span className={`cform__count ${enough ? "is-ok" : ""}`}>
            {words}/{MIN_WORDS} words
          </span>
        </div>
        <textarea
          id="cf-msg"
          name="message"
          required
          rows={4}
          placeholder="Tell me about the role, project, or just say hi."
          onChange={(e) => setWords(countWords(e.target.value))}
          data-cursor
        />
      </div>

      <div className="cform__actions">
        <button
          type="submit"
          className="btn-pill btn-pill--accent"
          disabled={status === "sending"}
          data-cursor
          data-sound
        >
          {status === "sending" ? "Sending…" : "Send message →"}
        </button>
        {status === "error" && <span className="cform__error">{error}</span>}
      </div>
    </form>
  );
}
